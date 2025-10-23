const express = require('express');
const fs = require('fs').promises;
const fsp = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { verifyToken } = require('../middleware/verifyToken');

const router = express.Router();

const projectRootBackend = path.join(__dirname, '..');
const uploadsDir = path.join(projectRootBackend, 'uploads');
const outputsDir = path.join(projectRootBackend, 'outputs');
const tempClipsDir = path.join(outputsDir, 'temp_clips');

// Helper function for similarity comparison
function diceCoefficient(str1, str2) {
    const bigrams1 = new Set();
    const bigrams2 = new Set();
    
    for (let i = 0; i < str1.length - 1; i++) {
        bigrams1.add(str1.substring(i, i + 2));
    }
    for (let i = 0; i < str2.length - 1; i++) {
        bigrams2.add(str2.substring(i, i + 2));
    }
    
    const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
    return (2.0 * intersection.size) / (bigrams1.size + bigrams2.size);
}

// Helper function to cut single segment
async function cutSingleSegment(videoInputPath, startTime, endTime, outputSegmentPath) {
    return new Promise((resolve, reject) => {
        const duration = endTime - startTime;
        if (duration <= 0) {
            return reject(new Error(`Invalid duration for segment: startTime ${startTime}, endTime ${endTime}`));
        }

        console.log(`🎬 Preparing to cut segment: ${outputSegmentPath} from ${startTime}s with duration ${duration}s`);

        ffmpeg()
            .input(videoInputPath)
            .inputOptions([`-ss ${startTime}`])
            .outputOptions([
                `-t ${duration}`,
                "-c:v libx264",
                "-preset ultrafast",
                "-tune zerolatency",
                "-crf 28",
                "-c:a aac",
                "-b:a 128k",
                "-avoid_negative_ts make_zero",
                "-y"
            ])
            .output(outputSegmentPath)
            .on('start', function (commandLine) {
                console.log(`🚀 Spawned Ffmpeg (cut) with command: ${commandLine}`);
            })
            .on('end', () => {
                console.log(`✅ Segment cut successfully: ${outputSegmentPath}`);
                resolve(outputSegmentPath);
            })
            .on('error', (err, stdout, stderr) => {
                console.error(`❌ Error cutting segment ${outputSegmentPath}:`, err.message);
                if (stdout) console.error('FFmpeg stdout:', stdout);
                if (stderr) console.error('FFmpeg stderr:', stderr);
                reject(new Error(`FFmpeg error cutting ${outputSegmentPath}: ${err.message}`));
            })
            .run();
    });
}

// Helper function to concatenate segments
async function concatenateSegments(segmentFilePaths, finalOutputPath) {
    return new Promise(async (resolve, reject) => {
        if (!segmentFilePaths || segmentFilePaths.length === 0) {
            return reject(new Error("No segment file paths provided for concatenation."));
        }
        console.log(`🔗 Concatenating ${segmentFilePaths.length} segments into: ${finalOutputPath}`);

        const listFileName = `concat_list_${Date.now()}.txt`;
        const listFilePath = path.join(tempClipsDir, listFileName);
        const fileListContent = segmentFilePaths.map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n');

        try {
            await fs.writeFile(listFilePath, fileListContent);
            console.log(`Generated concat list file: ${listFilePath} with content:\n${fileListContent}`);
        } catch (writeErr) {
            return reject(new Error(`Failed to write concatenation list: ${writeErr.message}`));
        }

        ffmpeg()
            .input(listFilePath)
            .inputOptions(['-f concat', '-safe 0'])
            .outputOptions(["-c copy"])
            .output(finalOutputPath)
            .on('start', function (commandLine) {
                console.log(`🚀 Spawned Ffmpeg (concat) with command: ${commandLine}`);
            })
            .on('end', async () => {
                console.log(`✅ Concatenation successful: ${finalOutputPath}`);
                try {
                    await fs.unlink(listFilePath);
                    for (const segmentPath of segmentFilePaths) {
                        try { await fs.unlink(segmentPath); }
                        catch (e) { console.warn(`Could not delete temp segment: ${segmentPath}`, e.message); }
                    }
                    console.log("Deleted temporary segment files and concat list.");
                } catch (cleanupErr) {
                    console.warn("⚠️ Error cleaning up temporary files:", cleanupErr.message);
                }
                resolve(finalOutputPath);
            })
            .on('error', async (err, stdout, stderr) => {
                console.error(`❌ Error concatenating segments for ${finalOutputPath}:`, err.message);
                if (stdout) console.error('FFmpeg stdout (concat):', stdout);
                if (stderr) console.error('FFmpeg stderr (concat):', stderr);
                try { await fs.unlink(listFilePath); } catch (e) { }
                reject(new Error(`FFmpeg concatenation error: ${err.message}`));
            })
            .run();
    });
}

