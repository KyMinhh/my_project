import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import BurnIcon from '@mui/icons-material/Whatshot';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import SubtitlesIcon from '@mui/icons-material/Subtitles';
import { subtitleApi, SubtitleSegment } from '../services/subtitleApi';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'th', name: 'Thai (ไทย)' },
  { code: 'original', name: 'Original Language' },
];

interface SubtitleExporterProps {
  open: boolean;
  onClose: () => void;
  segments: SubtitleSegment[];
  videoPath?: string;
  transcripts?: { [language: string]: SubtitleSegment[] };
}

const SubtitleExporter: React.FC<SubtitleExporterProps> = ({
  open,
  onClose,
  segments,
  videoPath,
  transcripts,
}) => {
  const [format, setFormat] = useState<'srt' | 'vtt'>('srt');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedSubtitles, setGeneratedSubtitles] = useState<{
    [key: string]: { srt: string; vtt: string };
  } | null>(null);
  const [burnedVideoPath, setBurnedVideoPath] = useState<string | null>(null);
  const [embeddedVideoPath, setEmbeddedVideoPath] = useState<string | null>(null);
  const [directBurnedVideoPath, setDirectBurnedVideoPath] = useState<string | null>(null);

  const [burnOptions, setBurnOptions] = useState({
    fontName: 'Arial',
    fontSize: 24,
    fontColor: 'white',
    backgroundColor: 'black@0.5',
    marginV: 20,
    outline: 2,
    shadow: 1,
  });

  const handleGenerateSingle = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await subtitleApi.generateSubtitles({
        segments,
        format,
        language,
      });

      setSuccess(`Subtitle file generated successfully!`);
      downloadSubtitleFile(response.subtitlePath);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate subtitle');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMulti = async () => {
    if (!transcripts) {
      setError('No transcripts available for multi-language generation');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await subtitleApi.generateMultiLanguageSubtitles(transcripts);
      setGeneratedSubtitles(response.subtitles);
      setSuccess(`Generated subtitles for ${Object.keys(response.subtitles).length} languages!`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate multi-language subtitles');
    } finally {
      setLoading(false);
    }
  };

  const handleBurnSubtitles = async () => {
    if (!videoPath || !generatedSubtitles || !generatedSubtitles[language]) {
      setError('Please generate subtitles first and ensure video is available');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await subtitleApi.burnSubtitles({
        videoPath,
        subtitlePath: generatedSubtitles[language].srt,
        options: burnOptions,
      });

      setBurnedVideoPath(response.videoPath);
      setSuccess('Subtitles burned into video successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to burn subtitles');
    } finally {
      setLoading(false);
    }
  };

  const handleEmbedSubtitles = async () => {
    if (!videoPath || !generatedSubtitles) {
      setError('Please generate subtitles first and ensure video is available');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const subtitlePaths: { [key: string]: string } = {};
      Object.entries(generatedSubtitles).forEach(([lang, paths]) => {
        subtitlePaths[lang] = paths.srt;
      });

      const response = await subtitleApi.embedSubtitles({
        videoPath,
        subtitles: subtitlePaths,
        defaultLanguage: language,
      });

      setEmbeddedVideoPath(response.videoPath);
      setSuccess(
        `Embedded subtitles for ${response.languages.join(', ')} into video successfully!`
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to embed subtitles');
    } finally {
      setLoading(false);
    }
  };

  const handleBurnSubtitlesDirect = async () => {
    if (!videoPath) {
      setError('Video path is required');
      return;
    }

    const currentSegments = transcripts?.[language] || segments;
    
    if (!currentSegments || currentSegments.length === 0) {
      setError('No segments available for selected language');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await subtitleApi.burnSubtitlesDirect({
        videoPath,
        segments: currentSegments,
        language,
        format,
        options: {
          fontName: burnOptions.fontName,
          fontSize: burnOptions.fontSize,
          outline: burnOptions.outline,
          shadow: burnOptions.shadow,
          marginV: burnOptions.marginV,
        },
      });

      setDirectBurnedVideoPath(response.videoPath);
      setSuccess(`Direct burn completed for ${language}! Video ready to download.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to burn subtitles directly');
    } finally {
      setLoading(false);
    }
  };

  const downloadSubtitleFile = async (subtitlePath: string) => {
    try {
      const blob = await subtitleApi.downloadSubtitle(subtitlePath);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = subtitlePath.split('/').pop() || 'subtitle';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError('Failed to download subtitle file');
    }
  };

  const downloadVideo = (videoPath: string) => {
    const serverUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001';
    const url = `${serverUrl}${videoPath}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SubtitlesIcon />
          <Typography variant="h6">Export Subtitles & Video</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">
              Generate Subtitles
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'srt' | 'vtt')}
                  label="Format"
                >
                  <MenuItem value="srt">SRT (Recommended for YouTube, VLC)</MenuItem>
                  <MenuItem value="vtt">VTT (For HTML5 Web Players)</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  label="Language"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleGenerateSingle}
                  disabled={loading}
                  fullWidth
                >
                  Generate & Download
                </Button>

                {transcripts && (
                  <Button
                    variant="outlined"
                    onClick={handleGenerateMulti}
                    disabled={loading}
                    fullWidth
                  >
                    Generate All Languages
                  </Button>
                )}
              </Stack>

              {generatedSubtitles && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Generated Subtitles:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Object.entries(generatedSubtitles).map(([lang, paths]) => (
                      <Chip
                        key={lang}
                        label={lang}
                        color="primary"
                        variant="outlined"
                        onClick={() => downloadSubtitleFile(paths.srt)}
                        onDelete={() => downloadSubtitleFile(paths.vtt)}
                        deleteIcon={
                          <Tooltip title="Download VTT">
                            <DownloadIcon fontSize="small" />
                          </Tooltip>
                        }
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {videoPath && (
          <>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Burn Subtitles (Hard-coded)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Permanently burn subtitles into video. This creates a new video file with
                    subtitles that cannot be turned off.
                  </Typography>

                  <TextField
                    label="Font Name"
                    value={burnOptions.fontName}
                    onChange={(e) =>
                      setBurnOptions({ ...burnOptions, fontName: e.target.value })
                    }
                    fullWidth
                  />

                  <TextField
                    label="Font Size"
                    type="number"
                    value={burnOptions.fontSize}
                    onChange={(e) =>
                      setBurnOptions({ ...burnOptions, fontSize: parseInt(e.target.value) })
                    }
                    fullWidth
                  />

                  <TextField
                    label="Font Color"
                    value={burnOptions.fontColor}
                    onChange={(e) =>
                      setBurnOptions({ ...burnOptions, fontColor: e.target.value })
                    }
                    placeholder="white, #FFFFFF"
                    fullWidth
                  />

                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<BurnIcon />}
                    onClick={handleBurnSubtitles}
                    disabled={loading || !generatedSubtitles}
                    fullWidth
                  >
                    Burn Subtitles into Video
                  </Button>

                  {burnedVideoPath && (
                    <Button
                      variant="outlined"
                      startIcon={<VideoFileIcon />}
                      onClick={() => downloadVideo(burnedVideoPath)}
                    >
                      Download Burned Video
                    </Button>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="bold">
                  🚀 Burn Subtitles Directly (1-Step)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Alert severity="info">
                    <strong>New Feature:</strong> Burn translated subtitles directly without generating files first.
                    Select a language and burn in one step!
                  </Alert>

                  <Typography variant="body2" color="text.secondary">
                    This method automatically creates subtitle file from translated segments and burns
                    them into video in one API call. Perfect for quick exports!
                  </Typography>

                  <TextField
                    label="Font Name"
                    value={burnOptions.fontName}
                    onChange={(e) =>
                      setBurnOptions({ ...burnOptions, fontName: e.target.value })
                    }
                    fullWidth
                    size="small"
                  />

                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Font Size"
                      type="number"
                      value={burnOptions.fontSize}
                      onChange={(e) =>
                        setBurnOptions({ ...burnOptions, fontSize: parseInt(e.target.value) })
                      }
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Outline"
                      type="number"
                      value={burnOptions.outline}
                      onChange={(e) =>
                        setBurnOptions({ ...burnOptions, outline: parseInt(e.target.value) })
                      }
                      fullWidth
                      size="small"
                    />
                  </Stack>

                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<BurnIcon />}
                    onClick={handleBurnSubtitlesDirect}
                    disabled={loading}
                    fullWidth
                    size="large"
                  >
                    Burn {language.toUpperCase()} Subtitles (Direct)
                  </Button>

                  {directBurnedVideoPath && (
                    <Alert severity="success">
                      <Typography variant="body2" gutterBottom>
                        Video with {language} subtitles is ready!
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<VideoFileIcon />}
                        onClick={() => downloadVideo(directBurnedVideoPath)}
                        size="small"
                      >
                        Download Video
                      </Button>
                    </Alert>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Embed Subtitles (Soft Subtitles)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Embed subtitles as separate tracks. Users can turn subtitles on/off and
                    switch between languages in compatible video players.
                  </Typography>

                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<SubtitlesIcon />}
                    onClick={handleEmbedSubtitles}
                    disabled={loading || !generatedSubtitles}
                    fullWidth
                  >
                    Embed Multi-Language Subtitles
                  </Button>

                  {embeddedVideoPath && (
                    <Button
                      variant="outlined"
                      startIcon={<VideoFileIcon />}
                      onClick={() => downloadVideo(embeddedVideoPath)}
                    >
                      Download Video with Embedded Subtitles
                    </Button>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubtitleExporter;
