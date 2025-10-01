import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark', // or 'light' tuỳ sở thích
        primary: { main: '#6366f1' }, // Indigo
        secondary: { main: '#fbbf24' }, // Yellow
        background: { default: '#18181b', paper: '#232336' },
        text: { primary: '#f4f4f5', secondary: '#a1a1aa' },
    },
    shape: { borderRadius: 16 },
    typography: {
        fontFamily: 'Inter, Roboto, Arial, sans-serif',
        h5: { fontWeight: 700 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 12, padding: '12px 24px' },
                contained: { boxShadow: '0 2px 8px rgba(99,102,241,0.12)' },
            },
        },
        MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
        MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.09)' } } },
    },
});

export default theme;
