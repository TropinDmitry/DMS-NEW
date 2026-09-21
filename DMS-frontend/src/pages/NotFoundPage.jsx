import { useTranslation } from 'react-i18next';
import { ButtonLink } from '~/components/ui/Button';

/** 404: страницы нет (или нет доступа к ней — намеренно не различаем, чтобы не раскрывать структуру приложения) */
export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="text-8xl font-extrabold text-primary-600">404</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('notFound.title')}</h1>
      <p className="mt-2 text-gray-600">{t('notFound.text')}</p>
      <ButtonLink to="/dashboard" className="mt-8">
        {t('notFound.home')}
      </ButtonLink>
    </div>
  );
}
