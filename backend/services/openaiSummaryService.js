const OpenAI = require('openai');

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

/**
 * Generate summary using OpenAI GPT-4o-mini
 * @param {string} transcript - The full transcript text
 * @param {string} type - Summary type: 'quick', 'detailed', 'bullets', 'chapters'
 * @param {object} options - Additional options (language, maxLength, etc)
 * @returns {Promise<object>} - Summary result with text and metadata
 */
async function generateSummary(transcript, type = 'detailed', options = {}) {
    if (!openai) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in .env');
    }

    if (!transcript || transcript.trim().length === 0) {
        throw new Error('Transcript is empty or invalid');
    }

    const startTime = Date.now();
    console.log(`[OpenAI] 🤖 Starting ${type} summary generation...`);

    try {
        const systemPrompt = buildSystemPrompt(type, options);
        const userPrompt = buildUserPrompt(transcript, type);

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            temperature: 0.7,
            max_tokens: type === 'quick' ? 300 : 1000,
            top_p: 0.95,
            frequency_penalty: 0.3,
            presence_penalty: 0.3
        });

        const summaryText = response.choices[0].message.content;
        const usage = response.usage;

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[OpenAI] ✅ Summary generated in ${processingTime}s (${usage.total_tokens} tokens)`);

        return {
            success: true,
            summary: summaryText,
            type: type,
            model: 'gpt-4o-mini',
            processingTime: parseFloat(processingTime),
            tokenCount: usage.total_tokens,
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            timestamp: new Date()
        };

    } catch (error) {
        console.error('[OpenAI] ❌ Summary generation failed:', error.message);
        throw new Error(`OpenAI error: ${error.message}`);
    }
}

/**
 * Build system prompt based on summary type
 */
function buildSystemPrompt(type, options) {
    const language = options.language || 'Vietnamese';
    
    const basePrompt = `You are an expert AI assistant specialized in creating high-quality video summaries. 
Your summaries are clear, concise, and capture the essential information.
Always respond in ${language} unless the transcript is clearly in another language.`;

    const typeSpecificPrompts = {
        quick: `${basePrompt}
Your task: Create ultra-concise summaries in 2-3 sentences maximum.`,

        detailed: `${basePrompt}
Your task: Create comprehensive, well-structured summaries that cover main topics, key points, and conclusions.`,

        bullets: `${basePrompt}
Your task: Extract key takeaways as clear, actionable bullet points.`,

        chapters: `${basePrompt}
Your task: Divide the content into logical chapters with timestamps and descriptions.`,

        action_items: `${basePrompt}
Your task: Identify all action items, tasks, decisions, and next steps mentioned.`,

        keywords: `${basePrompt}
Your task: Extract relevant keywords, topics, and categorization tags.`
    };

    return typeSpecificPrompts[type] || typeSpecificPrompts.detailed;
}

/**
 * Build user prompt with transcript
 */
function buildUserPrompt(transcript, type) {
    const prompts = {
        quick: `Summarize this video transcript in 2-3 sentences:\n\n${transcript}`,
        
        detailed: `Provide a detailed summary of this video transcript. Include:
- Main topic and purpose (1-2 sentences)
- Key points and important details (3-5 points)
- Conclusion or takeaway message (1-2 sentences)

Transcript:
${transcript}`,

        bullets: `Extract 5-10 key takeaways from this video transcript as bullet points. 
Focus on actionable insights and important information.

Transcript:
${transcript}`,

        chapters: `Create chapter markers for this video transcript. For each chapter:
1. Estimate timestamp range (format: MM:SS - MM:SS)
2. Chapter title (short and descriptive)
3. Brief description (1-2 sentences)

Transcript:
${transcript}`,

        action_items: `Identify all action items, tasks, decisions, and next steps from this transcript.
Format as a checklist with clear, actionable items.

Transcript:
${transcript}`,

        keywords: `Extract from this transcript:
1. Main keywords (5-10 important terms)
2. Topics covered (3-5 topics)
3. Suggested tags for categorization (5-8 tags)

Transcript:
${transcript}`
    };

    return prompts[type] || prompts.detailed;
}

/**
 * Check if OpenAI service is available
 */
function isAvailable() {
    return openai !== null;
}

/**
 * Get service info
 */
function getServiceInfo() {
    return {
        name: 'OpenAI GPT-4o-mini',
        model: 'gpt-4o-mini',
        available: isAvailable(),
        features: ['quick', 'detailed', 'bullets', 'chapters', 'action_items', 'keywords'],
        costPer1MTokens: {
            input: 0.15,
            output: 0.60
        }
    };
}

module.exports = {
    generateSummary,
    isAvailable,
    getServiceInfo
};
