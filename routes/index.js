const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const eventRoutes = require('./events');
const adminRoutes = require('./admin');
const registrationRoutes = require('./registrations');
const feedbackRoutes = require('./feedback');
const documentationRoutes = require('./documentations');
const uploadRoutes = require('./upload');
const notificationRoutes = require('./notifications');

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/documentations', documentationRoutes);
router.use('/upload', uploadRoutes);
router.use('/notifications', notificationRoutes);

router.use('/admin', adminRoutes);

module.exports = router;