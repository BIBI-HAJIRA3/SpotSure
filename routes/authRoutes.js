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
router.post('/login', a
