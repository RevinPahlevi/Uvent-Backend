const cron = require('node-cron');
const db = require('../config/db');
const notificationService = require('./notificationService');

let scheduledEndTimeouts = [];
let scheduledStartTimeouts = [];

function initScheduler() {
    console.log('✓ Scheduler initialized');

    scheduleNextEventNotification();

    scheduleEventStartNotifications();

    cron.schedule('*/30 * * * * *', async () => {
        await scheduleNextEventNotification();
        await scheduleEventStartNotifications();
    });

    cron.schedule('*/10 * * * * *', async () => {
        await sendFeedbackReminders();
        await sendDocumentationReminders();
    });

    setTimeout(async () => {
        console.log('\n[SCHEDULER] Initial check on startup...');
        await sendFeedbackReminders();
        await sendDocumentationReminders();
        await scheduleNextEventNotification();
        await scheduleEventStartNotifications();
    }, 1000);
}

async function scheduleNextEventNotification() {
    try {
        scheduledEndTimeouts.forEach(timeout => clearTimeout(timeout));
        scheduledEndTimeouts = [];

        const [alreadyEndedEvents] = await db.query(`
            SELECT e.id, e.title, e.date, e.time_end
            FROM events e
            WHERE 
                e.status = 'disetujui'
                AND (
                    (e.date < CURDATE()) 
                    OR (e.date = CURDATE() AND e.time_end <= CURTIME())
                )
        `);

        if (alreadyEndedEvents.length > 0) {
            console.log(`[SCHEDULER] ⏰ Found ${alreadyEndedEvents.length} events ALREADY ENDED - sending feedback notifications IMMEDIATELY!`);

            for (const event of alreadyEndedEvents) {
                console.log(`[SCHEDULER] ⏰ Event "${event.title}" has already ended - sending feedback reminders NOW!`);
                await sendNotificationsForEvent(event.id, event.title);
            }
        }

        const [upcomingEvents] = await db.query(`
            SELECT e.id, e.title, e.date, e.time_end,
                   TIMESTAMPDIFF(SECOND, NOW(), TIMESTAMP(e.date, e.time_end)) as seconds_until_end
            FROM events e
            WHERE 
                e.status = 'disetujui'
                AND TIMESTAMP(e.date, e.time_end) > NOW()
                AND TIMESTAMP(e.date, e.time_end) <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
            ORDER BY TIMESTAMP(e.date, e.time_end) ASC
            LIMIT 50
        `);

        if (upcomingEvents.length === 0) {
            console.log('[SCHEDULER] No events ending in next 24 hours');
            return;
        }

        console.log(`[SCHEDULER] Found ${upcomingEvents.length} events ending in next 24 hours`);

        for (const event of upcomingEvents) {
            const secondsUntilEnd = Math.max(event.seconds_until_end, 0);
            const msUntilEnd = secondsUntilEnd * 1000;

            console.log(`[SCHEDULER] Scheduling END notification for "${event.title}" in ${secondsUntilEnd} seconds`);

            const timeout = setTimeout(async () => {
                console.log(`\n[SCHEDULER] ⏰ Event "${event.title}" ENDED! Sending feedback notifications...`);
                await sendNotificationsForEvent(event.id, event.title);

                await scheduleNextEventNotification();
            }, msUntilEnd);

            scheduledEndTimeouts.push(timeout);
        }

    } catch (error) {
        console.error('[SCHEDULER] Error scheduling next event:', error.message);
    }
}

