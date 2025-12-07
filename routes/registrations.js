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

module.exports = router;
