// Scheduler Service - Automated Tasks with Precision Timing
// Purpose: Send feedback notifications EXACTLY when events end
// Updated: 2025-12-19

const cron = require('node-cron');
const db = require('../config/db');
const notificationService = require('./notificationService');

// Store scheduled timeouts for cleanup
let scheduledTimeouts = [];

/**
 * Initialize all scheduled jobs
 */
function initScheduler() {
    console.log('✓ Scheduler initialized');

    // ===== PRECISION FEEDBACK REMINDER =====
    // Schedule notifications for the exact moment events end
    scheduleNextEventNotification();

    // Also run a backup check every 5 minutes for any missed events
    cron.schedule('*/5 * * * *', async () => {
        console.log('\n[SCHEDULER] Backup check for missed events...');
        await sendFeedbackReminders();
    });

    // Run immediately on startup to catch any past events
    setTimeout(async () => {
        console.log('\n[SCHEDULER] Initial check on startup...');
        await sendFeedbackReminders();
        // Then schedule for next event
        await scheduleNextEventNotification();
    }, 5000);
}

/**
 * Schedule notification for the next event that will end
 * This provides INSTANT notifications - NO DELAY
 */
async function scheduleNextEventNotification() {
    try {
        // Clear any existing scheduled timeouts
        scheduledTimeouts.forEach(timeout => clearTimeout(timeout));
        scheduledTimeouts = [];

        // Find ALL events ending in the next 24 hours
        const [upcomingEvents] = await db.query(`
            SELECT e.id, e.title, e.date, e.time_end,
                   TIMESTAMPDIFF(SECOND, NOW(), TIMESTAMP(e.date, e.time_end)) as seconds_until_end
            FROM events e
            WHERE 
                TIMESTAMP(e.date, e.time_end) > NOW()
                AND TIMESTAMP(e.date, e.time_end) <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
            ORDER BY TIMESTAMP(e.date, e.time_end) ASC
            LIMIT 50
        `);

        if (upcomingEvents.length === 0) {
            console.log('[SCHEDULER] No events ending in next 24 hours');
            return;
        }

        console.log(`[SCHEDULER] Found ${upcomingEvents.length} events ending in next 24 hours`);

        // Schedule timeout for EACH event - NO delay, NO buffer
        for (const event of upcomingEvents) {
            // Minimum 0ms - trigger immediately if already passed
            const secondsUntilEnd = Math.max(event.seconds_until_end, 0);
            const msUntilEnd = secondsUntilEnd * 1000;

            // Schedule ALL events within 24 hours (not just 2 hours)
            console.log(`[SCHEDULER] Scheduling notification for "${event.title}" in ${secondsUntilEnd} seconds`);

            const timeout = setTimeout(async () => {
                console.log(`\n[SCHEDULER] ⏰ Event "${event.title}" ENDED! Sending notifications IMMEDIATELY...`);
                await sendNotificationsForEvent(event.id, event.title);

                // Schedule next event after this one fires
                await scheduleNextEventNotification();
            }, msUntilEnd); // NO buffer - trigger EXACTLY when event ends

            scheduledTimeouts.push(timeout);
        }

    } catch (error) {
        console.error('[SCHEDULER] Error scheduling next event:', error.message);
    }
}

/**
 * Send notifications for a specific event that just ended
 */
async function sendNotificationsForEvent(eventId, eventTitle) {
    try {
        // Get participants who need notification
        const [participants] = await db.query(`
            SELECT r.user_id, u.name as user_name
            FROM registrations r
            JOIN users u ON r.user_id = u.id
            WHERE r.event_id = ?
            AND r.user_id IS NOT NULL
            AND r.user_id NOT IN (
                SELECT n.user_id FROM notifications n 
                WHERE n.type = 'feedback_reminder' 
                AND n.related_id = ?
            )
            AND r.user_id NOT IN (
                SELECT f.user_id FROM feedbacks f 
                WHERE f.event_id = ?
            )
        `, [eventId, eventId, eventId]);

        if (participants.length === 0) {
            console.log(`[SCHEDULER] No participants need notification for event ${eventId}`);
            return;
        }

        console.log(`[SCHEDULER] Sending to ${participants.length} participants...`);

        for (const participant of participants) {
            try {
                await notificationService.sendDualNotification(
                    participant.user_id,
                    'Event Selesai! 🎉',
                    `Event "${eventTitle}" telah selesai! Berikan feedbackmu 📝`,
                    'feedback_reminder',
                    eventId,
                    {
                        event_title: eventTitle,
                        action: 'add_feedback'
                    }
                );
                console.log(`  ✓ Sent to ${participant.user_name}`);
            } catch (err) {
                console.error(`  ✗ Failed for ${participant.user_name}:`, err.message);
            }
        }
    } catch (error) {
        console.error('[SCHEDULER] Error sending notifications for event:', error.message);
    }
}

/**
 * Backup: Send feedback reminders for any missed events
 */
async function sendFeedbackReminders() {
    try {
        const [endedEvents] = await db.query(`
            SELECT e.id, e.title, e.date, e.time_end
            FROM events e
            WHERE 
                (e.date < CURDATE()) 
                OR (e.date = CURDATE() AND e.time_end <= CURTIME())
        `);

        if (endedEvents.length === 0) {
            console.log('[SCHEDULER] No ended events found');
            return;
        }

        let totalSent = 0;

        for (const event of endedEvents) {
            const [participants] = await db.query(`
                SELECT r.user_id, u.name as user_name
                FROM registrations r
                JOIN users u ON r.user_id = u.id
                WHERE r.event_id = ?
                AND r.user_id IS NOT NULL
                AND r.user_id NOT IN (
                    SELECT n.user_id FROM notifications n 
                    WHERE n.type = 'feedback_reminder' 
                    AND n.related_id = ?
                )
                AND r.user_id NOT IN (
                    SELECT f.user_id FROM feedbacks f 
                    WHERE f.event_id = ?
                )
            `, [event.id, event.id, event.id]);

            for (const participant of participants) {
                try {
                    const result = await notificationService.sendDualNotification(
                        participant.user_id,
                        'Event Selesai! 🎉',
                        `Event "${event.title}" telah selesai! Berikan feedbackmu 📝`,
                        'feedback_reminder',
                        event.id,
                        { event_title: event.title, action: 'add_feedback' }
                    );
                    if (result.inApp || result.push) totalSent++;
                } catch (err) {
                    // Silent fail for backup
                }
            }
        }

        if (totalSent > 0) {
            console.log(`[SCHEDULER] Backup sent ${totalSent} notifications`);
        }
    } catch (error) {
        console.error('[SCHEDULER] Error in backup check:', error.message);
    }
}

module.exports = { initScheduler, scheduleNextEventNotification };
