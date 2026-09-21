// Мапперы превращают строки БД (snake_case, 0/1) в JSON для клиента (camelCase, true/false).
// Так внутренняя схема базы не «протекает» наружу: можно переименовать колонку, не ломая фронтенд.
// Главное правило: password_hash НИКОГДА не попадает в ответ — поэтому мапперы перечисляют поля явно.

export const avatarUrl = (file) => (file ? `/api/avatars/${file}` : null);

/** Запрос, который отдаёт всё нужное для userJson (с названием отдела) */
export const USER_SELECT = `
  SELECT u.*, d.name AS department_name
  FROM users u LEFT JOIN departments d ON d.id = u.department_id`;

export const userJson = (u) => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  phone: u.phone,
  gender: u.gender,
  birthDate: u.birth_date,
  departmentId: u.department_id,
  departmentName: u.department_name ?? null,
  role: u.role,
  active: !!u.active,
  avatarUrl: avatarUrl(u.avatar_file),
  createdAt: u.created_at,
});

export const userBrief = (row) => ({
  id: row.id,
  fullName: row.full_name,
  avatarUrl: avatarUrl(row.avatar_file),
});

export const attachmentJson = (a) => ({
  id: a.id,
  name: a.original_name,
  size: a.size,
  mime: a.mime,
  createdAt: a.created_at,
});

export const DOCUMENT_SELECT = `
  SELECT d.*,
         t.name  AS type_name,
         dep.name AS department_name,
         f.name  AS folder_name,
         u.full_name AS created_by_name
  FROM documents d
  LEFT JOIN document_types t   ON t.id = d.doc_type_id
  LEFT JOIN departments dep    ON dep.id = d.department_id
  LEFT JOIN archive_folders f  ON f.id = d.archive_folder_id
  LEFT JOIN users u            ON u.id = d.created_by`;

export const documentJson = (d) => ({
  id: d.id,
  direction: d.direction,
  number: d.number,
  title: d.title,
  docTypeId: d.doc_type_id,
  docTypeName: d.type_name ?? null,
  docDate: d.doc_date,
  correspondent: d.correspondent,
  importance: d.importance,
  status: d.status,
  departmentId: d.department_id,
  departmentName: d.department_name ?? null,
  description: d.description,
  archiveFolderId: d.archive_folder_id,
  archiveFolderName: d.folder_name ?? null,
  createdBy: d.created_by,
  createdByName: d.created_by_name ?? null,
  createdAt: d.created_at,
  updatedAt: d.updated_at,
});

export const taskJson = (t) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  deadline: t.deadline,
  importance: t.importance,
  status: t.status,
  documentId: t.document_id,
  documentTitle: t.document_title ?? null,
  documentNumber: t.document_number ?? null,
  createdBy: t.created_by,
  createdByName: t.created_by_name ?? null,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});
