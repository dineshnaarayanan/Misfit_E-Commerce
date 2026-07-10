/* ═══════════════════════════════════════════════════════════
   MISFIT — routes/admin.js
   All routes protected: auth + adminOnly + unauthorized logging
═══════════════════════════════════════════════════════════ */
const router           = require('express').Router();
const auth             = require('../middleware/auth');
const adminOnly        = require('../middleware/adminOnly');
const logUnauthorized  = require('../middleware/logUnauthorized');
const {
  getDashboardStats, getSalesAnalytics, getTopProducts,
  getTopCategories, getCourierAnalytics, getCustomerGrowth,
  getLowStockProducts, addTracking, getAccessLogs,
  getDeliveryStats, getReportData, getCustomerList,
} = require('../controllers/adminController');

// Guard: auth → log if unauthorized → adminOnly
const guard = [auth, logUnauthorized('Non-admin accessed admin route'), adminOnly];

router.get ('/stats',                  guard, getDashboardStats);
router.get ('/analytics/sales',        guard, getSalesAnalytics);
router.get ('/analytics/top-products', guard, getTopProducts);
router.get ('/analytics/categories',   guard, getTopCategories);
router.get ('/analytics/couriers',     guard, getCourierAnalytics);
router.get ('/analytics/customers',    guard, getCustomerGrowth);
router.get ('/analytics/delivery',     guard, getDeliveryStats);
router.get ('/low-stock',              guard, getLowStockProducts);
router.get ('/report',                 guard, getReportData);
router.post('/orders/:id/track',       guard, addTracking);
router.get ('/access-logs',            guard, getAccessLogs);
router.get ('/customers',              guard, getCustomerList);

module.exports = router;
