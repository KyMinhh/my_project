const mongoose = require('mongoose');

// Activity Schema - Schema #4
const activitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['create', 'update', 'delete', 'share', 'download', 'view'],
        required: true
    },
    resourceType: {
        type: String,
        enum: ['job', 'user', 'share'],
        required: true
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    details: {
        type: String,
        trim: true
    },
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

activitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
