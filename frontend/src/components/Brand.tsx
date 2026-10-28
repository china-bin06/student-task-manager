import { Check } from 'lucide-react';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark">
        <Check size={23} strokeWidth={3} />
      </span>
      <span>
        拾序<span className="brand-subtitle">学生任务管理系统</span>
      </span>
    </div>
  );
}
