/* ═══════════════════════════════════════════════════════════
   MISFIT — controllers/ordersController.js  (Hardened)
   Fixes: N+1 query → batch lookup, MongoDB transaction for
          atomic stock deduction, race condition prevention
═══════════════════════════════════════════════════════════ */
const mongoose         = require('mongoose');
const { Order, Product, Cart, Counter } = require('../database/db');

// ── POST /api/orders  { items, address, paymentMethod } ──────
async function placeOrder(req, res) {
  const { items, address, paymentMethod = 'cod', razorpayOrderId, razorpayPaymentId } = req.body;

  if (!address || !address.trim())
    return res.status(400).json({ success: false, message: 'Delivery address is required.' });
  if (!items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ success: false, message: 'No items provided for the order.' });

  // ── Batch-fetch all products in ONE query (fix N+1) ─────────
  const productIds = items.map(i => i.productId);
  const products   = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map(p => [String(p._id), p]));

  // Validate all items before touching the DB
  for (const item of items) {
    const p = productMap.get(String(item.productId));
    if (!p)
      return res.status(404).json({ success: false, message: `Product ${item.productId} not found.` });
    if (p.stock < item.qty)
      return res.status(400).json({ success: false, message: `Insufficient stock for "${p.name}". Only ${p.stock} left.` });
    if (!item.size || !item.colour)
      return res.status(400).json({ success: false, message: `Size and colour required for "${p.name}".` });
  }

  // ── MongoDB Session + Transaction (atomic stock deduction) ───
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let total       = 0;
    const orderItems = [];

    for (const item of items) {
      const p = productMap.get(String(item.productId));
      total += p.price * item.qty;
      orderItems.push({
        productId: p._id,
        name:      p.name,
        price:     p.price,
        size:      item.size,
        colour:    item.colour,
        qty:       item.qty,
      });

      // Atomic decrement: fails if stock goes negative (race-safe)
      const updated = await Product.findOneAndUpdate(
        { _id: p._id, stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } },
        { new: true, session }
      );
      if (!updated) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: `"${p.name}" just sold out. Please refresh.` });
      }
    }

    // Generate sequential order number
    const counter = await Counter.findOneAndUpdate(
      { _id: 'orderId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session }
    );
    const orderNumber = counter.seq;

    const [order] = await Order.create([{
      userId: req.user.id,
      orderNumber,
      items:  orderItems,
      total,
      address:        address.trim(),
      paymentMethod,
      razorpayOrderId:   razorpayOrderId   || null,
      razorpayPaymentId: razorpayPaymentId || null,
      status: (paymentMethod === 'cod' || paymentMethod === 'original') ? 'pending' : 'confirmed',
    }], { session });

    // Clear user cart
    await Cart.deleteMany({ userId: req.user.id }, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "🎉 Order placed successfully!",
      order:   { ...order.toObject(), id: order._id },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/orders/my ───────────────────────────────────────
async function getMyOrders(req, res) {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, orders: orders.map(o => ({ ...o, id: o._id })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/orders  (admin) ─────────────────────────────────
async function getAllOrders(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    // Admin can request up to 500 orders at once for dashboard views
    const limit = Math.min(500, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    // Optional status filter
    const filter = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter).populate('userId', 'name email phone').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    const result = orders.map(o => ({
      ...o,
      id:             o._id,
      customer_name:  o.userId?.name  || 'Unknown',
      customer_email: o.userId?.email || '',
      customer_phone: o.userId?.phone || '',
    }));
    res.json({ success: true, orders: result, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/orders/:id ──────────────────────────────────────
async function getOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (String(order.userId) !== String(req.user.id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    res.json({ success: true, order: { ...order, id: order._id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── PATCH /api/orders/:id/status  (admin) ───────────────────
async function updateOrderStatus(req, res) {
  try {
    // Full status set matching schema enum
    const ALLOWED_STATUSES = [
      'pending', 'confirmed', 'packed', 'shipped',
      'out-for-delivery', 'delivered', 'cancelled', 'returned', 'refunded',
    ];
    const { status } = req.body;
    if (!ALLOWED_STATUSES.includes(status))
      return res.status(400).json({ success: false, message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` });

    const updateFields = { status };
    // Auto-set deliveryDate when marked delivered
    if (status === 'delivered') updateFields.deliveryDate = new Date();
    // Auto-set returnedDate when marked returned
    if (status === 'returned')  updateFields.returnedDate = new Date();

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, lean: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, message: `Order status → "${status}"`, order: { ...order, id: order._id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { placeOrder, getMyOrders, getAllOrders, getOrder, updateOrderStatus };
