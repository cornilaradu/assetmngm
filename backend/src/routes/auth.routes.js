const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/login', ctrl.login);
// Doar un ADMIN poate crea utilizatori noi (evita inregistrari libere pe un portal intern)
router.post('/register', requireAuth, requireRole('ADMIN'), ctrl.register);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
