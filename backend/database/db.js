/* ═══════════════════════════════════════════════════════════
   MISFIT — database/db.js
   MongoDB + Mongoose — models and connection
═══════════════════════════════════════════════════════════ */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── CONNECT ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env file!');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log(`✅ MongoDB Atlas connected ✓`);
    seedDB();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.warn('⚠️ Server will continue running without database connectivity.');
  });

// ── SCHEMAS ───────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  password: { type: String },
  googleId: { type: String, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  address: { type: String, default: '' },
  latitude: { type: String, default: '' },
  longitude: { type: String, default: '' },
}, { timestamps: true });
userSchema.index({ createdAt: -1 });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  origPrice: { type: Number, default: null },
  description: { type: String, default: '' },
  sizes: { type: [String], default: [] },
  colours: { type: [String], default: [] },
  colourHex: { type: [String], default: [] },
  gradient: { type: String, default: 'linear-gradient(135deg,#1a1a1a,#ff6b00)' },
  stock: { type: Number, default: 100 },
  rating: { type: Number, default: 4.5 },
  reviews: { type: Number, default: 0 },
  letter: { type: String, default: 'M' },
  topSeller: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
}, { timestamps: true });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ name: 'text', description: 'text' });

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  size: { type: String, required: true },
  colour: { type: String, required: true },
  qty: { type: Number, default: 1, min: 1 },
});
cartSchema.index({ userId: 1, productId: 1, size: 1, colour: 1 }, { unique: true });

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  price: Number,
  size: String,
  colour: String,
  qty: Number,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: Number, unique: true, sparse: true },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  address: { type: String, required: true },
  paymentMethod: { type: String, default: 'cod' },
  // Razorpay
  razorpayOrderId:   { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  paymentVerified:   { type: Boolean, default: false },
  paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  // Extended status flow
  status: {
    type: String,
    enum: ['pending','confirmed','packed','shipped','out-for-delivery','delivered','cancelled','returned','refunded'],
    default: 'pending',
  },
  // Courier tracking
  trackingId:            { type: String, default: null },
  courierName:           { type: String, default: null,
    enum: ['Delhivery','DTDC','Blue Dart','India Post','XpressBees', null] },
  shippingDate:          { type: Date, default: null },
  estimatedDeliveryDate: { type: Date, default: null },
  deliveryDate:          { type: Date, default: null },
  returnedDate:          { type: Date, default: null },
  cancelReason:          { type: String, default: null },
  refundAmount:          { type: Number, default: null },
}, { timestamps: true });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ courierName: 1 });
orderSchema.index({ razorpayOrderId: 1 });
orderSchema.index({ paymentStatus: 1 });


const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
}, { timestamps: true });
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
}, { timestamps: true });
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 1000 }
});

// ── MODELS ────────────────────────────────────────────────────
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);
const Review = mongoose.model('Review', reviewSchema);
const Wishlist = mongoose.model('Wishlist', wishlistSchema);
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

// ── SEED ─────────────────────────────────────────────────────
async function seedDB() {
  await seedCounter();
  await seedUsers();
  await seedProducts();
  await updateExistingProductImages();
}

async function seedCounter() {
  const count = await Counter.countDocuments({ _id: 'orderId' });
  if (count === 0) {
    await Counter.create({ _id: 'orderId', seq: 1000 });
    console.log('✅ Counter seeded to 1000.');
  }
}

async function seedUsers() {
  const count = await User.countDocuments();
  if (count > 0) return;

  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('user123', 10);

  await User.insertMany([
    { name: 'Admin User', email: 'admin@misfit.in', phone: '+91 98765 00001', password: adminHash, role: 'admin' },
    { name: 'Test Customer', email: 'user@misfit.in', phone: '+91 98765 00002', password: userHash, role: 'user' },
  ]);
  console.log('✅ Default users seeded.');
}

