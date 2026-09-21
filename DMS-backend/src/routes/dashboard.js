import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { DOCUMENT_SELECT, documentJson } from '../lib/mappers.js';
import { STATUSES } from './documents.js';

/** Сводка для стартовой страницы: счётчики документов, мои задачи, свежие документы. */
export function dashboardRoutes(db) {
  const router = Router();
  router.use(authenticate(db));

  router.get('/', (req, res) => {
    const uid = req.user.id;
    // сроки хранятся как локальное время без часового пояса (2026-09-21T14:30) — сравниваем в том же формате
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const nowLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const countsByStatus = (direction) => {
      const result = Object.fromEntries(STATUSES.map((s) => [s, 0]));
      db.prepare('SELECT status, COUNT(*) AS n FROM documents WHERE direction = ? AND archive_folder_id IS NULL GROUP BY status')
        .all(direction)
        .forEach((r) => (result[r.status] = r.n));
      return result;
    };

    const mine = `EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id AND a.user_id = ?)`;
    const open = db.prepare(`SELECT COUNT(*) AS n FROM tasks t WHERE ${mine} AND t.status != 'done'`).get(uid).n;
    const overdue = db
      .prepare(`SELECT COUNT(*) AS n FROM tasks t WHERE ${mine} AND t.status != 'done' AND t.deadline != '' AND t.deadline < ?`)
      .get(uid, nowLocal).n;
    const done = db.prepare(`SELECT COUNT(*) AS n FROM tasks t WHERE ${mine} AND t.status = 'done'`).get(uid).n;

    const upcoming = db
      .prepare(
        `SELECT t.id, t.title, t.deadline, t.importance, t.status FROM tasks t
         WHERE ${mine} AND t.status != 'done'
         ORDER BY (t.deadline = ''), t.deadline LIMIT 5`,
      )
      .all(uid);

    const recent = db.prepare(`${DOCUMENT_SELECT} WHERE d.archive_folder_id IS NULL ORDER BY d.id DESC LIMIT 5`).all().map(documentJson);

    res.json({
      documents: { in: countsByStatus('in'), out: countsByStatus('out') },
      tasks: { open, overdue, done },
      upcomingTasks: upcoming.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline, importance: t.importance, status: t.status })),
      recentDocuments: recent,
    });
  });

  return router;
}
