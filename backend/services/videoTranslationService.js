const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const audioProcessingService = require('./audioProcessingService');
const googleCloudService = require('./googleCloudService');
const languageService = require('./languageService');
const TranslationJob = require('../schemas/TranslationJob');
const TranslationHistory = require('../schemas/TranslationHistory');
const Job = require('../schemas/Job');

/**
 * Video Translation Service
 * Main orchestrator for multi-language video translation
 */

/**
 * Start video translation job
 * @param {object} config - Translation configuration
 * @returns {Promise<object>} Translation job
 */
async function startTranslation(config) {
    const {
        userId,
        videoId,
        sourceLang = 'auto',
        targetLang,
        voiceConfig = {}
    } = config;

    console.log(`[Translation] 🚀 Starting translation job...`);
    console.log(`[Translation] Source: ${sourceLang}, Target: ${targetLang}`);

    // Validate language pair
    if (sourceLang !== 'auto') {
        const validation = languageService.validateLanguagePair(sourceLang, targetLang);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
    } else {
        // Just validate target language
        if (!languageService.supportsTextToSpeech(targetLang)) {
            throw new Error(`Target language '${targetLang}' does not support text-to-speech`);
        }
    }

    // Get original video
    const originalVideo = await Job.findById(videoId);
    if (!originalVideo) {
        throw new Error(`Video not found: ${videoId}`);
    }

    // Create translation job
    const jobId = uuidv4();
    const job = new TranslationJob({
        jobId,
        userId,
        originalVideoId: videoId,
        sourceLang,
        targetLang,
        voiceConfig: {
            voiceName: voiceConfig.voiceName || null,
            gender: voiceConfig.gender || 'NEUTRAL',
            speakingRate: voiceConfig.speakingRate || languageService.getDefaultSpeakingRate(targetLang),
            pitch: voiceConfig.pitch || 0,
            useVoiceCloning: voiceConfig.useVoiceCloning || false,
            clonedVoiceId: voiceConfig.clonedVoiceId || null,
            voiceSamplePath: voiceConfig.voiceSamplePath || null
        },
        status: 'queued',
        videoDuration: originalVideo.duration,
        estimatedTime: estimateProcessingTime(originalVideo.duration)
    });

    await job.save();
    console.log(`[Translation] ✅ Job created: ${jobId}`);

    // Start processing asynchronously
    processTranslation(jobId).catch(error => {
        console.error(`[Translation] ❌ Job ${jobId} failed:`, error.message);
    });

    return {
        jobId,
        status: job.status,
        estimatedTime: job.estimatedTime
    };
}

/**
 * Process translation job
 * @param {string} jobId - Job ID
 */
