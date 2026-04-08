// SpotSure/routes/adminAuthRoutes.js
const express = require('express');

const router = express.Router();

// Hard-coded admin credentials
const ADMIN_USERNAME = 'spotsureadmin';
const ADMIN_PASSWORD = 'spotsure2026admin';

// POST /api/admin/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    if (
      username.trim() !== ADMIN_USERNAME ||
      password !== ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Mark this session as admin
    req.session.isAdmin = true;

    res.json({
      user: {
        username: ADMIN_USERNAME,
        role: 'admin',
      },
    });
  } catch (err) {
    console.error('POST /api/admin/login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/me
router.get('/me', (req, res) => {
  try {
    if (!req.session || !req.session.isAdmin) {
      return res.json({ user: null });
    }

    res.json({
      user: {
        username: ADMIN_USERNAME,
        role: 'admin',
      },
    });
  } catch (err) {
    console.error('GET /api/admin/me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;
