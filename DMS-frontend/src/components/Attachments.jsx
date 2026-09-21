import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFile,
  faFileExcel,
  faFileImage,
  faFilePdf,
  faFilePowerpoint,
  faFileWord,
  faFileZipper,
} from '@fortawesome/free-regular-svg-icons';
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { downloadFile } from '~/api/client';
import { formatFileSize } from '~/lib/format';
import useNotify from '~/hooks/useNotify';
import { useConfirm } from '~/components/ui/ConfirmProvider';
import { Button } from '~/components/ui/Button';

// Иконка по расширению файла
const icons = [
  [/\.(xlsx?|csv)$/i, faFileExcel, 'text-emerald-700'],
  [/\.(pptx?)$/i, faFilePowerpoint, 'text-orange-600'],
  [/\.(docx?|rtf|odt)$/i, faFileWord, 'text-blue-700'],
  [/\.pdf$/i, faFilePdf, 'text-red-600'],
  [/\.(png|jpe?g|gif|webp|svg)$/i, faFileImage, 'text-purple-600'],
  [/\.(zip|rar|7z)$/i, faFileZipper, 'text-yellow-700'],
];
function FileIcon({ name }) {
  const [, icon, color] = icons.find(([re]) => re.test(name)) ?? [null, faFile, 'text-gray-500'];
  return <FontAwesomeIcon icon={icon} className={`text-xl ${color}`} />;
}

/**
 * Список вложений: скачать, удалить, добавить. Скачивание идёт через downloadFile (с токеном),
 * потому что обычная ссылка <a href> не может передать заголовок Authorization.
 */
export default function Attachments({ items = [], canEdit, onUpload, onRemove, uploading }) {
  const { t } = useTranslation();
  const notify = useNotify();
  const confirm = useConfirm();
  const inputRef = useRef(null);

  const handleRemove = async (file) => {
    if (
      await confirm({
        title: t('common.deleteQuestion'),
        message: t('common.deleteFileConfirm', { name: file.name }),
        danger: true,
        confirmText: t('common.delete'),
      })
    ) {
      onRemove(file.id);
    }
  };

  return (
    <div>
      {items.length === 0 && <p className="text-sm text-gray-500">{t('common.noFiles')}</p>}
      <ul className="space-y-2">
        {items.map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2">
            <FileIcon name={f.name} />
            <button
              type="button"
              onClick={() => downloadFile(`/files/${f.id}/download`, f.name).catch(notify.fail)}
              className="min-w-0 flex-1 truncate text-left text-sm text-primary-600 hover:underline"
              title={f.name}
            >
              {f.name}
            </button>
            <span className="shrink-0 text-xs text-gray-400">{formatFileSize(f.size)}</span>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleRemove(f)}
                aria-label={t('common.delete')}
                className="text-red-500 hover:text-red-700"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files.length) onUpload([...e.target.files]);
              e.target.value = '';
            }}
          />
          <Button variant="secondary" size="sm" icon={faPlus} className="mt-3" loading={uploading} onClick={() => inputRef.current.click()}>
            {t('common.addFiles')}
          </Button>
        </>
      )}
    </div>
  );
}