async function processTranslation(jobId) {
    const job = await TranslationJob.findOne({ jobId });
    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }

    try {
        job.status = 'processing';
        job.startedAt = new Date();
        await job.save();

        const originalVideo = await Job.findById(job.originalVideoId);

        // Construct video path from uploads directory
        const videoPath = path.join(__dirname, '../uploads', originalVideo.videoFileName || originalVideo.fileName);

        // Check if file exists
        try {
            await fs.access(videoPath);
        } catch (error) {
            throw new Error(`Video file not found: ${videoPath}`);
        }

        const outputDir = path.join(__dirname, '../outputs', jobId);
        await fs.mkdir(outputDir, { recursive: true });

        // Step 1: Extract audio
        await job.updateProgress(5, 'extracting_audio');
        console.log(`[Translation] Step 1/9: Extracting audio from ${videoPath}...`);
        const audioPath = path.join(outputDir, 'original_audio.wav');
        await audioProcessingService.extractAudio(videoPath, audioPath, {
            format: 'wav',
            sampleRate: 16000,
            channels: 1
        });

        // Step 2: Detect language (if auto)
        let detectedLang = job.sourceLang;
        if (job.sourceLang === 'auto') {
            await job.updateProgress(10, 'detecting_language');
            console.log(`[Translation] Step 2/9: Detecting language...`);
            const gcsUri = await googleCloudService.uploadToGCS(audioPath, `${jobId}/audio.wav`);
            detectedLang = await googleCloudService.detectLanguageFromAudio(gcsUri);
            job.detectedSourceLang = detectedLang;
            await job.save();
            console.log(`[Translation] Detected language: ${detectedLang}`);
        }

        // Step 3: Transcribe with word timestamps
        await job.updateProgress(20, 'transcribing');
        console.log(`[Translation] Step 3/9: Transcribing audio...`);
        const gcsUri = await googleCloudService.uploadToGCS(audioPath, `${jobId}/audio.wav`);
        const transcriptionConfig = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: detectedLang,
            enableWordTimeOffsets: true,
            enableAutomaticPunctuation: true,
            model: 'default'
        };
        const transcriptionResult = await googleCloudService.transcribeAudioFromGCS(gcsUri, transcriptionConfig);

        if (!transcriptionResult.segments || transcriptionResult.segments.length === 0) {
            throw new Error('Transcription failed: No segments generated');
        }

        console.log(`[Translation] Transcribed ${transcriptionResult.segments.length} segments`);

        // Step 4: Translate segments
        await job.updateProgress(40, 'translating');
        console.log(`[Translation] Step 4/9: Translating to ${job.targetLang}...`);
        const translatedSegments = await translateSegments(
            transcriptionResult.segments,
            detectedLang,
            job.targetLang
        );

        // Step 5: Generate speech for each segment
        await job.updateProgress(50, 'generating_speech');
        console.log(`[Translation] Step 5/9: Generating speech...`);
        const ttsSegments = await generateSpeechSegments(
            translatedSegments,
            job.targetLang,
            job.voiceConfig,
            outputDir
        );

        // Step 6: Adjust timing for each segment
        await job.updateProgress(70, 'adjusting_timing');
        console.log(`[Translation] Step 6/9: Adjusting audio timing...`);
        const adjustedSegments = await adjustSegmentsTiming(
            ttsSegments,
            transcriptionResult.segments,
            outputDir
        );

        // Step 7: Merge audio segments
        await job.updateProgress(80, 'merging_audio');
        console.log(`[Translation] Step 7/9: Merging audio segments...`);
        const mergedAudioPath = path.join(outputDir, 'translated_audio.mp3');
        await audioProcessingService.mergeAudioSegments(adjustedSegments, mergedAudioPath);

        // Step 8: Replace video audio
        await job.updateProgress(90, 'replacing_audio');
        console.log(`[Translation] Step 8/9: Replacing video audio...`);
        const translatedVideoPath = path.join(outputDir, 'translated_video.mp4');
        await audioProcessingService.replaceAudio(videoPath, mergedAudioPath, translatedVideoPath);

        // Step 9: Generate subtitles
        await job.updateProgress(95, 'generating_subtitles');
        console.log(`[Translation] Step 9/9: Generating subtitles...`);
        const subtitles = await generateSubtitles(translatedSegments, outputDir, job.targetLang);

        // Mark as completed
        await job.markCompleted({
            videoPath: translatedVideoPath,
            audioPath: mergedAudioPath,
            subtitles,
            transcript: {
                original: transcriptionResult.segments.map(s => ({
                    start: s.start,
                    end: s.end,
                    text: s.text
                })),
                translated: translatedSegments
            }
        });

        // Save to history
        await saveToHistory(job, originalVideo, translatedVideoPath, subtitles);

        console.log(`[Translation] ✅ Job ${jobId} completed successfully!`);

    } catch (error) {
        console.error(`[Translation] ❌ Job ${jobId} failed:`, error);
        await job.markFailed(error);
        throw error;
    }
}

/**
 * Translate segments to target language
 * @param {Array} segments - Original segments
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @returns {Promise<Array>} Translated segments
 */
async function translateSegments(segments, sourceLang, targetLang) {
    console.log(`[Translation] Translating ${segments.length} segments...`);

    const translatedSegments = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        try {
            const translatedText = await googleCloudService.translateText(segment.text, targetLang);

            translatedSegments.push({
                start: segment.start,
                end: segment.end,
                text: translatedText,
                originalText: segment.text
            });

            if ((i + 1) % 10 === 0) {
                console.log(`[Translation] Progress: ${i + 1}/${segments.length} segments translated`);
            }
        } catch (error) {
            console.error(`[Translation] Failed to translate segment ${i}:`, error.message);
            // Use original text as fallback
            translatedSegments.push({
                start: segment.start,
                end: segment.end,
                text: segment.text,
                originalText: segment.text
            });
        }
    }

    console.log(`[Translation] ✅ All segments translated`);
    return translatedSegments;
}

/**
 * Generate speech for translated segments
 * @param {Array} segments - Translated segments
 * @param {string} languageCode - Target language code
 * @param {object} voiceConfig - Voice configuration
 * @param {string} outputDir - Output directory
 * @returns {Promise<Array>} Paths to generated audio files
 */
