const form = document.getElementById('loginForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        email: form.elements['email'].value.trim(),
        password: form.elements['password'].value
    };

    try {
        // TODO: использовать нужный API когда захостят бэк
        // переменная находится в .env файле
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 200) {
            const result = await res.json();
    
            // TODO: Забрать токен, сохранить и сделать redirect
            console.log('Успешный вход:', result);
        } else {
            const errorData = await res.json().catch(() => null);

            console.error('Ошибка авторизации:', res.status, errorData);
        }
    } catch (error) {
        // TODO: Тут можно выводить ошибку в UI
        console.error('Проблема с запросом:', error);
    }
});
