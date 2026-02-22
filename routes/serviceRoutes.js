// SpotSure/routes/serviceRoutes.js
const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');
const multer = require('multer');

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
// existing service routes (list, create, etc.) stay as in your file
// ------------------------------------------------------------------

// Example only: keep your existing list/create/etc.
// router.get('/services', ...)
// router.post('/services', upload.single('image'), ...)
// router.get('/services/:id', ...)

// ------------------------------------------------------------------
// Add a review to a service (UPDATED to keep counts correct)
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

      // upload any images (if you already have Cloudinary logic, reuse it here)
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

      // recompute averageRating, ratingCount, reviewCount
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
// Get all reviews for a service (unchanged)
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

// export router
module.exports = router;
