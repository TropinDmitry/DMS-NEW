import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleDown,
  faArchive,
  faArrowTurnDown,
  faArrowTurnUp,
  faFileLines,
  faFileWord,
  faGauge,
  faLayerGroup,
  faListCheck,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { isAdmin, isStaff, useAuth } from '~/auth/AuthContext';

const linkBase = 'flex items-center gap-3 px-6 py-3 text-[15px] text-white/90 transition-colors hover:bg-brand-light';
const linkClass = ({ isActive }) => `${linkBase} ${isActive ? 'bg-brand-light font-medium text-white' : ''}`;

function Item({ to, icon, label, sub = false }) {
  return (
    <li>
      <NavLink to={to} className={({ isActive }) => `${linkClass({ isActive })} ${sub ? '!pl-14 !py-2.5 text-sm' : ''}`}>
        <FontAwesomeIcon icon={icon} className="w-5 text-center" />
        <span>{label}</span>
      </NavLink>
    </li>
  );
}

/** Боковое меню. Пункты «Отделы», «Виды документов», «Пользователи» видны только тем, кому разрешено */
export default function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [docsOpen, setDocsOpen] = useState(pathname.startsWith('/documents'));

  return (
    <nav className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <img src="/favicon.svg" alt="" className="h-8 w-8" />
        <span className="text-2xl font-bold tracking-wide text-white">DMS</span>
      </div>

      <ul className="flex-1 py-2">
        <Item to="/dashboard" icon={faGauge} label={t('nav.dashboard')} />

        <li>
          <button
            type="button"
            onClick={() => setDocsOpen((o) => !o)}
            aria-expanded={docsOpen}
            className={`${linkBase} w-full ${pathname.startsWith('/documents') ? 'font-medium' : ''}`}
          >
            <FontAwesomeIcon icon={faFileLines} className="w-5 text-center" />
            <span className="flex-1 text-left">{t('nav.documents')}</span>
            <FontAwesomeIcon icon={faAngleDown} className={`text-white/50 transition-transform ${docsOpen ? 'rotate-180' : ''}`} />
          </button>
          {docsOpen && (
            <ul className="bg-black/10">
              <Item sub to="/documents/in" icon={faArrowTurnDown} label={t('nav.documentsIn')} />
              <Item sub to="/documents/out" icon={faArrowTurnUp} label={t('nav.documentsOut')} />
            </ul>
          )}
        </li>

        <Item to="/tasks" icon={faListCheck} label={t('nav.tasks')} />
        <Item to="/archive" icon={faArchive} label={t('nav.archive')} />

        {isStaff(user) && (
          <>
            <li className="px-6 pb-1 pt-4 text-xs uppercase tracking-wider text-white/40">{t('nav.directories')}</li>
            <Item to="/departments" icon={faLayerGroup} label={t('nav.departments')} />
            <Item to="/document-types" icon={faFileWord} label={t('nav.documentTypes')} />
          </>
        )}
        {isAdmin(user) && (
          <>
            <li className="px-6 pb-1 pt-4 text-xs uppercase tracking-wider text-white/40">{t('nav.admin')}</li>
            <Item to="/users" icon={faUsers} label={t('nav.users')} />
          </>
        )}
      </ul>
    </nav>
  );
}
