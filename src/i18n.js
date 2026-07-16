import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const SUPPORTED_LANGUAGES = ['vi', 'en'];
const languageLoaders = {
  en: () => import('./locales/en/index.js'),
  vi: () => import('./locales/vi/index.js'),
};

const normalizeLanguage = (language = 'en') => {
  const normalized = language.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : 'en';
};

const loadLanguageResources = async (language) => {
  const normalizedLanguage = normalizeLanguage(language);
  const module = await languageLoaders[normalizedLanguage]();
  return module.default;
};

const localJsonBackend = {
  type: 'backend',
  read(language, namespace, callback) {
    loadLanguageResources(language)
      .then((resources) => callback(null, resources))
      .catch((error) => callback(error, false));
  },
};

if (!localStorage.getItem('i18nextLng')) {
  localStorage.setItem('i18nextLng', 'en');
}

const i18nReady = i18n
  .use(localJsonBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: false,
    load: 'languageOnly',
    ns: ['translation'],
    defaultNS: 'translation',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export { i18nReady, loadLanguageResources };
export default i18n;