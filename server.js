// server.js
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

const app = express();

// CORS
app.use(
  cors({
    origin: 'http://localhost:5000',
    credentials: true,
  })
);

// Sessions (for auth/user routes)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// Database
const mongoUri =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/SpotSure';
mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Cloudinary config
cloudinaryLib.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// Attach cloudinary to req
app.use((req, res, next) => {
  req.cloudinary = cloudinaryLib;
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', serviceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/image', imageRoutes);

// Static files
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Pages
// Intro page (separate file)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'intro.html'));
});

// Explicit route for services list page
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/service.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'service.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SpotSure server running on http://localhost:${PORT}`);
});
