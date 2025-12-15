import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { AutoAwesome, TrendingUp } from '@mui/icons-material';
import { generateSmartClips, GenerateClipsRequest } from '../services/clipApi';

interface GenerateClipsButtonProps {
  jobId: string;
  onSuccess?: (clipsCount: number) => void;
  disabled?: boolean;
}

const GenerateClipsButton: React.FC<GenerateClipsButtonProps> = ({ 
  jobId, 
  onSuccess,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [maxClips, setMaxClips] = useState<number>(5);
  const [minDuration, setMinDuration] = useState<number>(15);
  const [maxDuration, setMaxDuration] = useState<number>(60);
  const [languages, setLanguages] = useState<string[]>(['vi', 'en']);

  const handleOpen = () => {
    setOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
    }
  };

  const handleLanguageChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setLanguages(typeof value === 'string' ? value.split(',') : value);
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const options: GenerateClipsRequest = {
        maxClips,
        minDuration,
        maxDuration,
        languages
      };

      const response = await generateSmartClips(jobId, options);

      setSuccess(`✅ Successfully generated ${response.data.clips.length} smart clips! Processing videos in background...`);
      setLoading(false);

      // Notify parent component
      if (onSuccess) {
        onSuccess(response.data.clips.length);
      }

      // Close dialog after 2 seconds
      setTimeout(() => {
        setOpen(false);
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to generate clips');
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<AutoAwesome />}
        onClick={handleOpen}
        disabled={disabled}
        sx={{
          background: 'linear-gradient(45deg, #FF6B6B 30%, #FFE66D 90%)',
          boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
          color: 'white',
          fontWeight: 'bold',
          '&:hover': {
            background: 'linear-gradient(45deg, #FF8E53 30%, #FE6B8B 90%)',
          }
        }}
      >
        <TrendingUp sx={{ mr: 1 }} />
        Generate Smart Clips
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesome color="primary" />
            <Typography variant="h6">Generate Smart Viral Clips</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Info Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
              AI will analyze your video transcript and automatically create viral-worthy clips optimized for social media platforms.
            </Alert>

            {/* Max Clips */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="Number of Clips"
                type="number"
                value={maxClips}
                onChange={(e) => setMaxClips(Number(e.target.value))}
                inputProps={{ min: 1, max: 10 }}
                helperText="How many clips to generate (1-10)"
                disabled={loading}
              />
            </FormControl>

            {/* Duration Range */}
            <Box display="flex" gap={2} mb={2}>
              <FormControl fullWidth>
                <TextField
                  label="Min Duration (seconds)"
                  type="number"
                  value={minDuration}
                  onChange={(e) => setMinDuration(Number(e.target.value))}
                  inputProps={{ min: 5, max: 60 }}
                  disabled={loading}
                />
              </FormControl>
              <FormControl fullWidth>
                <TextField
                  label="Max Duration (seconds)"
                  type="number"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  inputProps={{ min: 15, max: 120 }}
                  disabled={loading}
                />
              </FormControl>
            </Box>

            {/* Languages */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Subtitle Languages</InputLabel>
              <Select
                multiple
                value={languages}
                onChange={handleLanguageChange}
                disabled={loading}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value.toUpperCase()} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="vi">Vietnamese (VI)</MenuItem>
                <MenuItem value="en">English (EN)</MenuItem>
                <MenuItem value="ko">Korean (KO)</MenuItem>
                <MenuItem value="ja">Japanese (JA)</MenuItem>
                <MenuItem value="zh">Chinese (ZH)</MenuItem>
              </Select>
            </FormControl>

            {/* Features List */}
            <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid #eee' }}>
              <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                ✨ Smart Features:
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                • 🤖 AI viral moment detection<br />
                • 📊 Viral score (0-100) for each clip<br />
                • 🎯 Platform recommendations (TikTok, Shorts, Reels)<br />
                • 📱 Auto crop to 9:16 vertical format<br />
                • 🌍 Multi-language subtitles<br />
                • #️⃣ Auto-generated hashtags<br />
                • 💬 Quotable moment extraction
              </Typography>
            </Box>

            {/* Loading */}
            {loading && (
              <Box sx={{ mt: 2 }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <CircularProgress size={40} />
                  <Box flexGrow={1}>
                    <Typography variant="body1" fontWeight={600} gutterBottom>
                      🤖 AI is analyzing your video...
                    </Typography>
                    <LinearProgress />
                  </Box>
                </Box>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Stage 1/2:</strong> Detecting viral moments with Gemini AI
                  </Typography>
                  <Typography variant="caption">
                    • Analyzing emotional peaks<br />
                    • Scoring viral potential<br />
                    • Generating hashtags<br />
                    • Estimated time: 30-60 seconds
                  </Typography>
                </Alert>
              </Box>
            )}

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {/* Success */}
            {success && (
              <Alert severity="success" sx={{ mt: 2 }} icon={<AutoAwesome />}>
                <Typography variant="body1" fontWeight={600} gutterBottom>
                  {success}
                </Typography>
                <Typography variant="body2">
                  <strong>Stage 2/2:</strong> Video clips are being processed in background
                </Typography>
                <Typography variant="caption">
                  • Extracting video segments<br />
                  • Cropping to 9:16 vertical<br />
                  • Generating thumbnails<br />
                  • Translating subtitles<br />
                  • You can close this dialog and view progress below
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            variant="contained"
            disabled={loading}
            startIcon={<TrendingUp />}
          >
            {loading ? 'Generating...' : 'Generate Clips'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GenerateClipsButton;
