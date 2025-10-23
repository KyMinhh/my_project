const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { verifyToken } = require('../middleware/verifyToken');
const Job = require('../schemas/Job');
const { extractAudio } = require('../utils/ffmpegUtils');
const { uploadToGCS, transcribeAudioFromGCS, translateText } = require('../services/googleCloudService');

const upload = multer({ dest: 'uploads/' });
const uploadDir = path.join(__dirname, '..', 'uploads');

// Helper: Get userId from request
const getUserIdFromRequest = (req) => {
    if (req.user?.id) return req.user.id;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return decoded.userId;
        } catch (error) {
            console.warn('Invalid JWT token:', error.message);
        }
    }
    return '507f1f77bcf86cd799439011';
};

// Helper: Emit job status update
const emitJobStatusUpdate = (ioOrReq, jobId, status, message = '', data = {}) => {
    const io = ioOrReq.app ? ioOrReq.app.get('socketio') : ioOrReq;
    if (io) {
        io.emit('jobStatusUpdate', { jobId, status, message, ...data });
    }
};

// Helper: Get video duration
function getVideoDuration(filePath) {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) { resolve(null); }
            else { resolve(metadata?.format?.duration); }
        });
    });
}

// Helper: Execute command as promise
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
            if (err) {
                console.error(`yt-dlp Error Output: ${stderr}`);
                const errorMsg = stderr && stderr.includes('ERROR:') ? stderr.split('ERROR:')[1].trim() : `Failed to download video. yt-dlp error.`;
                return reject(new Error(errorMsg));
            }
            resolve(stdout);
        });
    });
}

// Helper: Process transcription job
async function processTranscriptionJob(ioInstance, jobId, videoPath, audioPath, gcsAudioUri, speechConfig, targetLang = null) {
    emitJobStatusUpdate(ioInstance, jobId, 'processing', 'Transcription process initiated.');
    const outputsDir = path.join(__dirname, '..', 'outputs');
    const transcriptRawJsonFilePath = path.join(outputsDir, `transcript_raw_${jobId}.json`);

    try {
        const recognitionResult = await transcribeAudioFromGCS(gcsAudioUri, speechConfig);
        const { transcription, segments, rawResponse, detectedSpeakerCount, error: recognitionError } = recognitionResult;

        if (recognitionError) {
            await Job.findByIdAndUpdate(jobId, { status: 'failed', errorMessage: recognitionError, segments: [] });
            emitJobStatusUpdate(ioInstance, jobId, 'failed', recognitionError);
            return;
        }

        let finalStatus = 'success';
        let successMessage = 'Transcription successful.';
        
        let updateData = {
            status: finalStatus,
            transcriptionResult: transcription,
            segments: segments || []
        };

        if (speechConfig.diarizationConfig?.enableSpeakerDiarization && detectedSpeakerCount !== undefined) {
            updateData.detectedSpeakerCount = detectedSpeakerCount;
        }

        if (targetLang && segments && segments.length > 0) {
            console.log(`🌐 Starting translation to ${targetLang} for job ${jobId}...`);
            emitJobStatusUpdate(ioInstance, jobId, 'processing', `Translating to ${targetLang}...`);
            
            try {
                const translatedSegments = await Promise.all(
                    segments.map(async (segment) => ({
                        ...segment,
                        translatedText: await translateText(segment.text, targetLang)
                    }))
                );
                
                updateData.translatedTranscript = translatedSegments;
                updateData.targetLang = targetLang;
                successMessage = `Transcription and translation to ${targetLang} successful.`;
                console.log(`✔️ Translation completed for job ${jobId}`);
            } catch (translationError) {
                console.error(`❌ Translation failed for job ${jobId}:`, translationError.message);
                successMessage = 'Transcription successful, but translation failed.';
                updateData.errorMessage = `Translation error: ${translationError.message}`;
            }
        }

        if (!segments || segments.length === 0) {
            if (transcription && transcription.length > 0) {
                successMessage = 'Transcription text available, but no detailed segments.';
            } else {
                successMessage = 'Transcription resulted in no text or segments.';
            }
        }
        
        await Job.findByIdAndUpdate(jobId, updateData);
        emitJobStatusUpdate(ioInstance, jobId, finalStatus, successMessage, { transcription, segments: segments || [], detectedSpeakerCount });

        if (rawResponse) {
            try {
                await fs.mkdir(outputsDir, { recursive: true });
                await fs.writeFile(transcriptRawJsonFilePath, JSON.stringify(rawResponse, null, 2), 'utf8');
            } catch (fileError) {
                console.error(`[Job ${jobId}] Error writing raw transcription data:`, fileError);
            }
        }
    } catch (processingError) {
        const errorMessage = processingError.message || 'Transcription processing failed';
        try {
            await Job.findByIdAndUpdate(jobId, { status: 'failed', errorMessage: errorMessage, segments: [] });
            emitJobStatusUpdate(ioInstance, jobId, 'failed', errorMessage);
        } catch (dbError) {
            console.error(`[Job ${jobId}] Failed to update DB to failed status:`, dbError);
        }
    } finally {
        try {
            if (audioPath && await fs.access(audioPath).then(() => true).catch(() => false)) {
                await fs.unlink(audioPath);
            }
        } catch (cleanupErr) {
            console.warn(`[Job ${jobId}] Could not delete temporary audio file:`, cleanupErr.message);
        }
    }
}

