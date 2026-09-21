import { useCallback, useState } from 'react';

/**
 * Минимальный помощник для форм: хранит значения полей и ошибки в одном месте.
 *
 *   const form = useForm({ title: '', email: '' }, { title: required, email });
 *   <Input value={form.values.title} onChange={form.change('title')} onBlur={form.blur('title')} />
 *   <form onSubmit={form.submit(async (values) => { ...сохранить... })}>
 *
 * rules — объект «поле → функция-валидатор» (см. lib/validators.js); ошибки — ключи переводов.
 */
export default function useForm(initialValues, rules = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateField = useCallback(
    (name, allValues) => {
      const rule = rules[name];
      return rule ? rule(allValues[name], allValues) : '';
    },
    [rules],
  );

  const setField = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: '' } : e)); // как только человек начал исправлять — убираем красную ошибку
  }, []);

  return {
    values,
    errors,
    submitting,
    setField,
    setValues,
    /** onChange для input: change('title') */
    change: (name) => (e) => setField(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value),
    /** проверка поля, когда оно потеряло фокус */
    blur: (name) => () => setErrors((e) => ({ ...e, [name]: validateField(name, values) })),
    /** Оборачивает обработчик отправки: сначала проверка всех полей, потом — сохранение */
    submit: (onValid) => async (event) => {
      event.preventDefault();
      const next = {};
      for (const name of Object.keys(rules)) next[name] = validateField(name, values);
      setErrors(next);
      if (Object.values(next).some(Boolean)) return;
      setSubmitting(true);
      try {
        await onValid(values);
      } finally {
        setSubmitting(false);
      }
    },
  };
}
