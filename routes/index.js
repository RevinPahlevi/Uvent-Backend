const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const eventRoutes = require('./events');
const adminRoutes = require('./admin');
const registrationRoutes = require('./registrations');
const feedbackRoutes = require('./feedback');
const documentationRoutes = require('./documentations');
const uploadRoutes = require('./upload'); // <-- IMPORT RUTE UPLOAD

// Rute API untuk mobile
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/documentations', documentationRoutes);
router.use('/upload', uploadRoutes); // <-- GUNAKAN RUTE UPLOAD

// Rute API dan Halaman Web untuk Admin
router.use('/admin', adminRoutes);

module.exports = router;