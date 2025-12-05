const db = require('../config/db');

// (Fungsi reformatDate tetap sama)
function reformatDate(dateStr) { /* ... */ }

// (Fungsi createEvent sudah benar dari langkah sebelumnya)
exports.createEvent = async (req, res) => {
    try {
        const { 
            title, type, date, timeStart, timeEnd, 
            platformType, locationDetail, quota, thumbnailUri,
            creator_id 
        } = req.body; 

        const formattedDate = reformatDate(date);
        const quotaInt = parseInt(quota, 10) || 0; 
        const creatorIdInt = parseInt(creator_id, 10) || null; 

        const sql = `INSERT INTO events 
                        (title, type, date, time_start, time_end, platform_type, location_detail, quota, thumbnail_uri, creator_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; 
        
        await db.query(sql, [
            title, type, formattedDate, timeStart, timeEnd, 
            platformType, locationDetail, quotaInt, thumbnailUri,
            creatorIdInt 
        ]);
        
        res.status(201).json({ status: 'success', message: 'Event berhasil dibuat dan sedang ditinjau admin' });

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
        res.status(200).json({ status: 'success', data: events });
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
        
        res.status(200).json({ status: 'success', data: events });
    } catch (error) {
        console.error("Error getting my events:", error);
        res.status(500).json({ status: 'fail', message: error.message });
    }
};