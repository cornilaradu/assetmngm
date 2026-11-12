const jwt = require('jsonwebtoken');
const { getAccessContext } = require('../services/module-access.service');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Token de autentificare lipsa.',
    });
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      error: 'Token invalid sau expirat.',
    });
  }

  try {
    const access = await getAccessContext(payload.id);

    if (!access) {
      return res.status(401).json({
        error: 'Utilizatorul nu mai este activ sau nu exista.',
      });
    }

    req.user = {
      ...payload,
      role: access.role,
    };

    req.moduleAccess = access;

    next();
  } catch (err) {
    console.error('Eroare verificare autentificare:', err);
    return res.status(500).json({
      error: 'Eroare la verificarea autentificarii.',
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Nu aveti permisiunea necesara pentru aceasta actiune.',
      });
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
