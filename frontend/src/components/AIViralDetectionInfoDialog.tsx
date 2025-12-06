import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  TipsAndUpdates as TipsIcon,
} from '@mui/icons-material';
import AI_FEATURES from '../constants/aiFeatures';

interface AIViralDetectionInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

const AIViralDetectionInfoDialog: React.FC<AIViralDetectionInfoDialogProps> = ({
  open,
  onClose,
}) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 2
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <span style={{ fontSize: '1.5rem' }}>🤖</span>
          <Typography variant="h6" component="span">
            AI Viral Moment Detection
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
      >
        <Tab label="Tổng quan" />
        <Tab label="Scoring" />
        <Tab label="Hướng dẫn" />
        <Tab label="FAQ" />
      </Tabs>

      <DialogContent sx={{ p: 3 }}>
        {/* TAB 1: OVERVIEW */}
        {tabValue === 0 && (
          <Box>
            <Typography variant="body1" paragraph color="text.secondary">
              {AI_FEATURES.description}
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
              ✨ Tính năng chính
            </Typography>

            <Grid container spacing={2}>
              {AI_FEATURES.features.map((feature, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" alignItems="flex-start" gap={1.5}>
                        <Typography variant="h4" component="span">
                          {feature.icon}
                        </Typography>
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {feature.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {feature.description}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="primary" 
                            sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}
                          >
                            💡 {feature.tooltip}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
              😊 Emotions được phát hiện
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {AI_FEATURES.emotions.map((emotion, index) => (
                <Chip
                  key={index}
                  label={`${emotion.emoji} ${emotion.type}`}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
              🔥 Viral Elements
            </Typography>
            <Grid container spacing={1}>
              {AI_FEATURES.viralElements.map((element, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {element.emoji} {element.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {element.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* TAB 2: SCORING */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              {AI_FEATURES.scoring.title}
            </Typography>
            
            <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Công thức tính:
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {AI_FEATURES.scoring.formula}
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
              📊 Phân loại điểm số:
            </Typography>

            {AI_FEATURES.scoring.ranges.map((range, index) => (
              <Card 
                key={index}
                sx={{ 
                  mb: 2,
                  borderLeft: 4,
                  borderColor: range.color
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Typography variant="h4">{range.emoji}</Typography>
                    <Box flex={1}>
                      <Typography variant="h6">
                        Score: {range.range}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color={range.color}>
                        {range.label}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    <strong>Action:</strong> {range.action}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
              💡 Tips để tăng Viral Score
            </Typography>

            {Object.entries(AI_FEATURES.tips).map(([key, tip]) => (
              <Accordion key={key}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight="bold">{tip.title}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {tip.actions.map((action, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          <CheckIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={action} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* TAB 3: GUIDE */}
        {tabValue === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              🎯 Quy trình sử dụng
            </Typography>

            <Stepper orientation="vertical">
              {AI_FEATURES.onboarding.steps.map((step, index) => (
                <Step key={index} active>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                        }}
                      >
                        {step.icon}
                      </Box>
                    )}
                  >
                    <Typography variant="subtitle1" fontWeight="bold">
                      {step.title}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {step.description}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              📱 Tối ưu theo Platform
            </Typography>

            {Object.entries(AI_FEATURES.platformGuide).map(([key, platform]) => (
              <Accordion key={key}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography fontSize="1.5rem">{platform.icon}</Typography>
                    <Typography fontWeight="bold">{platform.name}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Duration
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {platform.duration}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Sweet Spot
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {platform.sweetSpot}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Hook Score
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {platform.hookScore}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Format
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {platform.format}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Best Emotions:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {platform.emotions.map((emotion, idx) => (
                      <Chip key={idx} label={emotion} size="small" variant="outlined" />
                    ))}
                  </Box>

                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    💡 Tips:
                  </Typography>
                  <List dense>
                    {platform.tips.map((tip, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          <TipsIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={tip}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* TAB 4: FAQ */}
        {tabValue === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              ❓ Frequently Asked Questions
            </Typography>

            {AI_FEATURES.faq.map((item, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" gap={1}>
                    <InfoIcon color="primary" fontSize="small" />
                    <Typography fontWeight="bold">{item.q}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    {item.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}

            <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.light' }}>
              <Typography variant="body2" color="info.contrastText">
                📚 <strong>Tài liệu chi tiết:</strong> Xem thêm tại{' '}
                <a 
                  href="/docs/AI_VIRAL_DETECTION.md" 
                  target="_blank"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  Technical Documentation
                </a>
                {' '}và{' '}
                <a 
                  href="/docs/VIRAL_CLIPS_USER_GUIDE.md"
                  target="_blank"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  User Guide
                </a>
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIViralDetectionInfoDialog;
