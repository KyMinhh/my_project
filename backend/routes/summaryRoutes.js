const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const Job = require('../schemas/Job');
const summaryService = require('../services/summaryService');

/**
 * GET /api/summary/services-status
 * Get available AI services status
 */
router.get('/services-status', (req, res) => {
    try {
        const status = summaryService.getServicesStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get services status',
            error: error.message
        });
    }
});

/**
 * POST /api/summary/estimate-cost
 * Estimate cost for summary generation
 */
router.post('/estimate-cost', (req, res) => {
    try {
        const { transcriptLength, type = 'detailed' } = req.body;
        
        if (!transcriptLength || typeof transcriptLength !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'transcriptLength (number) is required'
            });
        }

        const estimate = summaryService.estimateCost(transcriptLength, type);
        res.json({
            success: true,
            data: estimate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to estimate cost',
            error: error.message
        });
    }
});

/**
 * POST /api/summary/generate/:jobId
 * Generate summary for a specific job
 */
router.post('/generate/:jobId', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { type = 'detailed', forceRegenerate = false } = req.body;
        const userId = req.user.id;

        // Validate summary type
        const validTypes = ['quick', 'detailed', 'bullets', 'chapters', 'action_items', 'keywords'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid summary type. Valid types: ${validTypes.join(', ')}`
            });
        }

        // Find job
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check ownership
        if (job.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this job'
            });
        }

        // Check if job has transcript
        if (!job.transcriptionResult || job.transcriptionResult.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Job does not have a transcript yet. Please complete transcription first.'
            });
        }

        // Check if summary already exists (unless force regenerate)
        if (!forceRegenerate && job.summaries && job.summaries[type] && job.summaries[type].text) {
            return res.json({
                success: true,
                cached: true,
                message: 'Summary already exists (from cache)',
                data: {
                    type: type,
                    summary: job.summaries[type].text,
                    model: job.summaries[type].model,
                    provider: job.summaries[type].provider,
                    generatedAt: job.summaries[type].generatedAt
                }
            });
        }

        // Validate transcript
        const validation = summaryService.validateTranscript(job.transcriptionResult);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        console.log(`[Summary API] Generating ${type} summary for job ${jobId}...`);

        // Generate summary
        const result = await summaryService.generateSummary(
            job.transcriptionResult,
            type,
            { language: 'Vietnamese' }
        );

        // Save summary to database using findByIdAndUpdate to avoid any field conflicts
        const summaryData = {
            text: result.summary,
            generatedAt: new Date(),
            model: result.model,
            provider: result.provider
        };
        
        // Use $set to update only the specific summary field
        await Job.findByIdAndUpdate(
            jobId,
            { 
                $set: { 
                    [`summaries.${type}`]: summaryData 
                } 
            },
            { 
                new: true,
                runValidators: true  // Run schema validators
            }
        );

        console.log(`[Summary API] ✅ ${type} summary generated and saved`);

        // Return result
        res.json({
            success: true,
            cached: false,
            message: 'Summary generated successfully',
            data: {
                type: type,
                summary: result.summary,
                model: result.model,
                provider: result.provider,
                processingTime: result.processingTime,
                tokenCount: result.tokenCount,
                fallbackUsed: result.fallbackUsed,
                generatedAt: new Date()
            }
        });

    } catch (error) {
        console.error('[Summary API] ❌ Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate summary',
            error: error.message
        });
    }
});

/**
 * POST /api/summary/generate-multiple/:jobId
 * Generate multiple summary types at once
 */
router.post('/generate-multiple/:jobId', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { types = ['quick', 'detailed'], forceRegenerate = false } = req.body;
        const userId = req.user.id;

        // Validate types
        if (!Array.isArray(types) || types.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'types must be a non-empty array'
            });
        }

        // Find job
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check ownership
        if (job.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this job'
            });
        }

        // Check transcript
        if (!job.transcriptionResult) {
            return res.status(400).json({
                success: false,
                message: 'Job does not have a transcript yet'
            });
        }

        console.log(`[Summary API] Generating ${types.length} summary types for job ${jobId}...`);

        // Filter types that need generation
        const typesToGenerate = forceRegenerate 
            ? types 
            : types.filter(type => !job.summaries || !job.summaries[type] || !job.summaries[type].text);

        const cachedSummaries = {};
        const newSummaries = {};

        // Get cached summaries
        if (!forceRegenerate && job.summaries) {
            types.forEach(type => {
                if (job.summaries[type] && job.summaries[type].text) {
                    cachedSummaries[type] = job.summaries[type];
                }
            });
        }

        // Generate new summaries
        if (typesToGenerate.length > 0) {
            const result = await summaryService.generateMultipleSummaries(
                job.transcriptionResult,
                typesToGenerate,
                { language: 'Vietnamese' }
            );

            // Prepare update object for each summary type
            const updateObj = {};
            Object.keys(result.summaries).forEach(type => {
                const summary = result.summaries[type];
                const summaryData = {
                    text: summary.summary,
                    generatedAt: new Date(),
                    model: summary.model,
                    provider: summary.provider
                };
                updateObj[`summaries.${type}`] = summaryData;
                newSummaries[type] = summaryData;
            });

            // Use $set to update only summary fields (avoid field conflicts)
            await Job.findByIdAndUpdate(
                jobId,
                { $set: updateObj },
                { new: true, runValidators: true }
            );
        }

        res.json({
            success: true,
            message: `Generated ${Object.keys(newSummaries).length} summaries, ${Object.keys(cachedSummaries).length} from cache`,
            data: {
                cached: cachedSummaries,
                generated: newSummaries,
                total: types.length
            }
        });

    } catch (error) {
        console.error('[Summary API] ❌ Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate summaries',
            error: error.message
        });
    }
});

/**
 * GET /api/summary/:jobId
 * Get all summaries for a job
 */
router.get('/:jobId', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;

        const job = await Job.findById(jobId).select('userId summaries');
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check ownership
        if (job.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this job'
            });
        }

        res.json({
            success: true,
            data: job.summaries || {}
        });

    } catch (error) {
        console.error('[Summary API] ❌ Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get summaries',
            error: error.message
        });
    }
});

/**
 * DELETE /api/summary/:jobId/:type
 * Delete a specific summary
 */
router.delete('/:jobId/:type', verifyToken, async (req, res) => {
    try {
        const { jobId, type } = req.params;
        const userId = req.user.id;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check ownership
        if (job.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this job'
            });
        }

        // Delete summary
        if (job.summaries && job.summaries[type]) {
            job.summaries[type] = undefined;
            await job.save();
            
            res.json({
                success: true,
                message: `${type} summary deleted successfully`
            });
        } else {
            res.status(404).json({
                success: false,
                message: `${type} summary not found`
            });
        }

    } catch (error) {
        console.error('[Summary API] ❌ Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete summary',
            error: error.message
        });
    }
});

module.exports = router;
