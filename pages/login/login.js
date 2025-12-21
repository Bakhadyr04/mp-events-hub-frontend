(function () {
  const form = document.querySelector('.form-wrapper');
  if (!form) {
    console.error('Не найден form с селектором .form-wrapper');

    return;
  }

  const API_ORIGIN = 'http://localhost:8000';
  const API_PREFIX = '/api';

  function joinUrl(origin, ...parts) {
    const cleanOrigin = origin.replace(/\/+$/, '');
    const path = parts
      .filter(Boolean)
      .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
      .join('/');
    return `${cleanOrigin}/${path}`;
  }

  const API_BASE = joinUrl(API_ORIGIN, API_PREFIX);

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeoutMs = 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

      if (!res.ok) {
        const detail =
          (data && typeof data === 'object' && data.detail) ? data.detail : null;

        const message = detail
          ? String(detail)
          : (typeof data === 'string' && data.trim() ? data : `HTTP ${res.status}`);

        const err = new Error(message);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (e) {
      if (e.name === 'AbortError') {
        const err = new Error('Таймаут запроса (15 секунд)');
        err.code = 'TIMEOUT';
        throw err;
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailEl = form.elements['email'];
    const passwordEl = form.elements['password'];

    const payload = {
      email: (emailEl && emailEl.value ? emailEl.value : '').trim(),
      password: passwordEl && passwordEl.value ? passwordEl.value : '',
    };

    if (!payload.email || !payload.password) {
      console.error('Заполни email и пароль');
      return;
    }

    const url = joinUrl(API_BASE, 'v1', 'auth', 'login');

    try {
      const result = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('Успешный вход:', result);

      const token = result && result.jwt_auth_token ? result.jwt_auth_token : null;

      if (token) {
        localStorage.setItem('jwt_auth_token', token);
      }

      window.location.href = '/events.html';
    } catch (err) {
      console.error('Ошибка авторизации:', {
        message: err.message,
        status: err.status,
        data: err.data,
        code: err.code,
      });
    }
  });
})();
