import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Avatar,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Link as LinkIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  GitHub as GitHubIcon,
  Instagram as InstagramIcon,
  Visibility as VisibilityIcon,
  People as PeopleIcon,
  Article as ArticleIcon,
  RemoveRedEye as ViewIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getMyProfile, updateMyProfile, uploadAvatar, UserProfile, UpdateProfileData } from '../api/profileApi';

const ProfilePage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    twitter: '',
    linkedin: '',
    github: '',
    instagram: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!currentUser) {
          setError('Please login to view your profile');
          setLoading(false);
          return;
        }

        // Fetch real profile data from API
        const profileData = await getMyProfile();
        setProfile(profileData);
        
        // Initialize form data with real values
        setDisplayName(profileData.displayName || profileData.name || '');
        setBio(profileData.bio || '');
        setLocation(profileData.location || '');
        setWebsite(profileData.website || '');
        setPhoneNumber(profileData.phoneNumber || '');
        setSocialLinks({
          twitter: profileData.socialLinks?.twitter || '',
          linkedin: profileData.socialLinks?.linkedin || '',
          github: profileData.socialLinks?.github || '',
          instagram: profileData.socialLinks?.instagram || ''
        });
      } catch (error: any) {
        console.error('Error loading profile:', error);
        setError(error.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser]);

  const handleEditSubmit = async () => {
    try {
      setError(null);
      
      const updateData: UpdateProfileData = {
        displayName,
        bio,
        location,
        website,
        phoneNumber,
        socialLinks: {
          twitter: socialLinks.twitter,
          linkedin: socialLinks.linkedin,
          github: socialLinks.github,
          instagram: socialLinks.instagram
        }
      };
      
      // Call API to update profile
      const updatedProfile = await updateMyProfile(updateData);
      setProfile(updatedProfile);
      setEditDialogOpen(false);
      
      // Show success message
      console.log('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setError(null);
      
      // Call API to upload avatar
      const updatedProfile = await uploadAvatar(file);
      setProfile(updatedProfile);
      
      console.log('Avatar uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setError(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Vui lòng đăng nhập để xem profile.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Không tìm thấy profile
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Profile Header */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: 4, 
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
          }}
        >
          <Box display="flex" alignItems="flex-start" gap={4} flexDirection={{ xs: 'column', md: 'row' }}>
            {/* Avatar Section */}
            <Box position="relative" alignSelf={{ xs: 'center', md: 'flex-start' }}>
              <Avatar
                src={profile.avatar ? `${API_BASE_URL}${profile.avatar}` : undefined}
                sx={{ 
                  width: 140, 
                  height: 140, 
                  fontSize: '3rem',
                  border: `4px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  boxShadow: theme.shadows[4]
                }}
              >
                {!profile.avatar && (profile.displayName || profile.name)?.[0]?.toUpperCase()}
              </Avatar>
              
              {/* Upload Avatar Button */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0
                }}
              >
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="avatar-upload"
                  type="file"
                  onChange={handleAvatarUpload}
                />
                <label htmlFor="avatar-upload">
                  <IconButton
                    component="span"
                    size="medium"
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      color: 'white',
                      width: 48,
                      height: 48,
                      '&:hover': { 
                        bgcolor: theme.palette.primary.dark,
                        transform: 'scale(1.1)'
                      },
                      transition: 'all 0.2s ease-in-out',
                      boxShadow: theme.shadows[4]
                    }}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <CameraIcon />
                    )}
                  </IconButton>
                </label>
              </Box>
            </Box>

            {/* Profile Info */}
            <Box flex={1} textAlign={{ xs: 'center', md: 'left' }}>
              <Typography 
                variant="h3" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                {profile.displayName || profile.name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, opacity: 0.8 }}>
                @{profile.name?.toLowerCase().replace(/\s+/g, '')} • Thành viên từ {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
              </Typography>
              
              {profile.bio && (
                <Typography 
                  variant="body1" 
                  color="text.primary" 
                  paragraph 
                  sx={{ 
                    fontSize: '1.1rem', 
                    lineHeight: 1.6,
                    maxWidth: '600px'
                  }}
                >
                  {profile.bio}
                </Typography>
              )}

              {/* Info Chips */}
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
                {profile.location && (
                  <Chip
                    icon={<LocationIcon />}
                    label={profile.location}
                    variant="outlined"
                    size="medium"
                    sx={{ borderRadius: 2 }}
                  />
                )}
                
                {profile.website && (
                  <Chip
                    icon={<LinkIcon />}
                    label="Website"
                    variant="outlined"
                    size="medium"
                    component="a"
                    href={profile.website}
                    target="_blank"
                    clickable
                    sx={{ borderRadius: 2 }}
                  />
                )}

                <Chip
                  icon={<VisibilityIcon />}
                  label="Public Profile"
                  variant="filled"
                  size="medium"
                  color="success"
                  sx={{ borderRadius: 2 }}
                />
              </Stack>

              {/* Action Button */}
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditDialogOpen(true)}
                size="large"
                sx={{ 
                  borderRadius: 2,
                  px: 3,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[8]
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Chỉnh sửa Profile
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3}>
          {[
            { icon: ArticleIcon, value: profile.stats.posts, label: 'Bài viết', color: theme.palette.primary.main },
            { icon: PeopleIcon, value: profile.stats.followers, label: 'Người theo dõi', color: theme.palette.success.main },
            { icon: PeopleIcon, value: profile.stats.following, label: 'Đang theo dõi', color: theme.palette.info.main },
            { icon: ViewIcon, value: profile.stats.profileViews, label: 'Lượt xem', color: theme.palette.warning.main }
          ].map((stat, index) => (
            <Grid item key={index} xs={12} sm={6} md={3}>
              <Card 
                elevation={1}
                sx={{ 
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(stat.color, 0.1)} 0%, ${alpha(stat.color, 0.05)} 100%)`,
                  border: `1px solid ${alpha(stat.color, 0.2)}`,
                  borderRadius: 3,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 25px ${alpha(stat.color, 0.15)}`,
                    borderColor: alpha(stat.color, 0.4)
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: alpha(stat.color, 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2
                    }}
                  >
                    <stat.icon sx={{ fontSize: 30, color: stat.color }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color, mb: 0.5 }}>
                    {stat.value.toLocaleString()}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}
                  >
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Social Links */}
        {(profile.socialLinks?.twitter || profile.socialLinks?.linkedin || profile.socialLinks?.github || profile.socialLinks?.instagram) && (
          <Paper 
            elevation={1} 
            sx={{ 
              p: 4,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`
            }}
          >
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                fontWeight: 600, 
                color: theme.palette.text.primary,
                mb: 3
              }}
            >
              Liên kết xã hội
            </Typography>
            
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {profile.socialLinks?.twitter && (
                <Chip
                  icon={<TwitterIcon />}
                  label={`@${profile.socialLinks.twitter}`}
                  component="a"
                  href={`https://twitter.com/${profile.socialLinks.twitter}`}
                  target="_blank"
                  clickable
                  size="medium"
                  sx={{ 
                    borderRadius: 2,
                    background: '#1DA1F2',
                    color: 'white',
                    fontWeight: 500,
                    px: 2,
                    '&:hover': { 
                      background: '#1A91DA',
                      transform: 'translateY(-2px)'
                    }
                  }}
                />
              )}
              
              {profile.socialLinks?.linkedin && (
                <Chip
                  icon={<LinkedInIcon />}
                  label={profile.socialLinks.linkedin}
                  component="a"
                  href={`https://linkedin.com/in/${profile.socialLinks.linkedin}`}
                  target="_blank"
                  clickable
                  size="medium"
                  sx={{ 
                    borderRadius: 2,
                    background: '#0077B5',
                    color: 'white',
                    fontWeight: 500,
                    px: 2,
                    '&:hover': { 
                      background: '#006399',
                      transform: 'translateY(-2px)'
                    }
                  }}
                />
              )}
              
              {profile.socialLinks?.github && (
                <Chip
                  icon={<GitHubIcon />}
                  label={profile.socialLinks.github}
                  component="a"
                  href={`https://github.com/${profile.socialLinks.github}`}
                  target="_blank"
                  clickable
                  size="medium"
                  sx={{ 
                    borderRadius: 2,
                    background: '#333',
                    color: 'white',
                    fontWeight: 500,
                    px: 2,
                    '&:hover': { 
                      background: '#24292e',
                      transform: 'translateY(-2px)'
                    }
                  }}
                />
              )}
              
              {profile.socialLinks?.instagram && (
                <Chip
                  icon={<InstagramIcon />}
                  label={`@${profile.socialLinks.instagram}`}
                  component="a"
                  href={`https://instagram.com/${profile.socialLinks.instagram}`}
                  target="_blank"
                  clickable
                  size="medium"
                  sx={{ 
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #F56040 30%, #E1306C 90%)',
                    color: 'white',
                    fontWeight: 500,
                    px: 2,
                    '&:hover': { 
                      background: 'linear-gradient(45deg, #E1306C 30%, #F56040 90%)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                />
              )}
            </Stack>
          </Paper>
        )}

        {/* Edit Profile Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 1, 
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box display="flex" alignItems="center" gap={1}>
              <EditIcon />
              <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
                Chỉnh sửa Profile
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setEditDialogOpen(false)}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ p: 4 }}>
            <Grid container spacing={3} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tên hiển thị"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Số điện thoại"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Giới thiệu bản thân"
                  multiline
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  variant="outlined"
                  placeholder="Hãy kể về bản thân bạn..."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Địa chỉ"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  variant="outlined"
                  placeholder="https://your-website.com"
                  InputProps={{
                    startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              {/* Social Links Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                  Liên kết xã hội
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Twitter"
                  value={socialLinks.twitter}
                  onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                  variant="outlined"
                  placeholder="username"
                  InputProps={{
                    startAdornment: <TwitterIcon sx={{ mr: 1, color: '#1DA1F2' }} />
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="LinkedIn"
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                  variant="outlined"
                  placeholder="username"
                  InputProps={{
                    startAdornment: <LinkedInIcon sx={{ mr: 1, color: '#0077B5' }} />
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="GitHub"
                  value={socialLinks.github}
                  onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })}
                  variant="outlined"
                  placeholder="username"
                  InputProps={{
                    startAdornment: <GitHubIcon sx={{ mr: 1, color: '#333' }} />
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Instagram"
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                  variant="outlined"
                  placeholder="username"
                  InputProps={{
                    startAdornment: <InstagramIcon sx={{ mr: 1, color: '#E1306C' }} />
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
              onClick={() => setEditDialogOpen(false)}
              size="large"
              sx={{ borderRadius: 2, px: 3 }}
            >
              Hủy
            </Button>
            <Button 
              onClick={handleEditSubmit} 
              variant="contained" 
              size="large"
              startIcon={<SaveIcon />}
              sx={{ 
                borderRadius: 2, 
                px: 4,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                '&:hover': {
                  background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  transform: 'translateY(-1px)',
                  boxShadow: theme.shadows[8]
                }
              }}
            >
              Lưu thay đổi
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  );
};

export default ProfilePage;