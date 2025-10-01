import React, { useState } from 'react';
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  alpha,
  useTheme,
  Fade
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  SettingsBrightness as SystemIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { themeMode, actualTheme, setThemeMode } = useThemeMode();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    handleClose();
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      case 'system':
        return <SystemIcon />;
      default:
        return <PaletteIcon />;
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'system':
        return `System (${actualTheme})`;
      default:
        return 'Theme';
    }
  };

  return (
    <>
      <Tooltip title={getThemeLabel()} arrow>
        <IconButton
          onClick={handleClick}
          size="medium"
          sx={{
            color: theme.palette.text.primary,
            background: alpha(theme.palette.primary.main, 0.1),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            '&:hover': {
              background: alpha(theme.palette.primary.main, 0.2),
              transform: 'scale(1.05)',
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {getThemeIcon()}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        TransitionComponent={Fade}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: 2,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            '& .MuiMenuItem-root': {
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.1),
              },
            },
          },
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Theme Preference
          </Typography>
        </Box>

        <MenuItem
          onClick={() => handleThemeChange('light')}
          selected={themeMode === 'light'}
          sx={{
            ...(themeMode === 'light' && {
              background: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }),
          }}
        >
          <ListItemIcon>
            <LightModeIcon 
              sx={{ 
                color: themeMode === 'light' ? theme.palette.primary.main : 'inherit'
              }} 
            />
          </ListItemIcon>
          <ListItemText 
            primary="Light Mode" 
            secondary="Bright and clean interface"
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: themeMode === 'light' ? 600 : 400,
              },
            }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => handleThemeChange('dark')}
          selected={themeMode === 'dark'}
          sx={{
            ...(themeMode === 'dark' && {
              background: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }),
          }}
        >
          <ListItemIcon>
            <DarkModeIcon 
              sx={{ 
                color: themeMode === 'dark' ? theme.palette.primary.main : 'inherit'
              }} 
            />
          </ListItemIcon>
          <ListItemText 
            primary="Dark Mode" 
            secondary="Easy on the eyes"
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: themeMode === 'dark' ? 600 : 400,
              },
            }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => handleThemeChange('system')}
          selected={themeMode === 'system'}
          sx={{
            ...(themeMode === 'system' && {
              background: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }),
          }}
        >
          <ListItemIcon>
            <SystemIcon 
              sx={{ 
                color: themeMode === 'system' ? theme.palette.primary.main : 'inherit'
              }} 
            />
          </ListItemIcon>
          <ListItemText 
            primary="System" 
            secondary={`Follows system preference (${actualTheme})`}
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: themeMode === 'system' ? 600 : 400,
              },
            }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ThemeToggle;
