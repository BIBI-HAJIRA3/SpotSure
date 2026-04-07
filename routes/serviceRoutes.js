// SpotSure/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Review = require('../models/Review');
const Report = require('../models/Report');

// LIST SERVICES
router.get('/services', async (req, res) => {
  try {
    const { category, city, sort } = req.query;

    const query = { isApproved: true };

    if (category && category !== 'all') {
      query.category = category;
    }
    if (city && city.trim()) {
      query.city = city.trim();
    }

    let q = Service.find(query);

    if (sort === 'highest') {
      q = q.sort({ averageRating: -1 });
    } else if (sort === 'lowest') {
      q = q.sort({ averageRating: 1 });
    } else {
      q = q.sort({ createdAt: -1 });
    }

    const services = await q.exec();
    res.json({ services });
  } catch (err) {
    console.error('GET /api/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET SINGLE SERVICE
router.get('/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service || !service.isApproved) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ service });
  } catch (err) {
    console.error('GET /api/services/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET REVIEWS FOR A SERVICE
router.get('/services/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ service: req.params.id }).sort({
      createdAt: -1,
    });
    res.json({ reviews });
  } catch (err) {
    console.error('GET /api/services/:id/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE / REQUEST A SERVICE
router.post('/services', async (req, res) => {
  try {
    const {
      name,
      category,
      city,
      pincode,
      address,
      lat,
      lng,
      imagePath,
      providerImages,
    } = req.body || {};

    if (!name || !category || !city || !pincode || !address) {
      return res
        .status(400)
        .json({ message: 'Missing required fields' });
    }

    const serviceData = {
      name: name.trim(),
      category: category.trim(),
      city: city.trim(),
      pincode: pincode.toString().trim(),
      address: address.trim(),
      imagePath: imagePath || '',
      providerImages: Array.isArray(providerImages)
        ? providerImages
        : [],
      isApproved: true,
    };

    if (lat !== undefined && lng !== undefined && lat !== '' && lng !== '') {
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

// CREATE REVIEW
router.post('/services/:id/reviews', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const { username, rating, comment, imageUrls } = req.body || {};

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

    res.status(201).json({ message: 'Review added', review });
  } catch (err) {
    console.error('POST /api/services/:id/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// REPORT SERVICE
router.post('/services/:id/report', async (req, res) => {
  try {
    const { reason } = req.body || {};
    const serviceId = req.params.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const report = new Report({
      type: 'service',
      service: serviceId,
      reason: reason.trim(),
    });

    await report.save();
    res.status(201).json({ message: 'Report submitted', report });
  } catch (err) {
    console.error('POST /api/services/:id/report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// REPORT REVIEW
router.post('/reviews/:id/report', async (req, res) => {
  try {
    const { reason } = req.body || {};
    const reviewId = req.params.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const report = new Report({
      type: 'review',
      review: reviewId,
      reason: reason.trim(),
    });

    await report.save();
    res.status(201).json({ message: 'Report submitted', report });
  } catch (err) {
    console.error('POST /api/reviews/:id/report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
