// my_project - Copy/backend/controllers/youtubeController.js

const { exec } = require("child_process");
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const Job = require('../models/Job');
const { extractAudio } = require("../utils/ffmpegUtils");
const { uploadToGCS } = require("../services/googleCloudService");
// Import processTranscriptionJob và getVideoDuration từ videoController
const { getVideoDuration, processTranscriptionJob } = require("./videoController");

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

// Hàm helper để gửi cập nhật trạng thái (giống với trong videoController)
// Bạn có thể cân nhắc đưa hàm này vào một file utils chung để tránh lặp code
const emitJobStatusUpdate = (ioOrReq, jobId, status, message = '', data = {}) => {
    const io = ioOrReq.app ? ioOrReq.app.get('socketio') : ioOrReq;
    if (io) {
        console.log(`📢 [YouTubeCtrl] Emitting status for Job ${jobId}: ${status}`);
        io.emit('jobStatusUpdate', { jobId, status, message, ...data });
    } else {
        console.warn(`[Job ${jobId}] [YouTubeCtrl] Socket.IO instance not available for emitting status: ${status}`);
    }
};

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
            if (err) {
                console.error(`yt-dlp Error Output: ${stderr}`);
                const errorMsg = stderr && stderr.includes('ERROR:') ? stderr.split('ERROR:')[1].trim() : `Failed to download YouTube video. yt-dlp error.`;
                return reject(new Error(errorMsg));
            }
            resolve(stdout);
        });
    });
}

