// SpotSure/routes/serviceRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');
const multer = require('multer');
const crypto = require('crypto');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// helper to recompute ratings
async function recomputeServiceRatings(serviceId) {
  const stats = await Review.aggregate([
    { $match: { service: serviceId } },
    {
      $group: {
        _id: '$service',
        avgRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const stat = stats[0];
  const averageRating = stat ? stat.avgRating : 0;
  const ratingCount = stat ? stat.ratingCount : 0;
  const reviewCount = await Review.countDocuments({ service: serviceId });

  await Service.findByIdAndUpdate(serviceId, {
    averageRating,
    ratingCount,
    reviewCount,
  });
}

// CREATE service (request) with multiple images
router.post('/services', upload.array('images', 5), async (req, res) => {
  try {
    const { name, category, city, pincode, address } = req.body;

    if (!name || !city || !pincode || !address) {
      return res
        .status(400)
        .json({ message: 'Name, city, pincode, and address are required.' });
    }

    const deleteCode = crypto.randomBytes(3).toString('hex');

    let imagePath = '';
    let providerImages = [];

    if (req.files && req.files.length > 0) {
      const cloudinary = req.cloudinary;

      const uploads = await Promise.all(
        req.files.map((file) =>
          cloudinary &&
          cloudinary.uploader &&
          cloudinary.uploader.upload_stream
            ? new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                  { folder: 'spotsure-services' },
                  (err, result) => {
                    if (err) return reject(err);
                    resolve(result.public_id || '');
                  }
                );
                stream.end(file.buffer);
              })
            : Promise.resolve('')
        )
      ).catch((err) => {
        console.error('Cloudinary upload error:', err);
        return [];
      });

      const ids = (uploads || []).filter((id) => id);
      if (ids.length > 0) {
        providerImages = ids;
        imagePath = ids[0]; // first as main
      }
    }

    const service = await Service.create({
      name,
      category: category || 'Service',
      city,
      pincode,
      address,
      imagePath,
      providerImages,
      deleteCode,
      isApproved: false, // request; admin approves
    });

    res.status(201).json({
      message: 'Service created',
      service,
      deleteCode,
    });
  } catch (err) {
    console.error('POST /api/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// list approved services (public)
router.get('/services', async (req, res) => {
  try {
    const services = await Service.find({ isApproved: true }).sort({ createdAt: -1 });
    res.json({ services });
  } catch (err) {
    console.error('GET /api/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// single service
router.get('/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service || !service.isApproved) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    console.error('GET /api/services/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// list reviews for a service
router.get('/services/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ service: req.params.id }).sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    console.error('GET /api/services/:id/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// add review example (keep or merge with your existing)
router.post('/services/:id/reviews', async (req, res) => {
  try {
    const { rating, comment, username, imagePaths = [] } = req.body;
    const serviceId = req.params.id;

    const review = await Review.create({
      service: serviceId,
      rating,
      comment,
      username,
      imagePaths,
    });

    await recomputeServiceRatings(serviceId);

    res.status(201).json({ message: 'Review added', review });
  } catch (err) {
    console.error('POST /api/services/:id/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// IMPORTANT: export only the router; helper is attached for adminRoutes to import
router.recomputeServiceRatings = recomputeServiceRatings;
module.exports = router;
