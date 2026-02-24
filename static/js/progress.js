/* ─── Progress Page Logic ────────────────────────────────────── */

let weightChart = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    const username = getUsername();
    document.getElementById('userName').textContent = username;
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

    document.getElementById('progressDate').value = todayStr();
    document.getElementById('progressForm').addEventListener('submit', handleLogProgress);

    loadProgress();
});

async function loadProgress() {
    try {
        const [logs, summary] = await Promise.all([
            api.get('/progress/'),
            api.get('/progress/summary'),
        ]);

        // Update summary cards
        if (summary && summary.entries > 0) {
            document.getElementById('currentWeight').textContent = summary.latest_weight || '--';
            document.getElementById('weightChange').textContent =
                summary.weight_change !== null ? (summary.weight_change >= 0 ? '+' : '') + summary.weight_change : '--';
            document.getElementById('bodyFat').textContent =
                summary.latest_body_fat ? summary.latest_body_fat + '%' : '--';
            document.getElementById('totalEntries').textContent = summary.entries;
        }

        renderProgressChart(logs || []);
        renderProgressTable(logs || []);
    } catch (err) {
        console.error('Load error:', err);
    }
}

function renderProgressChart(logs) {
    if (!logs.length) return;

    const ctx = document.getElementById('weightChart').getContext('2d');

    const weightData = logs
        .filter(l => l.weight_kg)
        .map(l => ({ x: l.date, y: parseFloat(l.weight_kg) }));

    const bodyFatData = logs
        .filter(l => l.body_fat_pct)
        .map(l => ({ x: l.date, y: parseFloat(l.body_fat_pct) }));

    if (weightChart) weightChart.destroy();

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Weight (kg)',
                    data: weightData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y',
                },
                {
                    label: 'Body Fat (%)',
                    data: bodyFatData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#9ca3af',
                        font: { family: 'Inter', size: 12 },
                    },
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleColor: '#f9fafb',
                    bodyColor: '#f9fafb',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                },
            },
            scales: {
                x: {
                    type: 'category',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#6b7280', font: { family: 'Inter', size: 11 } },
                },
                y: {
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#6b7280', font: { family: 'Inter', size: 11 } },
                    title: { display: true, text: 'Weight (kg)', color: '#9ca3af' },
                },
                y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#6b7280', font: { family: 'Inter', size: 11 } },
                    title: { display: true, text: 'Body Fat (%)', color: '#9ca3af' },
                },
            },
        },
    });
}

function renderProgressTable(logs) {
    const container = document.getElementById('progressList');
    if (!logs.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📈</div>
                <p>No progress data yet. Start logging your weight!</p>
            </div>`;
        return;
    }

    // Reverse to show newest first in table
    const reversed = [...logs].reverse();

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Weight (kg)</th>
                    <th>Body Fat %</th>
                    <th>Notes</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${reversed.map(l => `
                    <tr>
                        <td>${formatDate(l.date)}</td>
                        <td><strong>${l.weight_kg || '—'}</strong></td>
                        <td>${l.body_fat_pct ? l.body_fat_pct + '%' : '—'}</td>
                        <td class="text-muted">${l.notes || '—'}</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteProgress(${l.id})">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function openProgressModal() {
    document.getElementById('progressDate').value = todayStr();
    document.getElementById('progressModal').classList.add('show');
}

function closeProgressModal() {
    document.getElementById('progressModal').classList.remove('show');
}

async function handleLogProgress(e) {
    e.preventDefault();

    const data = {
        date: document.getElementById('progressDate').value,
        weight_kg: parseFloat(document.getElementById('progressWeight').value) || null,
        body_fat_pct: parseFloat(document.getElementById('progressBodyFat').value) || null,
        notes: document.getElementById('progressNotes').value || null,
    };

    if (!data.weight_kg && !data.body_fat_pct) {
        showAlert('alertArea', 'Please enter at least weight or body fat percentage.');
        return;
    }

    try {
        await api.post('/progress/', data);
        closeProgressModal();
        document.getElementById('progressForm').reset();
        showAlert('alertArea', 'Progress logged successfully!', 'success');
        loadProgress();
    } catch (err) {
        showAlert('alertArea', err.message);
    }
}

async function deleteProgress(id) {
    if (!confirm('Delete this progress entry?')) return;
    try {
        await api.delete(`/progress/${id}`);
        showAlert('alertArea', 'Entry deleted.', 'success');
        loadProgress();
    } catch (err) {
        showAlert('alertArea', err.message);
    }
}
