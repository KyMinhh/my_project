import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        mt: 'auto',
        py: 3
      }}
    >
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={4}>
          <Box>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t('Video Transcription')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Fast and accurate video to text conversion.')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t('Links')}
            </Typography>
            <Link href="/about" color="inherit" display="block">
              {t('About us')}
            </Link>
            <Link href="/contact" color="inherit" display="block">
              {t('Contact')}
            </Link>
            <Link href="/privacy" color="inherit" display="block">
              {t('Privacy Policy')}
            </Link>
          </Box>
        </Box>
        <Box mt={3}>
          <Typography variant="body2" color="text.secondary" align="center">
            {'© '}
            {new Date().getFullYear()}
            {' '}{t('Video Transcription')}. {t('All rights reserved.')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
