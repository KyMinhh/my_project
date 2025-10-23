const Job = require('../schemas/Job');
// const { OpenAI } = require('openai');

// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
// });

const generateSummary = async (req, res) => {
    try {
        const { jobId } = req.body;

        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: 'Job ID is required'
            });
        }

        // Find the job
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check if transcript exists
        if (!job.transcript || !job.transcript.segments || job.transcript.segments.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No transcript available for summarization'
            });
        }

        // Extract text from segments
        const transcriptText = job.transcript.segments
            .map(segment => segment.text)
            .join(' ')
            .trim();

        if (!transcriptText) {
            return res.status(400).json({
                success: false,
                message: 'Transcript text is empty'
            });
        }

        // Generate summary using OpenAI
        // const summaryPrompt = `Please provide a concise summary of the following transcript. Focus on the main topics, key points, and important information discussed:

// ${transcriptText}

// Summary:`;

        // const summaryResponse = await openai.chat.completions.create({
        //     model: 'gpt-4o-mini',
        //     messages: [
        //         {
        //             role: 'system',
        //             content: 'You are a helpful assistant that creates concise, accurate summaries of transcripts. Keep summaries informative but brief.'
        //         },
        //         {
        //             role: 'user',
        //             content: summaryPrompt
        //         }
        //     ],
        //     max_tokens: 300,
        //     temperature: 0.3,
        // });

        // const summary = summaryResponse.choices[0]?.message?.content?.trim();

        // Mock summary for testing
        const summary = `This is a mock summary of the transcript. The transcript contains ${job.transcript.segments.length} segments with a total text length of ${transcriptText.length} characters. Key topics appear to include discussion points extracted from the audio content.`;

        // Generate keywords
        // const keywordsPrompt = `Extract 5-10 key keywords or phrases from this transcript that represent the main topics:

// ${transcriptText}

// Keywords (comma-separated):`;

        // const keywordsResponse = await openai.chat.completions.create({
        //     model: 'gpt-4o-mini',
        //     messages: [
        //         {
        //             role: 'system',
        //             content: 'Extract key keywords and phrases that represent the main topics discussed in the transcript.'
        //         },
        //         {
        //             role: 'user',
        //             content: keywordsPrompt
        //         }
        //     ],
        //     max_tokens: 100,
        //     temperature: 0.3,
        // });

        // const keywordsText = keywordsResponse.choices[0]?.message?.content?.trim();
        // const keywords = keywordsText ? keywordsText.split(',').map(k => k.trim()).filter(k => k) : [];

        // Mock keywords
        const keywords = ['transcript', 'audio', 'content', 'discussion', 'analysis'];

        // Analyze sentiment
        // const sentimentPrompt = `Analyze the overall sentiment of this transcript. Classify it as: positive, negative, neutral, or mixed. Provide a brief explanation.

        // ${transcriptText}

        // Sentiment:`;

        // const sentimentResponse = await openai.chat.completions.create({
        //     model: 'gpt-4o-mini',
        //     messages: [
        //         {
        //             role: 'system',
        //             content: 'Analyze the sentiment of the transcript and classify it as positive, negative, neutral, or mixed.'
        //         },
        //         {
        //             role: 'user',
        //             content: sentimentPrompt
        //         }
        //     ],
        //     max_tokens: 150,
        //     temperature: 0.3,
        // });

        // const sentimentText = sentimentResponse.choices[0]?.message?.content?.trim();
        // let sentiment = 'neutral'; // default

        // if (sentimentText) {
        //     const lowerSentiment = sentimentText.toLowerCase();
        //     if (lowerSentiment.includes('positive')) sentiment = 'positive';
        //     else if (lowerSentiment.includes('negative')) sentiment = 'negative';
        //     else if (lowerSentiment.includes('mixed')) sentiment = 'mixed';
        // }

        // Mock sentiment
        const sentiment = 'neutral';

        // Update job with AI analysis
        job.summary = summary;
        job.keywords = keywords;
        job.sentiment = sentiment;
        await job.save();

        res.json({
            success: true,
            data: {
                summary,
                keywords,
                sentiment
            }
        });

    } catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate summary',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    generateSummary
};
