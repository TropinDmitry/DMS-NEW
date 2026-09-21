import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { idList, likePattern, pagination, paramId, parse } from '../lib/http.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { USER_SELECT, userBrief, userJson } from '../lib/mappers.js';
import { avatarUpload, paths, removeStoredFile } from '../lib/upload.js';

const roleEnum = z.enum(['admin', 'moderator', 'employee']);
const baseFields = {
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(40).default(''),
  gender: z.enum(['', 'male', 'female']).default(''),
  birthDate: z.string().trim().max(10).default(''),
  departmentId: z.number().int().positive().nullable().default(null),
};
const createSchema = z.object({
  ...baseFields,
  password: z.string().min(6).max(100),
  role: roleEnum.default('employee'),
  active: z.boolean().default(true),
});
const updateSchema = z.object({ ...baseFields, password: z.string().min(6).max(100).optional() });
const profileSchema = z.object({
  fullName: baseFields.fullName,
  phone: baseFields.phone,
  gender: baseFields.gender,
  birthDate: baseFields.birthDate,
});
const passwordSchema = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(6).max(100) });

/** Управление пользователями — только для администратора. */
export function usersRoutes(db) {
  const router = Router();
  router.use(authenticate(db));

  const getFull = (id) => db.prepare(`${USER_SELECT} WHERE u.id = ?`).get(id);
  const activeAdmins = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id != ?");

  /** Нельзя оставить систему без единого активного администратора — иначе никто не сможет ею управлять. */
  function assertAnotherAdminRemains(userId) {
    if (activeAdmins.get(userId).n === 0) throw conflict('LAST_ADMIN', 'At least one active administrator is required');
  }

  // Короткий список для выпадающих списков (например, исполнители задачи) — нужен администратору и модератору
  router.get('/lookup', requireRole('admin', 'moderator'), (_req, res) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.full_name, u.avatar_file, d.name AS department_name
                FROM users u LEFT JOIN departments d ON d.id = u.department_id
                WHERE u.active = 1 ORDER BY u.full_name`,
      )
      .all();
    res.json(rows.map((r) => ({ ...userBrief(r), departmentName: r.department_name })));
  });

  router.use(requireRole('admin'));

  router.get('/', (req, res) => {
    const { page, limit, offset } = pagination(req.query);
    const where = [];
    const args = [];
    if (req.query.search) {
      const p = likePattern(req.query.search);
      where.push(`(ulower(u.full_name) LIKE ? ESCAPE '\\' OR ulower(u.email) LIKE ? ESCAPE '\\' OR u.phone LIKE ? ESCAPE '\\')`);
      args.push(p, p, p);
    }
    if (req.query.role) {
      where.push('u.role = ?');
      args.push(String(req.query.role));
    }
    if (req.query.active === 'true' || req.query.active === 'false') {
      where.push('u.active = ?');
      args.push(req.query.active === 'true' ? 1 : 0);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM users u ${clause}`).get(...args).n;
    const items = db
      .prepare(`${USER_SELECT} ${clause} ORDER BY u.full_name COLLATE NOCASE LIMIT ? OFFSET ?`)
      .all(...args, limit, offset)
      .map(userJson);
    res.json({ items, total, page, limit });
  });

  router.get('/:id', (req, res) => {
    const user = getFull(paramId(req));
    if (!user) throw notFound('User');
    res.json(userJson(user));
  });

  router.post('/', (req, res) => {
    const d = parse(createSchema, req.body);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(d.email)) throw conflict('EMAIL_TAKEN', 'Email is already registered');
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO users (full_name, email, password_hash, phone, gender, birth_date, department_id, role, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(d.fullName, d.email, bcrypt.hashSync(d.password, 10), d.phone, d.gender, d.birthDate, d.departmentId, d.role, d.active ? 1 : 0);
    res.status(201).json(userJson(getFull(lastInsertRowid)));
  });

  router.put('/:id', (req, res) => {
    const id = paramId(req);
    const d = parse(updateSchema, req.body);
    if (!getFull(id)) throw notFound('User');
    const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(d.email, id);
    if (taken) throw conflict('EMAIL_TAKEN', 'Email is already registered');

    db.prepare(`UPDATE users SET full_name = ?, email = ?, phone = ?, gender = ?, birth_date = ?, department_id = ? WHERE id = ?`).run(
      d.fullName,
      d.email,
      d.phone,
      d.gender,
      d.birthDate,
      d.departmentId,
      id,
    );
    if (d.password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(d.password, 10), id);
    res.json(userJson(getFull(id)));
  });

  router.patch('/:id/role', (req, res) => {
    const id = paramId(req);
    const { role } = parse(z.object({ role: roleEnum }), req.body);
    const user = getFull(id);
    if (!user) throw notFound('User');
    if (user.role === 'admin' && role !== 'admin') assertAnotherAdminRemains(id);
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    res.json(userJson(getFull(id)));
  });

  router.patch('/:id/active', (req, res) => {
    const id = paramId(req);
    const { active } = parse(z.object({ active: z.boolean() }), req.body);
    const user = getFull(id);
    if (!user) throw notFound('User');
    if (!active) {
      if (id === req.user.id) throw badRequest('CANNOT_DISABLE_SELF', 'You cannot disable your own account');
      if (user.role === 'admin') assertAnotherAdminRemains(id);
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(id); // сессии заблокированного сгорают
    }
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
    res.json(userJson(getFull(id)));
  });

  const removeUsers = db.transaction((ids, selfId) => {
    for (const id of ids) {
      if (id === selfId) throw badRequest('CANNOT_DELETE_SELF', 'You cannot delete your own account');
      const user = db.prepare('SELECT role, avatar_file FROM users WHERE id = ?').get(id);
      if (!user) continue;
      if (user.role === 'admin') assertAnotherAdminRemains(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      removeStoredFile(paths.avatarsDir, user.avatar_file);
    }
  });

  router.delete('/:id', (req, res) => {
    const id = paramId(req);
    if (!getFull(id)) throw notFound('User');
    removeUsers([id], req.user.id);
    res.status(204).end();
  });

  router.post('/bulk-delete', (req, res) => {
    const { ids } = parse(z.object({ ids: idList }), req.body);
    removeUsers(ids, req.user.id);
    res.status(204).end();
  });

  return router;
}

