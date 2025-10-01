import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // CSS chung
import { ThemeProvider, createTheme } from '@mui/material/styles'; // Import MUI theme provider
import './i18n'; // Import i18n config

// Tạo theme MUI cơ bản (tùy chỉnh nếu muốn)
const theme = createTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}> {/* Bọc App trong ThemeProvider */}
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)