// POST /api/transcribe - Upload and transcribe video
router.post('/transcribe', upload.single('video'), verifyToken, async (req, res) => {
    let videoPath = '', audioPath = '', gcsAudioUri = '', newJob = null;
    const io = req.app.get('socketio');

    try {
        const { file } = req;
        if (!file) {
            return res.status(400).json({ success: false, message: "No video file uploaded." });
        }

        const originalName = file.originalname;
        const fileSize = file.size;
        const languageCodeFromClient = req.body.languageCode || 'vi-VN';
        const enableSpeakerDiarization = req.body.enableSpeakerDiarization === 'true';
        const minSpeakers = req.body.minSpeakers ? parseInt(req.body.minSpeakers, 10) : 1;
        const maxSpeakers = req.body.maxSpeakers ? parseInt(req.body.maxSpeakers, 10) : 5;

        await fs.mkdir(uploadDir, { recursive: true });
        
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalExt = path.extname(originalName) || '.tmp';
        const videoFileName = `video-${uniqueSuffix}${originalExt}`;
        const audioFileName = `audio-${uniqueSuffix}.wav`;
        videoPath = path.join(uploadDir, videoFileName);
        audioPath = path.join(uploadDir, audioFileName);

        await fs.rename(file.path, videoPath);
        emitJobStatusUpdate(io, `temp-${uniqueSuffix}`, 'processing', `Video uploaded: ${originalName}. Processing...`);
        
        const durationInSeconds = await getVideoDuration(videoPath);
        await extractAudio(videoPath, audioPath);
        gcsAudioUri = await uploadToGCS(audioPath, audioFileName);

        newJob = new Job({
            userId: getUserIdFromRequest(req),
            fileName: audioFileName,
            originalName: originalName,
            status: 'queued',
            fileSize: fileSize,
            duration: durationInSeconds,
            gcsAudioUri: gcsAudioUri,
            videoFileName: videoFileName,
            sourceType: 'upload',
            languageCode: languageCodeFromClient,
            speakerDiarizationEnabled: enableSpeakerDiarization
        });
        await newJob.save();
        emitJobStatusUpdate(io, newJob._id, 'queued', 'Job created and queued for transcription.');

        const speechConfig = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            enableAutomaticPunctuation: true,
            model: 'latest_long',
            enableWordTimeOffsets: true,
            languageCode: languageCodeFromClient
        };

        if (languageCodeFromClient === 'auto-detect') {
            speechConfig.languageCode = 'vi-VN';
            speechConfig.alternativeLanguageCodes = ['en-US', 'ja-JP', 'ko-KR', 'cmn-CN', 'fr-FR', 'de-DE', 'es-ES'];
        }
        
        if (enableSpeakerDiarization) {
            speechConfig.diarizationConfig = {
                enableSpeakerDiarization: true,
                minSpeakerCount: minSpeakers, 
                maxSpeakerCount: maxSpeakers 
            };
        }

        const targetLangFromClient = req.body.targetLang || null;

        res.status(202).json({ success: true, message: 'Processing started. Job created.', jobId: newJob._id, data: { duration: durationInSeconds } });

        setImmediate(() => {
            processTranscriptionJob(io, newJob._id, videoPath, audioPath, gcsAudioUri, speechConfig, targetLangFromClient)
                .catch(err => { 
                    if (newJob?._id) {
                        const errorMsg = err.message || 'Background processing failed unexpectedly.';
                        Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: errorMsg })
                            .then(() => emitJobStatusUpdate(io, newJob._id, 'failed', errorMsg))
                            .catch(dbErr => console.error(`[Job ${newJob._id}] DB update failed after background task error:`, dbErr));
                    }
                });
        });

    } catch (initialError) {
        try { if (videoPath && (await fs.access(videoPath).then(() => true).catch(() => false))) await fs.unlink(videoPath); } catch (e) { /* ignore */ }
        try { if (req.file?.path && req.file.path !== videoPath && (await fs.access(req.file.path).then(() => true).catch(() => false))) await fs.unlink(req.file.path); } catch (e) { /* ignore */ }
        try { if (audioPath && (await fs.access(audioPath).then(() => true).catch(() => false))) await fs.unlink(audioPath); } catch (e) { /* ignore */ }

        if (newJob?._id) {
            try {
                await Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: initialError.message || 'Failed to initiate processing' });
                emitJobStatusUpdate(io, newJob._id, 'failed', initialError.message || 'Failed to initiate processing');
            } catch (dbErr) { /* ignore */ }
        }
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: initialError.message || "Failed to process uploaded video" });
        }
    }
});

