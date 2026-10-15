/* ─── Workouts Page Logic ────────────────────────────────────── */

let exercises = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    const username = getUsername();
    document.getElementById('userName').textContent = username;
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

    document.getElementById('workoutDate').value = todayStr();
    document.getElementById('workoutForm').addEventListener('submit', handleCreateWorkout);

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
    if (!workouts.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏋️</div>
                <p>No workouts logged yet. Click "New Workout" to start!</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Exercises</th>
                    <th>Notes</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${workouts.map(w => `
                    <tr>
                        <td>${formatDate(w.date)}</td>
                        <td>${w.duration_min ? w.duration_min + ' min' : '—'}</td>
                        <td>
                            ${w.sets.map(s => {
        const ex = exercises.find(e => e.id === s.exercise_id);
        return `<span class="badge badge-info" style="margin: 2px;">${escapeHtml(ex ? ex.name : 'Exercise #' + s.exercise_id)}: ${s.set_count}×${s.reps} ${s.weight_kg ? '@ ' + s.weight_kg + 'kg' : ''}</span>`;
    }).join('')}
                            ${w.sets.length === 0 ? '<span class="text-muted">No sets</span>' : ''}
                        </td>
                        <td class="text-muted">${escapeHtml(w.notes || '—')}</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteWorkout(${w.id})">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function openWorkoutModal() {
    document.getElementById('workoutModal').classList.add('show');
    // Add one default set row
    if (document.getElementById('setsContainer').children.length === 0) {
        addSetRow();
    }
}

function closeWorkoutModal() {
    document.getElementById('workoutModal').classList.remove('show');
}

function addSetRow() {
    const container = document.getElementById('setsContainer');
    const idx = container.children.length;

    const row = document.createElement('div');
    row.className = 'form-row mt-sm';
    row.style.gridTemplateColumns = '2fr 1fr 1fr 1fr auto';
    row.style.alignItems = 'end';
    row.innerHTML = `
        <div class="form-group" style="margin-bottom: 0;">
            <label>Exercise</label>
            <select class="set-exercise" required>
                <option value="">Select...</option>
                ${exercises.map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${escapeHtml(e.muscle_group)})</option>`).join('')}
            </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
            <label>Sets</label>
            <input type="number" class="set-count" value="3" min="1" required>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
            <label>Reps</label>
            <input type="number" class="set-reps" value="10" min="1" required>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
            <label>Weight (kg)</label>
            <input type="number" class="set-weight" step="0.5" placeholder="0">
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="margin-bottom: 2px;">✕</button>
    `;
    container.appendChild(row);
}

async function handleCreateWorkout(e) {
    e.preventDefault();

    const setRows = document.querySelectorAll('#setsContainer > div');
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
        showAlert('alertArea', 'Workout logged successfully!', 'success');
        loadData();
    } catch (err) {
        showAlert('alertArea', err.message);
    }
}

async function deleteWorkout(id) {
    if (!confirm('Delete this workout?')) return;
    try {
        await api.delete(`/workouts/${id}`);
        showAlert('alertArea', 'Workout deleted.', 'success');
        loadData();
    } catch (err) {
        showAlert('alertArea', err.message);
    }
}
