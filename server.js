// SpotSure/server.js
const path = require('path');
const express = require('express');
const session = require('express-session');
// const mongoose = require('mongoose');
// require('dotenv').config();

const app = express();

// connect to Mongo here (your existing code)

// core middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'spotsure-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// static
app.use(express.static(path.join(__dirname, 'public')));

// routes
const serviceRoutes = require('./routes/serviceRoutes');  // router
const adminRoutes = require('./routes/adminRoutes');      // router
const reportRoutes = require('./routes/reportRoutes');    // router
// const authRoutes = require('./routes/authRoutes');      // if you have

app.use('/api', serviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', reportRoutes);
// app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('SpotSure server running on port', PORT);
});
