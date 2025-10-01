const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const Job = require('../models/Job');

// Get dashboard stats for authenticated user
router.get('/dashboard/stats', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
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
        
        const stats = {
            totalJobs,
            completedJobs,
            pendingJobs,
            failedJobs,
            totalVideoMinutes,
            completionRate: Math.round(completionRate * 10) / 10 // Round to 1 decimal
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch dashboard stats',
            error: error.message 
        });
    }
});

// Get recent jobs for authenticated user
router.get('/dashboard/recent-jobs', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 5;
        
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
    } catch (error) {
        console.error('Error fetching recent jobs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch recent jobs',
            error: error.message 
        });
    }
});

module.exports = router;
