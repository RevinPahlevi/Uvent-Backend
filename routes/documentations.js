const express = require('express');
const router = express.Router();
const documentationController = require('../controllers/documentationController');

router.post('/', documentationController.createDocumentation);

router.get('/event/:eventId', documentationController.getDocumentationByEvent);

router.put('/:id', documentationController.updateDocumentation);

router.delete('/:id', documentationController.deleteDocumentation);

module.exports = router;
