import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { faKey, faTrashCan, faUpload } from '@fortawesome/free-solid-svg-icons';
import { profileApi } from '~/api';
import { useAuth } from '~/auth/AuthContext';
import useForm from '~/hooks/useForm';
import useApiMutation from '~/hooks/useApiMutation';
import { GENDERS, toOptions } from '~/lib/constants';
import { required } from '~/lib/validators';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Field, Input, Select } from '~/components/ui/Field';
import Avatar from '~/components/ui/Avatar';
import ChangePasswordModal from '~/components/layout/ChangePasswordModal';

function AvatarCard() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const inputRef = useRef(null);

  const upload = useApiMutation(profileApi.uploadAvatar, { success: 'profile.avatarChanged', onSuccess: setUser });
  const remove = useApiMutation(profileApi.removeAvatar, { success: 'profile.avatarRemoved', onSuccess: setUser });

  return (
    <Card className="flex flex-col items-center p-6 text-center">
      <Avatar name={user.fullName} src={user.avatarUrl} size="xl" />
      <h2 className="mt-4 text-lg font-semibold">{user.fullName}</h2>
      <p className="text-sm text-gray-500">{t(`roles.${user.role}`)}</p>
      <p className="text-sm text-gray-500">{user.departmentName ?? ''}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files[0]) upload.mutate(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" size="sm" icon={faUpload} loading={upload.isPending} onClick={() => inputRef.current.click()}>
          {t('profile.uploadAvatar')}
        </Button>
        {user.avatarUrl && (
          <Button variant="ghost" size="sm" icon={faTrashCan} className="text-red-600" onClick={() => remove.mutate()}>
            {t('profile.removeAvatar')}
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-400">{t('profile.avatarHint')}</p>
    </Card>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const form = useForm(
    { fullName: user.fullName, phone: user.phone, gender: user.gender, birthDate: user.birthDate },
    { fullName: required },
  );
  const save = useApiMutation(profileApi.update, { success: 'common.saved', onSuccess: setUser });

  return (
    <>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <AvatarCard />

        <div className="space-y-4">
          <Card className="p-5">
            <form
              onSubmit={form.submit((v) => save.mutateAsync({ ...v, fullName: v.fullName.trim(), phone: v.phone.trim() }).catch(() => {}))}
              noValidate
              className="space-y-5"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={t('auth.fullName')} error={form.errors.fullName} required className="md:col-span-2">
                  <Input
                    value={form.values.fullName}
                    onChange={form.change('fullName')}
                    onBlur={form.blur('fullName')}
                    invalid={!!form.errors.fullName}
                    maxLength={200}
                  />
                </Field>
                <Field label={t('auth.email')} hint={t('profile.readonlyHint')}>
                  <Input value={user.email} disabled />
                </Field>
                <Field label={t('users.department')} hint={t('profile.readonlyHint')}>
                  <Input value={user.departmentName ?? '—'} disabled />
                </Field>
                <Field label={t('users.phone')}>
                  <Input type="tel" value={form.values.phone} onChange={form.change('phone')} maxLength={40} />
                </Field>
                <Field label={t('users.birthDate')}>
                  <Input type="date" value={form.values.birthDate} onChange={form.change('birthDate')} />
                </Field>
                <Field label={t('users.gender')}>
                  <Select
                    value={form.values.gender}
                    onChange={form.change('gender')}
                    options={toOptions(t, 'gender', GENDERS)}
                    placeholder={t('common.notSelected')}
                  />
                </Field>
              </div>
              <div className="border-t border-gray-100 pt-5">
                <Button type="submit" loading={form.submitting}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="font-semibold">{t('header.changePassword')}</h2>
              <p className="text-sm text-gray-500">{t('profile.passwordHint')}</p>
            </div>
            <Button variant="secondary" icon={faKey} onClick={() => setPasswordOpen(true)}>
              {t('header.changePassword')}
            </Button>
          </Card>
        </div>
      </div>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}
