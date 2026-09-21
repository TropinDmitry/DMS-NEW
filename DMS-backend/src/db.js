import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { config } from './config.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Открывает базу (создаёт файл и таблицы, если их ещё нет). ':memory:' — база в памяти, для тестов. */
export function openDb(dbPath = config.dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL'); // быстрее и надёжнее при параллельных запросах
  db.pragma('foreign_keys = ON'); // в SQLite внешние ключи по умолчанию ВЫКЛЮЧЕНЫ — включаем

  // Встроенный LOWER() в SQLite понимает только латиницу: lower('ДОГОВОР') вернёт 'ДОГОВОР'.
  // Поэтому регистрируем свою функцию на JavaScript, которая работает с любым алфавитом.
  db.function('ulower', { deterministic: true }, (s) => (s == null ? null : String(s).toLowerCase()));

  db.exec(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'));
  return db;
}
