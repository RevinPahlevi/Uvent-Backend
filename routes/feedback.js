const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

// Rute untuk membuat feedback
// [POST] /api/feedback
router.post('/', feedbackController.createFeedback);

// Rute untuk mengambil feedback berdasarkan event
// [GET] /api/feedback/event/:eventId
router.get('/event/:eventId', feedbackController.getFeedbackByEvent);

// Rute untuk mengupdate feedback
// [PUT] /api/feedback/:id
router.put('/:id', feedbackController.updateFeedback);

// Rute untuk menghapus feedback
// [DELETE] /api/feedback/:id/:userId
router.delete('/:id/:userId', feedbackController.deleteFeedback);

module.exports = router;

