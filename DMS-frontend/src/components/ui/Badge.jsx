import { useTranslation } from 'react-i18next';

const tones = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  green: 'bg-emerald-100 text-emerald-800',
};

export function Badge({ tone = 'gray', children, className = '' }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

const importanceTone = { normal: 'gray', urgent: 'amber', critical: 'red' };
const statusTone = { new: 'gray', in_progress: 'blue', pending_approval: 'amber', done: 'green' };

export function ImportanceBadge({ value }) {
  const { t } = useTranslation();
  return <Badge tone={importanceTone[value] ?? 'gray'}>{t(`importance.${value}`)}</Badge>;
}

export function StatusBadge({ value }) {
  const { t } = useTranslation();
  return <Badge tone={statusTone[value] ?? 'gray'}>{t(`status.${value}`)}</Badge>;
}
