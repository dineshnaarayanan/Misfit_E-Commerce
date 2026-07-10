/* ═══════════════════════════════════════════════
   MISFIT — routes/orders.js
   Protected: POST /       — place order
              GET  /my     — user's orders
              GET  /:id    — single order
   Admin:     GET  /       — all orders
              PATCH /:id/status  — update status
═══════════════════════════════════════════════ */
const router    = require('express').Router();
const auth      = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const {
  placeOrder, getMyOrders, getAllOrders, getOrder, updateOrderStatus
} = require('../controllers/ordersController');

router.post ('/',           auth,             placeOrder);
router.get  ('/my',         auth,             getMyOrders);
router.get  ('/',           auth, adminOnly,  getAllOrders);
router.get  ('/:id',        auth,             getOrder);
router.patch('/:id/status', auth, adminOnly,  updateOrderStatus);

module.exports = router;
