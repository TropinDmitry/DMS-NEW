import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { faFloppyDisk, faXmark } from '@fortawesome/free-solid-svg-icons';
import { usersApi } from '~/api';
import useForm from '~/hooks/useForm';
import useApiMutation from '~/hooks/useApiMutation';
import { toSelect, useDepartmentOptions } from '~/hooks/useOptions';
import { GENDERS, ROLES, toOptions } from '~/lib/constants';
import { email, password, required } from '~/lib/validators';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button, ButtonLink } from '~/components/ui/Button';
import { Field, Input, PasswordInput, Select } from '~/components/ui/Field';
import Switch from '~/components/ui/Switch';
import { PageSpinner } from '~/components/ui/Spinner';
import NotFoundPage from '~/pages/NotFoundPage';

export default function UserFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const user = useQuery({ queryKey: ['users', 'detail', id], queryFn: () => usersApi.get(id), enabled: editing });
  if (editing && user.isLoading) return <PageSpinner />;
  if (editing && user.isError) return <NotFoundPage />;
  return <UserForm user={user.data} />;
}

function UserForm({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const editing = !!user;
  const departments = useDepartmentOptions();

  const form = useForm(
    {
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      password: '',
      phone: user?.phone ?? '',
      gender: user?.gender ?? '',
      birthDate: user?.birthDate ?? '',
      departmentId: user?.departmentId ?? '',
      role: user?.role ?? 'employee',
      active: user?.active ?? true,
    },
    {
      fullName: required,
      email,
      // при создании пароль обязателен, при правке — только если хотят его сменить
      password: (v) => (editing && !v ? '' : password(v)),
    },
  );

  const save = useApiMutation(
    (v) => {
      const body = {
        fullName: v.fullName.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        gender: v.gender,
        birthDate: v.birthDate,
        departmentId: v.departmentId ? Number(v.departmentId) : null,
        ...(v.password ? { password: v.password } : {}),
      };
      return editing ? usersApi.update(user.id, body) : usersApi.create({ ...body, role: v.role, active: v.active });
    },
    { invalidate: [['users'], ['departments']], success: 'common.saved', onSuccess: () => navigate('/users') },
  );

  return (
    <>
      <PageHeader title={editing ? t('users.edit') : t('users.create')} />
      <Card className="p-5">
        <form onSubmit={form.submit((v) => save.mutateAsync(v).catch(() => {}))} noValidate className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t('auth.fullName')} error={form.errors.fullName} required className="md:col-span-2">
              <Input
                autoFocus
                value={form.values.fullName}
                onChange={form.change('fullName')}
                onBlur={form.blur('fullName')}
                invalid={!!form.errors.fullName}
                maxLength={200}
              />
            </Field>
            <Field label={t('auth.email')} error={form.errors.email} required>
              <Input
                type="email"
                value={form.values.email}
                onChange={form.change('email')}
                onBlur={form.blur('email')}
                invalid={!!form.errors.email}
              />
            </Field>
            <Field
              label={editing ? t('users.newPasswordOptional') : t('auth.password')}
              error={form.errors.password}
              required={!editing}
              hint={editing ? t('users.passwordKeep') : undefined}
            >
              <PasswordInput
                value={form.values.password}
                onChange={form.change('password')}
                invalid={!!form.errors.password}
                autoComplete="new-password"
              />
            </Field>
            <Field label={t('users.phone')}>
              <Input type="tel" value={form.values.phone} onChange={form.change('phone')} placeholder="+7 (900) 000-00-00" maxLength={40} />
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
            <Field label={t('users.department')}>
              <Select
                value={form.values.departmentId}
                onChange={form.change('departmentId')}
                options={toSelect(departments.data)}
                placeholder={t('common.notSelected')}
              />
            </Field>
            {!editing && (
              <>
                <Field label={t('users.role')}>
                  <Select value={form.values.role} onChange={form.change('role')} options={toOptions(t, 'roles', ROLES)} />
                </Field>
                <div className="flex items-center gap-3 self-end pb-2">
                  <Switch checked={form.values.active} onChange={(v) => form.setField('active', v)} label={t('users.access')} />
                  <span className="text-sm text-gray-700">{t('users.activeOnly')}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-5">
            <Button type="submit" icon={faFloppyDisk} loading={form.submitting}>
              {t('common.save')}
            </Button>
            <ButtonLink to="/users" variant="secondary" icon={faXmark}>
              {t('common.cancel')}
            </ButtonLink>
          </div>
        </form>
      </Card>
    </>
  );
}
