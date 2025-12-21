(function () {
  const registerForm = document.getElementById('registerForm');
  const registerSubmitBtn = document.getElementById('registerSubmitBtn');

  if (!registerForm) {
    console.error('Не найден registerForm (#registerForm)');
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

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (registerForm.elements['email']?.value || '').trim();
    const name = (registerForm.elements['name']?.value || '').trim();
    const secondName = (registerForm.elements['second_name']?.value || '').trim();
    const groupNumber = (registerForm.elements['group_number']?.value || '').trim();
    const password = registerForm.elements['password']?.value || '';

    if (!email || !name || !secondName || !groupNumber || !password) {
      console.error('Валидация: не заполнены все поля', {
        email: Boolean(email),
        name: Boolean(name),
        second_name: Boolean(secondName),
        group_number: Boolean(groupNumber),
        password: Boolean(password),
      });
      return;
    }

    const payload = {
      name,
      second_name: secondName,
      group_number: groupNumber,
      email,
      password,
    };

    const url = joinUrl(API_BASE, 'v1', 'auth', 'register');

    try {
      setButtonLoading(registerSubmitBtn, true, 'Отправляем...');

      const body = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('Успешная регистрация:', body);

      const userUid = body && body.user_uid ? String(body.user_uid) : null;

      if (!userUid) {
        console.warn('Регистрация успешна, но user_uid не пришёл:', body);
      } else {
        localStorage.setItem('registeredUserId', userUid);
        console.log('registeredUserId сохранён в localStorage:', userUid);
      }

      window.location.href = './secondStep/index.html';
    } catch (err) {
      console.error('Ошибка при /v1/auth/register:', {
        message: err.message,
        status: err.status,
        data: err.data,
        code: err.code,
      });
    } finally {
      setButtonLoading(registerSubmitBtn, false);
    }
  });
})();
