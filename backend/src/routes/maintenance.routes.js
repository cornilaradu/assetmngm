const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/maintenance.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadMaintenanceDocs } = require('../middleware/upload');
const { runReminderCheck } = require('../services/reminder.service');

router.use(requireAuth);

router.get('/', ctrl.listSchedules);
router.post('/', requireRole('ADMIN', 'MANAGER'), ctrl.createSchedule);
router.put('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.updateSchedule);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.deleteSchedule);

// Tehnicianul responsabil (sau admin/manager) poate marca o mentenanta ca efectuata.
// Necesita cel putin un document atasat (camp "documents", multipart/form-data) - validat in controller.
// Middleware-ul multer e infasurat ca sa transformam erorile lui (fisier prea mare, tip gresit)
// in raspunsuri JSON clare, nu crash-uri necontrolate.
function handleUpload(req, res, next) {
  uploadMaintenanceDocs.array('documents', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Eroare la incarcarea documentelor.' });
    }
    next();
  });
}

router.post(
  '/:id/mark-performed',
  requireRole('ADMIN', 'MANAGER', 'TECHNICIAN'),
  handleUpload,
  ctrl.markAsPerformed
);

// Descarcare document atasat unei interventii de mentenanta
router.get('/documents/:docId/download', ctrl.downloadDocument);

// Endpoint manual pentru a declansa imediat verificarea de remindere (util pt testare / buton "Trimite acum")
router.post('/run-reminder-check', requireRole('ADMIN'), async (req, res) => {
  const result = await runReminderCheck();
  res.json(result);
});

module.exports = router;
