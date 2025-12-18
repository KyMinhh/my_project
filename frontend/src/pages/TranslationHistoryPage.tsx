import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Chip,
    Rating,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    Alert
} from '@mui/material';
import {
    Download as DownloadIcon,
    PlayArrow as PlayIcon,
    Star as StarIcon,
    History as HistoryIcon,
    Translate as TranslateIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

interface TranslationHistoryItem {
    jobId: string;
    originalVideo: {
        title: string;
        duration: number;
    };
    sourceLang: string;
    targetLang: string;
    translatedVideoUrl: string;
    processingTime: number;
    downloaded: boolean;
    downloadCount: number;
    userRating?: number;
    feedback?: string;
    createdAt: string;
}

export default function TranslationHistoryPage() {
    const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [ratingDialog, setRatingDialog] = useState(false);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE}/translation/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setHistory(response.data.history);
            setStats(response.data.stats);
            setLoading(false);
        } catch (err: any) {
            setError('Failed to load history: ' + err.message);
            setLoading(false);
        }
    };

    const handleDownload = async (jobId: string, videoUrl: string) => {
        try {
            const token = localStorage.getItem('token');

            // Record download
            await axios.post(
                `${API_BASE}/translation/history/${jobId}/download`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Trigger download
            window.open(API_BASE.replace('/api', '') + videoUrl, '_blank');

            // Reload history to update download count
            loadHistory();
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    const handleOpenRating = (jobId: string, currentRating?: number, currentFeedback?: string) => {
        setSelectedJob(jobId);
        setRating(currentRating || 0);
        setFeedback(currentFeedback || '');
        setRatingDialog(true);
    };

    const handleSubmitRating = async () => {
        if (!selectedJob) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_BASE}/translation/history/${selectedJob}/rating`,
                { rating, feedback },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setRatingDialog(false);
            loadHistory();
        } catch (err: any) {
            setError('Failed to submit rating: ' + err.message);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN');
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Lịch Sử Dịch Video
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Statistics */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>
                                    Tổng số video
                                </Typography>
                                <Typography variant="h4">
                                    {stats.totalTranslations}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>
                                    Tổng thời gian
                                </Typography>
                                <Typography variant="h4">
                                    {Math.round(stats.totalProcessingTime / 60)}m
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>
                                    Đánh giá TB
                                </Typography>
                                <Typography variant="h4">
                                    {stats.averageRating?.toFixed(1) || 'N/A'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>
                                    Lượt tải
                                </Typography>
                                <Typography variant="h4">
                                    {stats.totalDownloads}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* History Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Video</TableCell>
                            <TableCell>Ngôn ngữ</TableCell>
                            <TableCell>Thời gian</TableCell>
                            <TableCell>Đánh giá</TableCell>
                            <TableCell>Tải xuống</TableCell>
                            <TableCell>Ngày tạo</TableCell>
                            <TableCell>Hành động</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {history.map((item) => (
                            <TableRow key={item.jobId}>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">
                                        {item.originalVideo.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDuration(item.originalVideo.duration)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip label={item.sourceLang} size="small" />
                                        <TranslateIcon fontSize="small" />
                                        <Chip label={item.targetLang} size="small" color="primary" />
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    {Math.round(item.processingTime / 60)}m
                                </TableCell>
                                <TableCell>
                                    {item.userRating ? (
                                        <Rating value={item.userRating} readOnly size="small" />
                                    ) : (
                                        <Button
                                            size="small"
                                            startIcon={<StarIcon />}
                                            onClick={() => handleOpenRating(item.jobId)}
                                        >
                                            Đánh giá
                                        </Button>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={item.downloadCount}
                                        size="small"
                                        icon={<DownloadIcon />}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption">
                                        {formatDate(item.createdAt)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Tooltip title="Tải xuống">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleDownload(item.jobId, item.translatedVideoUrl)}
                                        >
                                            <DownloadIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {history.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Chưa có lịch sử dịch video
                    </Typography>
                    <Button
                        variant="contained"
                        sx={{ mt: 2 }}
                        href="/translate"
                    >
                        Bắt đầu dịch video
                    </Button>
                </Box>
            )}

            {/* Rating Dialog */}
            <Dialog open={ratingDialog} onClose={() => setRatingDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Đánh giá bản dịch</DialogTitle>
                <DialogContent>
                    <Box sx={{ textAlign: 'center', my: 2 }}>
                        <Typography gutterBottom>Chất lượng dịch:</Typography>
                        <Rating
                            value={rating}
                            onChange={(_, value) => setRating(value || 0)}
                            size="large"
                        />
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Nhận xét (tùy chọn)"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRatingDialog(false)}>Hủy</Button>
                    <Button onClick={handleSubmitRating} variant="contained" disabled={rating === 0}>
                        Gửi đánh giá
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
