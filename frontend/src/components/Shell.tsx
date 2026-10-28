import { BookOpen, ClipboardList, History, LogOut, Sparkles } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Brand } from './Brand';

const navigation = [
  { to: '/tasks', label: '我的任务', icon: ClipboardList },
  { to: '/task-logs', label: '任务记录', icon: History },
];
export function Shell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(
    new Date(),
  );
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="nav-label">我的学习空间</div>
        <nav aria-label="主导航">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="focus-card">
            <span>
              <Sparkles size={17} />
              保持一点点进步
            </span>
            <p>
              每完成一件小事，
              <br />
              都离目标更近一步。
            </p>
            <div className="focus-book">
              <BookOpen size={35} strokeWidth={1.3} />
            </div>
          </div>
          <div className="sidebar-footer">
            <span className="tiny-dot" />
            让学习，有条有序
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="desktop-breadcrumb">
            学习空间 <span>/</span>{' '}
            <strong>{location.pathname.startsWith('/task-logs') ? '任务记录' : '我的任务'}</strong>
          </div>
          <div className="mobile-top-brand">
            <Brand />
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{date}</span>
            <span className="topbar-divider" />
            <span className="avatar">{user?.username.slice(0, 1).toUpperCase()}</span>
            <span className="username" title={user?.username}>
              {user?.username}
            </span>
            <button
              className="icon-button logout-button"
              onClick={() => logout()}
              aria-label="退出登录"
              title="退出登录"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="workspace-footer">
          拾序 · 每一步，都算数<span>专注当下，有序成长</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="移动端导航">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
