(function () {
  const confirmForm = document.getElementById('confirmForm');
  const confirmCodeInput = document.getElementById('confirm-code');
  const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');

  if (!confirmForm) {
    console.error('Не найден confirmForm (#confirmForm)');
    return;
  }

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

  const registeredUserId = localStorage.getItem('registeredUserId');

  if (!registeredUserId) {
    console.warn(
      'registeredUserId не найден. Пользователь, вероятно, не прошёл шаг регистрации.'
    );
  } else {
    console.log(
      'Ожидаем подтверждение регистрации для user_id:',
      registeredUserId
    );
  }

  confirmForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!registeredUserId) {
      console.error(
        'Попытка подтверждения без registeredUserId. Вернитесь на регистрацию.'
      );
      return;
    }

    const confirmCode = (confirmCodeInput?.value || '').trim();

    if (!confirmCode) {
      console.error('Код подтверждения не введён');
      return;
    }

    const payload = {
      user_id: registeredUserId,
      confirm_code: confirmCode,
    };

    const url = joinUrl(API_BASE, 'v1', 'auth', 'confirm');
    console.log('POST', url, payload);

    try {
      setButtonLoading(confirmSubmitBtn, true, 'Проверяем...');

      const body = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('Успешное подтверждение регистрации:', body);

      const token =
        body && body.jwt_auth_token ? String(body.jwt_auth_token) : null;

      if (token) {
        localStorage.setItem('jwt_auth_token', token);
        console.log('JWT сохранён в localStorage');
      }

      localStorage.removeItem('registeredUserId');

      window.location.href = '../login.html';
    } catch (err) {
      console.error('Ошибка при /v1/auth/confirm:', {
        message: err.message,
        status: err.status,
        data: err.data,
        code: err.code,
      });
    } finally {
      setButtonLoading(confirmSubmitBtn, false);
    }
  });
})();
