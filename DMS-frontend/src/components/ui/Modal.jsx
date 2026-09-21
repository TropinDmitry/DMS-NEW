import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

/**
 * Модальное окно на нативном элементе <dialog>. Браузер сам делает то, что раньше писали руками:
 * затемняет фон, не даёт кликать по странице под окном, ловит фокус внутри, закрывает по Esc.
 * Нам остаётся вызвать showModal()/close(), когда меняется проп `open`.
 */
export default function Modal({ open, onClose, title, children, footer, wide = false }) {
  const { t } = useTranslation();
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose} // срабатывает и по клавише Esc
      onClick={(e) => e.target === ref.current && onClose()} // клик по затемнению (а не по содержимому)
      className={`w-full rounded-lg p-0 shadow-pop ${wide ? 'max-w-2xl' : 'max-w-md'}`}
    >
      {/* Содержимое рисуем только пока окно открыто — так форма внутри при каждом открытии начинается с чистого листа */}
      {open && (
        <div>
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded p-1 text-gray-500 hover:bg-gray-100">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
