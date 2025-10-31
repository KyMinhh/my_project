import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import YoutubePage from './pages/YoutubePage';
import TikTokPage from './pages/TikTokPage';
import RecentFilesPage from './pages/RecentFilesPage';
import TranscriptDetailPage from './pages/TranscriptDetailPage';
import CollaborativeTranscriptPage from './pages/CollaborativeTranscriptPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import SubtitlePage from './pages/SubtitlePage';
import AdminPanel from './pages/AdminPanel';
import AdminRoute from './components/AdminRoute';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeContextProvider } from './contexts/ThemeContext';
import { LoadingProvider } from './contexts/LoadingContext';

function App() {
  return (
    <ThemeContextProvider>
      <LoadingProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/transcribe/youtube" element={<YoutubePage />} />
              <Route path="/transcribe/tiktok" element={<TikTokPage />} />
              <Route path="/files" element={<RecentFilesPage />} />
              <Route path="/transcript/:jobId" element={<TranscriptDetailPage />} />
              <Route path="/collaborate/:transcriptId" element={<CollaborativeTranscriptPage />} />
              <Route path="/subtitles" element={<SubtitlePage />} />
              <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            </Routes>
          </Router>
        </AuthProvider>
      </LoadingProvider>
    </ThemeContextProvider>
  );
}

export default App;
