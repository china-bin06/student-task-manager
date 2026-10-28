import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from './types';
import { ApiError, errorMessage, request } from './lib/api';
import { AuthContext } from './contexts/auth-context';

// Context 与 Hook 分离，热更新 Provider 时保留同一上下文实例。

const SESSION_KEY = 'shixu.access-token';
function readToken() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
function storeToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* 会话存储不可用时仍可在内存中登录。 */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(Boolean(token));
  const [restoreError, setRestoreError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [sessionMessage, setSessionMessage] = useState('');
  const generation = useRef(0);
  const [session, setSession] = useState(0);
  const isCurrentSession = useCallback((expected: number) => generation.current === expected, []);
  const logout = useCallback(
    (message = '') => {
      setSession(++generation.current);
      void client.cancelQueries();
      client.clear();
      storeToken(null);
      setToken(null);
      setUser(null);
      setRestoring(false);
      setRestoreError('');
      setSessionMessage(message);
    },
    [client],
  );
  const handleError = useCallback(
    (error: unknown, expected: number) => {
      if (!isCurrentSession(expected)) return;
      if (error instanceof ApiError && error.status === 401) logout('登录已过期，请重新登录。');
    },
    [logout, isCurrentSession],
  );

  useEffect(() => {
    if (!token || user) return;
    const controller = new AbortController();
    setRestoring(true);
    setRestoreError('');
    request<User>('/users/me', { token, signal: controller.signal })
      .then((me) => {
        if (!controller.signal.aborted) setUser(me);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) logout('登录已过期，请重新登录。');
        else setRestoreError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoring(false);
      });
    return () => controller.abort();
  }, [token, user, restoreAttempt, logout]);

  const login = async (username: string, password: string) => {
    const result = await request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: { username: username.trim(), password },
    });
    if (!result.access_token || result.token_type !== 'bearer') throw new Error('登录响应异常，请重试。');
    const me = await request<User>('/users/me', { token: result.access_token });
    await client.cancelQueries();
    client.clear();
    storeToken(result.access_token);
    setSession(++generation.current);
    setUser(me);
    setToken(result.access_token);
    setSessionMessage('');
    setRestoreError('');
  };
  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        restoring,
        restoreError,
        sessionMessage,
        login,
        logout,
        handleError,
        session,
        isCurrentSession,
        retryRestore: () => setRestoreAttempt((v) => v + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
