import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { FullPageSpinner } from '~/components/ui/Spinner';
import BlockedPage from '~/pages/auth/BlockedPage';
import NotFoundPage from '~/pages/NotFoundPage';

/*
 * «Охранники» маршрутов. Оборачивают группу страниц: пока условие не выполнено,
 * вместо страницы показывается что-то другое. <Outlet /> — место, куда React Router подставит вложенную страницу.
 * ВАЖНО: это лишь удобство интерфейса. Настоящую защиту делает сервер (проверяет токен и роль на каждый запрос).
 */

/** Пускает только вошедших; остальных отправляет на /signin и запоминает, куда они шли */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'disabled') return <BlockedPage />;
  if (status !== 'authenticated') return <Navigate to="/signin" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Страницы для гостей (вход, регистрация): вошедшего перенаправляем на главную */
export function PublicOnly() {
  const { status } = useAuth();
  const { t } = useTranslation();
  if (status === 'loading') return <FullPageSpinner label={t('common.loading')} />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Пускает только указанные роли: <Route element={<RequireRole roles={['admin']} />}> */
export function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <NotFoundPage />;
  return <Outlet />;
}
