import React from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import {
    Paper, Typography, Button, Box, Stack, CircularProgress,
    Checkbox, FormControlLabel, Divider,
    FormControl, Select, MenuItem, SelectChangeEvent,
    Skeleton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from 'react-i18next';


interface FileUploadZoneProps {
    onDrop: (acceptedFiles: FileWithPath[]) => void;
    selectedFile: FileWithPath | null;
    isLoading: boolean;
    isLoadingDuration: boolean;
    handleConvert: () => void;
    fileDuration: number | null;
    estimatedTime: number | null;
    includeOptions: boolean;
    handleOptionsChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    recognizeSpeakersValue: string;
    handleRecognizeSpeakersChange: (event: SelectChangeEvent<string>) => void;
    languageOptionValue: string;
    handleLanguageOptionChange: (event: SelectChangeEvent<string>) => void;
}




const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.max(0, Math.floor(Math.log(bytes) / Math.log(k)));
    if (i >= sizes.length) return parseFloat((bytes / Math.pow(k, sizes.length - 1)).toFixed(dm)) + ' ' + sizes[sizes.length - 1];
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number | null): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || !isFinite(seconds)) return '-';
    const value = Math.round(seconds);
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    const parts = [];
    if (h > 0) parts.push(h.toString().padStart(2, '0'));
    parts.push(m.toString().padStart(2, '0'));
    parts.push(s.toString().padStart(2, '0'));
    return parts.join(':');
}



const FileUploadZone: React.FC<FileUploadZoneProps> = ({
    onDrop,
    selectedFile,
    isLoading,
    isLoadingDuration,
    handleConvert,
    fileDuration,
    estimatedTime,
    includeOptions,
    handleOptionsChange,
    recognizeSpeakersValue,
    handleRecognizeSpeakersChange,
    languageOptionValue,
    handleLanguageOptionChange
}) => {
    const { t } = useTranslation();
    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            'video/*': ['.mp4', '.mpeg', '.mov'],
            'audio/*': ['.mp3', '.mpga', '.m4a', '.wav', '.ogg']
        },
        maxFiles: 1,
        noClick: true,
        noKeyboard: true,
    });

    return (
        <Paper
            {...getRootProps()}
            sx={{
                p: { xs: 2, sm: 4 },
                textAlign: 'center',
                border: `2px dashed ${isDragActive ? '#6a6dff' : '#4a4e6a'}`,
                backgroundColor: '#2a2f4a',
                cursor: selectedFile ? 'default' : 'pointer',
                color: '#a9b1c7',
                transition: 'border .24s ease-in-out',
                '&:hover': {
                    borderColor: !selectedFile ? '#6a6dff' : '#4a4e6a',
                },
                mx: 'auto',
                maxWidth: 600,
                mb: 3,
            }}
        >
            <input {...getInputProps()} />

            {!selectedFile ? (

                <>
                    <CloudUploadIcon sx={{ fontSize: 60, color: '#6a6dff', mb: 2 }} />
                    {isDragActive ? (<Typography>{t('Drop the file here ...')}</Typography>)
                        : (<Typography>{t('Click button below or drag and drop')}</Typography>)}
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        mp3, mp4, mpeg, mpga, m4a, wav, ogg
                    </Typography>
                    <Button variant="contained" onClick={open} sx={{ mt: 2 }} disabled={isLoading}> { }
                        {t('Choose File')}
                    </Button>
                </>
            ) : (

                <Box sx={{ textAlign: 'left' }}>
                    { }
                    <Typography variant="h6" sx={{ color: 'white', mb: 1, wordBreak: 'break-all' }}>
                        {selectedFile.name}
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mb: 1 }} flexWrap="wrap">
                        <Typography variant="body2">{t('Size')}: {formatBytes(selectedFile.size)}</Typography>
                        { }
                        <Typography variant="body2">
                            {t('Duration')}: {isLoadingDuration ? <Skeleton variant="text" width={50} sx={{ display: 'inline-block', bgcolor: 'grey.700' }} /> : formatDuration(fileDuration)}
                        </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        {t('Estimated time')}: {isLoadingDuration ? <Skeleton variant="text" width={50} sx={{ display: 'inline-block', bgcolor: 'grey.700' }} /> : formatDuration(estimatedTime)}
                    </Typography>
                    { }

                    { }
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
                        <Button
                            variant="contained" onClick={handleConvert}

                            disabled={isLoading || isLoadingDuration}
                            sx={{ bgcolor: '#6a6dff', '&:hover': { bgcolor: '#5a5cdd' }, flexShrink: 0 }}
                            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null} >
                            {isLoading ? t('Converting...') : t('Convert')}
                        </Button>
                        <FormControlLabel
                            control={<Checkbox checked={includeOptions} onChange={handleOptionsChange} size="small"
                                sx={{ color: '#a9b1c7', '&.Mui-checked': { color: '#6a6dff' } }}

                                disabled={isLoading || isLoadingDuration} />}
                            label={<Typography variant="body2">{t('Convert Options')}</Typography>}
                            sx={{ color: '#a9b1c7', mr: 'auto' }} />
                    </Stack>

                    { }
                    {includeOptions && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #4a4e6a' }}>
                            <Stack spacing={1}>
                                { }
                                <FormControl fullWidth variant="outlined" size="small">
                                    <Stack direction="row" spacing={1}><TranslateIcon fontSize="small" /><Typography variant='body2'>{t('Language')}</Typography></Stack>
                                    <Select
                                        value={languageOptionValue} onChange={handleLanguageOptionChange}

                                        disabled={isLoading || isLoadingDuration}
                                        sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#4a4e6a' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6dff' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6dff' }, '.MuiSvgIcon-root': { color: 'white' }, bgcolor: '#1a1f2e' }}
                                        MenuProps={{ PaperProps: { sx: { bgcolor: '#2a2f4a', color: 'white' } } }} >
                                        <MenuItem value="auto">{t('Auto Detect')}</MenuItem>
                                        <MenuItem value="vi-VN">{t('Vietnamese')}</MenuItem>
                                        <MenuItem value="en-US">{t('English (US)')}</MenuItem>
                                    </Select>
                                    <Typography variant="caption" sx={{ mt: 0.5 }}>{t('will spend more time')}</Typography>
                                </FormControl>
                            </Stack>
                        </Box>
                    )}
                </Box>
            )}
        </Paper>
    );
};

export default FileUploadZone;
