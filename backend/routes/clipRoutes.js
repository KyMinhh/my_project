const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const clipController = require('../controllers/clipController');

/**
 * POST /api/clips/generate/:jobId
 * Generate smart viral clips from a transcribed video
 * Auth required
 */
router.post('/generate/:jobId', verifyToken, clipController.generateSmartClips);

/**
 * GET /api/clips/:jobId
 * Get all clips for a specific job
 * Auth required
 */
router.get('/:jobId', verifyToken, clipController.getClipsByJob);

/**
 * GET /api/clips/single/:clipId
 * Get single clip details
 * Auth required
 */
router.get('/single/:clipId', verifyToken, clipController.getClipById);

/**
 * PUT /api/clips/:clipId
 * Update clip metadata (title, description, hashtags, etc)
 * Auth required
 */
router.put('/:clipId', verifyToken, clipController.updateClip);

/**
 * DELETE /api/clips/:clipId
 * Delete clip (soft delete)
 * Auth required
 */
router.delete('/:clipId', verifyToken, clipController.deleteClip);

/**
 * POST /api/clips/:clipId/regenerate-video
 * Regenerate clip video with updated settings
 * Auth required
 */
router.post('/:clipId/regenerate-video', verifyToken, clipController.regenerateClipVideo);

/**
 * GET /api/clips/download/:clipId
 * Download clip video file
 * Auth required
 */
router.get('/download/:clipId', verifyToken, clipController.downloadClip);

module.exports = router;
