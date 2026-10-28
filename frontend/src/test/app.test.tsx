import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import type { Task, TaskLog } from '../types';

let tasks: Task[];
let logs: TaskLog[];
let failUpdate: boolean;
let expired: boolean;
let failTaskRead: boolean;
let clients: QueryClient[];
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

beforeEach(() => {
  tasks = [{ id: 1, title: '复习高等数学', completed: false }];
  logs = [];
  failUpdate = false;
  expired = false;
  failTaskRead = false;
  clients = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    init?.signal?.throwIfAborted();
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.pathname === '/auth/login')
      return body.password === 'wrong'
        ? json({}, 401)
        : json({ access_token: 'ui-test-token', token_type: 'bearer' });
    if (url.pathname === '/users' && method === 'POST')
      return body.username === 'exists' ? json({}, 409) : json({ id: 1, username: body.username }, 201);
    if (expired) return json({}, 401);
    if (url.pathname === '/users/me') return json({ id: 1, username: 'demo-student' });
    if (url.pathname === '/tasks' && method === 'GET') {
      if (failTaskRead) return json({}, 500);
      const offset = Number(url.searchParams.get('offset'));
      return json(tasks.slice(offset, offset + Number(url.searchParams.get('limit'))));
    }
    if (url.pathname === '/task-logs') {
      const id = url.searchParams.get('task_id');
      const action = url.searchParams.get('action');
      const offset = Number(url.searchParams.get('offset'));
      return json(
        logs
          .filter((log) => (!id || log.task_id === Number(id)) && (!action || log.action === action))
          .slice(offset, offset + 20),
      );
    }
    const taskId = Number(url.pathname.split('/').pop());
    const before = tasks.find((task) => task.id === taskId);
    let after: Task | null;
    let action: TaskLog['action'];
    if (method === 'POST' && url.pathname === '/tasks') {
      after = { id: (tasks.at(-1)?.id ?? 0) + 1, title: body.title, completed: false };
      tasks.push(after);
      action = 'create';
    } else if (method === 'PATCH') {
      if (failUpdate) return json({ detail: '更新任务失败' }, 500);
      if (!before) return json({}, 404);
      after = { ...before, ...body };
      tasks = tasks.map((task) => (task.id === taskId ? after! : task));
      action = 'update';
    } else if (method === 'DELETE') {
      tasks = tasks.filter((task) => task.id !== taskId);
      after = null;
      action = 'delete';
    } else throw new Error(`未预期请求 ${method} ${url.pathname}`);
    logs.unshift({
      id: logs.length + 1,
      actor_id: 1,
      task_id: after?.id ?? taskId,
      action,
      before_data: before ?? null,
      after_data: after,
      created_at: new Date().toISOString(),
    });
    return after ? json(after) : new Response(null, { status: 204 });
  });
});
afterEach(() => {
  clients.forEach((client) => client.clear());
});

function mount(path = '/tasks', authenticated = true) {
  if (authenticated) sessionStorage.setItem('shixu.access-token', 'ui-test-token');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnWindowFocus: false } },
  });
  clients.push(client);
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, client, user: userEvent.setup() };
}

