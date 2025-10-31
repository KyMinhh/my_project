const ffmpeg = require('fluent-ffmpeg');

/**
 * Extract audio from video with optimized settings
 * @param {string} videoPath - Input video file path
 * @param {string} audioPath - Output audio file path
 * @param {function} onProgress - Optional progress callback (percent)
 * @returns {Promise<string>} - Resolved with audioPath
 */
function extractAudio(videoPath, audioPath, onProgress = null) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        console.log(`🎤 Starting audio extraction: ${videoPath}`);
        
        ffmpeg(videoPath)
            .output(audioPath)
            .noVideo() // Skip video processing (faster)
            .audioChannels(1) 
            .audioFrequency(16000)
            .audioCodec('pcm_s16le') // Explicitly set codec
            .outputOptions([
                '-preset ultrafast',  // Fastest preset
                '-threads 4',         // Use 4 CPU cores
                '-ar 16000',          // Audio sample rate
                '-ac 1',              // Mono channel
            ])
            .on('start', (commandLine) => {
                console.log('FFmpeg command:', commandLine);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    const percent = Math.round(progress.percent);
                    console.log(`⏳ Audio extraction progress: ${percent}%`);
                    if (onProgress) {
                        onProgress(percent);
                    }
                }
            })
            .on('end', () => {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`✅ Audio extracted in ${duration}s: ${audioPath}`);
                resolve(audioPath);
            })
            .on('error', (err) => {
                console.error(`❌ Error extracting audio from ${videoPath}:`, err);
                reject(err);
            })
            .run();
    });
}

module.exports = { extractAudio };