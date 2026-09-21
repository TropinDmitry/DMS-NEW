import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { profileApi } from '~/api';
import useForm from '~/hooks/useForm';
import useNotify from '~/hooks/useNotify';
import { password, sameAs } from '~/lib/validators';
import Modal from '~/components/ui/Modal';
import { Field, PasswordInput } from '~/components/ui/Field';
import { Button } from '~/components/ui/Button';

/** Окно «Сменить пароль» (открывается из меню в шапке и со страницы профиля) */
export default function ChangePasswordModal({ open, onClose }) {
  const { t } = useTranslation();
  const notify = useNotify();

  // useMutation — для запросов, которые что-то ИЗМЕНЯЮТ на сервере (в отличие от useQuery, который читает)
  const change = useMutation({
    mutationFn: ({ oldPassword, newPassword }) => profileApi.changePassword({ oldPassword, newPassword }),
    onSuccess: () => {
      notify.ok('profile.passwordChanged');
      onClose();
    },
    onError: notify.fail,
  });

  return (
    <Modal open={open} onClose={onClose} title={t('header.changePassword')}>
      <ChangePasswordForm onSubmit={change.mutateAsync} onCancel={onClose} />
    </Modal>
  );
}

// Форма вынесена отдельно, чтобы её состояние создавалось заново при каждом открытии окна
function ChangePasswordForm({ onSubmit, onCancel }) {
  const { t } = useTranslation();
  const form = useForm(
    { oldPassword: '', newPassword: '', confirm: '' },
    { oldPassword: (v) => (v ? '' : 'validation.required'), newPassword: password, confirm: (v, all) => sameAs(all.newPassword)(v) },
  );

  return (
    <form
      onSubmit={form.submit((v) => onSubmit({ oldPassword: v.oldPassword, newPassword: v.newPassword }).catch(() => {}))}
      className="space-y-4"
    >
      <Field label={t('profile.oldPassword')} error={form.errors.oldPassword}>
        <PasswordInput
          value={form.values.oldPassword}
          onChange={form.change('oldPassword')}
          invalid={!!form.errors.oldPassword}
          autoComplete="current-password"
        />
      </Field>
      <Field label={t('profile.newPassword')} error={form.errors.newPassword}>
        <PasswordInput
          value={form.values.newPassword}
          onChange={form.change('newPassword')}
          invalid={!!form.errors.newPassword}
          autoComplete="new-password"
        />
      </Field>
      <Field label={t('auth.confirmPassword')} error={form.errors.confirm}>
        <PasswordInput
          value={form.values.confirm}
          onChange={form.change('confirm')}
          invalid={!!form.errors.confirm}
          autoComplete="new-password"
        />
      </Field>
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
