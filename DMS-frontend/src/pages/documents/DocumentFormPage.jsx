import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { faFloppyDisk, faXmark } from '@fortawesome/free-solid-svg-icons';
import { documentsApi } from '~/api';
import useForm from '~/hooks/useForm';
import useApiMutation from '~/hooks/useApiMutation';
import { toSelect, useDepartmentOptions, useDocumentTypeOptions } from '~/hooks/useOptions';
import { IMPORTANCE, STATUSES, toOptions } from '~/lib/constants';
import { required } from '~/lib/validators';
import { Card, PageHeader } from '~/components/ui/Card';
import { Button, ButtonLink } from '~/components/ui/Button';
import { Field, Input, Select, Textarea } from '~/components/ui/Field';
import FileInput from '~/components/ui/FileInput';
import { PageSpinner } from '~/components/ui/Spinner';
import NotFoundPage from '~/pages/NotFoundPage';

const today = () => new Date().toLocaleDateString('sv-SE'); // 'sv-SE' даёт формат ГГГГ-ММ-ДД, нужный для <input type="date">

/**
 * Создание и редактирование документа. Режим определяет адрес:
 *   /documents/in/new     — новый входящий (direction приходит пропсом)
 *   /documents/:id/edit   — правка существующего (сначала загружаем его, потом рисуем форму)
 */
export default function DocumentFormPage({ direction }) {
  const { id } = useParams();
  const editing = !!id;
  const doc = useQuery({ queryKey: ['documents', 'detail', id], queryFn: () => documentsApi.get(id), enabled: editing });

  if (editing && doc.isLoading) return <PageSpinner />;
  if (editing && (doc.isError || !doc.data.canManage)) return <NotFoundPage />;
  // Форма создаётся только когда данные уже есть: useForm берёт начальные значения один раз при первом рендере
  return <DocumentForm direction={editing ? doc.data.direction : direction} doc={doc.data} />;
}

function DocumentForm({ direction, doc }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const editing = !!doc;
  const types = useDocumentTypeOptions();
  const departments = useDepartmentOptions();
  const [files, setFiles] = useState([]); // выбранные для загрузки файлы (объекты File)

  const form = useForm(
    {
      number: doc?.number ?? '',
      title: doc?.title ?? '',
      docTypeId: doc?.docTypeId ?? '',
      docDate: doc?.docDate ?? today(),
      correspondent: doc?.correspondent ?? '',
      importance: doc?.importance ?? 'normal',
      status: doc?.status ?? 'new',
      departmentId: doc?.departmentId ?? '',
      description: doc?.description ?? '',
    },
    { title: required },
  );

  const save = useApiMutation(
    async (values) => {
      const body = {
        ...values,
        title: values.title.trim(),
        docTypeId: values.docTypeId ? Number(values.docTypeId) : null,
        departmentId: values.departmentId ? Number(values.departmentId) : null,
      };
      const saved = editing ? await documentsApi.update(doc.id, body) : await documentsApi.create({ ...body, direction });
      if (files.length) await documentsApi.upload(saved.id, files); // файлы отправляются отдельным запросом (multipart)
      return saved;
    },
    {
      invalidate: [['documents'], ['dashboard']],
      success: 'common.saved',
      onSuccess: (saved) => navigate(`/documents/${saved.id}`),
    },
  );

  const set = (name) => (e) => form.setField(name, e.target.value);
  const back = editing ? `/documents/${doc.id}` : `/documents/${direction}`;

  return (
    <>
      <PageHeader title={editing ? t('documents.edit') : t(direction === 'in' ? 'documents.createIn' : 'documents.createOut')} />
      <Card className="p-5">
        <form onSubmit={form.submit((v) => save.mutateAsync(v).catch(() => {}))} noValidate className="space-y-5">
          <Field label={t('documents.title')} error={form.errors.title} required>
            <Input
              value={form.values.title}
              onChange={form.change('title')}
              onBlur={form.blur('title')}
              invalid={!!form.errors.title}
              maxLength={300}
              autoFocus
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t('documents.number')} hint={t('documents.numberHint')}>
              <Input value={form.values.number} onChange={form.change('number')} placeholder={t('documents.numberAuto')} maxLength={60} />
            </Field>
            <Field label={t('documents.date')}>
              <Input type="date" value={form.values.docDate} onChange={form.change('docDate')} />
            </Field>
            <Field label={t('documents.docType')}>
              <Select
                value={form.values.docTypeId}
                onChange={set('docTypeId')}
                options={toSelect(types.data)}
                placeholder={t('common.notSelected')}
              />
            </Field>
            <Field label={t(direction === 'in' ? 'documents.sender' : 'documents.recipient')}>
              <Input value={form.values.correspondent} onChange={form.change('correspondent')} maxLength={300} />
            </Field>
            <Field label={t('documents.importance')}>
              <Select value={form.values.importance} onChange={set('importance')} options={toOptions(t, 'importance', IMPORTANCE)} />
            </Field>
            <Field label={t('documents.status')}>
              <Select value={form.values.status} onChange={set('status')} options={toOptions(t, 'status', STATUSES)} />
            </Field>
            <Field label={t('documents.department')} hint={t('documents.departmentHint')} className="md:col-span-2">
              <Select
                value={form.values.departmentId}
                onChange={set('departmentId')}
                options={toSelect(departments.data)}
                placeholder={t('common.notSelected')}
              />
            </Field>
          </div>

          <Field label={t('documents.description')}>
            <Textarea value={form.values.description} onChange={form.change('description')} rows={5} maxLength={5000} />
          </Field>

          {editing ? (
            <p className="text-sm text-gray-500">{t('documents.filesOnDetail')}</p>
          ) : (
            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">{t('documents.attachments')}</div>
              <FileInput files={files} onChange={setFiles} />
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-5">
            <Button type="submit" icon={faFloppyDisk} loading={form.submitting}>
              {t('common.save')}
            </Button>
            <ButtonLink to={back} variant="secondary" icon={faXmark}>
              {t('common.cancel')}
            </ButtonLink>
          </div>
        </form>
      </Card>
    </>
  );
}
