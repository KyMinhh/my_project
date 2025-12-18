/**
 * Language Service - Multi-language metadata and utilities
 * Supports 100+ languages for video translation
 */

// Supported languages with TTS and STT capabilities
const SUPPORTED_LANGUAGES = {
    // Southeast Asian Languages
    'vi': {
        name: 'Vietnamese',
        nativeName: 'Tiếng Việt',
        tts: true,
        stt: true,
        defaultSpeed: 1.1,
        region: 'Southeast Asia',
        rtl: false
    },
    'th': {
        name: 'Thai',
        nativeName: 'ไทย',
        tts: true,
        stt: true,
        defaultSpeed: 1.05,
        region: 'Southeast Asia',
        rtl: false
    },
    'id': {
        name: 'Indonesian',
        nativeName: 'Bahasa Indonesia',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Southeast Asia',
        rtl: false
    },
    'ms': {
        name: 'Malay',
        nativeName: 'Bahasa Melayu',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Southeast Asia',
        rtl: false
    },
    'fil': {
        name: 'Filipino',
        nativeName: 'Filipino',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Southeast Asia',
        rtl: false
    },

    // East Asian Languages
    'en': {
        name: 'English',
        nativeName: 'English',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Global',
        rtl: false
    },
    'ja': {
        name: 'Japanese',
        nativeName: '日本語',
        tts: true,
        stt: true,
        defaultSpeed: 0.95,
        region: 'East Asia',
        rtl: false
    },
    'ko': {
        name: 'Korean',
        nativeName: '한국어',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'East Asia',
        rtl: false
    },
    'zh': {
        name: 'Chinese (Simplified)',
        nativeName: '中文（简体）',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'East Asia',
        rtl: false
    },
    'zh-TW': {
        name: 'Chinese (Traditional)',
        nativeName: '中文（繁體）',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'East Asia',
        rtl: false
    },
    'yue': {
        name: 'Cantonese',
        nativeName: '粵語',
        tts: true,
        stt: true,
        defaultSpeed: 1.05,
        region: 'East Asia',
        rtl: false
    },

    // South Asian Languages
    'hi': {
        name: 'Hindi',
        nativeName: 'हिन्दी',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'South Asia',
        rtl: false
    },
    'bn': {
        name: 'Bengali',
        nativeName: 'বাংলা',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'South Asia',
        rtl: false
    },
    'ta': {
        name: 'Tamil',
        nativeName: 'தமிழ்',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'South Asia',
        rtl: false
    },
    'te': {
        name: 'Telugu',
        nativeName: 'తెలుగు',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'South Asia',
        rtl: false
    },
    'ur': {
        name: 'Urdu',
        nativeName: 'اردو',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'South Asia',
        rtl: true
    },

    // European Languages
    'es': {
        name: 'Spanish',
        nativeName: 'Español',
        tts: true,
        stt: true,
        defaultSpeed: 1.05,
        region: 'Europe',
        rtl: false
    },
    'fr': {
        name: 'French',
        nativeName: 'Français',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'de': {
        name: 'German',
        nativeName: 'Deutsch',
        tts: true,
        stt: true,
        defaultSpeed: 0.95,
        region: 'Europe',
        rtl: false
    },
    'it': {
        name: 'Italian',
        nativeName: 'Italiano',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'pt': {
        name: 'Portuguese',
        nativeName: 'Português',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'ru': {
        name: 'Russian',
        nativeName: 'Русский',
        tts: true,
        stt: true,
        defaultSpeed: 0.95,
        region: 'Europe',
        rtl: false
    },
    'pl': {
        name: 'Polish',
        nativeName: 'Polski',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'nl': {
        name: 'Dutch',
        nativeName: 'Nederlands',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'uk': {
        name: 'Ukrainian',
        nativeName: 'Українська',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'cs': {
        name: 'Czech',
        nativeName: 'Čeština',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'sv': {
        name: 'Swedish',
        nativeName: 'Svenska',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'da': {
        name: 'Danish',
        nativeName: 'Dansk',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'fi': {
        name: 'Finnish',
        nativeName: 'Suomi',
        tts: true,
        stt: true,
        defaultSpeed: 0.95,
        region: 'Europe',
        rtl: false
    },
    'no': {
        name: 'Norwegian',
        nativeName: 'Norsk',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },

    // Middle Eastern Languages
    'ar': {
        name: 'Arabic',
        nativeName: 'العربية',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Middle East',
        rtl: true
    },
    'tr': {
        name: 'Turkish',
        nativeName: 'Türkçe',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Middle East',
        rtl: false
    },
    'he': {
        name: 'Hebrew',
        nativeName: 'עברית',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Middle East',
        rtl: true
    },
    'fa': {
        name: 'Persian',
        nativeName: 'فارسی',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Middle East',
        rtl: true
    },

    // Other Languages
    'af': {
        name: 'Afrikaans',
        nativeName: 'Afrikaans',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Africa',
        rtl: false
    },
    'sw': {
        name: 'Swahili',
        nativeName: 'Kiswahili',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Africa',
        rtl: false
    },
    'el': {
        name: 'Greek',
        nativeName: 'Ελληνικά',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'hu': {
        name: 'Hungarian',
        nativeName: 'Magyar',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'ro': {
        name: 'Romanian',
        nativeName: 'Română',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    },
    'sk': {
        name: 'Slovak',
        nativeName: 'Slovenčina',
        tts: true,
        stt: true,
        defaultSpeed: 1.0,
        region: 'Europe',
        rtl: false
    }
};

/**
 * Get all supported languages
 * @returns {Array} Array of language objects
 */
function getSupportedLanguages() {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
        code,
        ...info
    }));
}

/**
 * Get languages grouped by region
 * @returns {Object} Languages grouped by region
 */
function getLanguagesByRegion() {
    const grouped = {};

    Object.entries(SUPPORTED_LANGUAGES).forEach(([code, info]) => {
        const region = info.region;
        if (!grouped[region]) {
            grouped[region] = [];
        }
        grouped[region].push({ code, ...info });
    });

    return grouped;
}

/**
 * Get language information
 * @param {string} languageCode - Language code (e.g., 'vi', 'en')
 * @returns {Object|null} Language info or null
 */
function getLanguageInfo(languageCode) {
    return SUPPORTED_LANGUAGES[languageCode] || null;
}

/**
 * Get default speaking rate for a language
 * @param {string} languageCode - Language code
 * @returns {number} Default speaking rate (0.5-2.0)
 */
function getDefaultSpeakingRate(languageCode) {
    return SUPPORTED_LANGUAGES[languageCode]?.defaultSpeed || 1.0;
}

/**
 * Check if language supports text-to-speech
 * @param {string} languageCode - Language code
 * @returns {boolean}
 */
function supportsTextToSpeech(languageCode) {
    return SUPPORTED_LANGUAGES[languageCode]?.tts || false;
}

/**
 * Check if language supports speech-to-text
 * @param {string} languageCode - Language code
 * @returns {boolean}
 */
function supportsSpeechToText(languageCode) {
    return SUPPORTED_LANGUAGES[languageCode]?.stt || false;
}

/**
 * Check if language is right-to-left
 * @param {string} languageCode - Language code
 * @returns {boolean}
 */
function isRightToLeft(languageCode) {
    return SUPPORTED_LANGUAGES[languageCode]?.rtl || false;
}

/**
 * Get popular language pairs for translation
 * @returns {Array} Array of popular translation pairs
 */
function getPopularLanguagePairs() {
    return [
        { from: 'en', to: 'vi', label: 'English → Vietnamese' },
        { from: 'vi', to: 'en', label: 'Vietnamese → English' },
        { from: 'ja', to: 'vi', label: 'Japanese → Vietnamese' },
        { from: 'ko', to: 'vi', label: 'Korean → Vietnamese' },
        { from: 'zh', to: 'vi', label: 'Chinese → Vietnamese' },
        { from: 'en', to: 'ja', label: 'English → Japanese' },
        { from: 'en', to: 'ko', label: 'English → Korean' },
        { from: 'en', to: 'zh', label: 'English → Chinese' },
        { from: 'en', to: 'es', label: 'English → Spanish' },
        { from: 'en', to: 'fr', label: 'English → French' }
    ];
}

/**
 * Validate language pair for translation
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 * @returns {Object} Validation result
 */
function validateLanguagePair(sourceLang, targetLang) {
    // Allow 'auto' for source language
    if (sourceLang !== 'auto' && !supportsSpeechToText(sourceLang)) {
        return {
            valid: false,
            error: `Source language '${sourceLang}' does not support speech-to-text`
        };
    }

    if (!supportsTextToSpeech(targetLang)) {
        return {
            valid: false,
            error: `Target language '${targetLang}' does not support text-to-speech`
        };
    }

    if (sourceLang === targetLang) {
        return {
            valid: false,
            error: 'Source and target languages cannot be the same'
        };
    }

    return { valid: true };
}

module.exports = {
    SUPPORTED_LANGUAGES,
    getSupportedLanguages,
    getLanguagesByRegion,
    getLanguageInfo,
    getDefaultSpeakingRate,
    supportsTextToSpeech,
    supportsSpeechToText,
    isRightToLeft,
    getPopularLanguagePairs,
    validateLanguagePair
};
