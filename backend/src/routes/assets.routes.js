const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assets.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.listAssets);
router.get('/:id', ctrl.getAsset);
router.post('/', requireRole('ADMIN', 'MANAGER'), ctrl.createAsset);
router.put('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.updateAsset);
router.delete('/:id', requireRole('ADMIN'), ctrl.deleteAsset);

module.exports = router;
