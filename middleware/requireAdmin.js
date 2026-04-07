// SpotSure/middleware/requireAdmin.js
module.exports = function requireAdmin(req, res, next) {
  // If you are not using authentication yet, just allow everything:
  // return next();

  try {
    // Example: if you store admin info in session or JWT, check it here.
    // For now, keep it simple and always allow until you wire real auth.
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};