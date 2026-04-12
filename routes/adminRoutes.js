// SpotSure/routes/adminRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Report = require('../models/Report');
const Review = require('../models/Review');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
}

// helper: recompute ratings after admin deletes a review
async function recomputeServiceRatings(serviceId) {
  const allReviews = await Review.find({ service: serviceId });

  if (!allReviews.length) {
    await Service.findByIdAndUpdate(serviceId, {
      averageRating: 0,
      ratingCount: 0,
      reviewCount: 0,
    });
    return;
  }

  const ratingSum = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  const averageRating = ratingSum / allReviews.length;

  const ratingCount = allReviews.length;
  const reviewCount = allReviews.filter(
    (r) => r.comment && r.comment.trim() !== ''
  ).length;

  await Service.findByIdAndUpdate(serviceId, {
    averageRating,
    ratingCount,
    reviewCount,
  });
}

// Pending services – GET /api/admin/services/pending
router.get('/services/pending', requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ isApproved: false }).sort({
      createdAt: -1,
    });
    res.json({ services });
  } catch (err) {
    console.error('GET /admin/services/pending error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Removal requests – GET /api/admin/services/removal-requests
router.get('/services/removal-requests', requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ removalRequested: true })
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'username')
      .populate('removalRequestedBy', 'username');

    res.json({ services });
  } catch (err) {
    console.error('GET /admin/services/removal-requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve / keep – PATCH /api/admin/services/:id/approve
router.patch('/services/:id/approve', requireAdmin, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    service.isApproved = true;
    service.removalRequested = false;
    service.removalRequestedBy = undefined;

    await service.save();

    res.json({ message: 'Service approved', service });
  } catch (err) {
    console.error('PATCH /admin/services/:id/approve error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete service – DELETE /api/admin/services/:id
router.delete('/services/:id', requireAdmin, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Service.findByIdAndDelete(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // cascade delete related reviews and reports for this service
    await Review.deleteMany({ service: serviceId });
    await Report.deleteMany({ service: serviceId });

    res.json({ message: 'Service deleted' });
  } catch (err) {
    console.error('DELETE /admin/services/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search services – GET /api/admin/services/search?name=...
router.get('/services/search', requireAdmin, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.trim().length < 2) {
      return res.json({ services: [] });
    }

    const regex = new RegExp(name.trim(), 'i');
    const services = await Service.find({ name: regex }).sort({
      createdAt: -1,
    });

    res.json({ services });
  } catch (err) {
    console.error('GET /admin/services/search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reported services – GET /api/admin/reports/services
router.get('/reports/services', requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find({ type: 'service' })
      .sort({ createdAt: -1 })
      .populate('service');
    res.json({ reports });
  } catch (err) {
    console.error('GET /admin/reports/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reported reviews – GET /api/admin/reports/reviews
router.get('/reports/reviews', requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find({ type: 'review' })
      .sort({ createdAt: -1 })
      .populate('review');
    res.json({ reports });
  } catch (err) {
    console.error('GET /admin/reports/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete review – DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const reviewId = req.params.id;

    // find review first to know which service to recompute
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    const serviceId = review.service;

    await Review.findByIdAndDelete(reviewId);

    // remove any reports for this review as well
    await Report.deleteMany({ review: reviewId });

    // recompute ratings after deletion
    await recomputeServiceRatings(serviceId);

    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('DELETE /admin/reviews/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
