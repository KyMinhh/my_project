import React from 'react';
import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { CheckCircle, Circle, Error } from '@mui/icons-material';

interface ClipProgressIndicatorProps {
  totalClips: number;
  readyClips: number;
  processingClips: number;
  failedClips: number;
}

const ClipProgressIndicator: React.FC<ClipProgressIndicatorProps> = ({
  totalClips,
  readyClips,
  processingClips,
  failedClips
}) => {
  const progressPercentage = totalClips > 0 ? (readyClips / totalClips) * 100 : 0;
  const isComplete = readyClips + failedClips === totalClips;

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e0e0e0' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2" fontWeight={600}>
          Clip Processing Progress
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {readyClips}/{totalClips} Complete
        </Typography>
      </Box>
      
      <LinearProgress 
        variant="determinate" 
        value={progressPercentage} 
        sx={{ height: 8, borderRadius: 4, mb: 2 }}
        color={isComplete ? 'success' : 'primary'}
      />
      
      <Box display="flex" gap={1} flexWrap="wrap">
        {readyClips > 0 && (
          <Chip
            icon={<CheckCircle />}
            label={`${readyClips} Ready`}
            color="success"
            size="small"
            variant="outlined"
          />
        )}
        {processingClips > 0 && (
          <Chip
            icon={<Circle />}
            label={`${processingClips} Processing`}
            color="info"
            size="small"
            variant="outlined"
          />
        )}
        {failedClips > 0 && (
          <Chip
            icon={<Error />}
            label={`${failedClips} Failed`}
            color="error"
            size="small"
            variant="outlined"
          />
        )}
      </Box>
      
      {processingClips > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          ⏳ Estimated time remaining: {Math.ceil(processingClips * 0.5)} - {processingClips} minutes
        </Typography>
      )}
    </Box>
  );
};

export default ClipProgressIndicator;
