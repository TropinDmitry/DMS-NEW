import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config.js';
import { badRequest } from './errors.js';

const filesDir = path.join(config.uploadsDir, 'files');
const avatarsDir = path.join(config.uploadsDir, 'avatars');
fs.mkdirSync(filesDir, { recursive: true });
fs.mkdirSync(avatarsDir, { recursive: true });

export const paths = { filesDir, avatarsDir };

/** Имя на диске — случайное: так нельзя перезаписать чужой файл и нельзя подобрать адрес. Настоящее имя храним в БД. */
const randomName = (originalName) => crypto.randomBytes(16).toString('hex') + path.extname(originalName).toLowerCase().slice(0, 10);

const makeStorage = (dir) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => cb(null, randomName(file.originalname)),
  });

/** Вложения к документам и задачам: до 10 файлов по 20 МБ. */
export const attachmentsUpload = multer({
  storage: makeStorage(filesDir),
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024, files: 10 },
}).array('files', 10);

/** Аватар: одна картинка до 2 МБ. */
export const avatarUpload = multer({
  storage: makeStorage(avatarsDir),
  limits: { fileSize: config.maxAvatarSizeMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype);
    cb(ok ? null : badRequest('BAD_IMAGE', 'Only PNG, JPEG, GIF or WebP images are allowed'), ok);
  },
}).single('avatar');

/**
 * Браузер присылает имя файла в UTF-8, а multer по старой привычке читает его как latin1 —
 * в итоге «Договор.pdf» превращается в «Ð”Ð¾Ð³Ð¾Ð²Ð¾Ñ€.pdf». Переводим обратно.
 */
export function fixFileName(name) {
  const fixed = Buffer.from(name, 'latin1').toString('utf8');
  return fixed.includes('�') ? name : fixed; // если перекодировка сломала строку — оставляем как есть
}

export function removeStoredFile(dir, storedName) {
  if (!storedName) return;
  fs.rm(path.join(dir, storedName), { force: true }, () => {});
}
