import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '~/api';
import useForm from '~/hooks/useForm';
import { errorText } from '~/hooks/useNotify';
import { email } from '~/lib/validators';
import { Field, Input } from '~/components/ui/Field';
import { Button } from '~/components/ui/Button';
import AuthShell, { FormError } from './AuthShell';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState('');
  const [sent, setSent] = useState(null); // ответ сервера после отправки
  const form = useForm({ email: '' }, { email });

  const onSubmit = form.submit(async (v) => {
    setServerError('');
    try {
      setSent(await authApi.forgotPassword({ email: v.email.trim() }));
    } catch (err) {
      setServerError(errorText(t, err));
    }
  });

  if (sent) {
    // В режиме разработки сервер возвращает саму ссылку (настоящей почты нет) — показываем её, чтобы не лезть в консоль
    const devLink = sent.devResetLink ? new URL(sent.devResetLink) : null;
    return (
      <AuthShell title={t('auth.forgotSentTitle')}>
        <p className="text-center text-sm text-gray-600">{t('auth.forgotSentText')}</p>
        {devLink && (
          <div className="mt-4 rounded-md border border-dashed border-amber-400 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="mb-1 font-medium">{t('auth.devLinkNote')}</div>
            <Link to={devLink.pathname + devLink.search} className="break-all text-primary-600 underline">
              {devLink.pathname}
              {devLink.search.slice(0, 40)}…
            </Link>
          </div>
        )}
        <Link to="/signin" className="mt-6 block text-center text-sm text-primary-600 hover:underline">
          {t('auth.backToSignin')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
      <form onSubmit={onSubmit} noValidate>
        <FormError>{serverError}</FormError>
        <Field label={t('auth.email')} error={form.errors.email}>
          <Input
            type="email"
            autoComplete="email"
            value={form.values.email}
            onChange={form.change('email')}
            onBlur={form.blur('email')}
            invalid={!!form.errors.email}
          />
        </Field>
        <Button type="submit" loading={form.submitting} className="mt-6 w-full">
          {t('auth.sendLink')}
        </Button>
        <Link to="/signin" className="mt-4 block text-center text-sm text-primary-600 hover:underline">
          {t('auth.backToSignin')}
        </Link>
      </form>
    </AuthShell>
  );
}
