import React, { useState, useEffect } from 'react';
import {
    Box,
    Avatar,
    AvatarGroup,
    Chip,
    Tooltip,
    Typography,
    Paper,
    Fade,
    Stack
} from '@mui/material';
import {
    Circle as CircleIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Comment as CommentIcon
} from '@mui/icons-material';

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

interface UserPresenceIndicatorProps {
    presenceData: UserPresence[];
    currentUserId: string;
    maxVisibleUsers?: number;
    showActivity?: boolean;
}

const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({
    presenceData,
    currentUserId,
    maxVisibleUsers = 5,
    showActivity = true
}) => {
    const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
    const [recentUsers, setRecentUsers] = useState<UserPresence[]>([]);

    useEffect(() => {
        // Filter out current user and separate active/recent users
        const otherUsers = presenceData.filter(p => p.userId !== currentUserId);
        const active = otherUsers.filter(p => p.isActive);
        const recent = otherUsers.filter(p => !p.isActive);

        setActiveUsers(active);
        setRecentUsers(recent);
    }, [presenceData, currentUserId]);

    const getActivityIcon = (activity: string) => {
        switch (activity) {
            case 'viewing':
                return <VisibilityIcon sx={{ fontSize: 12 }} />;
            case 'editing':
                return <EditIcon sx={{ fontSize: 12 }} />;
            case 'commenting':
                return <CommentIcon sx={{ fontSize: 12 }} />;
            default:
                return <CircleIcon sx={{ fontSize: 8 }} />;
        }
    };

    const getActivityLabel = (activity: string) => {
        switch (activity) {
            case 'viewing':
                return 'Đang xem';
            case 'editing':
                return 'Đang chỉnh sửa';
            case 'commenting':
                return 'Đang bình luận';
            default:
                return 'Trực tuyến';
        }
    };

    const getActivityColor = (activity: string) => {
        switch (activity) {
            case 'viewing':
                return 'primary';
            case 'editing':
                return 'warning';
            case 'commenting':
                return 'info';
            default:
                return 'success';
        }
    };

    const formatLastSeen = (lastSeen: string) => {
        const date = new Date(lastSeen);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'vừa rời khỏi';
        if (diffMinutes < 60) return `rời khỏi ${diffMinutes} phút trước`;
        if (diffHours < 24) return `rời khỏi ${diffHours} giờ trước`;
        if (diffDays < 7) return `rời khỏi ${diffDays} ngày trước`;
        return 'đã lâu không hoạt động';
    };

    const renderUserAvatar = (user: UserPresence, isActive: boolean) => (
        <Tooltip
            key={user.id}
            title={
                <Box>
                    <Typography variant="subtitle2">{user.user.name}</Typography>
                    <Typography variant="caption" display="block">
                        {isActive ? getActivityLabel(user.currentActivity) : formatLastSeen(user.lastSeen)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {user.device.browser} - {user.device.type}
                    </Typography>
                </Box>
            }
            arrow
        >
            <Box position="relative">
                <Avatar
                    src={user.user.avatar}
                    sx={{
                        width: 32,
                        height: 32,
                        border: isActive ? '2px solid' : '1px solid',
                        borderColor: isActive ? `${getActivityColor(user.currentActivity)}.main` : 'divider',
                        opacity: isActive ? 1 : 0.6
                    }}
                >
                    {user.user.name.charAt(0).toUpperCase()}
                </Avatar>
                
                {/* Activity indicator */}
                {isActive && (
                    <Box
                        position="absolute"
                        bottom={-2}
                        right={-2}
                        sx={{
                            bgcolor: `${getActivityColor(user.currentActivity)}.main`,
                            color: 'white',
                            borderRadius: '50%',
                            width: 16,
                            height: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid white'
                        }}
                    >
                        {getActivityIcon(user.currentActivity)}
                    </Box>
                )}
            </Box>
        </Tooltip>
    );

    const visibleActiveUsers = activeUsers.slice(0, maxVisibleUsers);
    const hiddenActiveCount = Math.max(0, activeUsers.length - maxVisibleUsers);
    const visibleRecentUsers = recentUsers.slice(0, Math.max(0, maxVisibleUsers - activeUsers.length));

    if (activeUsers.length === 0 && recentUsers.length === 0) {
        return null;
    }

    return (
        <Paper
            elevation={1}
            sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
            }}
        >
            <Stack spacing={2}>
                {/* Active users section */}
                {activeUsers.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" color="success.main" gutterBottom>
                            <CircleIcon sx={{ fontSize: 8, mr: 1 }} />
                            Đang hoạt động ({activeUsers.length})
                        </Typography>
                        
                        <Box display="flex" alignItems="center" gap={1}>
                            <AvatarGroup max={maxVisibleUsers} spacing="small">
                                {visibleActiveUsers.map(user => renderUserAvatar(user, true))}
                            </AvatarGroup>
                            
                            {hiddenActiveCount > 0 && (
                                <Tooltip title={`và ${hiddenActiveCount} người khác`}>
                                    <Chip
                                        label={`+${hiddenActiveCount}`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                </Tooltip>
                            )}
                        </Box>

                        {/* Activity breakdown */}
                        {showActivity && (
                            <Box mt={1}>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {['viewing', 'editing', 'commenting'].map(activity => {
                                        const count = activeUsers.filter(u => u.currentActivity === activity).length;
                                        if (count === 0) return null;
                                        
                                        return (
                                            <Fade in key={activity}>
                                                <Chip
                                                    icon={getActivityIcon(activity)}
                                                    label={`${count} ${getActivityLabel(activity).toLowerCase()}`}
                                                    size="small"
                                                    color={getActivityColor(activity) as any}
                                                    variant="outlined"
                                                    sx={{ height: 20 }}
                                                />
                                            </Fade>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Recent users section */}
                {recentUsers.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Gần đây ({recentUsers.length})
                        </Typography>
                        
                        <AvatarGroup max={5} spacing="small">
                            {visibleRecentUsers.map(user => renderUserAvatar(user, false))}
                        </AvatarGroup>
                    </Box>
                )}
            </Stack>
        </Paper>
    );
};

// Component for showing cursor positions in real-time editor
interface UserCursor {
    userId: string;
    user: {
        name: string;
        avatar?: string;
    };
    position: number;
    selection?: {
        start: number;
        end: number;
    };
    color: string;
}

interface RealTimeCursorsProps {
    cursors: UserCursor[];
    textLength: number;
}

export const RealTimeCursors: React.FC<RealTimeCursorsProps> = ({
    cursors,
    textLength
}) => {
    const getCursorStyle = (cursor: UserCursor, textElement: HTMLElement | null) => {
        if (!textElement) return {};

        const position = Math.min(cursor.position, textLength);
        const range = document.createRange();
        const selection = window.getSelection();
        
        try {
            // Find the text node and position
            const walker = document.createTreeWalker(
                textElement,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let currentPos = 0;
            let targetNode = null;
            let targetOffset = 0;

            while (walker.nextNode()) {
                const node = walker.currentNode;
                const nodeLength = node.textContent?.length || 0;
                
                if (currentPos + nodeLength >= position) {
                    targetNode = node;
                    targetOffset = position - currentPos;
                    break;
                }
                currentPos += nodeLength;
            }

            if (targetNode) {
                range.setStart(targetNode, targetOffset);
                range.setEnd(targetNode, targetOffset);
                
                const rect = range.getBoundingClientRect();
                const textRect = textElement.getBoundingClientRect();
                
                return {
                    position: 'absolute' as const,
                    left: rect.left - textRect.left,
                    top: rect.top - textRect.top,
                    height: rect.height || 20,
                    width: 2,
                    backgroundColor: cursor.color,
                    zIndex: 1000,
                    pointerEvents: 'none' as const
                };
            }
        } catch (error) {
            console.warn('Error calculating cursor position:', error);
        }

        return {};
    };

    return (
        <>
            {cursors.map(cursor => (
                <Box
                    key={cursor.userId}
                    sx={getCursorStyle(cursor, null)}
                >
                    <Tooltip title={cursor.user.name} arrow>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: -24,
                                left: -1,
                                bgcolor: cursor.color,
                                color: 'white',
                                px: 0.5,
                                py: 0.25,
                                borderRadius: 0.5,
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap',
                                maxWidth: 100,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {cursor.user.name}
                        </Box>
                    </Tooltip>
                </Box>
            ))}
        </>
    );
};

export default UserPresenceIndicator;
