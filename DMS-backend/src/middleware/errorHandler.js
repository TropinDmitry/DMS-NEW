import multer from 'multer';
import { HttpError } from '../lib/errors.js';
import { config } from '../config.js';

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

/**
 * Последний рубеж: любая ошибка из любого обработчика попадает сюда и превращается в JSON.
 * В Express 5 async-функции подхватываются автоматически — try/catch в каждом маршруте не нужен.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
  }

  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({ code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR', message: err.message });
  }

  // Ограничения SQLite (внешние ключи, уникальность) превращаем в понятные 409.
  // Нюанс: нарушение ON DELETE RESTRICT SQLite сообщает кодом SQLITE_CONSTRAINT_TRIGGER, а не ..._FOREIGNKEY,
  // поэтому определяем внешний ключ ещё и по тексту сообщения.
  if (
    err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
    (String(err?.code).startsWith('SQLITE_CONSTRAINT') && /FOREIGN KEY/i.test(err.message))
  ) {
    return res.status(409).json({ code: 'IN_USE', message: 'Record is referenced by other records' });
  }
  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ code: 'DUPLICATE', message: 'Record with the same unique value already exists' });
  }

  // Битый JSON в теле запроса
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'BAD_JSON', message: 'Malformed JSON body' });
  }

  console.error(err);
  res.status(500).json({ code: 'INTERNAL', message: config.isProd ? 'Internal server error' : String(err?.message) });
}
