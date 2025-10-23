import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Video Transcription": "Video Transcription",
      "Dashboard": "Dashboard",
      "Sign in": "Sign in",
      "Sign up": "Sign up",
      "Profile": "Profile",
      "Logout": "Logout",
      "Language": "Language",
      "Theme": "Theme",
      // Add more keys as needed
    }
  },
  vi: {
    translation: {
      "Video Transcription": "Chuyển Đổi Video",
      "Dashboard": "Bảng Điều Khiển",
      "Sign in": "Đăng Nhập",
      "Sign up": "Đăng Ký",
      "Profile": "Hồ Sơ",
      "Logout": "Đăng Xuất",
      "Language": "Ngôn Ngữ",
      "Theme": "Chủ Đề",
      // Add more keys as needed
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en', 

    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;