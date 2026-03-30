// SpotSure/routes/adminRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');
const User = require('../models/User');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session || req.session.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Simple admin login (separate from normal user auth if you wish)
// POST /api/admin/login
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
    if (!ok || user.role !== 'admin') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.userId = user._id;
    req.session.userRole = user.role;

    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('POST /api/admin/login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
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
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    service.isApproved = true;
    await service.save();
    res.json({ message: 'Service approved', service });
  } catch (err) {
    console.error('PATCH /api/admin/services/:id/approve error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/services/:id
router.delete('/services/:id', requireAdmin, async (req, res) => {
  try {
    const serviceId = req.params.id;
    await Review.deleteMany({ service: serviceId });
    await Service.findByIdAndDelete(serviceId);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/services/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const reviewId = req.params.id;
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    const serviceId = review.service;
    await review.deleteOne();
    // Optional: recompute ratings here if you import helper
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/reviews/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
