const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * Executes a command and returns a promise
 * @param {string} command - Command to execute
 * @returns {Promise<string>} - Promise that resolves with stdout
 */
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Command execution error: ${error.message}`);
                console.error(`Stderr: ${stderr}`);
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

/**
 * Downloads a YouTube video using yt-dlp
 * @param {string} youtubeUrl - YouTube video URL
 * @param {string} outputPath - Path where the video should be saved
 * @returns {Promise<string>} - Promise that resolves with the downloaded file path
 */
exports.downloadYouTubeVideo = async (youtubeUrl, outputPath) => {
    try {
        console.log(`🎬 Starting YouTube video download: ${youtubeUrl}`);
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });
        
        // Download command using yt-dlp
        const command = `yt-dlp --no-playlist --no-abort-on-error --output "${outputPath}" --recode-video mp4 "${youtubeUrl}"`;
        
        await execPromise(command);
        
        // Verify file exists
        try {
            await fs.access(outputPath);
            console.log(`✅ YouTube video downloaded successfully: ${outputPath}`);
            return outputPath;
        } catch (accessError) {
            throw new Error(`Downloaded file not accessible: ${outputPath}`);
        }
        
    } catch (error) {
        console.error(`❌ YouTube download failed: ${error.message}`);
        throw new Error(`Failed to download YouTube video: ${error.message}`);
    }
};

/**
 * Extracts video ID from YouTube URL
 * @param {string} youtubeUrl - YouTube video URL
 * @returns {string} - Video ID or generated fallback
 */
exports.extractVideoId = (youtubeUrl) => {
    try {
        // Try parsing as URL first
        const parsedUrl = new URL(youtubeUrl);
        if (parsedUrl.hostname.includes('youtube.com')) {
            const videoId = parsedUrl.searchParams.get('v');
            if (videoId) return videoId;
        } else if (parsedUrl.hostname.includes('youtu.be')) {
            const videoId = parsedUrl.pathname.substring(1);
            if (videoId) return videoId;
        }
    } catch (e) {
        // Fallback to regex if URL parsing fails
        const match = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    // Generate fallback ID
    return `yt-${Date.now()}`;
};

/**
 * Validates if a URL is a valid YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid YouTube URL
 */
exports.isValidYouTubeUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    
    // Basic YouTube URL patterns
    const youtubePatterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/(www\.)?youtu\.be\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
        /^https?:\/\/(www\.)?m\.youtube\.com\/watch\?v=[\w-]+/
    ];
    
    return youtubePatterns.some(pattern => pattern.test(url));
};

/**
 * Gets video metadata using yt-dlp
 * @param {string} youtubeUrl - YouTube video URL
 * @returns {Promise<Object>} - Video metadata
 */
exports.getVideoMetadata = async (youtubeUrl) => {
    try {
        const command = `yt-dlp --dump-json --no-playlist "${youtubeUrl}"`;
        const stdout = await execPromise(command);
        
        const metadata = JSON.parse(stdout);
        
        return {
            id: metadata.id,
            title: metadata.title,
            duration: metadata.duration,
            uploader: metadata.uploader,
            upload_date: metadata.upload_date,
            view_count: metadata.view_count,
            description: metadata.description,
            thumbnail: metadata.thumbnail
        };
    } catch (error) {
        console.error(`❌ Failed to get video metadata: ${error.message}`);
        throw new Error(`Failed to get video metadata: ${error.message}`);
    }
};

/**
 * Downloads audio only from YouTube video
 * @param {string} youtubeUrl - YouTube video URL
 * @param {string} outputPath - Path where the audio should be saved
 * @returns {Promise<string>} - Promise that resolves with the downloaded audio file path
 */
exports.downloadYouTubeAudio = async (youtubeUrl, outputPath) => {
    try {
        console.log(`🎵 Starting YouTube audio download: ${youtubeUrl}`);
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });
        
        // Download audio command using yt-dlp
        const command = `yt-dlp --extract-audio --audio-format wav --audio-quality 0 --output "${outputPath}" "${youtubeUrl}"`;
        
        await execPromise(command);
        
        // Verify file exists
        try {
            await fs.access(outputPath);
            console.log(`✅ YouTube audio downloaded successfully: ${outputPath}`);
            return outputPath;
        } catch (accessError) {
            throw new Error(`Downloaded audio file not accessible: ${outputPath}`);
        }
        
    } catch (error) {
        console.error(`❌ YouTube audio download failed: ${error.message}`);
        throw new Error(`Failed to download YouTube audio: ${error.message}`);
    }
};

/**
 * Checks if yt-dlp is available in the system
 * @returns {Promise<boolean>} - True if yt-dlp is available
 */
exports.checkYtDlpAvailability = async () => {
    try {
        await execPromise('yt-dlp --version');
        return true;
    } catch (error) {
        console.error('❌ yt-dlp not available:', error.message);
        return false;
    }
};

/**
 * Gets available formats for a YouTube video
 * @param {string} youtubeUrl - YouTube video URL
 * @returns {Promise<Array>} - Available formats
 */
exports.getAvailableFormats = async (youtubeUrl) => {
    try {
        const command = `yt-dlp --list-formats --dump-json "${youtubeUrl}"`;
        const stdout = await execPromise(command);
        
        const lines = stdout.trim().split('\n');
        const formats = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(format => format !== null);
        
        return formats;
    } catch (error) {
        console.error(`❌ Failed to get available formats: ${error.message}`);
        throw new Error(`Failed to get available formats: ${error.message}`);
    }
};
