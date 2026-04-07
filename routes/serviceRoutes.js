// SpotSure/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Report = require('../models/Report');
const Review = require('../models/Review');

// CREATE / REQUEST A SERVICE
router.post('/services', async (req, res) => {
  try {
    const {
      name,
      category,
      city,
      pincode,
      address,
      imagePath,
      providerImages,
      lat,
      lng,
    } = req.body;

    if (!name || !category || !city || !pincode || !address) {
      return res
        .status(400)
        .json({ message: 'Missing required fields' });
    }

    const serviceData = {
      name,
      category,
      city,
      pincode,
      address,
      imagePath: imagePath || '',
      providerImages: Array.isArray(providerImages)
        ? providerImages
        : [],
      // Service is visible immediately with your schema
      isApproved: true,
    };

    if (lat !== undefined && lng !== undefined) {
      serviceData.location = {
        lat: Number(lat),
        lng: Number(lng),
      };
    }

    const service = new Service(serviceData);
    await service.save();

    res
      .status(201)
      .json({ message: 'Service created successfully', service });
  } catch (err) {
    console.error('POST /api/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// (example) report a service
router.post('/services/:id/report', async (req, res) => {
  try {
    const { reason } = req.body;
    const serviceId = req.params.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const report = new Report({
      type: 'service',
      service: serviceId,
      reason: reason.trim(),
      // reporter: req.user?._id (if auth),
    });

    await report.save();
    res.status(201).json({ message: 'Report submitted', report });
  } catch (err) {
    console.error('POST /api/services/:id/report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// (example) create a review (must satisfy rating 1–5)
router.post('/services/:id/reviews', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const { username, rating, comment, imageUrls } = req.body;

    if (rating === undefined || rating === null) {
      return res.status(400).json({ message: 'Rating is required' });
    }

    const numericRating = Number(rating);
    if (numericRating < 1 || numericRating > 5) {
      return res
        .status(400)
        .json({ message: 'Rating must be between 1 and 5' });
    }

    const review = new Review({
      service: serviceId,
      username: username || undefined,
      rating: numericRating,
      comment: comment || '',
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
    });

    await review.save();

    // TODO: update averageRating / ratingCount / reviewCount if you want

    res.status(201).json({ message: 'Review added', review });
  } catch (err) {
    console.error('POST /api/services/:id/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
