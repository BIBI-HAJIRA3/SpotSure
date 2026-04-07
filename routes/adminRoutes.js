// SpotSure/routes/adminRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');

const router = express.Router();

// Hardcoded admin credentials
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin123';

// Session guard
function requireAdmin(req, res, next) {
  if (!req.session || req.session.userRole !== 'admin') {
    return res.status(401).json({ message: 'Admin access required' });
  }
  next();
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  req.session.userId = 'hardcoded-admin';
  req.session.userRole = 'admin';

  res.json({
    message: 'Logged in',
    user: { id: 'hardcoded-admin', username: ADMIN_USER, role: 'admin' },
  });
});

// GET /api/admin/services/pending
router.get('/services/pending', requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ isApproved: false }).sort({
      createdAt: -1,
    });
    res.json({ services });
  } catch (err) {
    console.error('GET /api/admin/services/pending error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/services/removal-requests
router.get('/services/removal-requests', requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ removalRequested: true }).sort({
      updatedAt: -1,
    });
    res.json({ services });
  } catch (err) {
    console.error('GET /api/admin/services/removal-requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/services/:id/approve
router.patch('/services/:id/approve', requireAdmin, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, removalRequested: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service approved', service });
  } catch (err) {
    console.error('PATCH /api/admin/services/:id/approve error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/services/:id
router.delete('/services/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await Review.deleteMany({ service: id });
    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service and reviews deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/services/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/reviews/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
