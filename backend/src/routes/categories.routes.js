const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categories.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// Orice user autentificat poate vedea lista (necesar pentru dropdown-ul din formulare)
router.get('/', ctrl.listCategories);

// Doar administratorul poate crea/edita/sterge categorii
router.post('/', requireRole('ADMIN'), ctrl.createCategory);
router.put('/:id', requireRole('ADMIN'), ctrl.updateCategory);
router.delete('/:id', requireRole('ADMIN'), ctrl.deleteCategory);

module.exports = router;
