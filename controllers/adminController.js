const db = require('../config/db');
const notificationService = require('../services/notificationService');

// Hardcoded admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Fungsi untuk format tanggal dari MySQL Date object
function formatDateForResponse(dateValue) {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
    }
    return dateValue;
}

// Proses events untuk format tanggal yang benar
function processEventsDate(events) {
    return events.map(event => ({
        ...event,
        date: formatDateForResponse(event.date),
        created_at: event.created_at ? new Date(event.created_at).toLocaleString('id-ID') : null
    }));
}

// 1. Admin Login
exports.adminLogin = (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.status(200).json({
            status: 'success',
            message: 'Login berhasil',
            token: 'admin-token-' + Date.now() // Simple token for session
        });
    } else {
        res.status(401).json({
            status: 'fail',
            message: 'Username atau password salah'
        });
    }
};

// 2. Render halaman admin.ejs
exports.renderAdminPage = (req, res) => {
    res.render('admin');
};

// 3. Get ALL events (untuk tab "Semua")
exports.getAllEventsAdmin = async (req, res) => {
    try {
        const sql = `SELECT e.*, u.name as creator_name 
                     FROM events e 
                     LEFT JOIN users u ON e.creator_id = u.id 
                     ORDER BY e.created_at DESC`;
        const [events] = await db.query(sql);
        const processedEvents = processEventsDate(events);
        res.status(200).json({ status: 'success', data: processedEvents });
    } catch (error) {
        console.error("Error getting all events:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// 4. Get PENDING events (untuk tab "Diproses")
// Menangkap event dengan status 'menunggu' DAN status kosong ''
exports.getPendingEvents = async (req, res) => {
    try {
        const sql = `SELECT e.*, u.name as creator_name 
                     FROM events e 
                     LEFT JOIN users u ON e.creator_id = u.id 
                     WHERE e.status = 'menunggu' OR e.status = '' OR e.status IS NULL
                     ORDER BY e.created_at ASC`;
        const [events] = await db.query(sql);
        const processedEvents = processEventsDate(events);
        res.status(200).json({ status: 'success', data: processedEvents });
    } catch (error) {
        console.error("Error getting pending events:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// 5. Get APPROVED events (untuk tab "Disetujui")
exports.getApprovedEvents = async (req, res) => {
    try {
        const sql = `SELECT e.*, u.name as creator_name 
                     FROM events e 
                     LEFT JOIN users u ON e.creator_id = u.id 
                     WHERE e.status = 'disetujui'
                     ORDER BY e.created_at DESC`;
        const [events] = await db.query(sql);
        const processedEvents = processEventsDate(events);
        res.status(200).json({ status: 'success', data: processedEvents });
    } catch (error) {
        console.error("Error getting approved events:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// 6. Get REJECTED events (untuk tab "Ditolak")
exports.getRejectedEvents = async (req, res) => {
    try {
        const sql = `SELECT e.*, u.name as creator_name 
                     FROM events e 
                     LEFT JOIN users u ON e.creator_id = u.id 
                     WHERE e.status = 'ditolak'
                     ORDER BY e.created_at DESC`;
        const [events] = await db.query(sql);
        const processedEvents = processEventsDate(events);
        res.status(200).json({ status: 'success', data: processedEvents });
    } catch (error) {
        console.error("Error getting rejected events:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// 7. Get single event by ID
exports.getEventById = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `SELECT e.*, u.name as creator_name 
                     FROM events e 
                     LEFT JOIN users u ON e.creator_id = u.id 
                     WHERE e.id = ?`;
        const [events] = await db.query(sql, [id]);

        if (events.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Event tidak ditemukan' });
        }

        const processedEvents = processEventsDate(events);
        res.status(200).json({ status: 'success', data: processedEvents[0] });
    } catch (error) {
        console.error("Error getting event by id:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// 8. Approve event
exports.approveEvent = async (req, res) => {
    try {
        const { id } = req.params;

        // First, get event details before updating
        const [eventData] = await db.query('SELECT title, type FROM events WHERE id = ?', [id]);

        if (eventData.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Event tidak ditemukan' });
        }

        const event = eventData[0];

        // Update event status to 'disetujui'
        const sql = "UPDATE events SET status = 'disetujui' WHERE id = ?";
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'fail', message: 'Event tidak ditemukan' });
        }

        console.log(`✅ Event ${id} approved: ${event.title}`);

        // ============= BROADCAST NOTIFICATION TO ALL USERS =============
        // Send notification asynchronously (non-blocking)
        setImmediate(async () => {
            try {
                console.log(`📢 Broadcasting event approval notification for: ${event.title}`);

                // Get all user IDs from database
                const [users] = await db.query('SELECT id FROM users');
                const userIds = users.map(user => user.id);

                console.log(`Found ${userIds.length} users to notify`);

                if (userIds.length > 0) {
                    // Send bulk notification
                    const notifResult = await notificationService.sendDualNotificationBulk(
                        userIds,
                        'Event Baru Tersedia! 🎉',
                        `Event "${event.title}" telah disetujui dan siap untuk pendaftaran.`,
                        'event_approved',
                        id,
                        {
                            event_title: event.title,
                            event_type: event.type,
                            action: 'view_event_detail'
                        }
                    );

                    console.log(`✓ Broadcast complete: ${notifResult.success} sent, ${notifResult.failed} failed`);
                } else {
                    console.log("⊘ No users found to notify");
                }

            } catch (notifError) {
                // Notification failure should NOT crash the approval
                console.error("⚠️ Broadcast notification failed (event still approved):", notifError.message);
            }
        });

        res.status(200).json({ status: 'success', message: 'Event berhasil disetujui' });
    } catch (error) {
        console.error("Error approving event:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// 9. Reject event
exports.rejectEvent = async (req, res) => {
    try {
        const { id } = req.params;
        // Note: rejection_reason is not stored in database for now
        // If you want to store it, add the column to events table first:
        // ALTER TABLE events ADD COLUMN rejection_reason TEXT;

        const sql = "UPDATE events SET status = 'ditolak' WHERE id = ?";
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'fail', message: 'Event tidak ditemukan' });
        }

        res.status(200).json({ status: 'success', message: 'Event berhasil ditolak' });
    } catch (error) {
        console.error("Error rejecting event:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};