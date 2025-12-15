import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Avatar,
  IconButton,
  Chip
} from '@mui/material';
import { Videocam, Delete, CheckCircle } from '@mui/icons-material';
import axios from 'axios';

interface TikTokAccount {
  displayName: string;
  avatarUrl: string;
  expiresAt: string;
}

const TikTokConnect: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<TikTokAccount | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/tiktok/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.connected) {
        setConnected(true);
        setAccount(response.data.account);
      }
    } catch (err: any) {
      console.error('Check TikTok connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/tiktok/auth-url`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.authUrl) {
        // Redirect to TikTok authorization
        window.location.href = response.data.authUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect TikTok');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect TikTok?')) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/tiktok/disconnect`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConnected(false);
      setAccount(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !connected) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading TikTok connection...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Videocam sx={{ mr: 1, color: '#000' }} />
          <Typography variant="h6">TikTok Integration</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {connected && account ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar src={account.avatarUrl} sx={{ mr: 2 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1">{account.displayName}</Typography>
                <Chip 
                  icon={<CheckCircle />} 
                  label="Connected" 
                  color="success" 
                  size="small" 
                />
              </Box>
              <IconButton onClick={handleDisconnect} color="error">
                <Delete />
              </IconButton>
            </Box>

            <Alert severity="info">
              You can now auto-post clips to TikTok directly from clip gallery!
            </Alert>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Connect your TikTok account to automatically post your generated clips.
            </Typography>

            <Button
              variant="contained"
              startIcon={<Videocam />}
              onClick={handleConnect}
              disabled={loading}
              fullWidth
              sx={{
                bgcolor: '#000',
                '&:hover': { bgcolor: '#333' }
              }}
            >
              {loading ? 'Connecting...' : 'Connect TikTok Account'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TikTokConnect;
