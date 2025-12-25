const db = require('../config/db');

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

        if (!event_id || !user_id || !rating) {
            console.log("Validation failed: Missing required fields");
            return res.status(400).json({
                status: 'fail',
                message: 'event_id, user_id, dan rating wajib diisi'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'fail',
                message: 'Rating harus antara 1-5'
            });
        }

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

        const [eventData] = await db.query(
            'SELECT creator_id FROM events WHERE id = ?',
            [event_id]
        );

        if (eventData.length > 0 && eventData[0].creator_id === parseInt(user_id)) {
            return res.status(403).json({
                status: 'fail',
                message: 'Pembuat event tidak dapat memberikan ulasan untuk event sendiri'
            });
        }

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

exports.deleteFeedback = async (req, res) => {
    try {
        const { id, userId } = req.params;

        console.log("=== DELETE FEEDBACK DEBUG ===");
        console.log("Feedback ID:", id);
        console.log("User ID:", userId);

        const [feedback] = await db.query(
            'SELECT user_id FROM feedbacks WHERE id = ?',
            [id]
        );

        if (feedback.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Feedback tidak ditemukan' });
        }

        if (feedback[0].user_id !== parseInt(userId)) {
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

exports.updateFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, rating, review, photo_uri } = req.body;

        console.log("=== UPDATE FEEDBACK DEBUG ===");
        console.log("Feedback ID:", id);
        console.log("User ID:", user_id);
        console.log("Rating:", rating);
        console.log("Review:", review);
        console.log("Photo URI:", photo_uri);

        if (!user_id || !rating) {
            return res.status(400).json({
                status: 'fail',
                message: 'user_id dan rating wajib diisi'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'fail',
                message: 'Rating harus antara 1-5'
            });
        }

        const [feedback] = await db.query(
            'SELECT user_id FROM feedbacks WHERE id = ?',
            [id]
        );

        if (feedback.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Feedback tidak ditemukan'
            });
        }

        if (feedback[0].user_id !== parseInt(user_id)) {
            return res.status(403).json({
                status: 'fail',
                message: 'Anda tidak memiliki izin untuk mengedit ulasan ini'
            });
        }

        const sql = `UPDATE feedbacks 
                     SET rating = ?, review = ?, photo_uri = ?
                     WHERE id = ?`;

        await db.query(sql, [rating, review || null, photo_uri || null, id]);

        res.status(200).json({
            status: 'success',
            message: 'Ulasan berhasil diperbarui'
        });

    } catch (error) {
        console.error("Error updating feedback:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};
