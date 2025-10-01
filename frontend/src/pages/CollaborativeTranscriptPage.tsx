import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    Button,
    Fab,
    Drawer,
    AppBar,
    Toolbar,
    IconButton,
    Badge,
    Chip,
    Alert,
    Snackbar
} from '@mui/material';
import {
    Share as ShareIcon,
    Comment as CommentIcon,
    People as PeopleIcon,
    Save as SaveIcon,
    ArrowBack as ArrowBackIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

// Import collaboration components
import ShareModal from '../components/collaboration/ShareModal';
import CommentThread from '../components/collaboration/CommentThread';
import UserPresenceIndicator from '../components/collaboration/UserPresenceIndicator';
import RealTimeEditor from '../components/collaboration/RealTimeEditor';
import collaborationSocket from '../services/collaborationSocket';

interface TranscriptData {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    owner: {
        id: string;
        name: string;
        avatar?: string;
    };
    permissions: 'viewer' | 'editor' | 'owner';
}

interface Comment {
    id: string;
    content: string;
    timestamp: number;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
    mentions: string[];
    reactions: {
        type: string;
        users: string[];
    }[];
    replies: Comment[];
    parentId?: string;
    isResolved: boolean;
    editHistory: any[];
    createdAt: string;
    updatedAt: string;
}

interface UserPresence {
    id: string;
    userId: string;
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    socketId: string;
    isActive: boolean;
    lastSeen: string;
    currentActivity: 'viewing' | 'editing' | 'commenting';
    cursor?: {
        position: number;
        selection?: {
            start: number;
            end: number;
        };
    };
    device: {
        type: 'desktop' | 'mobile' | 'tablet';
        browser: string;
    };
}

const CollaborativeTranscriptPage: React.FC = () => {
    const { transcriptId } = useParams<{ transcriptId: string }>();
    const navigate = useNavigate();

    // State
    const [transcript, setTranscript] = useState<TranscriptData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    
    // Collaboration state
    const [comments, setComments] = useState<Comment[]>([]);
    const [presenceData, setPresenceData] = useState<UserPresence[]>([]);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);
    const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Notifications
    const [notification, setNotification] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning' | 'info';
    }>({
        open: false,
        message: '',
        severity: 'info'
    });

    // Load initial data
    useEffect(() => {
        const loadTranscript = async () => {
            if (!transcriptId) return;

            try {
                setLoading(true);
                
                // Load transcript data
                const transcriptResponse = await fetch(`/api/transcripts/${transcriptId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!transcriptResponse.ok) {
                    throw new Error('Failed to load transcript');
                }

                const transcriptData = await transcriptResponse.json();
                setTranscript(transcriptData.data);

                // Load comments
                const commentsResponse = await fetch(`/api/comments/transcript/${transcriptId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (commentsResponse.ok) {
                    const commentsData = await commentsResponse.json();
                    setComments(commentsData.data || []);
                }

                // Load current user
                const userResponse = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    setCurrentUser(userData.data);
                }

            } catch (err) {
                console.error('Error loading transcript:', err);
                setError('Không thể tải transcript');
            } finally {
                setLoading(false);
            }
        };

        loadTranscript();
    }, [transcriptId]);

    // Socket event handlers
    useEffect(() => {
        if (!transcriptId || !currentUser) return;

        const socket = collaborationSocket.getSocket();
        if (!socket) return;

        // Join transcript room
        collaborationSocket.joinTranscript(transcriptId, currentUser.id);

        // Set up event listeners
        const handlePresenceUpdate = (data: { users: UserPresence[] }) => {
            setPresenceData(data.users);
        };

        const handleCommentAdded = (data: { comment: Comment }) => {
            setComments(prev => [...prev, data.comment]);
            showNotification('Có bình luận mới', 'info');
        };

        const handleCommentUpdated = (data: { commentId: string; updates: any }) => {
            setComments(prev => prev.map(comment => 
                comment.id === data.commentId 
                    ? { ...comment, ...data.updates }
                    : comment
            ));
        };

        const handleCommentDeleted = (data: { commentId: string }) => {
            setComments(prev => prev.filter(comment => comment.id !== data.commentId));
        };

        const handleCommentResolved = (data: { commentId: string }) => {
            setComments(prev => prev.map(comment => 
                comment.id === data.commentId 
                    ? { ...comment, isResolved: true }
                    : comment
            ));
        };

        const handleSaveConfirm = (data: { success: boolean; timestamp: string }) => {
            if (data.success) {
                showNotification('Đã lưu thành công', 'success');
            } else {
                showNotification('Lỗi khi lưu', 'error');
            }
        };

        // Register listeners
        collaborationSocket.on('presence-update', handlePresenceUpdate);
        collaborationSocket.on('comment-added', handleCommentAdded);
        collaborationSocket.on('comment-updated', handleCommentUpdated);
        collaborationSocket.on('comment-deleted', handleCommentDeleted);
        collaborationSocket.on('comment-resolved', handleCommentResolved);
        collaborationSocket.on('save-confirm', handleSaveConfirm);

        // Cleanup
        return () => {
            collaborationSocket.off('presence-update', handlePresenceUpdate);
            collaborationSocket.off('comment-added', handleCommentAdded);
            collaborationSocket.off('comment-updated', handleCommentUpdated);
            collaborationSocket.off('comment-deleted', handleCommentDeleted);
            collaborationSocket.off('comment-resolved', handleCommentResolved);
            collaborationSocket.off('save-confirm', handleSaveConfirm);
            
            collaborationSocket.leaveTranscript(transcriptId, currentUser.id);
        };
    }, [transcriptId, currentUser]);

    // Comment handlers
    const handleAddComment = async (content: string, timestamp: number, parentId?: string) => {
        if (!transcriptId || !currentUser) return;

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    transcriptId,
                    content,
                    timestamp,
                    parentId
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Comment will be added via socket event
                collaborationSocket.addComment(transcriptId, data.data);
            } else {
                throw new Error('Failed to add comment');
            }
        } catch (err) {
            console.error('Error adding comment:', err);
            showNotification('Không thể thêm bình luận', 'error');
        }
    };

    const handleEditComment = async (commentId: string, content: string) => {
        if (!transcriptId) return;

        try {
            const response = await fetch(`/api/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                const data = await response.json();
                collaborationSocket.updateComment(transcriptId, commentId, data.data);
            } else {
                throw new Error('Failed to edit comment');
            }
        } catch (err) {
            console.error('Error editing comment:', err);
            showNotification('Không thể sửa bình luận', 'error');
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!transcriptId) return;

        try {
            const response = await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                collaborationSocket.deleteComment(transcriptId, commentId);
            } else {
                throw new Error('Failed to delete comment');
            }
        } catch (err) {
            console.error('Error deleting comment:', err);
            showNotification('Không thể xóa bình luận', 'error');
        }
    };

    const handleResolveComment = async (commentId: string) => {
        if (!transcriptId) return;

        try {
            const response = await fetch(`/api/comments/${commentId}/resolve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                collaborationSocket.resolveComment(transcriptId, commentId);
            } else {
                throw new Error('Failed to resolve comment');
            }
        } catch (err) {
            console.error('Error resolving comment:', err);
            showNotification('Không thể giải quyết bình luận', 'error');
        }
    };

    const handleReactToComment = async (commentId: string, reactionType: string) => {
        if (!transcriptId) return;

        try {
            const response = await fetch(`/api/comments/${commentId}/react`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ type: reactionType })
            });

            if (response.ok) {
                collaborationSocket.reactToComment(transcriptId, commentId, reactionType);
            } else {
                throw new Error('Failed to react to comment');
            }
        } catch (err) {
            console.error('Error reacting to comment:', err);
            showNotification('Không thể phản ứng bình luận', 'error');
        }
    };

    const handleContentChange = (content: string) => {
        if (transcript) {
            setTranscript(prev => prev ? { ...prev, content } : null);
        }
    };

    const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setNotification({
            open: true,
            message,
            severity
        });
    };

    const getCommentsForTimestamp = (timestamp: number): Comment[] => {
        return comments.filter(comment => comment.timestamp === timestamp);
    };

    const unreadCommentsCount = comments.filter(comment => !comment.isResolved).length;

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Typography>Đang tải...</Typography>
            </Container>
        );
    }

    if (error || !transcript || !currentUser) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">{error || 'Không tìm thấy transcript'}</Alert>
            </Container>
        );
    }

    const isReadOnly = transcript.permissions === 'viewer';

    return (
        <>
            {/* App Bar */}
            <AppBar position="sticky" color="default" elevation={1}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        onClick={() => navigate('/transcripts')}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>

                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {transcript.title}
                    </Typography>

                    <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                            label={transcript.permissions}
                            color={transcript.permissions === 'owner' ? 'primary' : 'default'}
                            size="small"
                        />

                        <Button
                            startIcon={<ShareIcon />}
                            onClick={() => setIsShareModalOpen(true)}
                            disabled={transcript.permissions === 'viewer'}
                        >
                            Chia sẻ
                        </Button>

                        <IconButton
                            onClick={() => setIsCommentsDrawerOpen(!isCommentsDrawerOpen)}
                        >
                            <Badge badgeContent={unreadCommentsCount} color="primary">
                                <CommentIcon />
                            </Badge>
                        </IconButton>

                        <IconButton
                            onClick={() => setIsFullscreen(!isFullscreen)}
                        >
                            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Container
                maxWidth={isFullscreen ? false : 'xl'}
                sx={{ py: 2, height: isFullscreen ? '100vh' : 'auto' }}
            >
                <Grid container spacing={3}>
                    {/* Editor Column */}
                    <Grid item xs={12} lg={isCommentsDrawerOpen ? 8 : 12}>
                        <Paper elevation={2} sx={{ p: 3 }}>
                            {/* Presence Indicator */}
                            <Box mb={3}>
                                <UserPresenceIndicator
                                    presenceData={presenceData}
                                    currentUserId={currentUser.id}
                                    maxVisibleUsers={5}
                                    showActivity={true}
                                />
                            </Box>

                            {/* Real-time Editor */}
                            <RealTimeEditor
                                transcriptId={transcript.id}
                                initialContent={transcript.content}
                                isReadOnly={isReadOnly}
                                onContentChange={handleContentChange}
                                socket={collaborationSocket.getSocket()}
                                currentUser={currentUser}
                            />
                        </Paper>
                    </Grid>

                    {/* Comments Sidebar */}
                    {isCommentsDrawerOpen && (
                        <Grid item xs={12} lg={4}>
                            <Paper elevation={2} sx={{ p: 3, height: '80vh', overflow: 'auto' }}>
                                <Typography variant="h6" gutterBottom>
                                    Bình luận ({comments.length})
                                </Typography>

                                {selectedTimestamp !== null ? (
                                    <CommentThread
                                        transcriptId={transcript.id}
                                        timestamp={selectedTimestamp}
                                        comments={getCommentsForTimestamp(selectedTimestamp)}
                                        currentUserId={currentUser.id}
                                        onAddComment={handleAddComment}
                                        onEditComment={handleEditComment}
                                        onDeleteComment={handleDeleteComment}
                                        onResolveComment={handleResolveComment}
                                        onReactToComment={handleReactToComment}
                                        isReadOnly={isReadOnly}
                                    />
                                ) : (
                                    <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                                        Chọn vị trí trong transcript để xem bình luận
                                    </Typography>
                                )}
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            </Container>

            {/* Floating Action Buttons */}
            <Box
                position="fixed"
                bottom={24}
                right={24}
                display="flex"
                flexDirection="column"
                gap={1}
            >
                <Fab
                    color="primary"
                    onClick={() => setIsCommentsDrawerOpen(!isCommentsDrawerOpen)}
                    size="medium"
                >
                    <Badge badgeContent={unreadCommentsCount} color="error">
                        <CommentIcon />
                    </Badge>
                </Fab>

                <Fab
                    color="secondary"
                    onClick={() => setIsShareModalOpen(true)}
                    size="small"
                    disabled={isReadOnly}
                >
                    <ShareIcon />
                </Fab>
            </Box>

            {/* Share Modal */}
            <ShareModal
                open={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                transcriptId={transcript.id}
                transcriptTitle={transcript.title}
            />

            {/* Notification Snackbar */}
            <Snackbar
                open={notification.open}
                autoHideDuration={4000}
                onClose={() => setNotification(prev => ({ ...prev, open: false }))}
            >
                <Alert
                    severity={notification.severity}
                    onClose={() => setNotification(prev => ({ ...prev, open: false }))}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default CollaborativeTranscriptPage;
