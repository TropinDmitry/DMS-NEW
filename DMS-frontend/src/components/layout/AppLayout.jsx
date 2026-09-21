import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * Каркас страницы для вошедшего пользователя: меню слева, шапка сверху, содержимое посередине.
 * <Outlet /> — сюда React Router вставляет текущую страницу.
 * Меню на широком экране (lg ≥ 1024px) видно всегда, на узком — выезжает по кнопке «гамбургер».
 */
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // После перехода на другую страницу закрываем выезжающее меню
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="min-h-screen">
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand transition-transform duration-200 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full' // тень только у открытого меню, иначе она «просвечивает» на краю экрана
        }`}
      >
        <Sidebar />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
        <footer className="border-t border-gray-200 bg-white px-6 py-3 text-center text-xs text-gray-500">
          DMS · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