exports.transcribeFromYoutube = async (req, res, next) => {
    let videoPath = '', audioPath = '', gcsAudioUri = '', newJob = null;
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const io = req.app.get('socketio'); // Lấy io instance từ request

    try {
        const { youtubeUrl, languageCode: languageCodeFromClient, enableSpeakerDiarization = false } = req.body;

        // Kiểm tra URL (có thể cải thiện regex nếu cần)
        // Giữ nguyên logic kiểm tra URL hiện tại của bạn
        if (!youtubeUrl || !(youtubeUrl.includes('youtube.com/') || youtubeUrl.includes('youtu.be/'))) {
             // Điều chỉnh điều kiện này nếu googleusercontent.com là proxy hợp lệ của bạn
            if (!(youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be'))) {
                return res.status(400).json({ success: false, message: "Valid YouTube URL or authorized proxy URL is required." });
            }
        }
        emitJobStatusUpdate(io, `temp-yt-${Date.now()}`, 'processing', `Received YouTube URL: ${youtubeUrl}. Starting download...`);


        let videoId = 'yt-' + Date.now();
        try {
            // Cố gắng parse videoId từ URL
            const parsedUrl = new URL(youtubeUrl);
            if (parsedUrl.hostname.includes('youtube.com')) {
                videoId = parsedUrl.searchParams.get('v') || videoId;
            } else if (parsedUrl.hostname.includes('youtu.be')) {
                videoId = parsedUrl.pathname.substring(1) || videoId;
            }
        } catch (e) {
            const match = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (match && match[1]) { videoId = match[1]; }
            else { console.warn("Could not parse YouTube video ID, using fallback."); }
        }

        const uniqueSuffix = Date.now();
        const videoFileName = `youtube-${videoId}-${uniqueSuffix}.mp4`;
        const audioFileName = `audio-youtube-${videoId}-${uniqueSuffix}.wav`;
        videoPath = path.join(uploadDir, videoFileName);
        audioPath = path.join(uploadDir, audioFileName);

        console.log(`[YouTube] 🎬 Downloading video from: ${youtubeUrl} using yt-dlp...`);
        await fs.mkdir(uploadDir, { recursive: true });

        // Tải video
        await execPromise(`yt-dlp --no-playlist --no-abort-on-error --output "${videoPath}" --recode-video mp4 "${youtubeUrl}"`);
        console.log(`[YouTube] ✔️ Video downloaded to: ${videoPath}`);
        // emitJobStatusUpdate(io, `temp-yt-${uniqueSuffix}`, 'processing', 'Video downloaded. Processing metadata...');


        try {
            await fs.access(videoPath, fs.constants.R_OK);
            console.log(`[YouTube] ✔️ File access confirmed by Node.js: ${videoPath}`);
        } catch (accessError) {
            console.error(`[YouTube] ❌ Node.js cannot access file immediately after download: ${videoPath}`, accessError);
            throw new Error(`Downloaded file not accessible at ${videoPath}. Check permissions or download process.`);
        }

        console.log(`[YouTube] ⏱️ Getting video duration...`);
        const durationInSeconds = await getVideoDuration(videoPath);
        console.log(`[YouTube] ✔️ Duration: ${durationInSeconds ?? 'N/A'}s`);

        console.log(`[YouTube] 🎤 Extracting audio...`);
        await extractAudio(videoPath, audioPath);
        console.log(`[YouTube] ✔️ Audio extracted: ${audioPath}`);
        // emitJobStatusUpdate(io, `temp-yt-${uniqueSuffix}`, 'processing', 'Audio extracted. Uploading to cloud...');


        console.log(`[YouTube] ☁️ Uploading audio to GCS...`);
        gcsAudioUri = await uploadToGCS(audioPath, audioFileName);
        console.log(`[YouTube] ✔️ Audio uploaded to: ${gcsAudioUri}`);
        // emitJobStatusUpdate(io, `temp-yt-${uniqueSuffix}`, 'processing', 'Audio uploaded. Preparing for transcription...');


        newJob = new Job({
            userId: getUserIdFromRequest(req),
            fileName: audioFileName,
            originalName: `YouTube Video (${videoId})`,
            status: 'queued', // Đặt trạng thái ban đầu là 'queued'
            fileSize: null, // yt-dlp không cung cấp fileSize trực tiếp, có thể lấy sau nếu cần
            duration: durationInSeconds,
            gcsAudioUri: gcsAudioUri,
            languageCode: languageCodeFromClient,
            speakerDiarizationEnabled: enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true,
            videoFileName: videoFileName, // Lưu tên file video đã tải về
            sourceType: 'youtube'
        });
        await newJob.save();
        console.log(`[YouTube] 💾 Job record created: ${newJob._id}`);
        // Emit trạng thái 'queued' với Job ID thật
        emitJobStatusUpdate(io, newJob._id, 'queued', `YouTube job (${videoId}) created and queued for transcription.`);


        const speechConfig = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            enableAutomaticPunctuation: true,
            model: 'latest_long', // Hoặc model cụ thể nếu muốn
            enableWordTimeOffsets: true
        };

        if (languageCodeFromClient && languageCodeFromClient !== 'auto-detect') {
            speechConfig.languageCode = languageCodeFromClient;
            console.log(`Using specified language: ${languageCodeFromClient}`);
            if (enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true) {
                speechConfig.diarizationConfig = { enableSpeakerDiarization: true };
            }
        } else {
            console.log("Using language auto-detection with primary hint + alternatives.");
            speechConfig.languageCode = 'vi-VN'; // Ngôn ngữ gợi ý chính
            speechConfig.alternativeLanguageCodes = [ // Các ngôn ngữ thay thế
                'vi-VN', 'en-US', 'ja-JP', 'ko-KR',
                'cmn-CN', 'fr-FR', 'de-DE', 'es-ES'
            ];
            if (enableSpeakerDiarization === 'true' || enableSpeakerDiarization === true) {
                console.warn("Diarization requested with auto-detect.");
                speechConfig.diarizationConfig = { enableSpeakerDiarization: true };
            }
        }

        res.status(202).json({
            success: true,
            message: 'YouTube video processing started.',
            jobId: newJob._id,
            data: { duration: durationInSeconds }
        });
        console.log(`[YouTube] ✅ Responded to client for Job ${newJob._id}. Starting background task.`);

        setImmediate(() => {
            // Truyền io instance vào processTranscriptionJob
            processTranscriptionJob(io, newJob._id, videoPath, audioPath, gcsAudioUri, speechConfig)
                .catch(err => {
                    console.error(`[Job ${newJob?._id}] ❌ Uncaught error in background task for YouTube:`, err);
                    if (newJob?._id) {
                        const errorMsg = err.message || 'Background processing failed unexpectedly for YouTube video.';
                        Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: errorMsg })
                            .then(() => emitJobStatusUpdate(io, newJob._id, 'failed', errorMsg)) // Gửi trạng thái failed
                            .catch(dbErr => console.error(`[Job ${newJob._id}] ❌ DB update failed after background task error:`, dbErr));
                    }
                });
        });

    } catch (error) {
        console.error("❌ Error processing YouTube URL:", error.message || error);

        // Dọn dẹp file nếu có lỗi
        try { if (videoPath && await fs.access(videoPath).then(() => true).catch(() => false)) await fs.unlink(videoPath); } catch (e) { console.warn("[YouTube] Cleanup error (video):", e.message); }
        try { if (audioPath && await fs.access(audioPath).then(() => true).catch(() => false)) await fs.unlink(audioPath); } catch (e) { console.warn("[YouTube] Cleanup error (audio):", e.message); }

        if (newJob?._id) { // Nếu job đã được tạo
            try {
                await Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: error.message || 'Failed to initiate YouTube processing' });
                // Emit trạng thái failed nếu job đã được tạo
                emitJobStatusUpdate(io, newJob._id, 'failed', error.message || 'Failed to initiate YouTube processing');
            } catch (dbErr) {
                console.error(`[Job ${newJob._id}] ❌ DB update failed after initial error:`, dbErr);
            }
        } else if (io) { // Nếu lỗi xảy ra trước khi job được tạo
            emitJobStatusUpdate(io, `temp-yt-error-${Date.now()}`, 'failed', error.message || "Failed to process YouTube URL");
        }


        // Đảm bảo chỉ trả về response một lần
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: error.message || "Failed to process YouTube URL" });
        }
    }
};