const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const eventRoutes = require('./events');
const adminRoutes = require('./admin'); // <-- 1. IMPORT RUTE ADMIN

// Rute API untuk mobile
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);

// Rute API dan Halaman Web untuk Admin
router.use('/admin', adminRoutes); // <-- 2. GUNAKAN RUTE ADMIN

module.exports = router;