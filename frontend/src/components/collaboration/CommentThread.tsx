import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Avatar,
    Chip,
    Menu,
    MenuItem,
    IconButton,
    Divider,
    Badge,
    Tooltip,
    Stack
} from '@mui/material';
import {
    MoreVert as MoreIcon,
    Reply as ReplyIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ThumbUp as ThumbUpIcon,
    ThumbUpOutlined as ThumbUpOutlinedIcon,
    Check as CheckIcon,
    AccessTime as TimeIcon
} from '@mui/icons-material';

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
    editHistory: {
        content: string;
        editedAt: string;
        editedBy: string;
    }[];
    createdAt: string;
    updatedAt: string;
}

interface CommentThreadProps {
    transcriptId: string;
    timestamp: number;
    comments: Comment[];
    currentUserId: string;
    onAddComment: (content: string, timestamp: number, parentId?: string) => void;
    onEditComment: (commentId: string, content: string) => void;
    onDeleteComment: (commentId: string) => void;
    onResolveComment: (commentId: string) => void;
    onReactToComment: (commentId: string, reactionType: string) => void;
    isReadOnly?: boolean;
}

const CommentThread: React.FC<CommentThreadProps> = ({
    transcriptId,
    timestamp,
    comments,
    currentUserId,
    onAddComment,
    onEditComment,
    onDeleteComment,
    onResolveComment,
    onReactToComment,
    isReadOnly = false
}) => {
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [editingComment, setEditingComment] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [showResolved, setShowResolved] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
    
    const textFieldRef = useRef<HTMLDivElement>(null);
    const editFieldRef = useRef<HTMLDivElement>(null);

    const unresolvedComments = comments.filter(c => !c.isResolved);
    const resolvedComments = comments.filter(c => c.isResolved);
    const displayComments = showResolved ? comments : unresolvedComments;

    useEffect(() => {
        if (replyingTo && textFieldRef.current) {
            textFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const input = textFieldRef.current.querySelector('input') as HTMLInputElement;
            if (input) input.focus();
        }
    }, [replyingTo]);

    useEffect(() => {
        if (editingComment && editFieldRef.current) {
            const input = editFieldRef.current.querySelector('textarea') as HTMLTextAreaElement;
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }
    }, [editingComment]);

    const formatTimestamp = (ts: number) => {
        const minutes = Math.floor(ts / 60);
        const seconds = ts % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'vừa xong';
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    const handleSubmitComment = () => {
        if (!newComment.trim()) return;
        
        onAddComment(newComment, timestamp, replyingTo || undefined);
        setNewComment('');
        setReplyingTo(null);
    };

    const handleEditSubmit = (commentId: string) => {
        if (!editContent.trim()) return;
        
        onEditComment(commentId, editContent);
        setEditingComment(null);
        setEditContent('');
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, commentId: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedCommentId(commentId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedCommentId(null);
    };

    const handleStartEdit = (comment: Comment) => {
        setEditingComment(comment.id);
        setEditContent(comment.content);
        handleMenuClose();
    };

    const handleStartReply = (commentId: string) => {
        setReplyingTo(commentId);
        handleMenuClose();
    };

    const handleReaction = (commentId: string, reactionType: string = 'like') => {
        onReactToComment(commentId, reactionType);
    };

    const getReactionCount = (comment: Comment, reactionType: string) => {
        const reaction = comment.reactions.find(r => r.type === reactionType);
        return reaction ? reaction.users.length : 0;
    };

    const hasUserReacted = (comment: Comment, reactionType: string) => {
        const reaction = comment.reactions.find(r => r.type === reactionType);
        return reaction ? reaction.users.includes(currentUserId) : false;
    };

    const renderComment = (comment: Comment, isReply: boolean = false) => {
        const isAuthor = comment.author.id === currentUserId;
        const isEditing = editingComment === comment.id;
        const likeCount = getReactionCount(comment, 'like');
        const hasLiked = hasUserReacted(comment, 'like');

        return (
            <Paper
                key={comment.id}
                elevation={isReply ? 1 : 2}
                sx={{
                    p: 2,
                    ml: isReply ? 4 : 0,
                    mb: 1,
                    border: comment.isResolved ? '1px solid' : 'none',
                    borderColor: comment.isResolved ? 'success.main' : 'transparent',
                    opacity: comment.isResolved ? 0.7 : 1
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                            src={comment.author.avatar}
                            sx={{ width: 32, height: 32 }}
                        >
                            {comment.author.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="medium">
                                {comment.author.name}
                                {comment.isResolved && (
                                    <Chip
                                        label="Đã giải quyết"
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                        sx={{ ml: 1, height: 20 }}
                                    />
                                )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                <TimeIcon sx={{ fontSize: 12 }} />
                                {formatTimeAgo(comment.createdAt)}
                                {comment.updatedAt !== comment.createdAt && ' (đã chỉnh sửa)'}
                            </Typography>
                        </Box>
                    </Box>

                    {!isReadOnly && (
                        <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, comment.id)}
                        >
                            <MoreIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>

                {isEditing ? (
                    <Box ref={editFieldRef}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Chỉnh sửa bình luận..."
                            size="small"
                            sx={{ mb: 1 }}
                        />
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleEditSubmit(comment.id)}
                                disabled={!editContent.trim()}
                            >
                                Lưu
                            </Button>
                            <Button
                                size="small"
                                onClick={() => {
                                    setEditingComment(null);
                                    setEditContent('');
                                }}
                            >
                                Hủy
                            </Button>
                        </Stack>
                    </Box>
                ) : (
                    <>
                        <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                            {comment.content}
                        </Typography>

                        <Box display="flex" alignItems="center" gap={1} justifyContent="space-between">
                            <Stack direction="row" spacing={1} alignItems="center">
                                {!isReadOnly && (
                                    <>
                                        <Tooltip title={hasLiked ? 'Bỏ thích' : 'Thích'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleReaction(comment.id)}
                                                color={hasLiked ? 'primary' : 'default'}
                                            >
                                                <Badge badgeContent={likeCount || 0} color="primary">
                                                    {hasLiked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
                                                </Badge>
                                            </IconButton>
                                        </Tooltip>

                                        <Button
                                            size="small"
                                            startIcon={<ReplyIcon />}
                                            onClick={() => handleStartReply(comment.id)}
                                        >
                                            Trả lời
                                        </Button>

                                        {isAuthor && !comment.isResolved && (
                                            <Button
                                                size="small"
                                                startIcon={<CheckIcon />}
                                                onClick={() => onResolveComment(comment.id)}
                                                color="success"
                                            >
                                                Giải quyết
                                            </Button>
                                        )}
                                    </>
                                )}
                            </Stack>
                        </Box>
                    </>
                )}

                {/* Render replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <Box mt={2}>
                        {comment.replies.map(reply => renderComment(reply, true))}
                    </Box>
                )}

                {/* Reply form */}
                {replyingTo === comment.id && !isReadOnly && (
                    <Box mt={2} ref={textFieldRef}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Viết phản hồi..."
                            size="small"
                            sx={{ mb: 1 }}
                        />
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={handleSubmitComment}
                                disabled={!newComment.trim()}
                            >
                                Gửi
                            </Button>
                            <Button
                                size="small"
                                onClick={() => {
                                    setReplyingTo(null);
                                    setNewComment('');
                                }}
                            >
                                Hủy
                            </Button>
                        </Stack>
                    </Box>
                )}
            </Paper>
        );
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                    <TimeIcon />
                    Bình luận tại {formatTimestamp(timestamp)}
                </Typography>
                
                <Stack direction="row" spacing={1} alignItems="center">
                    {resolvedComments.length > 0 && (
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setShowResolved(!showResolved)}
                        >
                            {showResolved ? 'Ẩn đã giải quyết' : `Hiện ${resolvedComments.length} đã giải quyết`}
                        </Button>
                    )}
                    
                    <Typography variant="caption" color="text.secondary">
                        {unresolvedComments.length} bình luận
                    </Typography>
                </Stack>
            </Box>

            {/* Comments */}
            {displayComments.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={2}>
                    {showResolved ? 'Không có bình luận nào' : 'Chưa có bình luận mới'}
                </Typography>
            ) : (
                displayComments.map(comment => renderComment(comment))
            )}

            {/* New comment form */}
            {!replyingTo && !isReadOnly && (
                <Box mt={2}>
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Thêm bình luận..."
                        size="small"
                        sx={{ mb: 1 }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim()}
                        size="small"
                    >
                        Bình luận
                    </Button>
                </Box>
            )}

            {/* Context menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                {selectedCommentId && (
                    <>
                        <MenuItem onClick={() => {
                            const comment = comments.find(c => c.id === selectedCommentId);
                            if (comment) handleStartReply(comment.id);
                        }}>
                            <ReplyIcon sx={{ mr: 1 }} fontSize="small" />
                            Trả lời
                        </MenuItem>
                        
                        {selectedCommentId && comments.find(c => c.id === selectedCommentId)?.author.id === currentUserId && (
                            <>
                                <MenuItem onClick={() => {
                                    const comment = comments.find(c => c.id === selectedCommentId);
                                    if (comment) handleStartEdit(comment);
                                }}>
                                    <EditIcon sx={{ mr: 1 }} fontSize="small" />
                                    Chỉnh sửa
                                </MenuItem>
                                
                                <Divider />
                                
                                <MenuItem 
                                    onClick={() => {
                                        if (selectedCommentId) {
                                            onDeleteComment(selectedCommentId);
                                            handleMenuClose();
                                        }
                                    }}
                                    sx={{ color: 'error.main' }}
                                >
                                    <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                                    Xóa
                                </MenuItem>
                            </>
                        )}
                    </>
                )}
            </Menu>
        </Box>
    );
};

export default CommentThread;
