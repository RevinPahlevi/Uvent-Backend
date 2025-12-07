const db = require('../config/db');

// Fungsi untuk membuat dokumentasi
exports.createDocumentation = async (req, res) => {
    try {
        console.log("=== CREATE DOCUMENTATION DEBUG ===");
        console.log("Request body:", req.body);

        const { event_id, user_id, description, photo_uri } = req.body;

        // Validasi input
        if (!event_id || !user_id) {
            return res.status(400).json({
                status: 'fail',
                message: 'event_id dan user_id wajib diisi'
            });
        }

        // Insert ke database
        const sql = `INSERT INTO documentations 
                        (event_id, user_id, description, photo_uri)
                     VALUES (?, ?, ?, ?)`;

        const [result] = await db.query(sql, [
            event_id, user_id, description || null, photo_uri || null
        ]);

        res.status(201).json({
            status: 'success',
            message: 'Dokumentasi berhasil ditambahkan',
            data: {
                documentation_id: result.insertId
            }
        });

    } catch (error) {
        console.error("Error creating documentation:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// Fungsi untuk mengambil semua dokumentasi untuk sebuah event
exports.getDocumentationByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!eventId) {
            return res.status(400).json({ status: 'fail', message: 'Event ID diperlukan' });
        }

        const sql = `SELECT d.*, u.name as user_name 
                     FROM documentations d
                     LEFT JOIN users u ON d.user_id = u.id
                     WHERE d.event_id = ?
                     ORDER BY d.created_at DESC`;

        const [docs] = await db.query(sql, [eventId]);

        res.status(200).json({ status: 'success', data: docs });
    } catch (error) {
        console.error("Error getting documentations:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// Fungsi untuk menghapus dokumentasi
exports.deleteDocumentation = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        // Cek apakah dokumentasi milik user yang sama
        const [doc] = await db.query(
            'SELECT user_id FROM documentations WHERE id = ?',
            [id]
        );

        if (doc.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Dokumentasi tidak ditemukan' });
        }

        if (doc[0].user_id !== parseInt(user_id)) {
            return res.status(403).json({ status: 'fail', message: 'Anda tidak memiliki izin untuk menghapus dokumentasi ini' });
        }

        const sql = 'DELETE FROM documentations WHERE id = ?';
        await db.query(sql, [id]);

        res.status(200).json({ status: 'success', message: 'Dokumentasi berhasil dihapus' });
    } catch (error) {
        console.error("Error deleting documentation:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};
