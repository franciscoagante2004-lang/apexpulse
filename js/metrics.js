/**
 * ApexPulse - Body Metrics & Progress Engine
 * Handles daily weight logs, body measurements (chest, waist, arms, legs), BMI, and correlation charts.
 */

const MetricsManager = {
  init() {
    this.renderMetricsView();
  },

  // Log a new weight / body measurement entry
  logMetric(entryData) {
    const metrics = StorageManager.get(STORAGE_KEYS.BODY_METRICS, []);
    
    // Check if an entry for this date already exists, update if so
    const existingIdx = metrics.findIndex(m => m.date === entryData.date);
    const newEntry = {
      id: entryData.id || 'bm_' + entryData.date,
      date: entryData.date || new Date().toISOString().split('T')[0],
      weightKg: parseFloat(entryData.weightKg) || 0,
      bodyFatPct: parseFloat(entryData.bodyFatPct) || null,
      measurements: {
        chestCm: parseFloat(entryData.chestCm) || null,
        waistCm: parseFloat(entryData.waistCm) || null,
        armsRightCm: parseFloat(entryData.armsRightCm) || null,
        armsLeftCm: parseFloat(entryData.armsLeftCm) || null,
        thighRightCm: parseFloat(entryData.thighRightCm) || null,
        thighLeftCm: parseFloat(entryData.thighLeftCm) || null,
        calvesCm: parseFloat(entryData.calvesCm) || null
      },
      notes: entryData.notes || ''
    };

    if (existingIdx >= 0) {
      metrics[existingIdx] = newEntry;
    } else {
      metrics.unshift(newEntry);
    }

    // Sort descending by date
    metrics.sort((a, b) => new Date(b.date) - new Date(a.date));
    StorageManager.set(STORAGE_KEYS.BODY_METRICS, metrics);

    // Update user profile weight if this is the most recent
    const profile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);
    if (metrics[0].id === newEntry.id) {
      profile.weightKg = newEntry.weightKg;
      StorageManager.set(STORAGE_KEYS.USER_PROFILE, profile);
    }

    this.renderMetricsView();
    App.updateDashboard();
    AchievementsManager.checkAll();
    App.showToast(`Medição de ${newEntry.date} guardada com sucesso!`, 'success');
  },

  deleteMetric(id) {
    if (!confirm('Eliminar este registo de medição?')) return;
    const metrics = StorageManager.get(STORAGE_KEYS.BODY_METRICS, []);
    const updated = metrics.filter(m => m.id !== id);
    StorageManager.set(STORAGE_KEYS.BODY_METRICS, updated);
    this.renderMetricsView();
    App.updateDashboard();
    App.showToast('Registo eliminado.', 'info');
  },

  // Render Metrics UI
  renderMetricsView() {
    const container = document.getElementById('metrics-view-container');
    if (!container) return;

    const metrics = StorageManager.get(STORAGE_KEYS.BODY_METRICS, []);
    const profile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);

    const latest = metrics[0] || { weightKg: profile.weightKg, bodyFatPct: 15, measurements: {} };
    const prev7Days = metrics.find((m, i) => i > 0 && i <= 5) || latest;
    const weightDiff = Math.round((latest.weightKg - prev7Days.weightKg) * 10) / 10;

    // Height in meters for BMI
    const heightM = (profile.heightCm || 178) / 100;
    const bmi = Math.round((latest.weightKg / (heightM * heightM)) * 10) / 10;

    // Lean Mass estimation
    const leanMassKg = latest.bodyFatPct ? Math.round(latest.weightKg * (1 - latest.bodyFatPct / 100) * 10) / 10 : null;

    // History Table Rows
    const tableRows = metrics.slice(0, 15).map(m => `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/30 text-xs">
        <td class="py-2.5 px-3 font-semibold text-slate-200">${m.date}</td>
        <td class="py-2.5 px-3 font-bold text-cyan-400">${m.weightKg} kg</td>
        <td class="py-2.5 px-3 text-slate-300">${m.bodyFatPct ? `${m.bodyFatPct}%` : '—'}</td>
        <td class="py-2.5 px-3 text-slate-400 hidden sm:table-cell">${m.measurements?.waistCm ? `${m.measurements.waistCm} cm` : '—'}</td>
        <td class="py-2.5 px-3 text-slate-400 hidden md:table-cell">${m.measurements?.armsRightCm ? `${m.measurements.armsRightCm} cm` : '—'}</td>
        <td class="py-2.5 px-3 text-slate-400 hidden md:table-cell">${m.measurements?.chestCm ? `${m.measurements.chestCm} cm` : '—'}</td>
        <td class="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[120px]">${m.notes || ''}</td>
        <td class="py-2.5 px-3 text-right">
          <button class="text-slate-500 hover:text-rose-400 p-1" onclick="MetricsManager.deleteMetric('${m.id}')" title="Eliminar">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Overview Stats Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Weight Card -->
          <div class="glass-card p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Peso Atual</span>
              <i data-lucide="scale" class="w-4 h-4 text-cyan-400"></i>
            </div>
            <div class="text-2xl font-black text-slate-100">${latest.weightKg} <span class="text-xs font-normal text-slate-400">kg</span></div>
            <div class="text-xs mt-1 font-semibold ${weightDiff < 0 ? 'text-emerald-400' : weightDiff > 0 ? 'text-amber-400' : 'text-slate-400'}">
              ${weightDiff < 0 ? `📉 ${weightDiff} kg vs 7 dias` : weightDiff > 0 ? `📈 +${weightDiff} kg vs 7 dias` : '— Estável'}
            </div>
          </div>

          <!-- Body Fat Card -->
          <div class="glass-card p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 to-slate-900">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>% Gordura Est.</span>
              <i data-lucide="activity" class="w-4 h-4 text-indigo-400"></i>
            </div>
            <div class="text-2xl font-black text-slate-100">${latest.bodyFatPct || '15'} <span class="text-xs font-normal text-slate-400">%</span></div>
            <div class="text-xs mt-1 text-slate-400">
              ${leanMassKg ? `Massa Magra: <strong class="text-indigo-300">${leanMassKg} kg</strong>` : 'Normal / Atlético'}
            </div>
          </div>

          <!-- BMI Card -->
          <div class="glass-card p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-900">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>IMC Corporal</span>
              <i data-lucide="user" class="w-4 h-4 text-amber-400"></i>
            </div>
            <div class="text-2xl font-black text-slate-100">${bmi} <span class="text-xs font-normal text-slate-400">kg/m²</span></div>
            <div class="text-xs mt-1 text-emerald-400 font-semibold">Peso Saudável</div>
          </div>

          <!-- Waist / Action Card -->
          <div class="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900 flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Cintura</span>
              <i data-lucide="ruler" class="w-4 h-4 text-emerald-400"></i>
            </div>
            <div class="text-2xl font-black text-slate-100">${latest.measurements?.waistCm || '84'} <span class="text-xs font-normal text-slate-400">cm</span></div>
            <button class="btn btn-primary text-xs py-1.5 px-3 mt-1 font-bold" onclick="App.openLogMetricModal()">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Registar Medição
            </button>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Weight Trend Chart -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-slate-100 text-sm flex items-center gap-2">
                <i data-lucide="line-chart" class="w-4 h-4 text-cyan-400"></i> Evolução de Peso & Média Móvel
              </h4>
              <span class="text-xs text-slate-400">Últimos 30 dias</span>
            </div>
            <div class="h-64">
              <canvas id="chart-weight-trend"></canvas>
            </div>
          </div>

          <!-- Calorie vs Weight Correlation -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-slate-100 text-sm flex items-center gap-2">
                <i data-lucide="bar-chart-2" class="w-4 h-4 text-indigo-400"></i> Correlação: Dieta (kcal) vs Peso
              </h4>
              <span class="text-xs text-slate-400">Tendência real</span>
            </div>
            <div class="h-64">
              <canvas id="chart-correlation"></canvas>
            </div>
          </div>
        </div>

        <!-- Measurement History Table -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-slate-100 text-sm flex items-center gap-2">
              <i data-lucide="history" class="w-4 h-4 text-slate-400"></i> Histórico de Pesagens & Medidas
            </h4>
            <button class="btn btn-secondary text-xs py-1.5 px-3 font-semibold" onclick="App.openLogMetricModal()">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Nova Pesagem
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <th class="py-2.5 px-3">Data</th>
                  <th class="py-2.5 px-3">Peso</th>
                  <th class="py-2.5 px-3">% Gordura</th>
                  <th class="py-2.5 px-3 hidden sm:table-cell">Cintura</th>
                  <th class="py-2.5 px-3 hidden md:table-cell">Braço D.</th>
                  <th class="py-2.5 px-3 hidden md:table-cell">Peitoral</th>
                  <th class="py-2.5 px-3">Notas</th>
                  <th class="py-2.5 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                ${tableRows || '<tr><td colspan="8" class="text-center py-6 text-slate-500 text-xs">Sem medições registadas.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Render charts
    setTimeout(() => {
      ChartManager.renderWeightTrend('chart-weight-trend');
      ChartManager.renderCalorieWeightCorrelation('chart-correlation');
    }, 50);
  }
};

window.MetricsManager = MetricsManager;
