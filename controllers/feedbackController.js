const db = require('../config/db');

// Fungsi untuk membuat feedback/ulasan
exports.createFeedback = async (req, res) => {
    try {
        console.log("=== CREATE FEEDBACK DEBUG ===");
        console.log("Request body:", req.body);

        const { event_id, user_id, rating, review, photo_uri } = req.body;

        console.log("Parsed values:");
        console.log("event_id:", event_id);
        console.log("user_id:", user_id);
        console.log("rating:", rating);
        console.log("review:", review);

        // Validasi input
        if (!event_id || !user_id || !rating) {
            console.log("Validation failed: Missing required fields");
            return res.status(400).json({
                status: 'fail',
                message: 'event_id, user_id, dan rating wajib diisi'
            });
        }

        // Validasi rating (1-5)
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'fail',
                message: 'Rating harus antara 1-5'
            });
        }

        // Cek apakah user sudah memberikan feedback untuk event ini
        const [existing] = await db.query(
            'SELECT id FROM feedbacks WHERE event_id = ? AND user_id = ?',
            [event_id, user_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                status: 'fail',
                message: 'Anda sudah memberikan ulasan untuk event ini'
            });
        }

        // Insert ke database
        const sql = `INSERT INTO feedbacks 
                        (event_id, user_id, rating, review, photo_uri)
                     VALUES (?, ?, ?, ?, ?)`;

        const [result] = await db.query(sql, [
            event_id, user_id, rating, review || null, photo_uri || null
        ]);

        res.status(201).json({
            status: 'success',
            message: 'Ulasan berhasil ditambahkan',
            data: {
                feedback_id: result.insertId
            }
        });

    } catch (error) {
        console.error("Error creating feedback:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// Fungsi untuk mengambil semua feedback untuk sebuah event
exports.getFeedbackByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!eventId) {
            return res.status(400).json({ status: 'fail', message: 'Event ID diperlukan' });
        }

        const sql = `SELECT f.*, u.name as user_name 
                     FROM feedbacks f
                     LEFT JOIN users u ON f.user_id = u.id
                     WHERE f.event_id = ?
                     ORDER BY f.created_at DESC`;

        const [feedbacks] = await db.query(sql, [eventId]);

        res.status(200).json({ status: 'success', data: feedbacks });
    } catch (error) {
        console.error("Error getting feedbacks:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// Fungsi untuk menghapus feedback
exports.deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        // Cek apakah feedback milik user yang sama
        const [feedback] = await db.query(
            'SELECT user_id FROM feedbacks WHERE id = ?',
            [id]
        );

        if (feedback.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Feedback tidak ditemukan' });
        }

        if (feedback[0].user_id !== parseInt(user_id)) {
            return res.status(403).json({ status: 'fail', message: 'Anda tidak memiliki izin untuk menghapus ulasan ini' });
        }

        const sql = 'DELETE FROM feedbacks WHERE id = ?';
        await db.query(sql, [id]);

        res.status(200).json({ status: 'success', message: 'Ulasan berhasil dihapus' });
    } catch (error) {
        console.error("Error deleting feedback:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// Fungsi untuk mengupdate feedback
exports.updateFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, rating, review, photo_uri } = req.body;

        console.log("=== UPDATE FEEDBACK DEBUG ===");
        console.log("Feedback ID:", id);
        console.log("User ID:", user_id);

        // Cek apakah feedback ada dan milik user yang sama
        const [feedback] = await db.query(
            'SELECT user_id FROM feedbacks WHERE id = ?',
            [id]
        );

        if (feedback.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Feedback tidak ditemukan' });
        }

        if (feedback[0].user_id !== parseInt(user_id)) {
            return res.status(403).json({ status: 'fail', message: 'Anda tidak memiliki izin untuk mengubah ulasan ini' });
        }

        // Validasi rating
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ status: 'fail', message: 'Rating harus antara 1-5' });
        }

        const sql = `UPDATE feedbacks SET 
                        rating = COALESCE(?, rating),
                        review = COALESCE(?, review),
                        photo_uri = ?
                     WHERE id = ?`;

        await db.query(sql, [rating, review, photo_uri || null, id]);

        res.status(200).json({ status: 'success', message: 'Ulasan berhasil diperbarui' });
    } catch (error) {
        console.error("Error updating feedback:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};
