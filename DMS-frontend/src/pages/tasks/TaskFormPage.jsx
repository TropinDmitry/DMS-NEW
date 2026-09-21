import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { faFloppyDisk, faXmark } from '@fortawesome/free-solid-svg-icons';
import { documentsApi, tasksApi } from '~/api';
import useForm from '~/hooks/useForm';
import useApiMutation from '~/hooks/useApiMutation';
import { useUserLookup } from '~/hooks/useOptions';
import { IMPORTANCE, STATUSES, toOptions } from '~/lib/constants';
import { required } from '~/lib/validators';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button, ButtonLink } from '~/components/ui/Button';
import { Field, Input, Select, Textarea } from '~/components/ui/Field';
import Avatar from '~/components/ui/Avatar';
import FileInput from '~/components/ui/FileInput';
import { PageSpinner } from '~/components/ui/Spinner';
import NotFoundPage from '~/pages/NotFoundPage';

/** Выбор исполнителей: поиск по имени + флажки. selected — массив id. */
function AssigneePicker({ selected, onChange }) {
  const { t } = useTranslation();
  const users = useUserLookup();
  const [filter, setFilter] = useState('');
  const shown = (users.data ?? []).filter((u) => u.fullName.toLowerCase().includes(filter.toLowerCase()));
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="rounded-md border border-gray-300 bg-white">
      <div className="border-b border-gray-200 p-2">
        <Input placeholder={t('tasks.findUser')} value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <ul className="max-h-52 overflow-y-auto">
        {shown.map((u) => (
          <li key={u.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
              <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
              <Avatar name={u.fullName} src={u.avatarUrl} size="sm" />
              <span className="text-sm">{u.fullName}</span>
              {u.departmentName && <span className="ml-auto text-xs text-gray-400">{u.departmentName}</span>}
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="px-3 py-4 text-center text-sm text-gray-500">{t('common.nothingFound')}</li>}
      </ul>
    </div>
  );
}

export default function TaskFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const task = useQuery({ queryKey: ['tasks', 'detail', id], queryFn: () => tasksApi.get(id), enabled: editing });
  if (editing && task.isLoading) return <PageSpinner />;
  if (editing && task.isError) return <NotFoundPage />;
  return <TaskForm task={task.data} />;
}

function TaskForm({ task }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const editing = !!task;
  const [files, setFiles] = useState([]);

  // Для выбора документа берём первые 100 документов журнала (для учебного масштаба достаточно)
  const documents = useQuery({
    queryKey: ['documents', 'list', 'for-task'],
    queryFn: () => documentsApi.list({ limit: 100, archived: 0 }),
  });
  const documentOptions = (documents.data?.items ?? []).map((d) => ({ value: d.id, label: `${d.number} — ${d.title}` }));

  const form = useForm(
    {
      title: task?.title ?? '',
      description: task?.description ?? '',
      deadline: task?.deadline ?? '',
      importance: task?.importance ?? 'normal',
      status: task?.status ?? 'new',
      documentId: task?.documentId ?? '',
      assigneeIds: task?.assignees.map((a) => a.id) ?? [],
    },
    { title: required },
  );

  const save = useApiMutation(
    async (v) => {
      const body = { ...v, title: v.title.trim(), documentId: v.documentId ? Number(v.documentId) : null };
      const saved = editing ? await tasksApi.update(task.id, body) : await tasksApi.create(body);
      if (files.length) await tasksApi.upload(saved.id, files);
      return saved;
    },
    {
      invalidate: [['tasks'], ['dashboard']],
      success: 'common.saved',
      onSuccess: (saved) => navigate(`/tasks/${saved.id}`),
    },
  );

  return (
    <>
      <PageHeader title={editing ? t('tasks.edit') : t('tasks.create')} />
      <Card className="p-5">
        <form onSubmit={form.submit((v) => save.mutateAsync(v).catch(() => {}))} noValidate className="space-y-5">
          <Field label={t('tasks.name')} error={form.errors.title} required>
            <Input
              autoFocus
              value={form.values.title}
              onChange={form.change('title')}
              onBlur={form.blur('title')}
              invalid={!!form.errors.title}
              maxLength={300}
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-3">
            <Field label={t('tasks.deadline')}>
              <Input type="datetime-local" value={form.values.deadline} onChange={form.change('deadline')} />
            </Field>
            <Field label={t('tasks.importance')}>
              <Select
                value={form.values.importance}
                onChange={form.change('importance')}
                options={toOptions(t, 'importance', IMPORTANCE)}
              />
            </Field>
            <Field label={t('tasks.status')}>
              <Select value={form.values.status} onChange={form.change('status')} options={toOptions(t, 'status', STATUSES)} />
            </Field>
          </div>

          <Field label={t('tasks.document')} hint={t('tasks.documentHint')}>
            <Select
              value={form.values.documentId}
              onChange={form.change('documentId')}
              options={documentOptions}
              placeholder={t('tasks.noDocument')}
            />
          </Field>

          <div>
            <div className="mb-1 text-sm font-medium text-gray-700">
              {t('tasks.assignees')} <span className="font-normal text-gray-400">({form.values.assigneeIds.length})</span>
            </div>
            <AssigneePicker selected={form.values.assigneeIds} onChange={(ids) => form.setField('assigneeIds', ids)} />
          </div>

          <Field label={t('tasks.description')}>
            <Textarea value={form.values.description} onChange={form.change('description')} rows={5} maxLength={5000} />
          </Field>

          {editing ? (
            <p className="text-sm text-gray-500">{t('tasks.filesOnDetail')}</p>
          ) : (
            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">{t('documents.attachments')}</div>
              <FileInput files={files} onChange={setFiles} />
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-5">
            <Button type="submit" icon={faFloppyDisk} loading={form.submitting}>
              {t('common.save')}
            </Button>
            <ButtonLink to={editing ? `/tasks/${task.id}` : '/tasks'} variant="secondary" icon={faXmark}>
              {t('common.cancel')}
            </ButtonLink>
          </div>
        </form>
      </Card>
    </>
  );
}
