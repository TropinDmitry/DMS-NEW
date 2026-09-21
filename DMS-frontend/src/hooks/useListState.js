import { useCallback, useState } from 'react';

/**
 * Состояние «списка с фильтрами и страницами» для таблиц.
 * Главное правило: при смене любого фильтра или размера страницы возвращаемся на 1-ю страницу.
 * (Раньше это делалось отдельным useEffect на каждый фильтр — по 7 штук на страницу.)
 *
 *   const list = useListState({ search: '', status: '' });
 *   list.setFilter('status', 'done');   list.setPage(2);
 *   useQuery({ queryKey: ['documents', list.params], queryFn: () => api.list(list.params) })
 */
export default function useListState(defaultFilters = {}, defaultLimit = 10) {
  const [state, setState] = useState({ page: 1, limit: defaultLimit, filters: defaultFilters });

  const setFilter = useCallback((key, value) => {
    setState((s) => ({ ...s, page: 1, filters: { ...s.filters, [key]: value } }));
  }, []);
  const setPage = useCallback((page) => setState((s) => ({ ...s, page })), []);
  const setLimit = useCallback((limit) => setState((s) => ({ ...s, page: 1, limit })), []);
  const reset = useCallback(() => setState((s) => ({ ...s, page: 1, filters: defaultFilters })), [defaultFilters]);

  const hasFilters = Object.keys(defaultFilters).some((k) => state.filters[k] !== defaultFilters[k]);

  return {
    ...state,
    /** готовый набор параметров для запроса к API */
    params: { page: state.page, limit: state.limit, ...state.filters },
    setFilter,
    setPage,
    setLimit,
    reset,
    hasFilters,
  };
}
