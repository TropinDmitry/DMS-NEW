import path from 'node:path';
import { Router } from 'express';
import { authenticate, isStaff } from '../middleware/auth.js';
import { paramId } from '../lib/http.js';
import { notFound } from '../lib/errors.js';
import { paths } from '../lib/upload.js';

/**
 * Скачивание вложений. Файлы лежат вне публичной папки, а отдаём мы их через этот маршрут —
 * так можно проверить, что человек вошёл в систему и имеет право видеть владельца файла.
 */
export function filesRoutes(db) {
  const router = Router();
  router.use(authenticate(db));

  router.get('/:id/download', (req, res) => {
    const file = db.prepare('SELECT * FROM attachments WHERE id = ?').get(paramId(req));
    if (!file) throw notFound('File');

    if (file.owner_type === 'task' && !isStaff(req.user)) {
      const allowed = db
        .prepare(
          `SELECT 1 FROM tasks t WHERE t.id = ? AND (t.created_by = ?
             OR EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id AND a.user_id = ?))`,
        )
        .get(file.owner_id, req.user.id, req.user.id);
      if (!allowed) throw notFound('File');
    }
    // res.download сам проставит Content-Disposition с корректным кодированием русского имени
    res.download(path.join(paths.filesDir, file.stored_name), file.original_name);
  });

  return router;
}
