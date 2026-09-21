import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '~/i18n';

/**
 * Переключатель языка RU | EN — «сегментированная» кнопка: выбранный язык подсвечен.
 * i18n.changeLanguage() меняет язык: все компоненты с useTranslation() перерисуются сами,
 * а выбор запоминается в localStorage (см. src/i18n/index.js).
 */
export default function LanguageSwitch() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage;

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="inline-flex overflow-hidden rounded-md border border-gray-300 text-xs font-semibold"
    >
      {LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          aria-pressed={current === lng}
          className={`px-2.5 py-1.5 uppercase transition-colors ${current === lng ? 'bg-brand text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}
