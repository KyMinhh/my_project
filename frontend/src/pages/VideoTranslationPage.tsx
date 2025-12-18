import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Slider,
    Alert,
    LinearProgress,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Divider,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Translate as TranslateIcon,
    PlayArrow as PlayIcon,
    Download as DownloadIcon,
    Cancel as CancelIcon,
    Language as LanguageIcon,
    RecordVoiceOver as VoiceIcon,
    History as HistoryIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

interface Language {
    code: string;
    name: string;
    nativeName: string;
    tts: boolean;
    stt: boolean;
    defaultSpeed: number;
    region: string;
}

interface Voice {
    name: string;
    gender: string;
    quality: string;
    naturalSampleRateHertz: number;
}

interface TranslationJob {
    jobId: string;
    status: string;
    progress: number;
    currentStep: string;
    estimatedTime: number;
}

export default function VideoTranslationPage() {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [languagesByRegion, setLanguagesByRegion] = useState<Record<string, Language[]>>({});
    const [sourceLang, setSourceLang] = useState('auto');
    const [targetLang, setTargetLang] = useState('vi');
    const [voices, setVoices] = useState<Voice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState('');
    const [gender, setGender] = useState('NEUTRAL');
    const [speakingRate, setSpeakingRate] = useState(1.0);
    const [pitch, setPitch] = useState(0);

    const [selectedVideoId, setSelectedVideoId] = useState('');
    const [recentVideos, setRecentVideos] = useState<any[]>([]);

    const [currentJob, setCurrentJob] = useState<TranslationJob | null>(null);
    const [showProgress, setShowProgress] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadLanguages();
        loadRecentVideos();
    }, []);

    useEffect(() => {
        if (targetLang && targetLang !== 'auto') {
            loadVoices(targetLang);
        }
    }, [targetLang]);

    const loadLanguages = async () => {
        try {
            const response = await axios.get(`${API_BASE}/translation/languages`);
            setLanguages(response.data.languages);
            setLanguagesByRegion(response.data.byRegion);
        } catch (err: any) {
            setError('Failed to load languages: ' + err.message);
        }
    };

    const loadVoices = async (langCode: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE}/translation/voices/${langCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVoices(response.data.voices);
            if (response.data.voices.length > 0) {
                setSelectedVoice(response.data.voices[0].name);
            }
        } catch (err: any) {
            console.error('Failed to load voices:', err);
        }
    };

    const loadRecentVideos = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE}/recent-files`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecentVideos(response.data.files || []);
        } catch (err) {
            console.error('Failed to load videos:', err);
        }
    };

    const handleStartTranslation = async () => {
        if (!selectedVideoId) {
            setError('Please select a video first');
            return;
        }

        try {
            setError('');
            setSuccess('');

            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_BASE}/translation/start`,
                {
                    videoId: selectedVideoId,
                    sourceLang,
                    targetLang,
                    voiceConfig: {
                        voiceName: selectedVoice,
                        gender,
                        speakingRate,
                        pitch
                    }
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setCurrentJob({
                jobId: response.data.jobId,
                status: response.data.status,
                progress: 0,
                currentStep: 'queued',
                estimatedTime: response.data.estimatedTime
            });

            setShowProgress(true);
            setSuccess('Translation started!');

            // Start polling for status
            pollJobStatus(response.data.jobId);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to start translation');
        }
    };

    const pollJobStatus = async (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_BASE}/translation/status/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setCurrentJob(response.data);

                if (response.data.status === 'completed') {
                    clearInterval(interval);
                    setSuccess('Translation completed!');
                    loadTranslationResult(jobId);
                } else if (response.data.status === 'failed') {
                    clearInterval(interval);
                    setError('Translation failed: ' + response.data.errorMessage);
                }
            } catch (err) {
                clearInterval(interval);
                console.error('Failed to poll status:', err);
            }
        }, 3000); // Poll every 3 seconds
    };

    const loadTranslationResult = async (jobId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE}/translation/result/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Translation result:', response.data);
            // You can display download link here
        } catch (err) {
            console.error('Failed to load result:', err);
        }
    };

    const handleCancelJob = async () => {
        if (!currentJob) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE}/translation/cancel/${currentJob.jobId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setShowProgress(false);
            setCurrentJob(null);
            setSuccess('Translation cancelled');
        } catch (err: any) {
            setError('Failed to cancel: ' + err.message);
        }
    };

    const getStepLabel = (step: string) => {
        const labels: Record<string, string> = {
            'queued': 'Đang chờ xử lý',
            'extracting_audio': 'Đang tách audio',
            'detecting_language': 'Đang phát hiện ngôn ngữ',
            'transcribing': 'Đang chuyển giọng nói thành văn bản',
            'translating': 'Đang dịch',
            'generating_speech': 'Đang tạo giọng nói mới',
            'adjusting_timing': 'Đang điều chỉnh thời gian',
            'merging_audio': 'Đang ghép audio',
            'replacing_audio': 'Đang thay thế audio',
            'generating_subtitles': 'Đang tạo phụ đề'
        };
        return labels[step] || step;
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    <TranslateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Dịch Video Đa Ngôn Ngữ
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Chuyển đổi video từ bất kỳ ngôn ngữ nào sang bất kỳ ngôn ngữ nào với lồng tiếng tự động
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Video Selection */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                1. Chọn Video
                            </Typography>
                            <FormControl fullWidth>
                                <InputLabel>Video</InputLabel>
                                <Select
                                    value={selectedVideoId}
                                    onChange={(e) => setSelectedVideoId(e.target.value)}
                                    label="Video"
                                >
                                    {recentVideos.map((video) => (
                                        <MenuItem key={video._id} value={video._id}>
                                            {video.title || video.filename} ({Math.round(video.duration || 0)}s)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Language Selection */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <LanguageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                2. Chọn Ngôn Ngữ
                            </Typography>

                            <FormControl fullWidth margin="normal">
                                <InputLabel>Ngôn ngữ gốc</InputLabel>
                                <Select
                                    value={sourceLang}
                                    onChange={(e) => setSourceLang(e.target.value)}
                                    label="Ngôn ngữ gốc"
                                >
                                    <MenuItem value="auto">
                                        🔍 Tự động phát hiện
                                    </MenuItem>
                                    {Object.entries(languagesByRegion).map(([region, langs]) => [
                                        <ListItem key={region} disabled>
                                            <ListItemText primary={region} />
                                        </ListItem>,
                                        ...langs.filter(l => l.stt).map(lang => (
                                            <MenuItem key={lang.code} value={lang.code} sx={{ pl: 4 }}>
                                                {lang.nativeName} ({lang.name})
                                            </MenuItem>
                                        ))
                                    ])}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth margin="normal">
                                <InputLabel>Ngôn ngữ đích</InputLabel>
                                <Select
                                    value={targetLang}
                                    onChange={(e) => setTargetLang(e.target.value)}
                                    label="Ngôn ngữ đích"
                                >
                                    {Object.entries(languagesByRegion).map(([region, langs]) => [
                                        <ListItem key={region} disabled>
                                            <ListItemText primary={region} />
                                        </ListItem>,
                                        ...langs.filter(l => l.tts).map(lang => (
                                            <MenuItem key={lang.code} value={lang.code} sx={{ pl: 4 }}>
                                                {lang.nativeName} ({lang.name})
                                            </MenuItem>
                                        ))
                                    ])}
                                </Select>
                            </FormControl>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Voice Configuration */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <VoiceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                3. Cấu Hình Giọng Nói
                            </Typography>

                            <FormControl fullWidth margin="normal">
                                <InputLabel>Giọng nói</InputLabel>
                                <Select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    label="Giọng nói"
                                >
                                    {voices.map((voice) => (
                                        <MenuItem key={voice.name} value={voice.name}>
                                            {voice.name} ({voice.gender})
                                            {voice.quality === 'premium' && ' ⭐'}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth margin="normal">
                                <InputLabel>Giới tính</InputLabel>
                                <Select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    label="Giới tính"
                                >
                                    <MenuItem value="FEMALE">Nữ</MenuItem>
                                    <MenuItem value="MALE">Nam</MenuItem>
                                    <MenuItem value="NEUTRAL">Trung tính</MenuItem>
                                </Select>
                            </FormControl>

                            <Box sx={{ mt: 3 }}>
                                <Typography gutterBottom>
                                    Tốc độ nói: {speakingRate.toFixed(1)}x
                                </Typography>
                                <Slider
                                    value={speakingRate}
                                    onChange={(_, val) => setSpeakingRate(val as number)}
                                    min={0.5}
                                    max={2.0}
                                    step={0.1}
                                    marks={[
                                        { value: 0.5, label: '0.5x' },
                                        { value: 1.0, label: '1.0x' },
                                        { value: 2.0, label: '2.0x' }
                                    ]}
                                />
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Typography gutterBottom>
                                    Cao độ: {pitch > 0 ? '+' : ''}{pitch}
                                </Typography>
                                <Slider
                                    value={pitch}
                                    onChange={(_, val) => setPitch(val as number)}
                                    min={-10}
                                    max={10}
                                    step={1}
                                    marks={[
                                        { value: -10, label: '-10' },
                                        { value: 0, label: '0' },
                                        { value: 10, label: '+10' }
                                    ]}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Action Buttons */}
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<TranslateIcon />}
                            onClick={handleStartTranslation}
                            disabled={!selectedVideoId || showProgress}
                        >
                            Bắt đầu dịch
                        </Button>
                    </Box>
                </Grid>
            </Grid>

            {/* Progress Dialog */}
            <Dialog open={showProgress} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Đang dịch video...
                </DialogTitle>
                <DialogContent>
                    {currentJob && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {getStepLabel(currentJob.currentStep)}
                            </Typography>

                            <LinearProgress
                                variant="determinate"
                                value={currentJob.progress}
                                sx={{ my: 2, height: 10, borderRadius: 5 }}
                            />

                            <Typography variant="h6" align="center">
                                {currentJob.progress}%
                            </Typography>

                            {currentJob.estimatedTime && (
                                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                                    Thời gian ước tính: ~{Math.round(currentJob.estimatedTime / 60)} phút
                                </Typography>
                            )}

                            <Box sx={{ mt: 3 }}>
                                <Typography variant="caption" display="block" gutterBottom>
                                    Các bước xử lý:
                                </Typography>
                                <List dense>
                                    {[
                                        'extracting_audio',
                                        'transcribing',
                                        'translating',
                                        'generating_speech',
                                        'replacing_audio'
                                    ].map((step, index) => (
                                        <ListItem key={step}>
                                            <Chip
                                                label={getStepLabel(step)}
                                                size="small"
                                                color={currentJob.currentStep === step ? 'primary' : 'default'}
                                                variant={currentJob.currentStep === step ? 'filled' : 'outlined'}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelJob} color="error" startIcon={<CancelIcon />}>
                        Hủy
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
