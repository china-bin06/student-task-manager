import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { useAuth } from './hooks/useAuth';
import { Brand } from './components/Brand';
import { ErrorBanner } from './components/Feedback';
import { Shell } from './components/Shell';
import { ToastProvider } from './components/Toast';
import { AuthPage } from './pages/AuthPage';
import { TasksPage } from './pages/TasksPage';
import { LogsPage } from './pages/LogsPage';

function Guard() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
function AppRoutes() {
  const { restoring, restoreError, retryRestore, logout } = useAuth();
  if (restoring || restoreError)
    return (
      <div className="boot-screen">
        <Brand />
        {restoreError ? (
          <>
            <ErrorBanner message={restoreError} retry={retryRestore} />
            <button className="secondary" onClick={() => logout()}>
              返回登录
            </button>
          </>
        ) : (
          <p role="status">正在恢复你的学习空间…</p>
        )}
      </div>
    );
  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/register" element={<AuthPage key="register" register />} />
      <Route element={<Guard />}>
        <Route element={<Shell />}>
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/task-logs" element={<LogsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
