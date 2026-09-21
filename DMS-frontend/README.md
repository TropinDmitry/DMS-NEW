# DMS — фронтенд

React 19 + Vite + Tailwind CSS 3 + TanStack Query + i18next.

```bash
npm install
npm run dev      # http://localhost:5173 (запросы /api проксируются на бэкенд :8080)
npm run build    # сборка в dist/
```

Для работы нужен запущенный бэкенд (`../DMS-backend`). Проще запускать всё из корня репозитория: `npm run dev`.
Проверка переводов (из корня): `npm run check:i18n`.
