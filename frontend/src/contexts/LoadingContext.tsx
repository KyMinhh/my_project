import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Backdrop,
  CircularProgress,
  Typography,
  Box,
  Fade,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  type?: 'spinner' | 'linear' | 'dots';
}

interface LoadingContextType {
  loading: LoadingState;
  showLoading: (message?: string, type?: 'spinner' | 'linear' | 'dots') => void;
  hideLoading: () => void;
  updateProgress: (progress: number) => void;
  updateMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    message: 'Loading...',
    progress: 0,
    type: 'spinner'
  });

  const theme = useTheme();

  const showLoading = (message = 'Loading...', type: 'spinner' | 'linear' | 'dots' = 'spinner') => {
    setLoading({
      isLoading: true,
      message,
      progress: 0,
      type
    });
  };

  const hideLoading = () => {
    setLoading(prev => ({
      ...prev,
      isLoading: false
    }));
  };

  const updateProgress = (progress: number) => {
    setLoading(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress))
    }));
  };

  const updateMessage = (message: string) => {
    setLoading(prev => ({
      ...prev,
      message
    }));
  };

  const DotsLoader = () => (
    <Box display="flex" alignItems="center" gap={1}>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            animation: `dotPulse 1.5s infinite ${index * 0.2}s`,
            '@keyframes dotPulse': {
              '0%, 80%, 100%': {
                transform: 'scale(0.8)',
                opacity: 0.5,
              },
              '40%': {
                transform: 'scale(1)',
                opacity: 1,
              },
            }
          }}
        />
      ))}
    </Box>
  );

  const renderLoader = () => {
    switch (loading.type) {
      case 'linear':
        return (
          <Box sx={{ width: '300px', maxWidth: '80vw' }}>
            <LinearProgress 
              variant={loading.progress ? 'determinate' : 'indeterminate'}
              value={loading.progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }
              }}
            />
            {loading.progress !== undefined && loading.progress > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                {Math.round(loading.progress)}%
              </Typography>
            )}
          </Box>
        );
      case 'dots':
        return <DotsLoader />;
      default:
        return (
          <CircularProgress 
            size={60}
            thickness={4}
            sx={{
              color: theme.palette.primary.main,
              animationDuration: '1s',
            }}
          />
        );
    }
  };

  return (
    <LoadingContext.Provider value={{
      loading,
      showLoading,
      hideLoading,
      updateProgress,
      updateMessage
    }}>
      {children}
      
      <Backdrop
        open={loading.isLoading}
        sx={{
          color: '#fff',
          zIndex: theme.zIndex.modal + 1,
          background: alpha(theme.palette.background.default, 0.8),
          backdropFilter: 'blur(10px)',
        }}
      >
        <Fade in={loading.isLoading} timeout={300}>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={3}
            sx={{
              background: alpha(theme.palette.background.paper, 0.95),
              padding: 4,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
              minWidth: 200,
              textAlign: 'center'
            }}
          >
            {renderLoader()}
            
            <Typography 
              variant="h6" 
              color="text.primary"
              sx={{ 
                fontWeight: 500,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {loading.message}
            </Typography>
          </Box>
        </Fade>
      </Backdrop>
    </LoadingContext.Provider>
  );
};
