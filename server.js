// server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

// Cloudinary: used to store product images so your client never deals with URLs.
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();

// --------------------
// Config
// --------------------
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/grocery';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_in_prod';
const PORT = process.env.PORT || 5000;
const APP_VERSION = '1';

// YOUR STORE LOCATION (set these to your real lat/lng)
const STORE_LOCATION = {
  lat: 13.877446,
  lng: 75.735827
};
const MAX_KM = 8; // 6–8 km delivery radius

// --------------------
// Middleware
// --------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Static files for SpotSure
app.use(express.static(path.join(__dirname, 'public')));

// --------------------
// Multer / uploads
// --------------------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });
app.use('/uploads', express.static(uploadDir));

// --------------------
// Mongo
// --------------------
mongoose.connect(MONGO_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.log('✗ MongoDB error:', err));

// --------------------
// Schemas
// --------------------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 }
  }],
  addresses: [{
    label: String,
    line1: String,
    line2: String,
    city: String,
    pincode: String,
    isDefault: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: { type: String },
  image: String,
  unit: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

// SpotSure Service schema
const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  city: String,
  pincode: String,
  address: String,
  imagePath: String, // local uploads path or URL
  deleteCode: String,
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Service = mongoose.model('Service', serviceSchema);

const reviewSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  username: String,
  rating: { type: Number, required: true },
  comment: String,
  imagePaths: [String],
  createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    quantity: Number
  }],
  total: Number,
  deliveryAddress: {
    name: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    pincode: String,
    lat: Number,
    lng: Number,
    notes: String
  },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// --------------------
// Auth helpers
// --------------------
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// --------------------
// Distance helper (Haversine)
// --------------------
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --------------------
// Seed
// --------------------
async function seed() {
  try {
    const prodCount = await Product.countDocuments();
    if (prodCount === 0) {
      await Product.insertMany([
        { name: 'Rice', category: 'Essentials', price: 90, unit: '1 kg packet', description: 'Basmati rice' },
        { name: 'Milk', category: 'Dairy', price: 60, unit: '1 litre', description: 'Fresh milk' }
      ]);
      console.log('✓ Seeded sample products');
    }
    const adminExists = await User.countDocuments({ role: 'admin' });
    if (!adminExists) {
      const hash = await bcrypt.hash('admin123', 10);
      await User.create({ name: 'Admin', email: 'admin@grocery.com', passwordHash: hash, role: 'admin' });
      console.log('✓ Created default admin: admin@grocery.com / admin123');
    }
  } catch (e) {
    console.error('Seed error:', e);
  }
}
seed();

// --------------------
// SSE
// --------------------
const sseClients = [];
function broadcastNewOrder(orderObj) {
  const payload = `data: ${JSON.stringify(orderObj)}\n\n`;
  sseClients.forEach(c => { try { c.res.write(payload); } catch {} });
}

// --------------------
// Home: SpotSure app
// --------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// If you still want old grocery user view, keep it on /user as-is from your previous file.
// (Omitted here for brevity; you can leave your existing /user route below.)

// --------------------
// SpotSure: services APIs
// --------------------

// Create service (with optional image, delete code)
app.post('/api/services', upload.single('image'), async (req, res) => {
  try {
    const { name, category, city, pincode, address } = req.body;
    if (!name || !city || !pincode || !address) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    let imagePath = '';
    if (req.file) {
      imagePath = req.file.filename; // stored in /uploads
    }

    const deleteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    const service = await Service.create({
      name,
      category,
      city,
      pincode,
      address,
      imagePath,
      deleteCode
    });

    res.status(201).json({
      service,
      deleteCode
    });
  } catch (err) {
    console.error('Create service error:', err);
    res.status(500).json({ message: 'Failed to create service' });
  }
});

// List services
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json({ services });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load services' });
  }
});

// Single service
app.get('/api/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load service' });
  }
});

// Delete with code
app.post('/api/services/:id/delete-with-code', async (req, res) => {
  try {
    const { code } = req.body;
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    if (!code || code.trim().toUpperCase() !== (service.deleteCode || '').toUpperCase()) {
      return res.status(400).json({ message: 'Incorrect delete code' });
    }

    await Review.deleteMany({ serviceId: service._id });
    await service.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ message: 'Failed to delete service' });
  }
});

// Reviews
app.get('/api/services/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ serviceId: req.params.id }).sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load reviews' });
  }
});

const reviewUpload = multer({ storage });

app.post('/api/services/:id/reviews', reviewUpload.array('images', 4), async (req, res) => {
  try {
    const { rating, comment, username } = req.body;
    const r = Number(rating || 0);
    if (!r || r < 1 || r > 5) {
      return res.status(400).json({ message: 'Invalid rating' });
    }

    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const imagePaths = (req.files || []).map(f => '/uploads/' + f.filename);

    const review = await Review.create({
      serviceId: service._id,
      username: username || 'Anonymous',
      rating: r,
      comment,
      imagePaths
    });

    // Recalculate average rating
    const stats = await Review.aggregate([
      { $match: { serviceId: service._id } },
      {
        $group: {
          _id: '$serviceId',
          avg: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats.length) {
      service.averageRating = stats[0].avg;
      service.reviewCount = stats[0].count;
      await service.save();
    }

    res.status(201).json({ review });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ message: 'Failed to add review' });
  }
});

// Serve service images by filename
app.get('/image/:file', (req, res) => {
  const filePath = path.join(uploadDir, req.params.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(filePath);
});

// --------------------
// (Existing grocery admin, /admin, /user, products, auth, orders, SSE, etc.)
// Keep your previous routes below this comment as needed.
// --------------------

// Example: SSE endpoint from your existing code
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive'
  });
  res.write('\n');
  const clientId = Date.now() + Math.random();
  sseClients.push({ id: clientId, res });
  req.on('close', () => {
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// --------------------
// Start server
// --------------------
app.listen(PORT, () => {
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ MongoDB: ${MONGO_URI}`);
  console.log(`Test admin login: admin@grocery.com / admin123`);
});
