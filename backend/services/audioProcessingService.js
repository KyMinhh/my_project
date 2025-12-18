const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Audio Processing Service
 * Handles all audio manipulation for video translation
 */

/**
 * Extract audio from video
 * @param {string} videoPath - Path to video file
 * @param {string} outputPath - Output audio file path
 * @param {object} options - Extraction options
 * @returns {Promise<string>} Path to extracted audio
 */
async function extractAudio(videoPath, outputPath, options = {}) {
    const {
        format = 'wav',      // wav, mp3, aac
        sampleRate = 16000,  // 16kHz for STT, 44100 for high quality
        channels = 1,        // mono for STT, 2 for stereo
        bitrate = '192k'     // Audio bitrate
    } = options;

    console.log(`[Audio] 🎵 Extracting audio from video...`);
    console.log(`[Audio] Format: ${format}, Sample Rate: ${sampleRate}Hz, Channels: ${channels}`);

    return new Promise((resolve, reject) => {
        let command = ffmpeg(videoPath)
            .noVideo()
            .audioFrequency(sampleRate)
            .audioChannels(channels);

        if (format === 'wav') {
            command = command.audioCodec('pcm_s16le');
        } else if (format === 'mp3') {
            command = command.audioCodec('libmp3lame').audioBitrate(bitrate);
        } else if (format === 'aac') {
            command = command.audioCodec('aac').audioBitrate(bitrate);
        }

        command
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('[Audio] FFmpeg command:', cmd);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`[Audio] Extracting: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log('[Audio] ✅ Audio extracted successfully');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[Audio] ❌ Extraction failed:', err.message);
                reject(new Error(`Audio extraction failed: ${err.message}`));
            })
            .run();
    });
}

/**
 * Replace video audio track
 * @param {string} videoPath - Path to video file
 * @param {string} audioPath - Path to new audio file
 * @param {string} outputPath - Output video path
 * @param {object} options - Replacement options
 * @returns {Promise<string>} Path to output video
 */
async function replaceAudio(videoPath, audioPath, outputPath, options = {}) {
    const {
        keepOriginalAudio = false,  // Mix with original audio
        originalVolume = 0.0,       // Volume of original audio (0.0-1.0)
        newAudioVolume = 1.0        // Volume of new audio (0.0-1.0)
    } = options;

    console.log(`[Audio] 🔄 Replacing video audio track...`);

    return new Promise((resolve, reject) => {
        let command = ffmpeg();

        if (keepOriginalAudio) {
            // Mix original and new audio
            command
                .input(videoPath)
                .input(audioPath)
                .complexFilter([
                    `[0:a]volume=${originalVolume}[a1]`,
                    `[1:a]volume=${newAudioVolume}[a2]`,
                    `[a1][a2]amix=inputs=2:duration=first[aout]`
                ])
                .outputOptions([
                    '-map 0:v',
                    '-map [aout]',
                    '-c:v copy',
                    '-c:a aac',
                    '-b:a 192k'
                ]);
        } else {
            // Replace completely
            command
                .input(videoPath)
                .input(audioPath)
                .outputOptions([
                    '-map 0:v',
                    '-map 1:a',
                    '-c:v copy',
                    '-c:a aac',
                    '-b:a 192k',
                    '-shortest' // Match shortest input duration
                ]);
        }

        command
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('[Audio] FFmpeg command:', cmd);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`[Audio] Processing: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log('[Audio] ✅ Audio replaced successfully');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[Audio] ❌ Replacement failed:', err.message);
                reject(new Error(`Audio replacement failed: ${err.message}`));
            })
            .run();
    });
}

/**
 * Adjust audio speed without changing pitch (time-stretching)
 * @param {string} audioPath - Path to audio file
 * @param {number} speedFactor - Speed factor (0.5 = half speed, 2.0 = double speed)
 * @param {string} outputPath - Output audio path
 * @returns {Promise<string>} Path to output audio
 */
