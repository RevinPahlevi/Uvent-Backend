const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const eventRoutes = require('./events');
const adminRoutes = require('./admin');
const registrationRoutes = require('./registrations');
const feedbackRoutes = require('./feedback');
const documentationRoutes = require('./documentations'); // <-- IMPORT RUTE DOKUMENTASI

// Rute API untuk mobile
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/documentations', documentationRoutes); // <-- GUNAKAN RUTE DOKUMENTASI

// Rute API dan Halaman Web untuk Admin
router.use('/admin', adminRoutes);

module.exports = router;