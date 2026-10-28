import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUpRight, LoaderCircle, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog } from './Dialog';
import { ErrorBanner } from './Feedback';
import { useTaskWrite } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import { errorMessage } from '../lib/api';
import type { Task } from '../types';

export function TaskEditor({ task, close }: { task: Task | null; close: () => void }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [completed, setCompleted] = useState(task?.completed ?? false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState('');
  const write = useTaskWrite();
  const toast = useToast();
  const dirty = title !== (task?.title ?? '') || completed !== (task?.completed ?? false);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  const requestClose = () => {
    if (write.isPending) return;
    if (dirty) setDiscard(true);
    else close();
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (write.isPending) return;
    if (!title.trim()) {
      setError('请输入任务标题，不能只包含空白。');
      return;
    }
    setError('');
    try {
      await write.mutateAsync(
        task
          ? { type: 'update', id: task.id, title: title.trim(), completed }
          : { type: 'create', title: title.trim() },
      );
      toast(task ? '任务已保存' : '新任务已创建，开始行动吧');
      close();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Dialog
      drawer
      title={task ? '编辑任务' : '新建任务'}
      subtitle={task ? `任务 #${task.id} · 一点调整，让计划更清晰` : '从一件小事开始，让计划落地。'}
      close={requestClose}
      busy={write.isPending}
    >
      <form className="editor-form" onSubmit={submit}>
        <div className="editor-body">
          <div className="field">
            <label htmlFor="task-title">
              任务标题 <span className="required-mark">*</span>
            </label>
            <textarea
              id="task-title"
              data-autofocus
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：完成高等数学第三章练习"
              disabled={write.isPending}
            />
            <small className="char-counter">
              写下清晰、具体的行动<span>{title.length} / 200</span>
            </small>
          </div>
          {task && (
            <div className="field">
              <label htmlFor="task-status">任务状态</label>
              <select
                id="task-status"
                value={completed ? 'completed' : 'pending'}
                onChange={(e) => setCompleted(e.target.value === 'completed')}
                disabled={write.isPending}
              >
                <option value="pending">未完成</option>
                <option value="completed">已完成</option>
              </select>
            </div>
          )}
          <div className="editor-tip">小提示：把大目标拆成小任务，每次专注完成一件事。</div>
          {task && !dirty && (
            <Link className="editor-history" to={`/task-logs?task_id=${task.id}`} onClick={close}>
              查看这项任务的操作记录
              <ArrowUpRight size={16} />
            </Link>
          )}
          {error && <ErrorBanner message={error} />}
          {discard && (
            <div className="discard-box" role="alert">
              <strong>有尚未保存的修改</strong>
              <p>离开后，这次修改将不会保存。</p>
              <div>
                <button type="button" className="secondary" onClick={() => setDiscard(false)}>
                  继续编辑
                </button>
                <button type="button" className="danger-button" onClick={close}>
                  放弃修改
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <button type="button" className="secondary" onClick={requestClose} disabled={write.isPending}>
            取消
          </button>
          <button className="primary" disabled={write.isPending || (!!task && !dirty)}>
            {write.isPending ? <LoaderCircle className="spinner" size={16} /> : <Save size={16} />}
            {write.isPending ? '保存中…' : '保存任务'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
