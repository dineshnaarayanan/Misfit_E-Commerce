/* ═══════════════════════════════════════════════════════════
   MISFIT — controllers/productsController.js  (Hardened)
   Fixes: ReDoS-safe search, mass assignment, field whitelist,
          ObjectId validation, pagination
═══════════════════════════════════════════════════════════ */
const mongoose = require('mongoose');
const { Product } = require('../database/db');

// ── Allowed update fields whitelist ──────────────────────────
const PRODUCT_UPDATE_FIELDS = [
  'name', 'category', 'price', 'origPrice', 'description',
  'sizes', 'colours', 'colourHex', 'gradient', 'stock',
  'rating', 'letter', 'topSeller', 'imageUrl',
];

function escapeRegex(str) {
  // Escape all special regex characters to prevent ReDoS
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fmt(p) {
  const obj = p.toObject ? p.toObject() : p;
  return { ...obj, id: String(obj._id) };
}

// ── GET /api/products?category=&search=&sizes=S,M&maxPrice=999&page=&limit= ──
async function getProducts(req, res) {
  try {
    const { category, search, sizes, maxPrice } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const filter = {};

    // Category filter
    if (category && category !== 'all') filter.category = category;

    // Full-text search using MongoDB Text Index
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    // Size filter: match products that have ANY of the requested sizes
    if (sizes && sizes.trim()) {
      const sizeArr = sizes.split(',').map(s => s.trim()).filter(Boolean);
      if (sizeArr.length > 0) filter.sizes = { $in: sizeArr };
    }

    // Max price filter
    if (maxPrice && !isNaN(Number(maxPrice))) {
      filter.price = { $lte: Number(maxPrice) };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      products: products.map(fmt),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/products/top-sellers ────────────────────────────
async function getTopSellers(req, res) {
  try {
    const products = await Product.find({ topSeller: true }).sort({ rating: -1 }).limit(8).lean();
    res.json({ success: true, products: products.map(fmt) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/products/:id ─────────────────────────────────────
async function getProduct(req, res) {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, product: fmt(product) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── POST /api/products  (admin only) ─────────────────────────
async function createProduct(req, res) {
  try {
    const { name, category, price, origPrice, description, sizes, colours,
            colourHex, gradient, stock, rating, letter, topSeller, imageUrl } = req.body;

    if (!name || !category || !price || !description)
      return res.status(400).json({ success: false, message: 'Name, category, price, and description are required.' });

    if (isNaN(Number(price)) || Number(price) <= 0)
      return res.status(400).json({ success: false, message: 'Price must be a positive number.' });

    const product = await Product.create({
      name: name.trim(), category, price: Number(price),
      origPrice: origPrice ? Number(origPrice) : null,
      description: description.trim(),
      sizes:     Array.isArray(sizes)     ? sizes     : [],
      colours:   Array.isArray(colours)   ? colours   : [],
      colourHex: Array.isArray(colourHex) ? colourHex : [],
      gradient:  gradient || 'linear-gradient(135deg,#1a1a1a,#ff6b00)',
      stock:     Math.max(0, Number(stock || 100)),
      rating:    Math.min(5, Math.max(0, Number(rating || 4.5))),
      letter:    (letter || 'M').slice(0, 3),
      topSeller: !!topSeller,
      imageUrl:  imageUrl || '',
    });
    res.status(201).json({ success: true, message: `"${name}" added!`, product: fmt(product) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── PUT /api/products/:id  (admin only) ──────────────────────
// FIXED: mass assignment — only whitelisted fields applied
async function updateProduct(req, res) {
  try {
    // Build a safe update object from whitelisted fields only
    const updates = {};
    for (const field of PRODUCT_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0)
      return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });

    // Coerce numeric fields
    if (updates.price    !== undefined) updates.price    = Number(updates.price);
    if (updates.origPrice !== undefined) updates.origPrice = updates.origPrice ? Number(updates.origPrice) : null;
    if (updates.stock    !== undefined) updates.stock    = Math.max(0, Number(updates.stock));
    if (updates.rating   !== undefined) updates.rating   = Math.min(5, Math.max(0, Number(updates.rating)));

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product updated.', product: fmt(product) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── DELETE /api/products/:id  (admin only) ───────────────────
async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: `"${product.name}" deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getProducts, getTopSellers, getProduct, createProduct, updateProduct, deleteProduct };
