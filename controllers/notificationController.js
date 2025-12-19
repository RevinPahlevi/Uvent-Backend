// Notification Controller - API Endpoints
// Purpose: Handle FCM token management & in-app notification retrieval
// Created: 2025-12-17

const db = require('../config/db');
const notificationService = require('../services/notificationService');

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

/**
 * POST /api/notifications/send-feedback-reminders
 * Check for ended events and send feedback reminder notifications to participants
 * 
 * Logic:
 * 1. Query events where (date + time_end) < NOW()
 * 2. For each ended event, find participants who haven't received feedback notification
 * 3. Send notification: "Event '{title}' telah selesai! Berikan feedbackmu 📝"
 * 4. Mark participants as notified to avoid spam
 */
exports.sendFeedbackReminders = async (req, res) => {
    try {
        console.log("=== SEND FEEDBACK REMINDERS ===");

        // 1. Query events yang sudah selesai (date + time_end < NOW)
        // Events yang tanggalnya sudah lewat atau tanggal hari ini dengan waktu sudah lewat
        const [endedEvents] = await db.query(`
            SELECT e.id, e.title, e.date, e.time_end
            FROM events e
            WHERE 
                (e.date < CURDATE()) 
                OR (e.date = CURDATE() AND e.time_end <= CURTIME())
        `);

        console.log(`Found ${endedEvents.length} ended events`);

        let totalSent = 0;
        let totalFailed = 0;

        for (const event of endedEvents) {
            console.log(`Processing event: ${event.id} - ${event.title}`);

            // 2. Get participants who registered for this event
            // AND haven't received feedback reminder notification yet
            // AND haven't given feedback yet
            const [participants] = await db.query(`
                SELECT r.user_id, u.name as user_name
                FROM registrations r
                JOIN users u ON r.user_id = u.id
                WHERE r.event_id = ?
                AND r.user_id IS NOT NULL
                AND r.user_id NOT IN (
                    -- Exclude users who already received feedback_reminder for this event
                    SELECT n.user_id FROM notifications n 
                    WHERE n.type = 'feedback_reminder' 
                    AND n.related_id = ?
                )
                AND r.user_id NOT IN (
                    -- Exclude users who already gave feedback for this event
                    SELECT f.user_id FROM feedbacks f 
                    WHERE f.event_id = ?
                )
            `, [event.id, event.id, event.id]);

            console.log(`  → ${participants.length} participants need notification`);

            // 3. Send notification to each participant
            for (const participant of participants) {
                try {
                    const result = await notificationService.sendDualNotification(
                        participant.user_id,
                        'Event Selesai! 🎉',
                        `Event "${event.title}" telah selesai! Berikan feedbackmu 📝`,
                        'feedback_reminder',
                        event.id,
                        {
                            event_title: event.title,
                            action: 'add_feedback'
                        }
                    );

                    if (result.inApp || result.push) {
                        totalSent++;
                        console.log(`    ✓ Sent to user ${participant.user_id} (${participant.user_name})`);
                    } else {
                        totalFailed++;
                        console.log(`    ✗ Failed for user ${participant.user_id}`);
                    }
                } catch (notifError) {
                    totalFailed++;
                    console.error(`    ✗ Error for user ${participant.user_id}:`, notifError.message);
                }
            }
        }

        console.log(`=== COMPLETED: ${totalSent} sent, ${totalFailed} failed ===`);

        res.status(200).json({
            status: 'success',
            message: 'Feedback reminders processed',
            data: {
                events_processed: endedEvents.length,
                notifications_sent: totalSent,
                notifications_failed: totalFailed
            }
        });

    } catch (error) {
        console.error('Error sending feedback reminders:', error);
        res.status(500).json({
            status: 'fail',
            message: 'Gagal mengirim feedback reminders',
            error: error.message
        });
    }
};
