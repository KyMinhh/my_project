import React, { useState, useEffect, useRef } from 'react';
import {
    Container, Box, Paper, Typography, Button, Stack, CircularProgress, Alert,
    Divider, Checkbox, FormControlLabel, IconButton, Chip,
    Menu, MenuItem, ListItemIcon, Tooltip, Fade, Switch, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField
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
import TranslateIcon from '@mui/icons-material/Translate';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SubtitlesIcon from '@mui/icons-material/Subtitles';

import { JobDetail, GetJobDetailsResponse, Segment, ExtractedClipInfo, SegmentTime, TranslatedTranscript } from '../types/fileTypes';
import { getJobDetailsApi, extractMultipleVideoSegmentsApi, extractMultipleVideoSegmentsByJobIdApi, extractSingleVideoSegmentApi, translateJobApi } from '../services/fileApi';
import { formatDuration } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import LanguageSelector, { getLanguageName } from '../components/LanguageSelector';
import SubtitleExporter from '../components/SubtitleExporter';
import { SubtitleSegment } from '../services/subtitleApi';
import SearchBar, { SearchOptions } from '../components/SearchBar';
import HighlightedText from '../components/HighlightedText';
import SearchOptionsComponent from '../components/SearchOptions';

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

    // Manual time cut states
    const [manualStartTime, setManualStartTime] = useState<string>('');
    const [manualEndTime, setManualEndTime] = useState<string>('');
    const [isManualCutting, setIsManualCutting] = useState<boolean>(false);

    // Translation states
    const [showTranslateDialog, setShowTranslateDialog] = useState<boolean>(false);
    const [selectedTranslateLanguage, setSelectedTranslateLanguage] = useState<string>('en');
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [translateMessage, setTranslateMessage] = useState<{ type: 'error' | 'warning' | 'success', text: string } | null>(null);
    const [showTranslatedText, setShowTranslatedText] = useState<boolean>(false);
    const [currentTranslation, setCurrentTranslation] = useState<TranslatedTranscript | null>(null);

    // Subtitle states
    const [showSubtitleExporter, setShowSubtitleExporter] = useState<boolean>(false);

    // Search states
    interface MatchPosition {
        start: number;
        end: number;
    }
    interface SearchResult {
        segmentIndex: number;
        segment: Segment;
        matchPositions: MatchPosition[];
    }
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
    const [searchOptions, setSearchOptions] = useState<SearchOptions>({
        caseSensitive: false,
        wholeWord: false,
        filterBySpeaker: null
    });
    const [anchorElSearchOptions, setAnchorElSearchOptions] = useState<null | HTMLElement>(null);
    const openSearchOptions = Boolean(anchorElSearchOptions);

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
            setTranslateMessage(null); setShowTranslatedText(false); setCurrentTranslation(null);

            try {
                const response: GetJobDetailsResponse = await getJobDetailsApi(jobId);
                if (response.success && response.data) {
                    setJobData(response.data);
                    // Check if there's existing translation
                    if (response.data.translatedTranscript && response.data.translatedTranscript.length > 0) {
                        const latestTranslation = response.data.translatedTranscript[response.data.translatedTranscript.length - 1];
                        setCurrentTranslation(latestTranslation);
                    }
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
        if (!jobData || selectedSegments.length === 0) {
            setClipMessage({ type: 'error', text: "Chọn ít nhất 1 đoạn!" }); 
            return;
        }
        
        setIsLoadingClips(true); 
        setClipMessage(null); 
        setGeneratedClips([]);
        
        const segmentsToCut: SegmentTime[] = selectedSegments.map(seg => ({ 
            startTime: seg.start, 
            endTime: seg.end 
        }));
        
        try {
            let response;
            
            // Ưu tiên sử dụng jobId nếu có, fallback về videoFileName
            if (jobData._id) {
                console.log(`[UI] Extracting multiple segments using jobId: ${jobData._id}`);
                response = await extractMultipleVideoSegmentsByJobIdApi(jobData._id, segmentsToCut);
            } else if (jobData.videoFileName) {
                console.log(`[UI] Extracting multiple segments using videoFileName: ${jobData.videoFileName}`);
                response = await extractMultipleVideoSegmentsApi(jobData.videoFileName, segmentsToCut);
            } else {
                setClipMessage({ type: 'error', text: "Không tìm thấy thông tin video!" });
                setIsLoadingClips(false);
                return;
            }
            
            if (response.success && response.data?.clips?.length) {
                setGeneratedClips(response.data.clips.map(relativePath => ({
                    name: relativePath.split('/').pop() ?? '', 
                    url: `${BACKEND_STATIC_FILES_BASE_URL}${relativePath}`
                })));
                setClipMessage({ 
                    type: 'success', 
                    text: `✅ Đã tạo ${response.data.clips.length} clip từ ${selectedSegments.length} đoạn được chọn!` 
                });
            } else {
                setClipMessage({ type: 'warning', text: response.message || "Không tạo được clip." });
            }
        } catch (err: any) {
            setClipMessage({ type: 'error', text: err.message || "Lỗi khi tạo clip." });
        } finally { 
            setIsLoadingClips(false); 
        }
    };

    // Manual time cut handler
    const handleManualCutVideo = async () => {
        if (!jobData || !jobData._id) {
            setClipMessage({ type: 'error', text: "Không tìm thấy thông tin video!" }); 
            return;
        }

        const start = parseFloat(manualStartTime);
        const end = parseFloat(manualEndTime);

        if (isNaN(start) || isNaN(end)) {
            setClipMessage({ type: 'error', text: "Vui lòng nhập thời gian hợp lệ (số)!" }); 
            return;
        }

        if (start < 0 || end <= start) {
            setClipMessage({ type: 'error', text: "Thời gian không hợp lệ! End phải lớn hơn Start." }); 
            return;
        }

        setIsManualCutting(true); 
        setClipMessage(null); 
        setGeneratedClips([]);

        try {
            const response = await extractSingleVideoSegmentApi(jobData._id, start, end);
            if (response.success && response.data?.outputPath) {
                const clipUrl = `${BACKEND_STATIC_FILES_BASE_URL}${response.data.outputPath}`;
                setGeneratedClips([{
                    name: response.data.outputPath.split('/').pop() ?? 'clip.mp4',
                    url: clipUrl
                }]);
                setClipMessage({ type: 'success', text: `Đã cắt video từ ${start}s đến ${end}s!` });
                // Reset input fields
                setManualStartTime('');
                setManualEndTime('');
            } else {
                setClipMessage({ type: 'warning', text: response.message || "Không tạo được clip." });
            }
        } catch (err: any) {
            setClipMessage({ type: 'error', text: err.message || "Lỗi khi cắt video." });
        } finally { 
            setIsManualCutting(false); 
        }
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

    // Translation handlers
    const handleOpenTranslateDialog = () => {
        setShowTranslateDialog(true);
        setTranslateMessage(null);
    };

    const handleCloseTranslateDialog = () => {
        setShowTranslateDialog(false);
        setSelectedTranslateLanguage('en');
    };

    const handleTranslateJob = async () => {
        if (!jobData || !jobData._id || !selectedTranslateLanguage) {
            setTranslateMessage({ type: 'error', text: 'Thiếu thông tin để dịch!' });
            return;
        }

        setIsTranslating(true);
        setTranslateMessage(null);

        try {
            const response = await translateJobApi(jobData._id, selectedTranslateLanguage);
            if (response.success && response.data) {
                setTranslateMessage({ type: 'success', text: `Đã dịch thành công sang ${getLanguageName(selectedTranslateLanguage)}!` });
                
                // Create new translation object
                const newTranslation: TranslatedTranscript = {
                    language: selectedTranslateLanguage,
                    segments: response.data.translatedTranscript, // Fix: use translatedTranscript instead of translatedSegments
                    translatedAt: new Date().toISOString()
                };
                
                setCurrentTranslation(newTranslation);
                setShowTranslatedText(true);
                
                // Update jobData with new translation
                setJobData(prev => {
                    if (!prev) return prev;
                    const updatedTranslations = prev.translatedTranscript || [];
                    return {
                        ...prev,
                        translatedTranscript: [...updatedTranslations, newTranslation]
                    };
                });
                
                // Close dialog after successful translation
                setTimeout(() => {
                    setShowTranslateDialog(false);
                }, 1500);
            } else {
                setTranslateMessage({ type: 'error', text: response.message || 'Dịch thất bại!' });
            }
        } catch (error: any) {
            setTranslateMessage({ type: 'error', text: error.message || 'Lỗi khi dịch transcript!' });
        } finally {
            setIsTranslating(false);
        }
    };

    const handleToggleTranslation = (checked: boolean) => {
        setShowTranslatedText(checked);
    };

    // Search handlers
    const performSearch = (query: string) => {
        setSearchQuery(query);
        
        if (!query.trim()) {
            setSearchResults([]);
            setCurrentResultIndex(0);
            return;
        }

        const results: SearchResult[] = [];
        const segments = getCurrentSegments();
        
        segments.forEach((segment, index) => {
            if (searchOptions.filterBySpeaker !== null && 
                segment.speakerTag !== searchOptions.filterBySpeaker) {
                return;
            }

            let searchText = segment.text;
            let queryText = query;

            if (!searchOptions.caseSensitive) {
                searchText = searchText.toLowerCase();
                queryText = queryText.toLowerCase();
            }

            const matchPositions: MatchPosition[] = [];
            let lastIndex = 0;
            let idx = searchText.indexOf(queryText, lastIndex);

            while (idx !== -1) {

                if (searchOptions.wholeWord) {
                    const before = idx > 0 ? searchText[idx - 1] : ' ';
                    const after = idx + queryText.length < searchText.length 
                        ? searchText[idx + queryText.length] 
                        : ' ';
                    
                    if (!/\s/.test(before) || !/\s/.test(after)) {
                        lastIndex = idx + 1;
                        continue;
                    }
                }

                matchPositions.push({
                    start: idx,
                    end: idx + queryText.length
                });
                lastIndex = idx + queryText.length;
                idx = searchText.indexOf(queryText, lastIndex);
            }

            if (matchPositions.length > 0) {
                results.push({
                    segmentIndex: index,
                    segment,
                    matchPositions
                });
            }
        });

        setSearchResults(results);
        setCurrentResultIndex(results.length > 0 ? 0 : 0);
        
        if (results.length > 0) {
            jumpToResult(0, results);
        }
    };

    const jumpToResult = (resultIndex: number, results: SearchResult[] = searchResults) => {
        if (resultIndex < 0 || resultIndex >= results.length) return;

        const result = results[resultIndex];
        setCurrentResultIndex(resultIndex);

        const segmentElement = document.getElementById(`segment-${result.segmentIndex}`);
        if (segmentElement) {
            segmentElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }

        handleSeek(result.segment.start);
    };

    const handleNextResult = () => {
        if (currentResultIndex < searchResults.length - 1) {
            jumpToResult(currentResultIndex + 1);
        }
    };

    const handlePrevResult = () => {
        if (currentResultIndex > 0) {
            jumpToResult(currentResultIndex - 1);
        }
    };

    const handleOpenSearchOptions = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElSearchOptions(event.currentTarget);
    };

    const handleCloseSearchOptions = () => {
        setAnchorElSearchOptions(null);
    };

    const handleSearchOptionsChange = (newOptions: SearchOptions) => {
        setSearchOptions(newOptions);
    };

    // Re-trigger search when options change
    React.useEffect(() => {
        if (searchQuery) {
            performSearch(searchQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchOptions]);

    // Clear search when switching translation
    React.useEffect(() => {
        if (searchQuery) {
            performSearch(searchQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showTranslatedText, currentTranslation]);

    // Get current segments to display (original or translated)
    const getCurrentSegments = (): Segment[] => {
        if (showTranslatedText && currentTranslation?.segments) {
            return currentTranslation.segments.map(seg => ({
                start: seg.start,
                end: seg.end,
                text: seg.translatedText,
                speakerTag: seg.speakerTag
            }));
        }
        return jobData?.segments || [];
    };

    // Convert segments to subtitle format
    const convertToSubtitleSegments = (segments: Segment[]): SubtitleSegment[] => {
        return segments.map(seg => ({
            start: seg.start,
            end: seg.end,
            text: seg.text
        }));
    };

    // Get multi-language transcripts for subtitle export
    const getMultiLanguageTranscripts = (): { [language: string]: SubtitleSegment[] } | undefined => {
        if (!jobData) return undefined;
        
        const transcripts: { [language: string]: SubtitleSegment[] } = {};
        
        // Add original transcript
        if (jobData.segments && Array.isArray(jobData.segments)) {
            transcripts['original'] = convertToSubtitleSegments(jobData.segments);
        }
        
        // Add translated transcripts
        if (jobData.translatedTranscript && Array.isArray(jobData.translatedTranscript) && jobData.translatedTranscript.length > 0) {
            jobData.translatedTranscript.forEach(translation => {
                // Safety check: ensure segments exists and is an array
                if (translation && translation.segments && Array.isArray(translation.segments)) {
                    const translatedSegments = translation.segments.map(seg => ({
                        start: seg.start,
                        end: seg.end,
                        text: seg.translatedText || seg.text || ''
                    }));
                    transcripts[translation.language] = translatedSegments;
                }
            });
        }
        
        return Object.keys(transcripts).length > 0 ? transcripts : undefined;
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
                                <Tooltip title="Dịch transcript">
                                    <span>
                                        <IconButton onClick={handleOpenTranslateDialog} size="small"
                                            disabled={jobData.status !== 'success' || !jobData.segments || jobData.segments.length === 0}>
                                            <TranslateIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Export Subtitles">
                                    <span>
                                        <IconButton onClick={() => setShowSubtitleExporter(true)} size="small"
                                            disabled={jobData.status !== 'success' || !jobData.segments || jobData.segments.length === 0}
                                            color="secondary">
                                            <SubtitlesIcon />
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

                            {/* Chức năng cut clip và translation toggle */}
                            {jobData.status === 'success' && jobData.segments?.length > 0 && (
                                <Stack spacing={2}>
                                    {/* Multiple segments cutting from selected transcript */}
                                    <Paper 
                                        elevation={0} 
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: 'background.paper',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 2
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                            <ContentCutIcon fontSize="small" color="secondary" />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                                                Cắt nhiều đoạn từ Transcript
                                            </Typography>
                                            <Chip 
                                                label={`${selectedSegments.length} đoạn`} 
                                                size="small" 
                                                color={selectedSegments.length > 0 ? "secondary" : "default"}
                                            />
                                        </Stack>
                                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                            <Button
                                                variant="contained" 
                                                color="secondary" 
                                                size="small"
                                                startIcon={isLoadingClips ? <CircularProgress size={16} /> : <ContentCutIcon fontSize="small" />}
                                                onClick={handleCreateClips}
                                                disabled={selectedSegments.length === 0 || isLoadingClips}
                                                sx={{ mr: 1 }}
                                            >
                                                {isLoadingClips ? 'Đang cắt...' : 'Cắt video'}
                                            </Button>
                                            <FormControlLabel
                                                control={<Checkbox checked={showTimestamps} onChange={(e) => setShowTimestamps(e.target.checked)} size="small" />}
                                                label="Hiện timestamp"
                                            />
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            💡 Tick chọn các đoạn transcript bên dưới, sau đó nhấn "Cắt video" để tạo nhiều clip cùng lúc
                                        </Typography>
                                    </Paper>

                                    {/* Manual time cut section */}
                                    <Paper 
                                        elevation={0} 
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: 'action.hover',
                                            border: '1px solid',
                                            borderColor: 'primary.main',
                                            borderRadius: 2
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                                            <ContentCutIcon fontSize="small" color="primary" />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                Cắt video theo thời gian chính xác
                                            </Typography>
                                        </Stack>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                                            <TextField
                                                label="Start Time (giây)"
                                                type="number"
                                                size="small"
                                                value={manualStartTime}
                                                onChange={(e) => setManualStartTime(e.target.value)}
                                                placeholder="0"
                                                inputProps={{ min: 0, step: 0.1 }}
                                                sx={{ flexGrow: 1 }}
                                                helperText="VD: 5.5"
                                            />
                                            <TextField
                                                label="End Time (giây)"
                                                type="number"
                                                size="small"
                                                value={manualEndTime}
                                                onChange={(e) => setManualEndTime(e.target.value)}
                                                placeholder="10"
                                                inputProps={{ min: 0, step: 0.1 }}
                                                sx={{ flexGrow: 1 }}
                                                helperText="VD: 15.7"
                                            />
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="medium"
                                                startIcon={isManualCutting ? <CircularProgress size={16} /> : <ContentCutIcon fontSize="small" />}
                                                onClick={handleManualCutVideo}
                                                disabled={isManualCutting || !manualStartTime || !manualEndTime}
                                                sx={{ minWidth: 120, height: 40 }}
                                            >
                                                {isManualCutting ? 'Đang cắt...' : 'Cắt ngay'}
                                            </Button>
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            ✂️ Nhập thời gian bắt đầu và kết thúc (đơn vị: giây, có thể dùng số thập phân) để cắt 1 đoạn video chính xác
                                        </Typography>
                                    </Paper>
                                    
                                    {/* Translation toggle */}
                                    {currentTranslation && (
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ 
                                            bgcolor: 'action.hover', 
                                            p: 1.5, 
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <CompareArrowsIcon fontSize="small" color="primary" />
                                            <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                                Bản dịch {getLanguageName(currentTranslation?.language)}
                                            </Typography>
                                            <FormControlLabel
                                                control={
                                                    <Switch 
                                                        checked={showTranslatedText} 
                                                        onChange={(e) => handleToggleTranslation(e.target.checked)}
                                                        size="small"
                                                        color="primary"
                                                    />
                                                }
                                                label={showTranslatedText ? "Bản dịch" : "Gốc"}
                                            />
                                        </Stack>
                                    )}
                                </Stack>
                            )}

                            <Divider sx={{ mb: 2 }} />

                            {/* Search Bar */}
                            {jobData.status === 'success' && jobData.segments && jobData.segments.length > 0 && (
                                <>
                                    <SearchBar
                                        onSearch={performSearch}
                                        resultsCount={searchResults.length}
                                        currentIndex={currentResultIndex}
                                        onNext={handleNextResult}
                                        onPrev={handlePrevResult}
                                        onOptionsToggle={handleOpenSearchOptions}
                                    />
                                    <SearchOptionsComponent
                                        anchorEl={anchorElSearchOptions}
                                        open={openSearchOptions}
                                        onClose={handleCloseSearchOptions}
                                        options={searchOptions}
                                        onOptionsChange={handleSearchOptionsChange}
                                        speakerTags={
                                            jobData.segments
                                                ? Array.from(
                                                    new Set(
                                                        jobData.segments
                                                            .map(s => s.speakerTag)
                                                            .filter((t): t is number => t !== undefined)
                                                    )
                                                )
                                                : []
                                        }
                                    />
                                </>
                            )}

                            {/* Transcript hiển thị từng đoạn */}
                            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: { xs: 270, sm: 350, md: 420 } }}>
                                {jobData.status === 'processing' && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <CircularProgress size={22} sx={{ mb: 2 }} />
                                        <Typography sx={{ color: 'text.secondary' }}>Đang xử lý transcript...</Typography>
                                    </Box>
                                )}
                                
                                {/* Empty search results */}
                                {searchQuery && searchResults.length === 0 && jobData.status === 'success' && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        <Typography variant="body2" fontWeight={500} gutterBottom>
                                            Không tìm thấy "{searchQuery}"
                                        </Typography>
                                        <Typography variant="caption">
                                            {searchOptions.caseSensitive && '• Đang bật phân biệt hoa/thường\n'}
                                            {searchOptions.wholeWord && '• Đang bật khớp từ nguyên vẹn\n'}
                                            {searchOptions.filterBySpeaker !== null && `• Đang lọc người nói ${searchOptions.filterBySpeaker}\n`}
                                            Thử tắt một số tùy chọn hoặc thay đổi từ khóa
                                        </Typography>
                                    </Alert>
                                )}
                                
                                {jobData.status === 'success' && jobData.segments?.length > 0 && (
                                    <Stack spacing={1.2}>
                                        {getCurrentSegments().map((segment, idx) => {
                                            const isSelected = selectedSegments.some(s => s.start === segment.start && s.end === segment.end);
                                            const searchResult = searchResults.find(r => r.segmentIndex === idx);
                                            const isActiveResult = searchResults[currentResultIndex]?.segmentIndex === idx;
                                            
                                            return (
                                                <Paper
                                                    id={`segment-${idx}`}
                                                    key={`${segment.start}-${segment.end}-${idx}`}
                                                    elevation={isSelected ? 2 : 0}
                                                    sx={{
                                                        display: 'flex', alignItems: 'center',
                                                        p: 1.2, cursor: 'pointer', 
                                                        bgcolor: isActiveResult ? 'action.focus' : isSelected ? 'action.selected' : 'transparent',
                                                        '&:hover': { bgcolor: 'action.hover' }, 
                                                        borderRadius: 2,
                                                        border: isActiveResult ? '2px solid #ffd700' : isSelected ? '1.5px solid #6a6dff' : '1.5px solid transparent',
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
                                                        <Typography variant="body2" sx={{ 
                                                            color: 'text.primary', 
                                                            fontWeight: 500,
                                                            fontStyle: showTranslatedText && currentTranslation ? 'italic' : 'normal'
                                                        }}>
                                                            <HighlightedText
                                                                text={segment.text}
                                                                searchQuery={searchQuery}
                                                                isActive={isActiveResult}
                                                                matchPositions={searchResult?.matchPositions || []}
                                                            />
                                                        </Typography>
                                                        {/* Show original text when viewing translation */}
                                                        {showTranslatedText && currentTranslation && (
                                                            <Typography variant="caption" sx={{ 
                                                                color: 'text.secondary', 
                                                                display: 'block', 
                                                                mt: 0.5,
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                Gốc: {jobData?.segments?.[idx]?.text || ''}
                                                            </Typography>
                                                        )}
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
                
                {/* Translation Dialog */}
                <Dialog open={showTranslateDialog} onClose={handleCloseTranslateDialog} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TranslateIcon color="primary" />
                        Dịch Transcript
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Chọn ngôn ngữ bạn muốn dịch transcript này:
                            </Typography>
                            
                            <LanguageSelector
                                value={selectedTranslateLanguage}
                                onChange={setSelectedTranslateLanguage}
                                disabled={isTranslating}
                                label="Ngôn ngữ đích"
                                size="medium"
                            />
                            
                            {translateMessage && (
                                <Alert severity={translateMessage.type}>
                                    {translateMessage.text}
                                </Alert>
                            )}
                            
                            {jobData?.translatedTranscript && jobData.translatedTranscript.length > 0 && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    <Typography variant="body2" fontWeight={500} gutterBottom>
                                        Các bản dịch có sẵn:
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {jobData.translatedTranscript.map((trans, idx) => (
                                            <Chip
                                                key={idx}
                                                label={getLanguageName(trans?.language)}
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                            />
                                        ))}
                                    </Stack>
                                </Alert>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseTranslateDialog} disabled={isTranslating}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleTranslateJob}
                            variant="contained"
                            disabled={isTranslating || !selectedTranslateLanguage}
                            startIcon={isTranslating ? <CircularProgress size={16} /> : <TranslateIcon />}
                        >
                            {isTranslating ? 'Đang dịch...' : 'Dịch ngay'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Subtitle Exporter */}
                {jobData && jobData.segments && (
                    <SubtitleExporter
                        open={showSubtitleExporter}
                        onClose={() => setShowSubtitleExporter(false)}
                        segments={convertToSubtitleSegments(getCurrentSegments())}
                        jobId={jobData._id}
                        videoPath={jobData.videoUrl || undefined}
                        transcripts={getMultiLanguageTranscripts()}
                    />
                )}
            </Container>
        </Box>
    );
};

export default TranscriptDetailPage;