describe('认证与任务完整交互', () => {
  it('错误登录后可重试，成功进入列表，退出清理会话与缓存', async () => {
    const { user, client } = mount('/login', false);
    await user.type(screen.getByLabelText('用户名'), 'demo-student');
    await user.type(screen.getByLabelText('密码', { exact: true }), 'wrong');
    await user.click(screen.getByRole('button', { name: '登 录' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('用户名或密码错误');
    await user.clear(screen.getByLabelText('密码', { exact: true }));
    await user.type(screen.getByLabelText('密码', { exact: true }), 'correct-password');
    await user.click(screen.getByRole('button', { name: '登 录' }));
    expect(await screen.findByRole('button', { name: '复习高等数学' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '退出登录' }));
    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeVisible();
    expect(sessionStorage.getItem('shixu.access-token')).toBeNull();
    expect(client.getQueryData(['tasks', 1])).toBeUndefined();
  });
  it('重复注册和确认密码提示，注册后预填用户名', async () => {
    const { user } = mount('/register', false);
    await user.type(screen.getByLabelText('用户名'), 'exists');
    await user.type(screen.getByLabelText('密码', { exact: true }), 'password123');
    await user.type(screen.getByLabelText('确认密码'), 'different123');
    await user.click(screen.getByRole('button', { name: '创建账号' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('两次输入的密码不一致');
    await user.clear(screen.getByLabelText('确认密码'));
    await user.type(screen.getByLabelText('确认密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '创建账号' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('用户名已存在');
    await user.clear(screen.getByLabelText('用户名'));
    await user.type(screen.getByLabelText('用户名'), 'new-student');
    await user.click(screen.getByRole('button', { name: '创建账号' }));
    expect(await screen.findByText('注册成功，请使用新账号登录。')).toBeVisible();
    expect(screen.getByLabelText('用户名')).toHaveValue('new-student');
    expect(screen.getByLabelText('密码', { exact: true })).toHaveValue('');
  });
  it('创建、编辑失败保留、重试、完成、删除及保留历史', async () => {
    const { user } = mount();
    await screen.findByRole('button', { name: '复习高等数学' });
    await user.click(screen.getByRole('button', { name: '新建任务' }));
    await user.type(within(screen.getByRole('dialog')).getByRole('textbox'), '学习 React');
    await user.click(screen.getByRole('button', { name: '保存任务' }));
    expect(await screen.findByRole('button', { name: '学习 React' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '学习 React' }));
    const title = within(screen.getByRole('dialog')).getByRole('textbox');
    await user.clear(title);
    await user.type(title, '学习 React Hooks');
    failUpdate = true;
    await user.click(screen.getByRole('button', { name: '保存任务' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('更新任务失败');
    expect(title).toHaveValue('学习 React Hooks');
    failUpdate = false;
    await user.click(screen.getByRole('button', { name: '保存任务' }));
    expect(await screen.findByRole('button', { name: '学习 React Hooks' })).toBeVisible();
    await user.click(screen.getByRole('checkbox', { name: '完成任务：学习 React Hooks' }));
    await screen.findByRole('checkbox', { name: '恢复任务：学习 React Hooks' });
    await user.click(screen.getByRole('button', { name: '删除任务 2' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '学习 React Hooks' })).not.toBeInTheDocument(),
    );
    await user.click(
      within(screen.getByRole('navigation', { name: '主导航' })).getByRole('link', { name: '任务记录' }),
    );
    expect(await screen.findByText('删除任务', { selector: '.log-action' })).toBeVisible();
    expect(await screen.findByText('删除时快照')).toBeVisible();
  });
  it('关闭脏表单需要确认，继续编辑保留内容', async () => {
    const { user } = mount();
    await user.click(await screen.findByRole('button', { name: '复习高等数学' }));
    await user.type(within(screen.getByRole('dialog')).getByRole('textbox'), '补充');
    await user.click(screen.getByRole('button', { name: '关闭面板' }));
    expect(screen.getByText('有尚未保存的修改')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '继续编辑' }));
    expect(within(screen.getByRole('dialog')).getByRole('textbox')).toHaveValue('复习高等数学补充');
    await user.click(screen.getByRole('button', { name: '取消' }));
    await user.click(screen.getByRole('button', { name: '放弃修改' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('初始零任务可创建，状态过滤后无结果可清空', async () => {
    tasks = [];
    const { user } = mount();
    expect(await screen.findByText('给今天，安排一件小事')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '创建第一项任务' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '关闭面板' }));
  });
  it('前端搜索命中第 101 项，未完成筛选可组合', async () => {
    tasks = Array.from({ length: 101 }, (_, i) => ({
      id: i + 1,
      title: i === 100 ? '跨页目标任务' : `普通任务 ${i + 1}`,
      completed: i % 2 === 1,
    }));
    const { user } = mount();
    await screen.findByRole('button', { name: '普通任务 1' });
    await user.type(screen.getByRole('textbox', { name: '搜索任务标题' }), '跨页目标');
    expect(await screen.findByRole('button', { name: '跨页目标任务' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '查看已完成' }));
    expect(await screen.findByText('没有找到匹配的任务')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '清除筛选条件' }));
    expect(await screen.findByRole('button', { name: '普通任务 1' })).toBeVisible();
  });
  it('后台刷新失败保留上次完整集合', async () => {
    const { user } = mount();
    await screen.findByRole('button', { name: '复习高等数学' });
    failTaskRead = true;
    await user.click(screen.getByRole('button', { name: '刷新任务' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('上次成功同步');
    expect(screen.getByRole('button', { name: '复习高等数学' })).toBeVisible();
  });
  it('受保护请求 401 清理数据并返回登录', async () => {
    const { user, client } = mount();
    await screen.findByRole('button', { name: '复习高等数学' });
    expired = true;
    await user.click(screen.getByRole('button', { name: '刷新任务' }));
    expect(await screen.findByText('登录已过期，请重新登录。')).toBeVisible();
    expect(client.getQueryData(['tasks', 1])).toBeUndefined();
    expect(sessionStorage.getItem('shixu.access-token')).toBeNull();
  });
  it('未登录访问受保护页面跳回登录', async () => {
    mount('/task-logs', false);
    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeVisible();
  });
  it('历史保留删除快照，操作类型与 ID 组合筛选', async () => {
    logs = [
      {
        id: 1,
        actor_id: 1,
        task_id: 9,
        action: 'delete',
        before_data: { title: '已删除学习任务', completed: true },
        after_data: null,
        created_at: '2026-10-28T00:00:00Z',
      },
    ];
    const { user } = mount('/task-logs?task_id=9');
    expect(await screen.findByRole('heading', { name: '已删除学习任务' })).toBeVisible();
    await user.click(screen.getByText('查看变更详情'));
    expect(screen.getByText('完成状态')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('操作类型'), 'create');
    await user.click(screen.getByRole('button', { name: '筛选' }));
    expect(await screen.findByText('没有匹配的操作记录')).toBeVisible();
  });
  it('编辑期间后台刷新不覆盖草稿', async () => {
    const { user, client } = mount();
    await user.click(await screen.findByRole('button', { name: '复习高等数学' }));
    const title = within(screen.getByRole('dialog')).getByRole('textbox');
    await user.clear(title);
    await user.type(title, '尚未保存的草稿');
    tasks = [{ id: 1, title: '另一窗口修改的标题', completed: false }];
    await act(async () => {
      await client.refetchQueries({ queryKey: ['tasks'] });
    });
    expect(title).toHaveValue('尚未保存的草稿');
  });
  it('旧会话迟到的 401 不会退出重新登录后的会话', async () => {
    const respond = vi.mocked(fetch).getMockImplementation()!;
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation((input, init) =>
      init?.method === 'PATCH'
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : respond(input, init),
    );
    const { user } = mount();
    await user.click(await screen.findByRole('checkbox', { name: '完成任务：复习高等数学' }));
    await user.click(screen.getByRole('button', { name: '退出登录' }));
    await user.type(await screen.findByLabelText('用户名'), 'demo-student');
    await user.type(screen.getByLabelText('密码', { exact: true }), 'correct-password');
    await user.click(screen.getByRole('button', { name: '登 录' }));
    await screen.findByRole('button', { name: '复习高等数学' });
    await act(async () => {
      finish(json({}, 401));
    });
    expect(screen.getByRole('button', { name: '复习高等数学' })).toBeVisible();
    expect(sessionStorage.getItem('shixu.access-token')).toBe('ui-test-token');
  });
  it('历史分页可以加载第 21 条', async () => {
    logs = Array.from({ length: 21 }, (_, i) => ({
      id: 21 - i,
      actor_id: 1,
      task_id: 21 - i,
      action: 'create',
      before_data: null,
      after_data: { title: `历史任务 ${21 - i}`, completed: false },
      created_at: '2026-10-28T00:00:00Z',
    }));
    const { user } = mount('/task-logs');
    await screen.findByRole('heading', { name: '历史任务 21' });
    expect(screen.queryByRole('heading', { name: '历史任务 1' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '加载更多记录' }));
    expect(await screen.findByRole('heading', { name: '历史任务 1' })).toBeVisible();
  });
  it('非法历史任务 ID 不向接口发送无效请求', async () => {
    mount('/task-logs?task_id=-2');
    expect(await screen.findByText('请使用有效的任务编号')).toBeVisible();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/task-logs'))).toBe(false);
  });
});
