/* ═══════════════════════════════════════════════════════════
   MISFIT — middleware/validateObjectId.js
   Returns 400 for invalid MongoDB ObjectId instead of 500
═══════════════════════════════════════════════════════════ */
const mongoose = require('mongoose');

module.exports = function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID format: "${id}" is not a valid resource identifier.`,
      });
    }
    next();
  };
};
