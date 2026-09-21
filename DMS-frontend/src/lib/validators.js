/*
 * Валидаторы полей. Каждый принимает значение и возвращает КЛЮЧ ПЕРЕВОДА с текстом ошибки (или '' если всё хорошо).
 * Раньше валидатор сам дёргал setState для «ошибка есть/нет» и «текст ошибки» — проверка была смешана с интерфейсом.
 * Теперь это чистые функции: их легко читать, повторно использовать и тестировать.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const required = (value) => (String(value ?? '').trim() ? '' : 'validation.required');
export const email = (value) =>
  !String(value ?? '').trim() ? 'validation.required' : EMAIL_RE.test(value.trim()) ? '' : 'validation.email';
export const password = (value) => (!value ? 'validation.required' : value.length < 6 ? 'validation.passwordMin' : '');
export const sameAs = (other) => (value) => (!value ? 'validation.required' : value !== other ? 'validation.passwordMatch' : '');
