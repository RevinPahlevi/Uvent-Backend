// Notification Service - Dual Notification System
// Purpose: Orchestrator untuk mengirim PUSH + IN-APP notification
// Created: 2025-12-17

const db = require('../config/db');
const { admin, firebaseInitialized } = require('../config/firebase');

/**
 * Send dual notification (In-App + Push)
 * 
 * ARCHITECTURE:
 * 1. IN-APP: Save to notifications table (always)
 * 2. PUSH: Send via FCM to user's devices (if token exists)
 * 
 * ERROR HANDLING:
 * - If in-app fails, push still attempts
 * - If push fails, in-app still saved
 * - Function NEVER throws error (graceful degradation)
 * 
 * @param {number} userId - Penerima notifikasi (user_id)
 * @param {string} title - Judul notifikasi
 * @param {string} body - Isi pesan notifikasi
 * @param {string} type - Tipe: 'registration', 'feedback', 'general', etc.
 * @param {number} relatedId - ID terkait (event_id, feedback_id, etc.)
 * @param {object} data - Extra metadata untuk notification
 * @returns {Promise<{inApp: boolean, push: boolean, errors: string[]}>}
 */
exports.sendDualNotification = async (userId, title, body, type = 'general', relatedId = null, data = {}) => {
    const results = {
        inApp: false,
        push: false,
        errors: []
    };

    // ============= 1. IN-APP NOTIFICATION (Database) =============
    try {
        await db.query(
            `INSERT INTO notifications (user_id, title, body, type, related_id, notification_data, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [userId, title, body, type, relatedId, JSON.stringify(data)]
        );

        results.inApp = true;
        console.log(`✓ [IN-APP] Notification saved for user ${userId}`);

    } catch (dbError) {
        results.errors.push(`In-app failed: ${dbError.message}`);
        console.error(`⚠ [IN-APP] Failed to save notification for user ${userId}:`, dbError.message);
    }

    // ============= 2. PUSH NOTIFICATION (FCM) =============

    // Check if Firebase initialized
    if (!firebaseInitialized) {
        console.log(`⊘ [PUSH] Firebase not initialized - skipping push notification`);
        results.errors.push('Firebase not initialized');
        return results;
    }

    try {
        // Get active FCM tokens for user
        const [tokens] = await db.query(
            'SELECT fcm_token FROM user_fcm_tokens WHERE user_id = ? AND is_active = TRUE',
            [userId]
        );

        if (tokens.length === 0) {
            console.log(`⊘ [PUSH] No FCM token found for user ${userId} - skipping push`);
            return results;
        }

        // Prepare FCM message
        const fcmTokens = tokens.map(t => t.fcm_token);

        const message = {
            notification: {
                title: title,
                body: body
            },
            data: {
                type: type,
                related_id: relatedId ? relatedId.toString() : '0',
                click_action: 'FLUTTER_NOTIFICATION_CLICK', // For handling click
                ...Object.keys(data).reduce((acc, key) => {
                    acc[key] = String(data[key]); // FCM data must be strings
                    return acc;
                }, {})
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'uvent_notifications',
                    priority: 'high',
                    defaultSound: true,
                    defaultVibrateTimings: true
                }
            },
            tokens: fcmTokens
        };

        // Send via FCM
        const response = await admin.messaging().sendEachForMulticast(message);

        if (response.successCount > 0) {
            results.push = true;
            console.log(`✓ [PUSH] Sent to ${response.successCount} device(s) for user ${userId}`);
        }

        // Handle failed tokens
        if (response.failureCount > 0) {
            console.warn(`⚠ [PUSH] ${response.failureCount} device(s) failed for user ${userId}`);

            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const token = fcmTokens[idx];
                    const errorCode = resp.error?.code;

                    console.error(`✗ [PUSH] Failed token ${token.substring(0, 20)}...: ${errorCode}`);

                    // Deactivate invalid/expired tokens
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {

                        db.query(
                            'UPDATE user_fcm_tokens SET is_active = FALSE WHERE fcm_token = ?',
                            [token]
                        ).catch(err => {
                            console.error(`Failed to deactivate invalid token:`, err.message);
                        });

                        console.log(`  → Token deactivated: ${token.substring(0, 20)}...`);
                    }
                }
            });
        }

    } catch (pushError) {
        results.errors.push(`Push failed: ${pushError.message}`);
        console.error(`⚠ [PUSH] Failed for user ${userId}:`, pushError.message);
    }

    return results;
};

/**
 * Send notification to multiple users
 * Useful for broadcast notifications
 * 
 * @param {number[]} userIds - Array of user IDs
 * @param {string} title 
 * @param {string} body 
 * @param {string} type 
 * @param {number} relatedId 
 * @param {object} data 
 * @returns {Promise<{success: number, failed: number}>}
 */
exports.sendDualNotificationBulk = async (userIds, title, body, type, relatedId, data = {}) => {
    let successCount = 0;
    let failedCount = 0;

    for (const userId of userIds) {
        try {
            const result = await exports.sendDualNotification(userId, title, body, type, relatedId, data);

            if (result.inApp || result.push) {
                successCount++;
            } else {
                failedCount++;
            }
        } catch (error) {
            failedCount++;
            console.error(`Bulk notification failed for user ${userId}:`, error.message);
        }
    }

    console.log(`[BULK] Sent notifications: ${successCount} success, ${failedCount} failed`);

    return { success: successCount, failed: failedCount };
};
