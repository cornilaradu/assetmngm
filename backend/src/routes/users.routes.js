const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/users.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', requireRole('ADMIN', 'MANAGER'), ctrl.listUsers);
router.put('/:id', requireRole('ADMIN'), ctrl.updateUser);
router.put('/:id/modules', requireRole('ADMIN'), ctrl.updateUserModules);

router.get('/modules/all', ctrl.listModules);

router.get('/departments/all', ctrl.listDepartments);
router.post('/departments', requireRole('ADMIN'), ctrl.createDepartment);

module.exports = router;
