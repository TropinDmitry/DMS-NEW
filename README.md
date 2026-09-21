# DMS — система электронного документооборота

Учебный проект: реестр входящих/исходящих документов, задачи по документам, архив («дела»), отделы, пользователи и роли. Русский и английский интерфейс.

**Стек:** React 19 · Vite · Tailwind CSS 3 · React Router · TanStack Query · i18next — Node.js 22 · Express 5 · SQLite (better-sqlite3) · JWT · bcrypt · zod.

## Быстрый старт
Нужен Node.js ≥ 22.12.

```bash
npm run install:all   # поставить зависимости (один раз)
npm run dev           # запустить бэкенд (:8080) и фронтенд (:5173)
```
Откройте http://localhost:5173. При первом запуске бэкенд создаёт базу и загружает демо-данные. Демо-вход: `admin@dms.local` / `admin123` (администратор), `moderator@dms.local` / `moderator123`, `ivanov@dms.local` / `user1234` (сотрудник).

Другие команды: `npm run seed` (пересоздать демо-базу) · `npm test` (30 тестов API) · `npm run check:i18n` · `npm run build` · `npm run format`.

## Структура
- `DMS-frontend/` — клиент (React)
- `DMS-backend/` — REST API и база (Express + SQLite)

## Роли
Администратор, модератор, сотрудник. Самостоятельная регистрация создаёт неактивную учётную запись — её подтверждает администратор.

## Продакшен
В `DMS-backend/.env` задайте `NODE_ENV=production`, длинный `JWT_SECRET`, `ADMIN_EMAIL` и `ADMIN_PASSWORD` (образец — `.env.example`). Затем `npm run build` и `npm start`: один сервер отдаёт и сайт, и API. Демо-пароли из README предназначены только для разработки.
