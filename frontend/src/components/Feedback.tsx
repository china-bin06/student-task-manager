import { AlertCircle, ClipboardList, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export function ErrorBanner({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          <RefreshCw size={14} />
          重试
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon ?? <ClipboardList size={30} />}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading({ label = '正在加载…' }: { label?: string }) {
  return (
    <div role="status">
      <div className="loading-lines" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
      <div className="loading-caption">{label}</div>
    </div>
  );
}
