const db = require('../config/db');
const notificationService = require('../services/notificationService');

function reformatDate(dateStr) {
    if (!dateStr) return null;
    try {
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
        return dateStr;
    } catch (error) {
        console.error("Error reformatting date:", error);
        return dateStr;
    }
}

function formatDateForResponse(dateValue) {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateValue;
}

function processEventsDate(events) {
    return events.map(event => ({
        ...event,
        date: formatDateForResponse(event.date)
    }));
}

exports.createEvent = async (req, res) => {
    try {
        const {
            title, type, date, timeStart, timeEnd,
            platformType, locationDetail, quota, thumbnailUri,
            creator_id
        } = req.body;

        console.log("=== CREATE EVENT DEBUG ===");
        console.log("Received body:", JSON.stringify(req.body, null, 2));
        console.log("Received date:", date);
        console.log("Received timeStart:", timeStart);
        console.log("Received timeEnd:", timeEnd);
        console.log("Received thumbnailUri:", thumbnailUri);
        console.log("Type of thumbnailUri:", typeof thumbnailUri);
        console.log("Received creator_id:", creator_id);
        console.log("Type of creator_id:", typeof creator_id);

        const formattedDate = reformatDate(date);
        console.log("Formatted date for DB:", formattedDate);

        const quotaInt = parseInt(quota, 10) || 0;

        let creatorIdInt = null;
        if (creator_id !== null && creator_id !== undefined && creator_id !== '') {
            const parsed = parseInt(creator_id, 10);
            if (!isNaN(parsed)) {
                creatorIdInt = parsed;
            }
        }
        console.log("Parsed creator_id for DB:", creatorIdInt);

        if (!title || !type || !date || !timeStart || !timeEnd || !platformType || !locationDetail || !quota) {
            console.error("❌ Validation failed: Missing required fields");
            return res.status(400).json({
                status: 'fail',
                message: 'Semua field wajib diisi'
            });
        }

        const thumbnailUriValue = (thumbnailUri && thumbnailUri.trim() !== '') ? thumbnailUri : null;
        console.log("Final thumbnailUri for DB:", thumbnailUriValue);

        const sql = `INSERT INTO events 
                        (title, type, date, time_start, time_end, platform_type, location_detail, quota, thumbnail_uri, creator_id, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', NOW())`;

        console.log("Values for DB insert:", {
            title, type, formattedDate, timeStart, timeEnd,
            platformType, locationDetail, quotaInt, thumbnailUriValue,
            creatorIdInt
        });

        const [result] = await db.query(sql, [
            title, type, formattedDate, timeStart, timeEnd,
            platformType, locationDetail, quotaInt, thumbnailUriValue,
            creatorIdInt
        ]);

        const eventId = result.insertId;
        console.log(`✅ Event created successfully with ID: ${eventId}`);
        console.log(`📋 Event status: menunggu (pending admin approval)`);

        res.status(201).json({ status: 'success', message: 'Event berhasil dibuat' });

    } catch (error) {
        console.error("❌ Error creating event:", error);
        console.error("Error stack:", error.stack);

        let errorMessage = 'Gagal membuat event';
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'Event dengan data yang sama sudah ada';
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            errorMessage = 'Creator ID tidak valid';
        } else if (error.sqlMessage) {
            errorMessage = `Database error: ${error.sqlMessage}`;
        }

        res.status(500).json({ status: 'fail', message: errorMessage });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const sql = "SELECT * FROM events WHERE status = 'disetujui' ORDER BY date DESC";
        const [events] = await db.query(sql);

        const processedEvents = processEventsDate(events);

        res.status(200).json({ status: 'success', data: processedEvents });
    } catch (error) {
        console.error("Error getting events:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

exports.getMyCreatedEvents = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ status: 'fail', message: 'User ID diperlukan' });
        }

        const sql = "SELECT * FROM events WHERE creator_id = ? ORDER BY date DESC";
        const [events] = await db.query(sql, [userId]);

        const processedEvents = processEventsDate(events);

        res.status(200).json({ status: 'success', data: processedEvents });
    } catch (error) {
        console.error("Error getting my events:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, type, date, timeStart, timeEnd,
            platformType, locationDetail, quota, thumbnailUri
        } = req.body;

        console.log("=== UPDATE EVENT DEBUG ===");
        console.log("Event ID:", id);
        console.log("Received data:", req.body);

        const formattedDate = reformatDate(date);
        const quotaInt = parseInt(quota, 10) || 0;

        if (timeStart && timeEnd) {
            const [startHour, startMin] = timeStart.split(':').map(Number);
            const [endHour, endMin] = timeEnd.split(':').map(Number);

            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;

            if (endMinutes <= startMinutes) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Waktu selesai harus lebih lama dari waktu mulai'
                });
            }
        }

        const sql = `UPDATE events SET 
                        title = ?, 
                        type = ?, 
                        date = ?, 
                        time_start = ?, 
                        time_end = ?,
                        platform_type = ?, 
                        location_detail = ?, 
                        quota = ?, 
                        thumbnail_uri = ?
                     WHERE id = ?`;

        await db.query(sql, [
            title, type, formattedDate, timeStart, timeEnd,
            platformType, locationDetail, quotaInt, thumbnailUri,
            id
        ]);

        res.status(200).json({ status: 'success', message: 'Event berhasil diperbarui' });

    } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

