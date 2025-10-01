import React from 'react';
import {
  Box,
  Skeleton,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider
} from '@mui/material';

// Profile Page Skeleton
export const ProfileSkeleton: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Box maxWidth="lg" sx={{ mx: 'auto', py: 4, px: 2 }}>
      <Stack spacing={4}>
        {/* Profile Header Skeleton */}
        <Card 
          elevation={0}
          sx={{ 
            p: 4,
            background: alpha(theme.palette.background.paper, 0.6),
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
        >
          <Box display="flex" alignItems="center" gap={4} flexDirection={{ xs: 'column', md: 'row' }}>
            <Skeleton 
              variant="circular" 
              width={140} 
              height={140}
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                flexShrink: 0
              }}
            />
            <Box flex={1} width="100%">
              <Skeleton 
                variant="text" 
                width="60%" 
                height={50}
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
              />
              <Skeleton 
                variant="text" 
                width="40%" 
                height={20}
                sx={{ mt: 1, bgcolor: alpha(theme.palette.primary.main, 0.08) }}
              />
              <Skeleton 
                variant="text" 
                width="80%" 
                height={60}
                sx={{ mt: 2, bgcolor: alpha(theme.palette.primary.main, 0.08) }}
              />
              <Box display="flex" gap={1} mt={2}>
                <Skeleton variant="rounded" width={80} height={32} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }} />
                <Skeleton variant="rounded" width={100} height={32} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }} />
                <Skeleton variant="rounded" width={90} height={32} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }} />
              </Box>
            </Box>
          </Box>
        </Card>

        {/* Stats Cards Skeleton */}
        <Box display="flex" flexWrap="wrap" gap={3}>
          {[1, 2, 3, 4].map((item) => (
            <Box key={item} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
              <Card 
                elevation={0}
                sx={{ 
                  height: 120,
                  background: alpha(theme.palette.background.paper, 0.6),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Skeleton 
                    variant="circular" 
                    width={50} 
                    height={50} 
                    sx={{ 
                      mx: 'auto', 
                      mb: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    }} 
                  />
                  <Skeleton 
                    variant="text" 
                    width="60%" 
                    height={30}
                    sx={{ 
                      mx: 'auto', 
                      bgcolor: alpha(theme.palette.primary.main, 0.08)
                    }}
                  />
                  <Skeleton 
                    variant="text" 
                    width="80%" 
                    height={20}
                    sx={{ 
                      mx: 'auto',
                      bgcolor: alpha(theme.palette.primary.main, 0.06)
                    }}
                  />
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Stack>
    </Box>
  );
};

// Card List Skeleton
export const CardListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  const theme = useTheme();
  
  return (
    <Box display="flex" flexWrap="wrap" gap={3}>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.33% - 16px)' } }}>
          <Card 
            elevation={0}
            sx={{ 
              background: alpha(theme.palette.background.paper, 0.6),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}
          >
            <Skeleton 
              variant="rectangular" 
              height={200}
              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
            />
            <CardContent>
              <Skeleton 
                variant="text" 
                width="80%" 
                height={25}
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}
              />
              <Skeleton 
                variant="text" 
                width="60%" 
                height={20}
                sx={{ mt: 1, bgcolor: alpha(theme.palette.primary.main, 0.06) }}
              />
              <Box display="flex" justifyContent="space-between" mt={2}>
                <Skeleton 
                  variant="rounded" 
                  width={80} 
                  height={30}
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}
                />
                <Skeleton 
                  variant="rounded" 
                  width={60} 
                  height={30}
                  sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.08) }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  );
};

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  const theme = useTheme();
  
  return (
    <Card 
      elevation={0}
      sx={{ 
        background: alpha(theme.palette.background.paper, 0.6),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
      }}
    >
      <CardContent>
        {/* Table Header */}
        <Box display="flex" gap={2} mb={2}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton 
              key={index}
              variant="text" 
              width={`${100 / columns}%`} 
              height={25}
              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
            />
          ))}
        </Box>
        
        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Box key={rowIndex} display="flex" gap={2} mb={1}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex}
                variant="text" 
                width={`${100 / columns}%`} 
                height={20}
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}
              />
            ))}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

// Form Skeleton
export const FormSkeleton: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Card 
      elevation={0}
      sx={{ 
        p: 4,
        background: alpha(theme.palette.background.paper, 0.6),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
      }}
    >
      <Stack spacing={3}>
        <Skeleton 
          variant="text" 
          width="40%" 
          height={40}
          sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
        />
        
        {[1, 2, 3, 4].map((item) => (
          <Box key={item}>
            <Skeleton 
              variant="text" 
              width="20%" 
              height={20}
              sx={{ 
                mb: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.08)
              }}
            />
            <Skeleton 
              variant="rounded" 
              width="100%" 
              height={56}
              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}
            />
          </Box>
        ))}
        
        <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
          <Skeleton 
            variant="rounded" 
            width={100} 
            height={40}
            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}
          />
          <Skeleton 
            variant="rounded" 
            width={120} 
            height={40}
            sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.08) }}
          />
        </Box>
      </Stack>
    </Card>
  );
};

// Text Content Skeleton
export const TextSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  const theme = useTheme();
  
  return (
    <Stack spacing={1}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton 
          key={index}
          variant="text" 
          width={index === lines - 1 ? '60%' : '100%'}
          height={20}
          sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}
        />
      ))}
    </Stack>
  );
};