async function adjustSpeed(audioPath, speedFactor, outputPath) {
    console.log(`[Audio] ⚡ Adjusting audio speed to ${speedFactor}x...`);

    // Use atempo filter (supports 0.5-2.0 range)
    // For values outside this range, chain multiple atempo filters
    let atempoFilters = [];
    let remainingFactor = speedFactor;

    while (remainingFactor > 2.0) {
        atempoFilters.push('atempo=2.0');
        remainingFactor /= 2.0;
    }

    while (remainingFactor < 0.5) {
        atempoFilters.push('atempo=0.5');
        remainingFactor /= 0.5;
    }

    if (remainingFactor !== 1.0) {
        atempoFilters.push(`atempo=${remainingFactor.toFixed(3)}`);
    }

    const filterString = atempoFilters.join(',');

    return new Promise((resolve, reject) => {
        ffmpeg(audioPath)
            .audioFilters(filterString)
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('[Audio] FFmpeg command:', cmd);
            })
            .on('end', () => {
                console.log('[Audio] ✅ Speed adjusted successfully');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[Audio] ❌ Speed adjustment failed:', err.message);
                reject(new Error(`Speed adjustment failed: ${err.message}`));
            })
            .run();
    });
}

/**
 * Adjust audio to match target duration
 * @param {string} audioPath - Path to audio file
 * @param {number} targetDuration - Target duration in seconds
 * @param {string} outputPath - Output audio path
 * @returns {Promise<string>} Path to output audio
 */
async function adjustToTargetDuration(audioPath, targetDuration, outputPath) {
    console.log(`[Audio] 🎯 Adjusting audio to match ${targetDuration}s duration...`);

    // Get current audio duration
    const metadata = await getAudioMetadata(audioPath);
    const currentDuration = metadata.duration;
    const speedFactor = currentDuration / targetDuration;

    console.log(`[Audio] Current: ${currentDuration}s, Target: ${targetDuration}s, Speed: ${speedFactor.toFixed(2)}x`);

    // Limit speed factor to reasonable range (0.5-2.0)
    const clampedSpeed = Math.max(0.5, Math.min(2.0, speedFactor));

    if (clampedSpeed !== speedFactor) {
        console.warn(`[Audio] ⚠️ Speed factor clamped from ${speedFactor.toFixed(2)}x to ${clampedSpeed.toFixed(2)}x`);
    }

    return await adjustSpeed(audioPath, clampedSpeed, outputPath);
}

/**
 * Normalize audio volume
 * @param {string} audioPath - Path to audio file
 * @param {string} outputPath - Output audio path
 * @param {number} targetLevel - Target level in dB (default: -20)
 * @returns {Promise<string>} Path to output audio
 */
async function normalizeVolume(audioPath, outputPath, targetLevel = -20) {
    console.log(`[Audio] 🔊 Normalizing audio volume to ${targetLevel}dB...`);

    return new Promise((resolve, reject) => {
        ffmpeg(audioPath)
            .audioFilters(`loudnorm=I=${targetLevel}:TP=-1.5:LRA=11`)
            .output(outputPath)
            .on('end', () => {
                console.log('[Audio] ✅ Volume normalized');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[Audio] ❌ Normalization failed:', err.message);
                reject(new Error(`Volume normalization failed: ${err.message}`));
            })
            .run();
    });
}

/**
 * Merge multiple audio segments with crossfade
 * @param {Array<string>} audioSegments - Array of audio file paths
 * @param {string} outputPath - Output audio path
 * @param {number} crossfadeDuration - Crossfade duration in seconds (default: 0.1)
 * @returns {Promise<string>} Path to merged audio
 */
