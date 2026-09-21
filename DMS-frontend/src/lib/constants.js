// Справочники значений. В базе и API хранятся КОДЫ (in_progress), а подписи берутся из переводов: t('status.in_progress').
export const STATUSES = ['new', 'in_progress', 'pending_approval', 'done'];
export const IMPORTANCE = ['normal', 'urgent', 'critical'];
export const ROLES = ['admin', 'moderator', 'employee'];
export const GENDERS = ['male', 'female'];
export const PAGE_SIZES = [5, 10, 25, 50];

/** Превращает список кодов в опции для <Select>: ['new'] → [{ value: 'new', label: 'Новый' }] */
export const toOptions = (t, prefix, codes) => codes.map((code) => ({ value: code, label: t(`${prefix}.${code}`) }));
