const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const { isAdmin, isAdminOrModerator } = require('../middleware/checkRole');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { User } = require('../schemas/User');
const Job = require('../schemas/Job');
const Share = require('../schemas/Share');
const Activity = require('../schemas/Activity');
const UserRole = require('../schemas/UserRole');

// ==================== USER MANAGEMENT ====================

// Get all users (with pagination)
router.get('/users', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Support includeDeleted parameter to show soft-deleted users
    const includeDeleted = req.query.includeDeleted === 'true';
    const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };
    
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
        filter.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    const users = await User.find(filter)
        .select('-password -resetPasswordToken -verificationToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
        success: true,
        data: users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// Get single user
router.get('/users/:id', verifyToken, isAdminOrModerator, catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id)
        .select('-password -resetPasswordToken -verificationToken');
    
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.json({ success: true, data: user });
}));

// Update user role
router.patch('/users/:id/role', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const { role } = req.body;
    
    if (!['user', 'admin', 'moderator', 'author'].includes(role)) {
        return next(new AppError('Invalid role', 400));
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Log activity
    await Activity.create({
        userId: req.user.id,
        action: 'update',
        resourceType: 'user',
        resourceId: user._id,
        details: `Changed role to ${role}`
    });

    res.json({ success: true, data: user, message: 'User role updated successfully' });
}));

// Soft delete user
router.delete('/users/:id', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Mark as deleted
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    // Log activity
    await Activity.create({
        userId: req.user.id,
        action: 'delete',
        resourceType: 'user',
        resourceId: user._id,
        details: 'Soft deleted user'
    });

    res.json({ success: true, message: 'User deleted successfully' });
}));

// Restore user
router.post('/users/:id/restore', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    user.isDeleted = false;
    user.deletedAt = null;
    await user.save();

    await Activity.create({
        userId: req.user.id,
        action: 'update',
        resourceType: 'user',
        resourceId: user._id,
        details: 'Restored user'
    });

    res.json({ success: true, data: user, message: 'User restored successfully' });
}));

// ==================== JOB MANAGEMENT ====================

// Get all jobs
router.get('/jobs', verifyToken, isAdminOrModerator, catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Support includeDeleted parameter
    const includeDeleted = req.query.includeDeleted === 'true';
    const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };
    
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userId) filter.userId = req.query.userId;

    const jobs = await Job.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Job.countDocuments(filter);

    res.json({
        success: true,
        data: jobs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// Delete job (soft delete)
router.delete('/jobs/:id', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
        return next(new AppError('Job not found', 404));
    }

    job.isDeleted = true;
    job.deletedAt = new Date();
    await job.save();

    await Activity.create({
        userId: req.user.id,
        action: 'delete',
        resourceType: 'job',
        resourceId: job._id,
        details: 'Soft deleted job'
    });

    res.json({ success: true, message: 'Job deleted successfully' });
}));

// Restore job
router.post('/jobs/:id/restore', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
        return next(new AppError('Job not found', 404));
    }

    job.isDeleted = false;
    job.deletedAt = null;
    await job.save();

    await Activity.create({
        userId: req.user.id,
        action: 'update',
        resourceType: 'job',
        resourceId: job._id,
        details: 'Restored job'
    });

    res.json({ success: true, data: job, message: 'Job restored successfully' });
}));

// ==================== SHARE MANAGEMENT ====================

// Get all shares
router.get('/shares', verifyToken, isAdminOrModerator, catchAsync(async (req, res, next) => {
    // Support includeDeleted parameter
    const includeDeleted = req.query.includeDeleted === 'true';
    const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };
    
    const shares = await Share.find(filter)
        .populate('jobId', 'fileName originalName')
        .populate('ownerId', 'name email')
        .sort({ createdAt: -1 })
        .limit(50);

    res.json({ success: true, data: shares });
}));

// Soft delete share
router.delete('/shares/:id', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const share = await Share.findById(req.params.id);
    
    if (!share) {
        return next(new AppError('Share not found', 404));
    }

    share.isDeleted = true;
    share.deletedAt = new Date();
    await share.save();

    await Activity.create({
        userId: req.user.id,
        action: 'delete',
        resourceType: 'share',
        resourceId: share._id,
        details: 'Soft deleted share'
    });

    res.json({ success: true, message: 'Share deleted successfully' });
}));

