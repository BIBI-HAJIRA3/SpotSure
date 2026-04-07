// SpotSure/routes/adminAuthRoutes.js
const express = require('express');
const router = express.Router();

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'spotsure123';

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session = req.session || {};
      req.session.isAdmin = true;

      return res.json({
        message: 'Logged in',
        user: { username, role: 'admin' },
      });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (err) {
    console.error('POST /api/admin/login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.isAdmin = false;
  }
  res.json({ message: 'Logged out' });
});

module.exports = router;
