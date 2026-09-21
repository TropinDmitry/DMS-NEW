import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faXmark } from '@fortawesome/free-solid-svg-icons';
import { formatFileSize } from '~/lib/format';

/**
 * Выбор файлов с понятным списком выбранного. files — массив объектов File, onChange получает новый массив.
 * Нативный <input type="file"> нельзя «показать красиво», поэтому он скрыт, а вместо него — своя кнопка.
 */
export default function FileInput({ files, onChange, multiple = true }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  const add = (e) => {
    const picked = [...e.target.files];
    onChange(multiple ? [...files, ...picked] : picked.slice(0, 1));
    e.target.value = ''; // чтобы можно было выбрать тот же файл повторно
  };

  return (
    <div>
      <input ref={inputRef} type="file" multiple={multiple} onChange={add} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        className="inline-flex items-center gap-2 rounded-md border border-dashed border-gray-400 bg-white px-4 py-2 text-sm text-gray-700 hover:border-primary-500 hover:text-primary-600"
      >
        <FontAwesomeIcon icon={faPaperclip} />
        {t('common.chooseFiles')}
      </button>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-gray-700">
              <FontAwesomeIcon icon={faPaperclip} className="text-gray-400" />
              <span className="truncate">{f.name}</span>
              <span className="text-xs text-gray-400">{formatFileSize(f.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                aria-label={t('common.remove')}
                className="text-red-500 hover:text-red-700"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
