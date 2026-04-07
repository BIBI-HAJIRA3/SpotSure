// SpotSure/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Review = require('../models/Review');
const Report = require('../models/Report');
const requireAdmin = require('../middleware/requireAdmin');

// current admin
router.get('/me', requireAdmin, (req, res) => {
  res.json({ user: req.user });
});

// PENDING SERVICES
router.get('/services/pending', requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ status: 'pending' }).sort({
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
      { status: 'approved', removalRequested: false },
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

    // find reviews for this service
    const reviews = await Review.find({ service: serviceId }).select('_id');
    const reviewIds = reviews.map((r) => r._id);

    // delete reviews
    await Review.deleteMany({ service: serviceId });

    // delete reports for this service and its reviews
    await Report.deleteMany({
      $or: [
        { type: 'service', service: serviceId },
        { type: 'review', review: { $in: reviewIds } },
      ],
    });

    // delete the service itself
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

// REPORTED SERVICES (type = 'service')
router.get('/reports/services', requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find({ type: 'service' })
      .populate('service')
      .sort({ createdAt: -1 });

    // only keep reports where service still exists
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

    // delete all reports pointing at this review
    await Report.deleteMany({ type: 'review', review: reviewId });

    res.json({ message: 'Review and its reports deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/reviews/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// REPORTED REVIEWS (type = 'review')
router.get('/reports/reviews', requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find({ type: 'review' })
      .populate('review')
      .sort({ createdAt: -1 });

    // drop reports where review is already deleted / null
    const filtered = reports.filter((r) => r.review);
    res.json({ reports: filtered });
  } catch (err) {
    console.error('GET /api/admin/reports/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