// Find timestamp
router.post('/find-timestamp', verifyToken, async (req, res) => {
    const { text, videoPath } = req.body;

    if (!text || text.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Search text cannot be empty." });
    }
    if (!videoPath) {
        return res.status(400).json({ success: false, message: "videoPath is required." });
    }

    const normalizedSearchText = text.toLowerCase().trim();
    const transcriptFilePath = path.join(projectRootBackend, "outputs", "transcription.json");

    try {
        const fileExists = await fs.access(transcriptFilePath).then(() => true).catch(() => false);
        if (!fileExists) {
            return res.status(404).json({ success: false, message: "Transcript file not found!" });
        }

        const transcriptData = JSON.parse(await fsp.readFile(transcriptFilePath, "utf8"));

        if (!transcriptData.results || transcriptData.results.length === 0) {
            return res.status(404).json({ success: false, message: "Transcript is empty or invalid." });
        }

        let bestMatch = null;
        let highestSimilarity = -1;

        for (const result of transcriptData.results) {
            for (const alternative of result.alternatives) {
                if (alternative.words && alternative.words.length > 0) {
                    const words = alternative.words;
                    for (let i = 0; i < words.length; i++) {
                        let currentPhrase = '';
                        let phraseStartTime = null;
                        let phraseEndTime = null;
                        for (let j = i; j < words.length; j++) {
                            currentPhrase += (j > i ? ' ' : '') + words[j].word.toLowerCase();
                            if (phraseStartTime === null) phraseStartTime = parseFloat(words[j].startTime.seconds || '0') + parseFloat(words[j].startTime.nanos || '0') / 1e9;
                            phraseEndTime = parseFloat(words[j].endTime.seconds || '0') + parseFloat(words[j].endTime.nanos || '0') / 1e9;

                            const similarity = diceCoefficient(normalizedSearchText, currentPhrase);

                            if (similarity > highestSimilarity) {
                                highestSimilarity = similarity;
                                bestMatch = {
                                    startTime: phraseStartTime,
                                    endTime: phraseEndTime,
                                    transcript: words.slice(i, j + 1).map(w => w.word).join(' '),
                                    confidence: similarity
                                };
                            }
                            if (currentPhrase.length > normalizedSearchText.length + 20) break;
                        }
                    }
                } else {
                    console.warn("No word timings, falling back to segment matching might be inaccurate.");
                }
            }
        }

        if (bestMatch && highestSimilarity > 0.5) {
            res.status(200).json({
                success: true,
                data: {
                    startTime: bestMatch.startTime,
                    endTime: bestMatch.endTime,
                    transcript: bestMatch.transcript,
                    videoPath: videoPath
                },
                message: "Timestamp found."
            });
        } else {
            res.status(404).json({
                success: false,
                message: "No matching timestamp found with sufficient similarity."
            });
        }
    } catch (error) {
        console.error("❌ Error finding timestamp:", error);
        res.status(500).json({
            success: false,
            message: "Error processing timestamp search!",
            details: error.message
        });
    }
});

// Extract single video segment
router.post('/extract-video', verifyToken, async (req, res) => {
    const { startTime, endTime, videoPath } = req.body;

    if (startTime === undefined || endTime === undefined || !videoPath) {
        return res.status(400).json({ success: false, message: "Missing startTime, endTime, or videoPath." });
    }

    try {
        await fsp.access(videoPath);
    } catch (error) {
        console.error(`❌ Video file not found at path: ${videoPath}`, error);
        return res.status(404).json({ success: false, message: "Video file not found on server!" });
    }

    const outputFileName = `extracted-${Date.now()}.mp4`;
    const outputVideoPath = path.join(projectRootBackend, 'outputs', outputFileName);

    console.log(`🎬 Extracting video segment from ${startTime}s to ${endTime}s for ${videoPath}`);

    new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .inputOptions([`-ss ${startTime}`])
            .outputOptions([
                `-to ${endTime}`,
                "-c:v libx264",
                "-c:a aac",
                "-preset veryfast",
                "-crf 23",
                "-movflags +faststart"
            ])
            .output(outputVideoPath)
            .on('end', () => {
                console.log(`✅ Video segment extracted successfully: ${outputVideoPath}`);
                resolve(`/outputs/${outputFileName}`);
            })
            .on('error', (err) => {
                console.error("❌ Error extracting video segment:", err);
                reject(err);
            })
            .run();
    })
        .then(videoUrl => {
            res.status(200).json({ success: true, data: { videoUrl: videoUrl }, message: "Video segment extracted successfully" });
        })
        .catch(err => {
            res.status(500).json({ success: false, message: "Error extracting video segment.", details: err.message });
        });
});

