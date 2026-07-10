/* ═══════════════════════════════════════════════════════════
   MISFIT — middleware/logUnauthorized.js
   Logs unauthorized admin access attempts to MongoDB
═══════════════════════════════════════════════════════════ */
const { AccessLog } = require('../database/db');

module.exports = function logUnauthorized(message = 'Unauthorized admin access attempt') {
  return async (req, res, next) => {
    try {
      await AccessLog.create({
        ip:      req.ip || req.connection?.remoteAddress,
        userId:  req.user?.id   || null,
        email:   req.user?.email || null,
        route:   req.originalUrl,
        method:  req.method,
        message,
      });
    } catch (e) {
      // Non-blocking — never crash the server due to logging
      console.error('AccessLog error:', e.message);
    }
    next();
  };
};
