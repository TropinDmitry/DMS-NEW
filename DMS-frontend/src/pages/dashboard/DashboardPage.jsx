import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowTurnDown,
  faArrowTurnUp,
  faCircleCheck,
  faClock,
  faListCheck,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { dashboardApi } from '~/api';
import { useAuth } from '~/auth/AuthContext';
import { STATUSES } from '~/lib/constants';
import { formatDate, formatDateTime } from '~/lib/format';
import { Card, PageHeader } from '~/components/ui/Card';
import { ImportanceBadge, StatusBadge } from '~/components/ui/Badge';
import { PageSpinner } from '~/components/ui/Spinner';
import EmptyState from '~/components/ui/EmptyState';

const statusColor = { new: 'bg-gray-400', in_progress: 'bg-primary-600', pending_approval: 'bg-amber-500', done: 'bg-emerald-500' };

/** Карточка со счётчиками документов по статусам и «полосой» распределения */
function DocumentsCard({ title, icon, counts, to }) {
  const { t } = useTranslation();
  const total = STATUSES.reduce((sum, s) => sum + counts[s], 0);
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <FontAwesomeIcon icon={icon} className="text-brand-light" /> {title}
        </h2>
        <Link to={to} className="text-sm text-primary-600 hover:underline">
          {t('dashboard.openJournal')}
        </Link>
      </div>
      <div className="text-3xl font-bold">{total}</div>
      <div className="mb-4 text-xs text-gray-500">{t('dashboard.inWork')}</div>
      {total > 0 && (
        <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-gray-100">
          {STATUSES.map(
            (s) => counts[s] > 0 && <div key={s} className={statusColor[s]} style={{ width: `${(counts[s] / total) * 100}%` }} />,
          )}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-2 text-sm">
        {STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor[s]}`} />
            <span className="text-gray-600">{t(`status.${s}`)}</span>
            <span className="ml-auto font-medium">{counts[s]}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Stat({ icon, label, value, tone }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${tone}`}>
        <FontAwesomeIcon icon={icon} />
      </span>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="mt-1 text-sm text-gray-500">{label}</div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <EmptyState text={t('errors.UNKNOWN')} />;
  const d = query.data;

  return (
    <>
      <PageHeader title={t('dashboard.hello', { name: user.fullName.split(' ')[1] ?? user.fullName })} subtitle={t('dashboard.subtitle')} />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat icon={faListCheck} label={t('dashboard.myOpenTasks')} value={d.tasks.open} tone="bg-primary-50 text-primary-600" />
        <Stat
          icon={faTriangleExclamation}
          label={t('dashboard.myOverdue')}
          value={d.tasks.overdue}
          tone={d.tasks.overdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}
        />
        <Stat icon={faCircleCheck} label={t('dashboard.myDone')} value={d.tasks.done} tone="bg-emerald-100 text-emerald-700" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <DocumentsCard title={t('nav.documentsIn')} icon={faArrowTurnDown} counts={d.documents.in} to="/documents/in" />
        <DocumentsCard title={t('nav.documentsOut')} icon={faArrowTurnUp} counts={d.documents.out} to="/documents/out" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">{t('dashboard.recentDocuments')}</h2>
          {d.recentDocuments.length === 0 ? (
            <p className="text-sm text-gray-500">{t('documents.empty')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {d.recentDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/documents/${doc.id}`} className="block truncate text-sm font-medium text-primary-600 hover:underline">
                      {doc.title}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {doc.number} · {formatDate(doc.docDate, i18n.language)}
                    </span>
                  </div>
                  <StatusBadge value={doc.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">{t('dashboard.upcomingTasks')}</h2>
          {d.upcomingTasks.length === 0 ? (
            <p className="text-sm text-gray-500">{t('dashboard.noTasks')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {d.upcomingTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/tasks/${task.id}`} className="block truncate text-sm font-medium text-primary-600 hover:underline">
                      {task.title}
                    </Link>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <FontAwesomeIcon icon={faClock} />{' '}
                      {task.deadline ? formatDateTime(task.deadline, i18n.language) : t('tasks.noDeadline')}
                    </span>
                  </div>
                  <ImportanceBadge value={task.importance} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
