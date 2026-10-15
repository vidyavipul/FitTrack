/* ─── Progress Page Logic ────────────────────────────────────── */

let weightChart = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    showUser();

    document.getElementById('progressDate').value = todayStr();
    document.getElementById('progressForm').addEventListener('submit', handleLogProgress);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeProgressModal();
    });

    loadProgress();
});

async function loadProgress() {
    try {
        const [logs, summary] = await Promise.all([
            api.get('/progress/'),
            api.get('/progress/summary'),
        ]);

        // Update summary figures
        if (summary && summary.entries > 0) {
            document.getElementById('currentWeight').textContent =
                summary.latest_weight ? summary.latest_weight.toFixed(1) : '--';
            document.getElementById('weightChange').textContent =
                summary.weight_change !== null
                    ? (summary.weight_change > 0 ? '+' : summary.weight_change < 0 ? '−' : '') +
                      Math.abs(summary.weight_change).toFixed(1)
                    : '--';
            document.getElementById('bodyFat').textContent =
                summary.latest_body_fat ? summary.latest_body_fat.toFixed(1) : '--';
            document.getElementById('totalEntries').textContent = summary.entries;
        }

        const entries = logs || [];
        document.getElementById('sinceKicker').textContent = entries.length
            ? `Tracking since ${parseDate(entries[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'Body';

        renderProgressChart(entries);
        renderProgressTable(entries);
    } catch (err) {
        console.error('Load error:', err);
    }
}

function renderProgressChart(logs) {
    if (!logs.length) return;

    const css = getComputedStyle(document.documentElement);
    const color = (name) => css.getPropertyValue(name).trim();
    const clay = color('--clay');
    const moss = color('--moss');
    const ink = color('--ink-soft');
    const rule = color('--rule-soft');
    const mono = { family: "'Martian Mono', monospace", size: 10 };
    const label = (d) => parseDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    const ctx = document.getElementById('weightChart').getContext('2d');

    // One shared x-axis of weigh-in dates; gaps where a value wasn't recorded
    const labels = logs.map(l => label(l.date));
    const weightData = logs.map(l => l.weight_kg ?? null);
    const bodyFatData = logs.map(l => l.body_fat_pct ?? null);

    if (weightChart) weightChart.destroy();

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Weight (kg)',
                    data: weightData,
                    borderColor: clay,
                    backgroundColor: clay,
                    borderWidth: 2,
                    tension: 0.2,
                    pointRadius: 2.5,
                    pointHoverRadius: 5,
                    spanGaps: true,
                    yAxisID: 'y',
                },
                {
                    label: 'Body fat (%)',
                    data: bodyFatData,
                    borderColor: moss,
                    backgroundColor: moss,
                    borderWidth: 1.5,
                    borderDash: [5, 4],
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    spanGaps: true,
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
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: ink,
                        boxWidth: 18,
                        boxHeight: 2,
                        font: { family: "'Schibsted Grotesk', sans-serif", size: 12 },
                    },
                },
                tooltip: {
                    backgroundColor: color('--ink'),
                    titleColor: color('--paper'),
                    bodyColor: color('--paper'),
                    titleFont: { ...mono, size: 11 },
                    bodyFont: { family: "'Schibsted Grotesk', sans-serif", size: 12 },
                    cornerRadius: 2,
                    padding: 10,
                    boxWidth: 8,
                    boxHeight: 8,
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { color: color('--ink') },
                    ticks: { color: ink, font: mono, maxRotation: 0, autoSkipPadding: 16 },
                },
                y: {
                    position: 'left',
                    grid: { color: rule },
                    border: { display: false },
                    ticks: { color: ink, font: mono, padding: 8 },
                },
                y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    border: { display: false },
                    ticks: { color: ink, font: mono, padding: 8 },
                },
            },
        },
    });
}

function renderProgressTable(logs) {
    const container = document.getElementById('progressList');
    if (!logs.length) {
        container.innerHTML = `
            <p class="empty">No weigh-ins yet.<small>Add one and the trend will start drawing itself.</small></p>`;
        return;
    }

    // Newest first, with the change from the previous weigh-in
    const rows = logs.map((l, i) => {
        const prev = logs.slice(0, i).reverse().find(p => p.weight_kg);
        const delta = l.weight_kg && prev ? l.weight_kg - prev.weight_kg : null;
        return { ...l, delta };
    }).reverse();

    const fmtDelta = (d) => d === null ? '' : (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d).toFixed(1);

    container.innerHTML = `
        <table class="ledger">
            <thead>
                <tr>
                    <th>Date</th>
                    <th class="num">Weight</th>
                    <th class="num hide-sm">Change</th>
                    <th class="num">Body fat</th>
                    <th class="hide-sm">Notes</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(l => `
                    <tr>
                        <td>${formatDate(l.date)}</td>
                        <td class="num">${l.weight_kg ? `${l.weight_kg.toFixed(1)} kg` : '<span class="muted">–</span>'}</td>
                        <td class="num hide-sm muted">${fmtDelta(l.delta)}</td>
                        <td class="num">${l.body_fat_pct ? `${l.body_fat_pct.toFixed(1)}%` : '<span class="muted">–</span>'}</td>
                        <td class="hide-sm muted">${escapeHtml(l.notes || '')}</td>
                        <td class="r"><button class="remove-btn" onclick="deleteProgress(${l.id})">Remove</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function openProgressModal() {
    document.getElementById('progressDate').value = todayStr();
    document.getElementById('progressModal').classList.add('show');
    document.getElementById('progressWeight').focus();
}

function closeProgressModal() {
    document.getElementById('progressModal').classList.remove('show');
    document.getElementById('formAlert').classList.remove('show');
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
        showAlert('formAlert', 'Enter a weight, a body fat percentage, or both.');
        return;
    }

    try {
        await api.post('/progress/', data);
        closeProgressModal();
        document.getElementById('progressForm').reset();
        showAlert('alertArea', 'Weigh-in saved.', 'success');
        loadProgress();
    } catch (err) {
        showAlert('formAlert', err.message);
    }
}

async function deleteProgress(id) {
    if (!confirm('Remove this weigh-in?')) return;
    try {
        await api.delete(`/progress/${id}`);
        showAlert('alertArea', 'Weigh-in removed.', 'success');
        loadProgress();
    } catch (err) {
        showAlert('alertArea', err.message);
    }
}
