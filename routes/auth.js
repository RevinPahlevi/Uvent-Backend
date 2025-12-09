const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rute untuk [POST] /api/auth/register
router.post('/register', authController.register); // <-- 4. PASTIKAN BARIS INI ADA

// Rute untuk [POST] /api/auth/login
router.post('/login', authController.login);

module.exports = router;