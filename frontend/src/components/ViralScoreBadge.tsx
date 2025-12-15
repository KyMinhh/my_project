import React from 'react';
import {
  Box,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
  Paper,
  Grid,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as SparkleIcon,
  EmojiEmotions as EmotionIcon,
  LocalFireDepartment as FireIcon,
} from '@mui/icons-material';

interface ViralScoreBadgeProps {
  score: number;
  hookStrength?: number;
  emotionalPeak?: string;
  viralElements?: string[];
  variant?: 'compact' | 'detailed';
}

const ViralScoreBadge: React.FC<ViralScoreBadgeProps> = ({
  score,
  hookStrength,
  emotionalPeak,
  viralElements,
  variant = 'compact',
}) => {
  // Determine color and label based on score
  const getScoreInfo = (score: number) => {
    if (score >= 90) {
      return {
        color: '#FF4444',
        label: 'Viral chắc chắn',
        emoji: '🔥',
        icon: <FireIcon />,
        gradient: 'linear-gradient(135deg, #FF4444 0%, #FF8A80 100%)',
      };
    } else if (score >= 75) {
      return {
        color: '#FF9800',
        label: 'Rất có tiềm năng',
        emoji: '🚀',
        icon: <TrendingUpIcon />,
        gradient: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
      };
    } else if (score >= 60) {
      return {
        color: '#FFC107',
        label: 'Tốt',
        emoji: '⚡',
        icon: <SparkleIcon />,
        gradient: 'linear-gradient(135deg, #FFC107 0%, #FFD54F 100%)',
      };
    } else {
      return {
        color: '#9E9E9E',
        label: 'Cần tối ưu',
        emoji: '⚠️',
        icon: <PsychologyIcon />,
        gradient: 'linear-gradient(135deg, #9E9E9E 0%, #BDBDBD 100%)',
      };
    }
  };

  const scoreInfo = getScoreInfo(score);

  // Get emotion emoji
  const getEmotionEmoji = (emotion?: string) => {
    const emojiMap: Record<string, string> = {
      funny: '😂',
      shocking: '🤯',
      educational: '💡',
      inspiring: '✨',
      controversial: '🔥',
      heartwarming: '❤️',
      dramatic: '🎭',
      motivational: '💪',
      informative: '🤔',
      entertaining: '🎉',
      emotional: '💔',
    };
    return emotion ? emojiMap[emotion.toLowerCase()] || '😊' : '😊';
  };

  if (variant === 'compact') {
    return (
      <Tooltip title={`${scoreInfo.label} - Score: ${score}/100`}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.5,
            borderRadius: 2,
            background: scoreInfo.gradient,
            color: 'white',
            fontWeight: 'bold',
            boxShadow: 2,
          }}
        >
          <Typography variant="h6" component="span">
            {scoreInfo.emoji}
          </Typography>
          <Typography variant="body1" component="span" fontWeight="bold">
            {score}
          </Typography>
          <Typography variant="caption" component="span">
            /100
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  // Detailed variant
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: scoreInfo.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            {scoreInfo.icon}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Viral Score
            </Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ lineHeight: 1 }}>
              {score}/100
            </Typography>
          </Box>
        </Box>
        <Chip
          label={scoreInfo.label}
          sx={{
            background: scoreInfo.gradient,
            color: 'white',
            fontWeight: 'bold',
          }}
        />
      </Box>

      {/* Progress Bar */}
      <Box mb={2}>
        <LinearProgress
          variant="determinate"
          value={score}
          sx={{
            height: 8,
            borderRadius: 1,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              background: scoreInfo.gradient,
              borderRadius: 1,
            },
          }}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Details Grid */}
      <Grid container spacing={2}>
        {hookStrength !== undefined && (
          <Grid item xs={6}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                🎯 Hook Strength
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6" fontWeight="bold">
                  {hookStrength}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={hookStrength}
                  sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: 1,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: hookStrength >= 80 ? '#4CAF50' : hookStrength >= 60 ? '#FFC107' : '#FF5722',
                    },
                  }}
                />
              </Box>
            </Box>
          </Grid>
        )}

        {emotionalPeak && (
          <Grid item xs={6}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                <EmotionIcon fontSize="small" /> Emotion
              </Typography>
              <Chip
                label={emotionalPeak}
                icon={<span>{getEmotionEmoji(emotionalPeak)}</span>}
                size="small"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Grid>
        )}

        {viralElements && viralElements.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              🔥 Viral Elements ({viralElements.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {viralElements.slice(0, 5).map((element, index) => (
                <Chip
                  key={index}
                  label={element}
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    height: 20,
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                  }}
                />
              ))}
              {viralElements.length > 5 && (
                <Chip
                  label={`+${viralElements.length - 5}`}
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              )}
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Action Hint */}
      <Box
        sx={{
          mt: 2,
          p: 1,
          borderRadius: 1,
          bgcolor: 'rgba(0,0,0,0.03)',
          borderLeft: 3,
          borderColor: scoreInfo.color,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          💡 <strong>Action:</strong>{' '}
          {score >= 90
            ? 'Post ngay + Boost ads'
            : score >= 75
            ? 'Post + Monitor performance'
            : score >= 60
            ? 'Tweak title/thumbnail trước khi post'
            : 'Re-edit hoặc skip clip này'}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ViralScoreBadge;
