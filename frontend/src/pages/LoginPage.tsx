import React, { useState } from 'react';
import { 
    TextField, 
    Button, 
    Typography, 
    Container, 
    Paper, 
    Box, 
    CircularProgress, 
    Alert,
    Link as MuiLink,
    InputAdornment,
    IconButton,
    useTheme,
    alpha,
    Fade,
    Stack,
    Divider
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApiClient } from '../services/authApi';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();
    const theme = useTheme();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await authApiClient.post('/login', { email, password });
            console.log('Login response:', response.data);

            if (response.data.success && response.data.user) {
                login(response.data.user, response.data.token || '');
                navigate('/');
            } else {
                setError('Đăng nhập không thành công, vui lòng thử lại');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            setError(error.response?.data?.message || 'Đăng nhập thất bại, vui lòng thử lại');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTestUser = async () => {
        setError('');
        setIsLoading(true);

        try {
            const response = await authApiClient.post('/test/create-test-user');
            console.log('Test user created:', response.data);

            if (response.data.success && response.data.user && response.data.token) {
                login(response.data.user, response.data.token);
                navigate('/');
            } else {
                setError('Tạo test user không thành công');
            }
        } catch (error: any) {
            console.error('Create test user error:', error);
            setError(error.response?.data?.message || 'Tạo test user thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4
        }}>
            <Container component="main" maxWidth="sm">
                <Fade in timeout={800}>
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            padding: { xs: 4, sm: 6 },
                            background: alpha(theme.palette.background.paper, 0.95),
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            borderRadius: 4,
                            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`
                        }}
                    >
                        <Stack spacing={4} alignItems="center">
                            {/* Enhanced Logo */}
                            <Box sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                                animation: 'pulse 2s infinite'
                            }}>
                                <LoginIcon sx={{ fontSize: 40, color: 'white' }} />
                            </Box>

                            <Box textAlign="center">
                                <Typography 
                                    variant="h3" 
                                    component="h1"
                                    gutterBottom
                                    sx={{ 
                                        fontWeight: 700,
                                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    Welcome Back
                                </Typography>
                                <Typography 
                                    variant="body1" 
                                    color="text.secondary"
                                    sx={{ fontSize: '1.1rem' }}
                                >
                                    Sign in to your account to continue
                                </Typography>
                            </Box>

                            {error && (
                                <Alert 
                                    severity="error" 
                                    sx={{ 
                                        width: '100%',
                                        borderRadius: 2,
                                        '& .MuiAlert-message': { fontSize: '1rem' }
                                    }}
                                >
                                    {error}
                                </Alert>
                            )}

                            <Box 
                                component="form" 
                                onSubmit={handleSubmit} 
                                sx={{ width: '100%' }}
                            >
                                <Stack spacing={3}>
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        variant="outlined"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <EmailIcon sx={{ color: theme.palette.primary.main }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                '& fieldset': {
                                                    borderColor: alpha(theme.palette.primary.main, 0.3),
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: alpha(theme.palette.primary.main, 0.5),
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: theme.palette.primary.main,
                                                },
                                            },
                                        }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        variant="outlined"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockIcon sx={{ color: theme.palette.primary.main }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={togglePasswordVisibility}
                                                        edge="end"
                                                        aria-label="toggle password visibility"
                                                    >
                                                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                '& fieldset': {
                                                    borderColor: alpha(theme.palette.primary.main, 0.3),
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: alpha(theme.palette.primary.main, 0.5),
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: theme.palette.primary.main,
                                                },
                                            },
                                        }}
                                    />

                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        disabled={isLoading}
                                        size="large"
                                        startIcon={isLoading ? <CircularProgress size={20} /> : <LoginIcon />}
                                        sx={{
                                            py: 1.5,
                                            borderRadius: 2,
                                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                            fontSize: '1.1rem',
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.4)}`,
                                            '&:hover': {
                                                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.6)}`,
                                            },
                                            '&:disabled': {
                                                background: alpha(theme.palette.primary.main, 0.5),
                                                transform: 'none',
                                            },
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                    >
                                        {isLoading ? 'Signing In...' : 'Sign In'}
                                    </Button>

                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={handleCreateTestUser}
                                        disabled={isLoading}
                                        sx={{
                                            py: 1.5,
                                            mt: 2,
                                            borderRadius: 2,
                                            fontSize: '1rem',
                                            fontWeight: 500,
                                            textTransform: 'none',
                                            borderColor: theme.palette.primary.main,
                                            color: theme.palette.primary.main,
                                            '&:hover': {
                                                borderColor: theme.palette.primary.dark,
                                                background: alpha(theme.palette.primary.main, 0.1),
                                            },
                                            '&:disabled': {
                                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                                color: alpha(theme.palette.primary.main, 0.3),
                                            }
                                        }}
                                    >
                                        Create Test User & Login
                                    </Button>
                                </Stack>
                            </Box>

                            <Divider sx={{ width: '100%', my: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    or
                                </Typography>
                            </Divider>

                            <Box textAlign="center">
                                <Typography variant="body1" color="text.secondary">
                                    Don't have an account?{' '}
                                    <MuiLink
                                        component={Link}
                                        to="/signup"
                                        sx={{ 
                                            color: theme.palette.primary.main,
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                            '&:hover': {
                                                textDecoration: 'underline',
                                                color: theme.palette.primary.dark,
                                            }
                                        }}
                                    >
                                        Sign up here
                                    </MuiLink>
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Fade>
            </Container>
        </Box>
    );
};

export default LoginPage;
