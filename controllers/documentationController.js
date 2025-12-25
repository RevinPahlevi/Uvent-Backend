const db = require('../config/db');

exports.createDocumentation = async (req, res) => {
    try {
        console.log("=== CREATE DOCUMENTATION DEBUG ===");
        console.log("Request body:", req.body);

        const { event_id, user_id, description, photo_uri } = req.body;

        if (!event_id || !user_id) {
            return res.status(400).json({
                status: 'fail',
                message: 'event_id dan user_id wajib diisi'
            });
        }

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

exports.getDocumentationByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!eventId) {
            return res.status(400).json({ status: 'fail', message: 'Event ID diperlukan' });
        }

        const sql = `SELECT d.*, u.name as user_name,
                            CONVERT_TZ(d.created_at, '+00:00', '+07:00') as created_at_wib
                     FROM documentations d
                     LEFT JOIN users u ON d.user_id = u.id
                     WHERE d.event_id = ?
                     ORDER BY d.created_at DESC`;

        const [docs] = await db.query(sql, [eventId]);

        const docsWithLocalTime = docs.map(doc => ({
            ...doc,
            created_at: doc.created_at_wib || doc.created_at
        }));

        res.status(200).json({ status: 'success', data: docsWithLocalTime });
    } catch (error) {
        console.error("Error getting documentations:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

exports.deleteDocumentation = async (req, res) => {
    try {
        const { id } = req.params;

        const [doc] = await db.query(
            'SELECT id FROM documentations WHERE id = ?',
            [id]
        );

        if (doc.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Dokumentasi tidak ditemukan' });
        }

        const sql = 'DELETE FROM documentations WHERE id = ?';
        await db.query(sql, [id]);

        res.status(200).json({ status: 'success', message: 'Dokumentasi berhasil dihapus' });
    } catch (error) {
        console.error("Error deleting documentation:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

exports.updateDocumentation = async (req, res) => {
    try {
        const { id } = req.params;
        const { description } = req.body;

        console.log("=== UPDATE DOCUMENTATION DEBUG ===");
        console.log("Doc ID:", id);
        console.log("New description:", description);

        const [doc] = await db.query(
            'SELECT id FROM documentations WHERE id = ?',
            [id]
        );

        if (doc.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Dokumentasi tidak ditemukan' });
        }

        const sql = 'UPDATE documentations SET description = ? WHERE id = ?';
        await db.query(sql, [description, id]);

        res.status(200).json({
            status: 'success',
            message: 'Dokumentasi berhasil diperbarui'
        });
    } catch (error) {
        console.error("Error updating documentation:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};
