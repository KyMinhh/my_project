import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Box,
    Typography,
    Alert,
    InputAdornment,
    IconButton,
    Chip,
    Stack
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';

interface ShareModalProps {
    open: boolean;
    onClose: () => void;
    transcriptId: string;
    transcriptTitle: string;
}

interface ShareLinkData {
    id: string;
    linkId: string;
    url: string;
    title: string;
    permissions: 'viewer' | 'editor';
    hasPassword: boolean;
    expiresAt: string | null;
    accessCount: number;
    createdAt: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
    open,
    onClose,
    transcriptId,
    transcriptTitle
}) => {
    const [loading, setLoading] = useState(false);
    const [shareLink, setShareLink] = useState<ShareLinkData | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    // Form state
    const [formData, setFormData] = useState({
        title: transcriptTitle,
        description: '',
        permissions: 'viewer' as 'viewer' | 'editor',
        password: '',
        expiresIn: '',
        enablePassword: false
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleCreateShareLink = async () => {
        setLoading(true);
        setError('');

        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                permissions: formData.permissions,
                ...(formData.enablePassword && formData.password && { password: formData.password }),
                ...(formData.expiresIn && { expiresIn: formData.expiresIn })
            };

            const response = await fetch(`/api/collaboration/transcripts/${transcriptId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                setShareLink(data.data);
                setShowCreateForm(false);
                setSuccess('Link chia sẻ đã được tạo thành công!');
            } else {
                setError(data.message || 'Không thể tạo link chia sẻ');
            }
        } catch (err) {
            console.error('Error creating share link:', err);
            setError('Có lỗi xảy ra khi tạo link chia sẻ');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (shareLink) {
            try {
                await navigator.clipboard.writeText(shareLink.url);
                setSuccess('Đã sao chép link vào clipboard!');
            } catch (err) {
                console.error('Error copying to clipboard:', err);
                setError('Không thể sao chép link');
            }
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleClose = () => {
        setShareLink(null);
        setShowCreateForm(false);
        setError('');
        setSuccess('');
        setFormData({
            title: transcriptTitle,
            description: '',
            permissions: 'viewer',
            password: '',
            expiresIn: '',
            enablePassword: false
        });
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <SettingsIcon color="primary" />
                    <Typography variant="h6">
                        Chia sẻ Transcript
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {transcriptTitle}
                </Typography>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                    </Alert>
                )}

                {!shareLink && !showCreateForm && (
                    <Box textAlign="center" py={4}>
                        <Typography variant="body1" color="text.secondary" mb={3}>
                            Tạo link chia sẻ để cộng tác với người khác
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => setShowCreateForm(true)}
                            size="large"
                        >
                            Tạo Link Chia Sẻ
                        </Button>
                    </Box>
                )}

                {showCreateForm && (
                    <Box component="form" sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            label="Tiêu đề"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            fullWidth
                            label="Mô tả (tùy chọn)"
                            multiline
                            rows={2}
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            sx={{ mb: 2 }}
                        />

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Quyền truy cập</InputLabel>
                            <Select
                                value={formData.permissions}
                                label="Quyền truy cập"
                                onChange={(e) => handleInputChange('permissions', e.target.value)}
                            >
                                <MenuItem value="viewer">
                                    Xem - Chỉ đọc và bình luận
                                </MenuItem>
                                <MenuItem value="editor">
                                    Chỉnh sửa - Có thể sửa transcript
                                </MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Thời hạn</InputLabel>
                            <Select
                                value={formData.expiresIn}
                                label="Thời hạn"
                                onChange={(e) => handleInputChange('expiresIn', e.target.value)}
                            >
                                <MenuItem value="">Không giới hạn</MenuItem>
                                <MenuItem value="1h">1 giờ</MenuItem>
                                <MenuItem value="1d">1 ngày</MenuItem>
                                <MenuItem value="7d">7 ngày</MenuItem>
                                <MenuItem value="30d">30 ngày</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.enablePassword}
                                    onChange={(e) => handleInputChange('enablePassword', e.target.checked)}
                                />
                            }
                            label="Bảo vệ bằng mật khẩu"
                            sx={{ mb: 2 }}
                        />

                        {formData.enablePassword && (
                            <TextField
                                fullWidth
                                label="Mật khẩu"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                sx={{ mb: 2 }}
                            />
                        )}
                    </Box>
                )}

                {shareLink && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Link chia sẻ đã tạo
                        </Typography>
                        
                        <Box
                            sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'grey.50',
                                mb: 2
                            }}
                        >
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                URL:
                            </Typography>
                            <Box display="flex" gap={1} alignItems="center">
                                <TextField
                                    fullWidth
                                    value={shareLink.url}
                                    InputProps={{
                                        readOnly: true,
                                        sx: { fontSize: '0.875rem' }
                                    }}
                                    size="small"
                                />
                                <IconButton
                                    onClick={handleCopyLink}
                                    color="primary"
                                    size="small"
                                >
                                    <CopyIcon />
                                </IconButton>
                            </Box>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                            <Chip
                                label={`Quyền: ${shareLink.permissions === 'viewer' ? 'Xem' : 'Chỉnh sửa'}`}
                                color="primary"
                                variant="outlined"
                                size="small"
                            />
                            {shareLink.hasPassword && (
                                <Chip
                                    label="Có mật khẩu"
                                    color="secondary"
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                            {shareLink.expiresAt && (
                                <Chip
                                    label={`Hết hạn: ${new Date(shareLink.expiresAt).toLocaleDateString()}`}
                                    color="warning"
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                            Đã truy cập: {shareLink.accessCount} lần<br />
                            Tạo lúc: {new Date(shareLink.createdAt).toLocaleString()}
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                {showCreateForm && (
                    <>
                        <Button onClick={() => setShowCreateForm(false)}>
                            Hủy
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleCreateShareLink}
                            disabled={loading}
                        >
                            {loading ? 'Đang tạo...' : 'Tạo Link'}
                        </Button>
                    </>
                )}

                {shareLink && (
                    <Button
                        variant="contained"
                        onClick={handleCopyLink}
                        startIcon={<CopyIcon />}
                    >
                        Sao chép Link
                    </Button>
                )}

                <Button onClick={handleClose}>
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ShareModal;
