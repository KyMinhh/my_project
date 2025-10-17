const express = require('express');
const router = express.Router();
const subtitleController = require('../controllers/subtitleController');
const { verifyToken } = require('../middleware/verifyToken');

router.post('/generate', verifyToken, subtitleController.generateSubtitles);
router.post('/generate-multi', verifyToken, subtitleController.generateMultiLanguageSubtitles);
router.post('/burn', verifyToken, subtitleController.burnSubtitles);
router.post('/burn-direct', verifyToken, subtitleController.burnSubtitlesDirect);
router.post('/embed', verifyToken, subtitleController.embedSubtitles);
router.get('/video-info', verifyToken, subtitleController.getVideoInfo);
router.get('/download', verifyToken, subtitleController.downloadSubtitle);

module.exports = router;
