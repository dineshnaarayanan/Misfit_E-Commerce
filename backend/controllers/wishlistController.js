/* ═══════════════════════════════════════════════════════════
   MISFIT — controllers/wishlistController.js  (MongoDB)
═══════════════════════════════════════════════════════════ */
const { Wishlist, Product } = require('../database/db');

function fmtProduct(p) {
  const obj = p.toObject ? p.toObject() : p;
  return { ...obj, id: String(obj._id) };
}

// GET /api/wishlist
async function getWishlist(req, res) {
  try {
    const items = await Wishlist.find({ userId: req.user.id })
      .populate('productId')
      .sort({ createdAt: -1 })
      .lean();

    const wishlist = items
      .filter(i => i.productId)
      .map(i => fmtProduct(i.productId));

    res.json({ success: true, wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/wishlist/:productId  — toggle
async function toggleWishlist(req, res) {
  try {
    const productId = req.params.productId;

    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const existing = await Wishlist.findOne({ userId: req.user.id, productId });
    if (existing) {
      await Wishlist.deleteOne({ _id: existing._id });
      return res.json({ success: true, wishlisted: false, message: 'Removed from wishlist.' });
    } else {
      await Wishlist.create({ userId: req.user.id, productId });
      return res.json({ success: true, wishlisted: true, message: 'Added to wishlist! ❤️' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/wishlist/ids
async function getWishlistIds(req, res) {
  try {
    const items = await Wishlist.find({ userId: req.user.id }, 'productId').lean();
    res.json({ success: true, ids: items.map(i => String(i.productId)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getWishlist, toggleWishlist, getWishlistIds };
