// SpotSure/routes/adminRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');
const Report = require('../models/Report');

const router = express.Router();

// Hardcoded admin credentials (harder)
const ADMIN_USER = process.env.ADMIN_USER || 'admin_spotsure_2026';
const ADMIN_PASS =
  process.env.ADMIN_PASS || 'Sp0tSure_Admin!2026#Secure';

// Session guard
function requireAdmin(req, res, next) {
  if (!req.session || req.session.userRole !== 'admin') {
    return res.status(401).json({ message: 'Admin access required' });
  }
  next();
}

// POST /api/admin/login
router.post('/login', (req, res, next) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  req.session.regenerate((err) => {
    if (err) return next(err);

    req.session.userId = 'hardcoded-admin';
    req.session.userRole = 'admin';

    req.session.save((err2) => {
      if (err2) return next(err2);
      res.json({
        message: 'Logged in',
        user: { id: 'hardcoded-admin', username: ADMIN_USER, role: 'admin' },
      });
    });
  });
});

// GET /api/admin/me
router.get('/me', (req, res) => {
  if (!req.session || req.session.userRole !== 'admin') {
    return res.status(401).json({ message: 'Not admin' });
  }
  res.json({
    user: {
      id: req.session.userId || 'hardcoded-admin',
      username: ADMIN_USER,
      role: 'admin',
    },
  });
});

// POST /api/admin/logout
router.post('/logout', requireAdmin, (req, res, next) => {
  req.session.userId = null;
  req.session.userRole = null;
  req.session.save((err) => {
    if (err) return next(err);
    req.session.regenerate((err2) => {
      if (err2) return next(err2);
      res.json({ message: 'Logged out' });
    });
  });
});

// Pending services
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

// Removal requests
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

// Approve service
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

// Delete service + its reviews
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

// Delete any review
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

// Service reports
router.get('/reports/services', requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find({ type: 'service' })
      .populate('service')
      .sort({ createdAt: -1 });
  res.json({ reports });
  } catch (err) {
    console.error('GET /api/admin/reports/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Review reports
router.get('/reports/reviews', requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find({ type: 'review' })
      .populate('review')
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    console.error('GET /api/admin/reports/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search services by name
router.get('/services/search', requireAdmin, async (req, res) => {
  try {
    const q = (req.query.name || '').trim();
    if (!q) return res.json({ services: [] });
    const regex = new RegExp(q, 'i');
    const services = await Service.find({ name: regex, isApproved: true })
      .limit(20)
      .sort({ createdAt: -1 });
    res.json({ services });
  } catch (err) {
    console.error('GET /api/admin/services/search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
