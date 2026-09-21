import { Router } from 'express';
import { z } from 'zod';
import { authenticate, isStaff, requireRole } from '../middleware/auth.js';
import { idList, likePattern, pagination, paramId, parse } from '../lib/http.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { DOCUMENT_SELECT, documentJson } from '../lib/mappers.js';
import { attachmentsUpload } from '../lib/upload.js';
import { deleteAttachment, deleteAttachmentsOf, listAttachments, saveAttachments } from '../lib/attachments.js';

export const IMPORTANCE = ['normal', 'urgent', 'critical'];
export const STATUSES = ['new', 'in_progress', 'pending_approval', 'done'];

const nullableId = z.number().int().positive().nullable().default(null);
const fields = {
  number: z.string().trim().max(60).default(''), // пусто = номер присвоится автоматически (регистрация)
  title: z.string().trim().min(1).max(300),
  docTypeId: nullableId,
  docDate: z.string().trim().max(10).default(''),
  correspondent: z.string().trim().max(300).default(''),
  importance: z.enum(IMPORTANCE).default('normal'),
  status: z.enum(STATUSES).default('new'),
  departmentId: nullableId,
  description: z.string().trim().max(5000).default(''),
};
const createSchema = z.object({ direction: z.enum(['in', 'out']), ...fields });
const updateSchema = z.object(fields);

