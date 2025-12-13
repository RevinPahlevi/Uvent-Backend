const db = require('../config/db');

// Fungsi untuk konversi format tanggal dari DD/MM/YYYY menjadi YYYY-MM-DD (format MySQL)
function reformatDate(dateStr) {
    if (!dateStr) return null;
    try {
        // Cek jika sudah format YYYY-MM-DD
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }
        // Konversi dari DD/MM/YYYY ke YYYY-MM-DD
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

// Fungsi untuk format tanggal dari MySQL Date object ke string YYYY-MM-DD
// Ini memperbaiki masalah timezone yang menyebabkan tanggal mundur 1 hari
function formatDateForResponse(dateValue) {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
        // Gunakan getUTC untuk menghindari konversi timezone
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateValue;
}

// Fungsi untuk memproses events dan memperbaiki format tanggal
function processEventsDate(events) {
    return events.map(event => ({
        ...event,
        date: formatDateForResponse(event.date)
    }));
}

// (Fungsi createEvent sudah benar dari langkah sebelumnya)
exports.createEvent = async (req, res) => {
    try {
        const {
            title, type, date, timeStart, timeEnd,
            platformType, locationDetail, quota, thumbnailUri,
            creator_id
        } = req.body;

        // DEBUG: Log semua data yang diterima
        console.log("=== CREATE EVENT DEBUG ===");
        console.log("Received body:", JSON.stringify(req.body, null, 2));
        console.log("Received date:", date);
        console.log("Received timeStart:", timeStart);
        console.log("Received timeEnd:", timeEnd);
        console.log("Received thumbnailUri:", thumbnailUri);
        console.log("Type of thumbnailUri:", typeof thumbnailUri);

        const formattedDate = reformatDate(date);
        console.log("Formatted date for DB:", formattedDate);

        const quotaInt = parseInt(quota, 10) || 0;
        const creatorIdInt = parseInt(creator_id, 10) || null;

        // Event baru menunggu persetujuan admin (status = 'menunggu')
        const sql = `INSERT INTO events 
                        (title, type, date, time_start, time_end, platform_type, location_detail, quota, thumbnail_uri, creator_id, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', NOW())`;

        // DEBUG: Log nilai yang akan dimasukkan ke DB
        console.log("Values for DB insert:", {
            title, type, formattedDate, timeStart, timeEnd,
            platformType, locationDetail, quotaInt, thumbnailUri,
            creatorIdInt
        });

        await db.query(sql, [
            title, type, formattedDate, timeStart, timeEnd,
            platformType, locationDetail, quotaInt, thumbnailUri,
            creatorIdInt
        ]);

        console.log("Event created successfully with thumbnailUri:", thumbnailUri);
        res.status(201).json({ status: 'success', message: 'Event berhasil dibuat' });

    } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// (Fungsi getAllEvents sudah benar dari langkah sebelumnya)
exports.getAllEvents = async (req, res) => {
    try {
        const sql = "SELECT * FROM events WHERE status = 'disetujui' ORDER BY date DESC";
        const [events] = await db.query(sql);

        // Proses tanggal untuk menghindari masalah timezone
        const processedEvents = processEventsDate(events);

        res.status(200).json({ status: 'success', data: processedEvents });
    } catch (error) {
        console.error("Error getting events:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// --- FUNGSI API BARU ---
exports.getMyCreatedEvents = async (req, res) => {
    try {
        const { userId } = req.params; // Ambil ID user dari URL

        if (!userId) {
            return res.status(400).json({ status: 'fail', message: 'User ID diperlukan' });
        }

        // Ambil SEMUA event (termasuk 'menunggu') yang creator_id-nya cocok
        const sql = "SELECT * FROM events WHERE creator_id = ? ORDER BY date DESC";
        const [events] = await db.query(sql, [userId]);

        // Proses tanggal untuk menghindari masalah timezone
        const processedEvents = processEventsDate(events);

        res.status(200).json({ status: 'success', data: processedEvents });
    } catch (error) {
        console.error("Error getting my events:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// --- FUNGSI UPDATE EVENT ---
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

// --- FUNGSI DELETE EVENT ---
exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { creator_id } = req.body;

        console.log("=== DELETE EVENT DEBUG ===");
        console.log("Event ID:", id);
        console.log("Creator ID:", creator_id);

        // Cek apakah event ada dan milik creator yang sama
        const [event] = await db.query(
            'SELECT creator_id FROM events WHERE id = ?',
            [id]
        );

        if (event.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Event tidak ditemukan' });
        }

        // Validasi ownership (optional - bisa dinonaktifkan jika tidak diperlukan)
        if (creator_id && event[0].creator_id !== parseInt(creator_id)) {
            return res.status(403).json({ status: 'fail', message: 'Anda tidak memiliki izin untuk menghapus event ini' });
        }

        // Hapus registrations terkait terlebih dahulu
        await db.query('DELETE FROM registrations WHERE event_id = ?', [id]);

        // Hapus feedbacks terkait
        await db.query('DELETE FROM feedbacks WHERE event_id = ?', [id]);

        // Hapus documentations terkait
        await db.query('DELETE FROM documentations WHERE event_id = ?', [id]);

        // Hapus event
        const sql = 'DELETE FROM events WHERE id = ?';
        await db.query(sql, [id]);

        res.status(200).json({ status: 'success', message: 'Event berhasil dihapus' });

    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};