/**
 * ApexPulse - Universal Standalone Chart Engine
 * Integrates Chart.js when available, and provides built-in HTML5 Canvas 2D fallback.
 * Works 100% offline and in adblocked / privacy-hardened browsers.
 */

const ChartManager = {
  instances: {},

  colors: {
    emerald: '#10b981',
    emeraldAlpha: 'rgba(16, 185, 129, 0.2)',
    indigo: '#6366f1',
    indigoAlpha: 'rgba(99, 102, 241, 0.2)',
    amber: '#f59e0b',
    amberAlpha: 'rgba(245, 158, 11, 0.2)',
    rose: '#f43f5e',
    roseAlpha: 'rgba(244, 63, 94, 0.2)',
    cyan: '#06b6d4',
    cyanAlpha: 'rgba(6, 182, 212, 0.2)',
    purple: '#a855f7',
    textMuted: '#94a3b8',
    gridColor: 'rgba(255, 255, 255, 0.08)'
  },

  destroy(canvasId) {
    if (this.instances[canvasId]) {
      try { this.instances[canvasId].destroy(); } catch (e) {}
      delete this.instances[canvasId];
    }
  },

  /**
   * Exercise Load & 1RM Evolution Chart
   */
  renderExerciseProgress(canvasId, exerciseId) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    const dataPoints = [];

    workouts.forEach(w => {
      const ex = w.exercises?.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets && ex.sets.length > 0) {
        let maxWeight = 0;
        let best1RM = 0;
        let totalVolume = 0;

        ex.sets.forEach(s => {
          if (s.completed && s.weightKg > 0) {
            if (s.weightKg > maxWeight) maxWeight = s.weightKg;
            const est1RM = s.reps > 1 ? s.weightKg * (1 + s.reps / 30) : s.weightKg;
            if (est1RM > best1RM) best1RM = est1RM;
            totalVolume += (s.weightKg * s.reps);
          }
        });

        if (maxWeight > 0) {
          dataPoints.push({
            date: w.date,
            maxWeight: Math.round(maxWeight * 10) / 10,
            best1RM: Math.round(best1RM * 10) / 10,
            volume: Math.round(totalVolume)
          });
        }
      }
    });

    dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (dataPoints.length === 0) {
      this.drawEmptyMessage(canvas, 'Sem registos suficientes para este exercício.');
      return;
    }

    const labels = dataPoints.map(d => {
      const parts = d.date.split('-');
      return `${parts[2]}/${parts[1]}`;
    });

    // Check if Chart.js is loaded
    if (typeof Chart !== 'undefined') {
      try {
        const ctx = canvas.getContext('2d');
        const gradient1RM = ctx.createLinearGradient(0, 0, 0, 240);
        gradient1RM.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        gradient1RM.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        const gradientMax = ctx.createLinearGradient(0, 0, 0, 240);
        gradientMax.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        gradientMax.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        this.instances[canvasId] = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: '1RM Estimado (kg)',
                data: dataPoints.map(d => d.best1RM),
                borderColor: this.colors.indigo,
                backgroundColor: gradient1RM,
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: this.colors.indigo,
                pointBorderColor: '#fff',
                pointRadius: 4
              },
              {
                label: 'Carga Máxima (kg)',
                data: dataPoints.map(d => d.maxWeight),
                borderColor: this.colors.emerald,
                backgroundColor: gradientMax,
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: this.colors.emerald,
                pointBorderColor: '#fff',
                pointRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { color: '#e2e8f0', font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }, boxWidth: 14 }
              }
            },
            scales: {
              x: { grid: { color: this.colors.gridColor }, ticks: { color: this.colors.textMuted } },
              y: { grid: { color: this.colors.gridColor }, ticks: { color: this.colors.textMuted, callback: (v) => `${v} kg` } }
            }
          }
        });
        return;
      } catch (err) {
        console.warn('Chart.js error, falling back to Canvas 2D:', err);
      }
    }

    // Built-in HTML5 Canvas 2D Fallback
    this.drawNativeLineChart(canvas, labels, [
      { name: '1RM (kg)', color: this.colors.indigo, values: dataPoints.map(d => d.best1RM) },
      { name: 'Carga Máx (kg)', color: this.colors.emerald, values: dataPoints.map(d => d.maxWeight) }
    ], 'kg');
  },

  /**
   * Nutrition Macro Breakdown Doughnut
   */
  renderMacroDonut(canvasId, proteinG, carbsG, fatG) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pCal = Math.round(proteinG * 4);
    const cCal = Math.round(carbsG * 4);
    const fCal = Math.round(fatG * 9);
    const totalCal = pCal + cCal + fCal;

    if (typeof Chart !== 'undefined') {
      try {
        const ctx = canvas.getContext('2d');
        this.instances[canvasId] = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Proteína', 'Hidratos', 'Gordura'],
            datasets: [{
              data: totalCal === 0 ? [1, 1, 1] : [pCal, cCal, fCal],
              backgroundColor: [this.colors.cyan, this.colors.amber, this.colors.rose],
              borderColor: '#0f172a',
              borderWidth: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 11 }, padding: 10, boxWidth: 10 }
              }
            }
          }
        });
        return;
      } catch (err) {
        console.warn('Chart.js error:', err);
      }
    }

    // Built-in HTML5 Canvas 2D Doughnut Fallback
    this.drawNativeDonut(canvas, [
      { label: 'Prot', color: this.colors.cyan, value: pCal, grams: proteinG },
      { label: 'HC', color: this.colors.amber, value: cCal, grams: carbsG },
      { label: 'Gord', color: this.colors.rose, value: fCal, grams: fatG }
    ], `${totalCal} kcal`);
  },

  /**
   * Body Weight Trend Chart
   */
  renderWeightTrend(canvasId) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const metrics = StorageManager.get(STORAGE_KEYS.BODY_METRICS, []);
    if (!metrics.length) {
      this.drawEmptyMessage(canvas, 'Sem pesagens registadas.');
      return;
    }

    const sorted = [...metrics].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-20);
    const labels = sorted.map(m => {
      const parts = m.date.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const weights = sorted.map(m => m.weightKg);

    // Moving average 7-day
    const ma = weights.map((w, idx) => {
      const windowSlice = weights.slice(Math.max(0, idx - 6), idx + 1);
      const avg = windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;
      return Math.round(avg * 10) / 10;
    });

    if (typeof Chart !== 'undefined') {
      try {
        const ctx = canvas.getContext('2d');
        this.instances[canvasId] = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Peso (kg)',
                data: weights,
                borderColor: this.colors.cyan,
                backgroundColor: this.colors.cyanAlpha,
                borderWidth: 2.5,
                tension: 0.3,
                pointRadius: 4
              },
              {
                label: 'Média Móvel 7 Dias',
                data: ma,
                borderColor: this.colors.emerald,
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#e2e8f0' } } },
            scales: {
              x: { grid: { color: this.colors.gridColor }, ticks: { color: this.colors.textMuted } },
              y: { grid: { color: this.colors.gridColor }, ticks: { color: this.colors.textMuted, callback: (v) => `${v} kg` } }
            }
          }
        });
        return;
      } catch (err) {}
    }

    this.drawNativeLineChart(canvas, labels, [
      { name: 'Peso (kg)', color: this.colors.cyan, values: weights },
      { name: 'Média 7d', color: this.colors.emerald, values: ma }
    ], 'kg');
  },

  /**
   * Calorie vs Weight Correlation Chart
   */
  renderCalorieWeightCorrelation(canvasId) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const metrics = StorageManager.get(STORAGE_KEYS.BODY_METRICS, []);
    const nutrition = StorageManager.get(STORAGE_KEYS.NUTRITION_LOGS, {});
    const dateMap = {};

    metrics.forEach(m => {
      if (!dateMap[m.date]) dateMap[m.date] = {};
      dateMap[m.date].weight = m.weightKg;
    });

    Object.keys(nutrition).forEach(d => {
      if (!dateMap[d]) dateMap[d] = {};
      const { totals } = NutritionManager.calculateDailyTotals(d);
      dateMap[d].calories = totals.calories;
    });

    const dates = Object.keys(dateMap).sort().slice(-14);
    if (!dates.length) {
      this.drawEmptyMessage(canvas, 'Sem dados suficientes para correlação.');
      return;
    }

    const labels = dates.map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const cals = dates.map(d => dateMap[d].calories || null);
    const weights = dates.map(d => dateMap[d].weight || null);

    if (typeof Chart !== 'undefined') {
      try {
        const ctx = canvas.getContext('2d');
        this.instances[canvasId] = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              {
                type: 'bar',
                label: 'Calorias (kcal)',
                data: cals,
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: this.colors.indigo,
                borderWidth: 1.5,
                yAxisID: 'yCal'
              },
              {
                type: 'line',
                label: 'Peso (kg)',
                data: weights,
                borderColor: this.colors.rose,
                borderWidth: 3,
                tension: 0.35,
                yAxisID: 'yWeight'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { grid: { display: false }, ticks: { color: this.colors.textMuted } },
              yCal: { position: 'left', grid: { color: this.colors.gridColor }, ticks: { color: this.colors.indigo, callback: v => `${v} kcal` } },
              yWeight: { position: 'right', grid: { display: false }, ticks: { color: this.colors.rose, callback: v => `${v} kg` } }
            }
          }
        });
        return;
      } catch (err) {}
    }

    this.drawNativeLineChart(canvas, labels, [
      { name: 'Calorias', color: this.colors.indigo, values: cals.map(c => c || 0) }
    ], 'kcal');
  },

  renderVolumeHistory(canvasId) {
    this.destroy(canvasId);
  },

  /* Native Canvas 2D Fallback Renderers */
  drawEmptyMessage(canvas, msg) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement?.clientWidth || 300;
    const h = canvas.height = canvas.parentElement?.clientHeight || 200;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.font = '13px Plus Jakarta Sans, sans-serif';
    ctx.fillText(msg, w / 2, h / 2);
  },

  drawNativeLineChart(canvas, labels, datasets, unit = '') {
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement?.clientWidth || 400;
    const h = canvas.height = canvas.parentElement?.clientHeight || 240;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 45;
    const padRight = 20;
    const padTop = 35;
    const padBottom = 35;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Find min and max across all datasets
    let allVals = [];
    datasets.forEach(ds => {
      allVals = allVals.concat(ds.values.filter(v => v !== null && !isNaN(v)));
    });
    if (!allVals.length) return;

    let min = Math.min(...allVals);
    let max = Math.max(...allVals);
    if (min === max) { min -= 5; max += 5; }
    min = Math.floor(min * 0.95);
    max = Math.ceil(max * 1.05);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      const val = Math.round(max - ((max - min) / 4) * i);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(`${val}${unit}`, padLeft - 6, y + 4);
    }

    // Draw X axis labels
    ctx.textAlign = 'center';
    const stepX = labels.length > 1 ? plotW / (labels.length - 1) : plotW / 2;
    labels.forEach((lbl, i) => {
      const x = padLeft + i * stepX;
      ctx.fillText(lbl, x, h - 12);
    });

    // Draw datasets
    datasets.forEach(ds => {
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      ds.values.forEach((v, i) => {
        if (v === null || isNaN(v)) return;
        const x = padLeft + i * stepX;
        const y = padTop + plotH - ((v - min) / (max - min)) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Points
      ctx.fillStyle = ds.color;
      ds.values.forEach((v, i) => {
        if (v === null || isNaN(v)) return;
        const x = padLeft + i * stepX;
        const y = padTop + plotH - ((v - min) / (max - min)) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Legend
    let legX = padLeft;
    ctx.textAlign = 'left';
    datasets.forEach(ds => {
      ctx.fillStyle = ds.color;
      ctx.fillRect(legX, 10, 10, 10);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(ds.name, legX + 15, 19);
      legX += ctx.measureText(ds.name).width + 35;
    });
  },

  drawNativeDonut(canvas, slices, centerText) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement?.clientWidth || 200;
    const h = canvas.height = canvas.parentElement?.clientHeight || 180;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 10;
    const radius = Math.min(cx, cy) - 15;
    const innerRadius = radius * 0.68;

    const total = slices.reduce((sum, s) => sum + s.value, 0);
    let startAngle = -Math.PI / 2;

    if (total === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = radius - innerRadius;
      ctx.beginPath();
      ctx.arc(cx, cy, (radius + innerRadius) / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      slices.forEach(s => {
        const sliceAngle = (s.value / total) * Math.PI * 2;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = radius - innerRadius;
        ctx.beginPath();
        ctx.arc(cx, cy, (radius + innerRadius) / 2, startAngle, startAngle + sliceAngle);
        ctx.stroke();
        startAngle += sliceAngle;
      });
    }

    // Center text
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Plus Jakarta Sans, sans-serif';
    ctx.fillText(centerText, cx, cy + 5);

    // Legend at bottom
    ctx.font = '11px Plus Jakarta Sans, sans-serif';
    let lx = cx - 70;
    slices.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, h - 14, 8, 8);
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'left';
      ctx.fillText(`${s.label}: ${s.grams}g`, lx + 12, h - 6);
      lx += 50;
    });
  }
};

window.ChartManager = ChartManager;
