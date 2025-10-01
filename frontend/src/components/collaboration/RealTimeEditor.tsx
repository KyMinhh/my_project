import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    TextField,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    Fade,
    Chip
} from '@mui/material';
import {
    SaveOutlined as SaveIcon,
    SyncOutlined as SyncIcon,
    OfflineBolt as OfflineIcon,
    People as PeopleIcon
} from '@mui/icons-material';
import { debounce } from 'lodash';

interface RealTimeEditorProps {
    transcriptId: string;
    initialContent: string;
    isReadOnly?: boolean;
    onContentChange?: (content: string) => void;
    socket?: any; // Socket.io instance
    currentUser: {
        id: string;
        name: string;
        avatar?: string;
    };
}

interface EditOperation {
    type: 'insert' | 'delete' | 'replace';
    position: number;
    content: string;
    length?: number;
    userId: string;
    timestamp: number;
    operationId: string;
}

interface SyncStatus {
    status: 'synced' | 'syncing' | 'error' | 'offline';
    lastSync: Date | null;
    pendingOperations: number;
}

const RealTimeEditor: React.FC<RealTimeEditorProps> = ({
    transcriptId,
    initialContent,
    isReadOnly = false,
    onContentChange,
    socket,
    currentUser
}) => {
    const [content, setContent] = useState(initialContent);
    const [localContent, setLocalContent] = useState(initialContent);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        status: 'synced',
        lastSync: null,
        pendingOperations: 0
    });
    const [isTyping, setIsTyping] = useState(false);
    const [collaborators, setCollaborators] = useState<string[]>([]);
    const [operationQueue, setOperationQueue] = useState<EditOperation[]>([]);
    const [appliedOperations, setAppliedOperations] = useState<Set<string>>(new Set());
    
    const textFieldRef = useRef<HTMLTextAreaElement>(null);
    const cursorPosition = useRef<number>(0);
    const selectionRange = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
    const isComposingRef = useRef(false);

    // Debounced save function
    const debouncedSave = useCallback(
        debounce(async (content: string) => {
            if (!socket || content === initialContent) return;

            try {
                setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
                
                // Send save request through socket
                socket.emit('save-transcript', {
                    transcriptId,
                    content,
                    userId: currentUser.id
                });

            } catch (error) {
                console.error('Error saving content:', error);
                setSyncStatus(prev => ({ ...prev, status: 'error' }));
            }
        }, 1000),
        [socket, transcriptId, currentUser.id, initialContent]
    );

    // Debounced cursor position broadcast
    const debouncedCursorUpdate = useCallback(
        debounce((position: number, selection: { start: number; end: number }) => {
            if (socket) {
                socket.emit('cursor-position', {
                    transcriptId,
                    userId: currentUser.id,
                    position,
                    selection: selection.start !== selection.end ? selection : undefined
                });
            }
        }, 100),
        [socket, transcriptId, currentUser.id]
    );

    // Generate operation ID
    const generateOperationId = () => {
        return `${currentUser.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    // Apply operation to content
    const applyOperation = (content: string, operation: EditOperation): string => {
        switch (operation.type) {
            case 'insert':
                return content.slice(0, operation.position) + 
                       operation.content + 
                       content.slice(operation.position);
            
            case 'delete':
                return content.slice(0, operation.position) + 
                       content.slice(operation.position + (operation.length || 0));
            
            case 'replace':
                return content.slice(0, operation.position) + 
                       operation.content + 
                       content.slice(operation.position + (operation.length || 0));
            
            default:
                return content;
        }
    };

    // Transform operation position based on previous operations
    const transformOperation = (operation: EditOperation, previousOps: EditOperation[]): EditOperation => {
        let transformedPosition = operation.position;

        for (const prevOp of previousOps) {
            if (prevOp.userId === operation.userId) continue;
            if (prevOp.timestamp >= operation.timestamp) continue;

            if (prevOp.position <= transformedPosition) {
                switch (prevOp.type) {
                    case 'insert':
                        transformedPosition += prevOp.content.length;
                        break;
                    case 'delete':
                        transformedPosition -= prevOp.length || 0;
                        break;
                    case 'replace':
                        transformedPosition += prevOp.content.length - (prevOp.length || 0);
                        break;
                }
            }
        }

        return { ...operation, position: Math.max(0, transformedPosition) };
    };

    // Handle text change
    const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (isReadOnly || isComposingRef.current) return;

        const newContent = event.target.value;
        const cursorPos = event.target.selectionStart || 0;
        
        // Store cursor position
        cursorPosition.current = cursorPos;
        selectionRange.current = {
            start: event.target.selectionStart || 0,
            end: event.target.selectionEnd || 0
        };

        // Update local content immediately
        setLocalContent(newContent);
        
        // Create operation based on the change
        if (newContent.length > localContent.length) {
            // Insert operation
            const insertPos = cursorPos - (newContent.length - localContent.length);
            const insertedText = newContent.slice(insertPos, cursorPos);
            
            const operation: EditOperation = {
                type: 'insert',
                position: insertPos,
                content: insertedText,
                userId: currentUser.id,
                timestamp: Date.now(),
                operationId: generateOperationId()
            };

            // Broadcast operation
            if (socket) {
                socket.emit('text-operation', {
                    transcriptId,
                    operation
                });
            }

            setOperationQueue(prev => [...prev, operation]);
        } else if (newContent.length < localContent.length) {
            // Delete operation
            const deleteLength = localContent.length - newContent.length;
            
            const operation: EditOperation = {
                type: 'delete',
                position: cursorPos,
                content: '',
                length: deleteLength,
                userId: currentUser.id,
                timestamp: Date.now(),
                operationId: generateOperationId()
            };

            // Broadcast operation
            if (socket) {
                socket.emit('text-operation', {
                    transcriptId,
                    operation
                });
            }

            setOperationQueue(prev => [...prev, operation]);
        }

        // Update typing status
        setIsTyping(true);
        if (socket) {
            socket.emit('typing-status', {
                transcriptId,
                userId: currentUser.id,
                isTyping: true
            });
        }

        // Clear typing status after delay
        setTimeout(() => {
            setIsTyping(false);
            if (socket) {
                socket.emit('typing-status', {
                    transcriptId,
                    userId: currentUser.id,
                    isTyping: false
                });
            }
        }, 1000);

        // Trigger save
        debouncedSave(newContent);
        
        // Trigger cursor update
        debouncedCursorUpdate(cursorPos, selectionRange.current);

        // Call external handler
        if (onContentChange) {
            onContentChange(newContent);
        }
    };

    // Handle selection change
    const handleSelectionChange = () => {
        if (!textFieldRef.current) return;
        
        const start = textFieldRef.current.selectionStart || 0;
        const end = textFieldRef.current.selectionEnd || 0;
        
        selectionRange.current = { start, end };
        debouncedCursorUpdate(start, { start, end });
    };

    // Handle composition events (for IME input)
    const handleCompositionStart = () => {
        isComposingRef.current = true;
    };

    const handleCompositionEnd = () => {
        isComposingRef.current = false;
    };

    // Socket event handlers
    useEffect(() => {
        if (!socket) return;

        // Join transcript room
        socket.emit('join-transcript', {
            transcriptId,
            userId: currentUser.id
        });

        // Handle incoming text operations
        const handleTextOperation = (data: { operation: EditOperation }) => {
            const { operation } = data;
            
            // Don't apply own operations
            if (operation.userId === currentUser.id) return;
            
            // Check if operation already applied
            if (appliedOperations.has(operation.operationId)) return;

            // Transform operation based on pending operations
            const transformedOp = transformOperation(operation, operationQueue);
            
            // Apply operation to content
            setContent(prevContent => {
                const newContent = applyOperation(prevContent, transformedOp);
                setLocalContent(newContent);
                return newContent;
            });

            // Mark operation as applied
            setAppliedOperations(prev => new Set([...prev, operation.operationId]));
        };

        // Handle save confirmation
        const handleSaveConfirm = (data: { success: boolean; timestamp: string }) => {
            if (data.success) {
                setSyncStatus({
                    status: 'synced',
                    lastSync: new Date(data.timestamp),
                    pendingOperations: 0
                });
                
                // Clear operation queue
                setOperationQueue([]);
            } else {
                setSyncStatus(prev => ({ ...prev, status: 'error' }));
            }
        };

        // Handle collaborators update
        const handleCollaboratorsUpdate = (data: { collaborators: string[] }) => {
            setCollaborators(data.collaborators.filter(id => id !== currentUser.id));
        };

        // Handle connection status
        const handleConnect = () => {
            setSyncStatus(prev => ({ ...prev, status: 'synced' }));
        };

        const handleDisconnect = () => {
            setSyncStatus(prev => ({ ...prev, status: 'offline' }));
        };

        // Register event listeners
        socket.on('text-operation', handleTextOperation);
        socket.on('save-confirm', handleSaveConfirm);
        socket.on('collaborators-update', handleCollaboratorsUpdate);
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        // Cleanup
        return () => {
            socket.off('text-operation', handleTextOperation);
            socket.off('save-confirm', handleSaveConfirm);
            socket.off('collaborators-update', handleCollaboratorsUpdate);
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            
            socket.emit('leave-transcript', {
                transcriptId,
                userId: currentUser.id
            });
        };
    }, [socket, transcriptId, currentUser.id, operationQueue, appliedOperations]);

    // Update content when initial content changes
    useEffect(() => {
        if (initialContent !== content && !operationQueue.length) {
            setContent(initialContent);
            setLocalContent(initialContent);
        }
    }, [initialContent]);

    // Restore cursor position after content updates
    useEffect(() => {
        if (textFieldRef.current && cursorPosition.current !== undefined) {
            const textField = textFieldRef.current;
            const position = Math.min(cursorPosition.current, textField.value.length);
            
            setTimeout(() => {
                textField.setSelectionRange(position, position);
            }, 0);
        }
    }, [localContent]);

    const getSyncStatusIcon = () => {
        switch (syncStatus.status) {
            case 'synced':
                return <SaveIcon color="success" sx={{ fontSize: 16 }} />;
            case 'syncing':
                return <CircularProgress size={16} color="primary" />;
            case 'error':
                return <SaveIcon color="error" sx={{ fontSize: 16 }} />;
            case 'offline':
                return <OfflineIcon color="warning" sx={{ fontSize: 16 }} />;
            default:
                return <SyncIcon sx={{ fontSize: 16 }} />;
        }
    };

    const getSyncStatusText = () => {
        switch (syncStatus.status) {
            case 'synced':
                return syncStatus.lastSync 
                    ? `Đã lưu lúc ${syncStatus.lastSync.toLocaleTimeString()}`
                    : 'Đã đồng bộ';
            case 'syncing':
                return 'Đang lưu...';
            case 'error':
                return 'Lỗi đồng bộ';
            case 'offline':
                return 'Ngoại tuyến';
            default:
                return 'Không xác định';
        }
    };

    return (
        <Box>
            {/* Status bar */}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
                px={1}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    {getSyncStatusIcon()}
                    <Typography variant="caption" color="text.secondary">
                        {getSyncStatusText()}
                    </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                    {collaborators.length > 0 && (
                        <Chip
                            icon={<PeopleIcon />}
                            label={`${collaborators.length} người khác`}
                            size="small"
                            variant="outlined"
                            color="primary"
                        />
                    )}
                    
                    {isTyping && (
                        <Fade in>
                            <Chip
                                label="Đang nhập..."
                                size="small"
                                color="info"
                                variant="outlined"
                            />
                        </Fade>
                    )}
                </Box>
            </Box>

            {/* Error alert */}
            {syncStatus.status === 'error' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Không thể đồng bộ nội dung. Vui lòng kiểm tra kết nối mạng.
                </Alert>
            )}

            {/* Editor */}
            <Paper elevation={1} sx={{ position: 'relative' }}>
                <TextField
                    ref={textFieldRef}
                    fullWidth
                    multiline
                    minRows={20}
                    maxRows={30}
                    value={localContent}
                    onChange={handleContentChange}
                    onSelect={handleSelectionChange}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    placeholder="Transcript content..."
                    disabled={isReadOnly}
                    variant="outlined"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                border: 'none'
                            }
                        },
                        '& .MuiInputBase-input': {
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            lineHeight: 1.6
                        }
                    }}
                />

                {/* Real-time cursors would be rendered here */}
                {/* This would require more complex positioning logic */}
            </Paper>

            {/* Word count */}
            <Box display="flex" justifyContent="space-between" mt={1} px={1}>
                <Typography variant="caption" color="text.secondary">
                    {localContent.length} ký tự • {localContent.split(/\s+/).filter(w => w.length > 0).length} từ
                </Typography>
                
                {syncStatus.pendingOperations > 0 && (
                    <Typography variant="caption" color="warning.main">
                        {syncStatus.pendingOperations} thay đổi chưa đồng bộ
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default RealTimeEditor;