async function sendNotificationsForEvent(eventId, eventTitle) {
    try {
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

async function sendFeedbackReminders() {
    try {
        const [endedEvents] = await db.query(`
            SELECT e.id, e.title, e.date, e.time_end
            FROM events e
            WHERE 
                e.status = 'disetujui'
                AND (
                    (e.date < CURDATE()) 
                    OR (e.date = CURDATE() AND e.time_end <= CURTIME())
                )
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
                }
            }
        }

        if (totalSent > 0) {
            console.log(`[SCHEDULER] Backup sent ${totalSent} feedback notifications`);
        }
    } catch (error) {
        console.error('[SCHEDULER] Error in backup check:', error.message);
    }
}

async function scheduleEventStartNotifications() {
    try {
        scheduledStartTimeouts.forEach(timeout => clearTimeout(timeout));
        scheduledStartTimeouts = [];

        const [alreadyStartedEvents] = await db.query(`
            SELECT e.id, e.title, e.date, e.time_start, e.time_end
            FROM events e
            WHERE 
                e.status = 'disetujui'
                AND (e.date < CURDATE() OR (e.date = CURDATE() AND e.time_start <= CURTIME()))
                AND (e.date > CURDATE() OR (e.date = CURDATE() AND e.time_end > CURTIME()))
        `);

        if (alreadyStartedEvents.length > 0) {
            console.log(`[SCHEDULER] 📸 Found ${alreadyStartedEvents.length} events ALREADY RUNNING - sending documentation reminders IMMEDIATELY!`);

            for (const event of alreadyStartedEvents) {
                console.log(`[SCHEDULER] 📸 Event "${event.title}" is currently running - sending doc reminders NOW!`);
                await sendDocumentationNotificationsForEvent(event.id, event.title);
            }
        }

        const [upcomingEvents] = await db.query(`
            SELECT e.id, e.title, e.date, e.time_start,
                   TIMESTAMPDIFF(SECOND, NOW(), TIMESTAMP(e.date, e.time_start)) as seconds_until_start
            FROM events e
            WHERE 
                e.status = 'disetujui'
                AND TIMESTAMP(e.date, e.time_start) > NOW()
                AND TIMESTAMP(e.date, e.time_start) <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
            ORDER BY TIMESTAMP(e.date, e.time_start) ASC
            LIMIT 50
        `);

        if (upcomingEvents.length === 0) {
            console.log('[SCHEDULER] No events starting in next 24 hours');
            return;
        }

        console.log(`[SCHEDULER] Found ${upcomingEvents.length} events starting in next 24 hours`);

        for (const event of upcomingEvents) {
            const secondsUntilStart = Math.max(event.seconds_until_start, 0);
            const msUntilStart = secondsUntilStart * 1000;

            console.log(`[SCHEDULER] Scheduling START notification for "${event.title}" in ${secondsUntilStart} seconds`);

            const timeout = setTimeout(async () => {
                console.log(`\n[SCHEDULER] 📸 Event "${event.title}" STARTED! Sending documentation reminders...`);
                await sendDocumentationNotificationsForEvent(event.id, event.title);

                await scheduleEventStartNotifications();
            }, msUntilStart);

            scheduledStartTimeouts.push(timeout);
        }

    } catch (error) {
        console.error('[SCHEDULER] Error scheduling event start notifications:', error.message);
    }
}

async function sendDocumentationNotificationsForEvent(eventId, eventTitle) {
    try {
        const [participants] = await db.query(`
            SELECT r.user_id, u.name as user_name
            FROM registrations r
            JOIN users u ON r.user_id = u.id
            WHERE r.event_id = ?
            AND r.user_id IS NOT NULL
            AND r.user_id NOT IN (
                SELECT n.user_id FROM notifications n 
                WHERE n.type = 'documentation_reminder' 
                AND n.related_id = ?
            )
        `, [eventId, eventId]);

        if (participants.length === 0) {
            console.log(`[SCHEDULER] No participants need documentation reminder for event ${eventId}`);
            return;
        }

        console.log(`[SCHEDULER] Sending documentation reminders to ${participants.length} participants...`);

        for (const participant of participants) {
            try {
                await notificationService.sendDualNotification(
                    participant.user_id,
                    'Event Sudah Dimulai! 📸',
                    `Event "${eventTitle}" sudah dimulai! Ayo dokumentasikan kegiatan seru mu selama event berjalan 🎉`,
                    'documentation_reminder',
                    eventId,
                    {
                        event_title: eventTitle,
                        action: 'add_documentation'
                    }
                );
                console.log(`  ✓ Doc reminder sent to ${participant.user_name}`);
            } catch (err) {
                console.error(`  ✗ Doc reminder failed for ${participant.user_name}:`, err.message);
            }
        }
    } catch (error) {
        console.error('[SCHEDULER] Error sending documentation notifications:', error.message);
    }
}

async function sendDocumentationReminders() {
    try {
        const [runningEvents] = await db.query(`
            SELECT e.id, e.title, e.date, e.time_start, e.time_end
            FROM events e
            WHERE 
                e.status = 'disetujui'
                AND (e.date < CURDATE() OR (e.date = CURDATE() AND e.time_start <= CURTIME()))
                AND (e.date > CURDATE() OR (e.date = CURDATE() AND e.time_end > CURTIME()))
        `);

        if (runningEvents.length === 0) {
            console.log('[SCHEDULER] No currently running events');
            return;
        }

        let totalSent = 0;

        for (const event of runningEvents) {
            const [participants] = await db.query(`
                SELECT r.user_id, u.name as user_name
                FROM registrations r
                JOIN users u ON r.user_id = u.id
                WHERE r.event_id = ?
                AND r.user_id IS NOT NULL
                AND r.user_id NOT IN (
                    SELECT n.user_id FROM notifications n 
                    WHERE n.type = 'documentation_reminder' 
                    AND n.related_id = ?
                )
            `, [event.id, event.id]);

            for (const participant of participants) {
                try {
                    const result = await notificationService.sendDualNotification(
                        participant.user_id,
                        'Event Sudah Dimulai! 📸',
                        `Event "${event.title}" sudah dimulai! Ayo dokumentasikan kegiatan seru mu selama event berjalan 🎉`,
                        'documentation_reminder',
                        event.id,
                        { event_title: event.title, action: 'add_documentation' }
                    );
                    if (result.inApp || result.push) totalSent++;
                } catch (err) {
                }
            }
        }

        if (totalSent > 0) {
            console.log(`[SCHEDULER] Backup sent ${totalSent} documentation reminders`);
        }
    } catch (error) {
        console.error('[SCHEDULER] Error in documentation backup check:', error.message);
    }
}

module.exports = { initScheduler, scheduleNextEventNotification, scheduleEventStartNotifications };
