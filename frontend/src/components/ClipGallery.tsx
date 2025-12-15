import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Button,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow,
  Download,
  Edit,
  Delete,
  Share,
  Refresh,
  VideoLibrary,
  Photo,
  OndemandVideo,
  Videocam
} from '@mui/icons-material';
import { 
  Clip, 
  getClipsByJob, 
  deleteClip, 
  updateClip, 
  regenerateClipVideo,
  getClipDownloadUrl,
  getClipVideoUrl,
  getClipThumbnailUrl 
} from '../services/clipApi';
import ClipProgressIndicator from './ClipProgressIndicator';
import PostToTikTokDialog from './PostToTikTokDialog';

interface ClipGalleryProps {
  jobId: string;
  onRefresh?: () => void;
}

const ClipGallery: React.FC<ClipGalleryProps> = ({ jobId, onRefresh }) => {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedHashtags, setEditedHashtags] = useState('');
  const [tiktokDialogOpen, setTiktokDialogOpen] = useState(false);
  const [clipForTikTok, setClipForTikTok] = useState<Clip | null>(null);

  // Load clips
  const loadClips = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getClipsByJob(jobId);
      setClips(response.data.clips);
    } catch (err: any) {
      setError(err.message || 'Failed to load clips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      loadClips();
      // Auto-refresh every 3 seconds (faster) if there are processing clips
      const interval = setInterval(() => {
        if (clips.some(c => c.status === 'processing' || c.status === 'pending')) {
          loadClips();
        }
      }, 3000); // Reduced from 5s to 3s for more responsive updates
      return () => clearInterval(interval);
    }
  }, [jobId, clips.length]); // Also refresh when clips length changes

  // Handle delete
  const handleDelete = async (clipId: string) => {
    if (!confirm('Are you sure you want to delete this clip?')) return;
    
    try {
      await deleteClip(clipId);
      setClips(clips.filter(c => c._id !== clipId));
    } catch (err: any) {
      alert('Failed to delete clip: ' + err.message);
    }
  };

  // Handle edit
  const handleEditOpen = (clip: Clip) => {
    setSelectedClip(clip);
    setEditedTitle(clip.title);
    setEditedHashtags(clip.hashtags.join(', '));
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedClip) return;

    try {
      const updates = {
        title: editedTitle,
        hashtags: editedHashtags.split(',').map(h => h.trim()).filter(h => h)
      };
      await updateClip(selectedClip._id, updates);
      await loadClips();
      setEditDialogOpen(false);
    } catch (err: any) {
      alert('Failed to update clip: ' + err.message);
    }
  };

  // Handle regenerate
  const handleRegenerate = async (clipId: string) => {
    try {
      await regenerateClipVideo(clipId);
      alert('Clip regeneration started. Check back in a moment.');
      await loadClips();
    } catch (err: any) {
      alert('Failed to regenerate clip: ' + err.message);
    }
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok': return <VideoLibrary fontSize="small" />;
      case 'instagram-reels': return <Photo fontSize="small" />;
      case 'youtube-shorts': return <OndemandVideo fontSize="small" />;
      case 'facebook-reels': return <VideoLibrary fontSize="small" />;
      case 'twitter': return <Share fontSize="small" />;
      default: return <Share fontSize="small" />;
    }
  };

  // Get emotion emoji
  const getEmotionEmoji = (emotion: string) => {
    const emojis: Record<string, string> = {
      funny: '😂',
      inspiring: '💪',
      shocking: '😱',
      educational: '📚',
      dramatic: '🎭',
      controversial: '🔥',
      heartwarming: '❤️',
      motivational: '🚀',
      informative: 'ℹ️',
      entertaining: '🎉',
      emotional: '😢'
    };
    return emojis[emotion] || '🎬';
  };

  if (loading && clips.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (clips.length === 0) {
    return (
      <Alert severity="info">
        No clips generated yet. Click "Generate Smart Clips" to create viral-ready clips from your video.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Progress Indicator */}
      {clips.length > 0 && clips.some(c => c.status !== 'ready') && (
        <ClipProgressIndicator
          totalClips={clips.length}
          readyClips={clips.filter(c => c.status === 'ready').length}
          processingClips={clips.filter(c => c.status === 'processing' || c.status === 'pending').length}
          failedClips={clips.filter(c => c.status === 'failed').length}
        />
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            🎬 Smart Clips ({clips.length})
          </Typography>
          {clips.length > 0 && (
            <Box display="flex" gap={1} mt={1}>
              <Chip 
                label={`✅ ${clips.filter(c => c.status === 'ready').length} Ready`}
                color="success"
                size="small"
                variant={clips.some(c => c.status === 'ready') ? 'filled' : 'outlined'}
              />
              <Chip 
                label={`🎬 ${clips.filter(c => c.status === 'processing').length} Processing`}
                color="info"
                size="small"
                variant={clips.some(c => c.status === 'processing') ? 'filled' : 'outlined'}
              />
              {clips.some(c => c.status === 'failed') && (
                <Chip 
                  label={`❌ ${clips.filter(c => c.status === 'failed').length} Failed`}
                  color="error"
                  size="small"
                />
              )}
            </Box>
          )}
        </Box>
        <Button 
          startIcon={loading ? <CircularProgress size={16} /> : <Refresh />} 
          onClick={loadClips}
          variant="outlined"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Sort clips: Ready first, then Processing, then Failed */}
        {clips
          .sort((a, b) => {
            const statusOrder = { ready: 0, processing: 1, pending: 2, failed: 3 };
            return statusOrder[a.status] - statusOrder[b.status];
          })
          .map((clip) => (
          <Grid item xs={12} sm={6} md={4} key={clip._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Thumbnail */}
              <CardMedia
                component="img"
                height="300"
                image={
                  clip.status === 'ready' && clip.thumbnailPath 
                    ? getClipThumbnailUrl(clip._id) 
                    : '/placeholder-thumbnail.svg'
                }
                alt={clip.title}
                sx={{ objectFit: 'cover' }}
                onError={(e: any) => {
                  // Fallback to placeholder if image fails to load
                  e.target.src = '/placeholder-thumbnail.svg';
                }}
              />

              {/* Processing overlay */}
              {(clip.status === 'processing' || clip.status === 'pending') && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                    <LinearProgress />
                  </Box>
                  <Box sx={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}>
                    <CircularProgress size={60} sx={{ color: 'white', mb: 2 }} />
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: 'white',
                        fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      {clip.status === 'processing' ? '🎬 Processing Video...' : '⏳ In Queue...'}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'white',
                        opacity: 0.9,
                        display: 'block',
                        mt: 0.5
                      }}
                    >
                      This may take 1-2 minutes
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Ready badge */}
              {clip.status === 'ready' && (
                <Chip
                  label="✅ Ready"
                  color="success"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontWeight: 'bold'
                  }}
                />
              )}

              <CardContent sx={{ flexGrow: 1 }}>
                {/* Viral Score */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Chip 
                    label={`🔥 ${clip.viralScore}/100`}
                    color={clip.viralScore >= 80 ? 'success' : clip.viralScore >= 60 ? 'warning' : 'default'}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {clip.duration.toFixed(1)}s
                  </Typography>
                </Box>

                {/* Title */}
                <Typography variant="h6" component="div" gutterBottom noWrap>
                  {getEmotionEmoji(clip.emotionalPeak)} {clip.title}
                </Typography>

                {/* Emotional Peak */}
                <Chip 
                  label={clip.emotionalPeak}
                  size="small"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />

                {/* Quote */}
                {clip.analysis.quotableMoment && (
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    fontStyle: 'italic',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    mb: 1
                  }}>
                    "{clip.analysis.quotableMoment}"
                  </Typography>
                )}

                {/* Platforms */}
                <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
                  {clip.suggestedPlatforms.slice(0, 3).map((platform, idx) => (
                    <Tooltip title={platform} key={idx}>
                      <Chip 
                        icon={getPlatformIcon(platform)}
                        label=""
                        size="small"
                        variant="outlined"
                      />
                    </Tooltip>
                  ))}
                </Box>

                {/* Hashtags */}
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {clip.hashtags.slice(0, 3).map((tag, idx) => (
                    <Chip 
                      key={idx}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  ))}
                  {clip.hashtags.length > 3 && (
                    <Chip 
                      label={`+${clip.hashtags.length - 3}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </CardContent>

              <CardActions>
                {clip.status === 'ready' && (
                  <>
                    <Tooltip title="Preview">
                      <IconButton 
                        size="small" 
                        onClick={() => window.open(getClipVideoUrl(clip._id), '_blank')}
                      >
                        <PlayArrow />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton 
                        size="small"
                        onClick={() => window.open(getClipDownloadUrl(clip._id), '_blank')}
                      >
                        <Download />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                {clip.status === 'ready' && (
                  <Tooltip title="Post to TikTok">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setClipForTikTok(clip);
                        setTiktokDialogOpen(true);
                      }}
                      sx={{ color: '#000' }}
                    >
                      <Videocam />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => handleEditOpen(clip)}>
                    <Edit />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Regenerate">
                  <IconButton size="small" onClick={() => handleRegenerate(clip._id)}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => handleDelete(clip._id)}>
                    <Delete />
                  </IconButton>
                </Tooltip>
              </CardActions>

              {clip.status === 'failed' && (
                <Alert 
                  severity="error" 
                  sx={{ m: 1 }}
                  action={
                    <Button 
                      color="inherit" 
                      size="small"
                      onClick={() => handleRegenerate(clip._id)}
                    >
                      Retry
                    </Button>
                  }
                >
                  <Typography variant="body2" fontWeight={500}>
                    Processing failed
                  </Typography>
                  <Typography variant="caption">
                    {clip.processingError || 'Unknown error occurred'}
                  </Typography>
                </Alert>
              )}
              
              {/* Partial success - video ready but no thumbnail */}
              {clip.status === 'ready' && !clip.thumbnailPath && (
                <Alert severity="warning" sx={{ m: 1 }} icon={false}>
                  <Typography variant="caption">
                    ⚠️ Video ready, thumbnail unavailable
                  </Typography>
                </Alert>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Clip</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            margin="normal"
          />
          <TextField
            label="Hashtags (comma separated)"
            fullWidth
            multiline
            rows={3}
            value={editedHashtags}
            onChange={(e) => setEditedHashtags(e.target.value)}
            margin="normal"
            helperText="e.g. #viral, #trending, #funny"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Post to TikTok Dialog */}
      <PostToTikTokDialog
        open={tiktokDialogOpen}
        onClose={() => {
          setTiktokDialogOpen(false);
          setClipForTikTok(null);
        }}
        clip={clipForTikTok}
        onSuccess={() => {
          loadClips(); // Refresh clips after posting
        }}
      />
    </Box>
  );
};

export default ClipGallery;
