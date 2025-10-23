
const express = require('express');
const fileRoutes = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const Job = require('../schemas/Job');
const { translateText } = require('../services/googleCloudService');

const fileController = require('../controllers/fileController');

fileRoutes.get('/files', verifyToken, fileController.getRecentFiles);

fileRoutes.get('/files/:jobId', fileController.getJobDetails);

fileRoutes.delete('/files/:jobId', fileController.deleteJob);

fileRoutes.put('/files/:jobId/rename', fileController.renameJob);

fileRoutes.post('/files/:jobId/retry', fileController.retryJob);

fileRoutes.get('/files/:jobId/download/:format', fileController.downloadTranscript);

// Endpoint dịch thủ công
fileRoutes.post('/files/:jobId/translate', fileController.translateJob);

module.exports = fileRoutes;
