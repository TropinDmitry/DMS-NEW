import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { paths } from './lib/upload.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.js';
import { usersRoutes, profileRoutes } from './routes/users.js';
import { referenceRoutes } from './routes/reference.js';
import { documentsRoutes } from './routes/documents.js';
import { tasksRoutes } from './routes/tasks.js';
import { filesRoutes } from './routes/files.js';
import { dashboardRoutes } from './routes/dashboard.js';

/**
 * Собирает приложение Express. База данных передаётся снаружи — благодаря этому тесты
 * запускают приложение с базой в памяти, не трогая настоящие данные.
 */
export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet()); // набор защитных HTTP-заголовков
  app.use(express.json({ limit: '1mb' })); // разбирает JSON из тела запроса в req.body
  app.use(cookieParser()); // разбирает Cookie в req.cookies

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok' }));

  api.use('/auth', authRoutes(db));
  api.use('/profile', profileRoutes(db));
  api.use('/users', usersRoutes(db));
  api.use(
    '/departments',
    referenceRoutes(db, {
      table: 'departments',
      hasActive: true,
      counts: `(SELECT COUNT(*) FROM documents WHERE department_id = t.id) AS documents_count,
             (SELECT COUNT(*) FROM users WHERE department_id = t.id) AS users_count`,
    }),
  );
  api.use(
    '/document-types',
    referenceRoutes(db, {
      table: 'document_types',
      hasActive: true,
      counts: '(SELECT COUNT(*) FROM documents WHERE doc_type_id = t.id) AS documents_count',
    }),
  );
  api.use(
    '/archive-folders',
    referenceRoutes(db, {
      table: 'archive_folders',
      hasActive: false,
      readAll: true, // архив видят все сотрудники, менять «дела» — админ и модератор
      counts: '(SELECT COUNT(*) FROM documents WHERE archive_folder_id = t.id) AS documents_count',
    }),
  );
  api.use('/documents', documentsRoutes(db));
  api.use('/tasks', tasksRoutes(db));
  api.use('/files', filesRoutes(db));
  api.use('/dashboard', dashboardRoutes(db));

  // Аватарки отдаём как обычные статические файлы: <img src> не умеет слать заголовок Authorization,
  // а имена файлов случайные и не подбираются
  api.use('/avatars', express.static(paths.avatarsDir, { maxAge: '7d', index: false, fallthrough: false }));
  api.use(notFoundHandler);

  app.use('/api', api);

  // В продакшене этот же сервер может раздавать собранный фронтенд (npm run build в DMS-frontend)
  if (fs.existsSync(path.join(config.frontendDist, 'index.html'))) {
    app.use(express.static(config.frontendDist));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
