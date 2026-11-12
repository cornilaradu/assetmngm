const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationRead,
} = require('../controllers/notifications.controller');

router.use(requireAuth);

router.get('/', getNotifications);
router.post('/read', markNotificationRead);

module.exports = router;
