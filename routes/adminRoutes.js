// SpotSure/routes/adminRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');
const serviceRoutes = require('./serviceRoutes'); // router with helper attached

const router = express.Router();

const recomputeServiceRatings = serviceRoutes.recomputeServiceRatings;

// adjust to your auth logic
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId || req.session.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// pending services
router.get('/services/pending', requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ isApproved: false }).sort({ createdAt: -1 });
    res.json({ services });
  } catch (err) {
    console.error('GET /api/admin/services/pending error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// approve service
router.post('/services/:id/approve', requireAdmin, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service approved', service });
  } catch (err) {
    console.error('POST /api/admin/services/:id/approve error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// delete service + its reviews
router.delete('/services/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    await Review.deleteMany({ service: id });
    await Service.findByIdAndDelete(id);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/services/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// latest reviews
router.get('/reviews', requireAdmin, async (req, res) => {
  try {
    const reviews = await Review.find({}).sort({ createdAt: -1 }).limit(100);
    res.json({ reviews });
  } catch (err) {
    console.error('GET /api/admin/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// delete review
router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (recomputeServiceRatings) {
      await recomputeServiceRatings(review.service);
    }
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/reviews/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
