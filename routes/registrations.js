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

// ===== FITUR BARU: Upload KRS dan Lihat Peserta =====

// Rute untuk upload file KRS (untuk peserta)
// [POST] /api/registrations/upload-krs
router.post('/upload-krs', registrationController.uploadKRS);

// Rute untuk admin melihat daftar peserta per event
// [GET] /api/registrations/event/:eventId/participants
router.get('/event/:eventId/participants', registrationController.getParticipantsByEvent);

// Rute untuk download/view file KRS peserta
// [GET] /api/registrations/:id/krs
router.get('/:id/krs', registrationController.getKRSFile);

// =====================================================

// Rute untuk membatalkan pendaftaran
// [DELETE] /api/registrations/:id
router.delete('/:id', registrationController.cancelRegistration);

module.exports = router;
