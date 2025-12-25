const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.post('/', eventController.createEvent);

router.get('/', eventController.getAllEvents);

router.get('/my-events/:userId', eventController.getMyCreatedEvents);

router.put('/:id', eventController.updateEvent);

router.delete('/:id', eventController.deleteEvent);

module.exports = router;