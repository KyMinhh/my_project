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
    Stack
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { resetPasswordApi } from '../services/authApi';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';

const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const theme = useTheme();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (!token) {
            setError('Token không hợp lệ');
            return;
        }

        setIsLoading(true);

        try {
            const response = await resetPasswordApi(token, password);
            
            if (response.success) {
                setSuccess('Đặt lại mật khẩu thành công! Đang chuyển hướng đến trang đăng nhập...');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setError(response.message || 'Có lỗi xảy ra, vui lòng thử lại');
            }
        } catch (error: any) {
            console.error('Reset password error:', error);
            setError('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setIsLoading(false);
        }
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
                            {/* Logo */}
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
                                <LockResetIcon sx={{ fontSize: 40, color: 'white' }} />
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
                                    Đặt lại mật khẩu
                                </Typography>
                                <Typography 
                                    variant="body1" 
                                    color="text.secondary"
                                    sx={{ fontSize: '1.1rem' }}
                                >
                                    Nhập mật khẩu mới của bạn
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

                            {success && (
                                <Alert 
                                    severity="success" 
                                    sx={{ 
                                        width: '100%',
                                        borderRadius: 2,
                                        '& .MuiAlert-message': { fontSize: '1rem' }
                                    }}
                                >
                                    {success}
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
                                        label="Mật khẩu mới"
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
                                                        onClick={() => setShowPassword(!showPassword)}
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

                                    <TextField
                                        fullWidth
                                        label="Xác nhận mật khẩu"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        edge="end"
                                                        aria-label="toggle confirm password visibility"
                                                    >
                                                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
                                        startIcon={isLoading ? <CircularProgress size={20} /> : <LockResetIcon />}
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
                                        {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                                    </Button>
                                </Stack>
                            </Box>

                            <Box textAlign="center">
                                <MuiLink
                                    component={Link}
                                    to="/login"
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
                                    Quay lại đăng nhập
                                </MuiLink>
                            </Box>
                        </Stack>
                    </Paper>
                </Fade>
            </Container>
        </Box>
    );
};

export default ResetPasswordPage;
