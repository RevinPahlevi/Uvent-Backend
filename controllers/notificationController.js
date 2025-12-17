// Notification Controller - API Endpoints
// Purpose: Handle FCM token management & in-app notification retrieval
// Created: 2025-12-17

const db = require('../config/db');

/**
 * POST /api/notifications/fcm-token
 * Save or update FCM token for push notifications
 * 
 * Request body:
 * {
 *   user_id: number,
 *   fcm_token: string,
 *   device_id: string (optional),
 *   device_type: 'android' | 'ios',
 *   app_version: string (optional)
 * }
 */
exports.saveFCMToken = async (req, res) => {
    try {
        const { user_id, fcm_token, device_id, device_type, app_version } = req.body;

        // Validation
        if (!user_id || !fcm_token) {
            return res.status(400).json({
                status: 'fail',
                message: 'user_id dan fcm_token diperlukan'
            });
        }

        // Insert or update token (ON DUPLICATE KEY UPDATE)
        await db.query(
            `INSERT INTO user_fcm_tokens (user_id, fcm_token, device_id, device_type, app_version)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                device_id = VALUES(device_id),
                device_type = VALUES(device_type),
                app_version = VALUES(app_version),
                is_active = TRUE,
                last_used_at = NOW()`,
            [user_id, fcm_token, device_id || null, device_type || 'android', app_version || null]
        );

        console.log(`✓ FCM token saved for user ${user_id}`);

        res.status(200).json({
            status: 'success',
            message: 'FCM token berhasil disimpan'
        });

    } catch (error) {
        console.error('Error saving FCM token:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Gagal menyimpan FCM token',
            error: error.message
        });
    }
};

/**
 * GET /api/notifications/user/:userId
 * Get user notifications for in-app display
 * Query params: limit, offset
 */
exports.getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Get notifications
        const [notifications] = await db.query(
            `SELECT id, title, body, type, related_id, is_read, created_at, notification_data
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)]
        );

        // Get unread count
        const [unreadCount] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        res.status(200).json({
            status: 'success',
            data: {
                notifications: notifications,
                unread_count: unreadCount[0].count,
                total: notifications.length
            }
        });

    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Gagal mengambil notifikasi',
            error: error.message
        });
    }
};

/**
 * PUT /api/notifications/:id/read
 * Mark single notification as read
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Notifikasi tidak ditemukan'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Notifikasi ditandai sudah dibaca'
        });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Gagal menandai notifikasi',
            error: error.message
        });
    }
};

/**
 * PUT /api/notifications/user/:userId/read-all
 * Mark all notifications as read for a user
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;

        const [result] = await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        res.status(200).json({
            status: 'success',
            message: `${result.affectedRows} notifikasi ditandai sudah dibaca`
        });

    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Gagal menandai semua notifikasi',
            error: error.message
        });
    }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'DELETE FROM notifications WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Notifikasi tidak ditemukan'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Notifikasi berhasil dihapus'
        });

    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Gagal menghapus notifikasi',
            error: error.message
        });
    }
};
