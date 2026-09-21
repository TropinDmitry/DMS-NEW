import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { faFilterCircleXmark, faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { documentsApi } from '~/api';
import { isStaff, useAuth } from '~/auth/AuthContext';
import useListState from '~/hooks/useListState';
import useApiMutation from '~/hooks/useApiMutation';
import { toSelect, useDepartmentOptions, useDocumentTypeOptions } from '~/hooks/useOptions';
import { IMPORTANCE, STATUSES, toOptions } from '~/lib/constants';
import { formatDate } from '~/lib/format';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button, ButtonLink } from '~/components/ui/Button';
import { Field, Input, Select } from '~/components/ui/Field';
import { ImportanceBadge, StatusBadge } from '~/components/ui/Badge';
import { useConfirm } from '~/components/ui/ConfirmProvider';
import DataTable from '~/components/ui/DataTable';
import Pagination from '~/components/ui/Pagination';
import SearchInput from '~/components/ui/SearchInput';

const DEFAULT_FILTERS = { search: '', docTypeId: '', status: '', importance: '', departmentId: '', dateFrom: '', dateTo: '' };

/**
 * Журнал документов. Один и тот же компонент показывает и входящие, и исходящие:
 * они отличаются единственным параметром direction ('in' / 'out').
 * Раньше это были два файла по 660 строк, отличавшиеся парой слов.
 */
