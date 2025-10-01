// frontend/src/pages/ForgotPasswordPage.tsx
import React, { useState, FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Container,
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Stack,
    Link,
    Avatar
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset'; // Hoặc EmailIcon
// Giả sử bạn sẽ có hàm API này trong authApi.ts
// import { forgotPasswordApi } from '../services/authApi';

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!email.trim()) {
            setError("Vui lòng nhập địa chỉ email của bạn.");
            return;
        }
        setIsLoading(true);

        try {
            // TODO: Gọi API gửi yêu cầu quên mật khẩu
            // const response = await forgotPasswordApi({ email });
            // if (response.success) { // Giả sử API trả về { success: boolean, message: string }
            //     setSuccessMessage(response.message || 'Nếu email của bạn tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi.');
            //     setEmail(''); // Xóa email sau khi gửi thành công
            // } else {
            //     setError(response.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
            // }

            // **PHẦN GIẢ LẬP API CALL**
            console.log('API call to forgotPassword with email:', email);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Giả lập độ trễ mạng
            setSuccessMessage('Nếu email của bạn tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn (kể cả mục Spam).');
            setEmail('');
            // **KẾT THÚC PHẦN GIẢ LẬP**

        } catch (err: any) {
            console.error("Forgot Password Page Error:", err);
            setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 73px)' /* Giả sử chỉ có Footer ~73px */ }}>
            <Paper elevation={6} sx={{ padding: { xs: 3, sm: 4 }, width: '100%', mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
                    <LockResetIcon />
                </Avatar>
                <Typography component="h1" variant="h5" align="center" gutterBottom>
                    Quên Mật Khẩu
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                    Nhập địa chỉ email của bạn và chúng tôi sẽ gửi cho bạn một liên kết để đặt lại mật khẩu.
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Địa chỉ Email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading || !!successMessage} // Disable nếu đang load hoặc đã thành công
                        error={!!error}
                    />
                    {error && (
                        <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                            {error}
                        </Alert>
                    )}
                    {successMessage && (
                        <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
                            {successMessage}
                        </Alert>
                    )}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2, py: 1.5 }}
                        disabled={isLoading || !!successMessage}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Gửi Liên Kết Đặt Lại'}
                    </Button>
                    <Stack direction="row" justifyContent="center" sx={{ width: '100%' }}>
                        <Link component={RouterLink} to="/login" variant="body2">
                            Quay lại Đăng nhập
                        </Link>
                    </Stack>
                </Box>
            </Paper>
            {/* Footer có thể được thêm ở đây nếu bạn muốn nó trên mọi trang, hoặc để App.tsx quản lý footer chung */}
        </Container>
    );
};

export default ForgotPasswordPage;