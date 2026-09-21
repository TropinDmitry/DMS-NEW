const locale = (lang) => (lang === 'en' ? 'en-GB' : 'ru-RU');

/** '2026-09-21' → '21.09.2026'. Разбираем строку вручную: new Date('2026-09-21') считает её UTC и может сдвинуть день. */
export function formatDate(value, lang = 'ru') {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Intl.DateTimeFormat(locale(lang)).format(new Date(y, m - 1, d));
}

/** '2026-09-21T14:30' → '21.09.2026, 14:30' */
export function formatDateTime(value, lang = 'ru') {
  if (!value) return '—';
  if (value.length <= 10) return formatDate(value, lang);
  // Время из БД без пояса (SQLite datetime('now') — UTC, формат '2026-09-21 14:30:00'); срок задачи — локальное
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

/** Срок прошёл, а задача не завершена? deadline — '2026-09-21T14:30' в локальном времени */
export function isOverdue(task) {
  if (!task.deadline || task.status === 'done') return false;
  const deadline = new Date(task.deadline.length === 10 ? `${task.deadline}T23:59` : task.deadline);
  return deadline.getTime() < Date.now();
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Инициалы для аватара-заглушки: «Иванов Иван Иванович» → «ИИ» */
export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
