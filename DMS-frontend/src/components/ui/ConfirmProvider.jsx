import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { Button } from './Button';

/*
 * Красивая замена window.confirm(). Использование в любом компоненте:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Удалить?', message: '...', danger: true })) { ...удаляем... }
 *
 * confirm() возвращает Promise, который завершится true (нажали «Да») или false (отмена).
 */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setOptions(opts);
      }),
    [],
  );

  const finish = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!options}
        onClose={() => finish(false)}
        title={options?.title ?? t('common.confirm')}
        footer={
          <>
            <Button variant="secondary" onClick={() => finish(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant={options?.danger ? 'danger' : 'primary'} onClick={() => finish(true)}>
              {options?.confirmText ?? t('common.yes')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{options?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