async function generateSpeechSegments(segments, languageCode, voiceConfig, outputDir) {
    console.log(`[Translation] Generating speech for ${segments.length} segments...`);

    const ttsDir = path.join(outputDir, 'tts_segments');
    await fs.mkdir(ttsDir, { recursive: true });

    const audioPaths = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const outputPath = path.join(ttsDir, `segment_${String(i).padStart(4, '0')}.mp3`);

        try {
            const audioContent = await googleCloudService.textToSpeech(
                segment.text,
                languageCode,
                voiceConfig
            );

            await googleCloudService.saveTTSAudio(audioContent, outputPath);
            audioPaths.push({
                path: outputPath,
                start: segment.start,
                end: segment.end,
                originalDuration: segment.end - segment.start
            });

            if ((i + 1) % 5 === 0) {
                console.log(`[Translation] TTS Progress: ${i + 1}/${segments.length} segments`);
            }
        } catch (error) {
            console.error(`[Translation] Failed to generate speech for segment ${i}:`, error.message);
            throw error;
        }
    }

    console.log(`[Translation] ✅ All speech segments generated`);
    return audioPaths;
}

/**
 * Adjust timing of TTS segments to match original
 * @param {Array} ttsSegments - TTS audio segments
 * @param {Array} originalSegments - Original segments with timing
 * @param {string} outputDir - Output directory
 * @returns {Promise<Array>} Adjusted audio paths
 */
async function adjustSegmentsTiming(ttsSegments, originalSegments, outputDir) {
    console.log(`[Translation] Adjusting timing for ${ttsSegments.length} segments...`);

    const adjustedDir = path.join(outputDir, 'adjusted_segments');
    await fs.mkdir(adjustedDir, { recursive: true });

    const adjustedPaths = [];

    for (let i = 0; i < ttsSegments.length; i++) {
        const ttsSegment = ttsSegments[i];
        const targetDuration = ttsSegment.originalDuration;
        const outputPath = path.join(adjustedDir, `adjusted_${String(i).padStart(4, '0')}.mp3`);

        try {
            // Get actual TTS audio duration
            const metadata = await audioProcessingService.getAudioMetadata(ttsSegment.path);
            const actualDuration = metadata.duration;

            // Only adjust if difference is significant (>10%)
            if (Math.abs(actualDuration - targetDuration) / targetDuration > 0.1) {
                console.log(`[Translation] Segment ${i}: ${actualDuration.toFixed(2)}s → ${targetDuration.toFixed(2)}s`);
                await audioProcessingService.adjustToTargetDuration(
                    ttsSegment.path,
                    targetDuration,
                    outputPath
                );
            } else {
                // No adjustment needed, just copy
                await fs.copyFile(ttsSegment.path, outputPath);
            }

            adjustedPaths.push(outputPath);
        } catch (error) {
            console.error(`[Translation] Failed to adjust segment ${i}:`, error.message);
            // Use original TTS without adjustment
            adjustedPaths.push(ttsSegment.path);
        }
    }

    console.log(`[Translation] ✅ All segments adjusted`);
    return adjustedPaths;
}

/**
 * Generate subtitles from translated segments
 * @param {Array} segments - Translated segments
 * @param {string} outputDir - Output directory
 * @param {string} languageCode - Language code
 * @returns {Promise<Array>} Subtitle file paths
 */
async function generateSubtitles(segments, outputDir, languageCode) {
    console.log(`[Translation] Generating subtitles...`);

    const subtitles = [];

    // Generate SRT
    const srtPath = path.join(outputDir, `subtitles_${languageCode}.srt`);
    let srtContent = '';

    segments.forEach((segment, index) => {
        srtContent += `${index + 1}\n`;
        srtContent += `${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)}\n`;
        srtContent += `${segment.text}\n\n`;
    });

    await fs.writeFile(srtPath, srtContent, 'utf-8');
    subtitles.push({
        language: languageCode,
        format: 'srt',
        path: srtPath
    });

    // Generate VTT
    const vttPath = path.join(outputDir, `subtitles_${languageCode}.vtt`);
    let vttContent = 'WEBVTT\n\n';

    segments.forEach((segment, index) => {
        vttContent += `${index + 1}\n`;
        vttContent += `${formatVTTTime(segment.start)} --> ${formatVTTTime(segment.end)}\n`;
        vttContent += `${segment.text}\n\n`;
    });

    await fs.writeFile(vttPath, vttContent, 'utf-8');
    subtitles.push({
        language: languageCode,
        format: 'vtt',
        path: vttPath
    });

    console.log(`[Translation] ✅ Subtitles generated (SRT, VTT)`);
    return subtitles;
}

