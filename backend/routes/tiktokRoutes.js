const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const tiktokController = require('../controllers/tiktokController');

/**
 * GET /api/tiktok/auth-url
 * Get TikTok authorization URL (requires auth)
 */
router.get('/auth-url', verifyToken, tiktokController.getAuthUrl);

/**
 * GET /api/tiktok/callback
 * OAuth callback (no auth required - TikTok redirects here)
 */
router.get('/callback', tiktokController.handleCallback);

/**
 * GET /api/tiktok/account
 * Get connected TikTok account info
 */
router.get('/account', verifyToken, tiktokController.getAccount);

/**
 * DELETE /api/tiktok/disconnect
 * Disconnect TikTok account
 */
router.delete('/disconnect', verifyToken, tiktokController.disconnect);

/**
 * POST /api/tiktok/post/:clipId
 * Post clip to TikTok
 */
router.post('/post/:clipId', verifyToken, tiktokController.postClip);

/**
 * PUT /api/tiktok/settings
 * Update auto-post settings
 */
router.put('/settings', verifyToken, tiktokController.updateSettings);

module.exports = router;
