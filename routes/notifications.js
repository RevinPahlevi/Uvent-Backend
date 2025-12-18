// Notification Routes
// Purpose: API endpoints untuk notification management
// Created: 2025-12-17

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

// ===== FCM TOKEN MANAGEMENT =====

// Save/update FCM token untuk push notifications
// POST /api/notifications/fcm-token
router.post('/fcm-token', authenticateToken, notificationController.saveFCMToken);

// ===== IN-APP NOTIFICATION RETRIEVAL =====

// Get user notifications (untuk tab Notifikasi)
// GET /api/notifications/user/:userId?limit=50&offset=0
router.get('/user/:userId', authenticateToken, notificationController.getUserNotifications);

// ===== NOTIFICATION ACTIONS =====

// Mark notification as read
// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

// Mark all notifications as read
// PUT /api/notifications/user/:userId/read-all
router.put('/user/:userId/read-all', authenticateToken, notificationController.markAllAsRead);

// Delete notification
// DELETE /api/notifications/:id
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

module.exports = router;
