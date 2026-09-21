import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '~/api';
import useForm from '~/hooks/useForm';
import { errorText } from '~/hooks/useNotify';
import { email, password, required, sameAs } from '~/lib/validators';
import { Field, Input, PasswordInput } from '~/components/ui/Field';
import { Button, ButtonLink } from '~/components/ui/Button';
import AuthShell, { FormError } from './AuthShell';

export default function SignUpPage() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const form = useForm(
    { fullName: '', email: '', password: '', confirm: '' },
    { fullName: required, email, password, confirm: (v, all) => sameAs(all.password)(v) },
  );

  const onSubmit = form.submit(async (v) => {
    setServerError('');
    try {
      await authApi.signup({ fullName: v.fullName.trim(), email: v.email.trim(), password: v.password });
      setDone(true);
    } catch (err) {
      setServerError(errorText(t, err));
    }
  });

  // После регистрации вход сразу невозможен: учётную запись должен подтвердить администратор
  if (done) {
    return (
      <AuthShell title={t('auth.signupDoneTitle')}>
        <p className="text-center text-sm text-gray-600">{t('auth.signupDoneText')}</p>
        <ButtonLink to="/signin" className="mt-6 w-full">
          {t('auth.backToSignin')}
        </ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.signupTitle')}>
      <form onSubmit={onSubmit} noValidate>
        <FormError>{serverError}</FormError>
        <div className="space-y-4">
          <Field label={t('auth.fullName')} error={form.errors.fullName}>
            <Input
              autoComplete="name"
              value={form.values.fullName}
              onChange={form.change('fullName')}
              onBlur={form.blur('fullName')}
              invalid={!!form.errors.fullName}
            />
          </Field>
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
          <Field label={t('auth.password')} error={form.errors.password}>
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
          {t('auth.signup')}
        </Button>
        <p className="mt-4 text-center text-sm text-gray-600">
          {t('auth.haveAccount')}{' '}
          <Link to="/signin" className="text-primary-600 hover:underline">
            {t('auth.signinLink')}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
