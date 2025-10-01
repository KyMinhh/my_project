import React, { useState, useEffect, useRef } from 'react';
import {
    Container, Box, Paper, Typography, Button, Stack, CircularProgress, Alert,
    Divider, Checkbox, FormControlLabel, IconButton, Chip,
    Menu, MenuItem, ListItemIcon, Tooltip, Fade
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ReactPlayer from 'react-player';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import TextFormatIcon from '@mui/icons-material/TextFields';
import DataObjectIcon from '@mui/icons-material/DataObject';

import { JobDetail, GetJobDetailsResponse, Segment, ExtractedClipInfo, SegmentTime } from '../types/fileTypes';
import { getJobDetailsApi, extractMultipleVideoSegmentsApi } from '../services/fileApi';
import { formatDuration } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

// --- Cấu hình lại format timestamp
const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return '-';
    try {
        return new Date(timestamp).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return timestamp;
    }
};

const BACKEND_STATIC_FILES_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

const TranscriptDetailPage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // --- State ---
    const [jobData, setJobData] = useState<JobDetail | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showTimestamps, setShowTimestamps] = useState<boolean>(true);
    const [playableVideoUrl, setPlayableVideoUrl] = useState<string | null>(null);
    const playerRef = useRef<ReactPlayer>(null);

    const [anchorElDownload, setAnchorElDownload] = useState<null | HTMLElement>(null);
    const openDownloadMenu = Boolean(anchorElDownload);

    const [selectedSegments, setSelectedSegments] = useState<Segment[]>([]);
    const [isLoadingClips, setIsLoadingClips] = useState<boolean>(false);
    const [clipMessage, setClipMessage] = useState<{ type: 'error' | 'warning' | 'success', text: string } | null>(null);
    const [generatedClips, setGeneratedClips] = useState<ExtractedClipInfo[]>([]);

    // --- Authentication check ---
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/');
            return;
        }
    }, [authLoading, isAuthenticated, navigate]);

    // --- Effect: Lấy data ---
    useEffect(() => {
        const fetchJobDetails = async () => {
            if (!jobId) { setError("Job ID is missing."); setIsLoading(false); return; }
            if (!isAuthenticated || authLoading) return; // Đợi authentication xong
            
            setIsLoading(true);
            setError(null); setPlayableVideoUrl(null);
            setSelectedSegments([]); setGeneratedClips([]); setClipMessage(null);

            try {
                const response: GetJobDetailsResponse = await getJobDetailsApi(jobId);
                if (response.success && response.data) {
                    setJobData(response.data);
                    if (response.data.videoUrl) {
                        setPlayableVideoUrl(
                            response.data.videoUrl.startsWith('http') ? response.data.videoUrl
                                : `${BACKEND_STATIC_FILES_BASE_URL}${response.data.videoUrl}`
                        );
                    }
                } else {
                    setError(response.message || `Could not load details for job ${jobId}.`); setJobData(null);
                }
            } catch (err: any) {
                setError(err.message || "An error occurred while fetching job details.");
                setJobData(null);
            } finally { setIsLoading(false); }
        };
        fetchJobDetails();
    }, [jobId, isAuthenticated, authLoading]);

    // --- Action handler ---
    const handleSeek = (timeInSeconds: number | null | undefined) => {
        if (playerRef.current && timeInSeconds !== null && timeInSeconds !== undefined) {
            playerRef.current.seekTo(timeInSeconds, 'seconds');
        }
    };
    const handleSegmentSelectionChange = (segment: Segment, isSelected: boolean) => {
        setSelectedSegments(prev =>
            isSelected ? [...prev, segment].sort((a, b) => a.start - b.start)
                : prev.filter(s => !(s.start === segment.start && s.end === segment.end))
        );
    };
    const handleCreateClips = async () => {
        if (!jobData || !jobData.videoFileName || selectedSegments.length === 0) {
            setClipMessage({ type: 'error', text: "Chọn ít nhất 1 đoạn!" }); return;
        }
        setIsLoadingClips(true); setClipMessage(null); setGeneratedClips([]);
        const segmentsToCut: SegmentTime[] = selectedSegments.map(seg => ({ startTime: seg.start, endTime: seg.end }));
        try {
            const response = await extractMultipleVideoSegmentsApi(jobData.videoFileName, segmentsToCut);
            if (response.success && response.data?.clips?.length) {
                setGeneratedClips(response.data.clips.map(relativePath => ({
                    name: relativePath.split('/').pop() ?? '', url: `${BACKEND_STATIC_FILES_BASE_URL}${relativePath}`
                })));
                setClipMessage({ type: 'success', text: `Đã tạo ${response.data.clips.length} clip.` });
            } else {
                setClipMessage({ type: 'warning', text: response.message || "Không tạo được clip." });
            }
        } catch (err: any) {
            setClipMessage({ type: 'error', text: err.message || "Lỗi khi tạo clip." });
        } finally { setIsLoadingClips(false); }
    };
    const handleOpenDownloadMenuEvent = (event: React.MouseEvent<HTMLElement>) => { setAnchorElDownload(event.currentTarget); };
    const handleCloseDownloadMenu = () => { setAnchorElDownload(null); };
    const handleDownloadTranscript = (format: 'txt' | 'json') => {
        handleCloseDownloadMenu();
        if (!jobData || !jobData._id) return;
        const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/files/${jobData._id}/download/${format}`;
        window.open(downloadUrl, '_blank');
    };
    const handleShare = () => {
        if (!jobData) return;
        const shareableLink = window.location.href;
        navigator.clipboard.writeText(shareableLink)
            .then(() => alert("Đã copy link!"))
            .catch(() => alert("Copy thất bại"));
    };

    // --- UI ---
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/files')}
                sx={{ m: 2, color: 'text.secondary', alignSelf: 'flex-start' }} size="small">
                Quay lại danh sách file
            </Button>
            <Container maxWidth="lg" sx={{ mt: 0, mb: 4, flexGrow: 1 }}>
                {(isLoading || authLoading) && <Box sx={{ display: 'flex', justifyContent: 'center', my: 7 }}><CircularProgress size={42} /></Box>}
                {error && !isLoading && !authLoading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {!isLoading && !authLoading && !error && jobData && (
                    <Paper elevation={4} sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        overflow: 'hidden',
                        minHeight: 480,
                        borderRadius: 5,
                        boxShadow: '0 10px 32px 0 rgba(60,72,190,0.12)',
                        p: { xs: 1, md: 2 },
                        bgcolor: 'background.paper'
                    }}>
                        {/* Video Player */}
                        <Box sx={{
                            width: { xs: '100%', md: '57%' }, minHeight: 330, borderRadius: 4,
                            overflow: 'hidden', bgcolor: '#171825', position: 'relative', p: 0
                        }}>
                            {playableVideoUrl ? (
                                <Fade in>
                                    <Box sx={{ width: '100%', height: '100%' }}>
                                        <ReactPlayer
                                            ref={playerRef}
                                            url={playableVideoUrl}
                                            controls
                                            width='100%'
                                            height='340px'
                                            style={{ background: 'black' }}
                                        />
                                    </Box>
                                </Fade>
                            ) : (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 340, bgcolor: 'background.default' }}>
                                    <Typography color="text.secondary">
                                        {jobData.status === 'processing'
                                            ? 'Đang xử lý video...'
                                            : 'Không tìm thấy video gốc'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* TRANSCRIPT & CONTROL */}
                        <Box sx={{
                            width: { xs: '100%', md: '43%' }, p: { xs: 2, sm: 4 }, pl: { md: 3 },
                            display: 'flex', flexDirection: 'column', bgcolor: 'background.default'
                        }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1} flexWrap="wrap">
                                <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
                                    {jobData.originalName || jobData.fileName}
                                </Typography>
                                <Chip
                                    label={jobData.status.charAt(0).toUpperCase() + jobData.status.slice(1)}
                                    color={jobData.status === 'success' ? 'success' : jobData.status === 'failed' ? 'error' : 'info'}
                                    icon={jobData.status === 'success' ? <CheckCircleOutlineIcon fontSize="small" /> : undefined}
                                    size="small"
                                    sx={{ height: 'auto', fontWeight: 500, fontSize: 14 }}
                                />
                                <Tooltip title="Chia sẻ đường dẫn">
                                    <IconButton onClick={handleShare} size="small"><ShareIcon /></IconButton>
                                </Tooltip>
                                <Tooltip title="Tải transcript">
                                    <span>
                                        <IconButton onClick={handleOpenDownloadMenuEvent} size="small"
                                            disabled={jobData.status !== 'success'}>
                                            <FileDownloadIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Menu
                                    anchorEl={anchorElDownload} open={openDownloadMenu} onClose={handleCloseDownloadMenu}
                                    PaperProps={{ sx: { bgcolor: '#2a2f4a', color: 'text.primary' } }}>
                                    <MenuItem onClick={() => handleDownloadTranscript('txt')}>
                                        <ListItemIcon><TextFormatIcon fontSize="small" /></ListItemIcon>.txt
                                    </MenuItem>
                                    <MenuItem onClick={() => handleDownloadTranscript('json')}>
                                        <ListItemIcon><DataObjectIcon fontSize="small" /></ListItemIcon>.json
                                    </MenuItem>
                                </Menu>
                            </Stack>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1 }}>
                                Lần cập nhật: {formatTimestamp(jobData.updatedAt)}
                            </Typography>

                            {/* Chức năng cut clip */}
                            {jobData.status === 'success' && jobData.segments?.length > 0 && (
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <Button
                                        variant="contained" color="secondary" size="small"
                                        startIcon={isLoadingClips ? <CircularProgress size={16} /> : <ContentCutIcon fontSize="small" />}
                                        onClick={handleCreateClips}
                                        disabled={selectedSegments.length === 0 || isLoadingClips}
                                    >
                                        Cắt video (clip)
                                    </Button>
                                    <FormControlLabel
                                        control={<Checkbox checked={showTimestamps} onChange={(e) => setShowTimestamps(e.target.checked)} size="small" />}
                                        label="Hiện timestamp"
                                    />
                                </Stack>
                            )}

                            <Divider sx={{ mb: 2 }} />

                            {/* Transcript hiển thị từng đoạn */}
                            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: { xs: 270, sm: 350, md: 420 } }}>
                                {jobData.status === 'processing' && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <CircularProgress size={22} sx={{ mb: 2 }} />
                                        <Typography sx={{ color: 'text.secondary' }}>Đang xử lý transcript...</Typography>
                                    </Box>
                                )}
                                {jobData.status === 'success' && jobData.segments?.length > 0 && (
                                    <Stack spacing={1.2}>
                                        {jobData.segments.map((segment, idx) => {
                                            const isSelected = selectedSegments.some(s => s.start === segment.start && s.end === segment.end);
                                            return (
                                                <Paper
                                                    key={`${segment.start}-${segment.end}-${idx}`}
                                                    elevation={isSelected ? 2 : 0}
                                                    sx={{
                                                        display: 'flex', alignItems: 'center',
                                                        p: 1.2, cursor: 'pointer', bgcolor: isSelected ? 'action.selected' : 'transparent',
                                                        '&:hover': { bgcolor: 'action.hover' }, borderRadius: 2,
                                                        border: isSelected ? '1.5px solid #6a6dff' : '1.5px solid transparent',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <Checkbox
                                                        size="small" checked={isSelected}
                                                        onChange={(e) => handleSegmentSelectionChange(segment, e.target.checked)}
                                                        sx={{ mr: 1, color: 'primary.main' }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <Box onClick={() => handleSeek(segment.start)} sx={{ flexGrow: 1 }}>
                                                        {showTimestamps && (
                                                            <Typography variant="caption" sx={{ mr: 1.5, color: 'text.secondary', minWidth: '90px', display: 'inline-block' }}>
                                                                [{formatDuration(segment.start)} - {formatDuration(segment.end)}]
                                                            </Typography>
                                                        )}
                                                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                                                            {segment.text}
                                                        </Typography>
                                                    </Box>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                )}
                                {jobData.status === 'success' && jobData.segments?.length === 0 && (
                                    <Alert severity="info" sx={{ mt: 2 }}>Không có transcript phân đoạn nào cho video này.</Alert>
                                )}
                                {jobData.status === 'failed' && <Alert severity="error" sx={{ mt: 2 }}>{jobData.errorMessage || 'Transcript lỗi.'}</Alert>}
                            </Box>
                            {clipMessage && <Alert severity={clipMessage.type} sx={{ mt: 2 }}>{clipMessage.text}</Alert>}
                            {generatedClips.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="subtitle2" gutterBottom>Clips vừa cắt:</Typography>
                                    <Stack spacing={1}>
                                        {generatedClips.map((clip, idx) => (
                                            <Paper key={idx} elevation={0} sx={{ p: 1, display: 'flex', alignItems: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>{clip.name}</Typography>
                                                <Button href={clip.url} target="_blank" download variant="outlined" size="small"
                                                    startIcon={<FileDownloadIcon />}>Download</Button>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                )}
                {!isLoading && !error && !jobData && (<Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>Không tìm thấy job này.</Typography>)}
            </Container>
        </Box>
    );
};

export default TranscriptDetailPage;
