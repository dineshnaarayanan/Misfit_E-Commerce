/* ═══════════════════════════════════════════════════════════
   MISFIT — routes/products.js
   Added: validateObjectId middleware to prevent 500 CastErrors
═══════════════════════════════════════════════════════════ */
const router          = require('express').Router();
const auth            = require('../middleware/auth');
const adminOnly       = require('../middleware/adminOnly');
const validateObjectId = require('../middleware/validateObjectId');
const {
  getProducts, getTopSellers, getProduct,
  createProduct, updateProduct, deleteProduct,
} = require('../controllers/productsController');

router.get ('/',            getProducts);
router.get ('/top-sellers', getTopSellers);
router.get ('/:id',         validateObjectId('id'), getProduct);
router.post('/',            auth, adminOnly, createProduct);
router.put ('/:id',         auth, adminOnly, validateObjectId('id'), updateProduct);
router.delete('/:id',       auth, adminOnly, validateObjectId('id'), deleteProduct);

module.exports = router;
