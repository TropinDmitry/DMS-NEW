import { z } from 'zod';
import { badRequest } from './errors.js';

/** Проверяет данные по схеме zod. При ошибке бросает 400 с перечнем полей, при успехе возвращает очищенные данные. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw badRequest('VALIDATION', 'Invalid input', details);
  }
  return result.data;
}

/** Разбирает ?page=2&limit=20 и возвращает числа плюс offset для SQL. */
export function pagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

/** Экранирует % и _ в поисковой строке, чтобы пользователь не мог подсунуть свои шаблоны LIKE. */
export function likePattern(term) {
  const escaped = String(term)
    .toLowerCase()
    .replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%${escaped}%`;
}

export const idParam = z.coerce.number().int().positive();

/** Достаёт числовой id из req.params или бросает 400. */
export function paramId(req, name = 'id') {
  return parse(idParam, req.params[name]);
}

export const idList = z.array(z.number().int().positive()).min(1).max(500);
