import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/auth/AuthContext';
import useForm from '~/hooks/useForm';
import { errorText } from '~/hooks/useNotify';
import { email, password } from '~/lib/validators';
import { Field, Input, PasswordInput } from '~/components/ui/Field';
import { Button } from '~/components/ui/Button';
import AuthShell, { FormError } from './AuthShell';

// Подсказка с демо-аккаунтами — только в режиме разработки (npm run dev); в собранном приложении её нет
const DEMO_ACCOUNTS = [
  { label: 'Админ', email: 'admin@dms.local', password: 'admin123' },
  { label: 'Модератор', email: 'moderator@dms.local', password: 'moderator123' },
  { label: 'Сотрудник', email: 'ivanov@dms.local', password: 'user1234' },
];

export default function SignInPage() {
  const { t } = useTranslation();
  const { signin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const form = useForm({ email: '', password: '' }, { email, password });

  const onSubmit = form.submit(async (values) => {
    setServerError('');
    try {
      await signin(values.email.trim(), values.password);
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true }); // туда, куда человек шёл до перехода на вход
    } catch (err) {
      setServerError(errorText(t, err));
    }
  });

  return (
    <AuthShell title={t('auth.signinTitle')}>
      <form onSubmit={onSubmit} noValidate>
        <FormError>{serverError}</FormError>
        <div className="space-y-4">
          <Field label={t('auth.email')} error={form.errors.email}>
            <Input
              type="email"
              autoComplete="username"
              value={form.values.email}
              onChange={form.change('email')}
              onBlur={form.blur('email')}
              invalid={!!form.errors.email}
            />
          </Field>
          <Field label={t('auth.password')} error={form.errors.password}>
            <PasswordInput
              autoComplete="current-password"
              value={form.values.password}
              onChange={form.change('password')}
              invalid={!!form.errors.password}
            />
          </Field>
        </div>
        <div className="mt-3 text-right text-sm">
          <Link to="/forgot-password" className="text-primary-600 hover:underline">
            {t('auth.forgotLink')}
          </Link>
        </div>
        <Button type="submit" loading={form.submitting} className="mt-5 w-full">
          {t('auth.signin')}
        </Button>
        <p className="mt-4 text-center text-sm text-gray-600">
          {t('auth.noAccount')}{' '}
          <Link to="/signup" className="text-primary-600 hover:underline">
            {t('auth.signupLink')}
          </Link>
        </p>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-6 rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-600">
          <div className="mb-2 font-medium">Demo (dev only)</div>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  form.setValues({ email: a.email, password: a.password });
                }}
                className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
