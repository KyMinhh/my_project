import React, { useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Select,
  FormControl
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AccountCircle, VideoLibrary, Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { actualTheme, toggleTheme } = useThemeMode();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'en';
    i18n.changeLanguage(savedLang);
  }, [i18n]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleClose();
    navigate('/');
  };

  const handleLanguageChange = (event: any) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <VideoLibrary sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {t('Video Transcription')}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton color="inherit" onClick={toggleTheme}>
            {actualTheme === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={i18n.language}
              onChange={handleLanguageChange}
              displayEmpty
              inputProps={{ 'aria-label': 'Language' }}
              sx={{ color: 'inherit', '& .MuiSelect-icon': { color: 'inherit' } }}
            >
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="vi">VI</MenuItem>
            </Select>
          </FormControl>

          {isAuthenticated ? (
            <>
              <Button color="inherit" component={Link} to="/dashboard">
                {t('Dashboard')}
              </Button>
              <Button color="inherit" component={Link} to="/subtitles">
                {t('Subtitles')}
              </Button>     
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32 }}>
                  {user?.name?.[0] || user?.email?.[0] || <AccountCircle />}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
                  {t('Profile')}
                </MenuItem>
                <MenuItem onClick={handleLogout}>{t('Logout')}</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                {t('Sign in')}
              </Button>
              <Button color="inherit" component={Link} to="/signup">
                {t('Sign up')}
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
