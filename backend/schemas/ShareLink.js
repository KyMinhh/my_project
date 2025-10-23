const mongoose = require('mongoose');

// Model for share links
const shareLinkSchema = new mongoose.Schema({
    transcriptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
        // Removed index: true to avoid duplicate index warning
    },
    linkId: {
        type: String,
        required: true,
        unique: true
        // Removed index: true to avoid duplicate index warning
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    permissions: {
        type: String,
        enum: ['viewer', 'editor'],
        default: 'viewer'
    },
    password: {
        type: String, // Will be hashed if set
        default: null
    },
    expiresAt: {
        type: Date,
        default: null // null means never expires
    },
    accessCount: {
        type: Number,
        default: 0
    },
    maxAccessCount: {
        type: Number,
        default: null // null means unlimited
    },
    analytics: {
        views: {
            type: Number,
            default: 0
        },
        uniqueViews: {
            type: Number,
            default: 0
        },
        lastAccessed: {
            type: Date,
            default: null
        },
        accessLog: [{
            ip: String,
            userAgent: String,
            country: String,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for performance
shareLinkSchema.index({ linkId: 1 });
shareLinkSchema.index({ transcriptId: 1 });
shareLinkSchema.index({ createdBy: 1 });
shareLinkSchema.index({ expiresAt: 1 });

// TTL index for automatic cleanup of expired links
shareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ShareLink', shareLinkSchema);
