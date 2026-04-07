// SpotSure/middleware/requireAdmin.js
module.exports = function requireAdmin(req, res, next) {
  // For now we use a simple session flag.
  // Later you can replace with real user auth.
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(403).json({ message: 'Admin access only' });
};
