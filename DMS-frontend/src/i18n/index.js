import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './ru.json';
import en from './en.json';

/*
 * Интернационализация (i18n): в компонентах вместо «Сохранить» пишем t('common.save'),
 * а сам текст лежит в ru.json / en.json. Смена языка = смена набора текстов, страница перерисуется сама.
 */
const LANG_KEY = 'dms.lang';
export const LANGUAGES = ['ru', 'en'];

function savedLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return LANGUAGES.includes(saved) ? saved : 'ru';
  } catch {
    return 'ru'; // localStorage может быть недоступен (режим инкогнито и т. п.)
  }
}

i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en } },
  lng: savedLanguage(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false }, // React сам экранирует вывод
});

// При каждой смене языка запоминаем выбор и сообщаем браузеру язык страницы (для переводчиков, экранных дикторов)
document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(LANG_KEY, lng);
  } catch {
    /* не страшно */
  }
});

export default i18n;
