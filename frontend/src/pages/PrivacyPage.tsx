import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

const PrivacyPage: React.FC = () => {
  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="md">
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h3" gutterBottom>
            Privacy Policy
          </Typography>
          
          <Typography variant="caption" color="text.secondary" paragraph>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            1. Information We Collect
          </Typography>
          <Typography paragraph>
            We collect information you provide directly to us:
            <br />• Account information (email, name)
            <br />• Videos and content you upload
            <br />• TikTok account information when you connect your account
            <br />• Usage data and analytics
          </Typography>

          <Typography variant="h6" gutterBottom>
            2. How We Use Your Information
          </Typography>
          <Typography paragraph>
            We use the information we collect to:
            <br />• Provide and maintain our service
            <br />• Process your videos and generate clips
            <br />• Post content to TikTok on your behalf (when authorized)
            <br />• Improve our AI algorithms
            <br />• Send you service updates and notifications
          </Typography>

          <Typography variant="h6" gutterBottom>
            3. TikTok Integration
          </Typography>
          <Typography paragraph>
            When you connect your TikTok account:
            <br />• We receive your TikTok user ID and profile information
            <br />• We can post videos on your behalf
            <br />• We do NOT access your private messages or followers list
            <br />• You can disconnect at any time through settings
          </Typography>

          <Typography variant="h6" gutterBottom>
            4. Data Storage and Security
          </Typography>
          <Typography paragraph>
            • Videos are stored securely on Google Cloud Storage
            <br />• We use industry-standard encryption
            <br />• Access tokens are encrypted and stored securely
            <br />• We retain data only as long as necessary
          </Typography>

          <Typography variant="h6" gutterBottom>
            5. Data Sharing
          </Typography>
          <Typography paragraph>
            We do NOT sell your personal data. We may share data with:
            <br />• Service providers (Google Cloud, TikTok API)
            <br />• When required by law
            <br />• With your explicit consent
          </Typography>

          <Typography variant="h6" gutterBottom>
            6. Your Rights
          </Typography>
          <Typography paragraph>
            You have the right to:
            <br />• Access your personal data
            <br />• Delete your account and data
            <br />• Export your content
            <br />• Opt-out of analytics
            <br />• Revoke TikTok authorization
          </Typography>

          <Typography variant="h6" gutterBottom>
            7. Cookies and Tracking
          </Typography>
          <Typography paragraph>
            We use cookies and similar technologies for:
            <br />• Authentication and security
            <br />• Remembering your preferences
            <br />• Analytics and performance monitoring
          </Typography>

          <Typography variant="h6" gutterBottom>
            8. Third-Party Services
          </Typography>
          <Typography paragraph>
            Our service integrates with:
            <br />• TikTok (governed by TikTok Privacy Policy)
            <br />• Google Cloud Platform
            <br />• OpenAI/Gemini AI services
          </Typography>

          <Typography variant="h6" gutterBottom>
            9. Children's Privacy
          </Typography>
          <Typography paragraph>
            Our service is not intended for users under 13 years old. We do not knowingly collect data from children.
          </Typography>

          <Typography variant="h6" gutterBottom>
            10. Changes to Privacy Policy
          </Typography>
          <Typography paragraph>
            We may update this policy from time to time. We will notify you of significant changes via email or service notification.
          </Typography>

          <Typography variant="h6" gutterBottom>
            11. Contact Us
          </Typography>
          <Typography paragraph>
            For privacy concerns or data requests, contact:
            <br />Email: vkminh04.c23xuantruong@gmail.com
            <br />Response time: Within 48 hours
          </Typography>

          <Typography variant="h6" gutterBottom>
            12. GDPR Compliance (EU Users)
          </Typography>
          <Typography paragraph>
            If you are in the European Union, you have additional rights under GDPR including data portability and the right to be forgotten.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default PrivacyPage;
