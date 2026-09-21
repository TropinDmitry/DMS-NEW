import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import useListState from '~/hooks/useListState';
import useApiMutation from '~/hooks/useApiMutation';
import { useConfirm } from '~/components/ui/ConfirmProvider';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import DataTable from '~/components/ui/DataTable';
import Pagination from '~/components/ui/Pagination';
import SearchInput from '~/components/ui/SearchInput';
import Switch from '~/components/ui/Switch';
import ReferenceFormModal from './ReferenceFormModal';

const DEFAULT_FILTERS = { search: '' }; // вне компонента, чтобы объект не пересоздавался на каждый рендер

/**
 * Универсальная страница справочника. Отделы и виды документов отличаются только настройками (config),
 * а не кодом: раньше это были две страницы по 412 строк с почти одинаковым текстом.
 *
 * config: { key, api, i18n }  — key — имя справочника для кэша; i18n — префикс переводов ('departments'); api — набор запросов.
 */
export default function ReferencePage({ config }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const list = useListState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(undefined); // undefined — окно закрыто, null — новая запись, объект — правка
  const { key, api, i18n } = config;

  const query = useQuery({
    queryKey: [key, 'list', list.params],
    queryFn: () => api.list(list.params),
    placeholderData: keepPreviousData, // пока грузится новая страница, показываем прежнюю, без «мигания»
  });

  const invalidate = [[key]];
  const save = useApiMutation((body) => (editing ? api.update(editing.id, body) : api.create(body)), {
    invalidate,
    success: 'common.saved',
    onSuccess: () => setEditing(undefined),
  });
  const toggle = useApiMutation(({ id, active }) => api.setActive(id, active), { invalidate });
  const remove = useApiMutation(api.remove, { invalidate, success: 'common.deleted' });
  const removeMany = useApiMutation(api.removeMany, {
    invalidate,
    success: 'common.deleted',
    onSuccess: () => setSelected([]),
  });

  const handleDelete = async (row) => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t(`${i18n}.deleteConfirm`, { name: row.name }),
        danger: true,
        confirmText: t('common.delete'),
      })
    ) {
      remove.mutate(row.id);
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
    { key: 'name', header: t('references.name'), cell: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: 'description',
      header: t('references.description'),
      cell: (r) => <span className="text-gray-600">{r.description || '—'}</span>,
      className: 'max-w-xs truncate',
    },
    { key: 'documents', header: t('references.documentsCount'), cell: (r) => r.documentsCount ?? '—' },
    ...(config.showUsers ? [{ key: 'users', header: t('references.usersCount'), cell: (r) => r.usersCount ?? '—' }] : []),
    {
      key: 'active',
      header: t('references.active'),
      cell: (r) => <Switch checked={r.active} onChange={(active) => toggle.mutate({ id: r.id, active })} label={t('references.active')} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28 text-right',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            icon={faPenToSquare}
            onClick={() => setEditing(r)}
            aria-label={t('common.edit')}
            title={t('common.edit')}
          />
          <Button
            variant="ghost"
            size="icon"
            icon={faTrashCan}
            onClick={() => handleDelete(r)}
            aria-label={t('common.delete')}
            title={t('common.delete')}
            className="text-red-600"
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t(`${i18n}.title`)} subtitle={t(`${i18n}.subtitle`)}>
        {selected.length > 0 && (
          <Button variant="danger" icon={faTrashCan} onClick={handleDeleteMany}>
            {t('common.deleteSelected', { count: selected.length })}
          </Button>
        )}
        <Button icon={faPlus} onClick={() => setEditing(null)}>
          {t('common.add')}
        </Button>
      </PageHeader>

      <Card>
        <div className="border-b border-gray-200 p-4">
          <div className="max-w-sm">
            <SearchInput value={list.filters.search} onSearch={(v) => list.setFilter('search', v)} placeholder={t('common.search')} />
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          loading={query.isLoading}
          selectable
          selected={selected}
          onSelect={setSelected}
        />
        <Pagination page={list.page} limit={list.limit} total={query.data?.total ?? 0} onPage={list.setPage} onLimit={list.setLimit} />
      </Card>

      <ReferenceFormModal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        item={editing}
        hasActive
        title={editing ? t(`${i18n}.edit`) : t(`${i18n}.create`)}
        onSubmit={(body) => save.mutateAsync(body).catch(() => {})}
      />
    </>
  );
}
