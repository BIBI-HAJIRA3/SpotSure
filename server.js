// SpotSure/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cloudinaryLib = require('cloudinary').v2;
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs'); // NEW: for admin password hashing [web:262]

const serviceRoutes = require('./routes/serviceRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const imageRoutes = require('./routes/imageRoutes');
const User = require('./models/User'); // NEW: use your existing User model [web:257]

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

// Serve static files from /public (so /images/bg-pattern.png works) [web:261][web:222]
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Intro at root
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Services list
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

app.get('/add-service.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'add-service.html'));
});

// Ensure fixed admin user exists with specified credentials
async function ensureAdminUser() {
  try {
    const username = 'adminatspotsure';
    const password = 'AdminAtSpotsure';

    let user = await User.findOne({ username });

    if (!user) {
      user = new User({
        username,
        role: 'admin',
      });
    } else {
      user.role = 'admin';
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);

    await user.save();
    console.log('Admin user ensured: adminatspotsure / AdminAtSpotsure');
  } catch (err) {
    console.error('Error ensuring admin user:', err);
  }
}

ensureAdminUser();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SpotSure server running on http://localhost:${PORT}`);
});
