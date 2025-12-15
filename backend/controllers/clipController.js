const Clip = require('../schemas/Clip');
const Job = require('../schemas/Job');
const viralAnalysisService = require('../services/viralAnalysisService');
const clipGenerationService = require('../services/clipGenerationService');
const path = require('path');
const fs = require('fs').promises;

/**
 * POST /api/clips/generate/:jobId
 * Generate smart clips from a video job
 */
exports.generateSmartClips = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { 
            maxClips = 5, 
            minDuration = 15, 
            maxDuration = 60,
            languages = ['vi', 'en'] 
        } = req.body;
        const userId = req.user.id;

        console.log(`[Clip Controller] 🎬 Generating smart clips for job ${jobId}...`);

        // 1. Find and validate job
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
        if (!job.transcriptionResult || !job.segments || job.segments.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Job must have completed transcription with segments'
            });
        }

        // Check if video file exists
        const videoPath = path.join(__dirname, '../uploads', job.videoFileName || job.fileName);
        try {
            await fs.access(videoPath);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Original video file not found'
            });
        }

        // 2. AI Analysis - Detect viral moments
        console.log('[Clip Controller] 🤖 Running AI viral analysis...');
        const analysisResult = await viralAnalysisService.analyzeViralMoments(
            job.transcriptionResult,
            job.segments
        );

        const viralMoments = analysisResult.viralMoments.slice(0, maxClips);

        if (viralMoments.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No suitable viral moments found in this video'
            });
        }

        // 3. Create Clip documents (without video processing yet)
        const clipPromises = viralMoments.map(async (moment) => {
            // Generate hashtags if not provided by AI
            const hashtags = moment.hashtags && moment.hashtags.length > 0
                ? moment.hashtags
                : await viralAnalysisService.generateHashtags(
                    moment.transcript,
                    moment.emotionalPeak,
                    moment.suggestedPlatforms
                );

            const clip = new Clip({
                jobId: job._id,
                userId: userId,
                title: moment.title,
                description: moment.description,
                viralScore: moment.viralScore,
                emotionalPeak: moment.emotionalPeak,
                startTime: moment.startTime,
                endTime: moment.endTime,
                duration: moment.duration,
                transcript: moment.transcript,
                analysis: {
                    hookStrength: moment.hookStrength,
                    storyArc: moment.storyArc,
                    quotableMoment: moment.quotableMoment,
                    viralElements: moment.viralElements,
                    aiModel: analysisResult.model,
                    analyzedAt: new Date()
                },
                suggestedPlatforms: moment.suggestedPlatforms,
                hashtags: hashtags,
                status: 'pending' // Will process video later
            });

            return await clip.save();
        });

        const savedClips = await Promise.all(clipPromises);

        console.log(`[Clip Controller] ✅ Generated ${savedClips.length} smart clips`);

        // Return clips immediately, video processing will happen in background
        res.json({
            success: true,
            message: `Successfully generated ${savedClips.length} smart clips`,
            data: {
                clips: savedClips,
                analysisModel: analysisResult.model,
                processingTime: analysisResult.processingTime,
                note: 'Clips are queued for video processing. Use GET /api/clips/:jobId to check status.'
            }
        });

        // 4. Process videos in background (async)
        processClipsVideos(savedClips, videoPath, languages).catch(err => {
            console.error('[Clip Controller] ❌ Background processing error:', err);
        });

    } catch (error) {
        console.error('[Clip Controller] ❌ Error generating clips:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate smart clips',
            error: error.message
        });
    }
};

/**
 * Background task: Process videos for clips (PARALLEL PROCESSING)
 */
async function processClipsVideos(clips, originalVideoPath, languages) {
    console.log(`[Background] 🎬 Processing ${clips.length} clips in parallel...`);

    // Process all clips in parallel instead of sequential
    const processingPromises = clips.map(async (clip) => {
        try {
            // Update status to processing
            clip.status = 'processing';
            await clip.save();

            // Create output directory
            const outputDir = path.join(__dirname, '../outputs/clips', clip._id.toString());
            await fs.mkdir(outputDir, { recursive: true });

            // 1. Extract clip from original video
            const clipOutputPath = path.join(outputDir, 'clip.mp4');
            await clipGenerationService.generateClip(
                originalVideoPath,
                clip.startTime,
                clip.endTime,
                clipOutputPath,
                { cropVertical: true } // 9:16 for mobile
            );

            // 2. Generate thumbnail (with error handling)
            const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
            try {
                const result = await clipGenerationService.generateThumbnail(clipOutputPath, thumbnailPath, 1);
                if (result) {
                    clip.thumbnailPath = result;
                }
            } catch (thumbError) {
                console.log(`[Background] ⚠️ Thumbnail generation failed for ${clip._id}, continuing without thumbnail`);
                // Continue processing without thumbnail
            }

            // 3. Generate multi-language subtitles (translate transcript)
            const subtitles = [];
            for (const lang of languages) {
                const translations = await clipGenerationService.translateText(
                    clip.transcript,
                    [lang]
                );

                subtitles.push({
                    language: lang,
                    text: translations[lang] || clip.transcript,
                    style: {
                        fontFamily: 'Arial',
                        fontSize: 24,
                        color: '#FFFFFF',
                        backgroundColor: '#000000',
                        position: 'bottom',
                        animation: 'word-by-word'
                    }
                });
            }

            // 4. Update clip with paths and subtitles
            clip.videoPath = clipOutputPath;
            if (clip.thumbnailPath) {
                // Thumbnail was set above if successful
            }
            clip.subtitles = subtitles;
            clip.status = 'ready';
            clip.processedAt = new Date();
            await clip.save();

            console.log(`[Background] ✅ Clip ${clip._id} processed successfully`);
            return { success: true, clipId: clip._id };

        } catch (error) {
            console.error(`[Background] ❌ Failed to process clip ${clip._id}:`, error);
            clip.status = 'failed';
            clip.processingError = error.message;
            await clip.save();
            return { success: false, clipId: clip._id, error: error.message };
        }
    });

    // Wait for all clips to finish processing
    const results = await Promise.allSettled(processingPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    console.log(`[Background] 🎉 Parallel processing complete: ${successful} successful, ${failed} failed`);
}

/**
 * GET /api/clips/:jobId
 * Get all clips for a job
 */
exports.getClipsByJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;

        // Verify job ownership
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (job.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get clips
        const clips = await Clip.find({ 
            jobId: jobId,
            isDeleted: false 
        }).sort({ viralScore: -1 });

        res.json({
            success: true,
            data: {
                clips: clips,
                total: clips.length,
                statusCounts: {
                    pending: clips.filter(c => c.status === 'pending').length,
                    processing: clips.filter(c => c.status === 'processing').length,
                    ready: clips.filter(c => c.status === 'ready').length,
                    failed: clips.filter(c => c.status === 'failed').length
                }
            }
        });

    } catch (error) {
        console.error('[Clip Controller] Error getting clips:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get clips',
            error: error.message
        });
    }
};

