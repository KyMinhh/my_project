const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI with API key
const genAI = process.env.GOOGLE_AI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    : null;

// Try models in order of preference (will be set after first successful call)
let workingModel = null;
const modelsToTry = [
    'gemini-2.0-flash-exp',      // Latest FREE model (as of Nov 2024)
    'gemini-1.5-flash-latest',   // Stable flash version
    'gemini-1.5-flash',          // Standard flash
    'gemini-1.5-pro-latest',     // Pro version
    'gemini-pro'                 // Fallback
];

/**
 * Generate summary using Google Gemini 1.5 Flash
 * @param {string} transcript - The full transcript text
 * @param {string} type - Summary type: 'quick', 'detailed', 'bullets', 'chapters'
 * @param {object} options - Additional options (language, maxLength, etc)
 * @returns {Promise<object>} - Summary result with text and metadata
 */
async function generateSummary(transcript, type = 'detailed', options = {}) {
    if (!genAI) {
        throw new Error('Google AI API key not configured. Please set GOOGLE_AI_API_KEY in .env');
    }

    if (!transcript || transcript.trim().length === 0) {
        throw new Error('Transcript is empty or invalid');
    }

    const startTime = Date.now();
    console.log(`[Gemini] 🤖 Starting ${type} summary generation...`);

    // Try to use cached working model first
    if (workingModel) {
        try {
            return await generateWithModel(workingModel, transcript, type, options, startTime);
        } catch (error) {
            console.log(`[Gemini] ⚠️ Cached model ${workingModel} failed, trying alternatives...`);
            workingModel = null; // Reset cache
        }
    }

    // Try models in order until one works
    let lastError = null;
    for (const modelName of modelsToTry) {
        try {
            console.log(`[Gemini] 🔄 Trying model: ${modelName}...`);
            const result = await generateWithModel(modelName, transcript, type, options, startTime);
            workingModel = modelName; // Cache successful model
            console.log(`[Gemini] ✅ Model ${modelName} works! Caching for future use.`);
            return result;
        } catch (error) {
            lastError = error;
            console.log(`[Gemini] ❌ Model ${modelName} failed`);
        }
    }

    // All models failed
    throw lastError || new Error('All Gemini models failed');
}

/**
 * Generate summary with specific model
 */
async function generateWithModel(modelName, transcript, type, options, startTime) {
    try {
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: type === 'quick' ? 300 : 1000,
            }
        });

        // Build prompt based on type
        const prompt = buildPrompt(transcript, type, options);

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summaryText = response.text();

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Gemini] ✅ Summary generated in ${processingTime}s`);

        return {
            success: true,
            summary: summaryText,
            type: type,
            model: modelName,
            processingTime: parseFloat(processingTime),
            tokenCount: estimateTokenCount(transcript + summaryText),
            timestamp: new Date()
        };

    } catch (error) {
        throw error; // Re-throw to try next model
    }
}

/**
 * Build prompt based on summary type
 */
function buildPrompt(transcript, type, options) {
    const language = options.language || 'Vietnamese';
    const baseInstruction = `You are a helpful AI assistant that creates high-quality video summaries. Please respond in ${language}.`;

    const prompts = {
        quick: `${baseInstruction}

Summarize this video transcript in 2-3 concise sentences. Focus on the main topic and key message.

Transcript:
${transcript}

Quick Summary (2-3 sentences):`,

        detailed: `${baseInstruction}

Create a comprehensive summary of this video transcript. Include:
- Main topic and purpose
- Key points and important details
- Conclusion or takeaway message

Transcript:
${transcript}

Detailed Summary:`,

        bullets: `${baseInstruction}

Extract the key takeaways from this video transcript as bullet points. Format:
• Point 1
• Point 2
• Point 3
...

Transcript:
${transcript}

Key Takeaways:`,

        chapters: `${baseInstruction}

Create chapter markers for this video transcript with timestamps. For each chapter:
- Identify natural sections or topic changes
- Provide timestamp (use format like "00:30 - 02:15")
- Write a brief title and description

Note: If the transcript includes timing information, use it. Otherwise, estimate based on content length.

Transcript:
${transcript}

Chapter Markers:`,

        action_items: `${baseInstruction}

Identify action items, tasks, or next steps mentioned in this video transcript. Format as a checklist.

Transcript:
${transcript}

Action Items:`,

        keywords: `${baseInstruction}

Extract important keywords, topics, and tags from this video transcript. Provide:
1. Main keywords (5-10 words)
2. Topics covered
3. Suggested tags for categorization

Transcript:
${transcript}

Keywords & Tags:`
    };

    return prompts[type] || prompts.detailed;
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokenCount(text) {
    // Rough estimate: 1 token ≈ 4 characters for English, 2-3 for Vietnamese
    return Math.ceil(text.length / 3.5);
}

/**
 * Check if Gemini service is available
 */
function isAvailable() {
    return genAI !== null;
}

/**
 * Get service info
 */
function getServiceInfo() {
    return {
        name: 'Google Gemini Flash',
        model: workingModel || 'gemini-2.0-flash-exp',
        available: isAvailable(),
        features: ['quick', 'detailed', 'bullets', 'chapters', 'action_items', 'keywords'],
        costPer1MTokens: {
            input: 0.00,  // FREE for gemini-2.0-flash-exp
            output: 0.00  // FREE for gemini-2.0-flash-exp
        }
    };
}

module.exports = {
    generateSummary,
    isAvailable,
    getServiceInfo
};
