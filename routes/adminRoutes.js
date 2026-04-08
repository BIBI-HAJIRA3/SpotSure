// SpotSure/routes/adminRoutes.js
const express = require('express');
const Service = require('../models/Service');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
}

// GET /api/admin/services/removal-requests
router.get('/services/removal-requests', requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ removalRequested: true })
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'username')
      .populate('removalRequestedBy', 'username');

    res.json({ services });
  } catch (err) {
    console.error('GET /admin/services/removal-requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
