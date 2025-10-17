import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Slider,
  Stack,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import SubtitlesIcon from '@mui/icons-material/Subtitles';
import SubtitlesOffIcon from '@mui/icons-material/SubtitlesOff';
import { SubtitleSegment } from '../services/subtitleApi';

interface SubtitlePreviewPlayerProps {
  videoUrl: string;
  subtitleTracks?: {
    [language: string]: SubtitleSegment[];
  };
  defaultLanguage?: string;
}

const SubtitlePreviewPlayer: React.FC<SubtitlePreviewPlayerProps> = ({
  videoUrl,
  subtitleTracks = {},
  defaultLanguage = 'en',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      updateSubtitle(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [selectedLanguage, subtitleTracks]);

  const updateSubtitle = (time: number) => {
    if (!subtitlesEnabled || !subtitleTracks[selectedLanguage]) {
      setCurrentSubtitle('');
      return;
    }

    const segments = subtitleTracks[selectedLanguage];
    const currentSegment = segments.find(
      (segment) => time >= segment.start && time <= segment.end
    );

    setCurrentSubtitle(currentSegment?.text || '');
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
    } else {
      video.play();
    }
    setPlaying(!playing);
  };

  const handleSeek = (_event: Event, value: number | number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = Array.isArray(value) ? value[0] : value;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (_event: Event, value: number | number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = Array.isArray(value) ? value[0] : value;
    video.volume = newVolume;
    setVolume(newVolume);
    setMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Paper
      ref={containerRef}
      sx={{
        position: 'relative',
        bgcolor: 'black',
        aspectRatio: '16/9',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />

      {subtitlesEnabled && currentSubtitle && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            px: 3,
            py: 1.5,
            borderRadius: 1,
            maxWidth: '80%',
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold', textShadow: '2px 2px 4px black' }}>
            {currentSubtitle}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          p: 2,
        }}
      >
        <Stack spacing={1}>
          <Slider
            value={currentTime}
            max={duration}
            onChange={handleSeek}
            sx={{ color: 'primary.main' }}
          />

          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={togglePlayPause} sx={{ color: 'white' }}>
              {playing ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>

            <Typography variant="body2" sx={{ color: 'white', minWidth: 100 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
              <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
              <Slider
                value={muted ? 0 : volume}
                max={1}
                step={0.01}
                onChange={handleVolumeChange}
                sx={{ width: 100, color: 'white' }}
              />
            </Stack>

            {Object.keys(subtitleTracks).length > 0 && (
              <>
                <Tooltip title={subtitlesEnabled ? 'Disable Subtitles' : 'Enable Subtitles'}>
                  <IconButton
                    onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                    sx={{ color: subtitlesEnabled ? 'primary.main' : 'white' }}
                  >
                    {subtitlesEnabled ? <SubtitlesIcon /> : <SubtitlesOffIcon />}
                  </IconButton>
                </Tooltip>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    sx={{
                      color: 'white',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                    }}
                  >
                    {Object.keys(subtitleTracks).map((lang) => (
                      <MenuItem key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
              <FullscreenIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
};

export default SubtitlePreviewPlayer;
