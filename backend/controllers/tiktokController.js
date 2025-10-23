// my_project - Copy/backend/controllers/tiktokController.js

const { exec } = require("child_process");
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const Job = require('../schemas/Job');
const { extractAudio } = require('../utils/ffmpegUtils');
const { uploadToGCS } = require('../services/googleCloudService');
// Import processTranscriptionJob và getVideoDuration từ videoController
const { getVideoDuration, processTranscriptionJob } = require('./videoController');

// Helper function to get userId from request
const getUserIdFromRequest = (req) => {
    // First try from req.user (if middleware was used)
    if (req.user?.id) {
        return req.user.id;
    }

    // Try to get from Authorization header
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

    // Fallback to default userId for testing
    return '507f1f77bcf86cd799439011';
};

// Hàm helper để gửi cập nhật trạng thái (giống với trong videoController và youtubeController)
// Cân nhắc đưa hàm này vào một file utils chung để tránh lặp code
const emitJobStatusUpdate = (ioOrReq, jobId, status, message = '', data = {}) => {
    const io = ioOrReq.app ? ioOrReq.app.get('socketio') : ioOrReq;
    if (io) {
        console.log(`📢 [TikTokCtrl] Emitting status for Job ${jobId}: ${status}`);
        io.emit('jobStatusUpdate', { jobId, status, message, ...data });
    } else {
        console.warn(`[Job ${jobId}] [TikTokCtrl] Socket.IO instance not available for emitting status: ${status}`);
    }
};

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
            if (err) {
                console.error(`yt-dlp Error Output (TikTok): ${stderr}`);
                const errorMsg = stderr && stderr.includes('ERROR:') ? stderr.split('ERROR:')[1].trim() : `Failed to download TikTok video. yt-dlp error.`;
                return reject(new Error(errorMsg));
            }
            resolve(stdout);
        });
    });
}

