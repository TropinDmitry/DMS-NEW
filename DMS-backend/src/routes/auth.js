import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { parse } from '../lib/http.js';
import { conflict, forbidden, unauthorized, badRequest } from '../lib/errors.js';
import { USER_SELECT, userJson } from '../lib/mappers.js';
import { REFRESH_COOKIE, hashToken, inDays, inMinutes, randomToken, refreshCookieOptions, signAccessToken } from '../lib/tokens.js';
import { authenticate } from '../middleware/auth.js';

const email = z.string().trim().toLowerCase().email().max(200);
const password = z.string().min(6).max(100);

const signupSchema = z.object({ fullName: z.string().trim().min(1).max(200), email, password });
const signinSchema = z.object({ email, password: z.string().min(1).max(100) });
const forgotSchema = z.object({ email });
const resetSchema = z.object({ token: z.string().min(10).max(200), password });

export function authRoutes(db) {
  const router = Router();
  const nowIso = () => new Date().toISOString();

  // Ограничиваем частоту запросов на вход/регистрацию: защита от подбора паролей
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.authRateLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try again later' },
  });

  const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const findFull = db.prepare(`${USER_SELECT} WHERE u.id = ?`);

  /** Создаёт refresh-токен, кладёт его хэш в БД и отправляет сам токен в httpOnly-cookie. */
  function issueRefreshCookie(res, userId) {
    const token = randomToken();
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
      userId,
      hashToken(token),
      inDays(config.refreshTokenDays),
    );
    res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
  }

  function sessionResponse(userId) {
    const user = findFull.get(userId);
    return { accessToken: signAccessToken(user), user: userJson(user) };
  }

  // --- Регистрация: аккаунт создаётся НЕактивным, пока его не подтвердит администратор ---
  router.post('/signup', limiter, (req, res) => {
    const { fullName, email: mail, password: pass } = parse(signupSchema, req.body);
    if (findByEmail.get(mail)) throw conflict('EMAIL_TAKEN', 'Email is already registered');
    db.prepare('INSERT INTO users (full_name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 0)').run(
      fullName,
      mail,
      bcrypt.hashSync(pass, 10),
      'employee',
    );
    res.status(201).json({ status: 'pending' });
  });

  router.post('/signin', limiter, (req, res) => {
    const { email: mail, password: pass } = parse(signinSchema, req.body);
    const user = findByEmail.get(mail);
    // Одинаковый ответ для «нет такого email» и «неверный пароль» — чтобы нельзя было выяснять, кто зарегистрирован
    if (!user || !bcrypt.compareSync(pass, user.password_hash)) {
      throw unauthorized('INVALID_CREDENTIALS', 'Wrong email or password');
    }
    if (!user.active) throw forbidden('ACCOUNT_DISABLED', 'Account is disabled');

    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < ?').run(user.id, nowIso());
    issueRefreshCookie(res, user.id);
    res.json(sessionResponse(user.id));
  });

  // --- Обновление access-токена по refresh-cookie (с «ротацией»: старый refresh-токен сгорает) ---
  router.post('/refresh', (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    const row = token ? db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(hashToken(token)) : null;

    if (!row || row.expires_at < nowIso()) {
      res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
      throw unauthorized('REFRESH_INVALID', 'Session expired');
    }
    const user = db.prepare('SELECT id, active FROM users WHERE id = ?').get(row.user_id);
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
    if (!user || !user.active) {
      res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
      throw forbidden('ACCOUNT_DISABLED', 'Account is disabled');
    }

    issueRefreshCookie(res, user.id);
    res.json(sessionResponse(user.id));
  });

  router.post('/signout', (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hashToken(token));
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    res.status(204).end();
  });

  router.get('/me', authenticate(db), (req, res) => {
    res.json({ user: userJson(findFull.get(req.user.id)) });
  });

  // --- Сброс пароля ---
  router.post('/forgot-password', limiter, (req, res) => {
    const { email: mail } = parse(forgotSchema, req.body);
    const user = findByEmail.get(mail);
    const body = { status: 'sent' }; // отвечаем одинаково, есть такой email или нет

    if (user && user.active) {
      const token = randomToken();
      db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
      db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
        user.id,
        hashToken(token),
        inMinutes(config.resetTokenMinutes),
      );
      const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
      // Настоящего почтового сервера нет: «письмо» печатаем в консоль. В боевой версии здесь отправка e-mail.
      console.log(`\n[письмо] Сброс пароля для ${user.email}:\n${link}\n`);
      if (!config.isProd) body.devResetLink = link; // только для разработки, чтобы не лазить в консоль
    }
    res.json(body);
  });

  router.post('/reset-password', limiter, (req, res) => {
    const { token, password: pass } = parse(resetSchema, req.body);
    const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(hashToken(token));
    if (!row || row.expires_at < nowIso()) throw badRequest('RESET_TOKEN_INVALID', 'Reset link is invalid or expired');

    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(pass, 10), row.user_id);
      db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(row.user_id);
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(row.user_id); // выкидываем со всех устройств
    })();
    res.json({ status: 'ok' });
  });

  return router;
}