async function seedProducts() {
  const count = await Product.countDocuments();
  if (count > 0) return;

  await Product.insertMany([
    {
      name: 'Shadow Drop Oversized', category: 'oversized', price: 799, origPrice: 1299,
      description: 'Raw-cut hemline, 260gsm cotton-blend fleece. Boxy silhouette that commands space without asking permission.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['Black', 'Chalk White', 'Ash Grey'],
      colourHex: ['#111111', '#f5f5f0', '#9ca3af'],
      gradient: 'linear-gradient(135deg,#111111,#ff6b00)',
      stock: 80, rating: 4.8, reviews: 214, letter: 'OS', topSeller: true,
      imageUrl: '/products/D1.jpeg',
    },
    {
      name: 'Acid Bleed Tee', category: 'acid-wash', price: 899, origPrice: 1499,
      description: "Hand-acid-washed for a one-of-a-kind effect. No two pieces are identical — that's the point.",
      sizes: ['S', 'M', 'L', 'XL'], colours: ['Violet Mist', 'Cobalt Storm', 'Desert Rust'],
      colourHex: ['#7c3aed', '#1d4ed8', '#b45309'],
      gradient: 'linear-gradient(135deg,#4a1a6e,#dc2626)',
      stock: 45, rating: 4.7, reviews: 189, letter: 'AW', topSeller: true,
      imageUrl: '/products/D2.jpeg',
    },
    {
      name: 'Heritage Polo', category: 'polo', price: 649, origPrice: 999,
      description: 'Two-button placket, ribbed collar. Structured enough for a dinner, relaxed enough for a rooftop.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['Forest Green', 'Navy', 'Off White', 'Black'],
      colourHex: ['#166534', '#1e3a5f', '#fafaf5', '#111111'],
      gradient: 'linear-gradient(135deg,#0f3460,#16213e)',
      stock: 120, rating: 4.6, reviews: 302, letter: 'PL', topSeller: true,
      imageUrl: '/products/D3.jpeg',
    },
    {
      name: 'Glitch Graphic Tee', category: 'graphic', price: 699, origPrice: 1099,
      description: 'Screen-printed glitch-art design on a 220gsm cotton base. Designed in-house, printed to last.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'], colours: ['Black', 'White'],
      colourHex: ['#111111', '#f5f5f0'],
      gradient: 'linear-gradient(135deg,#111111,#6d28d9)',
      stock: 60, rating: 4.5, reviews: 97, letter: 'GR', topSeller: false,
      imageUrl: '/products/Gemini_Generated_Image_1u8p0p1u8p0p1u8p.png',
    },
    {
      name: 'Clean Slate Solid', category: 'plain', price: 399, origPrice: 599,
      description: 'The foundation piece. 200gsm single jersey, shoulder-to-shoulder tape, pre-shrunk. Fits like it should.',
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], colours: ['Black', 'White', 'Slate', 'Maroon', 'Olive'],
      colourHex: ['#111111', '#f5f5f0', '#64748b', '#881337', '#4d7c0f'],
      gradient: 'linear-gradient(135deg,#374151,#111111)',
      stock: 200, rating: 4.4, reviews: 512, letter: 'SS', topSeller: true,
      imageUrl: '/products/Gemini_Generated_Image_9jlwnr9jlwnr9jlw.png',
    },
    {
      name: 'Washed Rebel Oversized', category: 'oversized', price: 899, origPrice: 1399,
      description: 'Enzyme-washed for a worn-in vintage feel. Drop-shoulder cut, extended hem. Maximum street presence.',
      sizes: ['S', 'M', 'L', 'XL'], colours: ['Faded Black', 'Washed Navy', 'Sand'],
      colourHex: ['#2a2a2a', '#253555', '#c4a882'],
      gradient: 'linear-gradient(135deg,#2a2a2a,#c4a882)',
      stock: 35, rating: 4.9, reviews: 156, letter: 'WR', topSeller: false,
      imageUrl: '/products/Gemini_Generated_Image_aju8s0aju8s0aju8.png',
    },
    {
      name: 'Stripe Edge Polo', category: 'polo', price: 749, origPrice: 1199,
      description: 'Contrast tipping on collar and cuffs. Piqué knit fabric with moisture-wicking finish.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['White/Navy', 'Black/White', 'Green/White'],
      colourHex: ['#f5f5f0', '#111111', '#166534'],
      gradient: 'linear-gradient(135deg,#f5f5f0,#1e3a5f)',
      stock: 70, rating: 4.3, reviews: 88, letter: 'SP', topSeller: false,
      imageUrl: '/products/Gemini_Generated_Image_bpanl8bpanl8bpan.png',
    },
    {
      name: 'Skull Acid Wash', category: 'acid-wash', price: 999, origPrice: 1599,
      description: 'Acid-washed canvas meets screen-printed skull motif. Heavyweight 280gsm for premium drape.',
      sizes: ['M', 'L', 'XL', 'XXL'], colours: ['Black/Purple', 'Black/Red'],
      colourHex: ['#4a1a6e', '#7f1d1d'],
      gradient: 'linear-gradient(135deg,#1a0a2e,#8b0000)',
      stock: 28, rating: 4.8, reviews: 67, letter: 'SK', topSeller: false,
      imageUrl: '/products/Gemini_Generated_Image_i01i6ci01i6ci01i.png',
    },
  ]);
  console.log('✅ Products seeded.');
}

async function updateExistingProductImages() {
  const imagesList = [
    'D1.jpeg',
    'D2.jpeg',
    'D3.jpeg',
    'Gemini_Generated_Image_1u8p0p1u8p0p1u8p.png',
    'Gemini_Generated_Image_9jlwnr9jlwnr9jlw.png',
    'Gemini_Generated_Image_aju8s0aju8s0aju8.png',
    'Gemini_Generated_Image_bpanl8bpanl8bpan.png',
    'Gemini_Generated_Image_i01i6ci01i6ci01i.png',
    'Gemini_Generated_Image_mwdonkmwdonkmwdo.png',
    'Gemini_Generated_Image_nyktbsnyktbsnykt.png',
    'Gemini_Generated_Image_ooh04fooh04fooh0.png',
    'Gemini_Generated_Image_q1s9b6q1s9b6q1s9.png',
    'Gemini_Generated_Image_r77cffr77cffr77c.png'
  ];

  const products = await Product.find({});
  let updated = false;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    // If imageUrl is empty, null, or a dummy string that isn't one of our files, update it
    const hasImage = p.imageUrl && imagesList.some(img => p.imageUrl.includes(img));
    if (!hasImage) {
      const imgFile = imagesList[i % imagesList.length];
      p.imageUrl = `/products/${imgFile}`;
      await p.save();
      console.log(`[Auto-Update] Assigned ${p.imageUrl} to product "${p.name}"`);
      updated = true;
    }
  }
  if (updated) {
    console.log('✅ Updated existing product images in database.');
  }
}


// ── Access Log (unauthorized attempts) ──────────────────────
const accessLogSchema = new mongoose.Schema({
  ip:       { type: String },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email:    { type: String, default: null },
  route:    { type: String },
  method:   { type: String },
  message:  { type: String },
}, { timestamps: true });

const AccessLog = mongoose.models.AccessLog || mongoose.model('AccessLog', accessLogSchema);

module.exports = { User, Product, Cart, Order, Review, Wishlist, AccessLog, Counter };
