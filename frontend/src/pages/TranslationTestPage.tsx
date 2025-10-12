import React, { useState } from 'react';
import {
    Container,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Stack,
    Box,
    Paper,
    Divider
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { translateJobApi } from '../services/fileApi';
import LanguageSelector, { getLanguageName } from '../components/LanguageSelector';

const TranslationTestPage: React.FC = () => {
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [message, setMessage] = useState<{ type: 'error' | 'warning' | 'success', text: string } | null>(null);
    const [testJobId, setTestJobId] = useState<string>('');
    const [translationResult, setTranslationResult] = useState<any>(null);

    const handleTestTranslation = async () => {
        if (!testJobId.trim()) {
            setMessage({ type: 'error', text: 'Vui lòng nhập Job ID để test!' });
            return;
        }

        setIsTranslating(true);
        setMessage(null);
        setTranslationResult(null);

        try {
            const response = await translateJobApi(testJobId.trim(), selectedLanguage);
            if (response.success && response.data) {
                setMessage({ 
                    type: 'success', 
                    text: `Dịch thành công sang ${getLanguageName(selectedLanguage)}! Tìm thấy ${response.data.translatedSegments.length} đoạn dịch.` 
                });
                setTranslationResult(response.data);
            } else {
                setMessage({ type: 'error', text: response.message || 'Dịch thất bại!' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Lỗi khi gọi API dịch!' });
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Stack spacing={3}>
                    <Box sx={{ textAlign: 'center' }}>
                        <TranslateIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                        <Typography variant="h4" gutterBottom>
                            Test Chức Năng Dịch Thuật
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Trang test để kiểm tra API dịch transcript
                        </Typography>
                    </Box>

                    <Divider />

                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                1. Nhập Job ID để test
                            </Typography>
                            <input
                                type="text"
                                placeholder="Nhập Job ID (ví dụ: 60f7b3b3b3b3b3b3b3b3b3b3)"
                                value={testJobId}
                                onChange={(e) => setTestJobId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '16px'
                                }}
                            />
                        </Box>

                        <Box>
                            <Typography variant="h6" gutterBottom>
                                2. Chọn ngôn ngữ đích
                            </Typography>
                            <LanguageSelector
                                value={selectedLanguage}
                                onChange={setSelectedLanguage}
                                disabled={isTranslating}
                                label="Ngôn ngữ đích"
                                size="medium"
                            />
                        </Box>

                        <Box>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={isTranslating ? <CircularProgress size={20} /> : <TranslateIcon />}
                                onClick={handleTestTranslation}
                                disabled={isTranslating || !testJobId.trim()}
                                fullWidth
                            >
                                {isTranslating ? 'Đang dịch...' : 'Test Dịch Thuật'}
                            </Button>
                        </Box>

                        {message && (
                            <Alert severity={message.type}>
                                {message.text}
                            </Alert>
                        )}

                        {translationResult && (
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Kết quả dịch:
                                </Typography>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Job ID: {translationResult.jobId}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Ngôn ngữ: {getLanguageName(translationResult.targetLang)} ({translationResult.targetLang})
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Số đoạn dịch: {translationResult.translatedSegments.length}
                                    </Typography>
                                    
                                    <Divider sx={{ my: 2 }} />
                                    
                                    <Typography variant="subtitle2" gutterBottom>
                                        Mẫu đoạn dịch đầu tiên:
                                    </Typography>
                                    {translationResult.translatedSegments.length > 0 && (
                                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #ddd' }}>
                                            <Typography variant="body2" color="primary.main" fontWeight={500}>
                                                Bản dịch: {translationResult.translatedSegments[0].translatedText}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                Gốc: {translationResult.translatedSegments[0].originalText}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Thời gian: {translationResult.translatedSegments[0].start}s - {translationResult.translatedSegments[0].end}s
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </Box>
                        )}
                    </Stack>

                    <Divider />

                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Hướng dẫn sử dụng:
                        </Typography>
                        <Stack spacing={1}>
                            <Typography variant="body2">
                                • Nhập Job ID của một transcript đã được xử lý thành công
                            </Typography>
                            <Typography variant="body2">
                                • Chọn ngôn ngữ đích muốn dịch sang
                            </Typography>
                            <Typography variant="body2">
                                • Click "Test Dịch Thuật" để gọi API
                            </Typography>
                            <Typography variant="body2">
                                • Kiểm tra kết quả trả về từ backend
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>
            </Paper>
        </Container>
    );
};

export default TranslationTestPage;