const mongoose = require('mongoose');

// Model for comments and annotations on transcripts
const commentSchema = new mongoose.Schema({
    transcriptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
        // Removed index: true to avoid duplicate index warning
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Comment positioning
    timestamp: {
        type: Number, // Video timestamp in seconds
        required: true,
        min: 0
    },
    segmentIndex: {
        type: Number, // Index of the segment in transcript
        default: null
    },
    wordIndex: {
        type: Number, // Specific word position
        default: null
    },
    // Comment content
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    type: {
        type: String,
        enum: ['comment', 'suggestion', 'question', 'annotation'],
        default: 'comment'
    },
    // Threading for replies
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    threadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null // Root comment ID for the thread
    },
    // Mentions
    mentions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        notified: {
            type: Boolean,
            default: false
        }
    }],
    // Status and metadata
    isResolved: {
        type: Boolean,
        default: false
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        text: String,
        editedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Reactions and engagement
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        type: {
            type: String,
            enum: ['like', 'dislike', 'love', 'laugh', 'wow', 'sad', 'angry'],
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    replyCount: {
        type: Number,
        default: 0
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for performance
commentSchema.index({ transcriptId: 1, timestamp: 1 });
commentSchema.index({ transcriptId: 1, createdAt: -1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ threadId: 1 });
commentSchema.index({ 'mentions.userId': 1 });

// Virtual for getting replies
commentSchema.virtual('replies', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parentId'
});

// Pre-save middleware to set threadId for root comments
commentSchema.pre('save', function(next) {
    if (!this.parentId && !this.threadId) {
        this.threadId = this._id;
    }
    next();
});

module.exports = mongoose.model('Comment', commentSchema);
