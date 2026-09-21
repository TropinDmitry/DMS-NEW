import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faFileLines, faFilterCircleXmark, faPlus } from '@fortawesome/free-solid-svg-icons';
import { tasksApi } from '~/api';
import { isStaff, useAuth } from '~/auth/AuthContext';
import useListState from '~/hooks/useListState';
import { IMPORTANCE, STATUSES, toOptions } from '~/lib/constants';
import { formatDateTime, isOverdue } from '~/lib/format';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button, ButtonLink } from '~/components/ui/Button';
import { Field, Input, Select } from '~/components/ui/Field';
import { ImportanceBadge, StatusBadge } from '~/components/ui/Badge';
import Avatar from '~/components/ui/Avatar';
import EmptyState from '~/components/ui/EmptyState';
import Pagination from '~/components/ui/Pagination';
import { PageSpinner } from '~/components/ui/Spinner';
import SearchInput from '~/components/ui/SearchInput';

const DEFAULT_FILTERS = { search: '', status: '', importance: '', dateFrom: '', dateTo: '', mine: '' };

/** Аватарки исполнителей «стопкой»: первые 4 и «+N» */
export function AvatarStack({ users = [], max = 4 }) {
  const shown = users.slice(0, max);
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => (
        <Avatar key={u.id} name={u.fullName} src={u.avatarUrl} size="sm" className="ring-2 ring-white" />
      ))}
      {users.length > max && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700 ring-2 ring-white">
          +{users.length - max}
        </span>
      )}
    </div>
  );
}

function TaskCard({ task }) {
  const { t, i18n } = useTranslation();
  const overdue = isOverdue(task);
  return (
    <Link to={`/tasks/${task.id}`} className="block h-full">
      <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-pop">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ImportanceBadge value={task.importance} />
          <StatusBadge value={task.status} />
        </div>
        <h3 className="line-clamp-2 font-semibold text-gray-900">{task.title}</h3>
        {task.documentTitle && (
          <p className="mt-1 flex items-center gap-2 truncate text-xs text-gray-500">
            <FontAwesomeIcon icon={faFileLines} />
            <span className="truncate">
              {task.documentNumber} · {task.documentTitle}
            </span>
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <span className={`flex items-center gap-1.5 text-xs ${overdue ? 'font-medium text-red-600' : 'text-gray-500'}`}>
            <FontAwesomeIcon icon={faClock} />
            {task.deadline ? formatDateTime(task.deadline, i18n.language) : t('tasks.noDeadline')}
            {overdue && ` · ${t('tasks.overdue')}`}
          </span>
          <AvatarStack users={task.assignees} />
        </div>
      </Card>
    </Link>
  );
}

export default function TasksPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const staff = isStaff(user);
  const list = useListState(DEFAULT_FILTERS, 12);

  const query = useQuery({
    queryKey: ['tasks', 'list', list.params],
    queryFn: () => tasksApi.list(list.params),
    placeholderData: keepPreviousData,
  });
  const f = list.filters;

  return (
    <>
      <PageHeader title={t('tasks.title')} subtitle={t(staff ? 'tasks.subtitleStaff' : 'tasks.subtitle')}>
        {staff && (
          <ButtonLink to="/tasks/new" icon={faPlus}>
            {t('tasks.create')}
          </ButtonLink>
        )}
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('common.search')} className="lg:col-span-2">
            <SearchInput value={f.search} onSearch={(v) => list.setFilter('search', v)} placeholder={t('tasks.searchPlaceholder')} />
          </Field>
          <Field label={t('tasks.status')}>
            <Select
              value={f.status}
              onChange={(e) => list.setFilter('status', e.target.value)}
              options={toOptions(t, 'status', STATUSES)}
              placeholder={t('common.all')}
            />
          </Field>
          <Field label={t('tasks.importance')}>
            <Select
              value={f.importance}
              onChange={(e) => list.setFilter('importance', e.target.value)}
              options={toOptions(t, 'importance', IMPORTANCE)}
              placeholder={t('common.all')}
            />
          </Field>
          <Field label={t('tasks.deadlineFrom')}>
            <Input type="date" value={f.dateFrom} onChange={(e) => list.setFilter('dateFrom', e.target.value)} />
          </Field>
          <Field label={t('tasks.deadlineTo')}>
            <Input type="date" value={f.dateTo} onChange={(e) => list.setFilter('dateTo', e.target.value)} />
          </Field>
          {staff && (
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700">
              <input type="checkbox" checked={f.mine === '1'} onChange={(e) => list.setFilter('mine', e.target.checked ? '1' : '')} />
              {t('tasks.onlyMine')}
            </label>
          )}
        </div>
        {list.hasFilters && (
          <div className="mt-3">
            <Button variant="secondary" size="sm" icon={faFilterCircleXmark} onClick={list.reset}>
              {t('common.resetFilters')}
            </Button>
          </div>
        )}
      </Card>

      {query.isLoading ? (
        <PageSpinner />
      ) : query.data.items.length === 0 ? (
        <Card>
          <EmptyState text={list.hasFilters ? t('common.nothingFound') : t('tasks.empty')} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {query.data.items.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {query.data && query.data.total > 0 && (
        <Card className="mt-4">
          <Pagination page={list.page} limit={list.limit} total={query.data.total} onPage={list.setPage} onLimit={list.setLimit} />
        </Card>
      )}
    </>
  );
}
