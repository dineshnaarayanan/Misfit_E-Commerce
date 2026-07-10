/* ═══════════════════════════════════════════════════════════
   MISFIT — controllers/adminController.js
   Full admin analytics & management APIs
═══════════════════════════════════════════════════════════ */
const mongoose = require('mongoose');
const { User, Product, Order, AccessLog } = require('../database/db');

// ── GET /api/admin/stats ─────────────────────────────────────
async function getDashboardStats(req, res) {
  try {
    const [
      totalOrders,
      totalCustomers,
      revenueAgg,
      statusCounts,
      lowStock,
      totalProducts,
    ] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, sales: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ stock: { $lte: 10, $gt: 0 } }),
      Product.countDocuments(),
    ]);

    const revenue = revenueAgg[0]?.revenue || 0;
    const totalSales = revenueAgg[0]?.sales || 0;

    const statusMap = {};
    statusCounts.forEach(s => { statusMap[s._id] = s.count; });

    const outOfStock = await Product.countDocuments({ stock: 0 });

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalCustomers,
        totalRevenue: revenue,
        totalSales,
        totalProducts,
        lowStock,
        outOfStock,
        byStatus: {
          pending:          statusMap['pending']          || 0,
          confirmed:        statusMap['confirmed']        || 0,
          packed:           statusMap['packed']           || 0,
          shipped:          statusMap['shipped']          || 0,
          outForDelivery:   statusMap['out-for-delivery'] || 0,
          delivered:        statusMap['delivered']        || 0,
          cancelled:        statusMap['cancelled']        || 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/analytics/sales?range=daily|weekly|monthly ─
async function getSalesAnalytics(req, res) {
  try {
    const range = req.query.range || 'weekly';

    let groupId, days;
    if (range === 'daily') {
      days = 30;
      groupId = {
        year:  { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day:   { $dayOfMonth: '$createdAt' },
      };
    } else if (range === 'weekly') {
      days = 84; // 12 weeks
      groupId = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' },
      };
    } else {
      days = 365;
      groupId = {
        year:  { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const data = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
      { $group: { _id: groupId, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
    ]);

    res.json({ success: true, range, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/analytics/top-products ────────────────────
async function getTopProducts(req, res) {
  try {
    const data = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id:     '$items.productId',
          name:    { $first: '$items.name' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          unitsSold: { $sum: '$items.qty' },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products', localField: '_id', foreignField: '_id',
          as: 'product',
        },
      },
      {
        $project: {
          name: 1, revenue: 1, unitsSold: 1,
          stock: { $arrayElemAt: ['$product.stock', 0] },
          category: { $arrayElemAt: ['$product.category', 0] },
        },
      },
    ]);
    res.json({ success: true, products: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/analytics/categories ──────────────────────
async function getTopCategories(req, res) {
  try {
    const data = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products', localField: 'items.productId', foreignField: '_id',
          as: 'prod',
        },
      },
      { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$prod.category',
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          unitsSold: { $sum: '$items.qty' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    res.json({ success: true, categories: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/analytics/couriers ────────────────────────
async function getCourierAnalytics(req, res) {
  try {
    const data = await Order.aggregate([
      { $match: { courierName: { $ne: null } } },
      {
        $group: {
          _id: '$courierName',
          total:     { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          shipped:   { $sum: { $cond: [{ $in: ['$status', ['shipped','out-for-delivery','delivered']] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          successRate: {
            $cond: [
              { $eq: ['$total', 0] }, 0,
              { $round: [{ $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 1] },
            ],
          },
        },
      },
      { $sort: { delivered: -1 } },
    ]);
    res.json({ success: true, couriers: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/analytics/customers ───────────────────────
async function getCustomerGrowth(req, res) {
  try {
    const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const data = await User.aggregate([
      { $match: { createdAt: { $gte: since }, role: 'user' } },
      {
        $group: {
          _id: {
            year:  { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/low-stock ─────────────────────────────────
async function getLowStockProducts(req, res) {
  try {
    const products = await Product.find({ stock: { $lte: 10 } })
      .select('name category stock price')
      .sort({ stock: 1 })
      .limit(50).lean();
    res.json({ success: true, products: products.map(p => ({ ...p, id: p._id })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── POST /api/admin/orders/:id/track ─────────────────────────
async function addTracking(req, res) {
  try {
    const { trackingId, courierName, shippingDate, estimatedDeliveryDate } = req.body;
    const COURIERS = ['Delhivery','DTDC','Blue Dart','India Post','XpressBees'];
    if (!trackingId?.trim()) return res.status(400).json({ success: false, message: 'Tracking ID required.' });
    if (!COURIERS.includes(courierName)) return res.status(400).json({ success: false, message: `Courier must be one of: ${COURIERS.join(', ')}` });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          trackingId:  trackingId.trim(),
          courierName,
          shippingDate:          shippingDate ? new Date(shippingDate) : new Date(),
          estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
          status: 'shipped',
        },
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    // 🔌 Notify admin room via Socket.io
    const io = req.app.get('io');
    const emitAdmin = req.app.get('emitAdmin');
    if (io && emitAdmin) {
      emitAdmin(io, 'order-shipped', {
        orderId: order._id.toString(),
        courierName,
        trackingId: trackingId.trim(),
        message: `Order #${order._id.toString().slice(-6)} shipped via ${courierName}`,
      });
    }

    res.json({ success: true, message: 'Tracking added. Status → Shipped.', order: { ...order.toObject(), id: order._id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/access-logs ────────────────────────────────
async function getAccessLogs(req, res) {
  try {
    const logs = await AccessLog.find({}).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/delivery-stats ────────────────────────────
async function getDeliveryStats(req, res) {
  try {
    const [agg] = await Order.aggregate([
      {
        $group: {
          _id: null,
          total:      { $sum: 1 },
          shipped:    { $sum: { $cond: [{ $in: ['$status', ['shipped','out-for-delivery','delivered']] }, 1, 0] } },
          delivered:  { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelled:  { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          returned:   { $sum: { $cond: [{ $in: ['$status', ['returned','refunded']] }, 1, 0] } },
        },
      },
    ]);
    const stats = agg || { total: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0 };
    stats.successRate = stats.total > 0
      ? +((stats.delivered / stats.total) * 100).toFixed(1)
      : 0;
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/admin/report?type=sales|orders|customers|products ─
async function getReportData(req, res) {
  try {
    const type = req.query.type || 'orders';
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // last 90 days

    if (type === 'orders') {
      const orders = await Order.find({ createdAt: { $gte: since } })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(500).lean();
      const rows = orders.map(o => ({
        orderId:       o._id.toString().slice(-8).toUpperCase(),
        customer:      o.userId?.name || 'Unknown',
        email:         o.userId?.email || '',
        total:         o.total,
        status:        o.status,
        paymentMethod: o.paymentMethod,
        courier:       o.courierName || '',
        trackingId:    o.trackingId  || '',
        date:          o.createdAt.toISOString().split('T')[0],
      }));
      return res.json({ success: true, type, rows });
    }

    if (type === 'products') {
      const products = await Product.find({}).select('name category price stock rating').limit(500).lean();
      const rows = products.map(p => ({
        name: p.name, category: p.category, price: p.price,
        stock: p.stock, rating: p.rating,
      }));
      return res.json({ success: true, type, rows });
    }

    if (type === 'customers') {
      const users = await User.find({ role: 'user' }).select('name email phone createdAt').limit(500).lean();
      const rows = users.map(u => ({
        name: u.name, email: u.email, phone: u.phone || '',
        joined: u.createdAt.toISOString().split('T')[0],
      }));
      return res.json({ success: true, type, rows });
    }

    if (type === 'sales') {
      const data = await Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $nin: ['cancelled','returned','refunded'] } } },
        { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
          revenue: { $sum: '$total' }, orders: { $sum: 1 },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]);
      const rows = data.map(d => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2,'0')}-${String(d._id.day).padStart(2,'0')}`,
        revenue: d.revenue, orders: d.orders,
      }));
      return res.json({ success: true, type, rows });
    }

    res.status(400).json({ success: false, message: 'Invalid report type. Use: orders|products|customers|sales' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}




// ── GET /api/admin/customers ──────────────────────────────────
async function getCustomerList(req, res) {
  try {
    const users = await User.find({ role: 'user' })
      .select('name email phone createdAt')
      .sort({ createdAt: -1 })
      .limit(500).lean();

    // Aggregate orders per user
    const orderStats = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id:        '$userId',
          orderCount: { $sum: 1 },
          totalSpend: { $sum: '$total' },
          lastOrder:  { $max: '$createdAt' },
        },
      },
    ]);

    const statsMap = {};
    orderStats.forEach(s => { statsMap[String(s._id)] = s; });

    const result = users.map(u => {
      const stats = statsMap[String(u._id)] || {};
      return {
        id:         String(u._id),
        name:       u.name,
        email:      u.email,
        phone:      u.phone || '',
        joinedAt:   u.createdAt,
        orderCount: stats.orderCount || 0,
        totalSpend: stats.totalSpend || 0,
        lastOrder:  stats.lastOrder  || null,
      };
    });

    res.json({ success: true, customers: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getDashboardStats, getSalesAnalytics, getTopProducts,
  getTopCategories, getCourierAnalytics, getCustomerGrowth,
  getLowStockProducts, addTracking, getAccessLogs,
  getDeliveryStats, getReportData, getCustomerList,
};
