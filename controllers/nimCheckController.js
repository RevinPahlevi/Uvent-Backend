const db = require('../config/db');

// Check NIM availability for edit (exclude current registration)
exports.checkNimForEdit = async (req, res) => {
    try {
        const { eventId, nim, registrationId } = req.query;

        console.log('=== CHECK NIM FOR EDIT ===');
        console.log('  eventId:', eventId);
        console.log('  nim:', nim);
        console.log('  registrationId:', registrationId);

        if (!eventId || !nim || !registrationId) {
            return res.status(400).json({
                status: 'fail',
                message: 'Event ID, NIM, dan Registration ID diperlukan'
            });
        }

        // Check if NIM exists for this event (excluding current registration)
        const [existing] = await db.query(
            'SELECT id FROM registrations WHERE event_id = ? AND nim = ? AND id != ?',
            [eventId, nim, registrationId]
        );

        const available = existing.length === 0;
        console.log('  NIM available:', available);

        res.json({
            status: 'success',
            available: available,
            message: available ? 'NIM tersedia' : 'NIM sudah terdaftar di event ini'
        });
    } catch (error) {
        console.error('Error checking NIM:', error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};
