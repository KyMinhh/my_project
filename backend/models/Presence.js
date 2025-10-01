const mongoose = require('mongoose');

// Model for tracking real-time user presence and activity
const presenceSchema = new mongoose.Schema({
    transcriptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    socketId: {
        type: String,
        required: true
        // Removed index: true to avoid duplicate index warning
    },
    // User activity tracking
    status: {
        type: String,
        enum: ['active', 'idle', 'away', 'offline'],
        default: 'active'
    },
    activity: {
        type: String,
        enum: ['viewing', 'editing', 'commenting', 'typing'],
        default: 'viewing'
    },
    // Cursor and selection tracking for real-time editing
    cursor: {
        position: {
            type: Number,
            default: 0
        },
        segmentIndex: {
            type: Number,
            default: null
        },
        wordIndex: {
            type: Number,
            default: null
        }
    },
    selection: {
        start: {
            type: Number,
            default: null
        },
        end: {
            type: Number,
            default: null
        },
        text: {
            type: String,
            default: null
        }
    },
    // Current viewing/editing section
    currentSegment: {
        type: Number,
        default: null
    },
    videoTimestamp: {
        type: Number,
        default: 0
    },
    // Typing indicators
    isTyping: {
        type: Boolean,
        default: false
    },
    typingAt: {
        segmentIndex: Number,
        wordIndex: Number,
        timestamp: Date
    },
    // Connection metadata
    userAgent: String,
    ipAddress: String,
    country: String,
    device: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet'],
        default: 'desktop'
    },
    // Timestamps
    connectedAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    lastHeartbeat: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for performance
presenceSchema.index({ transcriptId: 1, userId: 1 });
presenceSchema.index({ socketId: 1 }, { unique: true });
presenceSchema.index({ lastHeartbeat: 1 });
presenceSchema.index({ status: 1 });

// TTL index to automatically clean up old presence records
presenceSchema.index({ lastHeartbeat: 1 }, { expireAfterSeconds: 300 }); // 5 minutes

module.exports = mongoose.model('Presence', presenceSchema);
