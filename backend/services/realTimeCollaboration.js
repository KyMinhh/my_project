const Presence = require('../models/Presence');
const { User } = require('../models/User');

class RealTimeCollaboration {
    constructor(io) {
        this.io = io;
        this.initializeSocketHandlers();
    }

    initializeSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('🔌 User connected for collaboration:', socket.id);

            // Join transcript room
            socket.on('joinTranscript', async (data) => {
                try {
                    const { transcriptId, userId } = data;
                    
                    // Validate user and transcript access
                    if (!transcriptId || !userId) {
                        socket.emit('error', { message: 'Invalid transcriptId or userId' });
                        return;
                    }

                    // Join the transcript room
                    socket.join(`transcript-${transcriptId}`);
                    
                    // Create or update presence record
                    await this.updateUserPresence(socket, transcriptId, userId, 'viewing');
                    
                    // Notify others about user joining
                    socket.to(`transcript-${transcriptId}`).emit('userJoined', {
                        userId,
                        socketId: socket.id,
                        timestamp: new Date()
                    });

                    // Send current active users to the new user
                    const activeUsers = await this.getActiveUsers(transcriptId);
                    socket.emit('activeUsers', activeUsers);

                    console.log(`👥 User ${userId} joined transcript ${transcriptId}`);

                } catch (error) {
                    console.error('Error joining transcript:', error);
                    socket.emit('error', { message: 'Failed to join transcript collaboration' });
                }
            });

            // Leave transcript room
            socket.on('leaveTranscript', async (data) => {
                try {
                    const { transcriptId, userId } = data;
                    
                    socket.leave(`transcript-${transcriptId}`);
                    
                    // Remove presence record
                    await Presence.deleteOne({ socketId: socket.id });
                    
                    // Notify others about user leaving
                    socket.to(`transcript-${transcriptId}`).emit('userLeft', {
                        userId,
                        socketId: socket.id,
                        timestamp: new Date()
                    });

                    console.log(`👋 User ${userId} left transcript ${transcriptId}`);

                } catch (error) {
                    console.error('Error leaving transcript:', error);
                }
            });

            // Handle real-time text editing
            socket.on('textEdit', async (data) => {
                try {
                    const { transcriptId, segmentIndex, operation, position, text, userId } = data;
                    
                    // Validate edit data
                    if (!transcriptId || segmentIndex === undefined || !operation) {
                        socket.emit('error', { message: 'Invalid edit data' });
                        return;
                    }

                    // Update user activity
                    await this.updateUserActivity(socket.id, 'editing', { segmentIndex, position });

                    // Broadcast edit to other users in the room
                    socket.to(`transcript-${transcriptId}`).emit('textEditReceived', {
                        userId,
                        segmentIndex,
                        operation,
                        position,
                        text,
                        timestamp: new Date(),
                        socketId: socket.id
                    });

                    // Update presence with current editing position
                    await Presence.findOneAndUpdate(
                        { socketId: socket.id },
                        {
                            activity: 'editing',
                            currentSegment: segmentIndex,
                            'cursor.position': position,
                            'cursor.segmentIndex': segmentIndex,
                            lastActive: new Date()
                        }
                    );

                } catch (error) {
                    console.error('Error handling text edit:', error);
                    socket.emit('error', { message: 'Failed to process text edit' });
                }
            });

            // Handle cursor position updates
            socket.on('cursorMove', async (data) => {
                try {
                    const { transcriptId, segmentIndex, position, userId } = data;
                    
                    // Update cursor position in presence
                    await Presence.findOneAndUpdate(
                        { socketId: socket.id },
                        {
                            'cursor.position': position,
                            'cursor.segmentIndex': segmentIndex,
                            currentSegment: segmentIndex,
                            lastActive: new Date()
                        }
                    );

                    // Broadcast cursor position to others
                    socket.to(`transcript-${transcriptId}`).emit('cursorMoved', {
                        userId,
                        segmentIndex,
                        position,
                        socketId: socket.id
                    });

                } catch (error) {
                    console.error('Error updating cursor position:', error);
                }
            });

            // Handle typing indicators
            socket.on('typingStart', async (data) => {
                try {
                    const { transcriptId, segmentIndex, userId } = data;
                    
                    await Presence.findOneAndUpdate(
                        { socketId: socket.id },
                        {
                            isTyping: true,
                            'typingAt.segmentIndex': segmentIndex,
                            'typingAt.timestamp': new Date(),
                            activity: 'typing',
                            lastActive: new Date()
                        }
                    );

                    socket.to(`transcript-${transcriptId}`).emit('userTyping', {
                        userId,
                        segmentIndex,
                        socketId: socket.id,
                        isTyping: true
                    });

                } catch (error) {
                    console.error('Error handling typing start:', error);
                }
            });