/**
 * Save translation to history
 */
async function saveToHistory(job, originalVideo, translatedVideoPath, subtitles) {
    const history = new TranslationHistory({
        userId: job.userId,
        jobId: job.jobId,
        originalVideo: {
            videoId: originalVideo._id,
            title: originalVideo.title || 'Untitled',
            duration: originalVideo.duration,
            thumbnailUrl: originalVideo.thumbnailUrl
        },
        sourceLang: job.detectedSourceLang || job.sourceLang,
        targetLang: job.targetLang,
        translatedVideoPath,
        subtitlesUrl: subtitles[0]?.path,
        processingTime: job.processingTime,
        voiceSettings: job.voiceConfig
    });

    await history.save();
    console.log(`[Translation] ✅ Saved to history`);
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<object>} Job status
 */
async function getJobStatus(jobId) {
    const job = await TranslationJob.findOne({ jobId });
    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }

    return {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        estimatedTime: job.estimatedTime,
        errorMessage: job.errorMessage
    };
}

/**
 * Get translation result
 * @param {string} jobId - Job ID
 * @returns {Promise<object>} Translation result
 */
async function getTranslationResult(jobId) {
    const job = await TranslationJob.findOne({ jobId });
    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'completed') {
        throw new Error(`Job not completed yet. Status: ${job.status}`);
    }

    return {
        jobId: job.jobId,
        videoUrl: `/outputs/${jobId}/translated_video.mp4`,
        videoPath: job.translatedVideoPath,
        subtitles: job.subtitles,
        transcript: job.transcript,
        processingTime: job.processingTime
    };
}

/**
 * Detect video language
 * @param {string} videoId - Video ID
 * @returns {Promise<string>} Detected language code
 */
async function detectVideoLanguage(videoId) {
    const video = await Job.findById(videoId);
    if (!video) {
        throw new Error(`Video not found: ${videoId}`);
    }

    // Construct video path
    const videoPath = path.join(__dirname, '../uploads', video.videoFileName || video.fileName);

    // Extract audio temporarily
    const tempAudioPath = path.join(__dirname, '../uploads', `temp_${Date.now()}.wav`);
    await audioProcessingService.extractAudio(videoPath, tempAudioPath, {
        format: 'wav',
        sampleRate: 16000,
        channels: 1
    });

    // Upload to GCS and detect
    const gcsUri = await googleCloudService.uploadToGCS(tempAudioPath, `detect_${Date.now()}.wav`);
    const detectedLang = await googleCloudService.detectLanguageFromAudio(gcsUri);

    // Cleanup
    await fs.unlink(tempAudioPath).catch(() => { });

    return detectedLang;
}

/**
 * Get available voices for language
 * @param {string} languageCode - Language code
 * @returns {Promise<Array>} Available voices
 */
async function getAvailableVoices(languageCode) {
    return await googleCloudService.getVoicesForLanguage(languageCode);
}

/**
 * Generate preview (first 30 seconds)
 * @param {object} config - Preview configuration
 * @returns {Promise<object>} Preview result
 */
async function generatePreview(config) {
    // Similar to startTranslation but only process first 30 seconds
    // Implementation similar to processTranslation with duration limit
    throw new Error('Preview generation not yet implemented');
}

/**
 * Cancel translation job
 * @param {string} jobId - Job ID
 */
async function cancelJob(jobId) {
    const job = await TranslationJob.findOne({ jobId });
    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'completed' || job.status === 'failed') {
        throw new Error(`Cannot cancel job with status: ${job.status}`);
    }

    job.status = 'cancelled';
    await job.save();

    console.log(`[Translation] Job ${jobId} cancelled`);
}

/**
 * Estimate processing time based on video duration
 * @param {number} videoDuration - Video duration in seconds
 * @returns {number} Estimated time in seconds
 */
function estimateProcessingTime(videoDuration) {
    // Rough estimate: 2x video duration
    return Math.round(videoDuration * 2);
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

/**
 * Format time for VTT (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

module.exports = {
    startTranslation,
    getJobStatus,
    getTranslationResult,
    detectVideoLanguage,
    getAvailableVoices,
    generatePreview,
    cancelJob
};
