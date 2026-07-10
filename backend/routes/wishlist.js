/* ═══════════════════════════════════════════════════════════
   MISFIT — routes/wishlist.js
═══════════════════════════════════════════════════════════ */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const { getWishlist, toggleWishlist, getWishlistIds } = require('../controllers/wishlistController');

router.get('/',            auth, getWishlist);
router.get('/ids',         auth, getWishlistIds);
router.post('/:productId', auth, toggleWishlist);

module.exports = router;
