const express = require('express');
const { verifyToken } = require('../middleware/verifyToken');
const { User } = require('../schemas/User');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatars/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password -resetPasswordToken -verificationToken');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get user profile by ID (public view)
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password -email -resetPasswordToken -verificationToken -resetPasswordExpiresAt -verificationTokenExpiresAt');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Check privacy settings
        if (user.profileVisibility === 'private') {
            return res.status(403).json({ success: false, message: 'Profile is private' });
        }
        
        // Increment profile views
        await User.findByIdAndUpdate(req.params.userId, { 
            $inc: { 'stats.profileViews': 1 } 
        });
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update user profile
router.put('/me', verifyToken, async (req, res) => {
    try {
        const {
            displayName,
            bio,
            location,
            website,
            dateOfBirth,
            phoneNumber,
            socialLinks,
            profileVisibility
        } = req.body;

        const updateData = {};
        
        // Only include fields that are provided
        if (displayName !== undefined) updateData.displayName = displayName;
        if (bio !== undefined) updateData.bio = bio;
        if (location !== undefined) updateData.location = location;
        if (website !== undefined) updateData.website = website;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
        if (profileVisibility !== undefined) updateData.profileVisibility = profileVisibility;

        const user = await User.findByIdAndUpdate(
            req.userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -resetPasswordToken -verificationToken');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error',
                errors: error.errors 
            });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Upload avatar
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        const user = await User.findByIdAndUpdate(
            req.userId,
            { avatar: avatarUrl },
            { new: true }
        ).select('-password -resetPasswordToken -verificationToken');

        res.json({ 
            success: true, 
            user, 
            avatarUrl,
            message: 'Avatar uploaded successfully' 
        });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete avatar
router.delete('/avatar', verifyToken, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.userId,
            { avatar: null },
            { new: true }
        ).select('-password -resetPasswordToken -verificationToken');

        res.json({ 
            success: true, 
            user,
            message: 'Avatar removed successfully' 
        });
    } catch (error) {
        console.error('Error removing avatar:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Search users
router.get('/search/:query', verifyToken, async (req, res) => {
    try {
        const { query } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const users = await User.find({
            $or: [
                { displayName: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } }
            ],
            profileVisibility: 'public'
        })
        .select('name displayName avatar bio stats')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ 'stats.followers': -1 });

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
