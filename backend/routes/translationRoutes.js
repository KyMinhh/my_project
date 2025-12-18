const express = require('express');
const router = express.Router();
const videoTranslationService = require('../services/videoTranslationService');
const languageService = require('../services/languageService');
const TranslationHistory = require('../schemas/TranslationHistory');
const BatchTranslation = require('../schemas/BatchTranslation');
const { verifyToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * Translation Routes
 * API endpoints for multi-language video translation
 */

// ==================== LANGUAGE & VOICE MANAGEMENT ====================

/**
 * GET /api/translation/languages
 * Get list of all supported languages
 */
router.get('/languages', (req, res) => {
    try {
        const languages = languageService.getSupportedLanguages();
        const byRegion = languageService.getLanguagesByRegion();
        const popularPairs = languageService.getPopularLanguagePairs();

        res.json({
            success: true,
            count: languages.length,
            languages,
            byRegion,
            popularPairs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/translation/voices/:languageCode
 * Get available TTS voices for a language
 */
router.get('/voices/:languageCode', verifyToken, async (req, res) => {
    try {
        const { languageCode } = req.params;

        // Validate language
        if (!languageService.supportsTextToSpeech(languageCode)) {
            return res.status(400).json({
                success: false,
                error: `Language '${languageCode}' does not support text-to-speech`
            });
        }

        const voices = await videoTranslationService.getAvailableVoices(languageCode);

        res.json({
            success: true,
            languageCode,
            count: voices.length,
            voices
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/translation/detect-language
 * Auto-detect language from video
 */
router.post('/detect-language', verifyToken, async (req, res) => {
    try {
        const { videoId } = req.body;

        if (!videoId) {
            return res.status(400).json({
                success: false,
                error: 'videoId is required'
            });
        }

        const detectedLang = await videoTranslationService.detectVideoLanguage(videoId);
        const languageInfo = languageService.getLanguageInfo(detectedLang);

        res.json({
            success: true,
            detectedLanguage: detectedLang,
            languageInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== TRANSLATION JOBS ====================

/**
 * POST /api/translation/start
 * Start a new video translation job
 */
router.post('/start', verifyToken, async (req, res) => {
    try {
        const {
            videoId,
            sourceLang = 'auto',
            targetLang,
            voiceConfig = {}
        } = req.body;

        // Validation
        if (!videoId || !targetLang) {
            return res.status(400).json({
                success: false,
                error: 'videoId and targetLang are required'
            });
        }

        // Validate language pair
        if (sourceLang !== 'auto') {
            const validation = languageService.validateLanguagePair(sourceLang, targetLang);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }
        }

        const userId = req.user.id;

        const job = await videoTranslationService.startTranslation({
            userId,
            videoId,
            sourceLang,
            targetLang,
            voiceConfig
        });

        res.json({
            success: true,
            message: 'Translation job started',
            ...job
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/translation/status/:jobId
 * Get translation job status and progress
 */
router.get('/status/:jobId', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const status = await videoTranslationService.getJobStatus(jobId);

        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/translation/result/:jobId
 * Get completed translation result
 */
router.get('/result/:jobId', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await videoTranslationService.getTranslationResult(jobId);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/translation/preview
 * Generate quick preview (first 30 seconds)
 */
router.post('/preview', verifyToken, async (req, res) => {
    try {
        const { videoId, sourceLang, targetLang, voiceConfig } = req.body;

        const preview = await videoTranslationService.generatePreview({
            videoId,
            sourceLang,
            targetLang,
            voiceConfig,
            duration: 30
        });

        res.json({
            success: true,
            ...preview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/translation/cancel/:jobId
 * Cancel ongoing translation job
 */
router.delete('/cancel/:jobId', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        await videoTranslationService.cancelJob(jobId);

        res.json({
            success: true,
            message: 'Translation job cancelled'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== BATCH TRANSLATION ====================

/**
 * POST /api/translation/batch/start
 * Start batch translation for multiple videos
 */
router.post('/batch/start', verifyToken, async (req, res) => {
    try {
        const {
            name,
            description,
            videoIds,
            sourceLang = 'auto',
            targetLang,
            voiceConfig = {},
            options = {}
        } = req.body;

        if (!name || !videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'name and videoIds array are required'
            });
        }

        if (!targetLang) {
            return res.status(400).json({
                success: false,
                error: 'targetLang is required'
            });
        }

        const userId = req.user.id;
        const batchId = uuidv4();

        // Create batch job
        const batch = new BatchTranslation({
            batchId,
            userId,
            name,
            description,
            sourceLang,
            targetLang,
            sharedVoiceConfig: voiceConfig,
            videos: videoIds.map(videoId => ({
                videoId,
                status: 'pending'
            })),
            totalVideos: videoIds.length,
            options: {
                priority: options.priority || 'normal',
                maxConcurrent: options.maxConcurrent || 3,
                notifyOnComplete: options.notifyOnComplete !== false,
                autoDownload: options.autoDownload || false
            }
        });

        await batch.save();

        // Start processing videos concurrently
        processBatchTranslation(batchId).catch(error => {
            console.error(`[Batch] Failed to process batch ${batchId}:`, error);
        });

        res.json({
            success: true,
            message: 'Batch translation started',
            batchId,
            totalVideos: batch.totalVideos,
            estimatedTime: batch.totalVideos * 120 // Rough estimate: 2 min per video
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/translation/batch/status/:batchId
 * Get batch translation status
 */
router.get('/batch/status/:batchId', verifyToken, async (req, res) => {
    try {
        const { batchId } = req.params;
        const batch = await BatchTranslation.findOne({ batchId });

        if (!batch) {
            return res.status(404).json({
                success: false,
                error: 'Batch not found'
            });
        }

        res.json({
            success: true,
            batchId: batch.batchId,
            name: batch.name,
            status: batch.status,
            progress: batch.progress,
            totalVideos: batch.totalVideos,
            completedVideos: batch.completedVideos,
            failedVideos: batch.failedVideos,
            videos: batch.videos
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/translation/batch/results/:batchId
 * Get batch translation results
 */
router.get('/batch/results/:batchId', verifyToken, async (req, res) => {
    try {
        const { batchId } = req.params;
        const batch = await BatchTranslation.findOne({ batchId });

        if (!batch) {
            return res.status(404).json({
                success: false,
                error: 'Batch not found'
            });
        }

        if (batch.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: `Batch not completed yet. Status: ${batch.status}`
            });
        }

        res.json({
            success: true,
            batchId: batch.batchId,
            name: batch.name,
            results: batch.results,
            completedVideos: batch.completedVideos,
            failedVideos: batch.failedVideos
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== TRANSLATION HISTORY ====================

/**
 * GET /api/translation/history
 * Get user's translation history
 */
router.get('/history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, skip = 0 } = req.query;

        const history = await TranslationHistory.find({ userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await TranslationHistory.countDocuments({ userId });
        const stats = await TranslationHistory.getUserStats(userId);

        res.json({
            success: true,
            history,
            total,
            stats,
            pagination: {
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > (parseInt(skip) + parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/translation/history/:jobId
 * Get specific translation from history
 */
router.get('/history/:jobId', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;

        const history = await TranslationHistory.findOne({ jobId, userId });

        if (!history) {
            return res.status(404).json({
                success: false,
                error: 'Translation not found in history'
            });
        }

        res.json({
            success: true,
            history
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/translation/history/:jobId/rating
 * Add rating and feedback to translation
 */
router.post('/history/:jobId/rating', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { rating, feedback } = req.body;
        const userId = req.user.id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        const history = await TranslationHistory.findOne({ jobId, userId });

        if (!history) {
            return res.status(404).json({
                success: false,
                error: 'Translation not found'
            });
        }

        await history.addRating(rating, feedback);

        res.json({
            success: true,
            message: 'Rating added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/translation/history/:jobId/download
 * Record download action
 */
router.post('/history/:jobId/download', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;

        const history = await TranslationHistory.findOne({ jobId, userId });

        if (!history) {
            return res.status(404).json({
                success: false,
                error: 'Translation not found'
            });
        }

        await history.recordDownload();

        res.json({
            success: true,
            message: 'Download recorded'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/translation/stats/popular-pairs
 * Get popular language pairs across all users
 */
router.get('/stats/popular-pairs', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const popularPairs = await TranslationHistory.getPopularPairs(parseInt(limit));

        res.json({
            success: true,
            popularPairs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Process batch translation
 * @param {string} batchId - Batch ID
 */
async function processBatchTranslation(batchId) {
    const batch = await BatchTranslation.findOne({ batchId });
    if (!batch) return;

    batch.status = 'processing';
    batch.startedAt = new Date();
    await batch.save();

    const maxConcurrent = batch.options.maxConcurrent || 3;
    const videos = batch.videos.filter(v => v.status === 'pending');

    // Process videos in batches
    for (let i = 0; i < videos.length; i += maxConcurrent) {
        const chunk = videos.slice(i, Math.min(i + maxConcurrent, videos.length));

        await Promise.all(chunk.map(async (video) => {
            try {
                // Mark as processing
                video.status = 'processing';
                await batch.save();

                // Start translation
                const job = await videoTranslationService.startTranslation({
                    userId: batch.userId,
                    videoId: video.videoId,
                    sourceLang: batch.sourceLang,
                    targetLang: batch.targetLang,
                    voiceConfig: batch.sharedVoiceConfig
                });

                video.jobId = job.jobId;
                await batch.save();

                // Wait for completion (simplified - in production use job queue)
                // This is a placeholder - actual implementation would use job monitoring

            } catch (error) {
                console.error(`[Batch] Video ${video.videoId} failed:`, error);
                await batch.markVideoFailed(video.videoId, error);
            }
        }));
    }

    await batch.updateProgress();
}

module.exports = router;
