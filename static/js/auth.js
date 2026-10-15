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
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Signing in...';

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
        btn.innerHTML = 'Sign In';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Creating account...';

    try {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const data = {
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: password,
        };

        await api.post('/register', data);
        showAlert('authAlert', 'Account created! Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = '/static/pages/index.html';
        }, 1500);
    } catch (err) {
        showAlert('authAlert', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
    }
}
