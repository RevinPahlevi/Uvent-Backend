const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');

// Rute untuk mendaftar ke event
// [POST] /api/registrations
router.post('/', registrationController.registerEvent);

// Rute untuk mengambil pendaftaran user berdasarkan NIM
// [GET] /api/registrations/my/:nim
router.get('/my/:nim', registrationController.getMyRegistrations);

// Rute untuk mengambil pendaftaran user berdasarkan USER ID
// [GET] /api/registrations/user/:userId
router.get('/user/:userId', registrationController.getMyRegistrationsByUserId);

// Rute untuk membatalkan pendaftaran
// [DELETE] /api/registrations/:id
router.delete('/:id', registrationController.cancelRegistration);

// Rute untuk mengupdate pendaftaran
// [PUT] /api/registrations/:id
router.put('/:id', registrationController.updateRegistration);

// Rute untuk mendapatkan peserta per event (untuk creator)
// [GET] /api/registrations/event/:eventId/participants
router.get('/event/:eventId/participants', registrationController.getParticipantsByEvent);

module.exports = router;
