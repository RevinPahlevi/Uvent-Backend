const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/', adminController.renderAdminPage);

router.post('/login', adminController.adminLogin);

router.get('/events/all', adminController.getAllEventsAdmin);
router.get('/events/pending', adminController.getPendingEvents);
router.get('/events/approved', adminController.getApprovedEvents);
router.get('/events/rejected', adminController.getRejectedEvents);

router.get('/events/:id', adminController.getEventById);

router.post('/events/:id/approve', adminController.approveEvent);
router.post('/events/:id/reject', adminController.rejectEvent);

module.exports = router;