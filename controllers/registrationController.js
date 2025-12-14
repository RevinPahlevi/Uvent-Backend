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

        // Cek apakah user sudah terdaftar di event ini (berdasarkan user_id)
        const [existingUser] = await db.query(
            'SELECT id FROM registrations WHERE event_id = ? AND user_id = ?',
            [event_id, user_id]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                status: 'fail',
                message: 'Anda sudah terdaftar di event ini'
            });
        }

        // Cek apakah NIM sudah terdaftar di event ini (NIM harus unik per event)
        const [existingNim] = await db.query(
            'SELECT id FROM registrations WHERE event_id = ? AND nim = ?',
            [event_id, nim]
        );

        if (existingNim.length > 0) {
            return res.status(409).json({
                status: 'fail',
                message: 'NIM sudah terdaftar di event ini. Setiap NIM hanya boleh mendaftar sekali per event.'
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

// Fungsi untuk mengupdate pendaftaran
exports.updateRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, name, nim, fakultas, jurusan, email, phone, krs_uri } = req.body;

        console.log("=== UPDATE REGISTRATION DEBUG ===");
        console.log("Registration ID:", id);
        console.log("User ID:", user_id);

        // Cek apakah pendaftaran ada
        const [reg] = await db.query(
            'SELECT user_id FROM registrations WHERE id = ?',
            [id]
        );

        if (reg.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Pendaftaran tidak ditemukan' });
        }

        // Validasi ownership jika user_id ada
        if (user_id && reg[0].user_id && reg[0].user_id !== parseInt(user_id)) {
            return res.status(403).json({ status: 'fail', message: 'Anda tidak memiliki izin untuk mengubah pendaftaran ini' });
        }

        const sql = `UPDATE registrations SET 
                        name = COALESCE(?, name),
                        nim = COALESCE(?, nim),
                        fakultas = COALESCE(?, fakultas),
                        jurusan = COALESCE(?, jurusan),
                        email = COALESCE(?, email),
                        phone = COALESCE(?, phone),
                        krs_uri = ?
                     WHERE id = ?`;

        await db.query(sql, [name, nim, fakultas, jurusan, email, phone, krs_uri || null, id]);

        res.status(200).json({ status: 'success', message: 'Pendaftaran berhasil diperbarui' });
    } catch (error) {
        console.error("Error updating registration:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// Fungsi untuk mendapatkan peserta yang terdaftar di suatu event (untuk creator)
exports.getParticipantsByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        console.log("=== GET PARTICIPANTS BY EVENT ===");
        console.log("Event ID:", eventId);

        const sql = `SELECT r.id as registration_id, r.event_id, r.user_id, r.name, r.nim, 
                            r.fakultas, r.jurusan, r.email, r.phone, r.krs_uri, r.created_at,
                            u.name as user_name
                     FROM registrations r
                     LEFT JOIN users u ON r.user_id = u.id
                     WHERE r.event_id = ?
                     ORDER BY r.created_at DESC`;

        const [participants] = await db.query(sql, [eventId]);

        console.log("Found participants:", participants.length);

        res.status(200).json({ status: 'success', data: participants });
    } catch (error) {
        console.error("Error getting participants:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};
