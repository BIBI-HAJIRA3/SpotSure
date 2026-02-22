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

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5000',
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

const mongoUri =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/SpotSure';
mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

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

app.use('/api', serviceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/image', imageRoutes);
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Root: intro (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Services page
app.get('/services.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'services.html'));
});

app.get('/service.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'service.html'));
});

app.get('/reviews.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'reviews.html'));
});

app.get('/add-review.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'add-review.html'));
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SpotSure server running on http://localhost:${PORT}`);
});


