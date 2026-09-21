import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '~/api';
import { refreshSession, setAccessToken, setSessionExpiredHandler } from '~/api/client';

/*
 * Контекст (Context) — способ «вещать» данные всем компонентам без передачи через props по цепочке.
 * Здесь он хранит: кто сейчас вошёл (user) и в каком состоянии сессия (status):
 *   loading        — при открытии страницы пробуем тихо войти по refresh-cookie
 *   authenticated  — вошли
 *   anonymous      — не вошли
 *   disabled       — учётную запись отключил администратор
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null });
  const queryClient = useQueryClient();

  const clearSession = useCallback(
    (status = 'anonymous') => {
      setAccessToken(null);
      queryClient.clear(); // выбрасываем кэш данных прежнего пользователя
      setSession({ status, user: null });
    },
    [queryClient],
  );

  // При загрузке страницы: есть ли действующая сессия (refresh-cookie)?
  useEffect(() => {
    let ignore = false;
    refreshSession()
      .then(({ user }) => !ignore && setSession({ status: 'authenticated', user }))
      .catch((err) => {
        if (ignore) return;
        const disabled = err?.response?.data?.code === 'ACCOUNT_DISABLED';
        setSession({ status: disabled ? 'disabled' : 'anonymous', user: null });
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Если сессию не удалось продлить посреди работы — возвращаем на экран входа
  useEffect(() => {
    setSessionExpiredHandler(() => clearSession());
  }, [clearSession]);

  const value = useMemo(
    () => ({
      status: session.status,
      user: session.user,
      async signin(email, password) {
        const { accessToken, user } = await authApi.signin({ email, password });
        setAccessToken(accessToken);
        setSession({ status: 'authenticated', user });
      },
      async signout() {
        try {
          await authApi.signout();
        } finally {
          clearSession();
        }
      },
      /** Обновить данные пользователя в контексте после правки профиля/аватара */
      setUser: (user) => setSession((s) => ({ ...s, user })),
    }),
    [session, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Хук для компонентов: const { user, signout } = useAuth() */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth нужно вызывать внутри <AuthProvider>');
  return ctx;
}

export const isAdmin = (user) => user?.role === 'admin';
export const isStaff = (user) => user?.role === 'admin' || user?.role === 'moderator';
