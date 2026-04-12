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

// Admin routes
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

// Public report submission
app.use('/api', reportRoutes);

// Static frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// HTML routes

// Root: always show login first
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'auth.html'));
});

app.get('/auth.ht
