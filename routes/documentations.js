const express = require('express');
const router = express.Router();
const documentationController = require('../controllers/documentationController');

// Rute untuk membuat dokumentasi
// [POST] /api/documentations
router.post('/', documentationController.createDocumentation);

// Rute untuk mengambil dokumentasi berdasarkan event
// [GET] /api/documentations/event/:eventId
router.get('/event/:eventId', documentationController.getDocumentationByEvent);

// Rute untuk menghapus dokumentasi
// [DELETE] /api/documentations/:id
router.delete('/:id', documentationController.deleteDocumentation);

// Rute untuk mengupdate dokumentasi
// [PUT] /api/documentations/:id
router.put('/:id', documentationController.updateDocumentation);

module.exports = router;
