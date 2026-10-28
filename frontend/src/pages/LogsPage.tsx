import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useInfiniteQuery, useIsMutating } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  History,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { errorMessage, request } from '../lib/api';
import { actionNames, changes, dayLabel, logTitle } from '../lib/logs';
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback';
import type { TaskLog } from '../types';

type Action = '' | TaskLog['action'];
const PAGE_SIZE = 20;
export function LogsPage() {
  const { token, user, handleError, session } = useAuth();
  const [params, setParams] = useSearchParams();
  const taskId = params.get('task_id') ?? '';
  const rawAction = params.get('action') ?? '';
  const action: Action = ['create', 'update', 'delete'].includes(rawAction) ? (rawAction as Action) : '';
  const [draftId, setDraftId] = useState(taskId);
  const [draftAction, setDraftAction] = useState<Action>(action);
  const [filterError, setFilterError] = useState('');
  useEffect(() => {
    setDraftId(taskId);
    setDraftAction(action);
  }, [taskId, action]);
  const validTaskId = !taskId || (/^[1-9]\d*$/.test(taskId) && Number.isSafeInteger(Number(taskId)));
  const mutating = useIsMutating({ mutationKey: ['task-write'] });
  const query = useInfiniteQuery({
    queryKey: ['task-logs', user?.id, taskId, action],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const search = new URLSearchParams({ offset: String(pageParam), limit: String(PAGE_SIZE) });
      if (taskId) search.set('task_id', taskId);
      if (action) search.set('action', action);
      return request<TaskLog[]>(`/task-logs?${search}`, { token: token!, signal });
    },
    getNextPageParam: (last, pages) => (last.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined),
    enabled: !!token && validTaskId && !mutating,
    refetchInterval: (q) => Math.min(30_000 * 2 ** q.state.fetchFailureCount, 120_000),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });
  useEffect(() => {
    if (query.error) handleError(query.error, session);
  }, [query.error, handleError, session]);
  const logs = useMemo(() => {
    const map = new Map<number, TaskLog>();
    query.data?.pages.flat().forEach((log) => map.set(log.id, log));
    return [...map.values()];
  }, [query.data]);
  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    const id = draftId.trim();
    if (id && (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))) {
      setFilterError('任务编号需要是正整数。');
      return;
    }
    setFilterError('');
    const next = new URLSearchParams();
    if (id) next.set('task_id', id);
    if (draftAction) next.set('action', draftAction);
    setParams(next);
  };
  const reset = () => {
    setDraftId('');
    setDraftAction('');
    setFilterError('');
    setParams({});
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="page-kicker">EVERY STEP LEAVES A TRACE</span>
          <h1>
            任务记录<span className="heading-dot">.</span>
          </h1>
          <p>回看每一次行动，让成长有迹可循。</p>
        </div>
        <Link className="secondary" to="/tasks">
          <ArrowLeft size={16} />
          返回任务
        </Link>
      </div>
      <section className="history-intro">
        <div className="history-intro-icon">
          <History size={25} />
        </div>
        <div>
          <strong>每一步进展，都在这里</strong>
          <p>创建、修改、完成与删除，自动记录你的任务变化。</p>
        </div>
        <span className="pill">
          <Check size={13} />
          删除任务后仍保留记录
        </span>
      </section>
      <section className="panel history-panel">
        <div className="task-panel-heading">
          <div className="section-heading">
            <h2>操作历史</h2>
            <span className="count-label">按时间倒序</span>
          </div>
          <button
            className="text-button"
            disabled={query.isFetching || !validTaskId}
            onClick={() => {
              void query.refetch();
            }}
          >
            <RefreshCw size={15} className={query.isFetching ? 'spinner' : ''} />
            刷新记录
          </button>
        </div>
        <form className="history-filters" onSubmit={submitFilters}>
          <div>
            <label htmlFor="history-task-id">任务编号</label>
            <input
              className="input"
              id="history-task-id"
              inputMode="numeric"
              placeholder="输入任务 ID"
              value={draftId}
              onChange={(e) => setDraftId(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="history-action">操作类型</label>
            <select
              className="input"
              id="history-action"
              value={draftAction}
              onChange={(e) => setDraftAction(e.target.value as Action)}
            >
              <option value="">全部操作</option>
              <option value="create">创建任务</option>
              <option value="update">修改任务（含完成/恢复）</option>
              <option value="delete">删除任务</option>
            </select>
          </div>
          <button className="primary">
            <Search size={16} />
            筛选
          </button>
          <button className="text-button" type="button" onClick={reset}>
            重置
          </button>
        </form>
        <div className="history-body">
          {(filterError || !validTaskId) && (
            <ErrorBanner message={filterError || '地址中的任务编号无效，请修改筛选条件。'} />
          )}
          {query.error && (
            <ErrorBanner
              message={`${errorMessage(query.error)}${logs.length ? ' 已保留上次加载的记录。' : ''}`}
              retry={() => {
                if (query.isFetchNextPageError) void query.fetchNextPage();
                else void query.refetch();
              }}
            />
          )}
          {!validTaskId ? (
            <EmptyState
              title="请使用有效的任务编号"
              description="可以重置筛选条件，查看全部操作历史。"
              action={
                <button className="secondary" onClick={reset}>
                  重置筛选
                </button>
              }
            />
          ) : query.isPending ? (
            <Loading label="正在整理你的操作记录…" />
          ) : query.isError && !query.data ? (
            <EmptyState
              title="记录暂时未能加载"
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
          ) : logs.length === 0 ? (
            <EmptyState
              title={taskId || action ? '没有匹配的操作记录' : '行动的轨迹，从这里开始'}
              description={
                taskId || action ? '试试其他任务编号或操作类型。' : '创建或修改任务后，这里就会留下你的进展。'
              }
              icon={<History size={30} />}
              action={
                taskId || action ? (
                  <button className="secondary" onClick={reset}>
                    清除筛选
                  </button>
                ) : (
                  <Link className="primary" to="/tasks">
                    去创建任务
                    <ArrowRight size={16} />
                  </Link>
                )
              }
            />
          ) : (
            <div className="timeline">
              {logs.map((log, index) => {
                const showDay =
                  index === 0 || dayLabel(logs[index - 1].created_at) !== dayLabel(log.created_at);
                const Icon = log.action === 'create' ? Plus : log.action === 'delete' ? Trash2 : Pencil;
                return (
                  <div key={log.id}>
                    {showDay && (
                      <h3 className="timeline-date">
                        {dayLabel(log.created_at)}
                        <span />
                      </h3>
                    )}
                    <article className={`timeline-item action-${log.action}`}>
                      <div className="timeline-icon">
                        <Icon size={15} />
                      </div>
                      <div className="timeline-content">
                        <div className="log-heading">
                          <span className="log-action">{actionNames[log.action]}</span>
                          <time
                            dateTime={log.created_at}
                            title={new Date(log.created_at).toLocaleString('zh-CN')}
                          >
                            {new Date(log.created_at).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false,
                            })}
                          </time>
                        </div>
                        <h3 className="log-task-title">{logTitle(log)}</h3>
                        <div className="log-meta">
                          <span>任务 #{log.task_id}</span>
                          <span>·</span>
                          <span>{user?.username}</span>
                          {log.action === 'delete' && <span className="deleted-tag">删除时快照</span>}
                        </div>
                        <details className="log-details">
                          <summary>
                            查看变更详情
                            <ChevronDown size={13} />
                          </summary>
                          <div className="log-changes">
                            {changes(log).map((change) => (
                              <div className="log-change" key={change.label}>
                                <span className="change-label">{change.label}</span>
                                <div>
                                  <span className="before-value">{change.before}</span>
                                  <ArrowRight size={13} />
                                  <span className="after-value">{change.after}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          )}
          {validTaskId && query.hasNextPage && (
            <div className="load-more">
              <button
                className="secondary"
                disabled={query.isFetching}
                onClick={() => {
                  void query.fetchNextPage();
                }}
              >
                {query.isFetchingNextPage ? (
                  <LoaderCircle className="spinner" size={16} />
                ) : (
                  <ArrowDown size={16} />
                )}
                {query.isFetchingNextPage ? '加载中…' : '加载更多记录'}
              </button>
            </div>
          )}
          {!!logs.length && !query.hasNextPage && (
            <div className="timeline-end">已经看到全部记录 · 每一步都算数</div>
          )}
        </div>
      </section>
      <p className="history-footnote">时间按当前设备所在时区显示 · 页面可见时自动同步</p>
    </>
  );
}
