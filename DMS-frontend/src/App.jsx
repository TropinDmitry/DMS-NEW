import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicOnly, RequireAuth, RequireRole } from '~/auth/guards';
import AppLayout from '~/components/layout/AppLayout';
import { FullPageSpinner } from '~/components/ui/Spinner';

import SignInPage from '~/pages/auth/SignInPage';
import SignUpPage from '~/pages/auth/SignUpPage';
import ForgotPasswordPage from '~/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '~/pages/auth/ResetPasswordPage';
const DashboardPage = lazy(() => import('~/pages/dashboard/DashboardPage'));
const DocumentsPage = lazy(() => import('~/pages/documents/DocumentsPage'));
const DocumentFormPage = lazy(() => import('~/pages/documents/DocumentFormPage'));
const DocumentDetailPage = lazy(() => import('~/pages/documents/DocumentDetailPage'));
const TasksPage = lazy(() => import('~/pages/tasks/TasksPage'));
const TaskFormPage = lazy(() => import('~/pages/tasks/TaskFormPage'));
const TaskDetailPage = lazy(() => import('~/pages/tasks/TaskDetailPage'));
const ArchivePage = lazy(() => import('~/pages/archive/ArchivePage'));
const DepartmentsPage = lazy(() => import('~/pages/references/DepartmentsPage'));
const DocumentTypesPage = lazy(() => import('~/pages/references/DocumentTypesPage'));
const UsersPage = lazy(() => import('~/pages/users/UsersPage'));
const UserFormPage = lazy(() => import('~/pages/users/UserFormPage'));
const ProfilePage = lazy(() => import('~/pages/profile/ProfilePage'));
import NotFoundPage from '~/pages/NotFoundPage';

/*
 * Карта всех адресов приложения. Вложенность <Route> = вложенность страниц:
 *   PublicOnly / RequireAuth / RequireRole — «охранники», они решают, показывать ли вложенные страницы;
 *   AppLayout — общий каркас (меню + шапка), внутрь которого подставляется текущая страница.
 * Страницы подгружаются лениво (lazy + Suspense): код раздела скачивается только когда в него заходят, и первая загрузка быстрее.
 * key="in" / key="out" заставляет React создавать журнал заново при переходе между входящими и исходящими,
 * иначе фильтры от одного журнала «переехали» бы в другой.
 */
export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="documents" element={<Navigate to="/documents/in" replace />} />
            <Route path="documents/in" element={<DocumentsPage key="in" direction="in" />} />
            <Route path="documents/out" element={<DocumentsPage key="out" direction="out" />} />
            <Route path="documents/in/new" element={<DocumentFormPage direction="in" />} />
            <Route path="documents/out/new" element={<DocumentFormPage direction="out" />} />
            <Route path="documents/:id" element={<DocumentDetailPage />} />
            <Route path="documents/:id/edit" element={<DocumentFormPage />} />

            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route element={<RequireRole roles={['admin', 'moderator']} />}>
              <Route path="tasks/new" element={<TaskFormPage />} />
              <Route path="tasks/:id/edit" element={<TaskFormPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="document-types" element={<DocumentTypesPage />} />
            </Route>

            <Route path="archive" element={<ArchivePage />} />
            <Route path="archive/:folderId" element={<ArchivePage />} />

            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="users" element={<UsersPage />} />
              <Route path="users/new" element={<UserFormPage />} />
              <Route path="users/:id/edit" element={<UserFormPage />} />
            </Route>

            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
