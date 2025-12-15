const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
const genAI = process.env.GOOGLE_AI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    : null;

let workingModel = null;
const modelsToTry = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest'
];

/**
 * Analyze transcript and detect viral-worthy moments
 * @param {string} transcript - Full transcript with timestamps
 * @param {Array} segments - Array of {start, end, text} segments
 * @returns {Promise<Array>} - Array of viral moment candidates with scores
 */
async function analyzeViralMoments(transcript, segments) {
    if (!genAI) {
        throw new Error('Google AI API key not configured');
    }

    if (!transcript || !segments || segments.length === 0) {
        throw new Error('Transcript and segments are required');
    }

    console.log(`[Viral Analysis] 🎬 Analyzing ${segments.length} segments for viral potential...`);
    const startTime = Date.now();

    // Try cached model first
    if (workingModel) {
        try {
            return await analyzeWithModel(workingModel, transcript, segments, startTime);
        } catch (error) {
            console.log(`[Viral Analysis] ⚠️ Cached model failed, trying alternatives...`);
            workingModel = null;
        }
    }

    // Try models in order
    for (const modelName of modelsToTry) {
        try {
            console.log(`[Viral Analysis] 🔄 Trying model: ${modelName}...`);
            const result = await analyzeWithModel(modelName, transcript, segments, startTime);
            workingModel = modelName;
            console.log(`[Viral Analysis] ✅ Model ${modelName} works!`);
            return result;
        } catch (error) {
            console.log(`[Viral Analysis] ❌ Model ${modelName} failed`);
        }
    }

    throw new Error('All Gemini models failed for viral analysis');
}

/**
 * Analyze with specific Gemini model
 */
async function analyzeWithModel(modelName, transcript, segments, startTime) {
    const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2000,
        }
    });

    const prompt = buildViralAnalysisPrompt(transcript, segments);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();

    // Parse AI response to structured data
    const viralMoments = parseViralMomentsResponse(analysisText, segments);

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Viral Analysis] ✅ Analysis completed in ${processingTime}s, found ${viralMoments.length} viral moments`);

    return {
        viralMoments: viralMoments,
        model: modelName,
        processingTime: parseFloat(processingTime),
        rawAnalysis: analysisText
    };
}

/**
 * Build comprehensive viral analysis prompt
 */
function buildViralAnalysisPrompt(transcript, segments) {
    // Format segments with indices
    const segmentsText = segments.map((seg, idx) => 
        `[${idx}] (${formatTime(seg.start)} - ${formatTime(seg.end)}): ${seg.text}`
    ).join('\n');

    return `You are an expert social media content strategist specializing in viral short-form video content (TikTok, YouTube Shorts, Instagram Reels).

TASK: Analyze this video transcript and identify the TOP 5 MOST VIRAL-WORTHY moments for creating 15-60 second clips.

VIDEO TRANSCRIPT WITH TIMESTAMPS:
${segmentsText}

ANALYSIS CRITERIA:
For each potential viral clip, evaluate:

1. **Hook Strength (0-100)**: How attention-grabbing are the first 3 seconds?
   - Does it start with a question, bold statement, or intriguing visual cue?
   - Would viewers stop scrolling?

2. **Emotional Peak**: What emotion does it evoke?
   - Options: funny, inspiring, shocking, educational, dramatic, controversial, heartwarming, motivational, informative, entertaining, emotional

3. **Story Arc**: Does it have narrative structure?
   - complete: Full story with beginning, middle, end
   - cliffhanger: Leaves viewers wanting more
   - teaser: Previews something interesting
   - insight: Delivers quick valuable information

4. **Viral Elements**: What makes it shareable?
   - surprise, humor, controversy, relatability, inspiration, shock_value, educational_value, before_after, hack_tip, emotional_moment

5. **Quotable Moment**: Most memorable/shareable quote (if any)

6. **Platform Fit**: Which platforms suit this clip best?
   - tiktok, youtube-shorts, instagram-reels, facebook-reels, twitter

7. **Viral Score (0-100)**: Overall viral potential based on all factors

8. **Suggested Hashtags**: 5-10 relevant trending hashtags

RESPONSE FORMAT (JSON):
Return ONLY valid JSON array with top 5 moments, no additional text:

[
  {
    "segmentIndex": 0,
    "startTime": 12.5,
    "endTime": 45.2,
    "duration": 32.7,
    "viralScore": 95,
    "hookStrength": 90,
    "emotionalPeak": "funny",
    "storyArc": "complete",
    "quotableMoment": "The exact memorable quote from this segment",
    "viralElements": ["humor", "surprise", "relatability"],
    "suggestedPlatforms": ["tiktok", "instagram-reels"],
    "hashtags": ["#viral", "#fyp", "#funny", "#relatable", "#trending"],
    "title": "Catchy clip title (under 60 chars)",
    "reason": "Brief explanation why this moment is viral-worthy"
  }
]

