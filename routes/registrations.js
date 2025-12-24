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

// Rute untuk mendapatkan full registration data untuk edit
// [GET] /api/registrations/event/:eventId/user/:userId
router.get('/event/:eventId/user/:userId', registrationController.getRegistrationDataByEventAndUser);

// Rute untuk mendapatkan registration ID berdasarkan eventId dan userId  
// [GET] /api/registrations/event/:eventId/user/:userId/id
router.get('/event/:eventId/user/:userId/id', registrationController.getRegistrationIdByEventAndUser);

// ===== FITUR BARU: Upload KRS dan Lihat Peserta =====

// Rute untuk upload file KRS (untuk peserta)
// [POST] /api/registrations/upload-krs
router.post('/upload-krs', registrationController.uploadKRS);

// Rute untuk admin melihat daftar peserta per event
// [GET] /api/registrations/event/:eventId/participants
router.get('/event/:eventId/participants', registrationController.getParticipantsByEvent);

// Rute untuk mendapatkan jumlah pendaftar per event (untuk validasi kuota)
// [GET] /api/registrations/event/:eventId/count
router.get('/event/:eventId/count', registrationController.getRegistrationCount);

// Rute untuk download/view file KRS peserta
// [GET] /api/registrations/:id/krs
router.get('/:id/krs', registrationController.getKRSFile);

// =====================================================

// Rute untuk membatalkan pendaftaran
// [DELETE] /api/registrations/:id
router.delete('/:id', registrationController.cancelRegistration);

// Rute untuk mengupdate pendaftaran
// [PUT] /api/registrations/:id
router.put('/:id', registrationController.updateRegistration);


// Rute untuk check NIM availability saat edit (dari loly)
// [GET] /api/registrations/check-nim
const nimCheckController = require('../controllers/nimCheckController');
router.get('/check-nim', nimCheckController.checkNimForEdit);

// Rute untuk mengecek apakah NIM sudah terdaftar di event (dari main)
// [GET] /api/registrations/check-nim/:eventId/:nim
router.get('/check-nim/:eventId/:nim', registrationController.checkNimExists);


module.exports = router;
