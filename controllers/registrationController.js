const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// ===== KONFIGURASI MULTER UNTUK KRS =====
// Pastikan folder uploads/krs ada
const krsUploadDir = path.join(__dirname, '../uploads/krs');
if (!fs.existsSync(krsUploadDir)) {
    fs.mkdirSync(krsUploadDir, { recursive: true });
    console.log('Created KRS upload directory:', krsUploadDir);
}

// Storage configuration untuk KRS
const krsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, krsUploadDir);
    },
    filename: (req, file, cb) => {
        // Format: krs_timestamp_nim.pdf
        const timestamp = Date.now();
        const nim = req.body.nim || 'unknown';
        const filename = `krs_${timestamp}_${nim}.pdf`;
        cb(null, filename);
    }
});

// Filter hanya PDF
const krsFileFilter = (req, file, cb) => {
    console.log('KRS File filter - checking:', file.originalname, 'mimetype:', file.mimetype);

    const allowedMimeTypes = ['application/pdf'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) || ext === '.pdf') {
        cb(null, true);
    } else {
        cb(new Error('Hanya file PDF yang diizinkan untuk KRS'), false);
    }
};

// Multer upload configuration untuk KRS
const uploadKRSMiddleware = multer({
    storage: krsStorage,
    fileFilter: krsFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Max 5MB
    }
}).single('krs'); // field name: 'krs'
// ==========================================

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

        // VALIDASI BACKEND: Cek apakah event sudah dimulai
        const [eventData] = await db.query(
            'SELECT date, time_start, time_end FROM events WHERE id = ?',
            [event_id]
        );

        if (eventData.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Event tidak ditemukan'
            });
        }

        const event = eventData[0];

        // Gabungkan tanggal dan waktu
        const eventStartDateTime = new Date(`${event.date} ${event.time_start}`);
        const now = new Date();

        if (eventStartDateTime < now) {
            return res.status(400).json({
                status: 'fail',
                message: 'Event sudah dimulai, pendaftaran ditutup'
            });
        }

        // Cek apakah user sudah terdaftar di event ini (HANYA jika user_id ada/tidak null)
        if (user_id) {
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
                            e.id, e.title, e.type, e.date, e.time_start, e.time_end, 
                            e.platform_type, e.location_detail, e.quota, e.status,
                            e.thumbnail_uri, e.creator_id
                     FROM registrations r
                     LEFT JOIN events e ON r.event_id = e.id
                     WHERE r.user_id = ?
                     ORDER BY r.created_at DESC`;

        const [registrations] = await db.query(sql, [userId]);

        // Transform ke format event (sama seperti getMyCreatedEvents)
        const events = registrations.map(reg => ({
            id: reg.id,
            title: reg.title,
            type: reg.type,
            date: formatDateForResponse(reg.date),
            time_start: reg.time_start,
            time_end: reg.time_end,
            platform_type: reg.platform_type,
            location_detail: reg.location_detail,
            quota: reg.quota,
            status: reg.status,
            thumbnail_uri: reg.thumbnail_uri,
            creator_id: reg.creator_id
        }));

        console.log("Found registrations:", events.length);

        res.status(200).json({ status: 'success', data: events });
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

// ===== FITUR BARU: Upload KRS, Lihat Peserta, Download KRS =====

// Fungsi untuk upload file KRS
exports.uploadKRS = (req, res) => {
    console.log('=== UPLOAD KRS REQUEST RECEIVED ===');

    uploadKRSMiddleware(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err.message);

            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        status: 'fail',
                        message: 'Ukuran file terlalu besar. Maksimum 5MB'
                    });
                }
                return res.status(400).json({
                    status: 'fail',
                    message: `Error upload: ${err.message}`
                });
            }

            return res.status(500).json({
                status: 'fail',
                message: err.message || 'Error saat upload file KRS'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                status: 'fail',
                message: 'Tidak ada file yang diupload. Field name harus "krs"'
            });
        }

        // Buat URL untuk mengakses KRS
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const krsUrl = `${baseUrl}/uploads/krs/${req.file.filename}`;

        console.log('=== KRS FILE UPLOADED SUCCESSFULLY ===');
        console.log('Filename:', req.file.filename);
        console.log('Size:', req.file.size);
        console.log('KRS URL:', krsUrl);

        res.status(200).json({
            status: 'success',
            message: 'File KRS berhasil diupload',
            data: {
                filename: req.file.filename,
                url: krsUrl,
                size: req.file.size
            }
        });
    });
};

// Fungsi untuk admin melihat daftar peserta per event
exports.getParticipantsByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        console.log('=== GET PARTICIPANTS BY EVENT ===');
        console.log('Event ID:', eventId);

        if (!eventId) {
            return res.status(400).json({
                status: 'fail',
                message: 'Event ID diperlukan'
            });
        }

        // Query untuk mendapatkan semua peserta event
        const sql = `SELECT 
                        r.id as registration_id,
                        r.event_id,
                        r.user_id,
                        r.name,
                        r.nim,
                        r.fakultas,
                        r.jurusan,
                        r.email,
                        r.phone,
                        r.krs_uri,
                        r.created_at,
                        u.name as user_name
                     FROM registrations r
                     LEFT JOIN users u ON r.user_id = u.id
                     WHERE r.event_id = ?
                     ORDER BY r.created_at DESC`;

        const [participants] = await db.query(sql, [eventId]);

        console.log(`Found ${participants.length} participants`);

        res.status(200).json({
            status: 'success',
            data: participants
        });

    } catch (error) {
        console.error('Error getting participants:', error);
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

// Fungsi untuk download/view file KRS
exports.getKRSFile = async (req, res) => {
    try {
        const { id } = req.params; // registration ID

        console.log('=== GET KRS FILE ===');
        console.log('Registration ID:', id);

        // Get KRS URI from database
        const [registration] = await db.query(
            'SELECT krs_uri, name, nim FROM registrations WHERE id = ?',
            [id]
        );

        if (registration.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Pendaftaran tidak ditemukan'
            });
        }

        const krsUri = registration[0].krs_uri;

        if (!krsUri) {
            return res.status(404).json({
                status: 'fail',
                message: 'File KRS tidak tersedia'
            });
        }

        // Extract filename from URL (ambil bagian setelah /uploads/krs/)
        const filename = krsUri.split('/').pop();
        const filePath = path.join(krsUploadDir, filename);

        console.log('File path:', filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                status: 'fail',
                message: 'File KRS tidak ditemukan di server'
            });
        }

        // Serve the file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        console.log('KRS file sent successfully');

    } catch (error) {
        console.error('Error getting KRS file:', error);
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

// =============================================================
