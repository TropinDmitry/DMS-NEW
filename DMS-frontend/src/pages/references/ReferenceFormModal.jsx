import { useTranslation } from 'react-i18next';
import useForm from '~/hooks/useForm';
import { required } from '~/lib/validators';
import Modal from '~/components/ui/Modal';
import { Field, Input, Textarea } from '~/components/ui/Field';
import Switch from '~/components/ui/Switch';
import { Button } from '~/components/ui/Button';

/**
 * Окно создания/редактирования записи справочника (отдел, вид документа, дело архива).
 * item — редактируемая запись (или null для новой); hasActive — показывать ли переключатель «активна».
 */
export default function ReferenceFormModal({ open, onClose, item, hasActive, title, onSubmit }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <Form item={item} hasActive={hasActive} onSubmit={onSubmit} onCancel={onClose} />
    </Modal>
  );
}

function Form({ item, hasActive, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const form = useForm({ name: item?.name ?? '', description: item?.description ?? '', active: item?.active ?? true }, { name: required });

  return (
    <form
      onSubmit={form.submit((v) =>
        onSubmit({ name: v.name.trim(), description: v.description.trim(), ...(hasActive ? { active: v.active } : {}) }),
      )}
      className="space-y-4"
      noValidate
    >
      <Field label={t('references.name')} error={form.errors.name} required>
        <Input
          autoFocus
          value={form.values.name}
          onChange={form.change('name')}
          onBlur={form.blur('name')}
          invalid={!!form.errors.name}
          maxLength={200}
        />
      </Field>
      <Field label={t('references.description')}>
        <Textarea value={form.values.description} onChange={form.change('description')} rows={3} maxLength={1000} />
      </Field>
      {hasActive && (
        <div className="flex items-center gap-3">
          <Switch checked={form.values.active} onChange={(v) => form.setField('active', v)} label={t('references.active')} />
          <span className="text-sm text-gray-700">{t('references.active')}</span>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={form.submitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
