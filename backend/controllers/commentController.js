const Comment = require('../schemas/Comment');
const Job = require('../schemas/Job');
const Collaborator = require('../schemas/Collaborator');
const { User } = require('../schemas/User');

/**
 * Get all comments for a transcript
 */
exports.getComments = async (req, res) => {
    try {
        const { transcriptId } = req.params;
        const { limit = 50, offset = 0, sortBy = 'timestamp' } = req.query;

        // Verify access to transcript
        const job = await Job.findById(transcriptId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Transcript not found'
            });
        }

        // Check if user has access (owner or collaborator)
        const userId = req.user?.id;
        const hasAccess = job.userId.toString() === userId || 
                         await Collaborator.findOne({ 
                             transcriptId, 
                             userId, 
                             status: 'accepted' 
                         });

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Build sort object
        const sortOptions = {};
        if (sortBy === 'timestamp') {
            sortOptions.timestamp = 1;
        } else if (sortBy === 'created') {
            sortOptions.createdAt = -1;
        }

        // Get comments with user info and replies
        const comments = await Comment.find({
            transcriptId,
            isDeleted: false,
            parentId: null // Only root comments
        })
        .populate('userId', 'name email avatar displayName')
        .populate('resolvedBy', 'name displayName')
        .populate({
            path: 'replies',
            match: { isDeleted: false },
            populate: {
                path: 'userId',
                select: 'name email avatar displayName'
            },
            options: { sort: { createdAt: 1 } }
        })
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(parseInt(offset));

        // Format comments data
        const commentsData = comments.map(comment => ({
            id: comment._id,
            text: comment.text,
            type: comment.type,
            timestamp: comment.timestamp,
            segmentIndex: comment.segmentIndex,
            wordIndex: comment.wordIndex,
            author: {
                id: comment.userId._id,
                name: comment.userId.displayName || comment.userId.name,
                email: comment.userId.email,
                avatar: comment.userId.avatar
            },
            mentions: comment.mentions,
            isResolved: comment.isResolved,
            resolvedBy: comment.resolvedBy ? {
                id: comment.resolvedBy._id,
                name: comment.resolvedBy.displayName || comment.resolvedBy.name
            } : null,
            resolvedAt: comment.resolvedAt,
            reactions: comment.reactions,
            replyCount: comment.replyCount,
            replies: comment.replies?.map(reply => ({
                id: reply._id,
                text: reply.text,
                author: {
                    id: reply.userId._id,
                    name: reply.userId.displayName || reply.userId.name,
                    email: reply.userId.email,
                    avatar: reply.userId.avatar
                },
                mentions: reply.mentions,
                reactions: reply.reactions,
                createdAt: reply.createdAt,
                isEdited: reply.isEdited
            })) || [],
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            isEdited: comment.isEdited
        }));

        res.status(200).json({
            success: true,
            data: commentsData,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: await Comment.countDocuments({
                    transcriptId,
                    isDeleted: false,
                    parentId: null
                })
            }
        });

    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get comments'
        });
    }
};

/**
 * Create a new comment
 */
exports.createComment = async (req, res) => {
    try {
        const { transcriptId } = req.params;
        const { 
            text, 
            timestamp, 
            segmentIndex, 
            wordIndex, 
            type = 'comment',
            parentId,
            mentions = []
        } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        if (timestamp < 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid timestamp'
            });
        }

        // Verify access to transcript
        const job = await Job.findById(transcriptId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Transcript not found'
            });
        }

        // Check if user has access (owner or collaborator)
        const hasAccess = job.userId.toString() === userId || 
                         await Collaborator.findOne({ 
                             transcriptId, 
                             userId, 
                             status: 'accepted' 
                         });

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // If this is a reply, verify parent comment exists
        let threadId = null;
        if (parentId) {
            const parentComment = await Comment.findById(parentId);
            if (!parentComment || parentComment.transcriptId.toString() !== transcriptId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid parent comment'
                });
            }
            threadId = parentComment.threadId || parentComment._id;
        }

        // Process mentions
        const processedMentions = [];
        if (mentions.length > 0) {
            const mentionedUsers = await User.find({
                _id: { $in: mentions },
                // Could add check to ensure mentioned users are collaborators
            }).select('_id name displayName');

            processedMentions = mentionedUsers.map(user => ({
                userId: user._id,
                username: user.displayName || user.name,
                notified: false
            }));
        }

        // Create comment
        const comment = new Comment({
            transcriptId,
            userId,
            text: text.trim(),
            type,
            timestamp,
            segmentIndex,
            wordIndex,
            parentId: parentId || null,
            threadId,
            mentions: processedMentions
        });

        await comment.save();

        // If this is a reply, update parent comment reply count
        if (parentId) {
            await Comment.findByIdAndUpdate(parentId, {
                $inc: { replyCount: 1 }
            });
        }

        // Populate user data for response
        await comment.populate('userId', 'name email avatar displayName');

        // Format response data
        const commentData = {
            id: comment._id,
            text: comment.text,
            type: comment.type,
            timestamp: comment.timestamp,
            segmentIndex: comment.segmentIndex,
            wordIndex: comment.wordIndex,
            author: {
                id: comment.userId._id,
                name: comment.userId.displayName || comment.userId.name,
                email: comment.userId.email,
                avatar: comment.userId.avatar
            },
            parentId: comment.parentId,
            threadId: comment.threadId,
            mentions: comment.mentions,
            reactions: comment.reactions,
            replyCount: comment.replyCount,
            createdAt: comment.createdAt,
            isEdited: comment.isEdited
        };

        // Emit real-time event
        const io = req.app.get('socketio');
        if (io) {
            io.to(`transcript-${transcriptId}`).emit('commentAdded', {
                transcriptId,
                comment: commentData
            });
        }

        res.status(201).json({
            success: true,
            data: commentData
        });

    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create comment'
        });
    }
};

