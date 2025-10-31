const express = require('express');
const router = express.Router();
const subtitleGenerator = require('../services/subtitleGenerator');
const subtitleBurner = require('../services/subtitleBurner');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/verifyToken');
const Job = require('../schemas/Job');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const subtitlesDir = path.join(uploadsDir, 'subtitles');
const videosDir = path.join(uploadsDir, 'videos');

async function ensureDirectories() {
  await fs.mkdir(subtitlesDir, { recursive: true });
  await fs.mkdir(videosDir, { recursive: true });
}

// Helper function to validate and clean MongoDB ObjectId
function validateObjectId(id, fieldName = 'ID') {
  if (!id) return null;
  
  const cleanId = id.toString().trim();
  
  // MongoDB ObjectId must be exactly 24 hexadecimal characters
  if (!/^[a-fA-F0-9]{24}$/.test(cleanId)) {
    throw new Error(
      `Invalid ${fieldName} format. Expected 24 hex characters, got: "${cleanId}" (${cleanId.length} chars)`
    );
  }
  
  return cleanId;
}

// Generate subtitles
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const { segments, jobId, format = 'srt', language = 'en' } = req.body;

    let actualSegments = segments;

    // If jobId is provided, fetch segments from database
    if (jobId && !segments) {
      try {
        // Validate and clean jobId (must be exactly 24 hex characters)
        const cleanJobId = validateObjectId(jobId, 'jobId');

        const job = await Job.findById(cleanJobId);
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }
        if (!job.segments || job.segments.length === 0) {
          return res.status(404).json({ error: 'No segments found in this job' });
        }
        actualSegments = job.segments;
        console.log(`✅ Loaded ${actualSegments.length} segments from job ${cleanJobId}`);
      } catch (error) {
        console.error('❌ Error fetching job:', error);
        // Check if it's a validation error
        if (error.message && error.message.includes('Invalid')) {
          return res.status(400).json({ 
            error: error.message
          });
        }
        return res.status(500).json({ 
          error: 'Error retrieving job information',
          details: error.message 
        });
      }
    }

    if (!actualSegments || !Array.isArray(actualSegments)) {
      return res.status(400).json({ error: 'Segments array or jobId is required' });
    }

    await ensureDirectories();

    const filename = `${uuidv4()}_${language}.${format}`;
    const outputPath = path.join(subtitlesDir, filename);

    await subtitleGenerator.saveSubtitleFile(actualSegments, format, outputPath);

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
    const { transcripts, jobId, languages, format = 'srt' } = req.body;

    let actualTranscripts = transcripts;
    let missingLanguages = [];
    let foundLanguages = [];

    // If jobId and languages are provided, build transcripts object from database
    if (jobId && languages && !transcripts) {
      try {
        const cleanJobId = validateObjectId(jobId, 'jobId');
        const job = await Job.findById(cleanJobId);
        
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        // Build transcripts object
        actualTranscripts = {};

        console.log(`📋 Processing languages: ${languages.join(', ')}`);
        console.log(`📊 Job has ${job.segments?.length || 0} original segments`);
        console.log(`📊 Job has ${job.translatedTranscript?.length || 0} translated transcript items`);
        console.log(`📊 Job targetLang: ${job.targetLang || 'N/A'}`);

        // Check schema structure
        if (job.translatedTranscript && job.translatedTranscript.length > 0) {
          const firstItem = job.translatedTranscript[0];
          const isNewSchema = !!firstItem.language;
          console.log(`📊 Schema type: ${isNewSchema ? 'NEW (with language field)' : 'OLD (flat array)'}`);
        }

        for (const lang of languages) {
          if (lang === 'original' || lang === 'en') {
            // Use original segments for English or 'original'
            if (!job.segments || job.segments.length === 0) {
              console.warn(`⚠️ No original segments found for job ${cleanJobId}`);
              missingLanguages.push({ language: lang, reason: 'No original segments in job' });
              continue;
            }
            actualTranscripts[lang] = job.segments.map(seg => ({
              start: seg.start,
              end: seg.end,
              text: seg.text
            }));
            foundLanguages.push(lang);
            console.log(`✅ Added original segments for language: ${lang} (${actualTranscripts[lang].length} segments)`);
          } else {
            // Look for translated transcripts
            if (!job.translatedTranscript || job.translatedTranscript.length === 0) {
              console.warn(`⚠️ No translated transcripts found for job ${cleanJobId}`);
              missingLanguages.push({ language: lang, reason: 'Job has no translations at all' });
              continue;
            }

            console.log(`🔍 Looking for translation in language: ${lang}`);
            
            // Check if using NEW schema (with language field) or OLD schema (flat array)
            const firstItem = job.translatedTranscript[0];
            const isNewSchema = !!firstItem.language;

            if (isNewSchema) {
              // NEW SCHEMA: Array of { language, segments[], translatedAt }
              console.log(`📚 Available translations (NEW schema):`, job.translatedTranscript.map(t => t.language));
              
              const translation = job.translatedTranscript.find(t => t.language === lang);
              
              if (!translation) {
                console.warn(`⚠️ No translation found for language: ${lang}`);
                missingLanguages.push({ 
                  language: lang, 
                  reason: `Translation not found. Available: [${job.translatedTranscript.map(t => t.language).join(', ')}]`
                });
                continue;
              }

              const segments = translation.segments;
              
              if (!Array.isArray(segments) || segments.length === 0) {
                console.warn(`⚠️ Invalid segments for language: ${lang}`);
                missingLanguages.push({ language: lang, reason: 'Translation found but segments are invalid or empty' });
                continue;
              }

              actualTranscripts[lang] = segments.map(seg => ({
                start: seg.start,
                end: seg.end,
                text: seg.translatedText || seg.text
              }));
              foundLanguages.push(lang);
              console.log(`✅ Added translated segments for language: ${lang} (${actualTranscripts[lang].length} segments)`);
            } else {
              // OLD SCHEMA: Flat array with targetLang at Job level
              console.log(`📚 Using OLD schema with targetLang: ${job.targetLang}`);
              
              // Check if requested language matches job.targetLang
              if (job.targetLang === lang) {
                actualTranscripts[lang] = job.translatedTranscript.map(seg => ({
                  start: seg.start,
                  end: seg.end,
                  text: seg.translatedText || seg.text
                }));
                foundLanguages.push(lang);
                console.log(`✅ Added translated segments for language: ${lang} from OLD schema (${actualTranscripts[lang].length} segments)`);
              } else {
                console.warn(`⚠️ OLD schema only supports targetLang: ${job.targetLang}, requested: ${lang}`);
                missingLanguages.push({ 
                  language: lang, 
                  reason: `OLD schema only has translation for '${job.targetLang}'`
                });
              }
            }
          }
        }

        if (Object.keys(actualTranscripts).length === 0) {
          return res.status(404).json({ 
            error: 'No valid transcripts found for the specified languages',
            requestedLanguages: languages,
            missingLanguages: missingLanguages
          });
        }

        console.log(`✅ Built transcripts for ${Object.keys(actualTranscripts).length}/${languages.length} languages from job ${cleanJobId}`);
        console.log(`✅ Found languages: ${foundLanguages.join(', ')}`);
        if (missingLanguages.length > 0) {
          console.log(`⚠️ Missing languages: ${missingLanguages.map(m => `${m.language} (${m.reason})`).join(', ')}`);
        }
      } catch (error) {
        console.error('❌ Error building transcripts from job:', error);
        // Check if it's a validation error
        if (error.message && error.message.includes('Invalid')) {
          return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ 
          error: 'Error retrieving job transcripts',
          details: error.message 
        });
      }
    }

    if (!actualTranscripts || typeof actualTranscripts !== 'object') {
      return res.status(400).json({ 
        error: 'Transcripts object OR (jobId + languages array) is required' 
      });
    }

    await ensureDirectories();

    const subtitleJobId = uuidv4();
    const jobDir = path.join(subtitlesDir, subtitleJobId);
    await fs.mkdir(jobDir, { recursive: true });

    const results = await subtitleGenerator.generateMultiLanguageSubtitles(actualTranscripts, jobDir);

    const response = {};
    for (const [lang, paths] of Object.entries(results)) {
      response[lang] = {
        srt: `/uploads/subtitles/${subtitleJobId}/${lang}.srt`,
        vtt: `/uploads/subtitles/${subtitleJobId}/${lang}.vtt`
      };
    }

    const successResponse = {
      success: true,
      jobId: subtitleJobId,
      subtitles: response
    };

    // Add warning if some languages were not found (only when using jobId)
    if (jobId && languages && missingLanguages && missingLanguages.length > 0) {
      successResponse.warning = `Some languages were not found: ${missingLanguages.map(m => m.language).join(', ')}`;
      successResponse.missingLanguages = missingLanguages;
      successResponse.foundLanguages = foundLanguages;
    }

    res.json(successResponse);
  } catch (error) {
    console.error('Error generating multi-language subtitles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Burn subtitles
router.post('/burn', verifyToken, async (req, res) => {
  try {
    const { videoPath, subtitlePath, jobId, subtitleFile, options = {} } = req.body;

    let actualVideoPath = videoPath;
    let actualSubtitlePath = subtitlePath;

    // If jobId is provided, get video path from database
    if (jobId && !videoPath) {
      try {
        const cleanJobId = validateObjectId(jobId, 'jobId');
        const job = await Job.findById(cleanJobId);
        
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }
        
        if (!job.videoFileName) {
          return res.status(404).json({ error: 'Video file not associated with this job' });
        }
        
        actualVideoPath = `/uploads/${job.videoFileName}`;
        console.log(`✅ Using video from job: ${actualVideoPath}`);
      } catch (error) {
        console.error('❌ Error fetching job for burn:', error);
        if (error.message && error.message.includes('Invalid')) {
          return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ 
          error: 'Error retrieving job information',
          details: error.message 
        });
      }
    }

    // Use subtitleFile if provided instead of subtitlePath
    if (subtitleFile && !subtitlePath) {
      actualSubtitlePath = subtitleFile.startsWith('/') ? subtitleFile : `/${subtitleFile}`;
      console.log(`✅ Using subtitle file: ${actualSubtitlePath}`);
    }

    if (!actualVideoPath || !actualSubtitlePath) {
      return res.status(400).json({ 
        error: 'videoPath and subtitlePath (or jobId and subtitleFile) are required' 
      });
    }

    await ensureDirectories();

    const videoFilePath = path.join(uploadsDir, actualVideoPath.replace('/uploads/', ''));
    const subtitleFilePath = path.join(uploadsDir, actualSubtitlePath.replace('/uploads/', ''));

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
    const { videoPath, jobId } = req.query;

    let actualVideoPath = videoPath;

    // If jobId is provided, get video path from database
    if (jobId && !videoPath) {
      try {
        const cleanJobId = validateObjectId(jobId, 'jobId');
        const job = await Job.findById(cleanJobId);
        
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }
        
        if (!job.videoFileName) {
          return res.status(404).json({ error: 'Video file not associated with this job' });
        }
        
        actualVideoPath = `/uploads/${job.videoFileName}`;
        console.log(`✅ Getting video info for job: ${actualVideoPath}`);
      } catch (error) {
        console.error('❌ Error fetching job for video-info:', error);
        if (error.message && error.message.includes('Invalid')) {
          return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ 
          error: 'Error retrieving job information',
          details: error.message 
        });
      }
    }

    if (!actualVideoPath) {
      return res.status(400).json({ error: 'videoPath or jobId is required' });
    }

    const videoFilePath = path.join(uploadsDir, actualVideoPath.replace('/uploads/', ''));
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
