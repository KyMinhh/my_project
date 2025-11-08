const geminiService = require('./geminiSummaryService');

/**
 * Main Summary Service - Using Google Gemini Only
 * Focus on Gemini API for stable and cost-effective summaries
 */

/**
 * Generate summary using Gemini AI
 * @param {string} transcript - The full transcript text
 * @param {string} type - Summary type
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Summary result
 */
async function generateSummary(transcript, type = 'detailed', options = {}) {
    if (!transcript || transcript.trim().length === 0) {
        throw new Error('Transcript is required for summary generation');
    }

    console.log(`[SummaryService] 📊 Generating ${type} summary (${transcript.length} chars)`);

    // Check if Gemini is available
    if (!geminiService.isAvailable()) {
        throw new Error(
            '❌ Google AI API key not configured.\n\n' +
            '💡 Setup Instructions:\n' +
            '1. Get API key from: https://aistudio.google.com/app/apikey\n' +
            '2. Enable Generative Language API\n' +
            '3. Add to .env: GOOGLE_AI_API_KEY=your_key_here\n' +
            '4. Restart server\n\n' +
            '📖 See backend/SETUP_GOOGLE_AI.md for detailed guide'
        );
    }

    // Use Gemini for summary generation
    try {
        console.log('[SummaryService] 🎯 Using Google Gemini AI...');
        const result = await geminiService.generateSummary(transcript, type, options);
        
        // Return only necessary fields (avoid 'success' field that conflicts with Job schema)
        return {
            summary: result.summary,
            type: result.type,
            model: result.model,
            processingTime: result.processingTime,
            tokenCount: result.tokenCount,
            timestamp: result.timestamp,
            provider: 'gemini',
            fallbackUsed: false
        };
    } catch (geminiError) {
        console.error('[SummaryService] ❌ Gemini error:', geminiError.message);
        
        // Provide helpful error message
        const errorMsg = geminiError.message || 'Unknown error';
        throw new Error(
            `❌ Google Gemini AI Error: ${errorMsg}\n\n` +
            '💡 Common Solutions:\n' +
            '1. Get new API key: https://aistudio.google.com/app/apikey\n' +
            '2. Enable Generative Language API in Google Cloud Console\n' +
            '3. Check API key restrictions\n' +
            '4. Wait 1-2 minutes after enabling API\n\n' +
            '🧪 Test your setup: npm run test-gemini\n' +
            '📖 Full guide: backend/SETUP_GOOGLE_AI.md'
        );
    }
}

/**
 * Generate multiple summary types at once
 * @param {string} transcript - The full transcript text
 * @param {array} types - Array of summary types to generate
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Object with all summaries
 */
async function generateMultipleSummaries(transcript, types = ['quick', 'detailed'], options = {}) {
    console.log(`[SummaryService] 🚀 Generating ${types.length} summary types...`);

    const summaries = {};
    const errors = {};

    // Generate summaries in parallel for better performance
    await Promise.all(
        types.map(async (type) => {
            try {
                summaries[type] = await generateSummary(transcript, type, options);
            } catch (error) {
                errors[type] = error.message;
                console.error(`[SummaryService] Failed to generate ${type} summary:`, error.message);
            }
        })
    );

    return {
        success: Object.keys(summaries).length > 0,
        summaries,
        errors: Object.keys(errors).length > 0 ? errors : null,
        timestamp: new Date()
    };
}

/**
 * Get available AI services status
 */
function getServicesStatus() {
    return {
        gemini: geminiService.getServiceInfo(),
        strategy: {
            primary: 'gemini',
            fallback: 'none'
        },
        setupGuide: 'backend/SETUP_GOOGLE_AI.md'
    };
}

/**
 * Estimate cost for summary generation
 * @param {number} transcriptLength - Length of transcript in characters
 * @param {string} type - Summary type
 * @returns {object} - Cost estimation
 */
function estimateCost(transcriptLength, type = 'detailed') {
    // Rough token estimation
    const inputTokens = Math.ceil(transcriptLength / 3.5); // ~1 token per 3.5 chars
    const outputTokens = type === 'quick' ? 150 : 500; // Estimated output

    const geminiCost = (inputTokens * 0.075 + outputTokens * 0.30) / 1000000; // Cost per 1M tokens
    const openaiCost = (inputTokens * 0.15 + outputTokens * 0.60) / 1000000;

    return {
        transcriptLength,
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        costs: {
            gemini: {
                usd: geminiCost.toFixed(6),
                description: 'Google Gemini 1.5 Flash'
            },
            openai: {
                usd: openaiCost.toFixed(6),
                description: 'OpenAI GPT-4o-mini'
            }
        },
        recommended: 'gemini' // Always recommend Gemini (cheaper)
    };
}

/**
 * Validate transcript before summary generation
 */
function validateTranscript(transcript, minLength = 50, maxLength = 500000) {
    if (!transcript || typeof transcript !== 'string') {
        return { valid: false, error: 'Transcript must be a non-empty string' };
    }

    const length = transcript.trim().length;

    if (length < minLength) {
        return { valid: false, error: `Transcript too short (${length} chars). Minimum: ${minLength} chars` };
    }

    if (length > maxLength) {
        return { valid: false, error: `Transcript too long (${length} chars). Maximum: ${maxLength} chars` };
    }

    return { valid: true, length };
}

module.exports = {
    generateSummary,
    generateMultipleSummaries,
    getServicesStatus,
    estimateCost,
    validateTranscript
};