// POST /api/transcribe-from-youtube - Transcribe from YouTube URL
router.post('/transcribe-from-youtube', verifyToken, async (req, res) => {
    let videoPath = '', audioPath = '', gcsAudioUri = '', newJob = null;
    const io = req.app.get('socketio');

    try {
        const { youtubeUrl, languageCode: languageCodeFromClient, enableSpeakerDiarization = false, targetLang = null } = req.body;

        if (!youtubeUrl || !(youtubeUrl.includes('youtube.com/') || youtubeUrl.includes('youtu.be/'))) {
            if (!(youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be'))) {
                return res.status(400).json({ success: false, message: "Valid YouTube URL is required." });
            }
        }
        emitJobStatusUpdate(io, `temp-yt-${Date.now()}`, 'processing', `Received YouTube URL: ${youtubeUrl}. Starting download...`);

        let videoId = 'yt-' + Date.now();
        try {
            const parsedUrl = new URL(youtubeUrl);
            if (parsedUrl.hostname.includes('youtube.com')) {
                videoId = parsedUrl.searchParams.get('v') || videoId;
            } else if (parsedUrl.hostname.includes('youtu.be')) {
                videoId = parsedUrl.pathname.substring(1) || videoId;
            }
        } catch (e) {
            const match = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (match && match[1]) { videoId = match[1]; }
        }

        const uniqueSuffix = Date.now();
        const videoFileName = `youtube-${videoId}-${uniqueSuffix}.mp4`;
        const audioFileName = `audio-youtube-${videoId}-${uniqueSuffix}.wav`;
        videoPath = path.join(uploadDir, videoFileName);
        audioPath = path.join(uploadDir, audioFileName);

        await fs.mkdir(uploadDir, { recursive: true });
        await execPromise(`yt-dlp --no-playlist --no-abort-on-error --output "${videoPath}" --recode-video mp4 "${youtubeUrl}"`);
        
        await fs.access(videoPath);
        const durationInSeconds = await getVideoDuration(videoPath);
        await extractAudio(videoPath, audioPath);
        gcsAudioUri = await uploadToGCS(audioPath, audioFileName);

        newJob = new Job({
            userId: getUserIdFromRequest(req),
            fileName: audioFileName,
            originalName: `YouTube Video (${videoId})`,
            status: 'queued',
            fileSize: null,
            duration: durationInSeconds,
            gcsAudioUri: gcsAudioUri,
            languageCode: languageCodeFromClient,
            speakerDiarizationEnabled: enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true,
            videoFileName: videoFileName,
            sourceType: 'youtube'
        });
        await newJob.save();
        emitJobStatusUpdate(io, newJob._id, 'queued', `YouTube job (${videoId}) created and queued for transcription.`);

        const speechConfig = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            enableAutomaticPunctuation: true,
            model: 'latest_long',
            enableWordTimeOffsets: true
        };

        if (languageCodeFromClient && languageCodeFromClient !== 'auto-detect') {
            speechConfig.languageCode = languageCodeFromClient;
            if (enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true) {
                speechConfig.diarizationConfig = { enableSpeakerDiarization: true };
            }
        } else {
            speechConfig.languageCode = 'vi-VN';
            speechConfig.alternativeLanguageCodes = ['vi-VN', 'en-US', 'ja-JP', 'ko-KR', 'cmn-CN', 'fr-FR', 'de-DE', 'es-ES'];
            if (enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true) {
                speechConfig.diarizationConfig = { enableSpeakerDiarization: true };
            }
        }

        res.status(202).json({ success: true, message: 'YouTube video processing started.', jobId: newJob._id, data: { duration: durationInSeconds } });

        setImmediate(() => {
            processTranscriptionJob(io, newJob._id, videoPath, audioPath, gcsAudioUri, speechConfig, targetLang)
                .catch(err => {
                    if (newJob?._id) {
                        const errorMsg = err.message || 'Background processing failed unexpectedly for YouTube video.';
                        Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: errorMsg })
                            .then(() => emitJobStatusUpdate(io, newJob._id, 'failed', errorMsg))
                            .catch(dbErr => console.error(`[Job ${newJob._id}] DB update failed after background task error:`, dbErr));
                    }
                });
        });

    } catch (error) {
        try { if (videoPath && await fs.access(videoPath).then(() => true).catch(() => false)) await fs.unlink(videoPath); } catch (e) { }
        try { if (audioPath && await fs.access(audioPath).then(() => true).catch(() => false)) await fs.unlink(audioPath); } catch (e) { }

        if (newJob?._id) {
            try {
                await Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: error.message || 'Failed to initiate YouTube processing' });
                emitJobStatusUpdate(io, newJob._id, 'failed', error.message || 'Failed to initiate YouTube processing');
            } catch (dbErr) { }
        } else if (io) {
            emitJobStatusUpdate(io, `temp-yt-error-${Date.now()}`, 'failed', error.message || "Failed to process YouTube URL");
        }

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: error.message || "Failed to process YouTube URL" });
        }
    }
});

