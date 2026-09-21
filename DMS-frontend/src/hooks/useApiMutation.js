import { useMutation, useQueryClient } from '@tanstack/react-query';
import useNotify from './useNotify';

/**
 * Обёртка над useMutation для типового сценария «изменили данные на сервере»:
 *  1) отправляем запрос;  2) обновляем связанные списки (invalidate);  3) показываем уведомление;  4) при ошибке — красное сообщение.
 *
 *   const remove = useApiMutation(documentsApi.remove, { invalidate: [['documents']], success: 'common.deleted' });
 *   remove.mutate(42);
 *
 * invalidate — список «ключей запросов», которые нужно перезагрузить: TanStack Query сам обновит все таблицы,
 * где эти данные показаны. Раньше для этого использовали переключатель isSave и useEffect.
 */
export default function useApiMutation(mutationFn, { invalidate = [], success, onSuccess } = {}) {
  const queryClient = useQueryClient();
  const notify = useNotify();

  return useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      if (success) notify.ok(success);
      onSuccess?.(data, variables);
    },
    onError: notify.fail,
  });
}