export default function DocumentsPage({ direction }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const staff = isStaff(user);
  const list = useListState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState([]);

  const types = useDocumentTypeOptions();
  const departments = useDepartmentOptions();

  const query = useQuery({
    queryKey: ['documents', 'list', direction, list.params],
    queryFn: () => documentsApi.list({ ...list.params, direction, archived: 0 }),
    placeholderData: keepPreviousData,
  });

  const invalidate = [['documents'], ['dashboard']];
  const setStatus = useApiMutation(({ id, status }) => documentsApi.setStatus(id, status), {
    invalidate,
    success: 'documents.statusChanged',
  });
  const setDepartment = useApiMutation(({ id, departmentId }) => documentsApi.setDepartment(id, departmentId), {
    invalidate,
    success: 'documents.departmentChanged',
  });
  const remove = useApiMutation(documentsApi.remove, { invalidate, success: 'common.deleted' });
  const removeMany = useApiMutation(documentsApi.removeMany, { invalidate, success: 'common.deleted', onSuccess: () => setSelected([]) });

  const handleDelete = async (doc) => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t('documents.deleteConfirm', { title: doc.title }),
        danger: true,
        confirmText: t('common.delete'),
      })
    ) {
      remove.mutate(doc.id);
    }
  };
  const handleDeleteMany = async () => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t('common.deleteManyConfirm', { count: selected.length }),
        danger: true,
        confirmText: t('common.delete'),
      })
    ) {
      removeMany.mutate(selected);
    }
  };

  const columns = [
    { key: 'number', header: t('documents.number'), cell: (d) => <span className="whitespace-nowrap font-mono text-xs">{d.number}</span> },
    {
      key: 'title',
      header: t('documents.title'),
      className: 'min-w-[220px]',
      // Вид документа и корреспондент — второй строкой под названием: так таблица не разъезжается вширь
      cell: (d) => (
        <>
          <Link to={`/documents/${d.id}`} className="font-medium text-primary-600 hover:underline">
            {d.title}
          </Link>
          <div className="mt-0.5 text-xs text-gray-500">{[d.docTypeName, d.correspondent].filter(Boolean).join(' · ')}</div>
        </>
      ),
    },
    {
      key: 'date',
      header: t('documents.date'),
      cell: (d) => <span className="whitespace-nowrap">{formatDate(d.docDate, i18n.language)}</span>,
    },
    { key: 'importance', header: t('documents.importance'), cell: (d) => <ImportanceBadge value={d.importance} /> },
    {
      key: 'status',
      header: t('documents.status'),
      // Менять статус можно только тем, кто вправе управлять документом (сервер это тоже проверяет)
      cell: (d) =>
        d.canManage ? (
          <Select
            value={d.status}
            options={toOptions(t, 'status', STATUSES)}
            onChange={(e) => setStatus.mutate({ id: d.id, status: e.target.value })}
            className="!w-auto !max-w-[9.5rem] !py-1 !text-xs"
            aria-label={t('documents.status')}
          />
        ) : (
          <StatusBadge value={d.status} />
        ),
    },
    {
      key: 'department',
      header: t('documents.departmentShort'),
      cell: (d) =>
        d.canManage ? (
          <Select
            value={d.departmentId ?? ''}
            options={toSelect(departments.data)}
            placeholder="—"
            onChange={(e) => setDepartment.mutate({ id: d.id, departmentId: e.target.value ? Number(e.target.value) : null })}
            className="!w-auto !max-w-[9.5rem] !py-1 !text-xs"
            aria-label={t('documents.department')}
          />
        ) : (
          (d.departmentName ?? '—')
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      cell: (d) => (
        <div className="flex justify-end gap-1">
          {d.canManage && (
            <>
              <Button
                variant="ghost"
                size="icon"
                icon={faPenToSquare}
                onClick={() => navigate(`/documents/${d.id}/edit`)}
                aria-label={t('common.edit')}
                title={t('common.edit')}
              />
              <Button
                variant="ghost"
                size="icon"
                icon={faTrashCan}
                onClick={() => handleDelete(d)}
                aria-label={t('common.delete')}
                title={t('common.delete')}
                className="text-red-600"
              />
            </>
          )}
        </div>
      ),
    },
  ];

  const f = list.filters;
  return (
    <>
      <PageHeader
        title={t(direction === 'in' ? 'documents.titleIn' : 'documents.titleOut')}
        subtitle={t(direction === 'in' ? 'documents.subtitleIn' : 'documents.subtitleOut')}
      >
        {staff && selected.length > 0 && (
          <Button variant="danger" icon={faTrashCan} onClick={handleDeleteMany}>
            {t('common.deleteSelected', { count: selected.length })}
          </Button>
        )}
        <ButtonLink to={`/documents/${direction}/new`} icon={faPlus}>
          {t('documents.register')}
        </ButtonLink>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('common.search')} className="sm:col-span-2">
            <SearchInput value={f.search} onSearch={(v) => list.setFilter('search', v)} placeholder={t('documents.searchPlaceholder')} />
          </Field>
          <Field label={t('documents.docType')}>
            <Select
              value={f.docTypeId}
              onChange={(e) => list.setFilter('docTypeId', e.target.value)}
              options={toSelect(types.data)}
              placeholder={t('common.all')}
            />
          </Field>
          <Field label={t('documents.department')}>
            <Select
              value={f.departmentId}
              onChange={(e) => list.setFilter('departmentId', e.target.value)}
              options={toSelect(departments.data)}
              placeholder={t('common.all')}
            />
          </Field>
          <Field label={t('documents.status')}>
            <Select
              value={f.status}
              onChange={(e) => list.setFilter('status', e.target.value)}
              options={toOptions(t, 'status', STATUSES)}
              placeholder={t('common.all')}
            />
          </Field>
          <Field label={t('documents.importance')}>
            <Select
              value={f.importance}
              onChange={(e) => list.setFilter('importance', e.target.value)}
              options={toOptions(t, 'importance', IMPORTANCE)}
              placeholder={t('common.all')}
            />
          </Field>
          <Field label={t('common.dateFrom')}>
            <Input type="date" value={f.dateFrom} onChange={(e) => list.setFilter('dateFrom', e.target.value)} />
          </Field>
          <Field label={t('common.dateTo')}>
            <Input type="date" value={f.dateTo} onChange={(e) => list.setFilter('dateTo', e.target.value)} />
          </Field>
        </div>
        {list.hasFilters && (
          <div className="mt-3">
            <Button variant="secondary" size="sm" icon={faFilterCircleXmark} onClick={list.reset}>
              {t('common.resetFilters')}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          loading={query.isLoading}
          selectable={staff}
          selected={selected}
          onSelect={setSelected}
          emptyText={list.hasFilters ? t('common.nothingFound') : t('documents.empty')}
        />
        <Pagination page={list.page} limit={list.limit} total={query.data?.total ?? 0} onPage={list.setPage} onLimit={list.setLimit} />
      </Card>
    </>
  );
}
