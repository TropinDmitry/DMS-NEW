import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import { PAGE_SIZES } from '~/lib/constants';
import { Select } from './Field';

/** Подвал таблицы: «1–10 из 47», размер страницы, кнопки «назад/вперёд» */
export default function Pagination({ page, limit, total, onPage, onLimit }) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <Select
          value={limit}
          onChange={(e) => onLimit(Number(e.target.value))}
          options={PAGE_SIZES.map((n) => ({ value: n, label: t('common.perPage', { count: n }) }))}
          className="!w-auto"
          aria-label={t('common.pageSize')}
        />
      </div>
      <div className="flex items-center gap-3">
        <span>{t('common.range', { from, to, total })}</span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label={t('common.prev')}
            className="h-8 w-8 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FontAwesomeIcon icon={faAngleLeft} />
          </button>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
            aria-label={t('common.next')}
            className="h-8 w-8 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FontAwesomeIcon icon={faAngleRight} />
          </button>
        </div>
      </div>
    </div>
  );
}
