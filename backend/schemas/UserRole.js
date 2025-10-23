const mongoose = require('mongoose');

/**
 * UserRole Schema
 * Maps users to their roles with additional metadata
 */
const userRoleSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        unique: true
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator', 'author'],
        default: 'user',
        required: true
    },
    // Role assignment details
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    // Permissions
    permissions: {
        canCreateJobs: {
            type: Boolean,
            default: true
        },
        canDeleteJobs: {
            type: Boolean,
            default: true
        },
        canShareJobs: {
            type: Boolean,
            default: true
        },
        canManageUsers: {
            type: Boolean,
            default: false
        },
        canViewAnalytics: {
            type: Boolean,
            default: false
        },
        canManageRoles: {
            type: Boolean,
            default: false
        }
    },
    // Usage limits
    limits: {
        maxJobsPerDay: {
            type: Number,
            default: 10
        },
        maxFileSize: {
            type: Number, // MB
            default: 100
        },
        maxStorageSpace: {
            type: Number, // GB
            default: 5
        }
    },
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Notes
    notes: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Indexes
userRoleSchema.index({ userId: 1 });
userRoleSchema.index({ role: 1 });
userRoleSchema.index({ isDeleted: 1 });

// Set default permissions based on role
userRoleSchema.pre('save', function(next) {
    if (this.isModified('role')) {
        switch (this.role) {
            case 'admin':
                this.permissions.canManageUsers = true;
                this.permissions.canViewAnalytics = true;
                this.permissions.canManageRoles = true;
                this.limits.maxJobsPerDay = null; // unlimited
                this.limits.maxFileSize = null;
                this.limits.maxStorageSpace = null;
                break;
            case 'moderator':
                this.permissions.canViewAnalytics = true;
                this.limits.maxJobsPerDay = 50;
                this.limits.maxFileSize = 500;
                this.limits.maxStorageSpace = 20;
                break;
            case 'author':
                this.permissions.canViewAnalytics = true;
                this.limits.maxJobsPerDay = 30;
                this.limits.maxFileSize = 200;
                this.limits.maxStorageSpace = 10;
                break;
            default: // user
                this.limits.maxJobsPerDay = 10;
                this.limits.maxFileSize = 100;
                this.limits.maxStorageSpace = 5;
        }
    }
    next();
});

// Method to soft delete
userRoleSchema.methods.softDelete = function(deletedBy) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    return this.save();
};

// Method to restore
userRoleSchema.methods.restore = function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
};

// Static method to find active roles
userRoleSchema.statics.findActive = function(filter = {}) {
    return this.find({ ...filter, isDeleted: false });
};

const UserRole = mongoose.model('UserRole', userRoleSchema);
module.exports = UserRole;
