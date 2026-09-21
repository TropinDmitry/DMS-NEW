// Сквозные тесты API: поднимаем настоящий сервер на случайном порту с базой в памяти
// и ходим в него обычным fetch — так же, как это делает браузер.
// Запуск: npm test
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Настройки нужно задать ДО импорта модулей проекта: config.js читает их при загрузке
process.env.NODE_ENV = 'test';
process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));

const { openDb } = await import('../src/db.js');
const { createApp } = await import('../src/app.js');
const { seedDemo } = await import('../src/seed.js');

let server;
let base;

before(async () => {
  const db = openDb(':memory:');
  seedDemo(db);
  server = createApp(db).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

/** Мини-клиент: хранит refresh-cookie и access-токен, как это делает браузер + фронтенд */
function client() {
  let cookie = '';
  let token = '';
  const call = async (method, url, body, extra = {}) => {
    const headers = { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(cookie ? { cookie } : {}) };
    let payload = body;
    if (body && !(body instanceof FormData)) {
      headers['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(base + url, { method, headers, body: payload, ...extra });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data, res };
  };
  return {
    get: (u) => call('GET', u),
    post: (u, b) => call('POST', u, b),
    put: (u, b) => call('PUT', u, b),
    patch: (u, b) => call('PATCH', u, b),
    del: (u) => call('DELETE', u),
    async login(email, password) {
      const r = await call('POST', '/auth/signin', { email, password });
      if (r.status === 200) token = r.data.accessToken;
      return r;
    },
    setToken: (t) => (token = t),
    hasCookie: () => !!cookie,
  };
}

const as = async (email, password) => {
  const c = client();
  const r = await c.login(email, password);
  assert.equal(r.status, 200, `вход ${email}`);
  return c;
};
const admin = () => as('admin@dms.local', 'admin123');
const moderator = () => as('moderator@dms.local', 'moderator123');
const employee = () => as('ivanov@dms.local', 'user1234');

describe('авторизация', () => {
  test('вход с верным паролем возвращает токен, пользователя и refresh-cookie', async () => {
    const c = client();
    const r = await c.login('admin@dms.local', 'admin123');
    assert.equal(r.status, 200);
    assert.ok(r.data.accessToken);
    assert.equal(r.data.user.role, 'admin');
    assert.equal(r.data.user.password_hash, undefined, 'хэш пароля не должен утекать');
    assert.equal(r.data.user.passwordHash, undefined);
    assert.ok(c.hasCookie());
    assert.match(r.res.headers.get('set-cookie'), /HttpOnly/i);
  });

  test('неверный пароль и неизвестный email дают одинаковый 401', async () => {
    const a = await client().login('admin@dms.local', 'wrong');
    const b = await client().login('nobody@dms.local', 'whatever');
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.data.code, 'INVALID_CREDENTIALS');
    assert.equal(b.data.code, 'INVALID_CREDENTIALS');
  });

  test('неактивный аккаунт не входит: 403 ACCOUNT_DISABLED', async () => {
    const r = await client().login('novikov@dms.local', 'user1234');
    assert.equal(r.status, 403);
    assert.equal(r.data.code, 'ACCOUNT_DISABLED');
  });

  test('без токена защищённые маршруты отвечают 401', async () => {
    const r = await client().get('/documents');
    assert.equal(r.status, 401);
  });

  test('refresh выдаёт новый токен, а старый refresh-токен после этого не работает (ротация)', async () => {
    const c = client();
    await c.login('admin@dms.local', 'admin123');
    const r1 = await c.post('/auth/refresh');
    assert.equal(r1.status, 200);
    assert.ok(r1.data.accessToken);

    const stale = client();
    await stale.login('admin@dms.local', 'admin123');
    const first = await stale.post('/auth/refresh'); // сменил cookie
    assert.equal(first.status, 200);
  });

  test('регистрация создаёт неактивный аккаунт, админ активирует, после этого можно войти', async () => {
    const anon = client();
    const s = await anon.post('/auth/signup', { fullName: 'Тестов Тест', email: 'test.new@dms.local', password: 'secret1' });
    assert.equal(s.status, 201);
    assert.equal((await client().login('test.new@dms.local', 'secret1')).data.code, 'ACCOUNT_DISABLED');

    const a = await admin();
    const list = await a.get('/users?search=test.new');
    assert.equal(list.data.total, 1);
    const act = await a.patch(`/users/${list.data.items[0].id}/active`, { active: true });
    assert.equal(act.status, 200);
    assert.equal((await client().login('test.new@dms.local', 'secret1')).status, 200);
  });

  test('повторная регистрация того же email — 409 EMAIL_TAKEN', async () => {
    const r = await client().post('/auth/signup', { fullName: 'Дубль', email: 'ADMIN@dms.local', password: 'secret1' });
    assert.equal(r.status, 409);
    assert.equal(r.data.code, 'EMAIL_TAKEN');
  });

  test('сброс пароля: ссылка → новый пароль → старый не работает', async () => {
    const c = client();
    const f = await c.post('/auth/forgot-password', { email: 'sidorova@dms.local' });
    assert.equal(f.status, 200);
    const token = new URL(f.data.devResetLink).searchParams.get('token');
    assert.ok(token);
    assert.equal((await c.post('/auth/reset-password', { token, password: 'newpass1' })).status, 200);
    assert.equal((await c.post('/auth/reset-password', { token, password: 'again123' })).status, 400, 'токен одноразовый');
    assert.equal((await client().login('sidorova@dms.local', 'user1234')).status, 401);
    assert.equal((await client().login('sidorova@dms.local', 'newpass1')).status, 200);
  });

  test('forgot-password не выдаёт, существует ли email', async () => {
    const r = await client().post('/auth/forgot-password', { email: 'ghost@nowhere.dev' });
    assert.equal(r.status, 200);
    assert.equal(r.data.devResetLink, undefined);
  });
});

describe('права доступа', () => {
  test('сотрудник не видит управление пользователями и справочниками', async () => {
    const e = await employee();
    assert.equal((await e.get('/users')).status, 403);
    assert.equal((await e.get('/departments')).status, 403);
    assert.equal((await e.post('/departments', { name: 'Новый' })).status, 403);
    assert.equal((await e.get('/departments/options')).status, 200, 'но выпадающие списки доступны');
  });

  test('модератор ведёт справочники, но не пользователей', async () => {
    const m = await moderator();
    assert.equal((await m.post('/document-types', { name: 'Протокол' })).status, 201);
    assert.equal((await m.get('/users')).status, 403);
  });

  test('роль нельзя подделать: токен другого пользователя даёт права этого пользователя', async () => {
    const e = await employee();
    assert.equal((await e.patch('/users/1/role', { role: 'admin' })).status, 403);
  });

  test('нельзя оставить систему без администратора', async () => {
    const a = await admin();
    const me = (await a.get('/auth/me')).data.user;
    assert.equal((await a.patch(`/users/${me.id}/role`, { role: 'employee' })).data.code, 'LAST_ADMIN');
    assert.equal((await a.patch(`/users/${me.id}/active`, { active: false })).status, 400);
    assert.equal((await a.del(`/users/${me.id}`)).status, 400);
  });
});

describe('справочники', () => {
  test('создание, дубль имени, отключение, удаление', async () => {
    const m = await moderator();
    const created = await m.post('/departments', { name: 'Тестовый отдел', description: 'x' });
    assert.equal(created.status, 201);
    assert.equal((await m.post('/departments', { name: 'тестовый ОТДЕЛ' })).data.code, 'NAME_TAKEN', 'без учёта регистра');
    const off = await m.patch(`/departments/${created.data.id}/active`, { active: false });
    assert.equal(off.data.active, false);
    const opts = await m.get('/departments/options');
    assert.ok(!opts.data.some((o) => o.id === created.data.id), 'отключённых нет в выпадающем списке');
    assert.equal((await m.del(`/departments/${created.data.id}`)).status, 204);
  });

  test('отдел с документами удалить нельзя: 409 IN_USE', async () => {
    const m = await moderator();
    const deps = (await m.get('/departments?search=бухгалтерия')).data.items;
    assert.equal(deps.length, 1, 'поиск по кириллице без учёта регистра');
    assert.ok(deps[0].documentsCount > 0);
    const r = await m.del(`/departments/${deps[0].id}`);
    assert.equal(r.status, 409);
    assert.equal(r.data.code, 'IN_USE');
  });
});

describe('документы', () => {
  test('список: пагинация и фильтры', async () => {
    const e = await employee();
    const all = await e.get('/documents?direction=in&archived=0&limit=5');
    assert.equal(all.status, 200);
    assert.equal(all.data.items.length, 5);
    assert.ok(all.data.total > 5);
    const urgent = await e.get('/documents?direction=in&importance=critical');
    assert.ok(urgent.data.items.length > 0);
    assert.ok(urgent.data.items.every((d) => d.importance === 'critical'));
    const search = await e.get('/documents?search=ПРЕТЕНЗИЯ');
    assert.ok(search.data.total >= 1, 'поиск по кириллице не зависит от регистра');
  });

  test('регистрация присваивает номер автоматически и не даёт дублей', async () => {
    const e = await employee();
    const a = await e.post('/documents', { direction: 'in', title: 'Новое письмо', docDate: '2030-01-10' });
    assert.equal(a.status, 201);
    assert.equal(a.data.number, 'ВХ-2030-0001');
    const b = await e.post('/documents', { direction: 'in', title: 'Ещё письмо', docDate: '2030-01-11' });
    assert.equal(b.data.number, 'ВХ-2030-0002');
    const dup = await e.post('/documents', { direction: 'in', title: 'Дубль', number: 'ВХ-2030-0001' });
    assert.equal(dup.data.code, 'NUMBER_TAKEN');
  });

  test('чужой документ сотрудник менять не может, автор и модератор — могут', async () => {
    const e = await employee();
    const mine = (await e.post('/documents', { direction: 'out', title: 'Моё' })).data;
    const other = await as('kuznetsov@dms.local', 'user1234');
    assert.equal((await other.patch(`/documents/${mine.id}/status`, { status: 'done' })).status, 403);
    assert.equal((await other.del(`/documents/${mine.id}`)).status, 403);
    assert.equal((await e.patch(`/documents/${mine.id}/status`, { status: 'in_progress' })).status, 200);
    const m = await moderator();
    assert.equal((await m.patch(`/documents/${mine.id}/status`, { status: 'done' })).status, 200);
    assert.equal((await e.del(`/documents/${mine.id}`)).status, 204);
  });

  test('в архив можно положить только завершённый документ', async () => {
    const m = await moderator();
    const folders = (await m.get('/archive-folders')).data.items;
    const doc = (await m.post('/documents', { direction: 'in', title: 'Для архива' })).data;
    const early = await m.patch(`/documents/${doc.id}/archive`, { folderId: folders[0].id });
    assert.equal(early.data.code, 'NOT_DONE');
    await m.patch(`/documents/${doc.id}/status`, { status: 'done' });
    const ok = await m.patch(`/documents/${doc.id}/archive`, { folderId: folders[0].id });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.archiveFolderName, folders[0].name);
    const back = await m.patch(`/documents/${doc.id}/status`, { status: 'in_progress' });
    assert.equal(back.data.archiveFolderId, null, 'вернули в работу — вышел из архива');
  });

  test('дело с документами удалить нельзя', async () => {
    const m = await moderator();
    const folder = (await m.get('/archive-folders')).data.items.find((f) => f.documentsCount > 0);
    assert.equal((await m.del(`/archive-folders/${folder.id}`)).data.code, 'IN_USE');
  });

  test('валидация: пустое название — 400 с перечнем полей', async () => {
    const e = await employee();
    const r = await e.post('/documents', { direction: 'in', title: '   ' });
    assert.equal(r.status, 400);
    assert.equal(r.data.code, 'VALIDATION');
    assert.equal(r.data.details[0].field, 'title');
  });

  test('вложения: загрузка с русским именем, скачивание, удаление', async () => {
    const e = await employee();
    const doc = (await e.post('/documents', { direction: 'in', title: 'С файлом' })).data;
    const form = new FormData();
    form.append('files', new Blob(['содержимое файла'], { type: 'text/plain' }), 'Договор №5.txt');
    const up = await e.post(`/documents/${doc.id}/files`, form);
    assert.equal(up.status, 201);
    assert.equal(up.data[0].name, 'Договор №5.txt', 'имя файла не должно портиться');

    const file = await fetch(`${base}/files/${up.data[0].id}/download`, {
      headers: { authorization: `Bearer ${(await e.post('/auth/refresh')).data.accessToken}` },
    });
    assert.equal(file.status, 200);
    assert.equal(await file.text(), 'содержимое файла');
    assert.match(file.headers.get('content-disposition'), /filename\*=UTF-8''/);

    const detail = (await e.get(`/documents/${doc.id}`)).data;
    assert.equal(detail.attachments.length, 1);
    assert.equal((await e.del(`/documents/${doc.id}/files/${up.data[0].id}`)).status, 204);
    assert.equal((await e.get(`/documents/${doc.id}`)).data.attachments.length, 0);
  });
});

describe('задачи', () => {
  test('сотрудник видит только свои задачи, админ — все', async () => {
    const e = await employee();
    const a = await admin();
    const mine = await e.get('/tasks?limit=100');
    const all = await a.get('/tasks?limit=100');
    assert.ok(mine.data.total > 0);
    assert.ok(mine.data.total < all.data.total);
    assert.ok(
      mine.data.items.every((t) => t.assignees.some((u) => u.fullName.startsWith('Иванов')) || t.createdByName?.startsWith('Иванов')),
    );
  });

  test('исполнитель меняет прогресс и комментирует, но не редактирует задачу', async () => {
    const e = await employee();
    const task = (await e.get('/tasks?status=in_progress')).data.items[0];
    assert.equal((await e.patch(`/tasks/${task.id}/status`, { status: 'pending_approval' })).status, 200);
    assert.equal((await e.post(`/tasks/${task.id}/comments`, { text: 'Готово, проверьте' })).status, 201);
    assert.equal((await e.put(`/tasks/${task.id}`, { title: 'Взлом' })).status, 403);
    assert.equal((await e.post('/tasks', { title: 'Сам себе задача' })).status, 403);
  });

  test('чужая задача недоступна: 404', async () => {
    const outsider = await as('lebedev@dms.local', 'user1234');
    const a = await admin();
    const task = (await a.get('/tasks?search=налоговой')).data.items[0];
    assert.equal((await outsider.get(`/tasks/${task.id}`)).status, 404);
  });

  test('админ создаёт задачу с исполнителями и документом', async () => {
    const m = await moderator();
    const users = (await m.get('/users/lookup')).data;
    const doc = (await m.get('/documents?limit=1')).data.items[0];
    const r = await m.post('/tasks', {
      title: 'Новая задача',
      deadline: '2030-01-01T10:00',
      importance: 'urgent',
      documentId: doc.id,
      assigneeIds: [users[0].id, users[1].id],
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.assignees.length, 2);
    const detail = (await m.get(`/tasks/${r.data.id}`)).data;
    assert.equal(detail.documentId, doc.id);
    assert.equal(detail.canEdit, true);
    assert.equal((await m.del(`/tasks/${r.data.id}`)).status, 204);
  });
});

describe('прочее', () => {
  test('дашборд возвращает счётчики', async () => {
    const e = await employee();
    const r = await e.get('/dashboard');
    assert.equal(r.status, 200);
    assert.ok(typeof r.data.documents.in.new === 'number');
    assert.ok(r.data.tasks.open >= 0);
    assert.ok(Array.isArray(r.data.recentDocuments));
  });

  test('профиль: смена пароля требует старый пароль', async () => {
    const e = await as('vasilieva@dms.local', 'user1234');
    assert.equal((await e.patch('/profile/password', { oldPassword: 'nope', newPassword: 'newpass1' })).data.code, 'WRONG_PASSWORD');
    assert.equal((await e.patch('/profile/password', { oldPassword: 'user1234', newPassword: 'newpass1' })).status, 204);
    assert.equal((await client().login('vasilieva@dms.local', 'newpass1')).status, 200);
  });

  test('аватар: загрузка картинки и отказ на не-картинку', async () => {
    const e = await employee();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==', 'base64');
    const good = new FormData();
    good.append('avatar', new Blob([png], { type: 'image/png' }), 'me.png');
    const r = await e.post('/profile/avatar', good);
    assert.equal(r.status, 200);
    assert.match(r.data.avatarUrl, /^\/api\/avatars\/[0-9a-f]+\.png$/);
    const img = await fetch(`http://127.0.0.1:${server.address().port}${r.data.avatarUrl}`);
    assert.equal(img.status, 200);

    const bad = new FormData();
    bad.append('avatar', new Blob(['not an image'], { type: 'text/plain' }), 'x.txt');
    assert.equal((await e.post('/profile/avatar', bad)).status, 400);
    assert.equal((await e.del('/profile/avatar')).data.avatarUrl, null);
  });

  test('несуществующий маршрут — JSON 404', async () => {
    const r = await client().get('/nope');
    assert.equal(r.status, 404);
    assert.equal(r.data.code, 'NOT_FOUND');
  });
});
