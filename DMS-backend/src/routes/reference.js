import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { idList, likePattern, pagination, paramId, parse } from '../lib/http.js';
import { conflict, notFound } from '../lib/errors.js';

/**
 * Три справочника (отделы, виды документов, дела архива) ведут себя одинаково:
 * список с поиском и страницами, создание, правка, удаление, «выпадающий» список.
 * Вместо трёх копий кода — одна фабрика, которой передаём отличия.
 *
 * @param {object} opts
 * @param {string}  opts.table       имя таблицы
 * @param {boolean} opts.hasActive   есть ли колонка active (можно «отключить» запись, не удаляя)
 * @param {string}  opts.counts      SQL-фрагмент с доп. счётчиками (например, сколько документов в деле)
 * @param {boolean} opts.readAll     true — список могут читать все вошедшие, false — только админ/модератор
 */
export function referenceRoutes(db, { table, hasActive, counts = '', readAll = false }) {
  const router = Router();
  router.use(authenticate(db));
  const staff = requireRole('admin', 'moderator');

  const schema = z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).default(''),
    ...(hasActive ? { active: z.boolean().default(true) } : {}),
  });

  const SELECT = `SELECT t.*${counts ? `, ${counts}` : ''} FROM ${table} t`;
  const toJson = (r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    ...(hasActive ? { active: !!r.active } : {}),
    documentsCount: r.documents_count ?? undefined,
    usersCount: r.users_count ?? undefined,
    createdAt: r.created_at,
  });
  const getOne = (id) => db.prepare(`${SELECT} WHERE t.id = ?`).get(id);

  // Короткий список для выпадающих полей в формах и фильтрах: доступен всем вошедшим
  router.get('/options', (_req, res) => {
    const rows = db.prepare(`SELECT id, name FROM ${table} ${hasActive ? 'WHERE active = 1' : ''} ORDER BY name COLLATE NOCASE`).all();
    res.json(rows);
  });

  router.get('/', readAll ? (_req, _res, next) => next() : staff, (req, res) => {
    const { page, limit, offset } = pagination(req.query, { maxLimit: 200 });
    const where = [];
    const args = [];
    if (req.query.search) {
      where.push(`ulower(t.name) LIKE ? ESCAPE '\\'`);
      args.push(likePattern(req.query.search));
    }
    if (hasActive && (req.query.active === 'true' || req.query.active === 'false')) {
      where.push('t.active = ?');
      args.push(req.query.active === 'true' ? 1 : 0);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM ${table} t ${clause}`).get(...args).n;
    const items = db
      .prepare(`${SELECT} ${clause} ORDER BY t.name COLLATE NOCASE LIMIT ? OFFSET ?`)
      .all(...args, limit, offset)
      .map(toJson);
    res.json({ items, total, page, limit });
  });

  router.get('/:id', readAll ? (_req, _res, next) => next() : staff, (req, res) => {
    const row = getOne(paramId(req));
    if (!row) throw notFound('Record');
    res.json(toJson(row));
  });

  // Сравнение без учёта регистра через ulower: COLLATE NOCASE в SQLite понимает только латиницу
  const nameFree = (name, exceptId = 0) =>
    !db.prepare(`SELECT 1 FROM ${table} WHERE ulower(name) = ulower(?) AND id != ?`).get(name, exceptId);

  router.post('/', staff, (req, res) => {
    const d = parse(schema, req.body);
    if (!nameFree(d.name)) throw conflict('NAME_TAKEN', 'A record with this name already exists');
    const { lastInsertRowid } = hasActive
      ? db.prepare(`INSERT INTO ${table} (name, description, active) VALUES (?, ?, ?)`).run(d.name, d.description, d.active ? 1 : 0)
      : db.prepare(`INSERT INTO ${table} (name, description) VALUES (?, ?)`).run(d.name, d.description);
    res.status(201).json(toJson(getOne(lastInsertRowid)));
  });

  router.put('/:id', staff, (req, res) => {
    const id = paramId(req);
    const d = parse(schema, req.body);
    if (!getOne(id)) throw notFound('Record');
    if (!nameFree(d.name, id)) throw conflict('NAME_TAKEN', 'A record with this name already exists');
    if (hasActive) {
      db.prepare(`UPDATE ${table} SET name = ?, description = ?, active = ? WHERE id = ?`).run(d.name, d.description, d.active ? 1 : 0, id);
    } else {
      db.prepare(`UPDATE ${table} SET name = ?, description = ? WHERE id = ?`).run(d.name, d.description, id);
    }
    res.json(toJson(getOne(id)));
  });

  if (hasActive) {
    router.patch('/:id/active', staff, (req, res) => {
      const id = paramId(req);
      const { active } = parse(z.object({ active: z.boolean() }), req.body);
      if (!getOne(id)) throw notFound('Record');
      db.prepare(`UPDATE ${table} SET active = ? WHERE id = ?`).run(active ? 1 : 0, id);
      res.json(toJson(getOne(id)));
    });
  }

  // Если запись где-то используется (на отдел ссылается документ), внешний ключ RESTRICT
  // не даст её удалить, а errorHandler превратит это в ответ 409 IN_USE.
  router.delete('/:id', staff, (req, res) => {
    const id = paramId(req);
    if (!getOne(id)) throw notFound('Record');
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    res.status(204).end();
  });

  // Массовое удаление в транзакции: либо удалятся все, либо (если хоть одну нельзя) — ни одна
  router.post('/bulk-delete', staff, (req, res) => {
    const { ids } = parse(z.object({ ids: idList }), req.body);
    db.transaction(() => ids.forEach((id) => db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)))();
    res.status(204).end();
  });

  return router;
}