// POST /api/transcribe-from-tiktok - Transcribe from TikTok URL
router.post('/transcribe-from-tiktok', verifyToken, async (req, res) => {
    let videoPath = '', audioPath = '', gcsAudioUri = '', newJob = null;
    const io = req.app.get('socketio');

    try {
        const { tiktokUrl, languageCode: languageCodeFromClient = 'auto-detect', enableSpeakerDiarization = false, targetLang = null } = req.body;

        if (!tiktokUrl || !(tiktokUrl.includes('tiktok.com/t/') || tiktokUrl.includes('tiktok.com/@'))) {
            return res.status(400).json({ success: false, message: "Invalid TikTok URL format provided." });
        }
        
        const cleanTiktokUrl = tiktokUrl.split('?')[0];
        emitJobStatusUpdate(io, `temp-tiktok-${Date.now()}`, 'processing', `Received TikTok URL: ${cleanTiktokUrl}. Starting download...`);

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const videoFileName = `tiktok-${uniqueSuffix}.mp4`;
        const audioFileName = `audio-tiktok-${uniqueSuffix}.wav`;
        videoPath = path.join(uploadDir, videoFileName);
        audioPath = path.join(uploadDir, audioFileName);

        await fs.mkdir(uploadDir, { recursive: true });
        await execPromise(`yt-dlp --no-playlist --no-abort-on-error --output "${videoPath}" "${cleanTiktokUrl}"`);
        
        await fs.access(videoPath);
        const durationInSeconds = await getVideoDuration(videoPath);
        await extractAudio(videoPath, audioPath);
        gcsAudioUri = await uploadToGCS(audioPath, audioFileName);

        newJob = new Job({
            userId: getUserIdFromRequest(req),
            fileName: audioFileName,
            originalName: `TikTok Video (${uniqueSuffix})`,
            status: 'queued',
            fileSize: null,
            duration: durationInSeconds,
            gcsAudioUri: gcsAudioUri,
            languageCode: languageCodeFromClient,
            speakerDiarizationEnabled: enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true,
            videoFileName: videoFileName,
            sourceType: 'tiktok'
        });
        await newJob.save();
        emitJobStatusUpdate(io, newJob._id, 'queued', `TikTok job created and queued for transcription.`);

        const speechConfig = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            enableAutomaticPunctuation: true,
            model: 'latest_long',
            enableWordTimeOffsets: true
        };

        if (languageCodeFromClient && languageCodeFromClient !== 'auto-detect') {
            speechConfig.languageCode = languageCodeFromClient;
            if (enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true) {
                speechConfig.diarizationConfig = { enableSpeakerDiarization: true };
            }
        } else {
            speechConfig.languageCode = 'vi-VN';
            speechConfig.alternativeLanguageCodes = ['vi-VN', 'en-US', 'ja-JP', 'ko-KR', 'cmn-CN', 'fr-FR', 'de-DE', 'es-ES'];
            if (enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true) {
                speechConfig.diarizationConfig = { enableSpeakerDiarization: true };
            }
        }

        res.status(202).json({ success: true, message: 'TikTok video processing started.', jobId: newJob._id, data: { duration: durationInSeconds } });

        setImmediate(() => {
            processTranscriptionJob(io, newJob._id, videoPath, audioPath, gcsAudioUri, speechConfig, targetLang)
                .catch(err => {
                    if (newJob?._id) {
                        const errorMsg = err.message || 'Background processing failed unexpectedly for TikTok video.';
                        Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: errorMsg })
                            .then(() => emitJobStatusUpdate(io, newJob._id, 'failed', errorMsg))
                            .catch(dbErr => console.error(`[Job ${newJob._id}] DB update failed after background task error:`, dbErr));
                    }
                });
        });

    } catch (error) {
        try { if (videoPath && await fs.access(videoPath).then(() => true).catch(() => false)) await fs.unlink(videoPath); } catch (e) { }
        try { if (audioPath && await fs.access(audioPath).then(() => true).catch(() => false)) await fs.unlink(audioPath); } catch (e) { }

        if (newJob?._id) {
            try {
                await Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: error.message || 'Failed to initiate TikTok processing' });
                emitJobStatusUpdate(io, newJob._id, 'failed', error.message || 'Failed to initiate TikTok processing');
            } catch (dbErr) { }
        } else if (io) {
            emitJobStatusUpdate(io, `temp-tiktok-error-${Date.now()}`, 'failed', error.message || "Failed to process TikTok URL");
        }

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: error.message || "Failed to process TikTok URL" });
        }
    }
});

module.exports = router;
