import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Box,
  Alert,
  Divider,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import SubtitlesIcon from '@mui/icons-material/Subtitles';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import LanguageIcon from '@mui/icons-material/Language';
import SubtitleExporter from '../components/SubtitleExporter';
import SubtitlePreviewPlayer from '../components/SubtitlePreviewPlayer';
import { SubtitleSegment } from '../services/subtitleApi';

const SubtitlePage: React.FC = () => {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const sampleSegments: SubtitleSegment[] = [
    { start: 0, end: 3, text: 'Welcome to the subtitle demo.' },
    { start: 3, end: 6, text: 'This video shows how subtitles work.' },
    { start: 6, end: 9, text: 'You can generate SRT or VTT files.' },
    { start: 9, end: 12, text: 'Burn subtitles permanently into video.' },
    { start: 12, end: 15, text: 'Or embed them as selectable tracks.' },
    { start: 15, end: 18, text: 'Multiple languages are supported.' },
    { start: 18, end: 21, text: 'Preview subtitles in real-time.' },
    { start: 21, end: 24, text: 'Change languages on the fly.' },
    { start: 24, end: 27, text: 'Toggle subtitles on or off.' },
    { start: 27, end: 30, text: 'Thank you for watching!' },
  ];

  const sampleSegmentsVi: SubtitleSegment[] = [
    { start: 0, end: 3, text: 'Chào mừng đến với demo phụ đề.' },
    { start: 3, end: 6, text: 'Video này cho thấy phụ đề hoạt động như thế nào.' },
    { start: 6, end: 9, text: 'Bạn có thể tạo tệp SRT hoặc VTT.' },
    { start: 9, end: 12, text: 'Ghi phụ đề vĩnh viễn vào video.' },
    { start: 12, end: 15, text: 'Hoặc nhúng chúng dưới dạng track có thể chọn.' },
    { start: 15, end: 18, text: 'Hỗ trợ nhiều ngôn ngữ.' },
    { start: 18, end: 21, text: 'Xem trước phụ đề theo thời gian thực.' },
    { start: 21, end: 24, text: 'Thay đổi ngôn ngữ một cách linh hoạt.' },
    { start: 24, end: 27, text: 'Bật hoặc tắt phụ đề.' },
    { start: 27, end: 30, text: 'Cảm ơn bạn đã xem!' },
  ];

  const sampleTranscripts = {
    en: sampleSegments,
    vi: sampleSegmentsVi,
  };

  const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h3" gutterBottom fontWeight="bold">
            <SubtitlesIcon sx={{ fontSize: 40, mr: 2, verticalAlign: 'middle' }} />
            Subtitle Generator & Video Export
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Auto-generate SRT/VTT subtitle files, burn them into videos, or embed multiple
            languages with preview functionality.
          </Typography>
        </Box>

        <Alert severity="info">
          This demo shows the full subtitle workflow: Generate files, burn into video, embed
          multiple languages, and preview in real-time.
        </Alert>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={3}>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <SubtitlesIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Generate Subtitles
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Create SRT/VTT files from transcript segments with timestamps
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={3}>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <VideoFileIcon sx={{ fontSize: 60, color: 'secondary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Burn Subtitles
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Permanently burn subtitles into video using FFmpeg
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={3}>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <LanguageIcon sx={{ fontSize: 60, color: 'success.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Multi-Language
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Embed multiple language tracks that users can switch between
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider />

        <Box>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            Subtitle Preview
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Watch how subtitles appear in real-time. Switch languages and toggle subtitles on/off.
          </Typography>
          <SubtitlePreviewPlayer
            videoUrl={videoUrl}
            subtitleTracks={sampleTranscripts}
            defaultLanguage="en"
          />
        </Box>

        <Divider />

        <Box>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            Export Options
          </Typography>
          <Stack spacing={2}>
            <Alert severity="warning">
              To export with actual video files, you need to provide a valid video path from your
              uploads.
            </Alert>
            <Button
              variant="contained"
              size="large"
              startIcon={<SubtitlesIcon />}
              onClick={() => setExportDialogOpen(true)}
            >
              Open Subtitle Exporter
            </Button>
          </Stack>
        </Box>

        <Paper sx={{ p: 3, bgcolor: 'grey.100' }}>
          <Typography variant="h6" gutterBottom>
            Features:
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              ✅ Auto-generate SRT/VTT files from transcript segments
            </Typography>
            <Typography variant="body2">
              ✅ Burn subtitles permanently into video (hard-coded)
            </Typography>
            <Typography variant="body2">
              ✅ Embed multiple language tracks (soft subtitles)
            </Typography>
            <Typography variant="body2">
              ✅ Real-time subtitle preview in video player
            </Typography>
            <Typography variant="body2">
              ✅ Language switching on the fly
            </Typography>
            <Typography variant="body2">
              ✅ Customizable font, size, color, and position
            </Typography>
            <Typography variant="body2">
              ✅ Download subtitle files individually
            </Typography>
            <Typography variant="body2">
              ✅ Export videos with embedded subtitles
            </Typography>
          </Stack>
        </Paper>
      </Stack>

      <SubtitleExporter
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        segments={sampleSegments}
        transcripts={sampleTranscripts}
        videoPath="/uploads/videos/sample.mp4"
      />
    </Container>
  );
};

export default SubtitlePage;
