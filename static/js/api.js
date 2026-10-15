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

    // Handle 401 — token expired or invalid. Without a token (e.g. a failed
    // login) there is no session to end, so fall through and show the error.
    if (response.status === 401 && token) {
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
        throw new Error(formatErrorDetail(error.detail) || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Turn a FastAPI error detail (a string, or a list of validation errors)
 * into a readable message.
 */
function formatErrorDetail(detail) {
    if (!Array.isArray(detail)) return detail;
    return detail.map(d => {
        const field = (d.loc || []).filter(p => p !== 'body').join('.');
        const msg = (d.msg || '').replace(/^Value error, /, '');
        return field ? `${field}: ${msg}` : msg;
    }).join('; ');
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
 * Escape a value for safe insertion into HTML.
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Format a date string to a readable format.
 */
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Get today's date as YYYY-MM-DD in the user's local timezone.
 */
function todayStr() {
    return dateKey(new Date());
}

/**
 * Fill in the masthead user name and monogram.
 */
function showUser() {
    const username = getUsername();
    document.getElementById('userName').textContent = username;
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
}

/**
 * Render a protein / carbs / fat breakdown into a container. Shares are by
 * energy (4 kcal/g protein and carbs, 9 kcal/g fat), not by weight.
 */
function renderPlate(container, summary) {
    const p = summary ? summary.total_protein : 0;
    const c = summary ? summary.total_carbs : 0;
    const f = summary ? summary.total_fat : 0;
    const kcal = { p: p * 4, c: c * 4, f: f * 9 };
    const total = kcal.p + kcal.c + kcal.f;
    const share = (k) => (total ? Math.round((kcal[k] / total) * 100) : 0);

    if (!total) {
        container.innerHTML = `
            <div class="macro-bar" aria-hidden="true"></div>
            <p class="empty">An empty plate.<small>Log a meal to see where your energy comes from.</small></p>`;
        return;
    }

    const rows = [
        ['p', 'Protein', p],
        ['c', 'Carbohydrate', c],
        ['f', 'Fat', f],
    ];
    container.innerHTML = `
        <div class="macro-bar" role="img"
             aria-label="Protein ${share('p')}%, carbohydrate ${share('c')}%, fat ${share('f')}% of energy">
            ${rows.map(([k]) => `<span class="${k}" style="width:${(kcal[k] / total) * 100}%"></span>`).join('')}
        </div>
        <ul class="macro-key">
            ${rows.map(([k, label, grams]) => `
                <li>
                    <span class="swatch ${k}"></span>${label}
                    <span class="grams">${Math.round(grams)} g</span>
                    <span class="share">${share(k)}%</span>
                </li>`).join('')}
        </ul>`;
}

/**
 * Stop a date input from accepting days after today (local time). Called
 * again whenever a form opens, so a tab left open overnight still allows
 * the new day.
 */
function capAtToday(input) {
    input.max = todayStr();
}

/**
 * Parse a YYYY-MM-DD string as a local date.
 */
function parseDate(dateStr) {
    return new Date(dateStr + 'T00:00:00');
}

/**
 * Format a Date as YYYY-MM-DD in local time.
 */
function dateKey(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
