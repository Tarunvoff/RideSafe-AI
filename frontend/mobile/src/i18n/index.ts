import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';

const LANGUAGE_KEY = 'user-language';

const resources = {
  en: { translation: en },
  ta: { translation: ta },
  hi: { translation: hi },
};

// Initialize synchronously so the i18next instance is available immediately.
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default to English initially
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Load the saved language preference asynchronously and update if needed.
(async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && savedLanguage !== i18n.language) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (err) {
    console.error('Failed to load language preference:', err);
  }
})();

i18n.on('languageChanged', (lng) => {
  AsyncStorage.setItem(LANGUAGE_KEY, lng).catch(err => {
    console.error('Failed to save language preference:', err);
  });
});

export default i18n;
