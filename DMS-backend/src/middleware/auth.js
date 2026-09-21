import { forbidden, unauthorized } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';

/**
 * «Кто ты?» Читает заголовок `Authorization: Bearer <токен>`, проверяет подпись и кладёт пользователя в req.user.
 * Пользователя каждый раз читаем из БД, а не доверяем роли из токена: если админа разжаловали
 * или заблокировали, это подействует сразу, а не через 15 минут, когда истечёт токен.
 */
export function authenticate(db) {
  const getUser = db.prepare('SELECT id, full_name, email, role, active, department_id FROM users WHERE id = ?');

  return (req, _res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized();

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw unauthorized('TOKEN_INVALID', 'Token is invalid or expired'); // фронтенд по этому коду обновит токен
    }

    const user = getUser.get(Number(payload.sub));
    if (!user) throw unauthorized('TOKEN_INVALID', 'User no longer exists');
    if (!user.active) throw forbidden('ACCOUNT_DISABLED', 'Account is disabled');

    req.user = user;
    next();
  };
}

/** «Можно ли тебе сюда?» Пропускает только перечисленные роли. Ставится после authenticate. */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };

export const isStaff = (user) => user.role === 'admin' || user.role === 'moderator';
