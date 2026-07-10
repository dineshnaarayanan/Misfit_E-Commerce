/* ═══════════════════════════════════════════════════════════
   MISFIT — middleware/auth.js  (MongoDB)
   Verifies JWT and attaches user from MongoDB to req.user
═══════════════════════════════════════════════════════════ */
const jwt      = require('jsonwebtoken');
const { User } = require('../database/db');

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Authentication required.' });

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id, '-password');
    if (!user)
      return res.status(401).json({ success: false, message: 'User not found.' });

    req.user = { ...user.toObject(), id: String(user._id) };
    next();
  } catch (_) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};
