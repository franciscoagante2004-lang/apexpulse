/**
 * ApexPulse - Achievements, PR Hall of Fame & Streak Engine
 * Tracks user milestones, personal records, badges, and workout/nutrition streaks.
 */

const AchievementsManager = {
  init() {
    this.checkAll();
  },

  checkAll() {
    const achievements = StorageManager.get(STORAGE_KEYS.ACHIEVEMENTS, DEFAULT_ACHIEVEMENTS);
    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    const nutrition = StorageManager.get(STORAGE_KEYS.NUTRITION_LOGS, {});
    const profile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);

    let updated = false;

    achievements.forEach(ach => {
      if (!ach.unlocked) {
        let shouldUnlock = false;

        if (ach.id === 'ach_first_workout' && workouts.length >= 1) {
          shouldUnlock = true;
        } else if (ach.id === 'ach_volume_10k') {
          const has10k = workouts.some(w => {
            let vol = 0;
            w.exercises?.forEach(ex => ex.sets?.forEach(s => {
              if (s.completed && s.weightKg > 0) vol += (s.weightKg * s.reps);
            }));
            return vol >= 10000;
          });
          if (has10k) shouldUnlock = true;
        } else if (ach.id === 'ach_bench_80') {
          const hasBench80 = workouts.some(w => 
            w.exercises?.some(ex => ex.exerciseId === 'ex_bench_press' && ex.sets?.some(s => s.completed && s.weightKg >= 80))
          );
          if (hasBench80) shouldUnlock = true;
        } else if (ach.id === 'ach_squat_100') {
          const hasSquat100 = workouts.some(w => 
            w.exercises?.some(ex => ex.exerciseId === 'ex_squat' && ex.sets?.some(s => s.completed && s.weightKg >= 100))
          );
          if (hasSquat100) shouldUnlock = true;
        } else if (ach.id === 'ach_deadlift_120') {
          const hasDeadlift120 = workouts.some(w => 
            w.exercises?.some(ex => ex.exerciseId === 'ex_deadlift' && ex.sets?.some(s => s.completed && s.weightKg >= 120))
          );
          if (hasDeadlift120) shouldUnlock = true;
        } else if (ach.id === 'ach_streak_7') {
          const dates = Object.keys(nutrition);
          if (dates.length >= 7) shouldUnlock = true;
        }

        if (shouldUnlock) {
          ach.unlocked = true;
          ach.unlockedAt = new Date().toISOString().split('T')[0];
          updated = true;
          this.celebrateUnlock(ach);
        }
      }
    });

    if (updated) {
      StorageManager.set(STORAGE_KEYS.ACHIEVEMENTS, achievements);
    }
  },

  celebrateUnlock(ach) {
    if (window.confetti) {
      window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }
    App.showToast(`🏆 Conquista Desbloqueada: ${ach.title}!`, 'pr');
  },

  // Calculate current streak of tracked days
  getStreakDays() {
    const nutrition = StorageManager.get(STORAGE_KEYS.NUTRITION_LOGS, {});
    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    
    const activeDates = new Set();
    Object.keys(nutrition).forEach(d => activeDates.add(d));
    workouts.forEach(w => activeDates.add(w.date));

    let streak = 0;
    const checkDate = new Date();

    for (let i = 0; i < 60; i++) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (activeDates.has(dStr)) {
        streak++;
      } else if (i > 0) {
        // If today not yet logged, don't break on day 0
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return Math.max(1, streak);
  },

  // Get Top PRs
  getAllPRs() {
    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    const exercises = StorageManager.get(STORAGE_KEYS.EXERCISES, []);
    const prMap = {};

    workouts.forEach(w => {
      w.exercises?.forEach(ex => {
        if (!prMap[ex.exerciseId]) {
          const exObj = exercises.find(e => e.id === ex.exerciseId);
          prMap[ex.exerciseId] = {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName || exObj?.name || 'Exercício',
            category: exObj?.category || 'Geral',
            maxWeight: 0,
            best1RM: 0,
            bestSetReps: 0,
            date: w.date
          };
        }

        ex.sets?.forEach(s => {
          if (s.completed && s.weightKg > 0) {
            const est1RM = s.reps > 1 ? s.weightKg * (1 + s.reps / 30) : s.weightKg;
            if (est1RM > prMap[ex.exerciseId].best1RM) {
              prMap[ex.exerciseId].best1RM = Math.round(est1RM * 10) / 10;
              prMap[ex.exerciseId].maxWeight = s.weightKg;
              prMap[ex.exerciseId].bestSetReps = s.reps;
              prMap[ex.exerciseId].date = w.date;
            }
          }
        });
      });
    });

    return Object.values(prMap).filter(p => p.maxWeight > 0).sort((a, b) => b.best1RM - a.best1RM);
  },

  // Render Achievements & PRs View UI
  renderAchievementsView() {
    const container = document.getElementById('analytics-view-container');
    if (!container) return;

    const achievements = StorageManager.get(STORAGE_KEYS.ACHIEVEMENTS, DEFAULT_ACHIEVEMENTS);
    const prs = this.getAllPRs();
    const streak = this.getStreakDays();

    // Badges HTML
    const badgesHtml = achievements.map(ach => `
      <div class="glass-card p-4 rounded-2xl border ${ach.unlocked ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/20 to-slate-900' : 'border-slate-800/60 opacity-60'} transition hover:scale-[1.02]">
        <div class="flex items-start gap-3.5">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${ach.unlocked ? 'bg-amber-500/20 text-amber-400 shadow-md shadow-amber-500/20' : 'bg-slate-800 text-slate-600'}">
            <i data-lucide="${ach.icon || 'award'}" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-slate-100 text-sm">${ach.title}</h4>
              ${ach.unlocked ? '<span class="badge badge-amber text-[10px]">Desbloqueada</span>' : '<span class="badge badge-slate text-[10px]">Bloqueada</span>'}
            </div>
            <p class="text-xs text-slate-400 mt-1">${ach.desc}</p>
            ${ach.unlockedAt ? `<span class="text-[10px] text-amber-400/80 font-mono mt-1 block">Conquistada em ${ach.unlockedAt}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    // PRs Table
    const prRows = prs.map(p => `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/30 text-xs">
        <td class="py-3 px-3 font-semibold text-slate-100 flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          ${p.exerciseName}
        </td>
        <td class="py-3 px-3 text-slate-400">${p.category}</td>
        <td class="py-3 px-3 font-extrabold text-amber-400">${p.maxWeight} kg <span class="text-[11px] font-normal text-slate-400">(${p.bestSetReps} reps)</span></td>
        <td class="py-3 px-3 font-extrabold text-cyan-400">${p.best1RM} kg</td>
        <td class="py-3 px-3 text-slate-400 font-mono text-[11px]">${p.date}</td>
        <td class="py-3 px-3 text-right">
          <button class="btn btn-ghost text-xs py-1 px-2 text-indigo-400 hover:text-indigo-300" onclick="App.openExerciseChartModal('${p.exerciseId}')">
            <i data-lucide="line-chart" class="w-3.5 h-3.5 inline"></i> Evolução
          </button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Banner Streak & Motivation -->
        <div class="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">
              🔥
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-black text-slate-100">Sequência Ativa: ${streak} Dias</h3>
                <span class="badge badge-amber text-xs font-bold">FOGO TOTAL</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Mantém a consistência no treino e na dieta. Cada repetição aproxima-te do teu objetivo!</p>
            </div>
          </div>
          <button class="btn btn-primary py-2.5 px-4 text-xs font-bold" onclick="App.openExerciseProgressModal()">
            <i data-lucide="trending-up" class="w-4 h-4"></i> Comparar Evolução
          </button>
        </div>

        <!-- PR Board -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-slate-100 text-sm md:text-base flex items-center gap-2">
              <i data-lucide="trophy" class="w-4 h-4 text-amber-400"></i> Quadro de Recordes Pessoais (PRs & 1RM)
            </h4>
            <span class="text-xs text-slate-400">${prs.length} exercícios com marcas registadas</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <th class="py-2.5 px-3">Exercício</th>
                  <th class="py-2.5 px-3">Categoria</th>
                  <th class="py-2.5 px-3">Carga Recorde</th>
                  <th class="py-2.5 px-3">1RM Estimado</th>
                  <th class="py-2.5 px-3">Data do Recorde</th>
                  <th class="py-2.5 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                ${prRows || '<tr><td colspan="6" class="text-center py-6 text-slate-500 text-xs">Sem treinos registados.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Badges Grid -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-slate-100 text-sm md:text-base flex items-center gap-2">
              <i data-lucide="award" class="w-4 h-4 text-indigo-400"></i> Conquistas & Medalhas Desbloqueadas
            </h4>
            <span class="text-xs text-slate-400">${achievements.filter(a => a.unlocked).length} de ${achievements.length} conquistadas</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${badgesHtml}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }
};

window.AchievementsManager = AchievementsManager;
