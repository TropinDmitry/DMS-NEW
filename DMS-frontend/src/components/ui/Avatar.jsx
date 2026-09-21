import { initials } from '~/lib/format';

const colors = ['bg-teal-600', 'bg-indigo-600', 'bg-rose-600', 'bg-amber-600', 'bg-sky-600', 'bg-emerald-600', 'bg-fuchsia-600'];
// Цвет заглушки зависит от имени: у одного и того же человека он всегда одинаковый
const colorFor = (name = '') => colors[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % colors.length];

const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base', xl: 'h-32 w-32 text-4xl' };

/** Аватар: картинка пользователя или кружок с инициалами, если картинки нет */
export default function Avatar({ name, src, size = 'md', className = '' }) {
  const box = `${sizes[size]} shrink-0 rounded-full ${className}`;
  if (src) return <img src={src} alt={name ?? ''} title={name} className={`${box} object-cover`} />;
  return (
    <span title={name} className={`${box} ${colorFor(name)} inline-flex select-none items-center justify-center font-medium text-white`}>
      {initials(name) || '?'}
    </span>
  );
}
