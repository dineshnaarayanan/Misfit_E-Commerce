/* ═══════════════════════════════════════════════
   MISFIT — routes/cart.js
   All routes require authentication.
   GET    /          — get cart
   POST   /          — add item
   PATCH  /:id       — update qty
   DELETE /:id       — remove item
   DELETE /           — clear cart
═══════════════════════════════════════════════ */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const {
  getCart, addToCart, updateCartItem, removeFromCart, clearCart
} = require('../controllers/cartController');

router.get   ('/',   auth, getCart);
router.post  ('/',   auth, addToCart);
router.patch ('/:id',auth, updateCartItem);
router.delete('/:id',auth, removeFromCart);
router.delete('/',   auth, clearCart);

module.exports = router;
