import path from 'node:path';
import { fixFileName, paths, removeStoredFile } from './upload.js';
import { attachmentJson } from './mappers.js';

/** Записывает в БД информацию о загруженных multer-ом файлах и возвращает их в виде JSON. */
export function saveAttachments(db, ownerType, ownerId, files = [], userId) {
  const insert = db.prepare(
    `INSERT INTO attachments (owner_type, owner_id, original_name, stored_name, size, mime, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const get = db.prepare('SELECT * FROM attachments WHERE id = ?');
  return files.map((f) => {
    const { lastInsertRowid } = insert.run(
      ownerType,
      ownerId,
      fixFileName(f.originalname),
      path.basename(f.filename),
      f.size,
      f.mimetype,
      userId,
    );
    return attachmentJson(get.get(lastInsertRowid));
  });
}

export const listAttachments = (db, ownerType, ownerId) =>
  db.prepare('SELECT * FROM attachments WHERE owner_type = ? AND owner_id = ? ORDER BY id').all(ownerType, ownerId).map(attachmentJson);

/**
 * Удаляет вложения владельцев (документов/задач) из БД сразу, а файлы с диска — после.
 * Связь вложений с владельцем «полиморфная» (owner_type + owner_id), поэтому внешнего ключа с
 * каскадным удалением нет и чистить приходится вручную.
 */
export function deleteAttachmentsOf(db, ownerType, ownerIds) {
  if (!ownerIds.length) return;
  const marks = ownerIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT id, stored_name FROM attachments WHERE owner_type = ? AND owner_id IN (${marks})`)
    .all(ownerType, ...ownerIds);
  db.prepare(`DELETE FROM attachments WHERE owner_type = ? AND owner_id IN (${marks})`).run(ownerType, ...ownerIds);
  rows.forEach((r) => removeStoredFile(paths.filesDir, r.stored_name));
}

export function deleteAttachment(db, attachmentId) {
  const row = db.prepare('SELECT stored_name FROM attachments WHERE id = ?').get(attachmentId);
  if (!row) return false;
  db.prepare('DELETE FROM attachments WHERE id = ?').run(attachmentId);
  removeStoredFile(paths.filesDir, row.stored_name);
  return true;
}
