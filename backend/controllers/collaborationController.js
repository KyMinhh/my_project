const Collaboration = require('../schemas/Collaboration');
const ShareLink = require('../schemas/ShareLink');
const Collaborator = require('../schemas/Collaborator');
const Comment = require('../schemas/Comment');
const Job = require('../schemas/Job');
const { User } = require('../schemas/User');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Generate secure random string for share links
const generateLinkId = () => {
    return crypto.randomBytes(16).toString('hex');
};

// Generate invitation token
const generateInvitationToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Create or get collaboration settings for a transcript
 */
exports.initializeCollaboration = async (req, res) => {
    try {
        const { transcriptId } = req.params;
        const userId = req.user.id;

        // Verify transcript exists and user owns it
        const job = await Job.findById(transcriptId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Transcript not found'
            });
        }

        if (job.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to manage collaboration for this transcript'
            });
        }

        // Check if collaboration already exists
        let collaboration = await Collaboration.findOne({ transcriptId });
        
        if (!collaboration) {
            // Create new collaboration
            collaboration = new Collaboration({
                transcriptId,
                ownerId: userId,
                settings: {
                    allowPublicSharing: false,
                    defaultPermission: 'viewer',
                    requireApproval: false,
                    allowComments: true,
                    allowDownload: false
                }
            });
            await collaboration.save();
        }

        res.status(200).json({
            success: true,
            data: collaboration
        });

    } catch (error) {
        console.error('Error initializing collaboration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize collaboration'
        });
    }
};

/**
 * Create a share link for the transcript
 */
exports.createShareLink = async (req, res) => {
    try {
        const { transcriptId } = req.params;
        const { 
            permissions = 'viewer', 
            password, 
            expiresIn, 
            maxAccessCount,
            title,
            description 
        } = req.body;
        const userId = req.user.id;

        // Verify transcript ownership
        const job = await Job.findById(transcriptId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Transcript not found'
            });
        }

        if (job.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to share this transcript'
            });
        }

        // Calculate expiration date
        let expiresAt = null;
        if (expiresIn) {
            const now = new Date();
            switch (expiresIn) {
                case '1h':
                    expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
                    break;
                case '1d':
                    expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    break;
            }
        }

        // Hash password if provided
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // Generate unique link ID
        let linkId;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 5) {
            linkId = generateLinkId();
            const existing = await ShareLink.findOne({ linkId });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate unique share link'
            });
        }

        // Create share link
        const shareLink = new ShareLink({
            transcriptId,
            linkId,
            createdBy: userId,
            title: title || job.originalName || 'Shared Transcript',
            description,
            permissions,
            password: hashedPassword,
            expiresAt,
            maxAccessCount
        });

        await shareLink.save();

        // Return share link without sensitive data
        const shareLinkData = {
            id: shareLink._id,
            linkId: shareLink.linkId,
            url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${linkId}`,
            title: shareLink.title,
            description: shareLink.description,
            permissions: shareLink.permissions,
            hasPassword: !!password,
            expiresAt: shareLink.expiresAt,
            maxAccessCount: shareLink.maxAccessCount,
            accessCount: shareLink.accessCount,
            createdAt: shareLink.createdAt
        };

        res.status(201).json({
            success: true,
            data: shareLinkData
        });

    } catch (error) {
        console.error('Error creating share link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create share link'
        });
    }
};

/**
 * Get all share links for a transcript
 */
exports.getShareLinks = async (req, res) => {
    try {
        const { transcriptId } = req.params;
        const userId = req.user.id;

        // Verify transcript ownership
        const job = await Job.findById(transcriptId);
        if (!job || job.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const shareLinks = await ShareLink.find({ 
            transcriptId, 
            isActive: true 
        }).select('-password').sort({ createdAt: -1 });

        const shareLinksData = shareLinks.map(link => ({
            id: link._id,
            linkId: link.linkId,
            url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${link.linkId}`,
            title: link.title,
            description: link.description,
            permissions: link.permissions,
            hasPassword: !!link.password,
            expiresAt: link.expiresAt,
            maxAccessCount: link.maxAccessCount,
            accessCount: link.accessCount,
            analytics: link.analytics,
            createdAt: link.createdAt
        }));

        res.status(200).json({
            success: true,
            data: shareLinksData
        });

    } catch (error) {
        console.error('Error getting share links:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get share links'
        });
    }
};

/**
 * Access shared transcript via link
 */
exports.accessSharedTranscript = async (req, res) => {
    try {
        const { linkId } = req.params;
        const { password } = req.body;

        // Find share link
        const shareLink = await ShareLink.findOne({ 
            linkId, 
            isActive: true 
        }).populate('transcriptId');

        if (!shareLink) {
            return res.status(404).json({
                success: false,
                message: 'Share link not found or has expired'
            });
        }

        // Check if link has expired
        if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
            return res.status(410).json({
                success: false,
                message: 'Share link has expired'
            });
        }

        // Check max access count
        if (shareLink.maxAccessCount && shareLink.accessCount >= shareLink.maxAccessCount) {
            return res.status(429).json({
                success: false,
                message: 'Share link has reached maximum access limit'
            });
        }

        // Check password if required
        if (shareLink.password) {
            if (!password) {
                return res.status(401).json({
                    success: false,
                    message: 'Password required',
                    requiresPassword: true
                });
            }

            const isPasswordValid = await bcrypt.compare(password, shareLink.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid password'
                });
            }
        }

        // Update analytics
        shareLink.analytics.views += 1;
        shareLink.analytics.lastAccessed = new Date();
        shareLink.accessCount += 1;

        // Log access (get IP from request)
        const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        shareLink.analytics.accessLog.push({
            ip: clientIp,
            userAgent: req.get('User-Agent'),
            timestamp: new Date()
        });

        await shareLink.save();

        // Get transcript data
        const job = shareLink.transcriptId;
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Transcript not found'
            });
        }

        // Return transcript data based on permissions
        const transcriptData = {
            id: job._id,
            title: shareLink.title,
            description: shareLink.description,
            originalName: job.originalName,
            duration: job.duration,
            transcriptionResult: job.transcriptionResult,
            segments: job.segments,
            permissions: shareLink.permissions,
            allowComments: true, // Could be based on collaboration settings
            createdAt: job.createdAt
        };

        res.status(200).json({
            success: true,
            data: transcriptData
        });

    } catch (error) {
        console.error('Error accessing shared transcript:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to access shared transcript'
        });
    }
};

/**
 * Revoke/delete a share link
 */
exports.revokeShareLink = async (req, res) => {
    try {
        const { linkId } = req.params;
        const userId = req.user.id;

        const shareLink = await ShareLink.findOne({ linkId }).populate('transcriptId');
        
        if (!shareLink) {
            return res.status(404).json({
                success: false,
                message: 'Share link not found'
            });
        }

        // Verify user owns the transcript
        if (shareLink.transcriptId.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Deactivate the link
        shareLink.isActive = false;
        await shareLink.save();

        res.status(200).json({
            success: true,
            message: 'Share link revoked successfully'
        });

    } catch (error) {
        console.error('Error revoking share link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke share link'
        });
    }
};

module.exports = exports;
