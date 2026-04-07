// SpotSure/routes/adminRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session || req.session.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// HARD-CODED admin credentials
const ADMIN_USERNAME = 'spotsureadmin';
const ADMIN_PASSWORD = 'spotsure2026admin';

// POST /api/admin/login
router.post('/login', async (req, res) => {
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

    // Mark session as admin without using User collection
    req.session.userId = 'admin-fixed';
    req.session.userRole = 'admin';

    res.json({
      user: {
        id: 'admin-fixed',
        username: ADMIN_USERNAME,
        role: 'admin',
      },
    });
  } catch (err) {
    console.error('POST /api/admin/login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
