const express = require('express');
const fileRoutes = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const Job = require('../schemas/Job');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { translateText } = require('../services/googleCloudService');

// Helper function to format timestamps for subtitles
function formatSubtitleTimestamp(seconds, isVtt = false) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    const separator = isVtt ? '.' : ',';
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}${separator}${String(ms).padStart(3, '0')}`;
}

// Get recent files
fileRoutes.get('/files', verifyToken, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search;
        const userId = req.user?.id || '507f1f77bcf86cd799439011';

        let query = { userId };

        if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
            const searchString = searchTerm.trim();
            console.log(`Searching for: "${searchString}"`);
            const regex = new RegExp(searchString.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
            query = {
                userId,
                $or: [
                    { originalName: { $regex: regex } },
                    { fileName: { $regex: regex } }
                ]
            };
        }

        console.log(`Working jobs: Page ${page}, Limit ${limit}, Query:`, JSON.stringify(query));

        const jobsPromise = Job.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const countPromise = Job.countDocuments(query);

        const [jobs, totalJobs] = await Promise.all([jobsPromise, countPromise]);

        const totalPages = Math.ceil(totalJobs / limit);
        res.status(200).json({
            success: true,
            data: { files: jobs, totalPages, currentPage: page, totalFiles: totalJobs },
            message: "Files fetched successfully."
        });
    } catch (error) {
        console.error("❌ Error in getRecentFiles:", error);
        next(error);
    }
});

// Get job details
fileRoutes.get('/files/:jobId', verifyToken, async (req, res, next) => {
    try {
        const jobId = req.params.jobId;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid Job ID format.' });
        }

        const job = await Job.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found." });
        }

        let playableVideoUrl = null;
        if (job.videoFileName) {
            const potentialVideoPath = path.join(__dirname, '..', 'uploads', job.videoFileName);
            try {
                await fs.access(potentialVideoPath);
                playableVideoUrl = `/uploads/${job.videoFileName}`;
                console.log(`Generated static video URL: ${playableVideoUrl}`);
            } catch (fileAccessError) {
                console.warn(`Video file for job ${jobId} not found at expected path: ${potentialVideoPath}`);
            }
        } else {
            console.warn(`Job ${jobId} does not have a videoFileName stored.`);
        }

        res.status(200).json({
            success: true,
            data: { ...job, videoUrl: playableVideoUrl },
            message: "Job details fetched successfully."
        });
    } catch (error) {
        console.error("❌ Error in getJobDetails:", error);
        next(error);
    }
});

// Delete job
fileRoutes.delete('/files/:jobId', verifyToken, async (req, res, next) => {
    try {
        const jobId = req.params.jobId;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid Job ID format.' });
        }

        const jobToDelete = await Job.findByIdAndDelete(jobId);
        if (!jobToDelete) {
            return res.status(404).json({ success: false, message: "Job not found." });
        }

        console.log(`Deleted job record: ${jobId}`);
        res.status(200).json({ success: true, message: "Job deleted successfully." });
    } catch (error) {
        console.error("❌ Error in deleteJob:", error);
        next(error);
    }
});

// Rename job
fileRoutes.put('/files/:jobId/rename', verifyToken, async (req, res, next) => {
    try {
        const jobId = req.params.jobId;
        const { newName } = req.body;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid Job ID.' });
        }
        if (!newName) {
            return res.status(400).json({ success: false, message: 'New name is required.' });
        }

        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            { originalName: newName.trim() },
            { new: true }
        ).lean();

        if (!updatedJob) {
            return res.status(404).json({ success: false, message: "Job not found." });
        }

        console.log(`Renamed job record ${jobId}`);
        res.status(200).json({ success: true, data: updatedJob, message: "Job renamed." });
    } catch (error) {
        console.error("❌ Error in renameJob:", error);
        next(error);
    }
});

// Retry job
fileRoutes.post('/files/:jobId/retry', verifyToken, async (req, res, next) => {
    try {
        const jobId = req.params.jobId;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid Job ID.' });
        }

        const jobToRetry = await Job.findOneAndUpdate(
            { _id: jobId, status: 'failed' },
            { status: 'waiting', errorMessage: null },
            { new: true }
        );

        if (!jobToRetry) {
            return res.status(404).json({ success: false, message: "Job not found or not in 'failed' state." });
        }

        console.log(`Job ${jobId} status updated to 'waiting' for retry.`);
        res.status(200).json({ success: true, message: `Job ${jobId} queued for retry.` });
    } catch (error) {
        console.error("❌ Error in retryJob:", error);
        next(error);
    }
});

// Download transcript
fileRoutes.get('/files/:jobId/download/:format', verifyToken, async (req, res, next) => {
    try {
        const { jobId, format } = req.params;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid Job ID format.' });
        }

        const job = await Job.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }

        if (job.status !== 'success' || (!job.transcriptionResult && (!job.segments || job.segments.length === 0))) {
            return res.status(400).json({ success: false, message: 'Transcript is not available or job not completed.' });
        }

        let content = '';
        let contentType = 'text/plain';
        const sanitizedOriginalName = (job.originalName || job.fileName || jobId).replace(/[^a-z0-9_.-]/gi, '_');
        let downloadFilename = `transcript_${sanitizedOriginalName}.${format}`;

        const segments = job.segments || [];
        const fullText = job.transcriptionResult || segments.map(seg => seg.text).join('\n\n');

        switch (format.toLowerCase()) {
            case 'txt':
                content = fullText;
                contentType = 'text/plain';
                break;

            case 'json':
                content = JSON.stringify({
                    jobId: job._id,
                    originalName: job.originalName,
                    fileName: job.fileName,
                    transcriptionResult: fullText,
                    segments: segments,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt
                }, null, 2);
                contentType = 'application/json';
                break;

            case 'srt':
                contentType = 'application/x-subrip';
                let srtContent = '';
                segments.forEach((segment, index) => {
                    srtContent += `${index + 1}\n`;
                    srtContent += `${formatSubtitleTimestamp(segment.start)} --> ${formatSubtitleTimestamp(segment.end)}\n`;
                    srtContent += `${segment.text}\n\n`;
                });
                content = srtContent;
                break;

            case 'vtt':
                contentType = 'text/vtt';
                let vttContent = 'WEBVTT\n\n';
                segments.forEach((segment, index) => {
                    vttContent += `${formatSubtitleTimestamp(segment.start, true)} --> ${formatSubtitleTimestamp(segment.end, true)}\n`;
                    vttContent += `${segment.text}\n\n`;
                });
                content = vttContent;
                break;

            default:
                return res.status(400).json({ success: false, message: 'Invalid format requested. Supported formats: txt, json, srt, vtt.' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        res.setHeader('Content-Type', contentType);
        res.send(content);
    } catch (error) {
        console.error("❌ Error in downloadTranscript:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message || "Failed to download transcript." });
        }
    }
});

// Translate job
fileRoutes.post('/files/:jobId/translate', verifyToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { targetLang } = req.body;

        if (!targetLang) {
            return res.status(400).json({
                success: false,
                message: 'Target language is required'
            });
        }

        console.log(`📝 Manual translation request for job ${jobId} to ${targetLang}`);

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (!job.segments || job.segments.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No transcript segments available to translate'
            });
        }

        console.log(`🌐 Translating ${job.segments.length} segments to ${targetLang}...`);

        const translatedSegments = await Promise.all(
            job.segments.map(async (segment) => ({
                start: segment.start,
                end: segment.end,
                text: segment.text,
                translatedText: await translateText(segment.text, targetLang),
                speakerTag: segment.speakerTag
            }))
        );

        await Job.findByIdAndUpdate(jobId, {
            translatedTranscript: translatedSegments,
            targetLang: targetLang
        });

        console.log(`✔️ Translation completed for job ${jobId}`);

        res.json({
            success: true,
            message: `Translation to ${targetLang} completed successfully`,
            data: {
                translatedTranscript: translatedSegments,
                targetLang: targetLang
            }
        });
    } catch (error) {
        console.error('❌ Translation error:', error);
        res.status(500).json({
            success: false,
            message: 'Translation failed',
            error: error.message
        });
    }
});

module.exports = fileRoutes;