/** «Мой профиль» — любой вошедший пользователь правит только СЕБЯ. */
export function profileRoutes(db) {
  const router = Router();
  router.use(authenticate(db));
  const getFull = (id) => db.prepare(`${USER_SELECT} WHERE u.id = ?`).get(id);

  router.put('/', (req, res) => {
    const d = parse(profileSchema, req.body);
    db.prepare('UPDATE users SET full_name = ?, phone = ?, gender = ?, birth_date = ? WHERE id = ?').run(
      d.fullName,
      d.phone,
      d.gender,
      d.birthDate,
      req.user.id,
    );
    res.json(userJson(getFull(req.user.id)));
  });

  router.patch('/password', (req, res) => {
    const { oldPassword, newPassword } = parse(passwordSchema, req.body);
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(oldPassword, row.password_hash)) throw badRequest('WRONG_PASSWORD', 'Current password is incorrect');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
    res.status(204).end();
  });

  router.post('/avatar', (req, res, next) => {
    avatarUpload(req, res, (err) => {
      if (err) return next(err);
      if (!req.file) return next(badRequest('NO_FILE', 'Image file is required (field "avatar")'));
      const old = db.prepare('SELECT avatar_file FROM users WHERE id = ?').get(req.user.id);
      db.prepare('UPDATE users SET avatar_file = ? WHERE id = ?').run(req.file.filename, req.user.id);
      removeStoredFile(paths.avatarsDir, old?.avatar_file);
      res.json(userJson(getFull(req.user.id)));
    });
  });

  router.delete('/avatar', (req, res) => {
    const old = db.prepare('SELECT avatar_file FROM users WHERE id = ?').get(req.user.id);
    db.prepare('UPDATE users SET avatar_file = NULL WHERE id = ?').run(req.user.id);
    removeStoredFile(paths.avatarsDir, old?.avatar_file);
    res.json(userJson(getFull(req.user.id)));
  });

  return router;
}
