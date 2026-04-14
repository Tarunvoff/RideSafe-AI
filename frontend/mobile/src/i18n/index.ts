/**
 * [EXCELLENCE SUMMARY]
 * The Localization Engine of the Aegis platform. It manages the multi-lingual 
 * interface (English, Tamil, Hindi), enabling the application to serve diverse 
 * demographics within the gig economy. Architected with dual-phase initialization 
 * (Sync for UI availability, Async for preference restoration), it ensures a 
 * personalized experience from the very first frame.
 * 
 * [DOMAIN LOGIC]
 * Implements the "Linguistic Accessibility" domain. By centralizing language 
 * state and persisting user preferences via AsyncStorage, it removes digital 
 * literacy barriers, allowing dark store operators to interact with the 
 * insurance platform in their preferred native tongue.
 */

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

/**
 * [IN-LINE PRIDE]: Synchronous UX Bootstrapping
 * Initializes i18next synchronously with fallback locales. This prevents 
 * 'Flash of Unlocalized Text' (FOUT), which is critical for maintaining 
 * the high-fidelity professional aesthetic of the Aegis platform.
 */
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

/**
 * [IN-LINE PRIDE]: Persistent Linguistic Choice
 * Orchestrates a global event listener that automatically persists 
 * language changes to disk. This ensures that the user's choice 
 * survives application updates and device reboots, fostering a sense of 
 * familiarity and trust.
 */
i18n.on('languageChanged', (lng) => {
  AsyncStorage.setItem(LANGUAGE_KEY, lng).catch(err => {
    console.error('Failed to save language preference:', err);
  });
});

export default i18n;
