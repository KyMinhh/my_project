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
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  
  // Jobs
  const [jobs, setJobs] = useState<any[]>([]);
  const [showDeletedJobs, setShowDeletedJobs] = useState(false);
  
  // Shares
  const [shares, setShares] = useState<any[]>([]);
  const [showDeletedShares, setShowDeletedShares] = useState(false);
  
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

  useEffect(() => {
    if (currentTab === 1) {
      fetchUsers();
    }
  }, [showDeletedUsers]);

  useEffect(() => {
    if (currentTab === 2) {
      fetchJobs();
    }
  }, [showDeletedJobs]);

  useEffect(() => {
    if (currentTab === 3) {
      fetchShares();
    }
  }, [showDeletedShares]);

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
      const url = `${baseURL}/api/admin/users?includeDeleted=${showDeletedUsers}`;
      const response = await axios.get(url, axiosConfig);
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
      const url = `${baseURL}/api/admin/jobs?includeDeleted=${showDeletedJobs}`;
      const response = await axios.get(url, axiosConfig);
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
      const url = `${baseURL}/api/admin/shares?includeDeleted=${showDeletedShares}`;
      const response = await axios.get(url, axiosConfig);
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
    if (!window.confirm('Are you sure you want to restore this user?')) return;
    
    try {
      await axios.post(`${baseURL}/api/admin/users/${userId}/restore`, {}, axiosConfig);
      fetchUsers();
      alert('User restored successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore user');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await axios.delete(`${baseURL}/api/admin/jobs/${jobId}`, axiosConfig);
      fetchJobs();
      alert('Job deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete job');
    }
  };

  const handleRestoreJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to restore this job?')) return;
    
    try {
      await axios.post(`${baseURL}/api/admin/jobs/${jobId}/restore`, {}, axiosConfig);
      fetchJobs();
      alert('Job restored successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore job');
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    if (!window.confirm('Are you sure you want to delete this share?')) return;
    
    try {
      await axios.delete(`${baseURL}/api/admin/shares/${shareId}`, axiosConfig);
      fetchShares();
      alert('Share deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete share');
    }
  };

  const handleRestoreShare = async (shareId: string) => {
    if (!window.confirm('Are you sure you want to restore this share?')) return;
    
    try {
      await axios.post(`${baseURL}/api/admin/shares/${shareId}/restore`, {}, axiosConfig);
      fetchShares();
      alert('Share restored successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore share');
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

      <Box sx={{ 
        borderBottom: 2, 
        borderColor: 'divider', 
        mb: 3,
        backgroundColor: '#f5f5f5',
        borderRadius: '8px 8px 0 0'
      }}>
        <Tabs 
          value={currentTab} 
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              color: '#666',
              fontWeight: 500,
              textTransform: 'uppercase',
              fontSize: '0.875rem',
              '&:hover': {
                color: '#000',
                backgroundColor: 'rgba(0,0,0,0.05)'
              }
            },
            '& .Mui-selected': {
              color: '#1976d2 !important',
              fontWeight: 600
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#1976d2',
              height: 3
            }
          }}
        >
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
          <>
            {/* Show Deleted Users Toggle */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl size="small">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={showDeletedUsers}
                    onChange={(e) => setShowDeletedUsers(e.target.checked)}
                  />
                  <Typography variant="body2">Show Deleted Users</Typography>
                </label>
              </FormControl>
              {showDeletedUsers && (
                <Chip
                  label="⚠️ Deleted Users Visible"
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    backgroundColor: '#1a237e',
                    '& .MuiTableCell-head': {
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.95rem'
                    }
                  }}>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Role</strong></TableCell>
                    <TableCell><strong>Verified</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Created</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow 
                      key={user._id} 
                      sx={{ 
                        opacity: user.isDeleted ? 0.6 : 1,
                        backgroundColor: user.isDeleted ? '#fff3e0' : 'inherit',
                        borderLeft: user.isDeleted ? '4px solid #ff9800' : 'none'
                      }}
                    >
                      <TableCell>
                        {user.name}
                        {user.isDeleted && (
                          <Chip
                            label="DELETED"
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip label={user.role} color={getRoleColor(user.role) as any} size="small" />
                      </TableCell>
                      <TableCell>
                        {user.isVerified ? (
                          <Chip label="✓ Yes" color="success" size="small" />
                        ) : (
                          <Chip label="✗ No" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {user.isDeleted ? (
                          <Chip 
                            label={`Deleted: ${new Date(user.deletedAt).toLocaleDateString()}`}
                            color="error"
                            variant="outlined"
                            size="small"
                          />
                        ) : (
                          <Chip label="Active" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role);
                            setRoleDialogOpen(true);
                          }}
                          title="Edit Role"
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        {user.isDeleted ? (
                          <IconButton
                            size="small"
                            onClick={() => handleRestoreUser(user._id)}
                            color="success"
                            title="Restore User"
                          >
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user._id)}
                            color="error"
                            title="Delete User"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </TabPanel>

      {/* Jobs Tab */}
      <TabPanel value={currentTab} index={2}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Show Deleted Jobs Toggle */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl size="small">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={showDeletedJobs}
                    onChange={(e) => setShowDeletedJobs(e.target.checked)}
                  />
                  <Typography variant="body2">Show Deleted Jobs</Typography>
                </label>
              </FormControl>
              {showDeletedJobs && (
                <Chip
                  label="⚠️ Deleted Jobs Visible"
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    backgroundColor: '#1a237e',
                    '& .MuiTableCell-head': {
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.95rem'
                    }
                  }}>
                    <TableCell><strong>File Name</strong></TableCell>
                    <TableCell><strong>User</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Source</strong></TableCell>
                    <TableCell><strong>Created</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow 
                      key={job._id}
                      sx={{ 
                        opacity: job.isDeleted ? 0.6 : 1,
                        backgroundColor: job.isDeleted ? '#fff3e0' : 'inherit',
                        borderLeft: job.isDeleted ? '4px solid #ff9800' : 'none'
                      }}
                    >
                      <TableCell>
                        {job.originalName || job.fileName}
                        {job.isDeleted && (
                          <Chip
                            label="DELETED"
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{job.userId?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={job.status} color={getStatusColor(job.status) as any} size="small" />
                      </TableCell>
                      <TableCell>{job.sourceType}</TableCell>
                      <TableCell>
                        {new Date(job.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        {job.isDeleted ? (
                          <>
                            <Chip 
                              label={`Deleted: ${new Date(job.deletedAt).toLocaleDateString()}`}
                              color="error"
                              variant="outlined"
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleRestoreJob(job._id)}
                              color="success"
                              title="Restore Job"
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteJob(job._id)}
                            color="error"
                            title="Delete Job"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </TabPanel>

      {/* Shares Tab */}
      <TabPanel value={currentTab} index={3}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Show Deleted Shares Toggle */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl size="small">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={showDeletedShares}
                    onChange={(e) => setShowDeletedShares(e.target.checked)}
                  />
                  <Typography variant="body2">Show Deleted Shares</Typography>
                </label>
              </FormControl>
              {showDeletedShares && (
                <Chip
                  label="⚠️ Deleted Shares Visible"
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    backgroundColor: '#1a237e',
                    '& .MuiTableCell-head': {
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.95rem'
                    }
                  }}>
                    <TableCell><strong>Job</strong></TableCell>
                    <TableCell><strong>Owner</strong></TableCell>
                    <TableCell><strong>Public</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Created</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shares.map((share) => (
                    <TableRow 
                      key={share._id}
                      sx={{ 
                        opacity: share.isDeleted ? 0.6 : 1,
                        backgroundColor: share.isDeleted ? '#fff3e0' : 'inherit',
                        borderLeft: share.isDeleted ? '4px solid #ff9800' : 'none'
                      }}
                    >
                      <TableCell>
                        {share.jobId?.originalName || 'N/A'}
                        {share.isDeleted && (
                          <Chip
                            label="DELETED"
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{share.ownerId?.name || 'N/A'}</TableCell>
                      <TableCell>
                        {share.isPublic ? (
                          <Chip label="Yes" color="success" size="small" />
                        ) : (
                          <Chip label="No" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {share.isDeleted ? (
                          <Chip 
                            label={`Deleted: ${new Date(share.deletedAt).toLocaleDateString()}`}
                            color="error"
                            variant="outlined"
                            size="small"
                          />
                        ) : (
                          <Chip label="Active" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(share.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        {share.isDeleted ? (
                          <IconButton
                            size="small"
                            onClick={() => handleRestoreShare(share._id)}
                            color="success"
                            title="Restore Share"
                          >
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteShare(share._id)}
                            color="error"
                            title="Delete Share"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
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
                <TableRow sx={{ 
                  backgroundColor: '#1a237e',
                  '& .MuiTableCell-head': {
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }
                }}>
                  <TableCell><strong>User</strong></TableCell>
                  <TableCell><strong>Action</strong></TableCell>
                  <TableCell><strong>Resource</strong></TableCell>
                  <TableCell><strong>Details</strong></TableCell>
                  <TableCell><strong>Time</strong></TableCell>
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
