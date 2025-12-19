// Notification Routes
// Purpose: API endpoints untuk notification management
// Created: 2025-12-17

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
// const { authenticateToken } = require('../middleware/authMiddleware'); // TODO: Enable for production

// ===== FCM TOKEN MANAGEMENT =====

// Save/update FCM token untuk push notifications
// POST /api/notifications/fcm-token
router.post('/fcm-token', notificationController.saveFCMToken);

// ===== IN-APP NOTIFICATION RETRIEVAL =====

// Get user notifications (untuk tab Notifikasi)
// GET /api/notifications/user/:userId?limit=50&offset=0
router.get('/user/:userId', notificationController.getUserNotifications);

// ===== NOTIFICATION ACTIONS =====

// Mark notification as read
// PUT /api/notifications/:id/read
router.put('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
// PUT /api/notifications/user/:userId/read-all
router.put('/user/:userId/read-all', notificationController.markAllAsRead);

// Delete notification
// DELETE /api/notifications/:id
router.delete('/:id', notificationController.deleteNotification);

// ===== FEEDBACK REMINDER =====

// Send feedback reminders to participants of ended events
// POST /api/notifications/send-feedback-reminders
router.post('/send-feedback-reminders', notificationController.sendFeedbackReminders);

module.exports = router;
