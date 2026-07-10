/* ═══════════════════════════════════════════════════════════
   MISFIT — controllers/cartController.js  (MongoDB)
═══════════════════════════════════════════════════════════ */
const { Cart, Product } = require('../database/db');

async function fetchCart(userId) {
  const items = await Cart.find({ userId }).populate('productId', 'name category price origPrice gradient letter imageUrl stock').lean();
  // Filter out any cart items where the corresponding product no longer exists
  const validItems = items.filter(item => item.productId);
  return validItems.map(item => ({
    cartItemId: item._id,
    size:    item.size,
    colour:  item.colour,
    qty:     item.qty,
    product: {
      id:        String(item.productId._id),
      name:      item.productId.name,
      category:  item.productId.category,
      price:     item.productId.price,
      origPrice: item.productId.origPrice,
      gradient:  item.productId.gradient,
      letter:    item.productId.letter,
      imageUrl:  item.productId.imageUrl || '',
      stock:     item.productId.stock,
    }
  }));
}

// GET /api/cart
async function getCart(req, res) {
  try {
    const items = await fetchCart(req.user.id);
    const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    res.json({ success: true, items, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/cart  { productId, size, colour, qty? }
async function addToCart(req, res) {
  try {
    const { productId, size, colour, qty = 1 } = req.body;
    if (!productId || !size || !colour)
      return res.status(400).json({ success: false, message: 'productId, size, and colour are required.' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    // Upsert: increment qty if exists, else insert
    await Cart.findOneAndUpdate(
      { userId: req.user.id, productId, size, colour },
      { $inc: { qty } },
      { upsert: true, new: true }
    );

    const items = await fetchCart(req.user.id);
    res.json({ success: true, message: `${product.name} added to cart ✓`, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/cart/:id  { delta: 1 | -1 }
async function updateCartItem(req, res) {
  try {
    const { delta } = req.body;
    console.log(`[updateCartItem] req.params.id: ${req.params.id}, req.user.id: ${req.user.id}`);
    const item = await Cart.findOne({ _id: req.params.id, userId: req.user.id });
    if (!item) {
      console.log(`[updateCartItem] item not found for query:`, { _id: req.params.id, userId: req.user.id });
      // Debug what is actually in DB
      const dbItem = await Cart.findById(req.params.id);
      console.log(`[updateCartItem] But in DB, item is:`, dbItem);
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found.',
        debug_req_id: req.params.id,
        debug_req_user: req.user.id,
        debug_db_item: dbItem 
      });
    }

    const newQty = item.qty + parseInt(delta || 0);
    if (newQty <= 0) {
      await Cart.deleteOne({ _id: item._id });
    } else {
      await Cart.updateOne({ _id: item._id }, { $set: { qty: newQty } });
    }

    const items = await fetchCart(req.user.id);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/cart/:id
async function removeFromCart(req, res) {
  try {
    const item = await Cart.findOne({ _id: req.params.id, userId: req.user.id });
    if (!item) return res.status(404).json({ success: false, message: 'Cart item not found.' });

    await Cart.deleteOne({ _id: item._id });
    const items = await fetchCart(req.user.id);
    res.json({ success: true, message: 'Item removed from cart.', items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/cart  (clear entire cart)
async function clearCart(req, res) {
  try {
    await Cart.deleteMany({ userId: req.user.id });
    res.json({ success: true, message: 'Cart cleared.', items: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
