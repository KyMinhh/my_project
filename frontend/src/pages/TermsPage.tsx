import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

const TermsPage: React.FC = () => {
  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="md">
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h3" gutterBottom>
            Terms of Service
          </Typography>
          
          <Typography variant="caption" color="text.secondary" paragraph>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            1. Acceptance of Terms
          </Typography>
          <Typography paragraph>
            By accessing and using Video Transcription Clips ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </Typography>

          <Typography variant="h6" gutterBottom>
            2. Use of Service
          </Typography>
          <Typography paragraph>
            This service allows you to transcribe videos, generate AI-powered clips, and post content to social media platforms including TikTok.
          </Typography>

          <Typography variant="h6" gutterBottom>
            3. User Responsibilities
          </Typography>
          <Typography paragraph>
            - You are responsible for the content you upload and share<br />
            - You must own or have rights to any videos you process<br />
            - You agree not to upload illegal, offensive, or copyrighted content without permission
          </Typography>

          <Typography variant="h6" gutterBottom>
            4. TikTok Integration
          </Typography>
          <Typography paragraph>
            When you connect your TikTok account, you authorize us to post content on your behalf. You can revoke this access at any time through your account settings.
          </Typography>

          <Typography variant="h6" gutterBottom>
            5. Content Ownership
          </Typography>
          <Typography paragraph>
            You retain all rights to your original content. We do not claim ownership of videos or clips you create using our service.
          </Typography>

          <Typography variant="h6" gutterBottom>
            6. Service Availability
          </Typography>
          <Typography paragraph>
            We strive to maintain service availability but do not guarantee uninterrupted access. The service is provided "as is" without warranties.
          </Typography>

          <Typography variant="h6" gutterBottom>
            7. Limitation of Liability
          </Typography>
          <Typography paragraph>
            We are not liable for any damages arising from your use of the service, including but not limited to data loss, service interruptions, or content issues.
          </Typography>

          <Typography variant="h6" gutterBottom>
            8. Changes to Terms
          </Typography>
          <Typography paragraph>
            We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of updated terms.
          </Typography>

          <Typography variant="h6" gutterBottom>
            9. Termination
          </Typography>
          <Typography paragraph>
            We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever.
          </Typography>

          <Typography variant="h6" gutterBottom>
            10. Contact
          </Typography>
          <Typography paragraph>
            For questions about these Terms, please contact us at: vkminh04.c23xuantruong@gmail.com
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default TermsPage;
