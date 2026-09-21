import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faKey, faRightFromBracket, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '~/auth/AuthContext';
import Avatar from '~/components/ui/Avatar';
import LanguageSwitch from './LanguageSwitch';
import ChangePasswordModal from './ChangePasswordModal';

const itemClass = 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100';

export default function Header({ onMenu }) {
  const { t } = useTranslation();
  const { user, signout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuRef = useRef(null);

  // Закрываем выпадающее меню кликом вне его или клавишей Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !menuRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignout = async () => {
    await signout();
    navigate('/signin');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <button
        type="button"
        onClick={onMenu}
        aria-label={t('nav.openMenu')}
        className="rounded p-2 text-gray-600 hover:bg-gray-100 lg:invisible"
      >
        <FontAwesomeIcon icon={faBars} className="text-lg" />
      </button>

      <div className="flex items-center gap-4">
        <LanguageSwitch />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-gray-100"
          >
            <Avatar name={user.fullName} src={user.avatarUrl} />
            <span className="hidden text-left leading-tight md:block">
              <span className="block max-w-[180px] truncate text-sm font-medium">{user.fullName}</span>
              <span className="block text-xs text-gray-500">{t(`roles.${user.role}`)}</span>
            </span>
          </button>

          {open && (
            <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-md bg-white py-1 shadow-pop">
              <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className={itemClass}>
                <FontAwesomeIcon icon={faUser} className="w-4 text-gray-400" /> {t('header.profile')}
              </Link>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPasswordOpen(true);
                }}
                className={itemClass}
              >
                <FontAwesomeIcon icon={faKey} className="w-4 text-gray-400" /> {t('header.changePassword')}
              </button>
              <button role="menuitem" type="button" onClick={handleSignout} className={`${itemClass} border-t border-gray-100`}>
                <FontAwesomeIcon icon={faRightFromBracket} className="w-4 text-gray-400" /> {t('header.signout')}
              </button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </header>
  );
}
