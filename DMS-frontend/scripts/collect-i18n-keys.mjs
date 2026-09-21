// Собирает все ключи переводов из исходников: вызовы t('...') и любые строки вида 'common.saved'.
// Используется скриптом check-i18n.mjs, а также помогает найти «забытые» переводы.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..', 'src');
const NAMESPACES =
  'app|archive|auth|common|dashboard|documents|errors|gender|header|importance|nav|notFound|profile|references|roles|status|tasks|users|validation|departments|documentTypes';
const literal = new RegExp('([\'"`])((?:' + NAMESPACES + ')\\.[\\w.]+)\\1', 'g');

export function collect() {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.jsx?$/.test(e.name)) files.push(p);
    }
  })(root);

  const keys = new Set();
  const dynamic = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(literal)) keys.add(m[2]);
    for (const m of src.matchAll(/\bt\(\s*`([^`]+)`/g)) if (m[1].includes('${')) dynamic.add(m[1]);
  }
  return { keys: [...keys].sort(), dynamic: [...dynamic].sort() };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { keys, dynamic } = collect();
  console.log(keys.join('\n'));
  console.log('\nDYNAMIC:\n' + dynamic.join('\n'));
}
