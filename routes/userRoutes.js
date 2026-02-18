// routes/userRoutes.js
const express = require('express');
const User = require('../models/User');
const Service = require('../models/Service');

const router = express.Router();

function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Login required' });
  }
  next();
}

router.get('/me/saved', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate(
      'savedServices'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      savedServices: user.savedServices || [],
    });
  } catch (err) {
    console.error('Get saved error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/me/saved/:serviceId', requireLogin, async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const index = user.savedServices.findIndex(
      (id) => id.toString() === serviceId.toString()
    );

    let action;
    if (index === -1) {
      user.savedServices.push(serviceId);
      action = 'saved';
    } else {
      user.savedServices.splice(index, 1);
      action = 'removed';
    }

    await user.save();

    res.json({
      message: `Service ${action}`,
      action,
      savedServices: user.savedServices,
    });
  } catch (err) {
    console.error('Toggle saved error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