// Restore share
router.post('/shares/:id/restore', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const share = await Share.findById(req.params.id);
    
    if (!share) {
        return next(new AppError('Share not found', 404));
    }

    share.isDeleted = false;
    share.deletedAt = null;
    await share.save();

    await Activity.create({
        userId: req.user.id,
        action: 'update',
        resourceType: 'share',
        resourceId: share._id,
        details: 'Restored share'
    });

    res.json({ success: true, data: share, message: 'Share restored successfully' });
}));

// ==================== ACTIVITY LOG ====================

// Get activity logs
router.get('/activities', verifyToken, isAdminOrModerator, catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.action) filter.action = req.query.action;

    const activities = await Activity.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Activity.countDocuments(filter);

    res.json({
        success: true,
        data: activities,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// ==================== STATISTICS ====================

// Get admin dashboard stats
router.get('/stats', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const [
        totalUsers,
        totalJobs,
        totalShares,
        activeUsers,
        jobStats,
        recentActivities
    ] = await Promise.all([
        User.countDocuments(),
        Job.countDocuments(),
        Share.countDocuments(),
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        Job.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]),
        Activity.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(10)
    ]);

    // Format job stats
    const jobStatusCounts = {};
    jobStats.forEach(stat => {
        jobStatusCounts[stat._id] = stat.count;
    });

    res.json({
        success: true,
        data: {
            totalUsers,
            totalJobs,
            totalShares,
            activeUsers,
            jobStatusCounts,
            recentActivities
        }
    });
}));

// ==================== USER ROLES MANAGEMENT ====================

// Get all user roles
router.get('/user-roles', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const userRoles = await UserRole.findActive()
        .populate('userId', 'name email')
        .populate('assignedBy', 'name email')
        .sort({ createdAt: -1 });

    res.json({ success: true, data: userRoles });
}));

// Create user role
router.post('/user-roles', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const { userId, role, permissions, limits, notes } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Check if user role already exists
    const existingRole = await UserRole.findOne({ userId });
    if (existingRole) {
        return next(new AppError('User role already exists', 400));
    }

    const userRole = await UserRole.create({
        userId,
        role,
        permissions,
        limits,
        notes,
        assignedBy: req.user.id
    });

    // Update user's role field
    user.role = role;
    await user.save();

    await Activity.create({
        userId: req.user.id,
        action: 'create',
        resourceType: 'user',
        resourceId: userId,
        details: `Assigned role: ${role}`
    });

    res.status(201).json({ 
        success: true, 
        data: userRole,
        message: 'User role created successfully' 
    });
}));

// Update user role
router.patch('/user-roles/:id', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const { role, permissions, limits, notes, isActive } = req.body;

    const userRole = await UserRole.findById(req.params.id);
    if (!userRole) {
        return next(new AppError('User role not found', 404));
    }

    if (role) userRole.role = role;
    if (permissions) userRole.permissions = { ...userRole.permissions, ...permissions };
    if (limits) userRole.limits = { ...userRole.limits, ...limits };
    if (notes !== undefined) userRole.notes = notes;
    if (isActive !== undefined) userRole.isActive = isActive;

    await userRole.save();

    // Update user's role field if role changed
    if (role) {
        await User.findByIdAndUpdate(userRole.userId, { role });
    }

    await Activity.create({
        userId: req.user.id,
        action: 'update',
        resourceType: 'user',
        resourceId: userRole.userId,
        details: 'Updated user role'
    });

    res.json({ 
        success: true, 
        data: userRole,
        message: 'User role updated successfully' 
    });
}));

// Soft delete user role
router.delete('/user-roles/:id', verifyToken, isAdmin, catchAsync(async (req, res, next) => {
    const userRole = await UserRole.findById(req.params.id);
    
    if (!userRole) {
        return next(new AppError('User role not found', 404));
    }

    await userRole.softDelete(req.user.id);

    await Activity.create({
        userId: req.user.id,
        action: 'delete',
        resourceType: 'user',
        resourceId: userRole.userId,
        details: 'Deleted user role'
    });

    res.json({ success: true, message: 'User role deleted successfully' });
}));

module.exports = router;
