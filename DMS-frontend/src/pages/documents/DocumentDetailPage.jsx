import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { faArchive, faArrowLeft, faBoxOpen, faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { documentsApi, tasksApi } from '~/api';
import { isStaff, useAuth } from '~/auth/AuthContext';
import useApiMutation from '~/hooks/useApiMutation';
import { toSelect, useFolderOptions } from '~/hooks/useOptions';
import { STATUSES, toOptions } from '~/lib/constants';
import { formatDate, formatDateTime } from '~/lib/format';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button, ButtonLink } from '~/components/ui/Button';
import { ImportanceBadge, StatusBadge } from '~/components/ui/Badge';
import { Select } from '~/components/ui/Field';
import { useConfirm } from '~/components/ui/ConfirmProvider';
import { PageSpinner } from '~/components/ui/Spinner';
import Attachments from '~/components/Attachments';
import NotFoundPage from '~/pages/NotFoundPage';

function Row({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 last:border-0 sm:grid-cols-[200px_1fr]">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{children || '—'}</dd>
    </div>
  );
}

/** Полоса «прогресса» жизненного цикла: Новый → В работе → Ожидает утверждения → Завершён */
function StatusSteps({ status }) {
  const { t } = useTranslation();
  const current = STATUSES.indexOf(status);
  return (
    <div>
      <div className="flex gap-1">
        {STATUSES.map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${i <= current ? (status === 'done' ? 'bg-emerald-500' : 'bg-primary-600') : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <div className="mt-1 hidden justify-between text-[11px] text-gray-400 sm:flex">
        {STATUSES.map((s) => (
          <span key={s}>{t(`status.${s}`)}</span>
        ))}
      </div>
    </div>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const staff = isStaff(user);
  const [folderId, setFolderId] = useState('');
  const folders = useFolderOptions();

  const doc = useQuery({ queryKey: ['documents', 'detail', id], queryFn: () => documentsApi.get(id) });
  const tasks = useQuery({ queryKey: ['tasks', 'list', { documentId: id }], queryFn: () => tasksApi.list({ documentId: id, limit: 50 }) });

  const invalidate = [['documents'], ['dashboard'], ['archive-folders']];
  const setStatus = useApiMutation((status) => documentsApi.setStatus(id, status), { invalidate, success: 'documents.statusChanged' });
  const upload = useApiMutation((files) => documentsApi.upload(id, files), { invalidate, success: 'common.filesUploaded' });
  const removeFile = useApiMutation((fileId) => documentsApi.removeFile(id, fileId), { invalidate, success: 'common.deleted' });
  const archive = useApiMutation((folder) => documentsApi.archive(id, folder), { invalidate, success: 'archive.done' });
  const remove = useApiMutation(() => documentsApi.remove(id), {
    invalidate,
    success: 'common.deleted',
    onSuccess: () => navigate(`/documents/${doc.data.direction}`, { replace: true }),
  });

  if (doc.isLoading) return <PageSpinner />;
  if (doc.isError) return <NotFoundPage />;

  const d = doc.data;
  const canManage = d.canManage;

  const handleDelete = async () => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t('documents.deleteConfirm', { title: d.title }),
        danger: true,
        confirmText: t('common.delete'),
      })
    ) {
      remove.mutate();
    }
  };

  return (
    <>
      <PageHeader title={d.title} subtitle={`${t(d.direction === 'in' ? 'documents.incoming' : 'documents.outgoing')} · ${d.number}`}>
        <ButtonLink to={`/documents/${d.direction}`} variant="secondary" icon={faArrowLeft}>
          {t('common.back')}
        </ButtonLink>
        {canManage && (
          <>
            <ButtonLink to={`/documents/${d.id}/edit`} icon={faPenToSquare}>
              {t('common.edit')}
            </ButtonLink>
            <Button variant="danger" icon={faTrashCan} onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </>
        )}
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <StatusSteps status={d.status} />
          <dl className="mt-4">
            <Row label={t('documents.status')}>
              {canManage ? (
                <Select
                  value={d.status}
                  options={toOptions(t, 'status', STATUSES)}
                  onChange={(e) => setStatus.mutate(e.target.value)}
                  className="!w-auto"
                  aria-label={t('documents.status')}
                />
              ) : (
                <StatusBadge value={d.status} />
              )}
            </Row>
            <Row label={t('documents.importance')}>
              <ImportanceBadge value={d.importance} />
            </Row>
            <Row label={t('documents.docType')}>{d.docTypeName}</Row>
            <Row label={t('documents.date')}>{formatDate(d.docDate, i18n.language)}</Row>
            <Row label={t(d.direction === 'in' ? 'documents.sender' : 'documents.recipient')}>{d.correspondent}</Row>
            <Row label={t('documents.department')}>{d.departmentName}</Row>
            <Row label={t('documents.description')}>
              <p className="whitespace-pre-wrap">{d.description}</p>
            </Row>
            <Row label={t('documents.registeredBy')}>
              {d.createdByName} · {formatDateTime(d.createdAt, i18n.language)}
            </Row>
          </dl>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">{t('documents.attachments')}</h2>
            <Attachments
              items={d.attachments}
              canEdit={canManage}
              uploading={upload.isPending}
              onUpload={upload.mutate}
              onRemove={removeFile.mutate}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">{t('archive.title')}</h2>
            {d.archiveFolderId ? (
              <>
                <p className="text-sm text-gray-700">{t('archive.inFolder', { name: d.archiveFolderName })}</p>
                {staff && (
                  <Button variant="secondary" size="sm" icon={faBoxOpen} className="mt-3" onClick={() => archive.mutate(null)}>
                    {t('archive.remove')}
                  </Button>
                )}
              </>
            ) : d.status !== 'done' ? (
              <p className="text-sm text-gray-500">{t('archive.onlyDone')}</p>
            ) : staff ? (
              <div className="space-y-2">
                <Select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  options={toSelect(folders.data)}
                  placeholder={t('archive.chooseFolder')}
                />
                <Button size="sm" icon={faArchive} disabled={!folderId} onClick={() => archive.mutate(Number(folderId))}>
                  {t('archive.put')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('archive.staffOnly')}</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">{t('tasks.title')}</h2>
            {tasks.data?.items.length ? (
              <ul className="space-y-2">
                {tasks.data.items.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/tasks/${task.id}`} className="truncate text-primary-600 hover:underline">
                      {task.title}
                    </Link>
                    <StatusBadge value={task.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">{t('documents.noTasks')}</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
