import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  Share as ShareIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState<any>(null);
  
  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  
  // Jobs
  const [jobs, setJobs] = useState<any[]>([]);
  
  // Shares
  const [shares, setShares] = useState<any[]>([]);
  
  // Activities
  const [activities, setActivities] = useState<any[]>([]);

  const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/api$/, '');
  const token = localStorage.getItem('authToken');

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    switch (currentTab) {
      case 0:
        fetchStats();
        break;
      case 1:
        fetchUsers();
        break;
      case 2:
        fetchJobs();
        break;
      case 3:
        fetchShares();
        break;
      case 4:
        fetchActivities();
        break;
    }
  }, [currentTab]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/api/admin/stats`, axiosConfig);
      setStats(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
      if (err.response?.status === 403) {
        alert('You do not have admin access');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/api/admin/users`, axiosConfig);
      setUsers(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/api/admin/jobs`, axiosConfig);
      setJobs(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchShares = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/api/admin/shares`, axiosConfig);
      setShares(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch shares');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/api/admin/activities`, axiosConfig);
      setActivities(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;
    
    try {
      await axios.patch(
        `${baseURL}/api/admin/users/${selectedUser._id}/role`,
        { role: newRole },
        axiosConfig
      );
      setRoleDialogOpen(false);
      fetchUsers();
      alert('Role updated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`${baseURL}/api/admin/users/${userId}`, axiosConfig);
      fetchUsers();
      alert('User deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      await axios.post(`${baseURL}/api/admin/users/${userId}/restore`, {}, axiosConfig);
      fetchUsers();
      alert('User restored successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore user');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'author': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success': return 'success';
      case 'processing':
      case 'pending': return 'warning';
      case 'failed':
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" gutterBottom fontWeight="bold">
        Admin Panel
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="Dashboard" icon={<TimelineIcon />} iconPosition="start" />
          <Tab label="Users" icon={<PeopleIcon />} iconPosition="start" />
          <Tab label="Jobs" icon={<WorkIcon />} iconPosition="start" />
          <Tab label="Shares" icon={<ShareIcon />} iconPosition="start" />
          <Tab label="Activities" />
        </Tabs>
      </Box>

      {/* Dashboard Tab */}
      <TabPanel value={currentTab} index={0}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : stats ? (
          <Stack spacing={3}>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h3">{stats.totalUsers}</Typography>
                  <Typography variant="body2" color="success.main">
                    {stats.activeUsers} active this week
                  </Typography>
                </CardContent>
              </Card>
            
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Jobs
                  </Typography>
                  <Typography variant="h3">{stats.totalJobs}</Typography>
                </CardContent>
              </Card>
            
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Shares
                  </Typography>
                  <Typography variant="h3">{stats.totalShares}</Typography>
                </CardContent>
              </Card>
            
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Job Status
                  </Typography>
                  {Object.entries(stats.jobStatusCounts || {}).map(([status, count]: any) => (
                    <Box key={status} display="flex" justifyContent="space-between">
                      <Typography variant="body2">{status}:</Typography>
                      <Typography variant="body2" fontWeight="bold">{count}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Activities
                </Typography>
                {stats.recentActivities?.map((activity: any) => (
                  <Box key={activity._id} sx={{ mb: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2">
                      <strong>{activity.userId?.name || 'Unknown'}</strong> {activity.action} {activity.resourceType}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                        {new Date(activity.createdAt).toLocaleString()}
                      </Typography>
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Box>
          </Stack>
        ) : null}
      </TabPanel>

      {/* Users Tab */}
      <TabPanel value={currentTab} index={1}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Verified</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id} sx={{ opacity: user.isDeleted ? 0.5 : 1 }}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip label={user.role} color={getRoleColor(user.role) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      {user.isVerified ? (
                        <Chip label="Yes" color="success" size="small" />
                      ) : (
                        <Chip label="No" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role);
                          setRoleDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      {user.isDeleted ? (
                        <IconButton
                          size="small"
                          onClick={() => handleRestoreUser(user._id)}
                          color="success"
                        >
                          <RestoreIcon />
                        </IconButton>
                      ) : (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Jobs Tab */}
      <TabPanel value={currentTab} index={2}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job._id}>
                    <TableCell>{job.originalName || job.fileName}</TableCell>
                    <TableCell>{job.userId?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip label={job.status} color={getStatusColor(job.status) as any} size="small" />
                    </TableCell>
                    <TableCell>{job.sourceType}</TableCell>
                    <TableCell>{new Date(job.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Shares Tab */}
      <TabPanel value={currentTab} index={3}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Job</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Public</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shares.map((share) => (
                  <TableRow key={share._id}>
                    <TableCell>{share.jobId?.originalName || 'N/A'}</TableCell>
                    <TableCell>{share.ownerId?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {share.isPublic ? (
                        <Chip label="Yes" color="success" size="small" />
                      ) : (
                        <Chip label="No" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>{new Date(share.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Activities Tab */}
      <TabPanel value={currentTab} index={4}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity._id}>
                    <TableCell>{activity.userId?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip label={activity.action} size="small" />
                    </TableCell>
                    <TableCell>{activity.resourceType}</TableCell>
                    <TableCell>{activity.details}</TableCell>
                    <TableCell>{new Date(activity.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            User: {selectedUser?.name}
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              label="Role"
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="author">Author</MenuItem>
              <MenuItem value="moderator">Moderator</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleChangeRole} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel;
