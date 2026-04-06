// SpotSure/server.js
const path = require('path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

const app = express();

// --------------------------
// MongoDB connection
// --------------------------
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spotsure';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --------------------------
// Cloudinary config
// --------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// Make Cloudinary available in routes
app.use((req, res, next) => {
  req.cloudinary = cloudinary;
  next();
});

// --------------------------
// Core middlewares
// --------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'spotsure-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// --------------------------
// Static
// --------------------------
app.use(express.static(path.join(__dirname, 'public')));

// --------------------------
// Routes
// --------------------------
const serviceRoutes = require('./routes/serviceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const imageRoutes = require('./routes/imageRoutes');
const reportRoutes = require('./routes/reportRoutes');

app.use('/api', serviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api', reportRoutes);

// --------------------------
// Error handler
// --------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Server error' });
});

// --------------------------
// Start
// --------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('SpotSure server running on port', PORT);
});
