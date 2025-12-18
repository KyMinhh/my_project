const mongoose = require('mongoose');

/**
 * Batch Translation Schema
 * Manages batch translation jobs for multiple videos
 */
const batchTranslationSchema = new mongoose.Schema({
    batchId: {
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

    name: {
        type: String,
        required: true
    },

    description: String,

    // Batch configuration
    sourceLang: {
        type: String,
        default: 'auto'
    },

    targetLang: {
        type: String,
        required: true
    },

    // Shared voice configuration for all videos in batch
    sharedVoiceConfig: {
        voiceName: String,
        gender: String,
        speakingRate: Number,
        pitch: Number,
        useVoiceCloning: Boolean
    },

    // Videos in batch
    videos: [{
        videoId: mongoose.Schema.Types.ObjectId,
        title: String,
        duration: Number,
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        jobId: String, // Reference to TranslationJob
        error: String
    }],

    // Batch status
    status: {
        type: String,
        enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'queued',
        index: true
    },

    // Progress tracking
    totalVideos: {
        type: Number,
        required: true
    },
    completedVideos: {
        type: Number,
        default: 0
    },
    failedVideos: {
        type: Number,
        default: 0
    },

    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    // Processing options
    options: {
        priority: {
            type: String,
            enum: ['low', 'normal', 'high'],
            default: 'normal'
        },
        maxConcurrent: {
            type: Number,
            default: 3 // Process 3 videos at a time
        },
        notifyOnComplete: {
            type: Boolean,
            default: true
        },
        autoDownload: {
            type: Boolean,
            default: false
        }
    },

    // Results
    results: [{
        videoId: mongoose.Schema.Types.ObjectId,
        translatedVideoPath: String,
        subtitlesPath: String,
        processingTime: Number
    }],

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    startedAt: Date,
    completedAt: Date,
    estimatedCompletionTime: Date
}, {
    timestamps: true
});

// Indexes
batchTranslationSchema.index({ userId: 1, createdAt: -1 });
batchTranslationSchema.index({ status: 1, createdAt: -1 });

// Virtual for completion percentage
batchTranslationSchema.virtual('completionPercentage').get(function () {
    if (this.totalVideos === 0) return 0;
    return Math.round((this.completedVideos / this.totalVideos) * 100);
});

// Method to update batch progress
batchTranslationSchema.methods.updateProgress = function () {
    const completed = this.videos.filter(v => v.status === 'completed').length;
    const failed = this.videos.filter(v => v.status === 'failed').length;

    this.completedVideos = completed;
    this.failedVideos = failed;
    this.progress = Math.round(((completed + failed) / this.totalVideos) * 100);

    // Update batch status
    if (completed + failed === this.totalVideos) {
        this.status = failed === this.totalVideos ? 'failed' : 'completed';
        this.completedAt = new Date();
    }

    return this.save();
};

// Method to add video result
batchTranslationSchema.methods.addResult = function (videoId, result) {
    this.results.push({
        videoId,
        translatedVideoPath: result.videoPath,
        subtitlesPath: result.subtitlesPath,
        processingTime: result.processingTime
    });

    // Update video status
    const video = this.videos.find(v => v.videoId.toString() === videoId.toString());
    if (video) {
        video.status = 'completed';
        video.jobId = result.jobId;
    }

    return this.updateProgress();
};

// Method to mark video as failed
batchTranslationSchema.methods.markVideoFailed = function (videoId, error) {
    const video = this.videos.find(v => v.videoId.toString() === videoId.toString());
    if (video) {
        video.status = 'failed';
        video.error = error.message;
    }

    return this.updateProgress();
};

// Static method to get user batch statistics
batchTranslationSchema.statics.getUserBatchStats = async function (userId) {
    const stats = await this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalBatches: { $sum: 1 },
                totalVideos: { $sum: '$totalVideos' },
                completedBatches: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                averageVideosPerBatch: { $avg: '$totalVideos' }
            }
        }
    ]);

    return stats[0] || {
        totalBatches: 0,
        totalVideos: 0,
        completedBatches: 0,
        averageVideosPerBatch: 0
    };
};

module.exports = mongoose.model('BatchTranslation', batchTranslationSchema);
