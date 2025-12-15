import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { Videocam, CheckCircle } from '@mui/icons-material';
import axios from 'axios';

interface Clip {
  _id: string;
  title: string;
  hashtags: string[];
  viralScore: number;
}

interface PostToTikTokDialogProps {
  open: boolean;
  onClose: () => void;
  clip: Clip | null;
  onSuccess?: () => void;
}

const PostToTikTokDialog: React.FC<PostToTikTokDialogProps> = ({
  open,
  onClose,
  clip,
  onSuccess
}) => {
  const [posting, setPosting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [caption, setCaption] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState('PUBLIC_TO_EVERYONE');

  React.useEffect(() => {
    if (clip) {
      // Auto-generate caption from clip data
      const defaultCaption = `${clip.title}\n\n${clip.hashtags.join(' ')}`;
      setCaption(defaultCaption);
    }
  }, [clip]);

  const handlePost = async () => {
    if (!clip) return;

    try {
      setPosting(true);
      setError('');
      
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tiktok/post/${clip._id}`,
        {
          caption: caption.substring(0, 150), // TikTok caption limit
          privacyLevel
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess(true);
      
      setTimeout(() => {
        onClose();
        setSuccess(false);
        if (onSuccess) onSuccess();
      }, 2000);

    } catch (err: any) {
      console.error('Post to TikTok error:', err);
      setError(err.response?.data?.message || 'Failed to post to TikTok');
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    if (!posting) {
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  if (!clip) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Videocam sx={{ mr: 1 }} />
          Post to TikTok
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
            Posted to TikTok successfully! 🎉
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Clip Details
          </Typography>
          <Typography variant="body1" gutterBottom>
            {clip.title}
          </Typography>
          <Chip 
            label={`Viral Score: ${clip.viralScore}/100`} 
            color={clip.viralScore >= 80 ? 'success' : 'primary'}
            size="small"
          />
        </Box>

        <TextField
          label="Caption"
          multiline
          rows={4}
          fullWidth
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          helperText={`${caption.length}/150 characters`}
          sx={{ mb: 2 }}
          disabled={posting || success}
        />

        <FormControl fullWidth disabled={posting || success}>
          <InputLabel>Privacy Level</InputLabel>
          <Select
            value={privacyLevel}
            onChange={(e) => setPrivacyLevel(e.target.value)}
            label="Privacy Level"
          >
            <MenuItem value="PUBLIC_TO_EVERYONE">Public</MenuItem>
            <MenuItem value="FOLLOWER_OF_CREATOR">Followers Only</MenuItem>
            <MenuItem value="MUTUAL_FOLLOW_FRIENDS">Friends</MenuItem>
            <MenuItem value="SELF_ONLY">Private (Only Me)</MenuItem>
          </Select>
        </FormControl>

        {!success && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Your clip will be posted directly to your TikTok profile.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={posting}>
          Cancel
        </Button>
        <Button
          onClick={handlePost}
          variant="contained"
          disabled={posting || success || !caption.trim()}
          startIcon={posting ? <CircularProgress size={20} /> : <Videocam />}
          sx={{
            bgcolor: '#000',
            '&:hover': { bgcolor: '#333' }
          }}
        >
          {posting ? 'Posting...' : 'Post to TikTok'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PostToTikTokDialog;
