/* ═══════════════════════════════════════════════════════════
   MISFIT — routes/payment.js
   Razorpay payment routes (all auth-protected)
═══════════════════════════════════════════════════════════ */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const { createRazorpayOrder, verifyPayment, getKey } = require('../controllers/paymentController');

router.get ('/key',    auth, getKey);
router.post('/order',  auth, createRazorpayOrder);
router.post('/verify', auth, verifyPayment);

module.exports = router;