exports.deleteEvent = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;

        console.log("=== DELETE EVENT DEBUG ===");
        console.log("Event ID:", id);

        await connection.beginTransaction();

        const [event] = await connection.query(
            'SELECT id, title FROM events WHERE id = ?',
            [id]
        );

        if (event.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                status: 'fail',
                message: 'Event tidak ditemukan'
            });
        }

        console.log(`📋 Deleting event: ${event[0].title} (ID: ${id})`);

        let deletedCount = {
            notifications: 0,
            registrations: 0,
            feedback: 0,
            documentations: 0
        };

        try {
            const [notifResult] = await connection.query(
                'DELETE FROM notifications WHERE related_id = ?',
                [id]
            );
            deletedCount.notifications = notifResult.affectedRows;
            console.log(`🔔 Deleted ${notifResult.affectedRows} notifications`);
        } catch (err) {
            console.log(`⚠️ Error deleting notifications: ${err.message}`);
        }

        try {
            const [regResult] = await connection.query(
                'DELETE FROM registrations WHERE event_id = ?',
                [id]
            );
            deletedCount.registrations = regResult.affectedRows;
            console.log(`📝 Deleted ${regResult.affectedRows} registrations`);
        } catch (err) {
            console.log(`⚠️ Error deleting registrations: ${err.message}`);
        }

        try {
            const [feedbackResult] = await connection.query(
                'DELETE FROM feedback WHERE event_id = ?',
                [id]
            );
            deletedCount.feedback = feedbackResult.affectedRows;
            console.log(`💬 Deleted ${feedbackResult.affectedRows} feedback`);
        } catch (err) {
            console.log(`⚠️ Error deleting feedback: ${err.message}`);
        }

        try {
            const [docResult] = await connection.query(
                'DELETE FROM documentations WHERE event_id = ?',
                [id]
            );
            deletedCount.documentations = docResult.affectedRows;
            console.log(`📄 Deleted ${docResult.affectedRows} documentations`);
        } catch (err) {
            console.log(`⚠️ Error deleting documentations: ${err.message}`);
        }

        const [eventResult] = await connection.query(
            'DELETE FROM events WHERE id = ?',
            [id]
        );
        console.log(`🗑️ Deleted event (affected rows: ${eventResult.affectedRows})`);

        await connection.commit();

        console.log(`✅ Event ${id} deleted successfully`);
        console.log(`📊 Summary: ${deletedCount.notifications} notifications, ${deletedCount.registrations} registrations, ${deletedCount.feedback} feedback, ${deletedCount.documentations} documentations`);

        res.status(200).json({
            status: 'success',
            message: 'Event berhasil dihapus'
        });

    } catch (error) {
        await connection.rollback();

        console.error("❌ Error deleting event:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        let errorMessage = 'Gagal menghapus event';
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            errorMessage = 'Event tidak dapat dihapus karena masih memiliki data terkait';
        } else if (error.message) {
            errorMessage = `Gagal menghapus event: ${error.message}`;
        }

        res.status(500).json({
            status: 'fail',
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
};