const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Rute untuk menampilkan halaman web (EJS)
// Akan diakses di /api/admin
router.get('/', adminController.renderAdminPage);

// Rute API untuk mengambil data event (dipanggil oleh JavaScript di EJS)
// Akan diakses di /api/admin/pending
router.get('/pending', adminController.getPendingEvents);

// Rute API untuk menyetujui event
// Akan diakses di /api/admin/approve/1 (contoh)
router.post('/approve/:id', adminController.approveEvent);

module.exports = router;