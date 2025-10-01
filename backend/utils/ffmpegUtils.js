
const ffmpeg = require('fluent-ffmpeg');

function extractAudio(videoPath, audioPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .output(audioPath)
            .audioChannels(1) 
            .audioFrequency(16000) 
            .outputOptions('-preset ultrafast') 
            .on('end', () => {
                console.log(`✅ Audio extracted successfully: ${audioPath}`);
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