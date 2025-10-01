import React, { useCallback, useState, useEffect, ChangeEvent } from 'react';
import {
    Container, Box, Paper, Stack, SelectChangeEvent, Button, 
    Typography, Alert, CircularProgress, Chip 
} from '@mui/material';
import { FileWithPath } from 'react-dropzone';
import { useNavigate } from 'react-router-dom'; 
import YouTubeIcon from '@mui/icons-material/YouTube';
import MusicVideoIcon from '@mui/icons-material/MusicVideo';

import Header from '../components/Header';
import Footer from '../components/Footer'; 
import FileUploadZone from '../components/FileUploadZone';
import { transcribeVideoFileApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';





const formatDuration = (seconds: number | null): string => {
    if (seconds === null || isNaN(seconds) || !isFinite(seconds)) return '-';
    const value = Math.round(seconds); const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60); const s = value % 60;
    const parts = []; if (h > 0) parts.push(h.toString().padStart(2, '0'));
    parts.push(m.toString().padStart(2, '0')); parts.push(s.toString().padStart(2, '0'));
    return parts.join(':');
};




const getMediaDuration = (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
        if (!file || (!file.type.startsWith('video/') && !file.type.startsWith('audio/'))) { resolve(null); return; }
        try {
            const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
            media.preload = 'metadata';
            const objectUrl = window.URL.createObjectURL(file);
            const timeoutId = setTimeout(() => { console.warn("Timeout waiting for metadata."); window.URL.revokeObjectURL(objectUrl); resolve(null); }, 5000);
            media.onloadedmetadata = () => { clearTimeout(timeoutId); window.URL.revokeObjectURL(objectUrl); const duration = media.duration; resolve(isFinite(duration) ? duration : null); };
            media.onerror = (e) => { clearTimeout(timeoutId); console.error("Error loading metadata:", e); window.URL.revokeObjectURL(objectUrl); resolve(null); };
            media.src = objectUrl;
        } catch (error) { console.error("Error creating object URL:", error); resolve(null); }
    });
};



