/* ─── Calories Page Logic ────────────────────────────────────── */

let currentDate = todayStr();

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    const username = getUsername();
    document.getElementById('userName').textContent = username;
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

    const dateInput = document.getElementById('filterDate');
    dateInput.value = currentDate;
    dateInput.addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadCalories();
    });

    document.getElementById('mealDate').value = currentDate;
    document.getElementById('calorieForm').addEventListener('submit', handleLogMeal);

    loadCalories();
});

async function loadCalories() {
    try {
        const [logs, summary] = await Promise.all([
            api.get(`/calories/?log_date=${currentDate}`),
            api.get(`/calories/daily-summary?log_date=${currentDate}`),
        ]);

        // Update summary cards
        if (summary) {
            document.getElementById('totalCals').textContent = summary.total_calories;
            document.getElementById('totalProtein').textContent = `${Math.round(summary.total_protein)}g`;
            document.getElementById('totalCarbs').textContent = `${Math.round(summary.total_carbs)}g`;
            document.getElementById('totalFat').textContent = `${Math.round(summary.total_fat)}g`;
            document.getElementById('mealCount').textContent = summary.meal_count;
        }

        renderCalorieLogs(logs || []);
    } catch (err) {
        console.error('Load error:', err);
    }
}

function renderCalorieLogs(logs) {
    const container = document.getElementById('calorieList');
    if (!logs.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🍽️</div>
                <p>No meals logged for this date.</p>
            </div>`;
        return;
    }

    const mealTypeEmoji = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' };

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Meal</th>
                    <th>Food</th>
                    <th>Calories</th>
                    <th>Protein</th>
                    <th>Carbs</th>
                    <th>Fat</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(l => `
                    <tr>
                        <td><span class="badge badge-info">${mealTypeEmoji[l.meal_type] || '🍽️'} ${escapeHtml(l.meal_type)}</span></td>
                        <td>${escapeHtml(l.food_name)}</td>
                        <td><strong>${l.calories}</strong></td>
                        <td>${l.protein_g || 0}g</td>
                        <td>${l.carbs_g || 0}g</td>
                        <td>${l.fat_g || 0}g</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteCalorie(${l.id})">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function openCalorieModal() {
    document.getElementById('mealDate').value = currentDate;
    document.getElementById('calorieModal').classList.add('show');
}

function closeCalorieModal() {
    document.getElementById('calorieModal').classList.remove('show');
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
        showAlert('alertArea', 'Meal logged successfully!', 'success');
        loadCalories();
    } catch (err) {
        showAlert('alertArea', err.message);
    }
}

async function deleteCalorie(id) {
    if (!confirm('Delete this meal entry?')) return;
    try {
        await api.delete(`/calories/${id}`);
        showAlert('alertArea', 'Meal entry deleted.', 'success');
        loadCalories();
    } catch (err) {
        showAlert('alertArea', err.message);
    }
}
