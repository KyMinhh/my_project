const mongoose = require("mongoose"); // Sử dụng require

const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
            lowercase: true,
            trim: true,
            match: [/\S+@\S+\.\S+/, 'Please use a valid email address.']
		},
		password: {
			type: String,
			required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters long"]
		},
		name: {
			type: String,
			required: [true, "Name is required"],
            trim: true,
		},
		// Profile Information
		displayName: {
			type: String,
			trim: true,
			maxlength: [50, "Display name cannot exceed 50 characters"]
		},
		bio: {
			type: String,
			maxlength: [500, "Bio cannot exceed 500 characters"],
			trim: true
		},
		avatar: {
			type: String,
			default: null
		},
		coverPhoto: {
			type: String,
			default: null
		},
		location: {
			type: String,
			maxlength: [100, "Location cannot exceed 100 characters"],
			trim: true
		},
		website: {
			type: String,
			trim: true,
			validate: {
				validator: function(v) {
					if (!v) return true; // Allow empty
					return /^https?:\/\/.+/.test(v);
				},
				message: 'Website must be a valid URL'
			}
		},
		dateOfBirth: {
			type: Date
		},
		phoneNumber: {
			type: String,
			trim: true
		},
		// Social Links
		socialLinks: {
			twitter: { type: String, trim: true },
			linkedin: { type: String, trim: true },
			github: { type: String, trim: true },
			instagram: { type: String, trim: true }
		},
		// Privacy Settings
		profileVisibility: {
			type: String,
			enum: ['public', 'private', 'friends'],
			default: 'public'
		},
		// Statistics
		stats: {
			posts: { type: Number, default: 0 },
			followers: { type: Number, default: 0 },
			following: { type: Number, default: 0 },
			profileViews: { type: Number, default: 0 }
		},
		// Role
		role: {
			type: String,
			enum: ['user', 'admin', 'moderator', 'author'],
			default: 'user',
			required: true
		},
		// Original fields
		lastLogin: {
			type: Date,
			default: Date.now,
		},
		isVerified: {
			type: Boolean,
			default: false,
		},
		resetPasswordToken: String,
		resetPasswordExpiresAt: Date,
		verificationToken: String,
		verificationTokenExpiresAt: Date,
		// Soft Delete
		isDeleted: {
			type: Boolean,
			default: false
		},
		deletedAt: {
			type: Date,
			default: null
		}
	},
	{ timestamps: true } 
);

const User = mongoose.model("User", userSchema);
module.exports = { User }; 