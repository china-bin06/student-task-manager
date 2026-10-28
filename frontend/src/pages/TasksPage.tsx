import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  History,
  ListFilter,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTasks, useTaskWrite } from '../hooks/useTasks';
import { filterTasks } from '../lib/tasks';
import { errorMessage } from '../lib/api';
import { ErrorBanner, EmptyState, Loading } from '../components/Feedback';
import { TaskEditor } from '../components/TaskEditor';
import { Dialog } from '../components/Dialog';
import { useToast } from '../hooks/useToast';
import type { Task, TaskStatus } from '../types';

const PAGE_SIZE = 10;
const tabs: { key: TaskStatus; label: string }[] = [
  { key: 'all', label: '全部任务' },
  { key: 'pending', label: '未完成' },
  { key: 'completed', label: '已完成' },
];

export function TasksPage() {
  const { user } = useAuth();
  const query = useTasks();
  const write = useTaskWrite();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<TaskStatus>('all');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [operationError, setOperationError] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const tasks = query.data;
  const filtered = useMemo(() => filterTasks(tasks ?? [], keyword, status), [tasks, keyword, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    setPage((current) => Math.min(current, pages));
  }, [pages]);
  const activePage = Math.min(page, pages);
  const visible = filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const completed = tasks?.filter((task) => task.completed).length ?? 0;
  const percent = tasks?.length ? Math.round((completed / tasks.length) * 100) : 0;
  const setFilter = (next: TaskStatus) => {
    setStatus(next);
    setPage(1);
  };
  const toggle = async (task: Task) => {
    if (write.isPending) return;
    setOperationError('');
    try {
      await write.mutateAsync({ type: 'update', id: task.id, completed: !task.completed });
      toast(task.completed ? '任务已恢复为未完成' : '又完成了一件事，做得不错！');
    } catch (err) {
      setOperationError(errorMessage(err));
    }
  };
  const remove = async () => {
    if (!deleting || write.isPending) return;
    setOperationError('');
    try {
      await write.mutateAsync({ type: 'delete', id: deleting.id });
      setDeleting(null);
      toast('任务已删除，操作记录已保留');
    } catch (err) {
      setOperationError(errorMessage(err));
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="page-kicker">MAKE ROOM FOR PROGRESS</span>
          <h1>
            我的任务<span className="heading-dot">.</span>
          </h1>
          <p>{user?.username}，把计划写下来，让每一天都有所收获。</p>
        </div>
        <button className="primary new-task" disabled={!tasks} onClick={() => setEditor({ task: null })}>
          <Plus size={18} />
          新建任务
        </button>
      </div>
      <section className="stats-grid" aria-label="任务概览">
        {[
          {
            key: 'all' as const,
            label: '全部任务',
            value: tasks?.length,
            icon: ClipboardList,
            color: 'blue',
            sub: '每一个目标，都值得认真对待',
          },
          {
            key: 'pending' as const,
            label: '未完成',
            value: tasks ? tasks.length - completed : undefined,
            icon: Circle,
            color: 'amber',
            sub: '保持专注，一件一件来',
          },
          {
            key: 'completed' as const,
            label: '已完成',
            value: tasks ? completed : undefined,
            icon: CheckCheck,
            color: 'green',
            sub: '你的努力，都有迹可循',
          },
        ].map(({ key, label, value, icon: Icon, color, sub }) => (
          <button
            key={key}
            className={`stat-card ${status === key ? 'selected' : ''}`}
            onClick={() => setFilter(key)}
            disabled={!tasks}
            aria-label={`查看${label}`}
          >
            <div className="stat-top">
              <span>{label}</span>
              <i className={`stat-icon ${color}`}>
                <Icon size={19} />
              </i>
            </div>
            <strong>
              {value ?? '—'}
              <span>项</span>
            </strong>
            <small>{sub}</small>
          </button>
        ))}
      </section>
      <section className="progress-banner">
        <div className="progress-spark">
          <Sparkles size={23} />
        </div>
        <div className="progress-copy">
          <strong>
            {tasks?.length
              ? percent === 100
                ? '全部完成，给自己一点掌声。'
                : '每一次完成，都是向前一步。'
              : '新的进展，从第一项任务开始。'}
          </strong>
          <span>不必一次完成所有事，专注当下就很好。</span>
        </div>
        <div className="progress-meter">
          <div>
            <span>任务完成度</span>
            <strong>{tasks ? `${percent}%` : '—'}</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
      </section>
      {query.error && (
        <ErrorBanner
          message={`${errorMessage(query.error)}${tasks ? ' 当前显示上次成功同步的数据。' : ''}`}
          retry={() => {
            void query.refetch();
          }}
        />
      )}
      {operationError && !deleting && <ErrorBanner message={operationError} />}
      <section className="panel task-panel" aria-label="任务列表">
        <div className="task-panel-heading">
          <div className="section-heading">
            <h2>任务清单</h2>
            <span className="count-label">{tasks ? `共 ${tasks.length} 项` : '正在完整读取任务'}</span>
          </div>
          <div className="list-sync">
            <span className={`sync-dot ${query.error ? 'sync-failed' : ''}`} />
            <span>{query.isFetching ? '同步中…' : query.error ? '同步失败' : '自动同步已开启'}</span>
            <button
              className="icon-button"
              aria-label="刷新任务"
              title="刷新任务"
              onClick={() => {
                void query.refetch();
              }}
              disabled={query.isFetching || write.isPending}
            >
              <RefreshCw size={15} className={query.isFetching ? 'spinner' : ''} />
            </button>
          </div>
        </div>
        <div className="task-toolbar">
          <div className="status-tabs" aria-label="按任务状态筛选">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={status === tab.key ? 'active' : ''}
                onClick={() => setFilter(tab.key)}
                disabled={!tasks}
                aria-pressed={status === tab.key}
              >
                {tab.label}
                {tasks && (
                  <span>
                    {tab.key === 'all'
                      ? tasks.length
                      : tab.key === 'completed'
                        ? completed
                        : tasks.length - completed}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label="搜索任务标题"
              placeholder="搜索任务标题…"
              value={search}
              disabled={!tasks}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="icon-button" aria-label="清空搜索" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {!tasks ? (
          query.isPending || query.isFetching ? (
            <Loading label="正在分批完整读取任务，完成后即可搜索和筛选…" />
          ) : (
            <EmptyState
              title="任务暂时未能加载"
              description="请检查连接，再试一次。"
              action={
                <button
                  className="secondary"
                  onClick={() => {
                    void query.refetch();
                  }}
                >
                  重新加载
                </button>
              }
            />
          )
        ) : filtered.length === 0 ? (
          <EmptyState
            title={tasks.length === 0 ? '给今天，安排一件小事' : '没有找到匹配的任务'}
            description={
              tasks.length === 0
                ? '从一个清晰的小目标开始，积累属于你的进步。'
                : '试试其他关键词，或切换任务状态。'
            }
            icon={tasks.length === 0 ? <ClipboardList size={30} /> : <Search size={30} />}
            action={
              tasks.length === 0 ? (
                <button className="primary" onClick={() => setEditor({ task: null })}>
                  <Plus size={17} />
                  创建第一项任务
                </button>
              ) : (
                <button
                  className="secondary"
                  onClick={() => {
                    setSearch('');
                    setKeyword('');
                    setFilter('all');
                  }}
                >
                  清除筛选条件
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="task-table-header">
              <span>
                任务内容 <ArrowDown size={12} />
              </span>
              <span>状态</span>
              <span>操作</span>
            </div>
            <ul className="task-list">
              {visible.map((task) => (
                <li key={task.id} className={`task-row ${task.completed ? 'is-completed' : ''}`}>
                  <button
                    className="task-checkbox"
                    role="checkbox"
                    aria-checked={task.completed}
                    aria-label={`${task.completed ? '恢复' : '完成'}任务：${task.title}`}
                    onClick={() => {
                      void toggle(task);
                    }}
                    disabled={write.isPending}
                  >
                    {write.isPending &&
                    write.variables?.type === 'update' &&
                    write.variables.id === task.id ? (
                      <LoaderCircle size={14} className="spinner" />
                    ) : task.completed ? (
                      <Check size={14} strokeWidth={3} />
                    ) : null}
                  </button>
                  <div className="task-content">
                    <button
                      className="task-title"
                      onClick={() => setEditor({ task })}
                      disabled={write.isPending}
                    >
                      {task.title}
                    </button>
                    <span className="task-id">TASK-{String(task.id).padStart(3, '0')}</span>
                  </div>
                  <span className={`pill task-status ${task.completed ? 'success' : 'pending'}`}>
                    <span className="status-dot" />
                    {task.completed ? '已完成' : '未完成'}
                  </span>
                  <div className="task-actions">
                    <button
                      className="icon-button"
                      title="编辑任务"
                      aria-label={`编辑任务 ${task.id}`}
                      disabled={write.isPending}
                      onClick={() => setEditor({ task })}
                    >
                      <Pencil size={15} />
                    </button>
                    <Link
                      className="icon-button task-history-button"
                      title="查看记录"
                      aria-label={`查看任务 ${task.id} 的记录`}
                      to={`/task-logs?task_id=${task.id}`}
                    >
                      <History size={15} />
                    </Link>
                    <button
                      className="icon-button danger-text"
                      title="删除任务"
                      aria-label={`删除任务 ${task.id}`}
                      disabled={write.isPending}
                      onClick={() => {
                        setOperationError('');
                        setDeleting(task);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="pagination">
              <span>
                显示 {(activePage - 1) * PAGE_SIZE + 1}–{Math.min(activePage * PAGE_SIZE, filtered.length)}{' '}
                项，共 {filtered.length} 项
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="上一页"
                  disabled={activePage <= 1}
                  onClick={() => setPage(activePage - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="page-number">
                  {activePage} <span>/ {pages}</span>
                </span>
                <button
                  className="icon-button"
                  aria-label="下一页"
                  disabled={activePage >= pages}
                  onClick={() => setPage(activePage + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      <div className="page-bottom-note">
        <ListFilter size={14} />
        搜索与筛选覆盖最近一次完整同步的个人任务
        <Link to="/task-logs">
          查看操作记录
          <ArrowUpRight size={13} />
        </Link>
      </div>
      {editor && <TaskEditor task={editor.task} close={() => setEditor(null)} />}
      {deleting && (
        <Dialog
          title="删除这项任务？"
          subtitle="删除后无法恢复，操作记录仍会保留。"
          close={() => setDeleting(null)}
          busy={write.isPending}
        >
          <div className="delete-task-name">{deleting.title}</div>
          {operationError && <ErrorBanner message={operationError} />}
          <div className="dialog-footer">
            <button className="secondary" onClick={() => setDeleting(null)} disabled={write.isPending}>
              保留任务
            </button>
            <button
              className="danger-button"
              disabled={write.isPending}
              onClick={() => {
                void remove();
              }}
            >
              {write.isPending ? <LoaderCircle size={16} className="spinner" /> : <Trash2 size={16} />}
              {write.isPending ? '删除中…' : '确认删除'}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
