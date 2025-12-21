(function () {
  const form = document.querySelector('.form-wrapper');

  if (!form) {
    console.error('Не найдена форма (.form-wrapper)');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  
  const API_ORIGIN = 'http://localhost:8000';
  const API_PREFIX = '/api';

  function joinUrl(origin, ...parts) {
    const cleanOrigin = String(origin).replace(/\/+$/, '');
    const path = parts
      .filter(Boolean)
      .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
      .join('/');
    return `${cleanOrigin}/${path}`;
  }

  const API_BASE = joinUrl(API_ORIGIN, API_PREFIX);

  function setButtonLoading(button, isLoading, loadingText) {
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent || '';
      button.textContent = loadingText || 'Загрузка...';
    } else {
      button.disabled = false;
      if (button.dataset.originalText != null) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeoutMs = 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);

      if (!res.ok) {
        const detail =
          data && typeof data === 'object' && data.detail
            ? String(data.detail)
            : null;

        const message =
          detail ||
          (typeof data === 'string' && data.trim()
            ? data
            : `HTTP ${res.status}`);

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

    const email = (form.elements['email']?.value || '').trim();
    const password = form.elements['password']?.value || '';

    if (!email || !password) {
      console.error('Валидация: email/пароль не заполнены', {
        email: Boolean(email),
        password: Boolean(password),
      });
      return;
    }

    const payload = { email, password };

    const url = joinUrl(API_BASE, 'v1', 'auth', 'login');

    try {
      setButtonLoading(submitBtn, true, 'Входим...');

      const body = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('Успешный вход:', body);

      const token = body && body.jwt_auth_token ? String(body.jwt_auth_token) : null;

      if (!token) {
        console.warn('Логин успешен, но jwt_auth_token не пришёл:', body);
      } else {
        localStorage.setItem('jwt_auth_token', token);
        console.log('jwt_auth_token сохранён в localStorage');
      }

      window.location.href = '../login/index.html';
    } catch (err) {
      console.error('Ошибка при /v1/auth/login:', {
        message: err.message,
        status: err.status,
        data: err.data,
        code: err.code,
      });
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
})();
