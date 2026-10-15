/* ─── Dashboard Logic ────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    showUser();

    // Greeting based on time of day
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    document.getElementById('greeting').textContent = `${greeting}, ${getUsername()}.`;

    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    loadDashboard();
});

async function loadDashboard() {
    const today = todayStr();

    try {
        const [workouts, exercises, calSummary, progressSummary] = await Promise.all([
            api.get('/workouts/'),
            api.get('/exercises/'),
            api.get(`/calories/daily-summary?log_date=${today}`),
            api.get('/progress/summary'),
        ]);

        const all = workouts || [];

        // Workout stats (today only; the list below shows the most recent)
        const todaysWorkouts = all.filter(w => w.date === today);
        document.getElementById('statWorkouts').textContent = todaysWorkouts.length;

        // Exercise count
        document.getElementById('statExercises').textContent = exercises ? exercises.length : 0;

        // Calorie stats
        if (calSummary) {
            document.getElementById('statCalories').textContent = calSummary.total_calories.toLocaleString('en-GB');
        }
        renderPlate(document.getElementById('macroPlate'), calSummary);

        // Progress stats
        if (progressSummary && progressSummary.latest_weight) {
            document.getElementById('statWeight').textContent = progressSummary.latest_weight.toFixed(1);
        }

        renderWeek(all);
        if (all.length > 0) {
            renderRecentWorkouts(all.slice(0, 4), exercises || []);
        }
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

/**
 * Seven squares, Monday to Sunday, filled on days with a logged session.
 */
function renderWeek(workouts) {
    const trainedDays = new Set(workouts.map(w => w.date));
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const today = todayStr();

    let count = 0;
    const cells = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const key = dateKey(d);
        const trained = trainedDays.has(key);
        if (trained) count++;

        const classes = ['day'];
        if (trained) classes.push('trained');
        if (key === today) classes.push('today');
        if (key > today) classes.push('future');

        const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
        cells.push(`
            <div class="${classes.join(' ')}" title="${weekday} ${d.getDate()}${trained ? ': trained' : ''}">
                ${weekday.charAt(0)}
                <div class="cell">${d.getDate()}</div>
            </div>`);
    }

    document.getElementById('weekStrip').innerHTML = cells.join('');
    document.getElementById('weekCount').textContent =
        count === 1 ? '1 session' : `${count} sessions`;
}

function renderRecentWorkouts(workouts, exercises) {
    const container = document.getElementById('recentWorkouts');
    if (!workouts.length) return;

    const names = new Map(exercises.map(e => [e.id, e.name]));

    container.innerHTML = `<ul class="entries">${workouts.map(w => {
        const d = parseDate(w.date);
        const moves = w.sets.map(s => names.get(s.exercise_id) || `Exercise ${s.exercise_id}`);
        const meta = [
            w.duration_min ? `${w.duration_min} min` : null,
            `${w.sets.length} ${w.sets.length === 1 ? 'exercise' : 'exercises'}`,
        ].filter(Boolean).join(' · ');

        return `
            <li class="entry compact">
                <div class="entry-date">
                    <span class="d">${d.getDate()}</span>
                    <span class="m">${d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</span>
                </div>
                <div>
                    <div class="entry-title">${escapeHtml(w.notes || 'Session')}</div>
                    <div class="entry-meta">${meta}</div>
                    ${moves.length ? `<div class="entry-meta">${escapeHtml(moves.join(', '))}</div>` : ''}
                </div>
            </li>`;
    }).join('')}</ul>`;
}
