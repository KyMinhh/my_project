const mongoose = require('mongoose');

// Model for managing collaborators and their permissions
const collaboratorSchema = new mongoose.Schema({
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
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    permission: {
        type: String,
        enum: ['viewer', 'editor', 'moderator', 'admin'],
        default: 'viewer'
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'revoked'],
        default: 'pending'
    },
    invitationToken: {
        type: String,
        unique: true,
        sparse: true // Allow null values but ensure uniqueness when present
    },
    joinedAt: {
        type: Date,
        default: null
    },
    lastActive: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    settings: {
        notifications: {
            mentions: {
                type: Boolean,
                default: true
            },
            comments: {
                type: Boolean,
                default: true
            },
            edits: {
                type: Boolean,
                default: false
            }
        }
    }
}, {
    timestamps: true
});

// Composite index to ensure one collaborator per transcript per user
collaboratorSchema.index({ transcriptId: 1, userId: 1 }, { unique: true });
collaboratorSchema.index({ transcriptId: 1 });
collaboratorSchema.index({ userId: 1 });
collaboratorSchema.index({ email: 1 });
collaboratorSchema.index({ invitationToken: 1 });

module.exports = mongoose.model('Collaborator', collaboratorSchema);
