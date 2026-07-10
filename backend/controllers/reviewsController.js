/* ═══════════════════════════════════════════════════════════
   MISFIT — controllers/reviewsController.js  (MongoDB)
═══════════════════════════════════════════════════════════ */
const { Review, Product } = require('../database/db');

// GET /api/reviews/:productId
async function getReviews(req, res) {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    const formatted = reviews.map(r => ({
      id:         r._id,
      rating:     r.rating,
      comment:    r.comment,
      created_at: r.createdAt,
      user_name:  r.userId?.name || 'Anonymous',
    }));
    res.json({ success: true, reviews: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/reviews/:productId  { rating, comment }
async function submitReview(req, res) {
  try {
    const { rating, comment = '' } = req.body;
    const productId = req.params.productId;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    // Upsert review (one review per user per product)
    await Review.findOneAndUpdate(
      { productId, userId: req.user.id },
      { $set: { rating: parseFloat(rating), comment: comment.trim() } },
      { upsert: true, new: true }
    );

    // Recalculate product rating
    const agg = await Review.aggregate([
      { $match: { productId: product._id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    if (agg.length) {
      await Product.findByIdAndUpdate(productId, {
        $set: {
          rating:  Math.round(agg[0].avg * 10) / 10,
          reviews: agg[0].count,
        }
      });
    }

    // Return all reviews for this product
    const reviews = await Review.find({ productId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    const formatted = reviews.map(r => ({
      id:         r._id,
      rating:     r.rating,
      comment:    r.comment,
      created_at: r.createdAt,
      user_name:  r.userId?.name || 'Anonymous',
    }));
    res.status(201).json({ success: true, message: 'Review submitted!', reviews: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/reviews/:reviewId
async function deleteReview(req, res) {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    if (String(review.userId) !== String(req.user.id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const productId = review.productId;
    await Review.findByIdAndDelete(req.params.reviewId);

    // Recalculate average
    const agg = await Review.aggregate([
      { $match: { productId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    await Product.findByIdAndUpdate(productId, {
      $set: {
        rating:  agg.length ? Math.round(agg[0].avg * 10) / 10 : 4.5,
        reviews: agg.length ? agg[0].count : 0,
      }
    });

    res.json({ success: true, message: 'Review deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getReviews, submitReview, deleteReview };
