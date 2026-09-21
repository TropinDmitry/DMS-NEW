import { useTranslation } from 'react-i18next';
import LanguageSwitch from '~/components/layout/LanguageSwitch';

/** Общая рамка для экранов входа, регистрации и восстановления пароля */
export default function AuthShell({ title, subtitle, children }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-brand to-brand-light px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitch />
      </div>
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-pop">
        <div className="mb-6 text-center">
          <img src="/favicon.svg" alt="" className="mx-auto mb-3 h-14 w-14" />
          <div className="text-3xl font-bold tracking-wide text-brand">DMS</div>
          <div className="text-xs uppercase tracking-wider text-gray-400">{t('app.tagline')}</div>
        </div>
        <h1 className="text-center text-xl font-semibold text-gray-800">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-sm text-gray-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/** Красная плашка с ошибкой над формой */
export function FormError({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </div>
  );
}
