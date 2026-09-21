import { http, cleanParams } from './client';

/*
 * Функции для каждого адреса API. Компоненты не знают про URL и axios — они вызывают, например,
 * documentsApi.list({ page: 1 }). Если адрес на сервере изменится, правим только этот файл.
 * Функции возвращают уже «распакованные» данные (res.data).
 */
const data = (promise) => promise.then((res) => res.data);

export const authApi = {
  signin: (body) => data(http.post('/auth/signin', body)),
  signup: (body) => data(http.post('/auth/signup', body)),
  signout: () => http.post('/auth/signout'),
  forgotPassword: (body) => data(http.post('/auth/forgot-password', body)),
  resetPassword: (body) => data(http.post('/auth/reset-password', body)),
};

export const profileApi = {
  update: (body) => data(http.put('/profile', body)),
  changePassword: (body) => http.patch('/profile/password', body),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return data(http.post('/profile/avatar', form));
  },
  removeAvatar: () => data(http.delete('/profile/avatar')),
};

export const usersApi = {
  list: (params) => data(http.get('/users', { params: cleanParams(params) })),
  lookup: () => data(http.get('/users/lookup')),
  get: (id) => data(http.get(`/users/${id}`)),
  create: (body) => data(http.post('/users', body)),
  update: (id, body) => data(http.put(`/users/${id}`, body)),
  setRole: (id, role) => data(http.patch(`/users/${id}/role`, { role })),
  setActive: (id, active) => data(http.patch(`/users/${id}/active`, { active })),
  remove: (id) => http.delete(`/users/${id}`),
  removeMany: (ids) => http.post('/users/bulk-delete', { ids }),
};

/** Справочники (отделы, виды документов, дела архива) устроены одинаково — один «конструктор» на все */
const referenceApi = (path) => ({
  list: (params) => data(http.get(`/${path}`, { params: cleanParams(params) })),
  options: () => data(http.get(`/${path}/options`)),
  create: (body) => data(http.post(`/${path}`, body)),
  update: (id, body) => data(http.put(`/${path}/${id}`, body)),
  setActive: (id, active) => data(http.patch(`/${path}/${id}/active`, { active })),
  remove: (id) => http.delete(`/${path}/${id}`),
  removeMany: (ids) => http.post(`/${path}/bulk-delete`, { ids }),
});
export const departmentsApi = referenceApi('departments');
export const documentTypesApi = referenceApi('document-types');
export const foldersApi = referenceApi('archive-folders');

const uploadForm = (files) => {
  const form = new FormData();
  [...files].forEach((f) => form.append('files', f));
  return form;
};

export const documentsApi = {
  list: (params) => data(http.get('/documents', { params: cleanParams(params) })),
  get: (id) => data(http.get(`/documents/${id}`)),
  create: (body) => data(http.post('/documents', body)),
  update: (id, body) => data(http.put(`/documents/${id}`, body)),
  setStatus: (id, status) => data(http.patch(`/documents/${id}/status`, { status })),
  setDepartment: (id, departmentId) => data(http.patch(`/documents/${id}/department`, { departmentId })),
  archive: (id, folderId) => data(http.patch(`/documents/${id}/archive`, { folderId })),
  remove: (id) => http.delete(`/documents/${id}`),
  removeMany: (ids) => http.post('/documents/bulk-delete', { ids }),
  upload: (id, files) => data(http.post(`/documents/${id}/files`, uploadForm(files))),
  removeFile: (id, fileId) => http.delete(`/documents/${id}/files/${fileId}`),
};

export const tasksApi = {
  list: (params) => data(http.get('/tasks', { params: cleanParams(params) })),
  get: (id) => data(http.get(`/tasks/${id}`)),
  create: (body) => data(http.post('/tasks', body)),
  update: (id, body) => data(http.put(`/tasks/${id}`, body)),
  setStatus: (id, status) => data(http.patch(`/tasks/${id}/status`, { status })),
  remove: (id) => http.delete(`/tasks/${id}`),
  addComment: (id, text) => data(http.post(`/tasks/${id}/comments`, { text })),
  removeComment: (id, commentId) => http.delete(`/tasks/${id}/comments/${commentId}`),
  upload: (id, files) => data(http.post(`/tasks/${id}/files`, uploadForm(files))),
  removeFile: (id, fileId) => http.delete(`/tasks/${id}/files/${fileId}`),
};

export const dashboardApi = {
  get: () => data(http.get('/dashboard')),
};
