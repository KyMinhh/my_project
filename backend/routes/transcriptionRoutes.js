const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const jwt = require('jsonwebtoken');
const multer = require('multer');
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

// Helper: Process transcription job (OPTIMIZED)
async function processTranscriptionJob(ioInstance, jobId, videoPath, audioPath, gcsAudioUri, speechConfig, targetLang = null) {
    const startTime = Date.now();
    console.log(`[Job ${jobId}] 🚀 Starting transcription process...`);
    
    // Update status to processing immediately
    await Job.findByIdAndUpdate(jobId, { status: 'processing' });
    emitJobStatusUpdate(ioInstance, jobId, 'processing', 'Transcription in progress...');
    
    const outputsDir = path.join(__dirname, '..', 'outputs');
    const transcriptRawJsonFilePath = path.join(outputsDir, `transcript_raw_${jobId}.json`);

    try {
        // Step 1: Transcription
        console.log(`[Job ${jobId}] 📝 Calling Google Speech API...`);
        const recognitionResult = await transcribeAudioFromGCS(gcsAudioUri, speechConfig);
        const { transcription, segments, rawResponse, detectedSpeakerCount, error: recognitionError } = recognitionResult;

        if (recognitionError) {
            await Job.findByIdAndUpdate(jobId, { status: 'failed', errorMessage: recognitionError, segments: [] });
            emitJobStatusUpdate(ioInstance, jobId, 'failed', recognitionError);
            console.error(`[Job ${jobId}] ❌ Transcription failed: ${recognitionError}`);
            return;
        }

        console.log(`[Job ${jobId}] ✅ Transcription completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
        
        // Step 2: Update DB with transcription results IMMEDIATELY
        let updateData = {
            status: 'success',
            transcriptionResult: transcription,
            segments: segments || [],
            completedAt: new Date()
        };

        if (speechConfig.diarizationConfig?.enableSpeakerDiarization && detectedSpeakerCount !== undefined) {
            updateData.detectedSpeakerCount = detectedSpeakerCount;
        }

        // Update DB first before translation (so user sees results faster)
        await Job.findByIdAndUpdate(jobId, updateData);
        
        let finalMessage = 'Transcription successful.';
        
        // Emit success status immediately after transcription
        emitJobStatusUpdate(ioInstance, jobId, 'success', finalMessage, { 
            transcription, 
            segments: segments || [], 
            detectedSpeakerCount,
            processingTime: ((Date.now() - startTime) / 1000).toFixed(2)
        });

        // Step 3: Translation (if needed) - runs AFTER main result is saved
        if (targetLang && segments && segments.length > 0) {
            console.log(`[Job ${jobId}] 🌐 Starting translation to ${targetLang}...`);
            emitJobStatusUpdate(ioInstance, jobId, 'translating', `Translating to ${targetLang}...`);
            
            try {
                // Batch translation for better performance
                const BATCH_SIZE = 10;
                const translatedSegments = [];
                
                for (let i = 0; i < segments.length; i += BATCH_SIZE) {
                    const batch = segments.slice(i, i + BATCH_SIZE);
                    const translatedBatch = await Promise.all(
                        batch.map(async (segment) => ({
                            ...segment,
                            translatedText: await translateText(segment.text, targetLang)
                        }))
                    );
                    translatedSegments.push(...translatedBatch);
                    
                    // Update progress
                    const progress = Math.min(100, Math.round(((i + BATCH_SIZE) / segments.length) * 100));
                    emitJobStatusUpdate(ioInstance, jobId, 'translating', `Translation progress: ${progress}%`);
                }
                
                await Job.findByIdAndUpdate(jobId, {
                    translatedTranscript: translatedSegments,
                    targetLang: targetLang
                });
                
                finalMessage = `Transcription and translation to ${targetLang} successful.`;
                emitJobStatusUpdate(ioInstance, jobId, 'translation_complete', finalMessage, {
                    translatedTranscript: translatedSegments
                });
                console.log(`[Job ${jobId}] ✅ Translation completed`);
            } catch (translationError) {
                console.error(`[Job ${jobId}] ❌ Translation failed:`, translationError.message);
                await Job.findByIdAndUpdate(jobId, { 
                    errorMessage: `Translation error: ${translationError.message}` 
                });
                emitJobStatusUpdate(ioInstance, jobId, 'translation_failed', 'Translation failed, but transcription is available.');
            }
        }

        // Step 4: Save raw response (non-blocking, low priority)
        if (rawResponse) {
            fs.mkdir(outputsDir, { recursive: true })
                .then(() => fs.writeFile(transcriptRawJsonFilePath, JSON.stringify(rawResponse, null, 2), 'utf8'))
                .catch(fileError => console.error(`[Job ${jobId}] Error writing raw data:`, fileError));
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Job ${jobId}] 🎉 Total processing time: ${totalTime}s`);
        
    } catch (processingError) {
        const errorMessage = processingError.message || 'Transcription processing failed';
        console.error(`[Job ${jobId}] ❌ Fatal error:`, errorMessage);
        try {
            await Job.findByIdAndUpdate(jobId, { 
                status: 'failed', 
                errorMessage: errorMessage, 
                segments: [],
                failedAt: new Date()
            });
            emitJobStatusUpdate(ioInstance, jobId, 'failed', errorMessage);
        } catch (dbError) {
            console.error(`[Job ${jobId}] Failed to update DB to failed status:`, dbError);
        }
    } finally {
        // Cleanup audio file asynchronously (non-blocking)
        if (audioPath) {
            fs.access(audioPath)
                .then(() => fs.unlink(audioPath))
                .then(() => console.log(`[Job ${jobId}] 🗑️ Cleaned up audio file`))
                .catch(() => {}); // Ignore cleanup errors
        }
    }
}

