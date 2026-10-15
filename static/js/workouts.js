/* ─── Workouts Page Logic ────────────────────────────────────── */

let exercises = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    showUser();

    document.getElementById('workoutDate').value = todayStr();
    document.getElementById('workoutForm').addEventListener('submit', handleCreateWorkout);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeWorkoutModal();
    });

    loadData();
});

async function loadData() {
    try {
        const [exerciseList, workouts] = await Promise.all([
            api.get('/exercises/'),
            api.get('/workouts/'),
        ]);
        exercises = exerciseList || [];
        renderWorkouts(workouts || []);
    } catch (err) {
        console.error('Load error:', err);
    }
}

function renderWorkouts(workouts) {
    const container = document.getElementById('workoutList');
    const n = workouts.length;
    document.getElementById('sessionCount').textContent =
        n === 1 ? '1 session logged' : `${n} sessions logged`;

    if (!n) {
        container.innerHTML = `
            <li class="empty">No sessions yet.<small>Use "Log a workout" to write down your first one.</small></li>`;
        return;
    }

    const names = new Map(exercises.map(e => [e.id, e.name]));

    container.innerHTML = workouts.map(w => {
        const d = parseDate(w.date);
        const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
        const meta = [weekday, w.duration_min ? `${w.duration_min} min` : null].filter(Boolean).join(' · ');

        const lines = w.sets.map(s => `
            <li class="line">
                <span>${escapeHtml(names.get(s.exercise_id) || `Exercise ${s.exercise_id}`)}</span>
                <span class="leader"></span>
                <span class="qty"><b>${s.set_count} × ${s.reps}</b>${s.weight_kg ? ` @ ${s.weight_kg} kg` : ''}</span>
            </li>`).join('');

        return `
            <li class="entry">
                <div class="entry-date">
                    <span class="d">${d.getDate()}</span>
                    <span class="m">${d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase()}</span>
                </div>
                <div>
                    <div class="entry-title">${escapeHtml(w.notes || 'Session')}</div>
                    <div class="entry-meta">${meta}</div>
                    ${lines ? `<ul class="lines">${lines}</ul>` : '<div class="entry-meta">No exercises recorded.</div>'}
                </div>
                <button class="remove-btn" onclick="deleteWorkout(${w.id})">Remove</button>
            </li>`;
    }).join('');
}

function openWorkoutModal() {
    capAtToday(document.getElementById('workoutDate'));
    document.getElementById('workoutModal').classList.add('show');
    // Add one default set row
    if (document.getElementById('setsContainer').children.length === 0) {
        addSetRow();
    }
    document.getElementById('workoutDuration').focus();
}

function closeWorkoutModal() {
    document.getElementById('workoutModal').classList.remove('show');
    document.getElementById('formAlert').classList.remove('show');
}

function addSetRow() {
    const container = document.getElementById('setsContainer');
    const n = container.children.length;

    // Group the exercise list by muscle group for an easier pick
    const groups = {};
    for (const e of exercises) (groups[e.muscle_group] ||= []).push(e);
    const options = Object.keys(groups).sort().map(g => `
        <optgroup label="${escapeHtml(g)}">
            ${groups[g].map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}
        </optgroup>`).join('');

    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
        <div class="form-group">
            <label for="ex-${n}">Exercise</label>
            <select id="ex-${n}" class="set-exercise" required>
                <option value="">Choose…</option>
                ${options}
            </select>
        </div>
        <div class="form-group">
            <label for="sets-${n}">Sets</label>
            <input id="sets-${n}" type="number" class="set-count" value="3" min="1" max="100" required>
        </div>
        <div class="form-group">
            <label for="reps-${n}">Reps</label>
            <input id="reps-${n}" type="number" class="set-reps" value="10" min="1" max="1000" required>
        </div>
        <div class="form-group">
            <label for="kg-${n}">kg</label>
            <input id="kg-${n}" type="number" class="set-weight" step="0.5" min="0" placeholder="–">
        </div>
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()" aria-label="Remove exercise">×</button>
    `;
    container.appendChild(row);
}

async function handleCreateWorkout(e) {
    e.preventDefault();

    const setRows = document.querySelectorAll('#setsContainer > .set-row');
    const workoutSets = [];

    for (const row of setRows) {
        const exerciseId = row.querySelector('.set-exercise').value;
        if (!exerciseId) continue;

        workoutSets.push({
            exercise_id: parseInt(exerciseId),
            set_count: parseInt(row.querySelector('.set-count').value) || 1,
            reps: parseInt(row.querySelector('.set-reps').value) || 1,
            weight_kg: parseFloat(row.querySelector('.set-weight').value) || null,
        });
    }

    const data = {
        date: document.getElementById('workoutDate').value,
        duration_min: parseInt(document.getElementById('workoutDuration').value) || null,
        notes: document.getElementById('workoutNotes').value || null,
        workout_sets: workoutSets,
    };

    try {
        await api.post('/workouts/', data);
        closeWorkoutModal();
        document.getElementById('setsContainer').innerHTML = '';
        document.getElementById('workoutForm').reset();
        document.getElementById('workoutDate').value = todayStr();
        showAlert('alertArea', 'Session saved.', 'success');
        loadData();
    } catch (err) {
        showAlert('formAlert', err.message);
    }
}

async function deleteWorkout(id) {
    if (!confirm('Remove this session from your log?')) return;
    try {
        await api.delete(`/workouts/${id}`);
        showAlert('alertArea', 'Session removed.', 'success');
        loadData();
    } catch (err) {
        showAlert('alertArea', err.message);
    }
}
