/* ─── Calories Page Logic ────────────────────────────────────── */

let currentDate = todayStr();

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    showUser();

    const dateInput = document.getElementById('filterDate');
    dateInput.value = currentDate;
    dateInput.addEventListener('change', (e) => {
        if (!e.target.value) return;
        currentDate = e.target.value;
        loadCalories();
    });

    document.getElementById('mealDate').value = currentDate;
    document.getElementById('calorieForm').addEventListener('submit', handleLogMeal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCalorieModal();
    });

    loadCalories();
});

function shiftDay(delta) {
    const d = parseDate(currentDate);
    d.setDate(d.getDate() + delta);
    currentDate = dateKey(d);
    document.getElementById('filterDate').value = currentDate;
    loadCalories();
}

function renderDayHeading() {
    const d = parseDate(currentDate);
    const today = parseDate(todayStr());
    const diff = Math.round((today - d) / 86400000);
    const long = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    let title = long;
    if (diff === 0) title = 'Today';
    else if (diff === 1) title = 'Yesterday';
    else if (diff === -1) title = 'Tomorrow';

    document.getElementById('dayTitle').textContent = title;
    document.getElementById('dayKicker').textContent = title === long ? 'Meals' : `Meals · ${long}`;
}

async function loadCalories() {
    renderDayHeading();
    try {
        const [logs, summary] = await Promise.all([
            api.get(`/calories/?log_date=${currentDate}`),
            api.get(`/calories/daily-summary?log_date=${currentDate}`),
        ]);

        // Update summary figures
        if (summary) {
            document.getElementById('totalCals').textContent = summary.total_calories.toLocaleString('en-GB');
            document.getElementById('totalProtein').textContent = Math.round(summary.total_protein);
            document.getElementById('totalCarbs').textContent = Math.round(summary.total_carbs);
            document.getElementById('totalFat').textContent = Math.round(summary.total_fat);
            document.getElementById('mealCount').textContent = summary.meal_count;
        }
        renderPlate(document.getElementById('macroPlate'), summary);

        renderCalorieLogs(logs || []);
    } catch (err) {
        console.error('Load error:', err);
    }
}

function renderCalorieLogs(logs) {
    const container = document.getElementById('calorieList');
    if (!logs.length) {
        container.innerHTML = `
            <p class="empty">Nothing written down for this day.<small>Use "Log a meal" to add what you ate.</small></p>`;
        return;
    }

    const groups = {};
    for (const l of logs) (groups[l.meal_type] ||= []).push(l);
    const order = [...MEAL_ORDER, ...Object.keys(groups).filter(k => !MEAL_ORDER.includes(k))];

    container.innerHTML = order.filter(type => groups[type]).map(type => {
        const items = groups[type];
        const kcal = items.reduce((sum, l) => sum + l.calories, 0);
        return `
            <div class="meal-group">
                <h3>${escapeHtml(MEAL_LABELS[type] || type)} <span class="num">${kcal.toLocaleString('en-GB')} kcal</span></h3>
                ${items.map(l => `
                    <div class="meal-row">
                        <span>${escapeHtml(l.food_name)}</span>
                        <span class="pcf">P ${Math.round(l.protein_g || 0)} · C ${Math.round(l.carbs_g || 0)} · F ${Math.round(l.fat_g || 0)}</span>
                        <span class="kcal">${l.calories}</span>
                        <button class="remove-btn" onclick="deleteCalorie(${l.id})">Remove</button>
                    </div>`).join('')}
            </div>`;
    }).join('');
}

function openCalorieModal() {
    document.getElementById('mealDate').value = currentDate;
    document.getElementById('calorieModal').classList.add('show');
    document.getElementById('foodName').focus();
}

function closeCalorieModal() {
    document.getElementById('calorieModal').classList.remove('show');
    document.getElementById('formAlert').classList.remove('show');
}

async function handleLogMeal(e) {
    e.preventDefault();

    const data = {
        date: document.getElementById('mealDate').value,
        meal_type: document.getElementById('mealType').value,
        food_name: document.getElementById('foodName').value,
        calories: parseInt(document.getElementById('mealCalories').value) || 0,
        protein_g: parseFloat(document.getElementById('mealProtein').value) || 0,
        carbs_g: parseFloat(document.getElementById('mealCarbs').value) || 0,
        fat_g: parseFloat(document.getElementById('mealFat').value) || 0,
    };

    try {
        await api.post('/calories/', data);
        closeCalorieModal();
        document.getElementById('calorieForm').reset();
        document.getElementById('mealDate').value = currentDate;
        showAlert('alertArea', 'Meal saved.', 'success');
        loadCalories();
    } catch (err) {
        showAlert('formAlert', err.message);
    }
}

async function deleteCalorie(id) {
    if (!confirm('Remove this meal from the log?')) return;
    try {
        await api.delete(`/calories/${id}`);
        showAlert('alertArea', 'Meal removed.', 'success');
        loadCalories();
    } catch (err) {
        showAlert('alertArea', err.message);
    }
}
