const db = require('../config/db');

// 1. Fungsi untuk menampilkan halaman admin.ejs
exports.renderAdminPage = (req, res) => {
    // Render file 'admin.ejs' dari dalam folder 'views'
    res.render('admin');
};

// 2. Fungsi API untuk mengambil event yang menunggu
exports.getPendingEvents = async (req, res) => {
    try {
        const sql = "SELECT * FROM events WHERE status = 'menunggu_persetujuan' ORDER BY created_at ASC";
        const [events] = await db.query(sql);
        res.status(200).json({ status: 'success', data: events });
    } catch (error) {
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

// 3. Fungsi API untuk menyetujui event
exports.approveEvent = async (req, res) => {
    try {
        const { id } = req.params; // Ambil ID dari URL
        
        const sql = "UPDATE events SET status = 'disetujui' WHERE id = ?";
        const [result] = await db.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'fail', message: 'Event tidak ditemukan' });
        }

        res.status(200).json({ status: 'success', message: 'Event disetujui' });
    } catch (error) {
        res.status(500).json({ status: 'fail', message: error.message });
    }
};