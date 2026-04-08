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

// Pending services – GET /api/admin/services/pending
router.get('/services/pending', requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ isApproved: false }).sort({ createdAt: -1 });
    res.json({ services });
  } catch (err) {
    console.error('GET /admin/services/pending error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Removal requests – GET /api/admin/services/removal-requests
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

// Approve service – PATCH /api/admin/services/:id/approve
router.patch('/services/:id/approve', requireAdmin, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    service.isApproved = true;
    service.removalRequested = false;
    service.removalRequestedBy = undefined;

    await service.save();

    res.json({ message: 'Service approved', service });
  } catch (err) {
    console.error('PATCH /admin/services/:id/approve error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
