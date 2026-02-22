// SpotSure/routes/serviceRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');
const multer = require('multer');
const crypto = require('crypto');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Helper to recalc rating stats for a service
 */
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

  const ratingCount = allReviews.length; // people who rated
  const reviewCount = allReviews.filter(
    (r) => r.comment && r.comment.trim() !== ''
  ).length; // people who commented

  await Service.findByIdAndUpdate(serviceId, {
    averageRating,
    ratingCount,
    reviewCount,
  });
}

// ------------------------------------------------------------------
// LIST services  GET /api/services
// ------------------------------------------------------------------
router.get('/services', async (req, res) => {
  try {
    const { category, city, pincode } = req.query;

    const filter = { isApproved: true };

    if (category) {
      filter.category = new RegExp('^' + category + '$', 'i');
    }
    if (city) {
      filter.city = new RegExp(city, 'i');
    }
    if (pincode) {
      filter.pincode = pincode;
    }

    const services = await Service.find(filter).sort({ createdAt: -1 });
    res.json({ services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------------------------------------------
// CREATE service  POST /api/services
// image field name: "image"
// ------------------------------------------------------------------
router.post('/services', upload.single('image'), async (req, res) => {
  try {
    const { name, category, city, pincode, address } = req.body;

    if (!name || !city || !pincode || !address) {
      return res
        .status(400)
        .json({ message: 'Name, city, pincode, and address are required.' });
    }

    const deleteCode = crypto.randomBytes(3).toString('hex'); // short secret

    let imagePath = '';

    if (req.file) {
      const cloudinary = req.cloudinary;

      const publicId = await new Promise((resolve, reject) => {
        if (
          !cloudinary ||
          !cloudinary.uploader ||
          !cloudinary.uploader.upload_stream
        ) {
          return resolve('');
        }
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'spotsure-services' },
          (err, result) => {
            if (err) return reject(err);
            // Store public_id for use with /image/:publicId
            resolve(result.public_id || '');
          }
        );
        stream.end(req.file.buffer);
      }).catch((err) => {
        console.error('Cloudinary upload error:', err);
        return '';
      });

      imagePath = publicId || '';
    }

    const service = await Service.create({
      name,
      category: category || 'Service',
      city,
      pincode,
      address,
      imagePath,   // now holds Cloudinary public_id
      deleteCode,
      isApproved: true,
    });

    res.status(201).json({
      message: 'Service created',
      service,
      deleteCode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------------------------------------------
// GET single service  GET /api/services/:id
// ------------------------------------------------------------------
router.get('/services/:id', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------------------------------------------
// Delete service with code  POST /api/services/:id/delete-with-code
// ------------------------------------------------------------------
router.post('/services/:id/delete-with-code', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const { code } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (!code || code.trim() !== service.deleteCode) {
      return res.status(403).json({ message: 'Incorrect delete code.' });
    }

    await Review.deleteMany({ service: serviceId });
    await Service.findByIdAndDelete(serviceId);

    res.json({ message: 'Service deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------------------------------------------
// Add a review to a service
// POST /api/services/:id/reviews
// ------------------------------------------------------------------
router.post(
  '/services/:id/reviews',
  upload.array('images', 5),
  async (req, res) => {
    try {
      const serviceId = req.params.id;

      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      const { rating, comment, username } = req.body;

      const numericRating = Number(rating);
      if (!numericRating || numericRating < 1 || numericRating > 5) {
        return res
          .status(400)
          .json({ message: 'Rating must be between 1 and 5' });
      }

      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        const cloudinary = req.cloudinary;
        const uploads = await Promise.all(
          req.files.map((file) =>
            cloudinary.uploader.upload_stream
              ? new Promise((resolve, reject) => {
                  const stream = cloudinary.uploader.upload_stream(
                    { folder: 'spotsure-reviews' },
                    (err, result) => {
                      if (err) return reject(err);
                      resolve(result.secure_url);
                    }
                  );
                  stream.end(file.buffer);
                })
              : Promise.resolve(null)
          )
        );
        imageUrls = uploads.filter(Boolean);
      }

      const review = await Review.create({
        service: serviceId,
        username: username || 'Anonymous',
        rating: numericRating,
        comment: comment || '',
        imageUrls,
      });

      await recomputeServiceRatings(serviceId);

      return res.status(201).json({
        message: 'Review created',
        review,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// ------------------------------------------------------------------
// Get all reviews for a service  GET /api/services/:id/reviews
// ------------------------------------------------------------------
router.get('/services/:id/reviews', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const reviews = await Review.find({ service: serviceId }).sort({
      createdAt: -1,
    });
    res.json({ reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
