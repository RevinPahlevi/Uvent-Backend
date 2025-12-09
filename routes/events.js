const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
// const authMiddleware = require('../middleware/authMiddleware');

// Rute untuk [POST] /api/events (Membuat Event Baru)
router.post('/', eventController.createEvent);

// Rute untuk [GET] /api/events (Mengambil Semua Event YANG DISETUJUI)
router.get('/', eventController.getAllEvents);

// --- RUTE API BARU ---
// [GET] /api/events/my-events/:userId
router.get('/my-events/:userId', eventController.getMyCreatedEvents);

// [PUT] /api/events/:id (Update Event)
router.put('/:id', eventController.updateEvent);

// [DELETE] /api/events/:id (Delete Event)
router.delete('/:id', eventController.deleteEvent);

module.exports = router;