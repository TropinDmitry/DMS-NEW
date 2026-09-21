import { config } from './config.js';
import { openDb } from './db.js';
import { createApp } from './app.js';
import { ensureAdmin, seedDemo } from './seed.js';

const db = openDb();

// Первый запуск (пользователей нет): в разработке заполняем демо-данными, в продакшене создаём только администратора
if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) {
  if (config.isProd) {
    ensureAdmin(db);
    console.log(`Создан администратор ${config.adminEmail}`);
  } else {
    seedDemo(db);
    console.log('База была пустой — загружены демо-данные (admin@dms.local / admin123)');
  }
}

const app = createApp(db);
const server = app.listen(config.port, () => {
  console.log(`DMS API запущен: http://localhost:${config.port}/api/health`);
});

// Аккуратное завершение по Ctrl+C: закрываем порт и файл базы
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
