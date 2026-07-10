/* ═══════════════════════════════════════════════════════════
   MISFIT — routes/reports.js
   CSV / Excel export endpoints (admin only)
═══════════════════════════════════════════════════════════ */
const router          = require('express').Router();
const auth            = require('../middleware/auth');
const adminOnly       = require('../middleware/adminOnly');
const logUnauthorized = require('../middleware/logUnauthorized');
const { getReportData } = require('../controllers/adminController');

const guard = [auth, logUnauthorized('Non-admin accessed report route'), adminOnly];

// GET /api/reports?type=orders|sales|products|customers
router.get('/', guard, getReportData);

module.exports = router;
