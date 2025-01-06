const authorizeAdmin = (req, res, next) => {
  if (req.profile.type !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }
  next();
};

module.exports = authorizeAdmin;
