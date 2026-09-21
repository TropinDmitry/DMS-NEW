import { useEffect, useState } from 'react';

/**
 * «Откладывает» значение: возвращает его новую версию только после паузы в delay мс.
 * Так поиск отправляет запрос, когда человек закончил печатать, а не на каждую букву.
 */
export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // если значение изменилось раньше — сбрасываем таймер
  }, [value, delay]);

  return debounced;
}
