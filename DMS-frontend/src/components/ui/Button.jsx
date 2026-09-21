import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
};
const sizes = { sm: 'px-2.5 py-1 text-sm', md: 'px-4 py-2 text-sm', icon: 'h-8 w-8 text-sm' };

/** Строка классов кнопки — пригодится, когда нужна ссылка, выглядящая как кнопка */
export const buttonClass = (variant = 'primary', size = 'md', extra = '') => `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

/**
 * Кнопка. По умолчанию type="button": внутри <form> обычная <button> без type ОТПРАВЛЯЕТ форму,
 * а это частая причина «почему страница перезагружается». Для отправки явно пишем type="submit".
 */
export function Button({ variant = 'primary', size = 'md', icon, loading = false, className = '', children, ...rest }) {
  return (
    <button type="button" className={buttonClass(variant, size, className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : icon && <FontAwesomeIcon icon={icon} />}
      {children}
    </button>
  );
}

/** Ссылка (переход по маршруту приложения) в виде кнопки */
export function ButtonLink({ to, variant = 'primary', size = 'md', icon, className = '', children, ...rest }) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)} {...rest}>
      {icon && <FontAwesomeIcon icon={icon} />}
      {children}
    </Link>
  );
}
