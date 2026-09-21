// Демо-данные, чтобы приложение не было пустым при первом запуске.
//   npm run seed   — стереть базу и заполнить заново (только для разработки!)
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { openDb } from './db.js';

const hash = (p) => bcrypt.hashSync(p, 10);
const pad = (n) => String(n).padStart(2, '0');
const isoDate = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const isoDateTime = (offsetDays, hour = 17) => `${isoDate(offsetDays)}T${pad(hour)}:00`;

/** Создаёт первого администратора, если пользователей ещё нет (нужно и в продакшене). */
export function ensureAdmin(db) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (n > 0) return false;
  db.prepare("INSERT INTO users (full_name, email, password_hash, role, active) VALUES (?, ?, ?, 'admin', 1)").run(
    'Администратор',
    config.adminEmail,
    hash(config.adminPassword),
  );
  return true;
}

export function seedDemo(db) {
  db.transaction(() => {
    // ----- Отделы -----
    const departments = [
      'Администрация',
      'Бухгалтерия',
      'Юридический отдел',
      'Отдел продаж',
      'Маркетинг',
      'IT-отдел',
      'Логистика',
      'Кадры (HR)',
    ];
    const dep = {};
    for (const name of departments) {
      dep[name] = db.prepare('INSERT INTO departments (name, description, active) VALUES (?, ?, 1)').run(name, '').lastInsertRowid;
    }
    db.prepare('UPDATE departments SET active = 0 WHERE id = ?').run(dep['Маркетинг']); // пример «отключённого» отдела

    // ----- Виды документов -----
    const typeNames = ['Договор', 'Счёт', 'Акт', 'Письмо', 'Приказ', 'Заявление', 'Отчёт', 'Служебная записка'];
    const type = {};
    for (const name of typeNames) {
      type[name] = db.prepare('INSERT INTO document_types (name, description) VALUES (?, ?)').run(name, '').lastInsertRowid;
    }

    // ----- Дела архива (номенклатура дел) -----
    const folderNames = [
      ['01-01 Договоры', 'Заключённые договоры и соглашения'],
      ['02-05 Бухгалтерские документы', 'Счета, акты, накладные'],
      ['03-10 Переписка с контрагентами', 'Входящие и исходящие письма'],
    ];
    const folder = folderNames.map(
      ([name, description]) =>
        db.prepare('INSERT INTO archive_folders (name, description) VALUES (?, ?)').run(name, description).lastInsertRowid,
    );

    // ----- Пользователи -----
    const addUser = (fullName, email, password, role, department, active, phone = '', gender = '', birth = '') =>
      db
        .prepare(
          `INSERT INTO users (full_name, email, password_hash, phone, gender, birth_date, department_id, role, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(fullName, email, hash(password), phone, gender, birth, dep[department] ?? null, role, active ? 1 : 0).lastInsertRowid;

    const admin = addUser(
      'Смирнов Алексей Викторович',
      config.adminEmail,
      config.adminPassword,
      'admin',
      'IT-отдел',
      true,
      '+7 (900) 000-00-01',
      'male',
      '1985-03-14',
    );
    const moderator = addUser(
      'Петрова Мария Сергеевна',
      'moderator@dms.local',
      'moderator123',
      'moderator',
      'Юридический отдел',
      true,
      '+7 (900) 000-00-02',
      'female',
      '1990-07-02',
    );
    const staff = [
      addUser(
        'Иванов Иван Иванович',
        'ivanov@dms.local',
        'user1234',
        'employee',
        'Отдел продаж',
        true,
        '+7 (999) 123-45-67',
        'male',
        '1990-01-01',
      ),
      addUser(
        'Сидорова Анастасия Петровна',
        'sidorova@dms.local',
        'user1234',
        'employee',
        'Бухгалтерия',
        true,
        '+7 (905) 678-90-12',
        'female',
        '1992-05-21',
      ),
      addUser(
        'Кузнецов Дмитрий Алексеевич',
        'kuznetsov@dms.local',
        'user1234',
        'employee',
        'IT-отдел',
        true,
        '+7 (925) 456-78-90',
        'male',
        '1988-11-30',
      ),
      addUser(
        'Васильева Ольга Ивановна',
        'vasilieva@dms.local',
        'user1234',
        'employee',
        'Логистика',
        true,
        '+7 (903) 234-56-78',
        'female',
        '1995-09-09',
      ),
      addUser(
        'Лебедев Андрей Сергеевич',
        'lebedev@dms.local',
        'user1234',
        'employee',
        'Кадры (HR)',
        true,
        '+7 (917) 345-67-89',
        'male',
        '1987-02-17',
      ),
    ];
    // ожидает подтверждения администратором (как после самостоятельной регистрации)
    addUser('Новиков Илья Григорьевич', 'novikov@dms.local', 'user1234', 'employee', null, false, '', 'male', '');
    addUser(
      'Морозова Анна Сергеевна',
      'morozova@dms.local',
      'user1234',
      'employee',
      'Бухгалтерия',
      false,
      '+7 (903) 222-33-44',
      'female',
      '1993-04-04',
    );

    // ----- Документы -----
    const partners = [
      'ООО «Ромашка»',
      'АО «Техносервис»',
      'ИП Сидоров А. В.',
      'ФНС России',
      'ООО «Вектор»',
      'ПАО «Северсталь»',
      'ООО «ТрансЛогистик»',
      'АО «Альфа-Строй»',
    ];
    const addDoc = (
      direction,
      seq,
      title,
      typeName,
      dayOffset,
      partner,
      importance,
      status,
      department,
      description,
      author,
      folderIdx = null,
    ) => {
      const date = isoDate(dayOffset);
      const number = `${direction === 'in' ? 'ВХ' : 'ИСХ'}-${date.slice(0, 4)}-${String(seq).padStart(4, '0')}`;
      return db
        .prepare(
          `INSERT INTO documents (direction, number, title, doc_type_id, doc_date, correspondent, importance, status,
                                  department_id, description, archive_folder_id, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          direction,
          number,
          title,
          type[typeName],
          date,
          partner,
          importance,
          status,
          dep[department],
          description,
          folderIdx === null ? null : folder[folderIdx],
          author,
        ).lastInsertRowid;
    };

    const inc = [
      [
        'Договор аренды помещения',
        'Договор',
        -60,
        0,
        'normal',
        'done',
        'Администрация',
        'Аренда офиса на 11 месяцев, подписан обеими сторонами.',
        0,
      ],
      ['Счёт на оплату услуг связи', 'Счёт', -45, 1, 'normal', 'done', 'Бухгалтерия', '', 1],
      ['Акт приёма-передачи материалов', 'Акт', -30, 2, 'normal', 'done', 'Логистика', '', 1],
      [
        'Запрос коммерческого предложения',
        'Письмо',
        -20,
        4,
        'urgent',
        'in_progress',
        'Отдел продаж',
        'Просят ответить до конца недели.',
        null,
      ],
      [
        'Заказ на поставку оборудования',
        'Договор',
        -14,
        5,
        'urgent',
        'in_progress',
        'Логистика',
        'Серверное оборудование, 4 позиции.',
        null,
      ],
      [
        'Претензия по качеству поставки',
        'Письмо',
        -9,
        6,
        'critical',
        'pending_approval',
        'Юридический отдел',
        'Требуется подготовить ответ в течение 5 рабочих дней.',
        null,
      ],
      [
        'Требование о предоставлении документов',
        'Письмо',
        -6,
        3,
        'critical',
        'new',
        'Бухгалтерия',
        'Запрос из налоговой по выездной проверке.',
        null,
      ],
      ['Счёт на оплату лицензий ПО', 'Счёт', -4, 1, 'normal', 'new', 'IT-отдел', '', null],
      ['Заявление о предоставлении отпуска', 'Заявление', -3, 7, 'normal', 'pending_approval', 'Кадры (HR)', '', null],
      ['Приглашение на отраслевую выставку', 'Письмо', -2, 0, 'normal', 'new', 'Отдел продаж', '', null],
      ['Отчёт по выполненным работам за месяц', 'Отчёт', -1, 1, 'normal', 'in_progress', 'Администрация', '', null],
    ];
    const out = [
      ['Ответ на запрос о поставке', 'Письмо', -50, 0, 'normal', 'done', 'Отдел продаж', '', 2],
      ['Коммерческое предложение', 'Письмо', -33, 1, 'urgent', 'done', 'Отдел продаж', '', 2],
      ['Договор поставки (проект)', 'Договор', -25, 4, 'urgent', 'done', 'Юридический отдел', 'Подписан, оригинал получен.', 0],
      ['Гарантийное письмо', 'Письмо', -12, 5, 'normal', 'in_progress', 'Отдел продаж', '', null],
      ['Акт сверки взаиморасчётов', 'Акт', -8, 2, 'urgent', 'pending_approval', 'Бухгалтерия', 'Отправлен на подпись контрагенту.', null],
      [
        'Ответ на претензию',
        'Письмо',
        -5,
        6,
        'critical',
        'in_progress',
        'Юридический отдел',
        'Готовится на основании входящей претензии.',
        null,
      ],
      ['Уведомление о смене реквизитов', 'Письмо', -3, 7, 'normal', 'new', 'Бухгалтерия', '', null],
      ['Счёт на предоплату', 'Счёт', -1, 3, 'normal', 'new', 'Бухгалтерия', '', null],
    ];

    const docIds = { in: [], out: [] };
    inc.forEach((r, i) =>
      docIds.in.push(
        addDoc('in', i + 1, r[0], r[1], r[2], partners[r[3]], r[4], r[5], r[6], r[7], [staff[0], moderator, staff[1]][i % 3], r[8]),
      ),
    );
    out.forEach((r, i) =>
      docIds.out.push(
        addDoc('out', i + 1, r[0], r[1], r[2], partners[r[3]], r[4], r[5], r[6], r[7], [moderator, staff[0], staff[2]][i % 3], r[8]),
      ),
    );

    // ----- Задачи -----
    const addTask = (title, description, deadline, importance, status, docId, assignees, createdBy = admin) => {
      const id = db
        .prepare(
          'INSERT INTO tasks (title, description, deadline, importance, status, document_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(title, description, deadline, importance, status, docId, createdBy).lastInsertRowid;
      assignees.forEach((u) => db.prepare('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)').run(id, u));
      return id;
    };

    const t1 = addTask(
      'Подготовить ответ на претензию',
      'Проверить условия договора поставки, собрать акты и подготовить проект ответа. Согласовать с юристом.',
      isoDateTime(2),
      'critical',
      'in_progress',
      docIds.in[5],
      [moderator, staff[0]],
    );
    const t2 = addTask(
      'Подготовить документы для налоговой',
      'Собрать первичные документы за период проверки и передать в бухгалтерию.',
      isoDateTime(4, 12),
      'critical',
      'new',
      docIds.in[6],
      [staff[1]],
    );
    const t3 = addTask(
      'Подготовить коммерческое предложение',
      '',
      isoDateTime(1),
      'urgent',
      'in_progress',
      docIds.in[3],
      [staff[0]],
      moderator,
    );
    const t4 = addTask(
      'Оплатить счёт за лицензии',
      'После согласования бюджета с директором.',
      isoDateTime(7),
      'normal',
      'new',
      docIds.in[7],
      [staff[1], staff[2]],
    );
    const t5 = addTask('Согласовать отпуск сотрудника', '', isoDateTime(-1), 'normal', 'pending_approval', docIds.in[8], [staff[4]]);
    const t6 = addTask('Отправить акт сверки контрагенту', '', isoDateTime(-3), 'urgent', 'done', docIds.out[4], [staff[1]]);
    addTask(
      'Обновить сервер резервного копирования',
      'Плановые работы, не привязаны к документам.',
      isoDateTime(14),
      'normal',
      'new',
      null,
      [staff[2]],
    );
    addTask('Проверить складские остатки', '', isoDateTime(3, 10), 'urgent', 'new', null, [staff[3], staff[0]]);

    const addComment = (taskId, userId, text) =>
      db.prepare('INSERT INTO task_comments (task_id, user_id, text) VALUES (?, ?, ?)').run(taskId, userId, text);
    addComment(t1, admin, 'Срок жёсткий — ответ нужно отправить до конца недели.');
    addComment(t1, moderator, 'Приняла в работу, юридическую часть подготовлю сегодня.');
    addComment(t1, staff[0], 'Акты приёмки приложил к документу, посмотрите.');
    addComment(t6, staff[1], 'Отправлено по электронной почте, жду подписанный экземпляр.');
    addComment(t3, moderator, 'Цены согласованы с отделом продаж.');
    void t2;
    void t4;
    void t5;
  })();
}

// Запуск напрямую: `npm run seed`
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (config.isProd) {
    console.error('Демо-данные в продакшене запрещены.');
    process.exit(1);
  }
  for (const f of [config.dbPath, `${config.dbPath}-wal`, `${config.dbPath}-shm`]) fs.rmSync(f, { force: true });
  const db = openDb();
  seedDemo(db);
  console.log(`Готово. База пересоздана: ${config.dbPath}`);
  console.log('Вход: admin@dms.local / admin123 (админ), moderator@dms.local / moderator123, ivanov@dms.local / user1234');
}
