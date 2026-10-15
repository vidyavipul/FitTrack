/* ─── Dashboard Logic ────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    // Set user info
    const username = getUsername();
    document.getElementById('userName').textContent = username;
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

    // Set greeting based on time
    const hour = new Date().getHours();
    let greeting = 'Good evening 🌙';
    if (hour < 12) greeting = 'Good morning ☀️';
    else if (hour < 17) greeting = 'Good afternoon 🌤️';
    document.getElementById('greeting').textContent = greeting;

    // Set today's date
    const today = new Date();
    document.getElementById('todayDate').textContent = today.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    loadDashboard();
});

async function loadDashboard() {
    const today = todayStr();

    try {
        // Fetch all data in parallel
        const [workouts, exercises, calSummary, progressSummary] = await Promise.all([
            api.get('/workouts/'),
            api.get('/exercises/'),
            api.get(`/calories/daily-summary?log_date=${today}`),
            api.get('/progress/summary'),
        ]);

        // Workout stats (today only; the list below shows the most recent)
        const todaysWorkouts = (workouts || []).filter(w => w.date === today);
        document.getElementById('statWorkouts').textContent = todaysWorkouts.length;

        // Exercise count
        document.getElementById('statExercises').textContent = exercises ? exercises.length : 0;

        // Calorie stats
        if (calSummary) {
            document.getElementById('statCalories').textContent = calSummary.total_calories;
            document.getElementById('macroProtein').textContent = `${Math.round(calSummary.total_protein)}g`;
            document.getElementById('macroCarbs').textContent = `${Math.round(calSummary.total_carbs)}g`;
            document.getElementById('macroFat').textContent = `${Math.round(calSummary.total_fat)}g`;
            document.getElementById('macroMeals').textContent = calSummary.meal_count;
        }

        // Progress stats
        if (progressSummary && progressSummary.latest_weight) {
            document.getElementById('statWeight').textContent = progressSummary.latest_weight;
        }

        // Recent workouts
        if (workouts && workouts.length > 0) {
            renderRecentWorkouts(workouts.slice(0, 5));
        }
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

function renderRecentWorkouts(workouts) {
    const container = document.getElementById('recentWorkouts');
    if (!workouts.length) return;

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Exercises</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                ${workouts.map(w => `
                    <tr>
                        <td>${formatDate(w.date)}</td>
                        <td>${w.duration_min ? w.duration_min + ' min' : '—'}</td>
                        <td><span class="badge badge-info">${w.sets.length} sets</span></td>
                        <td class="text-muted">${escapeHtml(w.notes || '—')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}
