import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    Button,
    CircularProgress,
    Alert,
    Chip,
    IconButton,
    Tooltip,
    Divider,
    Stack
} from '@mui/material';
import {
    AutoAwesome,
    ContentCopy,
    Refresh,
    Share,
    CheckCircle,
    Schedule,
    Psychology,
    FormatListBulleted,
    VideoLibrary,
    ListAlt,
    LocalOffer
} from '@mui/icons-material';
import { generateSummary, getSummaries, SummaryData } from '../services/summaryApi';
import { useTranslation } from 'react-i18next';

interface SummaryPanelProps {
    jobId: string;
    transcriptLength?: number;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
        </div>
    );
};

const SummaryPanel: React.FC<SummaryPanelProps> = ({ jobId, transcriptLength = 0 }) => {
    const { t } = useTranslation();
    const [currentTab, setCurrentTab] = useState(0);
    const [summaries, setSummaries] = useState<Record<string, SummaryData>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [copiedType, setCopiedType] = useState<string | null>(null);

    const summaryTypes = [
        { id: 'quick', label: 'Tóm tắt nhanh', icon: <Schedule />, color: '#4CAF50' },
        { id: 'detailed', label: 'Chi tiết', icon: <Psychology />, color: '#2196F3' },
        { id: 'bullets', label: 'Điểm chính', icon: <FormatListBulleted />, color: '#FF9800' },
        { id: 'chapters', label: 'Chapters', icon: <VideoLibrary />, color: '#9C27B0' },
        { id: 'action_items', label: 'Action Items', icon: <ListAlt />, color: '#F44336' },
        { id: 'keywords', label: 'Keywords', icon: <LocalOffer />, color: '#00BCD4' }
    ];

    // Load existing summaries on mount
    useEffect(() => {
        loadSummaries();
    }, [jobId]);

    const loadSummaries = async () => {
        try {
            const data = await getSummaries(jobId);
            setSummaries(data);
        } catch (err: any) {
            console.error('Failed to load summaries:', err);
        }
    };

    const handleGenerateSummary = async (type: string, forceRegenerate: boolean = false) => {
        setError(null);
        setLoading(prev => ({ ...prev, [type]: true }));

        try {
            const result = await generateSummary(jobId, type, forceRegenerate);
            
            // Update summaries state
            setSummaries(prev => ({
                ...prev,
                [type]: {
                    text: result.data.summary,
                    generatedAt: result.data.generatedAt,
                    model: result.data.model,
                    provider: result.data.provider
                }
            }));

            console.log(`✅ ${type} summary generated:`, result.data);
        } catch (err: any) {
            console.error('Summary generation failed:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to generate summary';
            setError(errorMessage);
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleCopyToClipboard = async (type: string) => {
        if (!summaries[type]?.text) return;

        try {
            await navigator.clipboard.writeText(summaries[type].text);
            setCopiedType(type);
            setTimeout(() => setCopiedType(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async (type: string) => {
        if (!summaries[type]?.text) return;

        const shareData = {
            title: `Video Summary - ${summaryTypes.find(t => t.id === type)?.label}`,
            text: summaries[type].text
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            handleCopyToClipboard(type);
        }
    };

    const renderSummaryContent = (type: string) => {
        const summaryType = summaryTypes.find(t => t.id === type);
        const summary = summaries[type];
        const isLoading = loading[type];

        return (
            <Box>
                {/* Header with actions */}
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <Box sx={{ color: summaryType?.color, mr: 1 }}>
                            {summaryType?.icon}
                        </Box>
                        <Typography variant="h6">{summaryType?.label}</Typography>
                    </Box>

                    {summary && (
                        <Stack direction="row" spacing={1}>
                            <Tooltip title={copiedType === type ? 'Copied!' : 'Copy to clipboard'}>
                                <IconButton 
                                    size="small" 
                                    onClick={() => handleCopyToClipboard(type)}
                                    color={copiedType === type ? 'success' : 'default'}
                                >
                                    {copiedType === type ? <CheckCircle /> : <ContentCopy />}
                                </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Share">
                                <IconButton size="small" onClick={() => handleShare(type)}>
                                    <Share />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Regenerate">
                                <IconButton 
                                    size="small" 
                                    onClick={() => handleGenerateSummary(type, true)}
                                    disabled={isLoading}
                                >
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    )}
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {/* Summary content */}
                {isLoading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                        <CircularProgress size={40} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            AI đang tạo summary...
                        </Typography>
                    </Box>
                ) : summary ? (
                    <Box>
                        <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                            <CardContent>
                                <Typography 
                                    variant="body1" 
                                    sx={{ 
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: 1.8,
                                        fontSize: '15px'
                                    }}
                                >
                                    {summary.text}
                                </Typography>
                            </CardContent>
                        </Card>

                        {/* Metadata */}
                        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                            <Chip 
                                size="small" 
                                label={`Model: ${summary.model}`}
                                variant="outlined"
                            />
                            <Chip 
                                size="small" 
                                label={`Provider: ${summary.provider}`}
                                variant="outlined"
                                color="primary"
                            />
                            <Chip 
                                size="small" 
                                label={`Generated: ${new Date(summary.generatedAt).toLocaleString('vi-VN')}`}
                                variant="outlined"
                            />
                        </Stack>
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <AutoAwesome sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            Chưa có summary cho loại này
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Click nút bên dưới để AI tạo summary tự động
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AutoAwesome />}
                            onClick={() => handleGenerateSummary(type)}
                            disabled={isLoading}
                        >
                            Tạo {summaryType?.label}
                        </Button>
                    </Box>
                )}
            </Box>
        );
    };

    return (
        <Card sx={{ mt: 3 }}>
            <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h5" component="h2">
                        AI Summary
                    </Typography>
                    <Chip 
                        label="NEW" 
                        color="secondary" 
                        size="small" 
                        sx={{ ml: 1 }} 
                    />
                </Box>

                {/* Error alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Info banner */}
                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                        <strong>AI Summary:</strong> Sử dụng Google Gemini & OpenAI để tóm tắt video tự động.
                        {transcriptLength > 0 && ` Transcript: ${transcriptLength.toLocaleString()} ký tự.`}
                    </Typography>
                </Alert>

                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                        value={currentTab} 
                        onChange={(_, newValue) => setCurrentTab(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        {summaryTypes.map((type, index) => (
                            <Tab 
                                key={type.id}
                                label={type.label}
                                icon={summaries[type.id] ? <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} /> : undefined}
                                iconPosition="end"
                            />
                        ))}
                    </Tabs>
                </Box>

                {/* Tab panels */}
                {summaryTypes.map((type, index) => (
                    <TabPanel key={type.id} value={currentTab} index={index}>
                        {renderSummaryContent(type.id)}
                    </TabPanel>
                ))}
            </CardContent>
        </Card>
    );
};

export default SummaryPanel;
