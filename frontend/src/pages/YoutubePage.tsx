
import React, { useState, useEffect } from 'react';
import {
    Container, Box, Paper, Stack, SelectChangeEvent, TextField, Button,
    Typography, Alert, CircularProgress, FormControl, Select, MenuItem, Divider
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import YouTubeIcon from '@mui/icons-material/YouTube';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import TranslateIcon from '@mui/icons-material/Translate';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


import { transcribeYoutubeUrlApi } from '../services/fileApi';
import { TranscribeInitiateResponse } from '../types/fileTypes';

const YoutubePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [youtubeUrl, setYoutubeUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [successMessage, setSuccessMessage] = useState<string | null>(null);


    const [recognizeSpeakersOption, setRecognizeSpeakersOption] = useState<string>(location.state?.recognizeSpeakersOption || 'auto');
    const [languageOption, setLanguageOption] = useState<string>(location.state?.languageOption || 'auto');


    useEffect(() => {
        if (location.state?.exampleUrl) {
            setYoutubeUrl(location.state.exampleUrl);
        }
    }, [location.state]);


    const handleRecognizeSpeakersChange = (event: SelectChangeEvent<string>) => setRecognizeSpeakersOption(event.target.value as string);
    const handleLanguageOptionChange = (event: SelectChangeEvent<string>) => setLanguageOption(event.target.value as string);


    const handleTranscribe = async () => {
        if (!youtubeUrl) { setError('Please enter a YouTube URL.'); return; }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);



        const apiLangCode = languageOption === 'auto' ? 'auto-detect' : languageOption;


        const enableSpeaker = recognizeSpeakersOption === 'enable';

        console.log('Requesting YouTube transcription:', youtubeUrl, { languageCode: apiLangCode, enableSpeakerDiarization: enableSpeaker });

        try {

            const response: TranscribeInitiateResponse = await transcribeYoutubeUrlApi({
                youtubeUrl: youtubeUrl,
                languageCode: apiLangCode,
                enableSpeakerDiarization: enableSpeaker
            });

            if (response.success && response.jobId) {

                setSuccessMessage(response.message || 'YouTube transcription request sent successfully! Processing has started.');
                setYoutubeUrl('');

                setTimeout(() => {
                    navigate('/files');
                }, 2000);
            } else {

                setError(response.message || 'Failed to initiate YouTube transcription.');
            }
        } catch (err: any) {

            setError(err.message || 'An error occurred while sending the request.');
            console.error("Transcription request failed:", err);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <>
            { }
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ m: 2, color: 'text.secondary', alignSelf: 'flex-start' }}> Back to Home </Button>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', pt: 4 }}>
                <Container maxWidth="sm">
                    <Paper sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#2a2f4a' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                            <YouTubeIcon sx={{ color: 'red', fontSize: 30 }} />
                            <Typography variant="h5" sx={{ color: 'white' }}>Transcribe YouTube Video</Typography>
                        </Stack>

                        { }
                        <TextField
                            fullWidth variant="outlined" size="small" placeholder="Paste YouTube URL here"
                            value={youtubeUrl}
                            onChange={(e) => { setYoutubeUrl(e.target.value); setError(null); setSuccessMessage(null); }}
                            sx={{ mb: 2, input: { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#4a4e6a' }, '&:hover fieldset': { borderColor: '#6a6dff' }, '&.Mui-focused fieldset': { borderColor: '#6a6dff' } } }}
                        />

                        { }
                        <Box sx={{ my: 2, pt: 2, borderTop: '1px solid #4a4e6a' }}>
                            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>Transcription Options</Typography>
                            <Stack spacing={2}>
                                <FormControl fullWidth variant="outlined" size="small">
                                    <Stack direction="row" spacing={1}><TranslateIcon fontSize="small" /><Typography variant='body2'>Language</Typography></Stack>
                                    <Select value={languageOption} onChange={handleLanguageOptionChange} disabled={isLoading} sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#4a4e6a' }, bgcolor: '#1a1f2e' }} MenuProps={{ PaperProps: { sx: { bgcolor: '#2a2f4a', color: 'white' } } }} >
                                        <MenuItem value="auto">Auto Detect</MenuItem>
                                        <MenuItem value="vi-VN">Vietnamese</MenuItem>
                                        <MenuItem value="en-US">English (US)</MenuItem>
                                        { }
                                    </Select>
                                    <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary' }}>Auto-detect might spend more time</Typography>
                                </FormControl>
                            </Stack>
                        </Box>
                        { }

                        { }
                        <Button
                            variant="contained"
                            onClick={handleTranscribe}
                            disabled={isLoading || !youtubeUrl}
                            sx={{ mt: 2 }}
                            fullWidth
                        >
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Start Transcription'} { }
                        </Button>

                        { }
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                        { }
                        {successMessage && <Alert severity="success" sx={{ mt: 2 }}>{successMessage}</Alert>}
                        { }


                        {/* --- XÓA PHẦN HIỂN THỊ KẾT QUẢ TRỰC TIẾP ---
                         {transcriptionResult && (
                             <Paper sx={{ mt: 3, p: 2, textAlign: 'left', bgcolor: '#1a1f2e', color: '#a9b1c7' }}>
                                 <Typography variant="h6" gutterBottom>Transcription:</Typography>
                                 <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                     {transcriptionResult}
                                 </Typography>
                             </Paper>
                         )}
                         ---------------------------------------- */}
                    </Paper>
                </Container>
            </Box>
        </>
    );
};

export default YoutubePage;