            socket.on('typingStop', async (data) => {
                try {
                    const { transcriptId, userId } = data;
                    
                    await Presence.findOneAndUpdate(
                        { socketId: socket.id },
                        {
                            isTyping: false,
                            activity: 'viewing',
                            lastActive: new Date()
                        }
                    );

                    socket.to(`transcript-${transcriptId}`).emit('userTyping', {
                        userId,
                        socketId: socket.id,
                        isTyping: false
                    });

                } catch (error) {
                    console.error('Error handling typing stop:', error);
                }
            });

            // Handle video seek synchronization
            socket.on('videoSeek', async (data) => {
                try {
                    const { transcriptId, timestamp, userId } = data;
                    
                    await Presence.findOneAndUpdate(
                        { socketId: socket.id },
                        {
                            videoTimestamp: timestamp,
                            lastActive: new Date()
                        }
                    );

                    socket.to(`transcript-${transcriptId}`).emit('videoSeeked', {
                        userId,
                        timestamp,
                        socketId: socket.id
                    });

                } catch (error) {
                    console.error('Error handling video seek:', error);
                }
            });

            // Handle heartbeat for presence tracking
            socket.on('heartbeat', async () => {
                try {
                    await Presence.findOneAndUpdate(
                        { socketId: socket.id },
                        {
                            lastHeartbeat: new Date(),
                            lastActive: new Date()
                        }
                    );
                } catch (error) {
                    console.error('Error updating heartbeat:', error);
                }
            });

            // Handle disconnect
            socket.on('disconnect', async () => {
                try {
                    // Get presence record to notify others
                    const presence = await Presence.findOne({ socketId: socket.id });
                    
                    if (presence) {
                        // Notify others in the transcript room
                        socket.to(`transcript-${presence.transcriptId}`).emit('userLeft', {
                            userId: presence.userId,
                            socketId: socket.id,
                            timestamp: new Date()
                        });

                        // Remove presence record
                        await Presence.deleteOne({ socketId: socket.id });
                    }

                    console.log('👋 User disconnected from collaboration:', socket.id);

                } catch (error) {
                    console.error('Error handling disconnect:', error);
                }
            });
        });
    }

    async updateUserPresence(socket, transcriptId, userId, activity = 'viewing') {
        try {
            // Get user info and request metadata
            const user = await User.findById(userId).select('name email displayName avatar');
            if (!user) {
                throw new Error('User not found');
            }

            const clientIp = socket.request.connection.remoteAddress;
            const userAgent = socket.request.headers['user-agent'];
            
            // Detect device type
            let device = 'desktop';
            if (userAgent) {
                if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
                    device = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
                }
            }

            // Create or update presence record
            const presence = await Presence.findOneAndUpdate(
                { transcriptId, userId },
                {
                    socketId: socket.id,
                    status: 'active',
                    activity,
                    userAgent,
                    ipAddress: clientIp,
                    device,
                    connectedAt: new Date(),
                    lastActive: new Date(),
                    lastHeartbeat: new Date()
                },
                { 
                    upsert: true, 
                    new: true 
                }
            );

            return presence;

        } catch (error) {
            console.error('Error updating user presence:', error);
            throw error;
        }
    }

    async updateUserActivity(socketId, activity, metadata = {}) {
        try {
            const updateData = {
                activity,
                lastActive: new Date()
            };

            // Add metadata based on activity
            if (metadata.segmentIndex !== undefined) {
                updateData.currentSegment = metadata.segmentIndex;
            }
            if (metadata.position !== undefined) {
                updateData['cursor.position'] = metadata.position;
            }

            await Presence.findOneAndUpdate(
                { socketId },
                updateData
            );

        } catch (error) {
            console.error('Error updating user activity:', error);
        }
    }

    async getActiveUsers(transcriptId) {
        try {
            const activeUsers = await Presence.find({
                transcriptId,
                lastHeartbeat: { 
                    $gte: new Date(Date.now() - 30000) // Active within last 30 seconds
                }
            })
            .populate('userId', 'name email displayName avatar')
            .select('userId socketId status activity cursor currentSegment videoTimestamp device isTyping connectedAt');

            return activeUsers.map(presence => ({
                user: {
                    id: presence.userId._id,
                    name: presence.userId.displayName || presence.userId.name,
                    email: presence.userId.email,
                    avatar: presence.userId.avatar
                },
                socketId: presence.socketId,
                status: presence.status,
                activity: presence.activity,
                cursor: presence.cursor,
                currentSegment: presence.currentSegment,
                videoTimestamp: presence.videoTimestamp,
                device: presence.device,
                isTyping: presence.isTyping,
                connectedAt: presence.connectedAt
            }));

        } catch (error) {
            console.error('Error getting active users:', error);
            return [];
        }
    }

    // Utility method to broadcast to all users in a transcript
    broadcastToTranscript(transcriptId, event, data) {
        this.io.to(`transcript-${transcriptId}`).emit(event, data);
    }

    // Clean up old presence records (can be called periodically)
    async cleanupStalePresence() {
        try {
            const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
            await Presence.deleteMany({
                lastHeartbeat: { $lt: staleThreshold }
            });
        } catch (error) {
            console.error('Error cleaning up stale presence:', error);
        }
    }
}

module.exports = RealTimeCollaboration;
