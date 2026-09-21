// Проверка переводов: node scripts/check-i18n.mjs
//  1) каждый ключ, использованный в коде, есть и в ru.json, и в en.json;
//  2) наборы ключей ru и en совпадают (с поправкой на формы множественного числа);
//  3) «лишние» ключи, которые нигде не используются, — предупреждение.
import fs from 'node:fs';
import path from 'node:path';
import { collect } from './collect-i18n-keys.mjs';

const dir = path.resolve(import.meta.dirname, '..', 'src', 'i18n');
const load = (lng) => JSON.parse(fs.readFileSync(path.join(dir, `${lng}.json`), 'utf8'));

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (key) => key.replace(PLURAL, '');

const ru = new Set(flatten(load('ru')).map(base));
const en = new Set(flatten(load('en')).map(base));
const { keys, dynamic } = collect();

// Ключи, которые собираются динамически: t(`${prefix}.${code}`), t(`errors.${code}`) и т. п.
const dynamicPrefixes = ['status.', 'importance.', 'roles.', 'gender.', 'errors.', 'departments.', 'documentTypes.'];

let problems = 0;
for (const [name, set] of [
  ['ru', ru],
  ['en', en],
]) {
  for (const key of keys) {
    if (!set.has(key)) {
      console.error(`✗ [${name}] нет перевода для «${key}»`);
      problems++;
    }
  }
}
for (const key of ru) if (!en.has(key)) (console.error(`✗ ключ «${key}» есть в ru, но нет в en`), problems++);
for (const key of en) if (!ru.has(key)) (console.error(`✗ ключ «${key}» есть в en, но нет в ru`), problems++);

const used = new Set(keys);
const unused = [...ru].filter((k) => !used.has(k) && !dynamicPrefixes.some((p) => k.startsWith(p)));
if (unused.length) console.warn(`⚠ не используются в коде (${unused.length}): ${unused.join(', ')}`);
if (dynamic.length) console.log(`ℹ динамические ключи (проверьте вручную): ${dynamic.join(', ')}`);

console.log(problems ? `\nПроблем: ${problems}` : '\nПереводы в порядке: ru и en согласованы, все ключи из кода найдены.');
process.exit(problems ? 1 : 0);
