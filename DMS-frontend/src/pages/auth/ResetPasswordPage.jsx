import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '~/api';
import useForm from '~/hooks/useForm';
import { errorText } from '~/hooks/useNotify';
import { password, sameAs } from '~/lib/validators';
import { Field, PasswordInput } from '~/components/ui/Field';
import { Button, ButtonLink } from '~/components/ui/Button';
import AuthShell, { FormError } from './AuthShell';

/** Страница, на которую ведёт ссылка из письма: /reset-password?token=... */
export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const form = useForm({ password: '', confirm: '' }, { password, confirm: (v, all) => sameAs(all.password)(v) });

  const onSubmit = form.submit(async (v) => {
    setServerError('');
    try {
      await authApi.resetPassword({ token, password: v.password });
      setDone(true);
    } catch (err) {
      setServerError(errorText(t, err));
    }
  });

  if (done) {
    return (
      <AuthShell title={t('auth.resetDoneTitle')}>
        <p className="text-center text-sm text-gray-600">{t('auth.resetDoneText')}</p>
        <ButtonLink to="/signin" className="mt-6 w-full">
          {t('auth.signin')}
        </ButtonLink>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell title={t('auth.resetTitle')}>
        <FormError>{t('errors.RESET_TOKEN_INVALID')}</FormError>
        <Link to="/forgot-password" className="block text-center text-sm text-primary-600 hover:underline">
          {t('auth.forgotTitle')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.resetTitle')}>
      <form onSubmit={onSubmit} noValidate>
        <FormError>{serverError}</FormError>
        <div className="space-y-4">
          <Field label={t('profile.newPassword')} error={form.errors.password}>
            <PasswordInput
              autoComplete="new-password"
              value={form.values.password}
              onChange={form.change('password')}
              invalid={!!form.errors.password}
            />
          </Field>
          <Field label={t('auth.confirmPassword')} error={form.errors.confirm}>
            <PasswordInput
              autoComplete="new-password"
              value={form.values.confirm}
              onChange={form.change('confirm')}
              invalid={!!form.errors.confirm}
            />
          </Field>
        </div>
        <Button type="submit" loading={form.submitting} className="mt-6 w-full">
          {t('auth.resetSubmit')}
        </Button>
      </form>
    </AuthShell>
  );
}
