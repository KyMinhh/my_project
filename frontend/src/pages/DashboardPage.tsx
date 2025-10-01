import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  VideoLibrary,
  CloudUpload,
  History,
  Assessment,
  PlayArrow,
  Visibility
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface DashboardStats {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  failedJobs: number;
  totalVideoMinutes: number;
  completionRate: number;
}

interface RecentJob {
  _id: string;
  filename: string;
  status: 'completed' | 'processing' | 'failed' | 'pending' | 'error';
  createdAt: string;
  duration?: number;
  sourceType?: 'upload' | 'youtube' | 'tiktok';
  fileSize?: number;
  hasTranscript?: boolean;
}

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/api$/, '');
      const token = localStorage.getItem('authToken');
      
      console.log('Dashboard - Base URL:', baseURL);
      console.log('Dashboard - Token:', token ? 'Found' : 'Not found');
      
      if (!token) {
        setError('Không tìm thấy token. Vui lòng đăng nhập lại.');
        return;
      }
      
      console.log('Dashboard - Making API calls...');
      
      // Fetch dashboard stats
      const statsURL = `${baseURL}/api/dashboard/stats`;
      console.log('Stats URL:', statsURL);
      
      const statsResponse = await axios.get(statsURL, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Fetch recent jobs
      const jobsURL = `${baseURL}/api/dashboard/recent-jobs?limit=5`;
      console.log('Jobs URL:', jobsURL);
      
      const jobsResponse = await axios.get(jobsURL, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Dashboard - API responses received');
      setStats(statsResponse.data);
      setRecentJobs(jobsResponse.data);
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      if (err.response?.status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        // Clear invalid token
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(err.response?.data?.message || 'Không thể tải dữ liệu dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': 
      case 'pending': return 'warning';
      case 'failed': 
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'processing': return 'Đang xử lý';
      case 'pending': return 'Chờ xử lý';
      case 'failed': 
      case 'error': return 'Thất bại';
      default: return status;
    }
  };

  const handleViewTranscript = (jobId: string) => {
    navigate(`/transcript/${jobId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchDashboardData}>
            Thử lại
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {/* Welcome Section */}
        <Box mb={4}>
          <Typography variant="h4" gutterBottom>
            Chào mừng trở lại, {user?.name || user?.email}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Đây là tổng quan về hoạt động chuyển đổi video của bạn.
          </Typography>
        </Box>

        {/* Stats Cards */}
        {stats && (
          <Box mb={4}>
            <Box display="flex" flexWrap="wrap" gap={3}>
              <Box flex="1" minWidth="250px">
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <VideoLibrary color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h6">{stats.totalJobs}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tổng số video
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              <Box flex="1" minWidth="250px">
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Assessment color="success" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h6">{stats.completedJobs}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Đã hoàn thành
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              <Box flex="1" minWidth="250px">
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <CloudUpload color="warning" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h6">{stats.pendingJobs}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Đang xử lý
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              <Box flex="1" minWidth="250px">
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <History color="info" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h6">{stats.completionRate.toFixed(1)}%</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tỷ lệ thành công
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        )}

        {/* Quick Actions */}
        <Box mb={4}>
          <Box display="flex" flexWrap="wrap" gap={3}>
            <Box flex="1" minWidth="400px">
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Thao tác nhanh
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Button
                      variant="contained"
                      startIcon={<VideoLibrary />}
                      onClick={() => navigate('/transcribe/youtube')}
                    >
                      Chuyển đổi YouTube
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<VideoLibrary />}
                      onClick={() => navigate('/transcribe/tiktok')}
                    >
                      Chuyển đổi TikTok
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<History />}
                      onClick={() => navigate('/files')}
                    >
                      Xem tất cả file
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box flex="1" minWidth="400px">
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Thống kê sử dụng
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Tổng thời lượng video đã xử lý: {stats?.totalVideoMinutes || 0} phút
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hiệu suất: {stats?.completionRate.toFixed(1)}% thành công
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>

        {/* Recent Jobs */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Video gần đây
            </Typography>
            {recentJobs.length > 0 ? (
              <List>
                {recentJobs.map((job) => (
                  <ListItem
                    key={job._id}
                    secondaryAction={
                      <Box display="flex" gap={1} alignItems="center">
                        <Chip
                          label={getStatusText(job.status)}
                          color={getStatusColor(job.status) as any}
                          size="small"
                        />
                        {job.status === 'completed' && job.hasTranscript && (
                          <Tooltip title="Xem transcript">
                            <IconButton
                              edge="end"
                              onClick={() => handleViewTranscript(job._id)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      <VideoLibrary />
                    </ListItemIcon>
                    <ListItemText
                      primary={job.filename}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(job.createdAt).toLocaleDateString('vi-VN')} • 
                            {job.sourceType && ` ${job.sourceType.toUpperCase()}`}
                            {job.duration && ` • ${Math.round(job.duration / 60)} phút`}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                Chưa có video nào được xử lý.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
      <Footer />
    </Box>
  );
};

export default DashboardPage;
