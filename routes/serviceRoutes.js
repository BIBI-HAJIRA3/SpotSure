// routes/serviceRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');
const multer = require('multer');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper: generate a simple 6-digit delete code
function generateDeleteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// LIST services
router.get('/services', async (req, res) => {
  try {
    const { city, pincode, category } = req.query;
    const filter = {};

    if (city) filter.city = new RegExp(`^${city.trim()}`, 'i');
    if (pincode) filter.pincode = pincode.trim();
    if (category && category !== 'all' && category !== 'All') {
      filter.category = category.trim();
    }

    const services = await Service.find(filter).sort({ createdAt: -1 }).lean();

    services.forEach((s) => {
      const avg = typeof s.averageRating === 'number' ? s.averageRating : 0;
      s.averageRating = avg;
      s.avgRating = avg;
      s.reviewCount =
        typeof s.reviewCount === 'number' ? s.reviewCount : 0;
      s.ratingCount =
        typeof s.ratingCount === 'number' ? s.ratingCount : 0;
    });

    res.json({ services });
  } catch (err) {
    console.error('GET /api/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET one service
router.get('/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).lean();
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const avg =
      typeof service.averageRating === 'number' ? service.averageRating : 0;
    service.averageRating = avg;
    service.avgRating = avg;
    service.reviewCount =
      typeof service.reviewCount === 'number' ? service.reviewCount : 0;
    service.ratingCount =
      typeof service.ratingCount === 'number' ? service.ratingCount : 0;

    res.json(service);
  } catch (err) {
    console.error('GET /api/services/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE service (with Cloudinary image, storing publicId)
router.post('/services', upload.single('image'), async (req, res) => {
  try {
    const { name, category, city, pincode, address } = req.body;

    if (!name || !category || !city || !pincode || !address) {
      return res.status(400).json({
        message:
          'All fields are required (name, category, city, pincode, address)',
      });
    }

    let imagePath = '';

    if (req.file && req.cloudinary.config().cloud_name) {
      const cloudinary = req.cloudinary;

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: 'spotsure_services' },
            (error, result) => {
              if (error) {
                console.error('Cloudinary error:', error);
                return reject(error);
              }
              resolve(result);
            }
          )
          .end(req.file.buffer);
      });

      // store only the public ID, e.g. "spotsure_services/abc123"
      imagePath = uploadResult.public_id;
    }

    const deleteCode = generateDeleteCode();

    const service = await Service.create({
      name: name.trim(),
      category: category.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      address: address.trim(),
      imagePath,
      averageRating: 0,
      reviewCount: 0,
      ratingCount: 0,
      isApproved: true,
      deleteCode,
    });

    res.status(201).json({
      service,
      deleteCode,
    });
  } catch (err) {
    console.error('POST /api/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// REVIEWS list
router.get('/services/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ service: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    reviews.forEach((r) => {
      r.imagePaths = r.imageUrls || [];
    });

    res.json({ reviews });
  } catch (err) {
    console.error('GET /api/services/:id/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD review
router.post(
  '/services/:id/reviews',
  upload.array('images', 5),
  async (req, res) => {
    try {
      const { rating, comment, username } = req.body;

      if (!rating) {
        return res.status(400).json({ message: 'Rating is required' });
      }

      const numericRating = Number(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res
          .status(400)
          .json({ message: 'Rating must be between 1 and 5' });
      }

      const service = await Service.findById(req.params.id);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      const cloudinary = req.cloudinary;
      let imageUrls = [];

      if (
        req.files &&
        req.files.length > 0 &&
        cloudinary.config().cloud_name
      ) {
        const uploadPromises = req.files.map(
          (file) =>
            new Promise((resolve, reject) => {
              cloudinary.uploader
                .upload_stream(
                  { folder: 'spotsure_reviews' },
                  (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                  }
                )
                .end(file.buffer);
            })
        );
        imageUrls = await Promise.all(uploadPromises);
      }

      const newReview = await Review.create({
        service: req.params.id,
        username:
          username && username.trim() ? username.trim() : 'Anonymous',
        rating: numericRating,
        comment: comment || '',
        imageUrls,
      });

      // Recompute rating + review stats for this service

      const allReviews = await Review.find({ service: newReview.service });

      // ratingCount: people who rated (valid numeric rating)
      const ratingValues = allReviews
        .filter(
          (r) =>
            typeof r.rating === 'number' &&
            r.rating >= 1 &&
            r.rating <= 5
        )
        .map((r) => r.rating);

      const ratingCount = ratingValues.length;
      const averageRating = ratingCount
        ? ratingValues.reduce((sum, r) => sum + r, 0) / ratingCount
        : 0;

      // reviewCount: people who commented (non‑empty comment)
      const reviewCount = allReviews.filter(
        (r) =>
          typeof r.comment === 'string' &&
          r.comment.trim() !== ''
      ).length;

      await Service.findByIdAndUpdate(
        newReview.service,
        {
          averageRating,
          ratingCount,
          reviewCount,
        },
        { new: true }
      );

      res.status(201).json(newReview);
    } catch (err) {
      console.error('POST /api/services/:id/reviews error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE with code
router.post('/services/:id/delete-with-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Delete code is required' });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.deleteCode !== code) {
      return res.status(403).json({ message: 'Invalid delete code' });
    }

    await Service.findByIdAndDelete(req.params.id);
    await Review.deleteMany({ service: req.params.id });

    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error('POST /api/services/:id/delete-with-code error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