// POST /api/transcribe - Upload and transcribe video
router.post('/transcribe', upload.single('video'), async (req, res) => {
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
        emitJobStatusUpdate(io, `temp-${uniqueSuffix}`, 'uploading', `Video uploaded: ${originalName}. Starting processing...`);
        
        // ✅ OPTIMIZATION: Run duration check and audio extraction in parallel
        console.log(`[Upload] 🚀 Starting parallel processing...`);
        const [durationInSeconds] = await Promise.all([
            getVideoDuration(videoPath),
            extractAudio(videoPath, audioPath, (percent) => {
                // Emit audio extraction progress
                emitJobStatusUpdate(io, `temp-${uniqueSuffix}`, 'extracting', `Extracting audio: ${percent}%`, { progress: percent });
            })
        ]);
        
        console.log(`[Upload] ✅ Parallel extraction completed`);
        emitJobStatusUpdate(io, `temp-${uniqueSuffix}`, 'uploading_cloud', `Uploading to cloud storage...`);
        
        gcsAudioUri = await uploadToGCS(audioPath, audioFileName);
        emitJobStatusUpdate(io, `temp-${uniqueSuffix}`, 'creating_job', `Cloud upload complete. Creating job...`);

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
router.post('/transcribe-from-youtube', async (req, res) => {
    let videoPath = '', audioPath = '', gcsAudioUri = '', newJob = null;
    const io = req.app.get('socketio');

    try {
        const { url: youtubeUrl, language: languageCodeFromClient, model, enableSpeakerDiarization = false, targetLang = null } = req.body;

        // Validate YouTube URL
        if (!youtubeUrl) {
            return res.status(400).json({ success: false, message: "YouTube URL is required." });
        }

        if (!(youtubeUrl.includes('youtube.com/') || youtubeUrl.includes('youtu.be/'))) {
            return res.status(400).json({ success: false, message: "Valid YouTube URL is required." });
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
        
        emitJobStatusUpdate(io, `temp-yt-${uniqueSuffix}`, 'downloading', `Downloading YouTube video...`);
        await execPromise(`yt-dlp --no-playlist --no-abort-on-error --output "${videoPath}" --recode-video mp4 "${youtubeUrl}"`);
        
        await fs.access(videoPath);
        emitJobStatusUpdate(io, `temp-yt-${uniqueSuffix}`, 'extracting', `Video downloaded. Extracting audio...`);
        
        // ✅ Parallel processing
        const [durationInSeconds] = await Promise.all([
            getVideoDuration(videoPath),
            extractAudio(videoPath, audioPath, (percent) => {
                emitJobStatusUpdate(io, `temp-yt-${uniqueSuffix}`, 'extracting', `Extracting audio: ${percent}%`, { progress: percent });
            })
        ]);
        
        emitJobStatusUpdate(io, `temp-yt-${uniqueSuffix}`, 'uploading_cloud', `Uploading to cloud...`);
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
router.post('/transcribe-from-tiktok', async (req, res) => {
    let videoPath = '', audioPath = '', gcsAudioUri = '', newJob = null;
    const io = req.app.get('socketio');

    try {
        const { url: tiktokUrl, language: languageCodeFromClient = 'auto-detect', model, enableSpeakerDiarization = false, targetLang = null } = req.body;

        // Validate TikTok URL
        if (!tiktokUrl) {
            return res.status(400).json({ success: false, message: "TikTok URL is required." });
        }

        if (!(tiktokUrl.includes('tiktok.com/'))) {
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
        
        emitJobStatusUpdate(io, `temp-tiktok-${uniqueSuffix}`, 'downloading', `Downloading TikTok video...`);
        await execPromise(`yt-dlp --no-playlist --no-abort-on-error --output "${videoPath}" "${cleanTiktokUrl}"`);
        
        await fs.access(videoPath);
        emitJobStatusUpdate(io, `temp-tiktok-${uniqueSuffix}`, 'extracting', `Video downloaded. Extracting audio...`);
        
        // ✅ Parallel processing
        const [durationInSeconds] = await Promise.all([
            getVideoDuration(videoPath),
            extractAudio(videoPath, audioPath, (percent) => {
                emitJobStatusUpdate(io, `temp-tiktok-${uniqueSuffix}`, 'extracting', `Extracting audio: ${percent}%`, { progress: percent });
            })
        ]);
        
        emitJobStatusUpdate(io, `temp-tiktok-${uniqueSuffix}`, 'uploading_cloud', `Uploading to cloud...`);
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
