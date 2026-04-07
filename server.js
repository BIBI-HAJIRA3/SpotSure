// SpotSure/server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const serviceRoutes = require('./routes/serviceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');

const app = express();

// --- MongoDB connection ---
mongoose
  .connect(process.env.MONGODB_URI, {
    // optional options if you want:
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'spotsure-secret', // change in production
    resave: false,
    saveUninitialized: true,
  })
);

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// --- API routes ---
app.use('/api', serviceRoutes);
app.use('/api/admin', adminAuthRoutes); // /api/admin/login, /logout
app.use('/api/admin', adminRoutes);     // protected admin APIs

// Admin panel HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check / root
app.get('/', (req, res) => {
  res.send('Spotsure server is running');
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
