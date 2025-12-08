const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Halaman web admin (EJS)
router.get('/', adminController.renderAdminPage);

// API Login
router.post('/login', adminController.adminLogin);

// API untuk mengambil events berdasarkan status
router.get('/events/all', adminController.getAllEventsAdmin);
router.get('/events/pending', adminController.getPendingEvents);
router.get('/events/approved', adminController.getApprovedEvents);
router.get('/events/rejected', adminController.getRejectedEvents);

// API untuk detail event
router.get('/events/:id', adminController.getEventById);

// API untuk approve/reject event
router.post('/events/:id/approve', adminController.approveEvent);
router.post('/events/:id/reject', adminController.rejectEvent);

module.exports = router;