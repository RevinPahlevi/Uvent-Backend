const db = require('../config/db');

// Fungsi untuk format tanggal dari MySQL Date object
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

// Fungsi untuk mendaftar ke event
exports.registerEvent = async (req, res) => {
    try {
        const { event_id, user_id, name, nim, fakultas, jurusan, email, phone, krs_uri } = req.body;

        console.log("=== REGISTER EVENT DEBUG ===");
        console.log("event_id:", event_id);
        console.log("user_id:", user_id);
        console.log("name:", name);

        // Validasi input
        if (!event_id || !name || !nim || !fakultas || !jurusan || !email || !phone) {
            return res.status(400).json({
                status: 'fail',
                message: 'Semua field wajib diisi'
            });
        }

        // Cek apakah user sudah terdaftar di event ini (berdasarkan user_id dan event_id)
        const [existing] = await db.query(
            'SELECT id FROM registrations WHERE event_id = ? AND (user_id = ? OR nim = ?)',
            [event_id, user_id, nim]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                status: 'fail',
                message: 'Anda sudah terdaftar di event ini'
            });
        }

        // Insert ke database dengan user_id
        const sql = `INSERT INTO registrations 
                        (event_id, user_id, name, nim, fakultas, jurusan, email, phone, krs_uri)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.query(sql, [
            event_id, user_id || null, name, nim, fakultas, jurusan, email, phone, krs_uri || null
        ]);

        res.status(201).json({
            status: 'success',
            message: 'Berhasil mendaftar ke event',
            data: {
                registration_id: result.insertId
            }
        });

    } catch (error) {
        console.error("Error registering event:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// Fungsi untuk mengambil daftar pendaftaran user berdasarkan NIM
exports.getMyRegistrations = async (req, res) => {
    try {
        const { nim } = req.params;

        if (!nim) {
            return res.status(400).json({ status: 'fail', message: 'NIM diperlukan' });
        }

        const sql = `SELECT r.*, e.title as event_title, e.date, e.time_start, e.time_end, 
                            e.platform_type, e.location_detail, e.thumbnail_uri
                     FROM registrations r
                     LEFT JOIN events e ON r.event_id = e.id
                     WHERE r.nim = ?
                     ORDER BY r.created_at DESC`;

        const [registrations] = await db.query(sql, [nim]);

        res.status(200).json({ status: 'success', data: registrations });
    } catch (error) {
        console.error("Error getting registrations:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// --- FUNGSI BARU: Mengambil event yang diikuti berdasarkan user_id ---
exports.getMyRegistrationsByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ status: 'fail', message: 'User ID diperlukan' });
        }

        console.log("=== GET MY REGISTRATIONS BY USER ID ===");
        console.log("userId:", userId);

        const sql = `SELECT r.id as registration_id, r.event_id, r.name, r.nim, r.fakultas, 
                            r.jurusan, r.email, r.phone, r.krs_uri, r.created_at,
                            e.title, e.type, e.date, e.time_start, e.time_end, 
                            e.platform_type, e.location_detail, e.quota, e.status,
                            e.thumbnail_uri, e.creator_id
                     FROM registrations r
                     LEFT JOIN events e ON r.event_id = e.id
                     WHERE r.user_id = ?
                     ORDER BY r.created_at DESC`;

        const [registrations] = await db.query(sql, [userId]);

        // Format tanggal
        const processedRegistrations = registrations.map(reg => ({
            ...reg,
            date: formatDateForResponse(reg.date)
        }));

        console.log("Found registrations:", processedRegistrations.length);

        res.status(200).json({ status: 'success', data: processedRegistrations });
    } catch (error) {
        console.error("Error getting registrations by user:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// Fungsi untuk membatalkan pendaftaran
exports.cancelRegistration = async (req, res) => {
    try {
        const { id } = req.params;

        const sql = 'DELETE FROM registrations WHERE id = ?';
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'fail', message: 'Pendaftaran tidak ditemukan' });
        }

        res.status(200).json({ status: 'success', message: 'Pendaftaran berhasil dibatalkan' });
    } catch (error) {
        console.error("Error canceling registration:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};
