const jwt = require('jsonwebtoken');

/**
 * Verifica JWT-ul trimis in header-ul Authorization: Bearer <token>
 * si ataseaza payload-ul (id, email, role) pe req.user
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autentificare lipsa.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid sau expirat.' });
  }
}

/**
 * Restrictioneaza accesul la anumite roluri.
 * Foloseste dupa requireAuth: requireRole('ADMIN', 'MANAGER')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Nu aveti permisiunea necesara pentru aceasta actiune.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
