const express = require('express');
const Service = require('../models/Service');
const Review = require('../models/Review');
const multer = require('multer');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

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

// LIST services – GET /api/services (only approved)
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
    console.error('GET /api/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE service – POST /api/services
router.post('/services', upload.array('images', 5), async (req, res) => {
  try {
    const { name, category, city, pincode, address, lat, lng } = req.body;

    if (!name || !city || !pincode || !address) {
      return res
        .status(400)
        .json({ message: 'Name, city, pincode, and address are required.' });
    }

    let location = undefined;
    if (lat && lng) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        location = { lat: latNum, lng: lngNum };
      }
    }

    let imagePath = '';
    let providerImages = [];

    if (req.files && req.files.length > 0) {
      const cloudinary = req.cloudinary;

      if (cloudinary && cloudinary.uploader && cloudinary.uploader.upload_stream) {
        const uploads = await Promise.all(
          req.files.map(
            (file) =>
              new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                  { folder: 'spotsure-services' },
                  (err, result) => {
                    if (err) return reject(err);
                    resolve(result.secure_url || '');
                  }
                );
                stream.end(file.buffer);
              })
          )
        ).catch((err) => {
          console.error('Cloudinary upload error (service images):', err);
          return [];
        });

        const urls = (uploads || []).filter((u) => u);
        if (urls.length > 0) {
          providerImages = urls;
          imagePath = urls[0];
        }
      }
    }

    const createdBy =
      req.session && req.session.userId ? req.session.userId : undefined;

    const service = await Service.create({
      name,
      category: category || 'Service',
      city,
      pincode,
      address,
      imagePath,
      providerImages,
      location,
      isApproved: false, // requires admin approval
      createdBy,
    });

    res.status(201).json({
      message: 'Service created, pending admin approval',
      service,
    });
  } catch (err) {
    console.error('POST /api/services error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET single service – GET /api/services/:id (only approved)
router.get('/services/:id', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Service.findById(serviceId);
    if (!service || !service.isApproved) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    console.error('GET /api/services/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request removal – POST /api/services/:id/request-remove
router.post('/services/:id/request-remove', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Login required' });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (
      !service.createdBy ||
      service.createdBy.toString() !== req.session.userId.toString()
    ) {
      return res
        .status(403)
        .json({ message: 'Only the creator can request removal.' });
    }

    service.removalRequested = true;
    service.removalRequestedBy = req.session.userId;
    await service.save();

    res.json({ message: 'Removal request submitted.' });
  } catch (err) {
    console.error('POST /api/services/:id/request-remove error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add review – POST /api/services/:id/reviews
router.post(
  '/services/:id/reviews',
  upload.array('images', 5),
  async (req, res) => {
    try {
      const serviceId = req.params.id;

      const service = await Service.findById(serviceId);
      if (!service || !service.isApproved) {
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
        if (
          cloudinary &&
          cloudinary.uploader &&
          cloudinary.uploader.upload_stream
        ) {
          const uploads = await Promise.all(
            req.files.map(
              (file) =>
                new Promise((resolve, reject) => {
                  const stream = cloudinary.uploader.upload_stream(
                    { folder: 'spotsure-reviews' },
                    (err, result) => {
                      if (err) return reject(err);
                      resolve(result.secure_url || '');
                    }
                  );
                  stream.end(file.buffer);
                })
            )
          ).catch((err) => {
            console.error('Cloudinary upload error (review images):', err);
            return [];
          });

          imageUrls = (uploads || []).filter((u) => u);
        }
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
      console.error('POST /api/services/:id/reviews error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get reviews – GET /api/services/:id/reviews
router.get('/services/:id/reviews', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const reviews = await Review.find({ service: serviceId }).sort({
      createdAt: -1,
    });
    res.json({ reviews });
  } catch (err) {
    console.error('GET /api/services/:id/reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
