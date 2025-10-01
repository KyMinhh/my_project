import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
// (tip: move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
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
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en', // language to use, more info here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false // react already does escaping
    }
  });

export default i18n;