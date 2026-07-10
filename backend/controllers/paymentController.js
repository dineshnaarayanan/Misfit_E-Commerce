/* ═══════════════════════════════════════════════════════════
   MISFIT — controllers/paymentController.js
   Full Razorpay Integration:
   1. POST /api/payment/order  → create Razorpay order
   2. POST /api/payment/verify → HMAC signature verification
═══════════════════════════════════════════════════════════ */
const Razorpay = require('razorpay');
const crypto   = require('crypto');

// Initialise Razorpay instance (reads from .env)
let razorpay;
function getRazorpay() {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
    }
    razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

// ── POST /api/payment/order ───────────────────────────────────
// Creates a Razorpay order and returns the order_id to the frontend.
// The frontend then opens the Razorpay checkout modal.
async function createRazorpayOrder(req, res) {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: 'Valid amount is required.' });

    // Razorpay expects amount in paise (₹1 = 100 paise)
    const options = {
      amount:   Math.round(Number(amount) * 100),
      currency,
      receipt:  receipt || `misfit_${Date.now()}`,
      payment_capture: 1, // auto-capture
    };

    const order = await getRazorpay().orders.create(options);

    res.json({
      success:        true,
      razorpayOrderId: order.id,
      amount:          order.amount,
      currency:        order.currency,
      keyId:           process.env.RAZORPAY_KEY_ID, // safe to send to frontend
    });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create payment order.' });
  }
}

// ── POST /api/payment/verify ──────────────────────────────────
// Verifies Razorpay payment signature using HMAC-SHA256.
// MUST be called before creating the DB order.
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ success: false, message: 'Missing payment fields.' });

    // Build expected signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // Signature matches → payment is genuine
    res.json({
      success:           true,
      message:           'Payment verified successfully.',
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error('Razorpay verify error:', err);
    res.status(500).json({ success: false, message: err.message || 'Payment verification error.' });
  }
}

// ── GET /api/payment/key ──────────────────────────────────────
// Returns the public Razorpay key (safe to expose)
function getKey(req, res) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId)
    return res.status(500).json({ success: false, message: 'Razorpay not configured on server.' });
  res.json({ success: true, keyId });
}

module.exports = { createRazorpayOrder, verifyPayment, getKey };
