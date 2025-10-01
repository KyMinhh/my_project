import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';

const Footer: React.FC = () => {
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
              Video Transcription
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chuyển đổi video thành văn bản một cách nhanh chóng và chính xác.
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Liên kết
            </Typography>
            <Link href="/about" color="inherit" display="block">
              Về chúng tôi
            </Link>
            <Link href="/contact" color="inherit" display="block">
              Liên hệ
            </Link>
            <Link href="/privacy" color="inherit" display="block">
              Chính sách bảo mật
            </Link>
          </Box>
        </Box>
        <Box mt={3}>
          <Typography variant="body2" color="text.secondary" align="center">
            {'© '}
            {new Date().getFullYear()}
            {' Video Transcription. Tất cả quyền được bảo lưu.'}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
