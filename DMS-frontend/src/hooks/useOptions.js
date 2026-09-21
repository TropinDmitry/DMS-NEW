import { useQuery } from '@tanstack/react-query';
import { departmentsApi, documentTypesApi, foldersApi, usersApi } from '~/api';

/*
 * Данные для выпадающих списков (отделы, виды документов, дела архива, пользователи).
 * TanStack Query кэширует результат: сколько бы форм ни открыл человек, запрос уйдёт один раз в 5 минут.
 * Ключ запроса вида ['departments', 'options'] начинается с имени справочника — когда справочник меняют,
 * достаточно сбросить ['departments'], и списки везде обновятся.
 */
const optionsQuery = (key, api) => () => useQuery({ queryKey: [key, 'options'], queryFn: api.options, staleTime: 5 * 60_000 });

export const useDepartmentOptions = optionsQuery('departments', departmentsApi);
export const useDocumentTypeOptions = optionsQuery('document-types', documentTypesApi);
export const useFolderOptions = optionsQuery('archive-folders', foldersApi);

export const useUserLookup = () => useQuery({ queryKey: ['users', 'lookup'], queryFn: usersApi.lookup, staleTime: 5 * 60_000 });

/** [{ id: 1, name: 'Бухгалтерия' }] → [{ value: 1, label: 'Бухгалтерия' }] для компонента <Select> */
export const toSelect = (list = []) => list.map((item) => ({ value: item.id, label: item.name }));
