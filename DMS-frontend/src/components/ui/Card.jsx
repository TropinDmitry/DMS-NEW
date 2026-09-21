/** Белая «карточка»-контейнер: основа всех блоков на страницах */
export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-lg bg-white shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Шапка страницы: заголовок слева, кнопки действий справа */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
