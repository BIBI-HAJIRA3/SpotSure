// SpotSure/routes/authRoutes.js
const express = require('express');
const User = require('../models/User');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    const user = new User({
      username: username.trim(),
      password,
      role: 'user',
    });
    await user.save();

    req.session.userId = user._id;
    req.session.userRole = user.role;

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    res
      .status(500)
      .json({ message: 'Server error: ' + (err && err.message ? err.message : 'Unknown') });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.trim() });
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
    console.error('POST /api/auth/login error:', err);
    res
      .status(500)
      .json({ message: 'Server error: ' + (err && err.message ? err.message : 'Unknown') });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(200).json({ user: null });
    }

    const user = await User.findById(req.session.userId).select(
      '_id username role'
    );
    if (!user) {
      return res.status(200).json({ user: null });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    res
      .status(500)
      .json({ message: 'Server error: ' + (err && err.message ? err.message : 'Unknown') });
  }
});

module.exports = router;
