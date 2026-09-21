import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

export function Spinner({ className = '' }) {
  return <FontAwesomeIcon icon={faSpinner} spin className={`text-primary-600 ${className}`} />;
}

/** Индикатор загрузки на всю область (для страниц) */
export function PageSpinner({ label }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-gray-500" role="status">
      <Spinner className="text-2xl" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function FullPageSpinner({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <PageSpinner label={label} />
    </div>
  );
}