IMPORTANT:
- Focus on moments with COMPLETE thoughts (not cut mid-sentence)
- Prefer 15-45 second clips (optimal for social platforms)
- Prioritize strong hooks - first 3 seconds are critical
- Consider cultural context for Vietnamese and international audiences
- Return ONLY the JSON array, no markdown formatting or extra text

TOP 5 VIRAL MOMENTS:`;
}

/**
 * Parse Gemini's response into structured viral moments
 */
function parseViralMomentsResponse(analysisText, segments) {
    try {
        // Clean response - remove markdown code blocks if present
        let cleanText = analysisText.trim();
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Parse JSON
        const parsed = JSON.parse(cleanText);
        
        // Validate and enrich data
        const viralMoments = Array.isArray(parsed) ? parsed : [parsed];
        
        return viralMoments.map(moment => {
            // Get corresponding segment
            const segment = segments[moment.segmentIndex] || segments[0];
            
            // Validate and normalize emotional peak
            const validEmotions = ['funny', 'inspiring', 'shocking', 'educational', 'dramatic', 'controversial', 'heartwarming', 'motivational', 'informative', 'entertaining', 'emotional'];
            const normalizedEmotion = validEmotions.includes(moment.emotionalPeak?.toLowerCase()) 
                ? moment.emotionalPeak.toLowerCase() 
                : 'educational';
            
            return {
                segmentIndex: moment.segmentIndex || 0,
                startTime: moment.startTime || segment.start,
                endTime: moment.endTime || segment.end,
                duration: moment.duration || (moment.endTime - moment.startTime),
                transcript: segment.text || '',
                
                // Scores
                viralScore: Math.min(100, Math.max(0, moment.viralScore || 70)),
                hookStrength: Math.min(100, Math.max(0, moment.hookStrength || 60)),
                
                // Analysis
                emotionalPeak: normalizedEmotion,
                storyArc: moment.storyArc || 'insight',
                quotableMoment: moment.quotableMoment || '',
                viralElements: Array.isArray(moment.viralElements) ? moment.viralElements : [],
                
                // Metadata
                suggestedPlatforms: Array.isArray(moment.suggestedPlatforms) 
                    ? moment.suggestedPlatforms 
                    : ['tiktok', 'youtube-shorts'],
                hashtags: Array.isArray(moment.hashtags) ? moment.hashtags.slice(0, 10) : [],
                
                title: moment.title || 'Viral Clip',
                description: moment.reason || 'High viral potential moment'
            };
        }).sort((a, b) => b.viralScore - a.viralScore); // Sort by viral score descending
        
    } catch (error) {
        console.error('[Viral Analysis] ❌ Failed to parse AI response:', error.message);
        
        // Fallback: return top segments by length (better than nothing)
        return generateFallbackMoments(segments);
    }
}

/**
 * Generate fallback moments if AI parsing fails
 */
function generateFallbackMoments(segments) {
    console.log('[Viral Analysis] ⚠️ Using fallback moment detection');
    
    // Find segments between 15-60 seconds
    const goodSegments = segments
        .map((seg, idx) => ({
            ...seg,
            segmentIndex: idx,
            duration: seg.end - seg.start
        }))
        .filter(seg => seg.duration >= 15 && seg.duration <= 60)
        .slice(0, 5);

    return goodSegments.map((seg, rank) => ({
        segmentIndex: seg.segmentIndex,
        startTime: seg.start,
        endTime: seg.end,
        duration: seg.duration,
        transcript: seg.text,
        viralScore: 70 - (rank * 5), // Descending scores
        hookStrength: 60,
        emotionalPeak: 'educational',
        storyArc: 'insight',
        quotableMoment: '',
        viralElements: ['educational_value'],
        suggestedPlatforms: ['tiktok', 'youtube-shorts', 'instagram-reels'],
        hashtags: ['#viral', '#fyp', '#trending'],
        title: `Clip ${rank + 1}`,
        description: 'Auto-detected moment (fallback)'
    }));
}

/**
 * Generate hashtags for a clip using AI
 */
async function generateHashtags(clipTranscript, emotionalPeak, platforms) {
    if (!genAI || !workingModel) {
        // Fallback hashtags
        return ['#viral', '#fyp', '#trending', '#foryou', '#video'];
    }

    try {
        const model = genAI.getGenerativeModel({ model: workingModel });
        const prompt = `Generate 10 trending hashtags for this ${emotionalPeak} video clip for platforms: ${platforms.join(', ')}.

Clip content: "${clipTranscript.substring(0, 300)}..."

Return ONLY a JSON array of hashtag strings (with # symbol), no other text:
["#hashtag1", "#hashtag2", ...]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        const hashtags = JSON.parse(text);
        return Array.isArray(hashtags) ? hashtags.slice(0, 10) : ['#viral', '#fyp'];
    } catch (error) {
        console.error('[Viral Analysis] Failed to generate hashtags:', error.message);
        return ['#viral', '#fyp', '#trending'];
    }
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if service is available
 */
function isAvailable() {
    return genAI !== null;
}

module.exports = {
    analyzeViralMoments,
    generateHashtags,
    isAvailable
};