async function mergeAudioSegments(audioSegments, outputPath, crossfadeDuration = 0.1) {
    console.log(`[Audio] 🔗 Merging ${audioSegments.length} audio segments...`);

    if (audioSegments.length === 0) {
        throw new Error('No audio segments to merge');
    }

    if (audioSegments.length === 1) {
        // Just copy the single file
        await fs.copyFile(audioSegments[0], outputPath);
        console.log('[Audio] ✅ Single segment copied');
        return outputPath;
    }

    // Create concat file for FFmpeg with proper Windows path handling
    const concatFilePath = path.join(path.dirname(outputPath), 'concat_list.txt');

    // Convert paths to absolute and escape for concat demuxer
    const concatContent = audioSegments
        .map(seg => {
            // Get absolute path
            const absPath = path.isAbsolute(seg) ? seg : path.resolve(seg);
            // Replace backslashes with forward slashes for FFmpeg
            const ffmpegPath = absPath.replace(/\\/g, '/');
            return `file '${ffmpegPath}'`;
        })
        .join('\n');

    await fs.writeFile(concatFilePath, concatContent, 'utf-8');
    console.log(`[Audio] Created concat file with ${audioSegments.length} segments`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatFilePath)
            .inputOptions(['-f concat', '-safe 0'])
            .audioCodec('libmp3lame')  // Use MP3 instead of AAC for better compatibility
            .audioBitrate('192k')
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('[Audio] FFmpeg merge command:', cmd);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`[Audio] Merging: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', async () => {
                // Clean up concat file
                await fs.unlink(concatFilePath).catch(() => { });
                console.log('[Audio] ✅ Segments merged successfully');
                resolve(outputPath);
            })
            .on('error', async (err) => {
                await fs.unlink(concatFilePath).catch(() => { });
                console.error('[Audio] ❌ Merge failed:', err.message);
                console.error('[Audio] Full error:', err);
                reject(new Error(`Audio merge failed: ${err.message}`));
            })
            .run();
    });
}

/**
 * Get audio metadata
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<object>} Audio metadata
 */
async function getAudioMetadata(audioPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) {
                reject(new Error(`Failed to get audio metadata: ${err.message}`));
            } else {
                const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
                resolve({
                    duration: parseFloat(metadata.format.duration),
                    bitrate: parseInt(metadata.format.bit_rate),
                    sampleRate: audioStream?.sample_rate,
                    channels: audioStream?.channels,
                    codec: audioStream?.codec_name,
                    size: parseInt(metadata.format.size)
                });
            }
        });
    });
}

/**
 * Split audio into segments by timestamps
 * @param {string} audioPath - Path to audio file
 * @param {Array} segments - Array of {start, end, outputPath}
 * @returns {Promise<Array<string>>} Array of output paths
 */
async function splitAudioBySegments(audioPath, segments) {
    console.log(`[Audio] ✂️ Splitting audio into ${segments.length} segments...`);

    const results = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const duration = segment.end - segment.start;

        await new Promise((resolve, reject) => {
            ffmpeg(audioPath)
                .setStartTime(segment.start)
                .setDuration(duration)
                .output(segment.outputPath)
                .on('end', () => {
                    console.log(`[Audio] ✅ Segment ${i + 1}/${segments.length} extracted`);
                    results.push(segment.outputPath);
                    resolve();
                })
                .on('error', (err) => {
                    console.error(`[Audio] ❌ Segment ${i + 1} failed:`, err.message);
                    reject(err);
                })
                .run();
        });
    }

    console.log(`[Audio] ✅ All segments extracted`);
    return results;
}

/**
 * Convert audio format
 * @param {string} inputPath - Input audio path
 * @param {string} outputPath - Output audio path
 * @param {string} format - Target format (mp3, wav, aac, etc.)
 * @returns {Promise<string>} Path to converted audio
 */
async function convertFormat(inputPath, outputPath, format) {
    console.log(`[Audio] 🔄 Converting audio to ${format}...`);

    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath);

        if (format === 'mp3') {
            command = command.audioCodec('libmp3lame').audioBitrate('192k');
        } else if (format === 'wav') {
            command = command.audioCodec('pcm_s16le');
        } else if (format === 'aac') {
            command = command.audioCodec('aac').audioBitrate('192k');
        }

        command
            .output(outputPath)
            .on('end', () => {
                console.log('[Audio] ✅ Format converted');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[Audio] ❌ Conversion failed:', err.message);
                reject(new Error(`Format conversion failed: ${err.message}`));
            })
            .run();
    });
}

/**
 * Check if FFmpeg is available
 * @returns {Promise<boolean>}
 */
async function checkFFmpegAvailable() {
    try {
        await execPromise('ffmpeg -version');
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    extractAudio,
    replaceAudio,
    adjustSpeed,
    adjustToTargetDuration,
    normalizeVolume,
    mergeAudioSegments,
    getAudioMetadata,
    splitAudioBySegments,
    convertFormat,
    checkFFmpegAvailable
};
