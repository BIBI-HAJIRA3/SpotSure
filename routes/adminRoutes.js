// SpotSure/routes/adminRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');

const router = express.Router();

// Session gate for admin routes
function requireAdmin(req, res, next) {
  if (!req.session || req.session.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// HARD-CODED admin credentials (no DB user needed)
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

    if (username.trim() !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Mark session as admin; no User document
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

// OPTIONAL: GET /api/admin/me (for auto-login in admin.html)
router.get('/me', (req, res) => {
  if (!req.session || req.session.userRole !== 'admin') {
    return res.status(200).json({ user: null });
  }
  res.json({
    user: {
      id: 'admin-fixed',
      username: ADMIN_USERNAME,
      role: 'admin',
    },
  });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
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
    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/reviews/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// (If you have extra admin search/report routes, keep them here too.)

module.exports = router;
