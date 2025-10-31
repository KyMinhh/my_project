const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const Job = require('../schemas/Job');

// Helper function to get stats
async function getDashboardStats(userId) {
    // Get all jobs for the user
    const allJobs = await Job.find({ userId }).sort({ createdAt: -1 });
    
    // Calculate stats
    const totalJobs = allJobs.length;
    const completedJobs = allJobs.filter(job => job.status === 'completed' || job.status === 'success').length;
    const pendingJobs = allJobs.filter(job => job.status === 'processing' || job.status === 'pending' || job.status === 'queued').length;
    const failedJobs = allJobs.filter(job => job.status === 'failed' || job.status === 'error').length;
    
    // Calculate total video minutes
    const totalVideoMinutes = allJobs.reduce((total, job) => {
        return total + (job.duration ? Math.round(job.duration / 60) : 0);
    }, 0);
    
    // Calculate completion rate
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    
    return {
        totalJobs,
        completedJobs,
        pendingJobs,
        failedJobs,
        totalVideoMinutes,
        completionRate: Math.round(completionRate * 10) / 10 // Round to 1 decimal
    };
}

// Get dashboard stats for authenticated user
router.get('/dashboard/stats', verifyToken, catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    
    if (!userId) {
        return next(new AppError('User ID not found', 400));
    }
    
    const stats = await getDashboardStats(userId);
    res.json(stats);
}));

// DEV ONLY: Get stats by userId (for testing without auth)
if (process.env.NODE_ENV === 'development') {
    router.post('/dashboard/stats', catchAsync(async (req, res, next) => {
        const { userId } = req.body;
        
        if (!userId) {
            return next(new AppError('User ID is required', 400));
        }
        
        const stats = await getDashboardStats(userId);
        res.json(stats);
    }));
}

// Get recent jobs for authenticated user
router.get('/dashboard/recent-jobs', verifyToken, catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    
    if (!userId) {
        return next(new AppError('User ID not found', 400));
    }
    
    const limit = parseInt(req.query.limit) || 5;
    
    if (limit < 1 || limit > 100) {
        return next(new AppError('Limit must be between 1 and 100', 400));
    }
    
    const recentJobs = await Job.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('fileName originalName status createdAt duration sourceType fileSize transcriptionResult');
    
    const formattedJobs = recentJobs.map(job => ({
        _id: job._id,
        filename: job.originalName || job.fileName,
        status: job.status,
        createdAt: job.createdAt,
        duration: job.duration,
        sourceType: job.sourceType,
        fileSize: job.fileSize,
        hasTranscript: !!job.transcriptionResult
    }));
    
    res.json(formattedJobs);
}));

module.exports = router;
