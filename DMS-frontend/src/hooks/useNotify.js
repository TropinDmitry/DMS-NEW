import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

/**
 * Всплывающие уведомления с переводом.
 *   const notify = useNotify();
 *   notify.ok('common.saved');     // зелёное сообщение с текстом из переводов
 *   notify.fail(error);            // красное: текст берётся по коду ошибки сервера (errors.EMAIL_TAKEN и т. д.)
 */
export default function useNotify() {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      ok: (key, values) => toast.success(t(key, values)),
      fail: (error) => toast.error(errorText(t, error)),
    }),
    [t],
  );
}

/** Текст ошибки для пользователя по коду из ответа сервера */
export function errorText(t, error) {
  const code = error?.code ?? 'UNKNOWN';
  return t(`errors.${code}`, { defaultValue: t('errors.UNKNOWN') });
}
