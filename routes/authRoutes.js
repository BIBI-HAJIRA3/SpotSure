// routes/authRoutes.js
const express = require('express');
const User = require('../models/User');

const router = express.Router();

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const user = new User({
      username: username.trim(),
      displayName: (displayName || username).trim(),
      role: 'user',
    });
    user.password = password; // virtual
    await user.save();

    req.session.userId = user._id;
    req.session.userRole = user.role;

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('POST /api/auth/signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.userId = user._id;
    req.session.userRole = user.role;

    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

// ME
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(200).json({ user: null });
    }
    const user = await User.findById(req.session.userId).lean();
    if (!user) {
      return res.status(200).json({ user: null });
    }
    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;





// SpotSure/routes/imageRoutes.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

// Stream Cloudinary image through your server by publicId
router.get('/:publicId', async (req, res) => {
  const publicId = req.params.publicId;

  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const url = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.jpg`;

    const response = await axios.get(url, { responseType: 'arraybuffer' });

    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.send(response.data);
  } catch (err) {
    console.error(err);
    res.status(404).end();
  }
});

module.exports = router;




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




// routes/userRoutes.js
const express = require('express');
const User = require('../models/User');
const Service = require('../models/Service');

const router = express.Router();

function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Login required' });
  }
  next();
}

router.get('/me/saved', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate(
      'savedServices'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      savedServices: user.savedServices || [],
    });
  } catch (err) {
    console.error('Get saved error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/me/saved/:serviceId', requireLogin, async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const index = user.savedServices.findIndex(
      (id) => id.toString() === serviceId.toString()
    );

    let action;
    if (index === -1) {
      user.savedServices.push(serviceId);
      action = 'saved';
    } else {
      user.savedServices.splice(index, 1);
      action = 'removed';
    }

    await user.save();

    res.json({
      message: `Service ${action}`,
      action,
      savedServices: user.savedServices,
    });
  } catch (err) {
    console.error('Toggle saved error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
