// Все настройки в одном месте. Значения берутся из переменных окружения (файл .env),
// а если их нет — подставляются значения по умолчанию, удобные для разработки.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('В продакшене нужно задать JWT_SECRET (см. .env.example)');
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 8080,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m', // access-токен живёт недолго: если его украдут, ущерб ограничен
  refreshTokenDays: 7, // refresh-токен живёт дольше, лежит в httpOnly-cookie
  resetTokenMinutes: 30,
  dbPath: process.env.DB_PATH || path.join(root, 'data', 'dms.db'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'uploads'),
  maxFileSizeMb: 20,
  maxAvatarSizeMb: 2,
  // в тестах лимит запросов на вход отключаем, иначе тесты сами себя заблокируют
  authRateLimit: process.env.NODE_ENV === 'test' ? 10_000 : isProd ? 20 : 200,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@dms.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  frontendDist: path.join(root, '..', 'DMS-frontend', 'dist'),
};
