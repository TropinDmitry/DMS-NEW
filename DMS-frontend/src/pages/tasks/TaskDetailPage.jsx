import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPaperPlane, faPenToSquare, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import { tasksApi } from '~/api';
import { useAuth } from '~/auth/AuthContext';
import useApiMutation from '~/hooks/useApiMutation';
import { STATUSES, toOptions } from '~/lib/constants';
import { formatDateTime, isOverdue } from '~/lib/format';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button, ButtonLink } from '~/components/ui/Button';
import { ImportanceBadge } from '~/components/ui/Badge';
import { Select, Textarea } from '~/components/ui/Field';
import Avatar from '~/components/ui/Avatar';
import { useConfirm } from '~/components/ui/ConfirmProvider';
import { PageSpinner } from '~/components/ui/Spinner';
import Attachments from '~/components/Attachments';
import NotFoundPage from '~/pages/NotFoundPage';

function Row({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 last:border-0 sm:grid-cols-[160px_1fr]">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{children || '—'}</dd>
    </div>
  );
}

function Comments({ task }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [text, setText] = useState('');
  const invalidate = [['tasks', 'detail', String(task.id)]];

  const add = useApiMutation((value) => tasksApi.addComment(task.id, value), { invalidate, onSuccess: () => setText('') });
  const remove = useApiMutation((commentId) => tasksApi.removeComment(task.id, commentId), { invalidate });

  const handleRemove = async (c) => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t('tasks.deleteCommentConfirm'),
        danger: true,
        confirmText: t('common.delete'),
      })
    )
      remove.mutate(c.id);
  };

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold">
        {t('tasks.comments')} <span className="font-normal text-gray-400">({task.comments.length})</span>
      </h2>
      <ul className="space-y-4">
        {task.comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.author?.fullName} src={c.author?.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{c.author?.fullName ?? t('tasks.deletedUser')}</span>
                <span className="text-xs text-gray-400">{formatDateTime(c.createdAt, i18n.language)}</span>
                {(c.author?.id === user.id || user.role === 'admin') && (
                  <button
                    type="button"
                    onClick={() => handleRemove(c)}
                    aria-label={t('common.delete')}
                    className="ml-auto text-gray-400 hover:text-red-600"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{c.text}</p>
            </div>
          </li>
        ))}
        {task.comments.length === 0 && <li className="text-sm text-gray-500">{t('tasks.noComments')}</li>}
      </ul>

      <form
        className="mt-5 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) add.mutate(text.trim());
        }}
      >
        <Textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('tasks.commentPlaceholder')}
          maxLength={2000}
        />
        <div className="text-right">
          <Button type="submit" icon={faPaperPlane} loading={add.isPending} disabled={!text.trim()}>
            {t('tasks.send')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const task = useQuery({ queryKey: ['tasks', 'detail', id], queryFn: () => tasksApi.get(id) });

  const invalidate = [['tasks'], ['dashboard']];
  const setStatus = useApiMutation((status) => tasksApi.setStatus(id, status), { invalidate, success: 'tasks.statusChanged' });
  const upload = useApiMutation((files) => tasksApi.upload(id, files), { invalidate, success: 'common.filesUploaded' });
  const removeFile = useApiMutation((fileId) => tasksApi.removeFile(id, fileId), { invalidate, success: 'common.deleted' });
  const remove = useApiMutation(() => tasksApi.remove(id), {
    invalidate,
    success: 'common.deleted',
    onSuccess: () => navigate('/tasks', { replace: true }),
  });

  if (task.isLoading) return <PageSpinner />;
  if (task.isError) return <NotFoundPage />;

  const d = task.data;
  const overdue = isOverdue(d);

  const handleDelete = async () => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t('tasks.deleteConfirm', { title: d.title }),
        danger: true,
        confirmText: t('common.delete'),
      })
    )
      remove.mutate();
  };

  return (
    <>
      <PageHeader title={d.title} subtitle={t('tasks.createdBy', { name: d.createdByName ?? '—' })}>
        <ButtonLink to="/tasks" variant="secondary" icon={faArrowLeft}>
          {t('common.back')}
        </ButtonLink>
        {d.canEdit && (
          <>
            <ButtonLink to={`/tasks/${d.id}/edit`} icon={faPenToSquare}>
              {t('common.edit')}
            </ButtonLink>
            <Button variant="danger" icon={faTrashCan} onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </>
        )}
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="p-5">
            <dl>
              <Row label={t('tasks.status')}>
                {d.canParticipate ? (
                  <Select
                    value={d.status}
                    options={toOptions(t, 'status', STATUSES)}
                    onChange={(e) => setStatus.mutate(e.target.value)}
                    className="!w-auto"
                    aria-label={t('tasks.status')}
                  />
                ) : (
                  t(`status.${d.status}`)
                )}
              </Row>
              <Row label={t('tasks.importance')}>
                <ImportanceBadge value={d.importance} />
              </Row>
              <Row label={t('tasks.deadline')}>
                {d.deadline && (
                  <span className={overdue ? 'font-medium text-red-600' : ''}>
                    {formatDateTime(d.deadline, i18n.language)}
                    {overdue && ` · ${t('tasks.overdue')}`}
                  </span>
                )}
              </Row>
              <Row label={t('tasks.document')}>
                {d.documentId && (
                  <Link to={`/documents/${d.documentId}`} className="text-primary-600 hover:underline">
                    {d.documentNumber} · {d.documentTitle}
                  </Link>
                )}
              </Row>
              <Row label={t('tasks.assignees')}>
                <ul className="flex flex-wrap gap-3">
                  {d.assignees.map((u) => (
                    <li key={u.id} className="flex items-center gap-2">
                      <Avatar name={u.fullName} src={u.avatarUrl} size="sm" /> {u.fullName}
                    </li>
                  ))}
                </ul>
              </Row>
              <Row label={t('tasks.description')}>
                <p className="whitespace-pre-wrap">{d.description}</p>
              </Row>
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">{t('documents.attachments')}</h2>
            <Attachments
              items={d.attachments}
              canEdit={d.canEdit}
              uploading={upload.isPending}
              onUpload={upload.mutate}
              onRemove={removeFile.mutate}
            />
          </Card>
        </div>
        <Comments task={d} />
      </div>
    </>
  );
}
