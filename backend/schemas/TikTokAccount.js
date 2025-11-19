const mongoose = require('mongoose');

const tiktokAccountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    
    // TikTok credentials
    openId: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    
    // TikTok profile info
    displayName: String,
    avatarUrl: String,
    
    // Settings
    autoPostSettings: {
        enabled: {
            type: Boolean,
            default: false
        },
        privacyLevel: {
            type: String,
            enum: ['SELF_ONLY', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'PUBLIC_TO_EVERYONE'],
            default: 'PUBLIC_TO_EVERYONE'
        },
        disableDuet: {
            type: Boolean,
            default: false
        },
        disableComment: {
            type: Boolean,
            default: false
        },
        disableStitch: {
            type: Boolean,
            default: false
        }
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    lastUsed: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Method to check if token is expired
tiktokAccountSchema.methods.isTokenExpired = function() {
    return new Date() >= this.expiresAt;
};

// Method to check if token needs refresh (expires in < 1 day)
tiktokAccountSchema.methods.needsRefresh = function() {
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.expiresAt < oneDayFromNow;
};

module.exports = mongoose.model('TikTokAccount', tiktokAccountSchema);
