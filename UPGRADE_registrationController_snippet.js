// INSTRUCTION: Replace lines 198-208 in registrationController.js dengan code ini:

if (!isSelfRegistration) {
    // UPGRADED: Use dual notification service (Push + In-App)
    const notificationService = require('../services/notificationService');

    const title = 'Pendaftaran Event 🎉';
    const body = `${name} telah mendaftar pada event "${eventTitle}".`;

    // SEND DUAL NOTIFICATION (Push + In-App)
    const notifResult = await notificationService.sendDualNotification(
        creatorId,
        title,
        body,
        'registration',
        event_id,
        {
            event_title: eventTitle,
            participant_name: name,
            event_id: event_id
        }
    );

    console.log(`Dual notification sent: In-App=${notifResult.inApp}, Push=${notifResult.push}`);
    if (notifResult.errors.length > 0) {
        console.warn('Notification warnings:', notifResult.errors.join(', '));
    }
