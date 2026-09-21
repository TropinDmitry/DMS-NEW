import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFolder, faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { documentsApi, foldersApi } from '~/api';
import { isStaff, useAuth } from '~/auth/AuthContext';
import useApiMutation from '~/hooks/useApiMutation';
import useListState from '~/hooks/useListState';
import { formatDate } from '~/lib/format';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button, ButtonLink } from '~/components/ui/Button';
import { ImportanceBadge } from '~/components/ui/Badge';
import { useConfirm } from '~/components/ui/ConfirmProvider';
import DataTable from '~/components/ui/DataTable';
import EmptyState from '~/components/ui/EmptyState';
import Pagination from '~/components/ui/Pagination';
import { PageSpinner } from '~/components/ui/Spinner';
import SearchInput from '~/components/ui/SearchInput';
import ReferenceFormModal from '~/pages/references/ReferenceFormModal';
import NotFoundPage from '~/pages/NotFoundPage';

const DEFAULT_FILTERS = { search: '' };

/** Таблица документов архива — общая для «всего архива» (поиск) и для содержимого одного дела */
function ArchiveDocuments({ folderId }) {
  const { t, i18n } = useTranslation();
  const list = useListState(DEFAULT_FILTERS);
  const query = useQuery({
    queryKey: ['documents', 'list', 'archive', folderId ?? 'all', list.params],
    queryFn: () => documentsApi.list({ ...list.params, archived: 1, folderId }),
    placeholderData: keepPreviousData,
  });

  const columns = [
    { key: 'number', header: t('documents.number'), cell: (d) => <span className="whitespace-nowrap font-mono text-xs">{d.number}</span> },
    {
      key: 'title',
      header: t('documents.title'),
      className: 'min-w-[220px]',
      cell: (d) => (
        <Link to={`/documents/${d.id}`} className="font-medium text-primary-600 hover:underline">
          {d.title}
        </Link>
      ),
    },
    { key: 'direction', header: t('archive.kind'), cell: (d) => t(d.direction === 'in' ? 'documents.incoming' : 'documents.outgoing') },
    { key: 'type', header: t('documents.docType'), cell: (d) => d.docTypeName ?? '—' },
    { key: 'date', header: t('documents.date'), cell: (d) => formatDate(d.docDate, i18n.language) },
    { key: 'importance', header: t('documents.importance'), cell: (d) => <ImportanceBadge value={d.importance} /> },
    ...(folderId ? [] : [{ key: 'folder', header: t('archive.folder'), cell: (d) => d.archiveFolderName }]),
  ];

  return (
    <Card>
      <div className="border-b border-gray-200 p-4">
        <div className="max-w-sm">
          <SearchInput
            value={list.filters.search}
            onSearch={(v) => list.setFilter('search', v)}
            placeholder={t('archive.searchPlaceholder')}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={query.data?.items}
        loading={query.isLoading}
        emptyText={list.hasFilters ? t('common.nothingFound') : t('archive.emptyFolder')}
      />
      <Pagination page={list.page} limit={list.limit} total={query.data?.total ?? 0} onPage={list.setPage} onLimit={list.setLimit} />
    </Card>
  );
}

/**
 * Архив = «дела» (папки) с завершёнными документами. В 1С:Документооборот это называется «номенклатура дел».
 * /archive           — все дела и поиск по всему архиву
 * /archive/:folderId — содержимое одного дела
 */
export default function ArchivePage() {
  const { folderId } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const staff = isStaff(user);
  const [editing, setEditing] = useState(undefined); // undefined — окно закрыто, null — новое дело, объект — правка

  const folders = useQuery({ queryKey: ['archive-folders', 'list'], queryFn: () => foldersApi.list({ limit: 200 }) });
  const invalidate = [['archive-folders']];
  const save = useApiMutation((body) => (editing ? foldersApi.update(editing.id, body) : foldersApi.create(body)), {
    invalidate,
    success: 'common.saved',
    onSuccess: () => setEditing(undefined),
  });
  const remove = useApiMutation(foldersApi.remove, {
    invalidate,
    success: 'common.deleted',
    onSuccess: () => folderId && navigate('/archive'),
  });

  const handleDelete = async (folder) => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t('archive.deleteConfirm', { name: folder.name }),
        danger: true,
        confirmText: t('common.delete'),
      })
    ) {
      remove.mutate(folder.id);
    }
  };

  const modal = (
    <ReferenceFormModal
      open={editing !== undefined}
      onClose={() => setEditing(undefined)}
      item={editing}
      hasActive={false}
      title={editing ? t('archive.editFolder') : t('archive.createFolder')}
      onSubmit={(body) => save.mutateAsync(body).catch(() => {})}
    />
  );

  if (folders.isLoading) return <PageSpinner />;

  // ---------- Содержимое одного дела ----------
  if (folderId) {
    const folder = folders.data.items.find((f) => String(f.id) === folderId);
    if (!folder) return <NotFoundPage />;
    return (
      <>
        <PageHeader title={folder.name} subtitle={folder.description}>
          <ButtonLink to="/archive" variant="secondary" icon={faArrowLeft}>
            {t('common.back')}
          </ButtonLink>
          {staff && (
            <>
              <Button icon={faPenToSquare} onClick={() => setEditing(folder)}>
                {t('common.edit')}
              </Button>
              <Button variant="danger" icon={faTrashCan} onClick={() => handleDelete(folder)}>
                {t('common.delete')}
              </Button>
            </>
          )}
        </PageHeader>
        <ArchiveDocuments folderId={folder.id} />
        {modal}
      </>
    );
  }

  // ---------- Список дел ----------
  return (
    <>
      <PageHeader title={t('archive.title')} subtitle={t('archive.subtitle')}>
        {staff && (
          <Button icon={faPlus} onClick={() => setEditing(null)}>
            {t('archive.createFolder')}
          </Button>
        )}
      </PageHeader>

      {folders.data.items.length === 0 ? (
        <Card>
          <EmptyState text={t('archive.noFolders')} icon={faFolder} />
        </Card>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {folders.data.items.map((f) => (
            <Card key={f.id} className="group relative p-4 transition-shadow hover:shadow-pop">
              <Link to={`/archive/${f.id}`} className="flex items-start gap-4">
                <FontAwesomeIcon icon={faFolder} className="mt-1 text-5xl text-amber-400" />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-gray-900">{f.name}</h3>
                  <p className="line-clamp-2 text-xs text-gray-500">{f.description || ' '}</p>
                  <p className="mt-2 text-sm text-gray-700">{t('archive.documentsCount', { count: f.documentsCount })}</p>
                </div>
              </Link>
              {staff && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <Button variant="ghost" size="icon" icon={faPenToSquare} onClick={() => setEditing(f)} aria-label={t('common.edit')} />
                  <Button
                    variant="ghost"
                    size="icon"
                    icon={faTrashCan}
                    onClick={() => handleDelete(f)}
                    aria-label={t('common.delete')}
                    className="text-red-600"
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">{t('archive.allDocuments')}</h2>
      <ArchiveDocuments />
      {modal}
    </>
  );
}
