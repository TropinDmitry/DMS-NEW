import { useTranslation } from 'react-i18next';
import { PageSpinner } from './Spinner';
import EmptyState from './EmptyState';

/**
 * Универсальная таблица. Раньше для каждого списка (документы, отделы, типы, пользователи) писали
 * свою таблицу на 400–600 строк плюс отдельные «карточки» для телефона. Теперь одна таблица, а
 * страница лишь описывает колонки:
 *
 *   columns = [{ key: 'name', header: 'Название', cell: (row) => row.name, className: 'w-40' }]
 *
 * На узких экранах таблица прокручивается по горизонтали (overflow-x-auto).
 * selectable + selected + onSelect — флажки для выбора строк (например, массового удаления).
 */
export default function DataTable({
  columns,
  rows = [],
  loading = false,
  rowKey = 'id',
  selectable = false,
  selected = [],
  onSelect,
  emptyText,
}) {
  const { t } = useTranslation();
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r[rowKey]));

  const toggleAll = () => {
    const ids = rows.map((r) => r[rowKey]);
    onSelect(allChecked ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  };
  const toggleOne = (id) => onSelect(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (loading && rows.length === 0) return <PageSpinner />;
  if (rows.length === 0) return <EmptyState text={emptyText ?? t('common.nothingFound')} />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label={t('common.selectAll')} />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} className={`whitespace-nowrap px-3 py-3 font-medium ${c.headerClassName ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row[rowKey]} className={selected.includes(row[rowKey]) ? 'bg-primary-50/60' : 'hover:bg-gray-50'}>
              {selectable && (
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(row[rowKey])} onChange={() => toggleOne(row[rowKey])} />
                </td>
              )}
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2.5 align-middle ${c.className ?? ''}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
