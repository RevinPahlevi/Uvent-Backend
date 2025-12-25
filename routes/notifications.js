const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/fcm-token', notificationController.saveFCMToken);

router.get('/user/:userId', notificationController.getUserNotifications);

router.put('/:id/read', notificationController.markAsRead);

router.put('/user/:userId/read-all', notificationController.markAllAsRead);

router.delete('/:id', notificationController.deleteNotification);

router.post('/send-feedback-reminders', notificationController.sendFeedbackReminders);

module.exports = router;
