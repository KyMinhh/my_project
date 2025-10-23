const mongoose = require('mongoose');

// Model for managing collaboration settings
const collaborationSchema = new mongoose.Schema({
    transcriptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
        // Removed index: true to avoid duplicate index warning
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    settings: {
        allowPublicSharing: {
            type: Boolean,
            default: false
        },
        defaultPermission: {
            type: String,
            enum: ['viewer', 'editor'],
            default: 'viewer'
        },
        requireApproval: {
            type: Boolean,
            default: false
        },
        allowComments: {
            type: Boolean,
            default: true
        },
        allowDownload: {
            type: Boolean,
            default: false
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Ensure one collaboration per transcript
collaborationSchema.index({ transcriptId: 1 }, { unique: true });

module.exports = mongoose.model('Collaboration', collaborationSchema);
