const jwt = require('jsonwebtoken');

module.exports = function jwtVerify(req, res, next) {
  const token =
    req.cookies?.roadsense_token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Please log in first' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — please log in again' });
  }
};
