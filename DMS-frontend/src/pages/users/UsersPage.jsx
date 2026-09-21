import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { faFilterCircleXmark, faPenToSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { usersApi } from '~/api';
import { useAuth } from '~/auth/AuthContext';
import useApiMutation from '~/hooks/useApiMutation';
import useListState from '~/hooks/useListState';
import { ROLES, toOptions } from '~/lib/constants';
import { Card, PageHeader } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Button, ButtonLink } from '~/components/ui/Button';
import { Field, Select } from '~/components/ui/Field';
import { useConfirm } from '~/components/ui/ConfirmProvider';
import Avatar from '~/components/ui/Avatar';
import DataTable from '~/components/ui/DataTable';
import Pagination from '~/components/ui/Pagination';
import SearchInput from '~/components/ui/SearchInput';
import Switch from '~/components/ui/Switch';

const DEFAULT_FILTERS = { search: '', role: '', active: '' };

export default function UsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const list = useListState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState([]);

  const query = useQuery({
    queryKey: ['users', 'list', list.params],
    queryFn: () => usersApi.list(list.params),
    placeholderData: keepPreviousData,
  });

  const invalidate = [['users']];
  const setRole = useApiMutation(({ id, role }) => usersApi.setRole(id, role), { invalidate, success: 'users.roleChanged' });
  const setActive = useApiMutation(({ id, active }) => usersApi.setActive(id, active), { invalidate, success: 'users.activeChanged' });
  const remove = useApiMutation(usersApi.remove, { invalidate, success: 'common.deleted' });
  const removeMany = useApiMutation(usersApi.removeMany, { invalidate, success: 'common.deleted', onSuccess: () => setSelected([]) });

  const handleDelete = async (u) => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t('users.deleteConfirm', { name: u.fullName }),
        danger: true,
        confirmText: t('common.delete'),
      })
    )
      remove.mutate(u.id);
  };
  const handleDeleteMany = async () => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t('common.deleteManyConfirm', { count: selected.length }),
        danger: true,
        confirmText: t('common.delete'),
      })
    )
      removeMany.mutate(selected);
  };

  const columns = [
    {
      key: 'user',
      header: t('users.user'),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} src={u.avatarUrl} />
          <div className="min-w-0">
            <div className="truncate font-medium">{u.fullName}</div>
            <div className="truncate text-xs text-gray-500">{u.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: t('users.phone'), cell: (u) => <span className="whitespace-nowrap">{u.phone || '—'}</span> },
    { key: 'department', header: t('users.department'), cell: (u) => u.departmentName ?? '—' },
    {
      key: 'role',
      header: t('users.role'),
      cell: (u) => (
        <Select
          value={u.role}
          options={toOptions(t, 'roles', ROLES)}
          onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value })}
          disabled={u.id === me.id} // свою роль здесь менять нельзя — чтобы случайно не лишить себя прав
          className="!w-auto !py-1"
          aria-label={t('users.role')}
        />
      ),
    },
    {
      key: 'active',
      header: t('users.access'),
      cell: (u) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={u.active}
            disabled={u.id === me.id}
            onChange={(active) => setActive.mutate({ id: u.id, active })}
            label={t('users.access')}
          />
          {!u.active && <Badge tone="amber">{t('users.pending')}</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28 text-right',
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            icon={faPenToSquare}
            onClick={() => navigate(`/users/${u.id}/edit`)}
            aria-label={t('common.edit')}
            title={t('common.edit')}
          />
          <Button
            variant="ghost"
            size="icon"
            icon={faTrashCan}
            disabled={u.id === me.id}
            onClick={() => handleDelete(u)}
            aria-label={t('common.delete')}
            title={t('common.delete')}
            className="text-red-600"
          />
        </div>
      ),
    },
  ];

  const f = list.filters;
  return (
    <>
      <PageHeader title={t('users.title')} subtitle={t('users.subtitle')}>
        {selected.length > 0 && (
          <Button variant="danger" icon={faTrashCan} onClick={handleDeleteMany}>
            {t('common.deleteSelected', { count: selected.length })}
          </Button>
        )}
        <ButtonLink to="/users/new" icon={faPlus}>
          {t('users.create')}
        </ButtonLink>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('common.search')}>
            <SearchInput value={f.search} onSearch={(v) => list.setFilter('search', v)} placeholder={t('users.searchPlaceholder')} />
          </Field>
          <Field label={t('users.role')}>
            <Select
              value={f.role}
              onChange={(e) => list.setFilter('role', e.target.value)}
              options={toOptions(t, 'roles', ROLES)}
              placeholder={t('common.all')}
            />
          </Field>
          <Field label={t('users.access')}>
            <Select
              value={f.active}
              onChange={(e) => list.setFilter('active', e.target.value)}
              options={[
                { value: 'true', label: t('users.activeOnly') },
                { value: 'false', label: t('users.pending') },
              ]}
              placeholder={t('common.all')}
            />
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
          selectable
          selected={selected}
          onSelect={setSelected}
        />
        <Pagination page={list.page} limit={list.limit} total={query.data?.total ?? 0} onPage={list.setPage} onLimit={list.setLimit} />
      </Card>
    </>
  );
}
