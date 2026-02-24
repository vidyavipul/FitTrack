/* ─── FitTrack API Helper ────────────────────────────────────── */

const API_BASE = '';

/**
 * Get the stored JWT token from localStorage.
 */
function getToken() {
    return localStorage.getItem('fittrack_token');
}

/**
 * Store the JWT token in localStorage.
 */
function setToken(token) {
    localStorage.setItem('fittrack_token', token);
}

/**
 * Store the current username in localStorage.
 */
function setUsername(username) {
    localStorage.setItem('fittrack_username', username);
}

/**
 * Get the stored username.
 */
function getUsername() {
    return localStorage.getItem('fittrack_username') || 'User';
}

/**
 * Remove token and redirect to login.
 */
function logout() {
    localStorage.removeItem('fittrack_token');
    localStorage.removeItem('fittrack_username');
    window.location.href = '/static/pages/index.html';
}

/**
 * Check if user is authenticated. Redirect to login if not.
 */
function requireAuth() {
    if (!getToken()) {
        window.location.href = '/static/pages/index.html';
        return false;
    }
    return true;
}

/**
 * Centralized fetch wrapper with JWT injection and error handling.
 */
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    // Handle 401 — token expired or invalid
    if (response.status === 401) {
        logout();
        return null;
    }

    // Handle 204 No Content (delete success)
    if (response.status === 204) {
        return null;
    }

    // Handle errors
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Something went wrong' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Shorthand API methods.
 */
const api = {
    get: (url) => apiFetch(url),
    post: (url, data) => apiFetch(url, { method: 'POST', body: JSON.stringify(data) }),
    put: (url, data) => apiFetch(url, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (url) => apiFetch(url, { method: 'DELETE' }),
};

/**
 * Show an alert message in a .alert element.
 */
function showAlert(elementId, message, type = 'error') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `alert alert-${type} show`;
    if (type === 'success') {
        setTimeout(() => el.classList.remove('show'), 3000);
    }
}

/**
 * Format a date string to a readable format.
 */
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Get today's date as YYYY-MM-DD.
 */
function todayStr() {
    return new Date().toISOString().split('T')[0];
}
