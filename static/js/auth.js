/* ─── Auth Page Logic ────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    if (getToken()) {
        window.location.href = '/static/pages/dashboard.html';
        return;
    }

    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Signing in';

    try {
        const data = {
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value,
        };

        const result = await api.post('/login', data);
        setToken(result.access_token);
        setUsername(data.username);
        window.location.href = '/static/pages/dashboard.html';
    } catch (err) {
        showAlert('authAlert', err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = label;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Creating account';

    try {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            throw new Error('The two passwords don\'t match.');
        }

        if (password.length < 8) {
            throw new Error('Use at least 8 characters for the password.');
        }

        // bcrypt only uses the first 72 bytes; non-ASCII characters take several
        if (new TextEncoder().encode(password).length > 72) {
            throw new Error('That password is too long. Accented letters and emoji count extra.');
        }

        const data = {
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: password,
        };

        await api.post('/register', data);
    } catch (err) {
        showAlert('authAlert', err.message);
        btn.disabled = false;
        btn.textContent = label;
        return;
    }

    // Sign the new user straight in rather than sending them back to the login page.
    // The account exists at this point, so if this fails fall back to the sign-in page.
    btn.innerHTML = '<span class="loader"></span> Signing in';
    try {
        const result = await api.post('/login', {
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value,
        });
        setToken(result.access_token);
        setUsername(document.getElementById('username').value.trim());
        window.location.href = '/static/pages/dashboard.html';
    } catch {
        window.location.href = '/static/pages/index.html';
    }
}
