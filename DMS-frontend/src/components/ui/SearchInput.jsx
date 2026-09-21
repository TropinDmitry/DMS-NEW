import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import useDebounce from '~/hooks/useDebounce';
import { controlClass } from './Field';

/**
 * Поле поиска с задержкой: пока человек печатает, запросы не уходят; через 300 мс после паузы вызывается onSearch.
 * `value` — значение из родителя (нужно, чтобы кнопка «Сбросить фильтры» очищала и это поле).
 */
export default function SearchInput({ value, onSearch, placeholder }) {
  const [text, setText] = useState(value ?? '');
  const debounced = useDebounce(text, 300);

  useEffect(() => {
    if (debounced !== value) onSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- нужно реагировать только на изменение введённого текста
  }, [debounced]);

  // Родитель сбросил фильтр — очищаем и то, что показано в поле
  useEffect(() => {
    if (value === '') setText('');
  }, [value]);

  return (
    <div className="relative">
      <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className={`${controlClass(false)} pl-9`}
      />
    </div>
  );
}
