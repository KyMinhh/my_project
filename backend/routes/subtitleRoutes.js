const express = require('express');
const router = express.Router();
const subtitleGenerator = require('../services/subtitleGenerator');
const subtitleBurner = require('../services/subtitleBurner');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/verifyToken');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const subtitlesDir = path.join(uploadsDir, 'subtitles');
const videosDir = path.join(uploadsDir, 'videos');

async function ensureDirectories() {
  await fs.mkdir(subtitlesDir, { recursive: true });
  await fs.mkdir(videosDir, { recursive: true });
}

// Generate subtitles
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const { segments, format = 'srt', language = 'en' } = req.body;

    if (!segments || !Array.isArray(segments)) {
      return res.status(400).json({ error: 'Segments array is required' });
    }

    await ensureDirectories();

    const filename = `${uuidv4()}_${language}.${format}`;
    const outputPath = path.join(subtitlesDir, filename);

    await subtitleGenerator.saveSubtitleFile(segments, format, outputPath);

    res.json({
      success: true,
      subtitlePath: `/uploads/subtitles/${filename}`,
      format,
      language
    });
  } catch (error) {
    console.error('Error generating subtitles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate multi-language subtitles
router.post('/generate-multi', verifyToken, async (req, res) => {
  try {
    const { transcripts } = req.body;

    if (!transcripts || typeof transcripts !== 'object') {
      return res.status(400).json({ error: 'Transcripts object is required with language keys' });
    }

    await ensureDirectories();

    const jobId = uuidv4();
    const jobDir = path.join(subtitlesDir, jobId);
    await fs.mkdir(jobDir, { recursive: true });

    const results = await subtitleGenerator.generateMultiLanguageSubtitles(transcripts, jobDir);

    const response = {};
    for (const [lang, paths] of Object.entries(results)) {
      response[lang] = {
        srt: `/uploads/subtitles/${jobId}/${lang}.srt`,
        vtt: `/uploads/subtitles/${jobId}/${lang}.vtt`
      };
    }

    res.json({
      success: true,
      jobId,
      subtitles: response
    });
  } catch (error) {
    console.error('Error generating multi-language subtitles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Burn subtitles
router.post('/burn', verifyToken, async (req, res) => {
  try {
    const { videoPath, subtitlePath, options = {} } = req.body;

    if (!videoPath || !subtitlePath) {
      return res.status(400).json({ error: 'videoPath and subtitlePath are required' });
    }

    await ensureDirectories();

    const videoFilePath = path.join(uploadsDir, videoPath.replace('/uploads/', ''));
    const subtitleFilePath = path.join(uploadsDir, subtitlePath.replace('/uploads/', ''));

    const videoExists = await fs.access(videoFilePath).then(() => true).catch(() => false);
    const subtitleExists = await fs.access(subtitleFilePath).then(() => true).catch(() => false);

    if (!videoExists) {
      return res.status(404).json({ error: 'Video file not found' });
    }
    if (!subtitleExists) {
      return res.status(404).json({ error: 'Subtitle file not found' });
    }

    const outputFilename = `${uuidv4()}_burned.mp4`;
    const outputPath = path.join(videosDir, outputFilename);

    await subtitleBurner.hardBurnSubtitle(videoFilePath, subtitleFilePath, outputPath, options);

    const stats = await fs.stat(outputPath);

    res.json({
      success: true,
      videoPath: `/uploads/videos/${outputFilename}`,
      fileSize: stats.size
    });
  } catch (error) {
    console.error('Error burning subtitles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Burn subtitles direct
router.post('/burn-direct', verifyToken, async (req, res) => {
  try {
    const { videoPath, segments, language = 'en', format = 'srt', options = {} } = req.body;

    if (!videoPath || !segments || !Array.isArray(segments)) {
      return res.status(400).json({ error: 'videoPath and segments array are required' });
    }

    await ensureDirectories();

    const videoFilePath = path.join(uploadsDir, videoPath.replace('/uploads/', ''));
    const videoExists = await fs.access(videoFilePath).then(() => true).catch(() => false);

    if (!videoExists) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const jobId = uuidv4();
    const jobDir = path.join(subtitlesDir, jobId);
    await fs.mkdir(jobDir, { recursive: true });

    const subtitleFilename = `${language}.${format}`;
    const subtitleFilePath = path.join(jobDir, subtitleFilename);

    await subtitleGenerator.saveSubtitleFile(segments, format, subtitleFilePath);

    const outputFilename = `${uuidv4()}_burned_${language}.mp4`;
    const outputPath = path.join(videosDir, outputFilename);

    await subtitleBurner.hardBurnSubtitle(videoFilePath, subtitleFilePath, outputPath, options);

    const stats = await fs.stat(outputPath);

    res.json({
      success: true,
      videoPath: `/uploads/videos/${outputFilename}`,
      subtitlePath: `/uploads/subtitles/${jobId}/${subtitleFilename}`,
      fileSize: stats.size,
      language
    });
  } catch (error) {
    console.error('Error burning subtitles directly:', error);
    res.status(500).json({ error: error.message });
  }
});

// Embed subtitles
router.post('/embed', verifyToken, async (req, res) => {
  try {
    const { videoPath, subtitles, defaultLanguage = 'en' } = req.body;

    if (!videoPath || !subtitles || typeof subtitles !== 'object') {
      return res.status(400).json({ error: 'videoPath and subtitles object are required' });
    }

    await ensureDirectories();

    const videoFilePath = path.join(uploadsDir, videoPath.replace('/uploads/', ''));
    const videoExists = await fs.access(videoFilePath).then(() => true).catch(() => false);

    if (!videoExists) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const subtitlePaths = {};
    for (const [lang, subtitlePath] of Object.entries(subtitles)) {
      const fullPath = path.join(uploadsDir, subtitlePath.replace('/uploads/', ''));
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      if (exists) {
        subtitlePaths[lang] = fullPath;
      }
    }

    if (Object.keys(subtitlePaths).length === 0) {
      return res.status(400).json({ error: 'No valid subtitle files found' });
    }

    const outputFilename = `${uuidv4()}_embedded.mp4`;
    const outputPath = path.join(videosDir, outputFilename);

    await subtitleBurner.burnMultiLanguageSubtitles(
      videoFilePath,
      subtitlePaths,
      outputPath,
      { defaultLanguage }
    );

    const stats = await fs.stat(outputPath);

    res.json({
      success: true,
      videoPath: `/uploads/videos/${outputFilename}`,
      fileSize: stats.size,
      languages: Object.keys(subtitlePaths)
    });
  } catch (error) {
    console.error('Error embedding subtitles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get video info
router.get('/video-info', verifyToken, async (req, res) => {
  try {
    const { videoPath } = req.query;

    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    const videoFilePath = path.join(uploadsDir, videoPath.replace('/uploads/', ''));
    const videoExists = await fs.access(videoFilePath).then(() => true).catch(() => false);

    if (!videoExists) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const info = await subtitleBurner.getVideoInfo(videoFilePath);

    res.json({
      success: true,
      info
    });
  } catch (error) {
    console.error('Error getting video info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download subtitle
router.get('/download', verifyToken, async (req, res) => {
  try {
    const { subtitlePath } = req.query;

    if (!subtitlePath) {
      return res.status(400).json({ error: 'subtitlePath is required' });
    }

    const filePath = path.join(uploadsDir, subtitlePath.replace('/uploads/', ''));
    const exists = await fs.access(filePath).then(() => true).catch(() => false);

    if (!exists) {
      return res.status(404).json({ error: 'Subtitle file not found' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Error downloading subtitle:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
