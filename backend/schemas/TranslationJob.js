const mongoose = require('mongoose');

/**
 * Translation Job Schema
 * Tracks video translation jobs with multi-language support
 */
const translationJobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    originalVideoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },

    // Language configuration
    sourceLang: {
        type: String,
        required: true,
        default: 'auto' // Auto-detect
    },

    detectedSourceLang: {
        type: String // Actual detected language if sourceLang was 'auto'
    },

    targetLang: {
        type: String,
        required: true
    },

    // Voice configuration
    voiceConfig: {
        voiceName: String,
        gender: {
            type: String,
            enum: ['MALE', 'FEMALE', 'NEUTRAL'],
            default: 'NEUTRAL'
        },
        speakingRate: {
            type: Number,
            min: 0.25,
            max: 4.0,
            default: 1.0
        },
        pitch: {
            type: Number,
            min: -20,
            max: 20,
            default: 0
        },
        // Voice cloning settings
        useVoiceCloning: {
            type: Boolean,
            default: false
        },
        clonedVoiceId: String, // ID of cloned voice if using voice cloning
        voiceSamplePath: String // Path to voice sample used for cloning
    },

    // Processing status
    status: {
        type: String,
        enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'queued',
        index: true
    },

    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    currentStep: {
        type: String,
        enum: [
            'extracting_audio',
            'detecting_language',
            'transcribing',
            'translating',
            'cloning_voice',
            'generating_speech',
            'adjusting_timing',
            'merging_audio',
            'replacing_audio',
            'generating_subtitles',
            'finalizing'
        ]
    },

    // Results
    translatedVideoPath: String,
    translatedAudioPath: String,

    subtitles: [{
        language: String,
        format: {
            type: String,
            enum: ['srt', 'vtt']
        },
        path: String
    }],

    transcript: {
        original: [{
            start: Number,
            end: Number,
            text: String,
            confidence: Number
        }],
        translated: [{
            start: Number,
            end: Number,
            text: String,
            originalText: String
        }]
    },

    // Metadata
    videoDuration: Number,
    processingTime: Number,
    estimatedTime: Number,

    // Batch translation info
    batchId: {
        type: String,
        index: true
    },
    batchPosition: Number, // Position in batch (1, 2, 3...)

    // Error handling
    errorMessage: String,
    errorDetails: mongoose.Schema.Types.Mixed,
    retryCount: {
        type: Number,
        default: 0
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    startedAt: Date,
    completedAt: Date
}, {
    timestamps: true
});

// Indexes for efficient queries
translationJobSchema.index({ userId: 1, createdAt: -1 });
translationJobSchema.index({ status: 1, createdAt: -1 });
translationJobSchema.index({ batchId: 1, batchPosition: 1 });
translationJobSchema.index({ sourceLang: 1, targetLang: 1 });

// Virtual for processing duration
translationJobSchema.virtual('duration').get(function () {
    if (this.completedAt && this.startedAt) {
        return Math.round((this.completedAt - this.startedAt) / 1000); // seconds
    }
    return null;
});

// Method to update progress
translationJobSchema.methods.updateProgress = function (progress, step) {
    this.progress = progress;
    this.currentStep = step;
    return this.save();
};

// Method to mark as completed
translationJobSchema.methods.markCompleted = function (results) {
    this.status = 'completed';
    this.progress = 100;
    this.completedAt = new Date();
    this.translatedVideoPath = results.videoPath;
    this.translatedAudioPath = results.audioPath;
    this.subtitles = results.subtitles;
    this.transcript = results.transcript;
    return this.save();
};

// Method to mark as failed
translationJobSchema.methods.markFailed = function (error) {
    this.status = 'failed';
    this.errorMessage = error.message;
    this.errorDetails = error;
    this.completedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('TranslationJob', translationJobSchema);
