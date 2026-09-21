import { Router } from 'express';
import { z } from 'zod';
import { authenticate, isStaff, requireRole } from '../middleware/auth.js';
import { likePattern, pagination, paramId, parse } from '../lib/http.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { taskJson, userBrief } from '../lib/mappers.js';
import { attachmentsUpload } from '../lib/upload.js';
import { deleteAttachment, deleteAttachmentsOf, listAttachments, saveAttachments } from '../lib/attachments.js';
import { IMPORTANCE, STATUSES } from './documents.js';

const fields = {
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).default(''),
  deadline: z.string().trim().max(25).default(''),
  importance: z.enum(IMPORTANCE).default('normal'),
  status: z.enum(STATUSES).default('new'),
  documentId: z.number().int().positive().nullable().default(null),
  assigneeIds: z.array(z.number().int().positive()).max(50).default([]),
};
const taskSchema = z.object(fields);

const TASK_SELECT = `
  SELECT t.*, d.title AS document_title, d.number AS document_number, u.full_name AS created_by_name
  FROM tasks t
  LEFT JOIN documents d ON d.id = t.document_id
  LEFT JOIN users u     ON u.id = t.created_by`;

export function tasksRoutes(db) {
  const router = Router();
  router.use(authenticate(db));
  const staff = requireRole('admin', 'moderator');

  const getRow = (id) => db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(id);
  const isAssignee = (taskId, userId) => !!db.prepare('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?').get(taskId, userId);

  /** Видеть задачу могут: админ/модератор, её автор и исполнители. */
  const canView = (user, task) => isStaff(user) || task.created_by === user.id || isAssignee(task.id, user.id);
  const canParticipate = canView; // комментировать и двигать статус могут те же люди

  function getVisible(user, id) {
    const row = getRow(id);
    if (!row || !canView(user, row)) throw notFound('Task'); // чужую задачу «не видно» — отвечаем 404, а не 403
    return row;
  }

  const assigneesOf = (taskIds) => {
    if (!taskIds.length) return new Map();
    const marks = taskIds.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT ta.task_id, u.id, u.full_name, u.avatar_file
         FROM task_assignees ta JOIN users u ON u.id = ta.user_id
         WHERE ta.task_id IN (${marks}) ORDER BY u.full_name`,
      )
      .all(...taskIds);
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.task_id)) map.set(r.task_id, []);
      map.get(r.task_id).push(userBrief(r));
    }
    return map;
  };

  function checkRefs(d) {
    if (d.documentId && !db.prepare('SELECT 1 FROM documents WHERE id = ?').get(d.documentId))
      throw badRequest('BAD_DOCUMENT', 'Document does not exist');
    for (const uid of d.assigneeIds) {
      if (!db.prepare('SELECT 1 FROM users WHERE id = ? AND active = 1').get(uid))
        throw badRequest('BAD_ASSIGNEE', `User ${uid} does not exist or is disabled`);
    }
  }

  const setAssignees = (taskId, ids) => {
    db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);
    const ins = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)');
    ids.forEach((uid) => ins.run(taskId, uid));
  };

  // ---------- Список ----------
  router.get('/', (req, res) => {
    const { page, limit, offset } = pagination(req.query);
    const q = req.query;
    const where = [];
    const args = [];

    // Сотрудник видит только свои задачи, админ/модератор — все (или только свои, если mine=1)
    if (!isStaff(req.user) || q.mine === '1') {
      where.push('(t.created_by = ? OR EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id AND a.user_id = ?))');
      args.push(req.user.id, req.user.id);
    }
    if (q.search) {
      where.push(`ulower(t.title) LIKE ? ESCAPE '\\'`);
      args.push(likePattern(q.search));
    }
    if (STATUSES.includes(q.status)) {
      where.push('t.status = ?');
      args.push(q.status);
    }
    if (IMPORTANCE.includes(q.importance)) {
      where.push('t.importance = ?');
      args.push(q.importance);
    }
    if (q.dateFrom) {
      where.push('t.deadline >= ?');
      args.push(String(q.dateFrom));
    }
    if (q.dateTo) {
      where.push('t.deadline <= ?');
      args.push(`${String(q.dateTo)}T23:59`);
    }
    if (q.documentId) {
      where.push('t.document_id = ?');
      args.push(Number(q.documentId));
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM tasks t ${clause}`).get(...args).n;
    // задачи без срока — в конец, остальные — по ближайшему сроку
    const rows = db
      .prepare(`${TASK_SELECT} ${clause} ORDER BY (t.deadline = ''), t.deadline, t.id DESC LIMIT ? OFFSET ?`)
      .all(...args, limit, offset);
    const assignees = assigneesOf(rows.map((r) => r.id));
    res.json({ items: rows.map((r) => ({ ...taskJson(r), assignees: assignees.get(r.id) ?? [] })), total, page, limit });
  });

  router.get('/:id', (req, res) => {
    const row = getVisible(req.user, paramId(req));
    const comments = db
      .prepare(
        `SELECT c.id, c.text, c.created_at, c.user_id, u.full_name, u.avatar_file
         FROM task_comments c LEFT JOIN users u ON u.id = c.user_id
         WHERE c.task_id = ? ORDER BY c.id`,
      )
      .all(row.id)
      .map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.created_at,
        author: c.user_id ? userBrief({ id: c.user_id, full_name: c.full_name, avatar_file: c.avatar_file }) : null,
      }));
    res.json({
      ...taskJson(row),
      assignees: assigneesOf([row.id]).get(row.id) ?? [],
      comments,
      attachments: listAttachments(db, 'task', row.id),
      canEdit: isStaff(req.user),
      canParticipate: canParticipate(req.user, row),
    });
  });

  // ---------- Создание / изменение (админ, модератор) ----------
  router.post('/', staff, (req, res) => {
    const d = parse(taskSchema, req.body);
    checkRefs(d);
    const id = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO tasks (title, description, deadline, importance, status, document_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(d.title, d.description, d.deadline, d.importance, d.status, d.documentId, req.user.id);
      setAssignees(lastInsertRowid, d.assigneeIds);
      return lastInsertRowid;
    })();
    res.status(201).json({ ...taskJson(getRow(id)), assignees: assigneesOf([id]).get(id) ?? [] });
  });

  router.put('/:id', staff, (req, res) => {
    const id = paramId(req);
    if (!getRow(id)) throw notFound('Task');
    const d = parse(taskSchema, req.body);
    checkRefs(d);
    db.transaction(() => {
      db.prepare(
        `UPDATE tasks SET title = ?, description = ?, deadline = ?, importance = ?, status = ?, document_id = ?,
                updated_at = datetime('now') WHERE id = ?`,
      ).run(d.title, d.description, d.deadline, d.importance, d.status, d.documentId, id);
      setAssignees(id, d.assigneeIds);
    })();
    res.json({ ...taskJson(getRow(id)), assignees: assigneesOf([id]).get(id) ?? [] });
  });

  // Исполнитель может менять только прогресс своей задачи
  router.patch('/:id/status', (req, res) => {
    const id = paramId(req);
    const task = getVisible(req.user, id);
    if (!canParticipate(req.user, task)) throw forbidden();
    const { status } = parse(z.object({ status: z.enum(STATUSES) }), req.body);
    db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    res.json({ ...taskJson(getRow(id)), assignees: assigneesOf([id]).get(id) ?? [] });
  });

  const removeTasks = db.transaction((ids) => {
    deleteAttachmentsOf(db, 'task', ids);
    ids.forEach((id) => db.prepare('DELETE FROM tasks WHERE id = ?').run(id));
  });

  router.delete('/:id', staff, (req, res) => {
    const id = paramId(req);
    if (!getRow(id)) throw notFound('Task');
    removeTasks([id]);
    res.status(204).end();
  });

  // ---------- Комментарии ----------
  router.post('/:id/comments', (req, res) => {
    const id = paramId(req);
    getVisible(req.user, id);
    const { text } = parse(z.object({ text: z.string().trim().min(1).max(2000) }), req.body);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO task_comments (task_id, user_id, text) VALUES (?, ?, ?)')
      .run(id, req.user.id, text);
    const c = db.prepare('SELECT * FROM task_comments WHERE id = ?').get(lastInsertRowid);
    const me = db.prepare('SELECT id, full_name, avatar_file FROM users WHERE id = ?').get(req.user.id);
    res.status(201).json({ id: c.id, text: c.text, createdAt: c.created_at, author: userBrief(me) });
  });

  router.delete('/:id/comments/:commentId', (req, res) => {
    const id = paramId(req);
    getVisible(req.user, id);
    const commentId = paramId(req, 'commentId');
    const c = db.prepare('SELECT * FROM task_comments WHERE id = ? AND task_id = ?').get(commentId, id);
    if (!c) throw notFound('Comment');
    if (c.user_id !== req.user.id && req.user.role !== 'admin') throw forbidden();
    db.prepare('DELETE FROM task_comments WHERE id = ?').run(commentId);
    res.status(204).end();
  });

  // ---------- Вложения (админ, модератор) ----------
  router.post('/:id/files', staff, (req, res, next) => {
    const id = paramId(req);
    if (!getRow(id)) return next(notFound('Task'));
    attachmentsUpload(req, res, (err) => {
      if (err) return next(err);
      if (!req.files?.length) return next(badRequest('NO_FILE', 'Attach at least one file (field "files")'));
      res.status(201).json(saveAttachments(db, 'task', id, req.files, req.user.id));
    });
  });

  router.delete('/:id/files/:fileId', staff, (req, res) => {
    const id = paramId(req);
    const fileId = paramId(req, 'fileId');
    const owned = db.prepare("SELECT 1 FROM attachments WHERE id = ? AND owner_type = 'task' AND owner_id = ?").get(fileId, id);
    if (!owned) throw notFound('File');
    deleteAttachment(db, fileId);
    res.status(204).end();
  });

  return router;
}
