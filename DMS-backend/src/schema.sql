-- Схема базы данных DMS. Выполняется при каждом запуске: IF NOT EXISTS делает её безопасной.
-- Значения-перечисления хранятся КОДАМИ (in_progress), а подписи («В работе») — забота интерфейса и переводов.

CREATE TABLE IF NOT EXISTS departments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT    NOT NULL DEFAULT '',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT    NOT NULL DEFAULT '',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- «Дела» — папки архива (в 1С:Документооборот это номенклатура дел)
CREATE TABLE IF NOT EXISTS archive_folders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  phone         TEXT    NOT NULL DEFAULT '',
  gender        TEXT    NOT NULL DEFAULT '' CHECK (gender IN ('', 'male', 'female')),
  birth_date    TEXT    NOT NULL DEFAULT '',
  department_id INTEGER REFERENCES departments(id) ON DELETE RESTRICT,
  role          TEXT    NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'moderator', 'employee')),
  active        INTEGER NOT NULL DEFAULT 0,
  avatar_file   TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE, -- в базе только хэш: утечка БД не даёт готовых токенов
  expires_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE,
  expires_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  direction         TEXT    NOT NULL CHECK (direction IN ('in', 'out')),
  number            TEXT    NOT NULL,
  title             TEXT    NOT NULL,
  doc_type_id       INTEGER REFERENCES document_types(id) ON DELETE RESTRICT,
  doc_date          TEXT    NOT NULL DEFAULT '',
  correspondent     TEXT    NOT NULL DEFAULT '',
  importance        TEXT    NOT NULL DEFAULT 'normal' CHECK (importance IN ('normal', 'urgent', 'critical')),
  status            TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'pending_approval', 'done')),
  department_id     INTEGER REFERENCES departments(id) ON DELETE RESTRICT,
  description       TEXT    NOT NULL DEFAULT '',
  archive_folder_id INTEGER REFERENCES archive_folders(id) ON DELETE RESTRICT,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (direction, number)
);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(archive_folder_id);

CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  deadline    TEXT    NOT NULL DEFAULT '',
  importance  TEXT    NOT NULL DEFAULT 'normal' CHECK (importance IN ('normal', 'urgent', 'critical')),
  status      TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'pending_approval', 'done')),
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Связь «многие ко многим»: у задачи много исполнителей, у человека много задач
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  text       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Вложения принадлежат либо документу, либо задаче (owner_type + owner_id)
CREATE TABLE IF NOT EXISTS attachments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type    TEXT    NOT NULL CHECK (owner_type IN ('document', 'task')),
  owner_id      INTEGER NOT NULL,
  original_name TEXT    NOT NULL,
  stored_name   TEXT    NOT NULL,
  size          INTEGER NOT NULL DEFAULT 0,
  mime          TEXT    NOT NULL DEFAULT '',
  uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(owner_type, owner_id);
