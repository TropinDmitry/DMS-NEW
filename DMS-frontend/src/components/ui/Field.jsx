import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-regular-svg-icons';

/*
 * Поля форм. Компонент Field — обёртка «подпись + поле + текст ошибки».
 * Подпись — это <label>, внутрь которого вложено поле: браузер сам связывает их (клик по подписи
 * фокусирует поле, экранный диктор читает подпись) — id и htmlFor вручную не нужны.
 */
export function Field({ label, error, hint, required, className = '', children }) {
  const { t } = useTranslation();
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{t(error, { defaultValue: error })}</span>}
    </label>
  );
}

const controlBase =
  'block w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:bg-gray-100 disabled:text-gray-500';
export const controlClass = (invalid) => `${controlBase} ${invalid ? 'border-red-500' : 'border-gray-300'}`;

export function Input({ invalid, className = '', ...rest }) {
  return <input className={`${controlClass(invalid)} ${className}`} {...rest} />;
}

export function Textarea({ invalid, className = '', rows = 4, ...rest }) {
  return <textarea rows={rows} className={`${controlClass(invalid)} ${className}`} {...rest} />;
}

/** Выпадающий список. options: [{ value, label }]; placeholder — пустой первый пункт («Все», «— выберите —») */
export function Select({ options = [], placeholder, invalid, className = '', ...rest }) {
  return (
    <select className={`${controlClass(invalid)} ${className}`} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Поле пароля с кнопкой «показать/скрыть» */
export function PasswordInput({ invalid, ...rest }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input type={visible ? 'text' : 'password'} className={`${controlClass(invalid)} pr-10`} {...rest} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500 hover:text-gray-800"
      >
        <FontAwesomeIcon icon={visible ? faEye : faEyeSlash} />
      </button>
    </div>
  );
}
