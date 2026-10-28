import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, BookOpen, Check, Eye, EyeOff, LoaderCircle, Sparkles } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Brand } from '../components/Brand';
import { ErrorBanner } from '../components/Feedback';
import { errorMessage, request } from '../lib/api';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, login, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState((location.state as { username?: string } | null)?.username ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (user) return <Navigate to="/tasks" replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (username.trim().length < 3) {
      setError('用户名去除首尾空白后需要 3～50 个字符。');
      return;
    }
    if (register && password !== confirmation) {
      setError('两次输入的密码不一致。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (register) {
        await request('/users', { method: 'POST', body: { username: username.trim(), password } });
        navigate('/login', { replace: true, state: { username: username.trim(), registered: true } });
      } else {
        await login(username, password);
        navigate('/tasks', { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="拾序介绍">
        <Brand light />
        <div className="story-body">
          <span className="story-tag">
            <Sparkles size={14} />
            让学习，有条有序
          </span>
          <h1>
            把每一件小事，
            <br />
            变成向前的一步。
          </h1>
          <p>
            整理待办，专注当下。
            <br />
            在清晰的计划中，找到自己的学习节奏。
          </p>
          <div className="study-illustration" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <div className="illustration-note">
              <div className="note-top">
                <span />
                <span />
                <span />
              </div>
              <div className="note-title">今天，也在稳步前进</div>
              <div className="note-line">
                <i className="note-check">
                  <Check size={13} />
                </i>
                <b />
              </div>
              <div className="note-line">
                <i className="note-check">
                  <Check size={13} />
                </i>
                <b />
              </div>
              <div className="note-line">
                <i />
                <b />
              </div>
              <div className="note-footer">
                一点一滴，都有意义 <Sparkles size={15} />
              </div>
            </div>
            <div className="floating-book">
              <BookOpen size={28} />
            </div>
            <span className="floating-check">
              <Check size={20} />
            </span>
          </div>
        </div>
        <div className="story-footer">
          <span className="tiny-dot" />
          为专注学习的你而设计
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="page-kicker">YOUR LEARNING SPACE</span>
          <h2>{register ? '开启有序的学习生活' : '欢迎回来'}</h2>
          <p className="auth-intro">
            {register ? '创建账号，把计划变成行动。' : '登录拾序，继续你的每一步进展。'}
          </p>
          {!register && (location.state as { registered?: boolean } | null)?.registered && (
            <div className="success-banner" role="status">
              注册成功，请使用新账号登录。
            </div>
          )}
          {!register && sessionMessage && (
            <div className="session-notice" role="status">
              {sessionMessage}
            </div>
          )}
          {error && <ErrorBanner message={error} />}
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="username">用户名</label>
              <input
                id="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入你的用户名"
                disabled={busy}
              />
              {register && <small>3～50 个字符，区分大小写</small>}
            </div>
            <div className="field">
              <label htmlFor="password">密码</label>
              <div className="password-field">
                <input
                  id="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  required
                  minLength={register ? 8 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={register ? '设置 8～128 位密码' : '输入你的密码'}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={visible ? '隐藏密码' : '显示密码'}
                  onClick={() => setVisible((v) => !v)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {register && (
              <div className="field">
                <label htmlFor="confirmation">确认密码</label>
                <input
                  id="confirmation"
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="再次输入密码"
                  disabled={busy}
                />
              </div>
            )}
            <button className="primary auth-submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle className="spinner" size={18} />
                  {register ? '正在创建账号…' : '正在登录…'}
                </>
              ) : (
                <>
                  {register ? '创建账号' : '登 录'}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {register ? '已经有账号？' : '还没有账号？'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? '立即登录' : '创建账号'}
              <ArrowRight size={13} />
            </Link>
          </p>
          <div className="auth-fineprint">专注每一天，让成长有迹可循。</div>
        </div>
        <footer className="auth-copyright">拾序 · 学生任务管理系统</footer>
      </section>
    </main>
  );
}
