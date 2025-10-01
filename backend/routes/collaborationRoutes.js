const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');
const commentController = require('../controllers/commentController');
const { verifyToken } = require('../middleware/verifyToken');

// Collaboration management routes
router.post('/transcripts/:transcriptId/collaboration', verifyToken, collaborationController.initializeCollaboration);

// Share link management routes
router.post('/transcripts/:transcriptId/share', verifyToken, collaborationController.createShareLink);
router.get('/transcripts/:transcriptId/share', verifyToken, collaborationController.getShareLinks);
router.delete('/share/:linkId', verifyToken, collaborationController.revokeShareLink);

// Public route for accessing shared transcripts (no auth required)
router.post('/shared/:linkId', collaborationController.accessSharedTranscript);

// Comment management routes
router.get('/transcripts/:transcriptId/comments', verifyToken, commentController.getComments);
router.post('/transcripts/:transcriptId/comments', verifyToken, commentController.createComment);
router.put('/comments/:commentId', verifyToken, commentController.updateComment);
router.delete('/comments/:commentId', verifyToken, commentController.deleteComment);
router.patch('/comments/:commentId/resolve', verifyToken, commentController.resolveComment);

module.exports = router;
