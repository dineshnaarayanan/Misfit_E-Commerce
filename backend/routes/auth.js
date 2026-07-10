/* ═══════════════════════════════════════════════
   MISFIT — routes/auth.js
   Public: POST /register  POST /login
   Protected: GET/PUT /me
   Admin: GET /users
═══════════════════════════════════════════════ */
const router     = require('express').Router();
const auth       = require('../middleware/auth');
const adminOnly  = require('../middleware/adminOnly');
const {
  register, login, googleLogin, getProfile, updateProfile, changePassword, getAllUsers
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login',    login);
router.post('/google',   googleLogin);
router.get ('/me',            auth, getProfile);
router.put ('/me',            auth, updateProfile);
router.put ('/me/password',   auth, changePassword);
router.get ('/users',         auth, adminOnly, getAllUsers);

module.exports = router;
