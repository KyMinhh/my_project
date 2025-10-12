import React from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    Box,
    Typography
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';

interface LanguageSelectorProps {
    value: string;
    onChange: (languageCode: string) => void;
    disabled?: boolean;
    label?: string;
    size?: 'small' | 'medium';
}

const SUPPORTED_LANGUAGES = [
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文 (Chinese)' },
    { code: 'ja', name: '日本語 (Japanese)' },
    { code: 'ko', name: '한국어 (Korean)' },
    { code: 'th', name: 'ไทย (Thai)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'de', name: 'Deutsch (German)' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'it', name: 'Italiano (Italian)' },
    { code: 'pt', name: 'Português (Portuguese)' },
    { code: 'ru', name: 'Русский (Russian)' },
    { code: 'ar', name: 'العربية (Arabic)' },
    { code: 'hi', name: 'हिन्दी (Hindi)' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'ms', name: 'Bahasa Melayu' },
    { code: 'tl', name: 'Filipino' },
    { code: 'nl', name: 'Nederlands (Dutch)' },
    { code: 'sv', name: 'Svenska (Swedish)' },
    { code: 'da', name: 'Dansk (Danish)' },
    { code: 'no', name: 'Norsk (Norwegian)' },
    { code: 'fi', name: 'Suomi (Finnish)' },
    { code: 'pl', name: 'Polski (Polish)' },
    { code: 'cs', name: 'Čeština (Czech)' },
    { code: 'sk', name: 'Slovenčina (Slovak)' },
    { code: 'hu', name: 'Magyar (Hungarian)' },
    { code: 'ro', name: 'Română (Romanian)' },
    { code: 'bg', name: 'Български (Bulgarian)' },
    { code: 'hr', name: 'Hrvatski (Croatian)' },
    { code: 'sr', name: 'Српски (Serbian)' },
    { code: 'sl', name: 'Slovenščina (Slovenian)' },
    { code: 'et', name: 'Eesti (Estonian)' },
    { code: 'lv', name: 'Latviešu (Latvian)' },
    { code: 'lt', name: 'Lietuvių (Lithuanian)' },
    { code: 'uk', name: 'Українська (Ukrainian)' },
    { code: 'be', name: 'Беларуская (Belarusian)' },
    { code: 'mk', name: 'Македонски (Macedonian)' },
    { code: 'sq', name: 'Shqip (Albanian)' },
    { code: 'mt', name: 'Malti (Maltese)' },
    { code: 'is', name: 'Íslenska (Icelandic)' },
    { code: 'ga', name: 'Gaeilge (Irish)' },
    { code: 'cy', name: 'Cymraeg (Welsh)' },
    { code: 'eu', name: 'Euskera (Basque)' },
    { code: 'ca', name: 'Català (Catalan)' },
    { code: 'gl', name: 'Galego (Galician)' },
    { code: 'tr', name: 'Türkçe (Turkish)' },
    { code: 'he', name: 'עברית (Hebrew)' },
    { code: 'fa', name: 'فارسی (Persian)' },
    { code: 'ur', name: 'اردو (Urdu)' },
    { code: 'bn', name: 'বাংলা (Bengali)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml', name: 'മലയാളം (Malayalam)' },
    { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'mr', name: 'मराठी (Marathi)' },
    { code: 'ne', name: 'नेपाली (Nepali)' },
    { code: 'si', name: 'සිංහල (Sinhala)' },
    { code: 'my', name: 'မြန်မာ (Myanmar)' },
    { code: 'km', name: 'ខ្មែរ (Khmer)' },
    { code: 'lo', name: 'ລາວ (Lao)' },
    { code: 'ka', name: 'ქართული (Georgian)' },
    { code: 'am', name: 'አማርኛ (Amharic)' },
    { code: 'sw', name: 'Kiswahili (Swahili)' },
    { code: 'zu', name: 'isiZulu (Zulu)' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'xh', name: 'isiXhosa (Xhosa)' },
    { code: 'st', name: 'Sesotho (Southern Sotho)' },
    { code: 'tn', name: 'Setswana (Tswana)' },
    { code: 'nso', name: 'Sepedi (Northern Sotho)' },
    { code: 'ts', name: 'Xitsonga (Tsonga)' },
    { code: 've', name: 'Tshivenda (Venda)' },
    { code: 'ss', name: 'siSwati (Swati)' },
    { code: 'nr', name: 'isiNdebele (Southern Ndebele)' }
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    value,
    onChange,
    disabled = false,
    label = "Chọn ngôn ngữ đích",
    size = 'small'
}) => {
    const handleChange = (event: SelectChangeEvent) => {
        onChange(event.target.value);
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TranslateIcon fontSize="small" color="primary" />
            <FormControl size={size} sx={{ minWidth: 200 }} disabled={disabled}>
                <InputLabel id="language-selector-label">{label}</InputLabel>
                <Select
                    labelId="language-selector-label"
                    value={value}
                    label={label}
                    onChange={handleChange}
                    sx={{
                        '& .MuiSelect-select': {
                            display: 'flex',
                            alignItems: 'center',
                        }
                    }}
                >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <MenuItem key={lang.code} value={lang.code}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Typography variant="body2" fontWeight={500}>
                                    {lang.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {lang.code.toUpperCase()}
                                </Typography>
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
};

export default LanguageSelector;

// Export helper function để lấy tên ngôn ngữ từ code
export const getLanguageName = (code: string | undefined | null): string => {
    if (!code) return 'Unknown Language';
    const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
    return language ? language.name : code.toUpperCase();
};