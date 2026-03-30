// SpotSure/routes/reportRoutes.js
const express = require('express');
const Report = require('../models/Report');
const Service = require('../models/Service');
const Review = require('../models/Review');

const router = express.Router();

// POST /api/reports/service
router.post('/reports/service', async (req, res) => {
  try {
    const { serviceId, reason } = req.body;
    if (!serviceId) {
      return res.status(400).json({ message: 'serviceId is required' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const report = await Report.create({
      type: 'service',
      service: serviceId,
      reason: reason || '',
    });

    res.status(201).json({ message: 'Service reported', report });
  } catch (err) {
    console.error('POST /api/reports/service error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reports/review
router.post('/reports/review', async (req, res) => {
  try {
    const { reviewId, reason } = req.body;
    if (!reviewId) {
      return res.status(400).json({ message: 'reviewId is required' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const report = await Report.create({
      type: 'review',
      review: reviewId,
      reason: reason || '',
    });

    res.status(201).json({ message: 'Review reported', report });
  } catch (err) {
    console.error('POST /api/reports/review error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
