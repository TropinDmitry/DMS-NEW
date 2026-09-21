import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/** Access-токен (JWT): подписанная строка с id пользователя. Сервер ему верит, пока подпись верна и срок не истёк. */
export function signAccessToken(user) {
  return jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: config.accessTokenTtl });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret); // бросает ошибку, если подпись/срок неверны
}

/** Случайный непредсказуемый токен для refresh-cookie и ссылки сброса пароля. */
export const randomToken = () => crypto.randomBytes(32).toString('hex');

/** В БД кладём только SHA-256 хэш токена: даже если базу украдут, самих токенов там нет. */
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const REFRESH_COOKIE = 'dms_refresh';

export function refreshCookieOptions() {
  return {
    httpOnly: true, // JavaScript страницы не может прочитать cookie — защита от кражи через XSS
    sameSite: 'lax', // не отправляется со сторонних сайтов — защита от CSRF
    secure: config.isProd, // в продакшене только по HTTPS
    path: '/api/auth', // браузер шлёт cookie только на эти адреса
    maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000,
  };
}

export const inDays = (days) => new Date(Date.now() + days * 86_400_000).toISOString();
export const inMinutes = (min) => new Date(Date.now() + min * 60_000).toISOString();
