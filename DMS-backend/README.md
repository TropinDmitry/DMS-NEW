# DMS — бэкенд

REST API на Express 5 + SQLite (`better-sqlite3`). Схема базы — в `src/schema.sql`, адреса API — в `src/routes/`, примеры использования — в `test/api.test.js`.

```bash
npm install
npm run dev     # http://localhost:8080/api/health, автоперезапуск при изменениях
npm run seed    # пересоздать базу с демо-данными (стирает data/dms.db!)
npm test        # сквозные тесты API
```

Настройки — в `.env` (образец: `.env.example`). При первом запуске с пустой базой в режиме разработки загружаются демо-данные.

`better-sqlite3` закреплён на 12.x: версия 13 падает на Node 22.12.
