const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');

router.post('/', registrationController.registerEvent);

router.get('/my/:nim', registrationController.getMyRegistrations);

router.get('/user/:userId', registrationController.getMyRegistrationsByUserId);

router.get('/event/:eventId/user/:userId', registrationController.getRegistrationDataByEventAndUser);

router.get('/event/:eventId/user/:userId/id', registrationController.getRegistrationIdByEventAndUser);

router.post('/upload-krs', registrationController.uploadKRS);

router.get('/event/:eventId/participants', registrationController.getParticipantsByEvent);

router.get('/event/:eventId/count', registrationController.getRegistrationCount);

router.get('/:id/krs', registrationController.getKRSFile);

router.delete('/:id', registrationController.cancelRegistration);

router.put('/:id', registrationController.updateRegistration);

const nimCheckController = require('../controllers/nimCheckController');
router.get('/check-nim', nimCheckController.checkNimForEdit);

router.get('/check-nim/:eventId/:nim', registrationController.checkNimExists);

module.exports = router;