exports.transcribeFromTiktok = async (req, res, next) => {
    let videoPath = '', audioPath = '', gcsAudioUri = '', newJob = null;
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const io = req.app.get('socketio'); // Lấy io instance từ request

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

        console.log(`[TikTok] 🎬 Downloading & Recoding video from: ${cleanTiktokUrl} using yt-dlp...`);
        await fs.mkdir(uploadDir, { recursive: true });

        await execPromise(`yt-dlp --no-playlist --no-abort-on-error --output "${videoPath}" --recode-video mp4 "${cleanTiktokUrl}"`);
        console.log(`[TikTok] ✔️ Video downloaded and ensured as MP4: ${videoPath}`);
        // emitJobStatusUpdate(io, `temp-tiktok-${uniqueSuffix}`, 'processing', 'Video downloaded. Processing metadata...');

        try {
            await fs.access(videoPath, fs.constants.R_OK);
            console.log(`[TikTok] ✔️ File access confirmed: ${videoPath}`);
        } catch (accessError) {
            console.error(`[TikTok] ❌ Cannot access file after download/recode: ${videoPath}`, accessError);
            throw new Error(`File not accessible after download/recode at ${videoPath}.`);
        }

        console.log(`[TikTok] ⏱️ Getting video duration...`);
        const durationInSeconds = await getVideoDuration(videoPath);
        console.log(`[TikTok] ✔️ Duration: ${durationInSeconds ?? 'N/A'}s`);

        console.log(`[TikTok] 🎤 Extracting audio...`);
        await extractAudio(videoPath, audioPath);
        console.log(`[TikTok] ✔️ Audio extracted: ${audioPath}`);
        // emitJobStatusUpdate(io, `temp-tiktok-${uniqueSuffix}`, 'processing', 'Audio extracted. Uploading to cloud...');

        console.log(`[TikTok] ☁️ Uploading audio to GCS...`);
        gcsAudioUri = await uploadToGCS(audioPath, audioFileName);
        console.log(`[TikTok] ✔️ Audio uploaded to: ${gcsAudioUri}`);
        // emitJobStatusUpdate(io, `temp-tiktok-${uniqueSuffix}`, 'processing', 'Audio uploaded. Preparing for transcription...');

        let fileSizeOnDisk = null;
        try { fileSizeOnDisk = (await fs.stat(videoPath)).size; } catch (statErr) { console.warn(`Could not get size for ${videoPath}`); }

        const videoNameForDb = `TikTok Video (${new URL(cleanTiktokUrl).pathname.split('/').pop() || 'link'})`;
        newJob = new Job({
            userId: getUserIdFromRequest(req),
            fileName: audioFileName,
            originalName: videoNameForDb,
            status: 'queued', // Đặt trạng thái ban đầu là 'queued'
            fileSize: fileSizeOnDisk,
            duration: durationInSeconds,
            gcsAudioUri: gcsAudioUri,
            languageCode: languageCodeFromClient,
            speakerDiarizationEnabled: enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true,
            videoFileName: videoFileName,
            sourceType: 'tiktok'
        });
        await newJob.save();
        console.log(`[TikTok] 💾 Job record created: ${newJob._id}`);
        // Emit trạng thái 'queued' với Job ID thật
        emitJobStatusUpdate(io, newJob._id, 'queued', `${videoNameForDb} created and queued for transcription.`);

        const speechConfig = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            enableAutomaticPunctuation: true,
            model: 'latest_long',
            enableWordTimeOffsets: true
        };

        if (languageCodeFromClient && languageCodeFromClient !== 'auto-detect') {
            speechConfig.languageCode = languageCodeFromClient;
            console.log(`Using specified language: ${languageCodeFromClient}`);
        } else {
            speechConfig.languageCode = 'vi-VN'; // Ngôn ngữ gợi ý chính
            console.log(`Language set to default '${speechConfig.languageCode}' (auto-detect selected/defaulted).`);
            speechConfig.alternativeLanguageCodes = [
                'vi-VN', 'en-US', 'ja-JP', 'ko-KR',
                'cmn-CN', 'fr-FR', 'de-DE', 'es-ES'
            ];
        }

        if (enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true) {
            if (speechConfig.languageCode) { // Chỉ bật diarization nếu có languageCode cụ thể (hoặc sau khi auto-detect có kết quả)
                console.log(`Enabling Speaker Diarization for language: ${speechConfig.languageCode}`);
                speechConfig.diarizationConfig = { enableSpeakerDiarization: true };
            } else {
                // Nếu auto-detect và không có languageCode ban đầu, diarization có thể không hoạt động tốt
                // Google Speech-to-Text API V1P1Beta1 cho phép diarization với auto language detection, nhưng V1 thì không
                console.warn("Speaker Diarization is typically more reliable with a specified language code.");
                speechConfig.diarizationConfig = { enableSpeakerDiarization: true }; // Vẫn thử bật
            }
        }

        res.status(202).json({ success: true, message: 'TikTok video processing started.', jobId: newJob._id, data: { duration: durationInSeconds } });
        console.log(`[TikTok] ✅ Responded to client for Job ${newJob._id}. Starting background task.`);

        setImmediate(() => {
            // Truyền io instance và targetLang vào processTranscriptionJob
            processTranscriptionJob(io, newJob._id, videoPath, audioPath, gcsAudioUri, speechConfig, targetLang)
                .catch(err => {
                    console.error(`[Job ${newJob?._id}] ❌ Uncaught error in background task for TikTok:`, err);
                    if (newJob?._id) {
                        const errorMsg = err.message || 'Background processing failed unexpectedly for TikTok video.';
                        Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: errorMsg })
                            .then(() => emitJobStatusUpdate(io, newJob._id, 'failed', errorMsg)) // Gửi trạng thái failed
                            .catch(dbErr => console.error(`[Job ${newJob._id}] ❌ DB update failed after background task error:`, dbErr));
                    }
                });
        });

    } catch (error) {
        console.error("❌ Error processing TikTok URL:", error.message || error);

        // Dọn dẹp file nếu có lỗi
        try { if (videoPath && await fs.access(videoPath).then(() => true).catch(() => false)) await fs.unlink(videoPath); } catch (e) { console.warn("[TikTok] Cleanup error (video):", e.message); }
        try { if (audioPath && await fs.access(audioPath).then(() => true).catch(() => false)) await fs.unlink(audioPath); } catch (e) { console.warn("[TikTok] Cleanup error (audio):", e.message); }

        if (newJob?._id) { // Nếu job đã được tạo
            try {
                await Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: error.message || 'Failed to initiate TikTok processing' });
                // Emit trạng thái failed nếu job đã được tạo
                emitJobStatusUpdate(io, newJob._id, 'failed', error.message || 'Failed to initiate TikTok processing');
            } catch (dbErr) {
                console.error(`[Job ${newJob._id}] ❌ DB update failed after initial error:`, dbErr);
            }
        } else if (io) { // Nếu lỗi xảy ra trước khi job được tạo
            emitJobStatusUpdate(io, `temp-tiktok-error-${Date.now()}`, 'failed', error.message || "Failed to process TikTok URL");
        }

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: error.message || "Failed to process TikTok URL" });
        }
    }
};