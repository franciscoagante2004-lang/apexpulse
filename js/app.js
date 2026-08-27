/**
 * ApexPulse - Main Application Controller & UI Router
 * Manages tabs, modals, toasts, dashboard updates, and global event delegation.
 */

const App = {
  currentTab: 'dashboard',
  selectedMealForAdd: 'breakfast',
  deferredPrompt: null,

  init() {
    console.log('Initializing ApexPulse App...');
    try { StorageManager.init(); } catch (e) { console.error('StorageManager init error:', e); }

    // Register Service Worker for offline PWA installation
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      try {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('[ServiceWorker] Registado:', reg.scope))
          .catch((err) => console.warn('[ServiceWorker] Falha ao registar:', err));
      } catch (e) {}
    }

    // Capture PWA install prompt for PC / Android
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('pwa-header-install-btn');
      if (installBtn) installBtn.classList.remove('hidden');
    });

    // Global Tab buttons event delegation (handles SVG icons, spans, dynamic buttons)
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab-target]');
      if (tabBtn) {
        e.preventDefault();
        const target = tabBtn.getAttribute('data-tab-target');
        App.switchTab(target);
      }
      
      // Close modal on clicking outside the card
      if (e.target.classList && e.target.classList.contains('modal-overlay')) {
        App.closeAllModals();
      }
    });

    // Initialize submodules safely
    try { WorkoutManager.init(); } catch (e) { console.error('WorkoutManager error:', e); }
    try { NutritionManager.init(); } catch (e) { console.error('NutritionManager error:', e); }
    try { MetricsManager.init(); } catch (e) { console.error('MetricsManager error:', e); }
    try { AchievementsManager.init(); } catch (e) { console.error('AchievementsManager error:', e); }

    // Global Modal Escape listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });

    // Render active tab immediately
    this.switchTab('dashboard');

    // Recreate icons
    if (typeof renderApexIcons === 'function') renderApexIcons();
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update Nav buttons state
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab-target') === tabId;
      if (isTarget) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all tab views and show the selected one
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.add('hidden');
    });

    const activeView = document.getElementById(`view-${tabId}`);
    if (activeView) {
      activeView.classList.remove('hidden');
    }

    // Trigger tab-specific renders safely
    try {
      if (tabId === 'dashboard') {
        this.updateDashboard();
      } else if (tabId === 'gym') {
        WorkoutManager.renderGymHomeView();
      } else if (tabId === 'nutrition') {
        NutritionManager.renderNutritionView();
      } else if (tabId === 'metrics') {
        MetricsManager.renderMetricsView();
      } else if (tabId === 'analytics') {
        AchievementsManager.renderAchievementsView();
      } else if (tabId === 'settings') {
        this.renderSettingsView();
      }
    } catch (err) {
      console.error(`Error rendering tab ${tabId}:`, err);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof renderApexIcons === 'function') renderApexIcons();
  },

  // Update Main Dashboard View
  updateDashboard() {
    const container = document.getElementById('dashboard-view-container');
    if (!container) return;

    const profile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);
    const targets = profile.dailyTargets || DEFAULT_USER_PROFILE.dailyTargets;
    const todayStr = new Date().toISOString().split('T')[0];
    const { totals } = NutritionManager.calculateDailyTotals(todayStr);

    const calPct = Math.min(100, Math.round((totals.calories / targets.calories) * 100));
    const calRemaining = Math.max(0, targets.calories - totals.calories);
    const pPct = Math.min(100, Math.round((totals.protein / targets.protein) * 100));
    const cPct = Math.min(100, Math.round((totals.carbs / targets.carbs) * 100));
    const fPct = Math.min(100, Math.round((totals.fat / targets.fat) * 100));
    const wPct = Math.min(100, Math.round(((totals.waterMl || 0) / targets.waterMl) * 100));

    const streak = AchievementsManager.getStreakDays();
    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    const lastWorkout = workouts[0] || null;
    const topPRs = AchievementsManager.getAllPRs().slice(0, 3);
    const metrics = StorageManager.get(STORAGE_KEYS.BODY_METRICS, []);
    const latestMetric = metrics[0] || { weightKg: profile.weightKg };

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Hero Welcome Header -->
        <div class="glass-panel p-6 rounded-3xl border border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-black/20">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="badge badge-emerald text-xs font-bold">APEXPULSE PRO</span>
              <span class="text-xs text-slate-400 font-medium">${new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <h1 class="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
              Olá, ${profile.name || 'Atleta'}! 🔥
            </h1>
            <p class="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
              Tudo pronto para mais um dia de evolução. Mantém as cargas a subir e os macros alinhados!
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary py-3 px-5 text-sm font-bold shadow-lg shadow-emerald-500/25" onclick="WorkoutManager.startWorkout('Treino Livre')">
              <i data-lucide="play" class="w-4 h-4"></i> Treinar Agora
            </button>
            <button class="btn btn-secondary py-3 px-4 text-xs font-semibold" onclick="App.openAddFoodModal('lunch')">
              <i data-lucide="utensils" class="w-4 h-4 text-amber-400"></i> Registar Refeição
            </button>
            <button class="btn btn-secondary py-3 px-4 text-xs font-semibold" onclick="App.openLogMetricModal()">
              <i data-lucide="scale" class="w-4 h-4 text-cyan-400"></i> Registar Peso
            </button>
          </div>
        </div>

        <!-- 4 Key Daily Metric Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Calories Card -->
          <div class="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900 cursor-pointer hover:border-emerald-500 transition" onclick="App.switchTab('nutrition')">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Calorias Hoje</span>
              <i data-lucide="flame" class="w-4 h-4 text-emerald-400"></i>
            </div>
            <div class="text-2xl font-black text-slate-100">${totals.calories} <span class="text-xs font-normal text-slate-400">/ ${targets.calories}</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
              <div class="bg-emerald-400 h-full rounded-full transition-all duration-500" style="width: ${calPct}%"></div>
            </div>
            <div class="text-[11px] text-slate-400 mt-1.5 flex justify-between">
              <span>${calRemaining} kcal restantes</span>
              <span class="text-emerald-400 font-bold">${calPct}%</span>
            </div>
          </div>

          <!-- Protein Card -->
          <div class="glass-card p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900 cursor-pointer hover:border-cyan-500 transition" onclick="App.switchTab('nutrition')">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Proteína</span>
              <i data-lucide="target" class="w-4 h-4 text-cyan-400"></i>
            </div>
            <div class="text-2xl font-black text-slate-100">${totals.protein} <span class="text-xs font-normal text-slate-400">/ ${targets.protein}g</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
              <div class="bg-cyan-400 h-full rounded-full transition-all duration-500" style="width: ${pPct}%"></div>
            </div>
            <div class="text-[11px] text-slate-400 mt-1.5 flex justify-between">
              <span>${Math.max(0, targets.protein - totals.protein)}g restantes</span>
              <span class="text-cyan-400 font-bold">${pPct}%</span>
            </div>
          </div>

          <!-- Weight & Body Card -->
          <div class="glass-card p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 to-slate-900 cursor-pointer hover:border-indigo-500 transition" onclick="App.switchTab('metrics')">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Peso Corporal</span>
              <i data-lucide="activity" class="w-4 h-4 text-indigo-400"></i>
            </div>
            <div class="text-2xl font-black text-slate-100">${latestMetric.weightKg} <span class="text-xs font-normal text-slate-400">kg</span></div>
            <div class="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Tendência Positiva</span>
            </div>
            <div class="text-[11px] text-indigo-400 font-semibold mt-1">Ver gráficos de evolução →</div>
          </div>

          <!-- Streak & Consistency Card -->
          <div class="glass-card p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-900 cursor-pointer hover:border-amber-500 transition" onclick="App.switchTab('analytics')">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Sequência</span>
              <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i>
            </div>
            <div class="text-2xl font-black text-slate-100">${streak} <span class="text-xs font-normal text-slate-400">Dias</span></div>
            <div class="text-[11px] text-amber-400 font-semibold mt-2 flex items-center gap-1">
              <span>🔥 Consistência de Elite</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">Ver Hall de PRs →</div>
          </div>
        </div>

        <!-- Middle Section: Load Progression Highlight & Nutrition Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Exercise Load Evolution Quick Chart -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 lg:col-span-2 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                  <i data-lucide="trending-up" class="w-4 h-4 text-emerald-400"></i> Evolução de Cargas & 1RM
                </h3>
                <p class="text-xs text-slate-400">Acompanha o aumento contínuo de força ao longo do tempo.</p>
              </div>
              <div class="flex items-center gap-2">
                <select id="dashboard-exercise-select" class="bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-slate-200 font-semibold outline-none cursor-pointer" onchange="ChartManager.renderExerciseProgress('chart-dashboard-exercise', this.value)">
                  <option value="ex_bench_press">Supino Reto com Barra</option>
                  <option value="ex_squat">Agachamento Livre</option>
                  <option value="ex_deadlift">Levantamento Terra</option>
                  <option value="ex_overhead_press">Press Militar (OHP)</option>
                  <option value="ex_incline_dumbbell_press">Supino Inclinado Halteres</option>
                  <option value="ex_barbell_curl">Curl com Barra EZ</option>
                </select>
              </div>
            </div>

            <div class="h-64">
              <canvas id="chart-dashboard-exercise"></canvas>
            </div>
          </div>

          <!-- Today's Macro Donut & Water Quick Track -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                  <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-400"></i> Divisão de Macros
                </h3>
                <span class="text-xs text-slate-400">Hoje</span>
              </div>
              <div class="h-44 relative flex items-center justify-center">
                <canvas id="chart-dashboard-macros"></canvas>
              </div>
            </div>

            <!-- Quick Water Block -->
            <div class="bg-slate-800/60 p-3.5 rounded-xl border border-cyan-500/20">
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="font-bold text-cyan-400 flex items-center gap-1"><i data-lucide="droplet" class="w-3.5 h-3.5"></i> Água</span>
                <span class="text-slate-300 font-semibold">${totals.waterMl || 0} / ${targets.waterMl} ml</span>
              </div>
              <div class="w-full bg-slate-700/60 h-1.5 rounded-full overflow-hidden mb-2.5">
                <div class="bg-cyan-400 h-full rounded-full transition-all duration-300" style="width: ${wPct}%"></div>
              </div>
              <div class="flex items-center gap-2">
                <button class="btn btn-secondary flex-1 text-xs py-1" onclick="NutritionManager.addWater(250)">+250ml</button>
                <button class="btn btn-secondary flex-1 text-xs py-1" onclick="NutritionManager.addWater(500)">+500ml</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Grid: Recent Workouts & Top PRs -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Recent Workout Highlight -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-slate-100 text-sm flex items-center gap-2">
                <i data-lucide="dumbbell" class="w-4 h-4 text-emerald-400"></i> Última Sessão de Treino
              </h4>
              <button class="text-xs text-emerald-400 hover:text-emerald-300 font-semibold" onclick="App.switchTab('gym')">Ver Todos →</button>
            </div>

            ${lastWorkout ? `
              <div class="glass-card p-4 rounded-xl border border-slate-800 space-y-2">
                <div class="flex items-center justify-between">
                  <h5 class="font-bold text-slate-100 text-base">${lastWorkout.name}</h5>
                  <span class="badge badge-emerald text-xs">${lastWorkout.date}</span>
                </div>
                <p class="text-xs text-slate-400 italic">${lastWorkout.notes || 'Sessão concluída com sucesso.'}</p>
                <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                  ${(lastWorkout.exercises || []).map(ex => {
                    const maxW = (ex.sets && ex.sets.length > 0) ? Math.max(0, ...ex.sets.map(s => s.weightKg || 0)) : 0;
                    return `
                      <span class="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                        ${ex.exerciseName}: <strong class="text-emerald-400">${maxW}kg</strong>
                      </span>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : '<div class="text-xs text-slate-500 py-6 text-center">Nenhum treino concluído ainda.</div>'}
          </div>

          <!-- Top Personal Records -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-slate-100 text-sm flex items-center gap-2">
                <i data-lucide="award" class="w-4 h-4 text-amber-400"></i> Recordes Pessoais em Destaque
              </h4>
              <button class="text-xs text-amber-400 hover:text-amber-300 font-semibold" onclick="App.switchTab('analytics')">Hall Completo →</button>
            </div>

            <div class="space-y-2">
              ${topPRs.map(pr => `
                <div class="glass-card p-3 rounded-xl flex items-center justify-between text-xs hover:border-amber-500/30 transition">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                      🏆
                    </div>
                    <div>
                      <span class="font-bold text-slate-200 block">${pr.exerciseName}</span>
                      <span class="text-[10px] text-slate-500">${pr.category} · ${pr.date}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="font-black text-amber-400 text-sm">${pr.maxWeight} kg</span>
                    <span class="block text-[10px] text-cyan-400">1RM: ${pr.best1RM} kg</span>
                  </div>
                </div>
              `).join('') || '<div class="text-xs text-slate-500 py-4 text-center">Sem recordes registados.</div>'}
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Render interactive charts after DOM paints
    setTimeout(() => {
      ChartManager.renderExerciseProgress('chart-dashboard-exercise', 'ex_bench_press');
      ChartManager.renderMacroDonut('chart-dashboard-macros', totals.protein, totals.carbs, totals.fat);
    }, 50);
  },

  // Modal Management
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    if (window.lucide) window.lucide.createIcons();
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.classList.add('hidden');
      m.classList.remove('flex');
    });
  },

  // Open Exercise Progress / Evolution Modal with Dropdown Selector
  openExerciseProgressModal(selectedExerciseId = 'ex_bench_press') {
    const exercises = StorageManager.get(STORAGE_KEYS.EXERCISES, []);
    const modalContent = document.getElementById('modal-exercise-progress-content');
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
              <i data-lucide="line-chart" class="w-5 h-5 text-indigo-400"></i> Evolução Temporal de Cargas
            </h3>
            <p class="text-xs text-slate-400">Visualiza o histórico de cargas e 1RM estimado sessão a sessão.</p>
          </div>
          <button class="text-slate-400 hover:text-white p-1" onclick="App.closeModal('modal-exercise-progress')">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div>
          <label class="text-xs font-bold text-slate-300 block mb-1">Selecionar Exercício:</label>
          <select id="modal-exercise-picker" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-slate-100 font-semibold outline-none focus:border-indigo-500" onchange="ChartManager.renderExerciseProgress('modal-chart-exercise', this.value)">
            ${exercises.map(e => `
              <option value="${e.id}" ${e.id === selectedExerciseId ? 'selected' : ''}>${e.name} (${e.category})</option>
            `).join('')}
          </select>
        </div>

        <div class="h-72 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          <canvas id="modal-chart-exercise"></canvas>
        </div>
      </div>
    `;

    this.openModal('modal-exercise-progress');
    setTimeout(() => {
      ChartManager.renderExerciseProgress('modal-chart-exercise', selectedExerciseId);
    }, 50);
  },

  openExerciseChartModal(exerciseId) {
    this.openExerciseProgressModal(exerciseId);
  },

  // Add Food Modal with searchable DB & dynamic quantity scaler
  openAddFoodModal(mealKey = 'lunch') {
    this.selectedMealForAdd = mealKey;
    const foods = StorageManager.get(STORAGE_KEYS.FOODS, []);
    const modalContent = document.getElementById('modal-add-food-content');
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
              <i data-lucide="utensils" class="w-5 h-5 text-amber-400"></i> Adicionar Alimento a ${NutritionManager.getMealTitle(mealKey)}
            </h3>
            <p class="text-xs text-slate-400">Pesquisa na base de dados ou cria um alimento personalizado.</p>
          </div>
          <button class="text-slate-400 hover:text-white p-1" onclick="App.closeModal('modal-add-food')">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="relative">
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
          <input type="text" id="food-search-input" placeholder="Pesquisar alimento (ex: frango, aveia, arroz...)" 
            class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-amber-500"
            oninput="App.filterFoodList(this.value)" />
        </div>

        <!-- Foods List -->
        <div id="food-search-results" class="max-h-60 overflow-y-auto space-y-2 pr-1">
          ${this.renderFoodListItems(foods)}
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800">
          <button class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold" onclick="App.closeModal('modal-add-food'); App.openNewFoodModal();">
            + Criar Novo Alimento Customizado
          </button>
          <button class="btn btn-ghost text-xs py-1.5 px-3" onclick="App.closeModal('modal-add-food')">Fechar</button>
        </div>
      </div>
    `;

    this.openModal('modal-add-food');
  },

  renderFoodListItems(foods) {
    return foods.map(f => `
      <div class="glass-card p-3 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-amber-500/40 transition">
        <div class="flex-1">
          <span class="font-bold text-slate-200 block text-sm">${f.name}</span>
          <span class="text-[11px] text-slate-400">
            ${f.calories} kcal / ${f.servingSize}${f.unit} · <strong class="text-cyan-400">${f.protein}g P</strong> · <strong class="text-amber-400">${f.carbs}g C</strong> · <strong class="text-rose-400">${f.fat}g G</strong>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <input type="number" id="qty_${f.id}" value="${f.servingSize}" class="w-16 bg-slate-800 border border-slate-700 rounded-lg py-1 px-2 text-center text-slate-100 font-bold text-xs" />
          <span class="text-[11px] text-slate-400">${f.unit}</span>
          <button class="btn btn-primary text-xs py-1.5 px-3" onclick="const q = parseFloat(document.getElementById('qty_${f.id}').value) || ${f.servingSize}; NutritionManager.addFoodToMeal('${this.selectedMealForAdd}', '${f.id}', q); App.closeModal('modal-add-food');">
            Adicionar
          </button>
        </div>
      </div>
    `).join('');
  },

  filterFoodList(query) {
    const foods = StorageManager.get(STORAGE_KEYS.FOODS, []);
    const q = query.toLowerCase().trim();
    const filtered = foods.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
    const container = document.getElementById('food-search-results');
    if (container) {
      container.innerHTML = this.renderFoodListItems(filtered);
    }
  },

  // Quick Add Food Modal
  openQuickAddModal(mealKey = 'lunch') {
    const modalContent = document.getElementById('modal-quick-add-content');
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
            <i data-lucide="zap" class="w-5 h-5 text-amber-400"></i> Adição Rápida de Calorias (${NutritionManager.getMealTitle(mealKey)})
          </h3>
          <button class="text-slate-400 hover:text-white p-1" onclick="App.closeModal('modal-quick-add')">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Descrição / Nome do Alimento:</label>
            <input type="text" id="quick-food-name" value="Refeição Rápida" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 font-semibold" />
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Calorias (kcal) *:</label>
            <input type="number" id="quick-food-cal" placeholder="ex: 450" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 font-bold" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-cyan-400 font-semibold mb-1">Proteína (g):</label>
              <input type="number" id="quick-food-p" placeholder="0" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
            <div>
              <label class="block text-amber-400 font-semibold mb-1">Hidratos (g):</label>
              <input type="number" id="quick-food-c" placeholder="0" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
            <div>
              <label class="block text-rose-400 font-semibold mb-1">Gorduras (g):</label>
              <input type="number" id="quick-food-f" placeholder="0" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
          </div>
        </div>

        <button class="btn btn-primary w-full py-2.5 font-bold text-sm" onclick="
          const name = document.getElementById('quick-food-name').value;
          const cal = document.getElementById('quick-food-cal').value;
          const p = document.getElementById('quick-food-p').value;
          const c = document.getElementById('quick-food-c').value;
          const f = document.getElementById('quick-food-f').value;
          if (!cal) { alert('Insira as calorias.'); return; }
          NutritionManager.addQuickCalories('${mealKey}', name, cal, p, c, f);
          App.closeModal('modal-quick-add');
        ">
          Adicionar à Refeição
        </button>
      </div>
    `;

    this.openModal('modal-quick-add');
  },

  // Create New Food Modal
  openNewFoodModal() {
    const modalContent = document.getElementById('modal-new-food-content');
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-5 h-5 text-emerald-400"></i> Criar Alimento Personalizado
          </h3>
          <button class="text-slate-400 hover:text-white p-1" onclick="App.closeModal('modal-new-food')">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Nome do Alimento *:</label>
            <input type="text" id="new-food-name" placeholder="ex: Barra Proteica Caseira" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Porção Padrão (ex: 100):</label>
              <input type="number" id="new-food-serving" value="100" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Unidade (g, ml, un):</label>
              <input type="text" id="new-food-unit" value="g" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Calorias (kcal) por porção *:</label>
            <input type="number" id="new-food-cal" placeholder="ex: 250" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 font-bold" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-cyan-400 font-semibold mb-1">Proteína (g):</label>
              <input type="number" step="0.1" id="new-food-p" placeholder="0" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
            <div>
              <label class="block text-amber-400 font-semibold mb-1">Hidratos (g):</label>
              <input type="number" step="0.1" id="new-food-c" placeholder="0" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
            <div>
              <label class="block text-rose-400 font-semibold mb-1">Gordura (g):</label>
              <input type="number" step="0.1" id="new-food-f" placeholder="0" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-emerald-400 font-semibold mb-1">Fibras (g):</label>
              <input type="number" step="0.1" id="new-food-fiber" placeholder="0" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
            <div>
              <label class="block text-indigo-400 font-semibold mb-1">Sódio (mg):</label>
              <input type="number" id="new-food-sodium" placeholder="0" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
          </div>
        </div>

        <button class="btn btn-primary w-full py-2.5 font-bold text-sm" onclick="
          const name = document.getElementById('new-food-name').value;
          const cal = parseFloat(document.getElementById('new-food-cal').value);
          if (!name || isNaN(cal)) { alert('Nome e Calorias são obrigatórios.'); return; }
          const foods = StorageManager.get(STORAGE_KEYS.FOODS, []);
          const newF = {
            id: 'food_custom_' + Date.now(),
            name: name.trim(),
            servingSize: parseFloat(document.getElementById('new-food-serving').value) || 100,
            unit: document.getElementById('new-food-unit').value || 'g',
            calories: cal,
            protein: parseFloat(document.getElementById('new-food-p').value) || 0,
            carbs: parseFloat(document.getElementById('new-food-c').value) || 0,
            fat: parseFloat(document.getElementById('new-food-f').value) || 0,
            fiber: parseFloat(document.getElementById('new-food-fiber').value) || 0,
            sodium: parseFloat(document.getElementById('new-food-sodium').value) || 0,
            category: 'Personalizado'
          };
          foods.push(newF);
          StorageManager.set(STORAGE_KEYS.FOODS, foods);
          App.showToast(`Alimento \"${newF.name}\" guardado na base de dados!`, 'success');
          App.closeModal('modal-new-food');
        ">
          Guardar Alimento
        </button>
      </div>
    `;

    this.openModal('modal-new-food');
  },

  // Exercise Picker Modal for Active Workout
  openAddExercisePickerModal() {
    const exercises = StorageManager.get(STORAGE_KEYS.EXERCISES, []);
    const modalContent = document.getElementById('modal-exercise-picker-content');
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
            <i data-lucide="dumbbell" class="w-5 h-5 text-emerald-400"></i> Escolher Exercício para o Treino
          </h3>
          <button class="text-slate-400 hover:text-white p-1" onclick="App.closeModal('modal-exercise-picker')">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <input type="text" id="exercise-search-input" placeholder="Pesquisar exercício por nome ou grupo muscular..." 
          class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
          oninput="App.filterExerciseList(this.value)" />

        <div id="exercise-list-container" class="max-h-64 overflow-y-auto space-y-2 pr-1">
          ${this.renderExerciseListItems(exercises)}
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800">
          <button class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold" onclick="App.closeModal('modal-exercise-picker'); App.openNewExerciseModal();">
            + Criar Novo Exercício Customizado
          </button>
          <button class="btn btn-ghost text-xs py-1.5 px-3" onclick="App.closeModal('modal-exercise-picker')">Fechar</button>
        </div>
      </div>
    `;

    this.openModal('modal-exercise-picker');
  },

  renderExerciseListItems(exercises) {
    return exercises.map(ex => `
      <div class="glass-card p-3 rounded-xl flex items-center justify-between text-xs hover:border-emerald-500/40 transition">
        <div>
          <span class="font-bold text-slate-200 block text-sm">${ex.name}</span>
          <span class="text-[11px] text-slate-400">${ex.category} · ${ex.primaryMuscle} (${ex.equipment})</span>
        </div>
        <button class="btn btn-primary text-xs py-1.5 px-3" onclick="WorkoutManager.addExerciseToActive('${ex.id}'); App.closeModal('modal-exercise-picker');">
          + Adicionar
        </button>
      </div>
    `).join('');
  },

  filterExerciseList(query) {
    const exercises = StorageManager.get(STORAGE_KEYS.EXERCISES, []);
    const q = query.toLowerCase().trim();
    const filtered = exercises.filter(e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.primaryMuscle.toLowerCase().includes(q));
    const container = document.getElementById('exercise-list-container');
    if (container) {
      container.innerHTML = this.renderExerciseListItems(filtered);
    }
  },

  // Create New Custom Exercise Modal
  openNewExerciseModal() {
    const modalContent = document.getElementById('modal-new-exercise-content');
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-5 h-5 text-indigo-400"></i> Criar Novo Exercício
          </h3>
          <button class="text-slate-400 hover:text-white p-1" onclick="App.closeModal('modal-new-exercise')">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Nome do Exercício *:</label>
            <input type="text" id="new-ex-name" placeholder="ex: Supino Inclinado na Máquina Smith" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Categoria / Grupo:</label>
              <select id="new-ex-cat" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100">
                <option value="Peito">Peito</option>
                <option value="Costas">Costas</option>
                <option value="Pernas">Pernas</option>
                <option value="Ombros">Ombros</option>
                <option value="Braços">Braços</option>
                <option value="Abdominais">Abdominais</option>
                <option value="Cardio">Cardio</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Equipamento:</label>
              <select id="new-ex-eq" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100">
                <option value="Barra">Barra</option>
                <option value="Halteres">Halteres</option>
                <option value="Máquina">Máquina</option>
                <option value="Polia">Polia</option>
                <option value="Peso Corporal">Peso Corporal</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Músculo Principal Alvo:</label>
            <input type="text" id="new-ex-muscle" placeholder="ex: Peitoral Superior" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
          </div>
        </div>

        <button class="btn btn-primary w-full py-2.5 font-bold text-sm" onclick="
          const name = document.getElementById('new-ex-name').value;
          if (!name) { alert('Insere o nome do exercício.'); return; }
          const exercises = StorageManager.get(STORAGE_KEYS.EXERCISES, []);
          const newEx = {
            id: 'ex_custom_' + Date.now(),
            name: name.trim(),
            category: document.getElementById('new-ex-cat').value,
            primaryMuscle: document.getElementById('new-ex-muscle').value || 'Geral',
            equipment: document.getElementById('new-ex-eq').value,
            isCustom: true
          };
          exercises.push(newEx);
          StorageManager.set(STORAGE_KEYS.EXERCISES, exercises);
          App.showToast(`Exercício \"${newEx.name}\" criado com sucesso!`, 'success');
          App.closeModal('modal-new-exercise');
        ">
          Guardar Exercício
        </button>
      </div>
    `;

    this.openModal('modal-new-exercise');
  },

  // Log Metric Modal
  openLogMetricModal() {
    const modalContent = document.getElementById('modal-log-metric-content');
    if (!modalContent) return;

    const profile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);
    const metrics = StorageManager.get(STORAGE_KEYS.BODY_METRICS, []);
    const latest = metrics[0] || { weightKg: profile.weightKg, bodyFatPct: 15, measurements: {} };
    const todayStr = new Date().toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
            <i data-lucide="scale" class="w-5 h-5 text-cyan-400"></i> Registar Pesagem & Medidas
          </h3>
          <button class="text-slate-400 hover:text-white p-1" onclick="App.closeModal('modal-log-metric')">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Data da Medição:</label>
              <input type="date" id="metric-date" value="${todayStr}" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
            <div>
              <label class="block text-cyan-400 font-bold mb-1">Peso Corporal (kg) *:</label>
              <input type="number" step="0.1" id="metric-weight" value="${latest.weightKg || ''}" placeholder="ex: 76.5" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 font-black text-sm" />
            </div>
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">% Gordura Corporal (Opcional):</label>
            <input type="number" step="0.1" id="metric-bodyfat" value="${latest.bodyFatPct || ''}" placeholder="ex: 15.2" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
          </div>

          <div class="border-t border-slate-800 pt-2">
            <label class="block text-slate-400 font-bold mb-2 uppercase text-[10px]">Medidas de Fita Métrica (cm - Opcional):</label>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-slate-400 text-[10px] mb-0.5">Cintura (cm):</label>
                <input type="number" step="0.5" id="metric-waist" value="${latest.measurements?.waistCm || ''}" placeholder="ex: 83" class="w-full bg-slate-800 border border-slate-700 rounded-lg py-1 px-2 text-slate-100" />
              </div>
              <div>
                <label class="block text-slate-400 text-[10px] mb-0.5">Braço D. (cm):</label>
                <input type="number" step="0.5" id="metric-arms" value="${latest.measurements?.armsRightCm || ''}" placeholder="ex: 38.5" class="w-full bg-slate-800 border border-slate-700 rounded-lg py-1 px-2 text-slate-100" />
              </div>
              <div>
                <label class="block text-slate-400 text-[10px] mb-0.5">Peito (cm):</label>
                <input type="number" step="0.5" id="metric-chest" value="${latest.measurements?.chestCm || ''}" placeholder="ex: 104" class="w-full bg-slate-800 border border-slate-700 rounded-lg py-1 px-2 text-slate-100" />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">Notas / Sensação:</label>
            <input type="text" id="metric-notes" placeholder="ex: Pesagem em jejum matinal" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
          </div>
        </div>

        <button class="btn btn-primary w-full py-2.5 font-bold text-sm" onclick="
          const date = document.getElementById('metric-date').value;
          const w = parseFloat(document.getElementById('metric-weight').value);
          if (!w) { alert('Insira o peso.'); return; }
          MetricsManager.logMetric({
            date: date,
            weightKg: w,
            bodyFatPct: parseFloat(document.getElementById('metric-bodyfat').value) || null,
            chestCm: parseFloat(document.getElementById('metric-chest').value) || null,
            waistCm: parseFloat(document.getElementById('metric-waist').value) || null,
            armsRightCm: parseFloat(document.getElementById('metric-arms').value) || null,
            notes: document.getElementById('metric-notes').value || ''
          });
          App.closeModal('modal-log-metric');
        ">
          Guardar Medição
        </button>
      </div>
    `;

    this.openModal('modal-log-metric');
  },

  // TDEE Calculator Modal
  openTDEECalculatorModal() {
    const modalContent = document.getElementById('modal-tdee-content');
    if (!modalContent) return;

    const profile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);

    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
            <i data-lucide="calculator" class="w-5 h-5 text-indigo-400"></i> Calculadora de TDEE & Metas Diárias
          </h3>
          <button class="text-slate-400 hover:text-white p-1" onclick="App.closeModal('modal-tdee')">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Idade:</label>
            <input type="number" id="calc-age" value="${profile.age || 26}" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 font-bold" />
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Género:</label>
            <select id="calc-gender" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100">
              <option value="male" ${profile.gender === 'male' ? 'selected' : ''}>Masculino</option>
              <option value="female" ${profile.gender === 'female' ? 'selected' : ''}>Feminino</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Altura (cm):</label>
            <input type="number" id="calc-height" value="${profile.heightCm || 178}" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 font-bold" />
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Peso (kg):</label>
            <input type="number" step="0.1" id="calc-weight" value="${profile.weightKg || 75.8}" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 font-bold" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Nível de Atividade:</label>
            <select id="calc-activity" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100">
              <option value="sedentary">Sedentário (Trabalho de secretária)</option>
              <option value="light">Leve (1-3 treinos/semana)</option>
              <option value="moderate" selected>Moderado (3-5 treinos intensos/semana)</option>
              <option value="heavy">Intenso (6-7 treinos/semana)</option>
              <option value="extreme">Extremo (Atleta / Trabalho Físico)</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Objetivo Atual:</label>
            <select id="calc-goal" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100">
              <option value="cut">Perda de Gordura (Défice ~450 kcal)</option>
              <option value="maintain">Manutenção de Peso</option>
              <option value="lean_bulk" selected>Ganho Limpo / Lean Bulk (+250 kcal)</option>
              <option value="heavy_bulk">Bulking Intenso (+450 kcal)</option>
            </select>
          </div>
        </div>

        <!-- Calculated Result Box -->
        <div id="calc-result-box" class="glass-card p-4 rounded-2xl border border-indigo-500/40 bg-indigo-950/20 text-xs space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-300">Calorias Recomendadas:</span>
            <span id="calc-res-cal" class="text-xl font-black text-emerald-400">2450 kcal</span>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-500/20 text-center">
            <div>
              <span class="text-slate-400 block text-[10px]">Proteína</span>
              <strong id="calc-res-p" class="text-cyan-400 font-bold">170g</strong>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Hidratos</span>
              <strong id="calc-res-c" class="text-amber-400 font-bold">265g</strong>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Gordura</span>
              <strong id="calc-res-f" class="text-rose-400 font-bold">65g</strong>
            </div>
          </div>
        </div>

        <button class="btn btn-primary w-full py-2.5 font-bold text-sm" onclick="App.applyCalculatedTargets()">
          Aplicar como Minhas Metas Diárias
        </button>
      </div>
    `;

    // Add recalculation on change
    const update = () => {
      const a = parseInt(document.getElementById('calc-age').value) || 26;
      const g = document.getElementById('calc-gender').value;
      const h = parseFloat(document.getElementById('calc-height').value) || 178;
      const w = parseFloat(document.getElementById('calc-weight').value) || 75.8;
      const act = document.getElementById('calc-activity').value;
      const goal = document.getElementById('calc-goal').value;

      const res = NutritionManager.calculateTDEE(a, g, h, w, act, goal);
      document.getElementById('calc-res-cal').textContent = `${res.targetCalories} kcal`;
      document.getElementById('calc-res-p').textContent = `${res.proteinG}g`;
      document.getElementById('calc-res-c').textContent = `${res.carbsG}g`;
      document.getElementById('calc-res-f').textContent = `${res.fatG}g`;
    };

    ['calc-age', 'calc-gender', 'calc-height', 'calc-weight', 'calc-activity', 'calc-goal'].forEach(id => {
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', update);
      }, 50);
    });

    this.openModal('modal-tdee');
  },

  applyCalculatedTargets() {
    const a = parseInt(document.getElementById('calc-age').value) || 26;
    const g = document.getElementById('calc-gender').value;
    const h = parseFloat(document.getElementById('calc-height').value) || 178;
    const w = parseFloat(document.getElementById('calc-weight').value) || 75.8;
    const act = document.getElementById('calc-activity').value;
    const goal = document.getElementById('calc-goal').value;

    const res = NutritionManager.calculateTDEE(a, g, h, w, act, goal);

    const profile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);
    profile.age = a;
    profile.gender = g;
    profile.heightCm = h;
    profile.weightKg = w;
    profile.activityLevel = act;
    profile.goal = goal;
    profile.dailyTargets = {
      ...profile.dailyTargets,
      calories: res.targetCalories,
      protein: res.proteinG,
      carbs: res.carbsG,
      fat: res.fatG
    };

    StorageManager.set(STORAGE_KEYS.USER_PROFILE, profile);
    this.closeModal('modal-tdee');
    NutritionManager.renderNutritionView();
    this.updateDashboard();
    this.showToast('Novas metas nutricionais aplicadas com sucesso!', 'success');
  },

  // Export Workouts CSV
  exportWorkoutsCSV() {
    const csvContent = StorageManager.exportWorkoutsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `apexpulse_treinos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Ficheiro CSV de treinos descarregado!', 'success');
  },

  // Export JSON Backup
  exportJSONBackup() {
    const jsonStr = StorageManager.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `apexpulse_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Backup JSON completo guardado!', 'success');
  },

  // Trigger Import JSON
  importJSONBackup(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = StorageManager.importBackup(e.target.result);
      if (res.success) {
        this.showToast('Backup restaurado com sucesso! A recarregar...', 'success');
        setTimeout(() => location.reload(), 1200);
      } else {
        alert('Erro ao importar backup: ' + res.error);
      }
    };
    reader.readAsText(file);
  },

  // Reset to Factory Sample Data
  resetAllData() {
    if (!confirm('Atenção: Todos os dados serão repostos para o estado inicial de demonstração. Desejas continuar?')) return;
    StorageManager.resetAll();
    this.showToast('Dados restaurados com sucesso!', 'info');
    setTimeout(() => location.reload(), 800);
  },

  // Render Settings View
  renderSettingsView() {
    const container = document.getElementById('settings-view-container');
    if (!container) return;

    const profile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);

    container.innerHTML = `
      <div class="space-y-6 max-w-3xl mx-auto">
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
            <i data-lucide="user" class="w-5 h-5 text-indigo-400"></i> Perfil do Atleta & Metas
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Nome:</label>
              <input type="text" id="settings-name" value="${profile.name || ''}" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100" />
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Meta Diária de Água (ml):</label>
              <input type="number" id="settings-water" value="${profile.dailyTargets?.waterMl || 3000}" class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 font-bold text-cyan-400" />
            </div>
          </div>

          <div class="pt-2">
            <button class="btn btn-primary text-xs py-2 px-4 font-bold" onclick="
              const profile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);
              profile.name = document.getElementById('settings-name').value;
              profile.dailyTargets.waterMl = parseInt(document.getElementById('settings-water').value) || 3000;
              StorageManager.set(STORAGE_KEYS.USER_PROFILE, profile);
              App.showToast('Perfil atualizado com sucesso!', 'success');
              App.updateDashboard();
            ">
              Guardar Alterações
            </button>
            <button class="btn btn-secondary text-xs py-2 px-4 ml-2 font-semibold" onclick="App.openTDEECalculatorModal()">
              Recalcular Metas Calóricas
            </button>
          </div>
        </div>

        <!-- Backup & Data Persistence Card -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
            <i data-lucide="database" class="w-5 h-5 text-emerald-400"></i> Segurança & Cópia de Segurança (Backup)
          </h3>
          <p class="text-xs text-slate-400">
            Todos os teus treinos, refeições e métricas ficam guardados localmente no teu navegador. Podes exportar ou importar um backup a qualquer momento.
          </p>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <button class="btn btn-secondary text-xs py-2 px-4" onclick="App.exportJSONBackup()">
              <i data-lucide="download" class="w-4 h-4"></i> Exportar Backup JSON
            </button>

            <label class="btn btn-secondary text-xs py-2 px-4 cursor-pointer">
              <i data-lucide="upload" class="w-4 h-4"></i> Importar Backup JSON
              <input type="file" accept=".json" class="hidden" onchange="App.importJSONBackup(this)" />
            </label>

            <button class="btn btn-secondary text-xs py-2 px-4" onclick="App.exportWorkoutsCSV()">
              <i data-lucide="file-text" class="w-4 h-4 text-emerald-400"></i> Exportar CSV Treinos
            </button>
          </div>

          <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <h5 class="text-xs font-bold text-rose-400">Repor Dados de Demonstração</h5>
              <p class="text-[11px] text-slate-500">Recarrega o conjunto de dados iniciais com treinos e histórico.</p>
            </div>
            <button class="btn btn-ghost text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/30" onclick="App.resetAllData()">
              Repor Dados
            </button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  // Install PWA Modal & Guide
  openInstallModal() {
    const modalContent = document.getElementById('modal-install-guide-content');
    if (!modalContent) return;

    const currentUrl = window.location.href;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const wifiUrl = 'http://192.168.50.81:8080/';

    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="icons/icon-192.png" alt="ApexPulse Icon" class="w-10 h-10 rounded-xl shadow-lg border border-emerald-500/30" />
            <div>
              <h3 class="text-lg font-black text-slate-100">Instalar ApexPulse Pro</h3>
              <p class="text-xs text-slate-400">Instala no iPhone, PC ou Android como uma App nativa.</p>
            </div>
          </div>
          <button class="text-slate-400 hover:text-white p-1" onclick="App.closeModal('modal-install-guide')">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Platform Tabs Navigation -->
        <div class="flex border-b border-slate-800 text-xs font-bold gap-2">
          <button id="tab-btn-ios" class="py-2 px-3 border-b-2 border-emerald-400 text-emerald-400" onclick="App.switchInstallTab('ios')">
            📱 iPhone / iPad (iOS)
          </button>
          <button id="tab-btn-pc" class="py-2 px-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200" onclick="App.switchInstallTab('pc')">
            💻 PC / Mac (Desktop)
          </button>
          <button id="tab-btn-cloud" class="py-2 px-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200" onclick="App.switchInstallTab('cloud')">
            ☁️ Acesso Online 24/7
          </button>
        </div>

        <!-- 1. iPhone Tab -->
        <div id="install-guide-ios" class="space-y-3 text-xs">
          <div class="glass-card p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/15 space-y-2.5">
            <div class="font-bold text-slate-200 text-sm flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs inline-flex items-center justify-center font-black">1</span>
              Abre o Safari no iPhone
            </div>
            <p class="text-slate-300">
              No teu iPhone (ligado ao mesmo Wi-Fi de casa), abre o navegador <strong>Safari</strong> e acede a:
            </p>
            <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700 font-mono text-cyan-300 font-bold select-all flex items-center justify-between">
              <span>${wifiUrl}</span>
              <button class="text-xs text-slate-400 hover:text-white" onclick="navigator.clipboard.writeText('${wifiUrl}'); App.showToast('Endereço copiado!', 'info');">Copiar</button>
            </div>
          </div>

          <div class="glass-card p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="font-bold text-slate-200 text-sm flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs inline-flex items-center justify-center font-black">2</span>
              Toca no botão de Partilha 📤
            </div>
            <p class="text-slate-300">Na barra inferior do Safari, clica no ícone de <strong>Partilha</strong> (o quadrado com uma seta para cima 📤).</p>
          </div>

          <div class="glass-card p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="font-bold text-slate-200 text-sm flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs inline-flex items-center justify-center font-black">3</span>
              "Adicionar ao Ecrã Principal" ➕
            </div>
            <p class="text-slate-300">Desce a lista do menu e seleciona <strong>Adicionar ao Ecrã Principal</strong> (Add to Home Screen).</p>
          </div>

          <div class="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-300">
            ✅ <strong>Pronto!</strong> A app passa a abrir diretamente em <strong>ecrã inteiro</strong> como qualquer app nativa da App Store, sem barras do browser e funcionando mesmo sem internet!
          </div>
        </div>

        <!-- 2. PC / Desktop Tab -->
        <div id="install-guide-pc" class="hidden space-y-3 text-xs">
          <div class="glass-card p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/15 space-y-3">
            <h4 class="font-bold text-slate-100 text-sm">Instalar como Aplicação Windows / Mac</h4>
            <p class="text-slate-300">
              Ao instalar no PC, a aplicação ganha um ícone na Barra de Tarefas e no Menu Iniciar, abrindo numa janela dedicada ultrarrápida.
            </p>
            ${this.deferredPrompt ? `
              <button class="btn btn-primary w-full py-2.5 font-bold text-sm" onclick="App.triggerPWAInstall()">
                <i data-lucide="download" class="w-4 h-4"></i> Instalar no Computador Agora
              </button>
            ` : `
              <div class="p-3 bg-slate-900 rounded-lg border border-slate-700 text-slate-300">
                💡 <strong>Como instalar:</strong> No Google Chrome ou Microsoft Edge, clica no ícone <strong>"Instalar ApexPulse"</strong> ⊕ que aparece no canto direito da barra de endereço do navegador.
              </div>
            `}
          </div>
        </div>

        <!-- 3. Cloud / Online Tab -->
        <div id="install-guide-cloud" class="hidden space-y-3 text-xs">
          <div class="glass-card p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 class="font-bold text-slate-100 text-sm">Queres aceder fora de casa (Ginásio, 4G/5G)?</h4>
            <p class="text-slate-300">
              Podes colocar esta pasta online em 1 minuto e obter um link público seguro com HTTPS (ex: <code>https://apexpulse.netlify.app</code>):
            </p>
            <ol class="list-decimal list-inside space-y-1 text-slate-400 pl-1">
              <li>Acede a <strong><a href="https://app.netlify.com/drop" target="_blank" class="text-cyan-400 underline">netlify.com/drop</a></strong> ou <strong><a href="https://vercel.com" target="_blank" class="text-indigo-400 underline">vercel.com</a></strong>.</li>
              <li>Arrasta a pasta <code>C:\\Users\\franc\\.gemini\\antigravity-ide\\scratch\\apexpulse</code> para lá.</li>
              <li>Recebes um link HTTPS instantâneo para abrir e instalar em qualquer telemóvel do mundo!</li>
            </ol>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800 flex justify-end">
          <button class="btn btn-ghost text-xs py-1.5 px-3" onclick="App.closeModal('modal-install-guide')">Fechar</button>
        </div>
      </div>
    `;

    this.openModal('modal-install-guide');
  },

  switchInstallTab(tabKey) {
    ['ios', 'pc', 'cloud'].forEach(k => {
      const guideEl = document.getElementById(`install-guide-${k}`);
      const tabBtn = document.getElementById(`tab-btn-${k}`);
      if (guideEl && tabBtn) {
        if (k === tabKey) {
          guideEl.classList.remove('hidden');
          tabBtn.className = 'py-2 px-3 border-b-2 border-emerald-400 text-emerald-400';
        } else {
          guideEl.classList.add('hidden');
          tabBtn.className = 'py-2 px-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200';
        }
      }
    });
    if (window.lucide) window.lucide.createIcons();
  },

  triggerPWAInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
          this.showToast('ApexPulse instalado com sucesso!', 'success');
        }
        this.deferredPrompt = null;
        this.closeModal('modal-install-guide');
      });
    }
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} flex items-center gap-2.5 shadow-2xl transition-all duration-300 transform translate-y-4 opacity-0`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    else if (type === 'pr') iconName = 'trophy';
    else if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
      <span class="text-xs font-semibold leading-snug">${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    // Trigger animation in
    setTimeout(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    }, 10);

    // Fade out and remove
    setTimeout(() => {
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Expose App globally to window
window.App = App;

// Start immediately or when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
