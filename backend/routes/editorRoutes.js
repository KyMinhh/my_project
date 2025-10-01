
const express = require('express');
const editorController = require('../controllers/editorController');
const summaryController = require('../controllers/summaryController');

const router = express.Router();


router.post('/find-timestamp', editorController.findTimestamp);


router.post('/extract-video', editorController.extractVideoSegment);

router.post('/extract-multiple-segments', editorController.extractMultipleVideoSegments);

router.post('/generate-summary', summaryController.generateSummary);

module.exports = router;