/**
 * GET /api/clips/single/:clipId
 * Get single clip details
 */
exports.getClipById = async (req, res) => {
    try {
        const { clipId } = req.params;
        const userId = req.user.id;

        const clip = await Clip.findById(clipId).populate('jobId', 'fileName originalName');
        
        if (!clip || clip.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Clip not found'
            });
        }

        if (clip.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: clip
        });

    } catch (error) {
        console.error('[Clip Controller] Error getting clip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get clip',
            error: error.message
        });
    }
};

/**
 * PUT /api/clips/:clipId
 * Update clip metadata
 */
exports.updateClip = async (req, res) => {
    try {
        const { clipId } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        const clip = await Clip.findById(clipId);
        
        if (!clip || clip.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Clip not found'
            });
        }

        if (clip.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Allowed fields to update
        const allowedUpdates = ['title', 'description', 'hashtags', 'suggestedPlatforms', 'isPublished'];
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                clip[key] = updates[key];
            }
        });

        if (updates.isPublished && !clip.publishedAt) {
            clip.publishedAt = new Date();
        }

        await clip.save();

        res.json({
            success: true,
            message: 'Clip updated successfully',
            data: clip
        });

    } catch (error) {
        console.error('[Clip Controller] Error updating clip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update clip',
            error: error.message
        });
    }
};

/**
 * DELETE /api/clips/:clipId
 * Delete clip (soft delete)
 */
exports.deleteClip = async (req, res) => {
    try {
        const { clipId } = req.params;
        const userId = req.user.id;

        const clip = await Clip.findById(clipId);
        
        if (!clip || clip.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Clip not found'
            });
        }

        if (clip.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Soft delete
        clip.isDeleted = true;
        clip.deletedAt = new Date();
        await clip.save();

        res.json({
            success: true,
            message: 'Clip deleted successfully'
        });

    } catch (error) {
        console.error('[Clip Controller] Error deleting clip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete clip',
            error: error.message
        });
    }
};

/**
 * POST /api/clips/:clipId/regenerate-video
 * Regenerate video for a clip with updated settings
 */
exports.regenerateClipVideo = async (req, res) => {
    try {
        const { clipId } = req.params;
        const { languages = ['vi', 'en'] } = req.body;
        const userId = req.user.id;

        const clip = await Clip.findById(clipId).populate('jobId');
        
        if (!clip || clip.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Clip not found'
            });
        }

        if (clip.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get original video path
        const job = clip.jobId;
        const videoPath = path.join(__dirname, '../uploads', job.videoFileName || job.fileName);

        // Regenerate in background
        res.json({
            success: true,
            message: 'Clip regeneration started',
            clipId: clip._id
        });

        // Process async
        processClipsVideos([clip], videoPath, languages).catch(err => {
            console.error('[Clip Controller] Regeneration error:', err);
        });

    } catch (error) {
        console.error('[Clip Controller] Error regenerating clip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to regenerate clip',
            error: error.message
        });
    }
};

/**
 * GET /api/clips/download/:clipId
 * Download clip video file
 */
exports.downloadClip = async (req, res) => {
    try {
        const { clipId } = req.params;
        const userId = req.user.id;

        const clip = await Clip.findById(clipId);
        
        if (!clip || clip.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Clip not found'
            });
        }

        if (clip.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (clip.status !== 'ready' || !clip.videoPath) {
            return res.status(400).json({
                success: false,
                message: 'Clip video is not ready yet'
            });
        }

        // Send file
        res.download(clip.videoPath, `${clip.title.replace(/[^a-z0-9]/gi, '_')}.mp4`);

    } catch (error) {
        console.error('[Clip Controller] Error downloading clip:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download clip',
            error: error.message
        });
    }
};