export function documentsRoutes(db) {
  const router = Router();
  router.use(authenticate(db));

  const getRow = (id) => db.prepare(`${DOCUMENT_SELECT} WHERE d.id = ?`).get(id);
  const getOrFail = (id) => {
    const row = getRow(id);
    if (!row) throw notFound('Document');
    return row;
  };

  /**
   * Кто может менять документ: администратор, модератор и тот, кто его создал.
   * Остальные сотрудники документ только читают.
   */
  const canManage = (user, doc) => isStaff(user) || doc.created_by === user.id;
  const assertCanManage = (user, doc) => {
    if (!canManage(user, doc)) throw forbidden('NOT_YOUR_DOCUMENT', 'Only the author, moderator or administrator can change this document');
  };

  /** Регистрационный номер: ВХ-2026-0001 / ИСХ-2026-0001 (префикс, год, порядковый номер в году) */
  function generateNumber(direction, docDate) {
    const prefix = direction === 'in' ? 'ВХ' : 'ИСХ';
    const year = (docDate || new Date().toISOString()).slice(0, 4);
    const like = `${prefix}-${year}-%`;
    const last = db
      .prepare('SELECT number FROM documents WHERE direction = ? AND number LIKE ? ORDER BY number DESC LIMIT 1')
      .get(direction, like);
    const next = last ? parseInt(last.number.split('-').pop(), 10) + 1 : 1;
    return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
  }

  function assertNumberFree(direction, number, exceptId = 0) {
    const clash = db.prepare('SELECT 1 FROM documents WHERE direction = ? AND number = ? AND id != ?').get(direction, number, exceptId);
    if (clash) throw conflict('NUMBER_TAKEN', 'A document with this number is already registered');
  }

  // ---------- Список с фильтрами и страницами ----------
  router.get('/', (req, res) => {
    const { page, limit, offset } = pagination(req.query);
    const q = req.query;
    const where = [];
    const args = [];
    const add = (sql, ...values) => {
      where.push(sql);
      args.push(...values);
    };

    if (q.direction === 'in' || q.direction === 'out') add('d.direction = ?', q.direction);
    if (q.search) {
      const p = likePattern(q.search);
      add(
        `(ulower(d.title) LIKE ? ESCAPE '\\' OR ulower(d.number) LIKE ? ESCAPE '\\' OR ulower(d.correspondent) LIKE ? ESCAPE '\\')`,
        p,
        p,
        p,
      );
    }
    if (q.docTypeId) add('d.doc_type_id = ?', Number(q.docTypeId));
    if (STATUSES.includes(q.status)) add('d.status = ?', q.status);
    if (IMPORTANCE.includes(q.importance)) add('d.importance = ?', q.importance);
    if (q.departmentId) add('d.department_id = ?', Number(q.departmentId));
    if (q.dateFrom) add('d.doc_date >= ?', String(q.dateFrom));
    if (q.dateTo) add('d.doc_date <= ?', String(q.dateTo));
    // archived=0 — журнал (документы не в архиве), archived=1 — только архивные; folderId — содержимое одного дела
    if (q.archived === '0') where.push('d.archive_folder_id IS NULL');
    if (q.archived === '1') where.push('d.archive_folder_id IS NOT NULL');
    if (q.folderId) add('d.archive_folder_id = ?', Number(q.folderId));

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM documents d ${clause}`).get(...args).n;
    const items = db
      .prepare(`${DOCUMENT_SELECT} ${clause} ORDER BY d.doc_date DESC, d.id DESC LIMIT ? OFFSET ?`)
      .all(...args, limit, offset)
      .map((row) => ({ ...documentJson(row), canManage: canManage(req.user, row) }));
    res.json({ items, total, page, limit });
  });

  router.get('/:id', (req, res) => {
    const row = getOrFail(paramId(req));
    res.json({
      ...documentJson(row),
      canManage: canManage(req.user, row),
      attachments: listAttachments(db, 'document', row.id),
    });
  });

  // ---------- Создание / изменение / удаление ----------
  router.post('/', (req, res) => {
    const d = parse(createSchema, req.body);
    const number = d.number || generateNumber(d.direction, d.docDate);
    assertNumberFree(d.direction, number);
    const departmentId =
      d.departmentId ?? db.prepare('SELECT department_id FROM users WHERE id = ?').get(req.user.id)?.department_id ?? null;

    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO documents (direction, number, title, doc_type_id, doc_date, correspondent, importance, status,
                                department_id, description, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        d.direction,
        number,
        d.title,
        d.docTypeId,
        d.docDate,
        d.correspondent,
        d.importance,
        d.status,
        departmentId,
        d.description,
        req.user.id,
      );
    res.status(201).json(documentJson(getRow(lastInsertRowid)));
  });

  router.put('/:id', (req, res) => {
    const id = paramId(req);
    const doc = getOrFail(id);
    assertCanManage(req.user, doc);
    const d = parse(updateSchema, req.body);
    const number = d.number || doc.number;
    assertNumberFree(doc.direction, number, id);

    // Если документ стал не «завершённым» — ему не место в архиве
    const folderId = d.status === 'done' ? doc.archive_folder_id : null;
    db.prepare(
      `UPDATE documents SET number = ?, title = ?, doc_type_id = ?, doc_date = ?, correspondent = ?, importance = ?,
              status = ?, department_id = ?, description = ?, archive_folder_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(number, d.title, d.docTypeId, d.docDate, d.correspondent, d.importance, d.status, d.departmentId, d.description, folderId, id);
    res.json(documentJson(getRow(id)));
  });

  router.patch('/:id/status', (req, res) => {
    const id = paramId(req);
    const doc = getOrFail(id);
    assertCanManage(req.user, doc);
    const { status } = parse(z.object({ status: z.enum(STATUSES) }), req.body);
    const folderId = status === 'done' ? doc.archive_folder_id : null;
    db.prepare("UPDATE documents SET status = ?, archive_folder_id = ?, updated_at = datetime('now') WHERE id = ?").run(
      status,
      folderId,
      id,
    );
    res.json(documentJson(getRow(id)));
  });

  router.patch('/:id/department', (req, res) => {
    const id = paramId(req);
    assertCanManage(req.user, getOrFail(id));
    const { departmentId } = parse(z.object({ departmentId: z.number().int().positive().nullable() }), req.body);
    db.prepare("UPDATE documents SET department_id = ?, updated_at = datetime('now') WHERE id = ?").run(departmentId, id);
    res.json(documentJson(getRow(id)));
  });

  // В архив (в «дело») можно положить только завершённый документ. folderId = null — достать из архива.
  router.patch('/:id/archive', requireRole('admin', 'moderator'), (req, res) => {
    const id = paramId(req);
    const doc = getOrFail(id);
    const { folderId } = parse(z.object({ folderId: z.number().int().positive().nullable() }), req.body);
    if (folderId !== null) {
      if (doc.status !== 'done') throw badRequest('NOT_DONE', 'Only completed documents can be archived');
      if (!db.prepare('SELECT 1 FROM archive_folders WHERE id = ?').get(folderId)) throw notFound('Archive folder');
    }
    db.prepare("UPDATE documents SET archive_folder_id = ?, updated_at = datetime('now') WHERE id = ?").run(folderId, id);
    res.json(documentJson(getRow(id)));
  });

  const removeDocuments = db.transaction((ids) => {
    deleteAttachmentsOf(db, 'document', ids);
    ids.forEach((id) => db.prepare('DELETE FROM documents WHERE id = ?').run(id));
  });

  router.delete('/:id', (req, res) => {
    const id = paramId(req);
    assertCanManage(req.user, getOrFail(id));
    removeDocuments([id]);
    res.status(204).end();
  });

  router.post('/bulk-delete', requireRole('admin', 'moderator'), (req, res) => {
    const { ids } = parse(z.object({ ids: idList }), req.body);
    removeDocuments(ids);
    res.status(204).end();
  });

  // ---------- Вложения ----------
  router.post('/:id/files', (req, res, next) => {
    const id = paramId(req);
    assertCanManage(req.user, getOrFail(id));
    attachmentsUpload(req, res, (err) => {
      if (err) return next(err);
      if (!req.files?.length) return next(badRequest('NO_FILE', 'Attach at least one file (field "files")'));
      const saved = saveAttachments(db, 'document', id, req.files, req.user.id);
      res.status(201).json(saved);
    });
  });

  router.delete('/:id/files/:fileId', (req, res) => {
    const id = paramId(req);
    assertCanManage(req.user, getOrFail(id));
    const fileId = paramId(req, 'fileId');
    const owned = db.prepare("SELECT 1 FROM attachments WHERE id = ? AND owner_type = 'document' AND owner_id = ?").get(fileId, id);
    if (!owned) throw notFound('File');
    deleteAttachment(db, fileId);
    res.status(204).end();
  });

  return router;
}
