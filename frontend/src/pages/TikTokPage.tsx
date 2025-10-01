import React, { useState, useEffect } from 'react';
import {
    Container, Box, Paper, Stack, SelectChangeEvent, TextField, Button,
    Typography, Alert, CircularProgress, FormControl, Select, MenuItem
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MusicVideoIcon from '@mui/icons-material/MusicVideo';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import TranslateIcon from '@mui/icons-material/Translate';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


import { transcribeTiktokUrlApi } from '../services/fileApi';
import { TranscribeInitiateResponse } from '../types/fileTypes';

const TikTokPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [tiktokUrl, setTiktokUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [successMessage, setSuccessMessage] = useState<string | null>(null);


    const [recognizeSpeakersOption, setRecognizeSpeakersOption] = useState<string>(location.state?.recognizeSpeakersOption || 'auto');
    const [languageOption, setLanguageOption] = useState<string>(location.state?.languageOption || 'auto');
    const handleRecognizeSpeakersChange = (event: SelectChangeEvent<string>) => setRecognizeSpeakersOption(event.target.value as string);
    const handleLanguageOptionChange = (event: SelectChangeEvent<string>) => setLanguageOption(event.target.value as string);


    const handleTranscribe = async () => {
        if (!tiktokUrl) { setError('Please enter a TikTok URL.'); return; }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);


        const apiLangCode = languageOption === 'auto' ? 'auto-detect' : languageOption;
        const enableSpeaker = recognizeSpeakersOption === 'enable';

        console.log('Requesting TikTok transcription:', tiktokUrl, { languageCode: apiLangCode, enableSpeakerDiarization: enableSpeaker });

        try {

            const response: TranscribeInitiateResponse = await transcribeTiktokUrlApi({
                tiktokUrl: tiktokUrl,
                languageCode: apiLangCode,
                enableSpeakerDiarization: enableSpeaker
            });

            if (response.success && response.jobId) {

                setSuccessMessage(response.message || 'TikTok transcription request sent! Processing started.');
                setTiktokUrl('');

                setTimeout(() => {
                    navigate('/files');
                }, 2000);
            } else {

                setError(response.message || 'Failed to initiate TikTok transcription.');
            }
        } catch (err: any) {

            setError(err.message || 'An error occurred.');
            console.error("Transcription request failed:", err);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <>
            { }
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ m: 2, color: 'text.secondary', alignSelf: 'flex-start' }}>
                Back to Home
            </Button>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', pt: 4, px: 2 }}>
                <Container maxWidth="sm">
                    <Paper sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#2a2f4a' }}>
                        { }
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                            <MusicVideoIcon sx={{ color: 'white', fontSize: 30 }} />
                            <Typography variant="h5" sx={{ color: 'white' }}>Transcribe TikTok Video</Typography>
                        </Stack>

                        { }
                        <TextField
                            fullWidth variant="outlined" size="small" placeholder="Paste TikTok URL here"
                            value={tiktokUrl}
                            onChange={(e) => { setTiktokUrl(e.target.value); setError(null); setSuccessMessage(null); }}
                            sx={{ mb: 2, input: { color: 'white' }, }}
                        />

                        { }
                        <Box sx={{ my: 2, pt: 2, borderTop: '1px solid #4a4e6a' }}>
                            { }
                            { }
                            <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <TranslateIcon fontSize="small" /> <Typography variant='body2'>Language</Typography>
                                </Stack>
                                <Select value={languageOption} onChange={handleLanguageOptionChange} disabled={isLoading}  >
                                    <MenuItem value="auto">Auto Detect</MenuItem>
                                    <MenuItem value="vi-VN">Vietnamese</MenuItem>
                                    <MenuItem value="en-US">English (US)</MenuItem>
                                    { }
                                </Select>
                                <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary' }}>Auto-detect might spend more time</Typography>
                            </FormControl>
                            { }
                        </Box>
                        { }

                        { }
                        <Button
                            variant="contained" onClick={handleTranscribe} disabled={isLoading || !tiktokUrl}
                            sx={{ mt: 2 }} fullWidth
                        >
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Start Transcription'}
                        </Button>

                        { }
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                        { }
                        {successMessage && !isLoading && <Alert severity="success" sx={{ mt: 2 }}>{successMessage}</Alert>}

                        { }
                        { }

                    </Paper>
                </Container>
            </Box>
        </>
    );
};






export default TikTokPage;