// Extract multiple video segments
router.post('/extract-multiple-segments', verifyToken, async (req, res, next) => {
    const { videoFileName, segments } = req.body;

    if (!videoFileName || typeof videoFileName !== 'string' || videoFileName.trim() === '') {
        return res.status(400).json({ success: false, status: 400, message: "videoFileName is required." });
    }
    if (!Array.isArray(segments) || segments.length === 0) {
        return res.status(400).json({ success: false, status: 400, message: "Segments must be a non-empty array." });
    }

    const cleanVideoFileName = path.basename(videoFileName);
    const originalVideoPath = path.join(uploadsDir, cleanVideoFileName);
    const originalNameWithoutExt = path.parse(cleanVideoFileName).name;

    try {
        await fs.access(originalVideoPath);
    } catch (error) {
        return res.status(404).json({ success: false, status: 404, message: `Original video '${cleanVideoFileName}' not found.` });
    }

    const processableSegments = segments.filter(seg =>
        typeof seg.startTime === 'number' && typeof seg.endTime === 'number' && seg.startTime >= 0 && seg.endTime > seg.startTime
    );

    if (processableSegments.length === 0) {
        return res.status(400).json({ success: false, status: 400, message: "No valid segments provided to process." });
    }

    const shouldUseTempDirAndConcatenate = processableSegments.length >= 2;

    try {
        await fs.mkdir(outputsDir, { recursive: true });
        if (shouldUseTempDirAndConcatenate) {
            await fs.mkdir(tempClipsDir, { recursive: true });
        }
    } catch (mkdirError) {
        console.error(`❌ Could not create output/temp directories`, mkdirError);
        const err = new Error('Failed to prepare output directories.'); err.status = 500;
        return next(err);
    }

    const individualSegmentPromises = [];
    const tempSegmentFilePaths = [];
    const failedSegmentsInfo = [];

    for (let i = 0; i < processableSegments.length; i++) {
        const segment = processableSegments[i];
        const { startTime, endTime } = segment;

        const segmentOutputFileName = `seg_${originalNameWithoutExt}_${i + 1}_${Date.now()}.mp4`;
        const outputSegmentPath = path.join(shouldUseTempDirAndConcatenate ? tempClipsDir : outputsDir, segmentOutputFileName);

        individualSegmentPromises.push(
            cutSingleSegment(originalVideoPath, startTime, endTime, outputSegmentPath)
                .then((fullPath) => {
                    tempSegmentFilePaths.push(fullPath);
                })
                .catch(err => {
                    failedSegmentsInfo.push({ segmentIndex: segments.findIndex(s => s === segment), startTime, endTime, error: err.message });
                })
        );
    }

    try {
        await Promise.all(individualSegmentPromises);

        if (tempSegmentFilePaths.length === 0) {
            return res.status(500).json({
                success: false, status: 500, message: "No segments were successfully cut. Check server logs.",
                errors: failedSegmentsInfo
            });
        }

        if (shouldUseTempDirAndConcatenate && tempSegmentFilePaths.length >= 1) {
            const finalConcatenatedFileName = `merged-${originalNameWithoutExt}-${Date.now()}.mp4`;
            const finalOutputPath = path.join(outputsDir, finalConcatenatedFileName);

            try {
                await concatenateSegments(tempSegmentFilePaths, finalOutputPath);
                const relativeConcatenatedPath = `/outputs/${finalConcatenatedFileName}`;
                let message = `Successfully concatenated ${tempSegmentFilePaths.length} segments.`;
                if (failedSegmentsInfo.length > 0) message += ` ${failedSegmentsInfo.length} other segment(s) failed prior to concatenation.`;

                return res.status(200).json({
                    success: true, status: 200, message: message,
                    data: { clips: [relativeConcatenatedPath] },
                    ...(failedSegmentsInfo.length > 0 && { errors: failedSegmentsInfo })
                });
            } catch (concatError) {
                console.error("Concatenation failed:", concatError);
                for (const tempPath of tempSegmentFilePaths) {
                    try { await fs.unlink(tempPath); } catch (e) { console.warn(`Could not delete temp segment on concat error: ${tempPath}`, e.message); }
                }
                return res.status(500).json({
                    success: false, status: 500, message: `Failed to concatenate segments: ${concatError.message}`,
                    errors: failedSegmentsInfo
                });
            }
        } else {
            const relativePaths = tempSegmentFilePaths.map(fullPath => `/outputs/${path.basename(fullPath)}`);
            const httpStatus = tempSegmentFilePaths.length === processableSegments.length ? 200 : 207;
            let message = tempSegmentFilePaths.length === processableSegments.length
                ? "Segment(s) cut successfully as individual clip(s)."
                : `Successfully cut ${tempSegmentFilePaths.length} out of ${processableSegments.length} processable segments as individual clip(s).`;
            if (failedSegmentsInfo.length > 0) message += ` ${failedSegmentsInfo.length} segment(s) failed.`;

            return res.status(httpStatus).json({
                success: true, status: httpStatus, message: message,
                data: { clips: relativePaths },
                ...(failedSegmentsInfo.length > 0 && { errors: failedSegmentsInfo })
            });
        }
    } catch (error) {
        console.error("❌ Error in final processing step:", error);
        next(error);
    }
});

module.exports = router;