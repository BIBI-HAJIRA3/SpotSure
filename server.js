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
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'spotsure-secret',
    resave: false,
    saveUninitialized: true,
  })
);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
app.use('/api', serviceRoutes);
app.use('/api/admin', adminAuthRoutes); // login/logout
app.use('/api/admin', adminRoutes);     // protected admin

// Admin HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Simple root
app.get('/', (req, res) => {
  res.send('Spotsure server is running');
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
