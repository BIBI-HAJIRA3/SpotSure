// SpotSure/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cloudinaryLib = require('cloudinary').v2;
const cors = require('cors');
const session = require('express-session');

const serviceRoutes = require('./routes/serviceRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const imageRoutes = require('./routes/imageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// MongoDB
const mongoUri =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/SpotSure';
mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Cloudinary
cloudinaryLib.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

app.use((req, res, next) => {
  req.cloudinary = cloudinaryLib;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', serviceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/image', imageRoutes);

// Admin routes (hard-coded admin login)
app.use('/api/admin', adminAuthRoutes);  // /api/admin/login, /me, /logout
app.use('/api/admin', adminRoutes);      // /api/admin/services/..., /api/admin/reports/...

// Public report submission
app.use('/api', reportRoutes);

// Static frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// HTML routes
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'services.html'));
});

app.get('/services.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'services.html'));
});

app.get('/service.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'service.html'));
});

app.get('/add-review.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'add-review.html'));
});

app.get('/add-service.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'add-service.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin-dashboard.html'));
});

// IMPORTANT: listen on Render port or local
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SpotSure server running on http://localhost:${PORT}`);
});
