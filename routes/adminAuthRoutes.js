// SpotSure/routes/adminAuthRoutes.js
const express = require('express');
const User = require('../models/User');

const router = express.Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    // Only admin users
    const user = await User.findOne({
      username: username.trim(),
      role: 'admin',
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.userId = user._id;
    req.session.userRole = user.role;

    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('POST /api/admin/login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/me
router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.userId || req.session.userRole !== 'admin') {
      return res.json({ user: null });
    }

    const user = await User.findById(req.session.userId).select(
      '_id username role'
    );
    if (!user || user.role !== 'admin') {
      return res.json({ user: null });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
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
