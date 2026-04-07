// SpotSure/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Review = require('../models/Review');
const Report = require('../models/Report');
const requireAdmin = require('../middleware/requireAdmin');

// who am I (for admin.html)
router.get('/me', requireAdmin, (req, res) => {
  res.json({ user: { username: 'admin', role: 'admin' } });
});

// PENDING SERVICES (if you ever set isApproved=false)
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

// APPROVE SERVICE
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

// DELETE SERVICE + ITS REVIEWS + REPORTS
router.delete('/services/:id', requireAdmin, async (req, res) => {
  try {
    const serviceId = req.params.id;

    const reviews = await Review.find({ service: serviceId }).select('_id');
    const reviewIds = reviews.map((r) => r._id);

    await Review.deleteMany({ service: serviceId });

    await Report.deleteMany({
      $or: [
        { type: 'service', service: serviceId },
        { type: 'review', review: { $in: reviewIds } },
      ],
    });

    const service = await Service.findByIdAndDelete(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service, reviews and reports deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/services/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// REMOVAL REQUESTS
router.get('/services/removal-requests', requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ removalRequested: true }).sort({
      createdAt: -1,
    });
    res.json({ services });
  } catch (err) {
    console.error(
      'GET /api/admin/services/removal-requests error:',
      err
    );
    res.status(500).json({ message: 'Server error' });
  }
});

// REPORTED SERVICES
router.get('/reports/services', requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find({ type: 'service' })
      .populate('service')
      .sort({ createdAt: -1 });

    const filtered = reports.filter((r) => r.service);
    res.json({ reports: filtered });
  } catch (err) {
    console.error('GET /api/admin/reports/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE REVIEW + ITS REPORTS
router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const reviewId = req.params.id;

    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await Report.deleteMany({ type: 'review', review: reviewId });

    res.json({ message: 'Review and its reports deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/reviews/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// REPORTED REVIEWS
router.get('/reports/reviews', requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find({ type: 'review' })
      .populate('review')
      .sort({ createdAt: -1 });

    const filtered = reports.filter((r) => r.review);
    res.json({ reports: filtered });
  } catch (err) {
    console.error('GET /api/admin/reports/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// SERVICE SEARCH BY NAME (used in admin.html)
router.get('/services/search', requireAdmin, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || !name.trim()) {
      return res.json({ services: [] });
    }
    const services = await Service.find({
      name: { $regex: name.trim(), $options: 'i' },
    }).sort({ createdAt: -1 });

    res.json({ services });
  } catch (err) {
    console.error('GET /api/admin/services/search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
