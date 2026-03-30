// SpotSure/server.js (only showing the relevant route mounting part)
const path = require('path');
const express = require('express');
const session = require('express-session');
// ... your other requires (dotenv, mongoose, etc.)

const app = express();

// ... your middleware (express.json(), session, static, etc.)

// routes
const serviceRoutes = require('./routes/serviceRoutes');   // router function
const adminRoutes = require('./routes/adminRoutes');       // router function
const reportRoutes = require('./routes/reportRoutes');     // router function
// const authRoutes = require('./routes/authRoutes');      // if you have

// Example typical setup:
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'spotsure-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', serviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', reportRoutes);
// app.use('/api/auth', authRoutes); // if present

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('SpotSure server running on port', PORT);
});