/**
 * Update an existing comment
 */
exports.updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { text } = req.body;
        const userId = req.user.id;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Check if user owns the comment
        if (comment.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own comments'
            });
        }

        // Save original text to edit history
        if (!comment.isEdited) {
            comment.editHistory = [{
                text: comment.text,
                editedAt: comment.createdAt
            }];
        }

        // Update comment
        comment.text = text.trim();
        comment.isEdited = true;
        comment.editHistory.push({
            text: text.trim(),
            editedAt: new Date()
        });

        await comment.save();

        // Emit real-time event
        const io = req.app.get('socketio');
        if (io) {
            io.to(`transcript-${comment.transcriptId}`).emit('commentUpdated', {
                transcriptId: comment.transcriptId,
                commentId: comment._id,
                text: comment.text,
                isEdited: comment.isEdited,
                updatedAt: comment.updatedAt
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: comment._id,
                text: comment.text,
                isEdited: comment.isEdited,
                updatedAt: comment.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update comment'
        });
    }
};

/**
 * Delete a comment
 */
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Check if user owns the comment or is transcript owner
        const job = await Job.findById(comment.transcriptId);
        const canDelete = comment.userId.toString() === userId || 
                         job.userId.toString() === userId;

        if (!canDelete) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this comment'
            });
        }

        // Soft delete
        comment.isDeleted = true;
        comment.deletedAt = new Date();
        await comment.save();

        // If this was a reply, update parent reply count
        if (comment.parentId) {
            await Comment.findByIdAndUpdate(comment.parentId, {
                $inc: { replyCount: -1 }
            });
        }

        // Emit real-time event
        const io = req.app.get('socketio');
        if (io) {
            io.to(`transcript-${comment.transcriptId}`).emit('commentDeleted', {
                transcriptId: comment.transcriptId,
                commentId: comment._id
            });
        }

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete comment'
        });
    }
};

/**
 * Resolve/unresolve a comment
 */
exports.resolveComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { resolved = true } = req.body;
        const userId = req.user.id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Verify user has permission (owner, collaborator with moderator+ role)
        const job = await Job.findById(comment.transcriptId);
        const collaborator = await Collaborator.findOne({
            transcriptId: comment.transcriptId,
            userId,
            status: 'accepted'
        });

        const canResolve = job.userId.toString() === userId || 
                          (collaborator && ['moderator', 'admin'].includes(collaborator.permission));

        if (!canResolve) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to resolve comments'
            });
        }

        // Update comment resolution status
        comment.isResolved = resolved;
        comment.resolvedBy = resolved ? userId : null;
        comment.resolvedAt = resolved ? new Date() : null;

        await comment.save();

        // Emit real-time event
        const io = req.app.get('socketio');
        if (io) {
            io.to(`transcript-${comment.transcriptId}`).emit('commentResolved', {
                transcriptId: comment.transcriptId,
                commentId: comment._id,
                isResolved: comment.isResolved,
                resolvedBy: comment.resolvedBy,
                resolvedAt: comment.resolvedAt
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: comment._id,
                isResolved: comment.isResolved,
                resolvedBy: comment.resolvedBy,
                resolvedAt: comment.resolvedAt
            }
        });

    } catch (error) {
        console.error('Error resolving comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve comment'
        });
    }
};

module.exports = exports;
