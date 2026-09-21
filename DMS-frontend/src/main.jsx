import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './index.css';
import './i18n';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ConfirmProvider } from './components/ui/ConfirmProvider';

/*
 * Точка входа: здесь «оборачиваем» приложение в провайдеры — компоненты, которые дают всем вложенным
 * страницам общие возможности. Порядок важен: внутренний провайдер видит внешние.
 *   QueryClientProvider — кэш данных с сервера (TanStack Query)
 *   BrowserRouter       — маршрутизация по адресной строке
 *   AuthProvider        — «кто вошёл»
 *   ConfirmProvider     — окна подтверждения
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 секунд данные считаются свежими и повторно не запрашиваются
      refetchOnWindowFocus: false,
      // Ошибки 4xx (нет доступа, не найдено) повторять бессмысленно; сетевые сбои и 5xx — пробуем ещё раз
      retry: (failureCount, error) => (error?.status >= 500 || error?.code === 'NETWORK') && failureCount < 2,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ConfirmProvider>
            <App />
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar theme="colored" />
          </ConfirmProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
