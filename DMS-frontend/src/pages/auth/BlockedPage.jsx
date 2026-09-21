import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '~/auth/AuthContext';
import { Button } from '~/components/ui/Button';
import AuthShell from './AuthShell';

/** Показывается, когда администратор отключил учётную запись, пока человек был в системе */
export default function BlockedPage() {
  const { t } = useTranslation();
  const { signout } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthShell title={t('auth.blockedTitle')}>
      <p className="text-center text-sm text-gray-600">{t('auth.blockedText')}</p>
      <Button
        variant="danger"
        className="mt-6 w-full"
        onClick={async () => {
          await signout();
          navigate('/signin');
        }}
      >
        {t('header.signout')}
      </Button>
    </AuthShell>
  );
}
