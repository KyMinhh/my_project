const mongoose = require('mongoose');

/**
 * Translation History Schema
 * Stores user's translation history for analytics and quick access
 */
const translationHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    jobId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Original video info
    originalVideo: {
        videoId: mongoose.Schema.Types.ObjectId,
        title: String,
        duration: Number,
        thumbnailUrl: String
    },

    // Translation details
    sourceLang: String,
    targetLang: String,

    // Results
    translatedVideoUrl: String,
    translatedVideoPath: String,
    subtitlesUrl: String,

    // Statistics
    processingTime: Number, // seconds
    videoQuality: String, // 'original', 'high', 'medium'
    fileSize: Number, // bytes

    // Voice settings used
    voiceSettings: {
        voiceName: String,
        gender: String,
        speakingRate: Number,
        pitch: Number,
        usedVoiceCloning: Boolean
    },

    // User actions
    downloaded: {
        type: Boolean,
        default: false
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    lastDownloadedAt: Date,

    shared: {
        type: Boolean,
        default: false
    },
    shareCount: {
        type: Number,
        default: 0
    },

    // Ratings and feedback
    userRating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: String,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        // Auto-delete after 30 days if not downloaded
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
}, {
    timestamps: true
});

// Indexes
translationHistorySchema.index({ userId: 1, createdAt: -1 });
translationHistorySchema.index({ sourceLang: 1, targetLang: 1 });
translationHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Method to increment download count
translationHistorySchema.methods.recordDownload = function () {
    this.downloaded = true;
    this.downloadCount += 1;
    this.lastDownloadedAt = new Date();
    // Extend expiration by 30 days on download
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.save();
};

// Method to record user rating
translationHistorySchema.methods.addRating = function (rating, feedback) {
    this.userRating = rating;
    if (feedback) {
        this.feedback = feedback;
    }
    return this.save();
};

// Static method to get user statistics
translationHistorySchema.statics.getUserStats = async function (userId) {
    const stats = await this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalTranslations: { $sum: 1 },
                totalProcessingTime: { $sum: '$processingTime' },
                averageRating: { $avg: '$userRating' },
                totalDownloads: { $sum: '$downloadCount' },
                languagePairs: {
                    $push: {
                        from: '$sourceLang',
                        to: '$targetLang'
                    }
                }
            }
        }
    ]);

    return stats[0] || {
        totalTranslations: 0,
        totalProcessingTime: 0,
        averageRating: 0,
        totalDownloads: 0,
        languagePairs: []
    };
};

// Static method to get popular language pairs
translationHistorySchema.statics.getPopularPairs = async function (limit = 10) {
    return await this.aggregate([
        {
            $group: {
                _id: {
                    from: '$sourceLang',
                    to: '$targetLang'
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                sourceLang: '$_id.from',
                targetLang: '$_id.to',
                count: 1
            }
        }
    ]);
};

module.exports = mongoose.model('TranslationHistory', translationHistorySchema);