const HomePage: React.FC = () => {
    
    const navigate = useNavigate();
    

    
    const [file, setFile] = useState<FileWithPath | null>(null);
    const [fileDuration, setFileDuration] = useState<number | null>(null);
    const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isCalculatingDuration, setIsCalculatingDuration] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null); 
    const [includeConvertOptions, setIncludeConvertOptions] = useState<boolean>(false);
    const [recognizeSpeakersOption, setRecognizeSpeakersOption] = useState<string>('auto');
    const [languageOption, setLanguageOption] = useState<string>('auto');


    
    const handleIncludeOptionsChange = (event: ChangeEvent<HTMLInputElement>) => setIncludeConvertOptions(event.target.checked);
    const handleRecognizeSpeakersChange = (event: SelectChangeEvent<string>) => setRecognizeSpeakersOption(event.target.value as string);
    const handleLanguageOptionChange = (event: SelectChangeEvent<string>) => setLanguageOption(event.target.value as string);

    const resetFileAndOptions = () => {
        setFile(null); setFileDuration(null); setEstimatedTime(null);
        setIncludeConvertOptions(false); setRecognizeSpeakersOption('auto');
        
        setError(null); setTranscriptionResult(null); setIsLoading(false); setIsCalculatingDuration(false);
    }

    const handleDrop = useCallback(async (acceptedFiles: FileWithPath[]) => {
        if (acceptedFiles.length > 0) {
            resetFileAndOptions();
            const selectedFile = acceptedFiles[0];
            setFile(selectedFile);
            setIsCalculatingDuration(true);
            const duration = await getMediaDuration(selectedFile);
            setFileDuration(duration);
            if (duration !== null) setEstimatedTime(duration / 5);
            setIsCalculatingDuration(false);
        }
    }, []); 

    
    const handleConvert = async () => {
        if (!file) return;
        setIsLoading(true); setError(null);

        
        const formData = new FormData();
        formData.append('video', file);
        let effectiveLanguageCode = languageOption === 'auto' ? 'auto-detect' : languageOption;
        formData.append('languageCode', effectiveLanguageCode);
        if (includeConvertOptions) {
            if (recognizeSpeakersOption === 'enable') formData.append('enableSpeakerDiarization', 'true');
            
        }
        console.log('Sending FormData with keys:', Array.from(formData.keys()));
        

        try {
            
            
            const response = await transcribeVideoFileApi(formData);

            
            
            

            
            
            
            
            
            console.log("API call successful (response.ok was true), backend response:", response);

            
            if (response && response.success) { 
                console.log("Request accepted by backend, navigating...");
                navigate('/files');
            } else {
                
                setError(response?.message || 'Backend indicated an issue.');
                setIsLoading(false);
            }
            

        } catch (err: any) {
            
            console.error("Error calling API or processing response:", err);
            setError(err.message || 'An error occurred.');
            setIsLoading(false);
        }
    };

    
    const handleYoutubeNavigate = () => {
        navigate('/transcribe/youtube', { state: { languageOption, recognizeSpeakersOption } });
    };
    const handleTikTokNavigate = () => {
        navigate('/transcribe/tiktok', { state: { languageOption, recognizeSpeakersOption } });
    };
    const handleExampleClick = () => {
        if (file) { resetFileAndOptions(); } 
        navigate('/transcript/681e1ca746dbe3fb56b3b37f', { state: { languageOption, recognizeSpeakersOption } });
    };
    const handleExampleClick1 = () => {
        if (file) { resetFileAndOptions(); } 
        navigate('transcript/6837225ecf6f6ed3882e68f0', { state: { languageOption, recognizeSpeakersOption } });
    };
    

    return (
        <>
            <Header language={languageOption} onLanguageChange={handleLanguageOptionChange} />
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: { xs: 2, sm: 4 }, px: 2, }}>
                <Container maxWidth="md" sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" component="h1" gutterBottom sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '2.5rem', sm: '3.75rem' } }}> Transcribe Video to Text</Typography>
                    <Typography variant="h6" sx={{ color: '#a9b1c7', mb: 4, fontSize: { xs: '1rem', sm: '1.25rem' } }}> App-powered transcription... </Typography>

                    <FileUploadZone
                        onDrop={handleDrop} selectedFile={file} isLoading={isLoading} isLoadingDuration={isCalculatingDuration}
                        handleConvert={handleConvert} fileDuration={fileDuration} estimatedTime={estimatedTime}
                        includeOptions={includeConvertOptions} handleOptionsChange={handleIncludeOptionsChange}
                        recognizeSpeakersValue={recognizeSpeakersOption} handleRecognizeSpeakersChange={handleRecognizeSpeakersChange}
                        languageOptionValue={languageOption} handleLanguageOptionChange={handleLanguageOptionChange}
                    />

                    {}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                        <Paper onClick={handleYoutubeNavigate} elevation={3} sx={{ p: 0, flexGrow: 1, bgcolor: '#2a2f4a', display: 'flex', alignItems: 'center', cursor: 'pointer', overflow: 'hidden', borderRadius: 2, transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out', '&:hover': { bgcolor: '#3a3f5a', transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' } }} >
                            <Box sx={{ bgcolor: '#1a1f2e', p: 2 }}><YouTubeIcon sx={{ color: 'red', fontSize: { xs: 24, sm: 30 } }} /></Box>
                            <Typography variant="body1" sx={{ color: 'white', flexGrow: 1, textAlign: 'center', p: 2, fontWeight: 500 }}> Transcribe Youtube Video </Typography>
                        </Paper>
                        <Paper onClick={handleTikTokNavigate} elevation={3} sx={{ p: 0, flexGrow: 1, bgcolor: '#2a2f4a', display: 'flex', alignItems: 'center', cursor: 'pointer', overflow: 'hidden', borderRadius: 2, transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out', '&:hover': { bgcolor: '#3a3f5a', transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' } }} >
                            <Box sx={{ bgcolor: '#1a1f2e', p: 2 }}><MusicVideoIcon sx={{ color: 'white', fontSize: { xs: 24, sm: 30 } }} /></Box>
                            <Typography variant="body1" sx={{ color: 'white', flexGrow: 1, textAlign: 'center', p: 2, fontWeight: 500 }}> Transcribe TikTok Video </Typography>
                        </Paper>
                    </Stack>

                    {}
                    <Box sx={{ mt: 4, mb: 4 }}>
                        <Stack direction="row" spacing={{ xs: 1, sm: 2 }} justifyContent="center" alignItems="center" flexWrap="wrap" sx={{ color: '#a9b1c7' }}>
                            <Typography variant="body2" sx={{ mr: 1, mb: { xs: 1, sm: 0 } }}>Example:</Typography>
                            <Chip label="Hello Song for Children..." variant="outlined" onClick={() => handleExampleClick()} />
                            <Chip label="Toi di hoc..." variant="outlined" onClick={() => handleExampleClick1()} />
                        </Stack>
                    </Box>

                    {}
                    {error && !isLoading && <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>{error}</Alert>}
                    {}

                </Container>
            </Box>
            <Footer /> 
        </>
    );
};

export default HomePage;