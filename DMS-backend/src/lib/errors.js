// Единый формат ошибок API: { code: 'EMAIL_TAKEN', message: '...', details?: [...] }
//  - HTTP-статус говорит «что случилось вообще» (400 — неверный запрос, 401 — не вошёл, 403 — нельзя, 404 — нет, 409 — конфликт)
//  - code — стабильный машинный идентификатор: по нему фронтенд подбирает текст на нужном языке
//  - message — для разработчика (английский), пользователю его показывать не нужно
export class HttpError extends Error {
  constructor(status, code, message = code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new HttpError(400, code, message, details);
export const unauthorized = (code = 'UNAUTHORIZED', message = 'Authentication required') => new HttpError(401, code, message);
export const forbidden = (code = 'FORBIDDEN', message = 'Not enough permissions') => new HttpError(403, code, message);
export const notFound = (what = 'Resource') => new HttpError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (code, message) => new HttpError(409, code, message);
