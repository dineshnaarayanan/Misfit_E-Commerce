/* ═══════════════════════════════════════════════════════════
   MISFIT — routes/reviews.js
═══════════════════════════════════════════════════════════ */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const { getReviews, submitReview, deleteReview } = require('../controllers/reviewsController');

router.get('/:productId',         getReviews);
router.post('/:productId',  auth, submitReview);
router.delete('/:reviewId', auth, deleteReview);

module.exports = router;
