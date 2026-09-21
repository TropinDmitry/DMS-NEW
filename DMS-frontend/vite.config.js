import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Алиас «~» = папка src: пишем import x from '~/api/client' вместо '../../../api/client'
    alias: { '~': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    // Все запросы на /api Vite-сервер пересылает на бэкенд. Для браузера фронтенд и API — один сайт,
    // поэтому не нужен CORS, а httpOnly-cookie с refresh-токеном работает без лишних настроек.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
});
