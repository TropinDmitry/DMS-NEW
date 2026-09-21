import axios from 'axios';

/*
 * Единая точка общения с сервером. Все запросы идут через `http`, поэтому:
 *  - токен подставляется автоматически (не нужно помнить об этом в каждом запросе);
 *  - когда токен протух, он обновляется незаметно для пользователя, а запрос повторяется;
 *  - любые ошибки приводятся к одному виду — ApiError.
 */

// Access-токен живёт ТОЛЬКО в памяти вкладки (не в localStorage): страница, зараженная чужим скриптом (XSS),
// не сможет его украсть из хранилища. После перезагрузки страницы новый токен берётся по refresh-cookie.
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};

let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Error', details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Приводит ошибку axios к ApiError: { status, code, message, details } */
function toApiError(error) {
  if (error instanceof ApiError) return error;
  if (!error.response) return new ApiError({ code: 'NETWORK', message: 'Server is unreachable' });
  const { status, data } = error.response;
  return new ApiError({ status, code: data?.code ?? 'UNKNOWN', message: data?.message ?? error.message, details: data?.details });
}

export const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Если одновременно уйдут 5 запросов с протухшим токеном, обновлять сессию нужно один раз, а не пять.
// Поэтому храним «обновление в полёте» и все ждут один и тот же promise.
let refreshing = null;
export function refreshSession() {
  refreshing ??= axios
    .post('/api/auth/refresh')
    .then((res) => {
      setAccessToken(res.data.accessToken);
      return res.data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const expired = response?.status === 401 && ['TOKEN_INVALID', 'UNAUTHORIZED'].includes(response.data?.code);
    if (expired && config && !config._retried) {
      config._retried = true; // повторяем не больше одного раза, иначе можно зациклиться
      try {
        const session = await refreshSession();
        config.headers.Authorization = `Bearer ${session.accessToken}`;
        return http(config);
      } catch {
        onSessionExpired();
      }
    }
    throw toApiError(error);
  },
);

/** Убирает из объекта пустые значения ('' / null / undefined), чтобы не слать в адрес ?search=&status= */
export const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));

/** Скачивание файла с авторизацией: обычная ссылка <a href> не умеет слать заголовок Authorization */
export async function downloadFile(url, fileName) {
  const res = await http.get(url, { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
