import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationEN from './locales/en.json';
import translationCH from './locales/ch.json';
import translationJA from './locales/ja.json';
import translationAR from './locales/ar.json';

import translationES from './locales/es.json';
import translationFR from './locales/fr.json';
import translationRU from './locales/ru.json';
import translationPT from './locales/pt.json';
import translationDE from './locales/de.json';
import translationHI from './locales/hi.json';
import translationBN from './locales/bn.json';
import translationKO from './locales/ko.json';
import translationIT from './locales/it.json';
import translationTR from './locales/tr.json';
import translationVI from './locales/vi.json';
import translationNL from './locales/nl.json';

// Configure supported languages and translations
const resources = {
  en: {
    translation: translationEN
  },
  zh: {
    translation: translationCH
  },
  ja: {
    translation: translationJA
  },
  ar: {
    translation: translationAR
  },
  es: {
    translation: translationES
  },
  fr: {
    translation: translationFR
  },
  ru: {
    translation: translationRU
  },
  pt: {
    translation: translationPT
  },
  de: {
    translation: translationDE
  },
  hi: {
    translation: translationHI
  },
  bn: {
    translation: translationBN
  },
  ko: {
    translation: translationKO
  },
  it: {
    translation: translationIT
  },
  tr: {
    translation: translationTR
  },
  vi: {
    translation: translationVI
  },
  nl: {
    translation: translationNL
  }
};

i18n
  .use(LanguageDetector) // Automatically detect the user's language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources, // Language translations
    fallbackLng: 'en', // Fallback to English if user's language is not supported
    debug: true,
    interpolation: {
      escapeValue: false // React already does escaping
    }
  });

export default i18n;
