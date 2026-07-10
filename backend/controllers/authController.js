/* ═══════════════════════════════════════════════════════════
   MISFIT — controllers/authController.js  (Hardened)
   Fixes: email validation, password policy, Joi validation
═══════════════════════════════════════════════════════════ */
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const Joi    = require('joi');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../database/db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Joi Schemas ───────────────────────────────────────────────
const registerSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(60).required(),
  email:    Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  phone:    Joi.string().pattern(/^[+\d\s\-()]{7,20}$/).allow('', null).optional(),
  password: Joi.string()
    .min(6)
    .max(128)
    // At least one letter and one digit
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one letter and one number.',
      'string.min': 'Password must be at least 6 characters.',
    }),
});

const loginSchema = Joi.object({
  email:    Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  password: Joi.string().required(),
  role:     Joi.string().valid('user', 'admin').optional(),
});

// ── Helpers ───────────────────────────────────────────────────
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function safeUser(user) {
  const obj = user.toObject();
  delete obj.password;
  return { ...obj, id: String(obj._id) };
}

// ── POST /api/auth/register ───────────────────────────────────
async function register(req, res) {
  // 1. Validate with Joi
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(' | '),
    });
  }

  try {
    const { name, email, phone, password } = value;

    // 2. Duplicate check
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    // 3. Hash password (bcrypt cost 12 for stronger security)
    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({ name, email, phone: phone || '', password: hashed, role: 'user' });

    const token = generateToken(user);
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: safeUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── POST /api/auth/login ──────────────────────────────────────
async function login(req, res) {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(' | '),
    });
  }

  try {
    const { email, password, role } = value;

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    if (role && user.role !== role)
      return res.status(403).json({ success: false, message: `This account does not have ${role} access.` });

    const token = generateToken(user);
    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: safeUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── POST /api/auth/google ─────────────────────────────────────
async function googleLogin(req, res) {
  try {
    const { token, role = 'user' } = req.body;
    
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    const { sub: googleId, email, name } = payload;

    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user without password
      user = await User.create({ name, email, googleId, role: 'user' });
    } else if (!user.googleId) {
      // Link Google ID to existing user
      user.googleId = googleId;
      await user.save();
    }

    if (role && user.role !== role) {
      return res.status(403).json({ success: false, message: `This account does not have ${role} access.` });
    }

    const jwtToken = generateToken(user);
    res.json({
      success: true,
      message: `Welcome, ${user.name}!`,
      token: jwtToken,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('Google Auth Error:', err.message);
    res.status(401).json({ success: false, message: 'Google authentication failed.' });
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────
function getProfile(req, res) {
  res.json({ success: true, user: req.user });
}

// ── PUT /api/auth/me ──────────────────────────────────────────
async function updateProfile(req, res) {
  try {
    const updateSchema = Joi.object({
      name:      Joi.string().trim().min(2).max(60).optional(),
      phone:     Joi.string().pattern(/^[+\d\s\-()]{7,20}$/).allow('', null).optional(),
      address:   Joi.string().allow('', null).optional(),
      latitude:  Joi.string().allow('', null).optional(),
      longitude: Joi.string().allow('', null).optional(),
    });
    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: value },
      { new: true, select: '-password' }
    );
    res.json({ success: true, message: 'Profile updated.', user: { ...user.toObject(), id: user._id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── PUT /api/auth/me/password ────────────────────────────────
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword))
      return res.status(400).json({ success: false, message: 'Password must contain at least one letter and one number.' });

    const user = await User.findById(req.user.id);
    if (!user || !user.password)
      return res.status(400).json({ success: false, message: 'No password set on this account (Google login).' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ── GET /api/auth/users  (admin only) ─────────────────────────
async function getAllUsers(req, res) {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { register, login, googleLogin, getProfile, updateProfile, changePassword, getAllUsers };
