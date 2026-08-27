/**
 * ApexPulse - Workout Tracking & Load Progression Engine
 * Handles active workouts, sets/reps/load logging, rest timer with sound, PR detection, and templates.
 */

const WorkoutManager = {
  activeWorkout: null,
  timerInterval: null,
  restTimerInterval: null,
  restTimeRemaining: 0,
  restTimeTotal: 90,

  init() {
    // Restore active workout if any was in progress
    const saved = StorageManager.get(STORAGE_KEYS.ACTIVE_WORKOUT, null);
    if (saved) {
      this.activeWorkout = saved;
      this.startWorkoutTimer();
      this.renderActiveWorkoutView();
    }
  },

  // Audio synthesizer for rest timer completion using Web Audio API
  playChime(type = 'beep') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'fanfare') {
        // Triple chime for PR
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.4);
        });
      }
    } catch (e) {
      console.warn('Audio feedback not available:', e);
    }
  },

  // Start a new workout
  startWorkout(name = 'Treino Personalizado', templateId = null) {
    let exercises = [];

    if (templateId) {
      const templates = StorageManager.get(STORAGE_KEYS.TEMPLATES, []);
      const tpl = templates.find(t => t.id === templateId);
      if (tpl) {
        name = tpl.name;
        const allExercises = StorageManager.get(STORAGE_KEYS.EXERCISES, []);
        exercises = tpl.exercises.map(item => {
          const exObj = allExercises.find(e => e.id === item.exerciseId);
          const prevHistory = this.getLastExercisePerformance(item.exerciseId);
          
          const sets = [];
          for (let s = 1; s <= (item.targetSets || 3); s++) {
            sets.push({
              setNumber: s,
              type: 'normal',
              weightKg: prevHistory ? prevHistory.lastWeight : 0,
              reps: prevHistory ? prevHistory.lastReps : 10,
              rpe: 8,
              completed: false
            });
          }

          return {
            exerciseId: item.exerciseId,
            exerciseName: exObj ? exObj.name : 'Exercício',
            restSeconds: item.restSeconds || 90,
            sets: sets
          };
        });
      }
    }

    this.activeWorkout = {
      id: 'w_' + Date.now(),
      name: name,
      date: new Date().toISOString().split('T')[0],
      startTime: Date.now(),
      exercises: exercises,
      notes: ''
    };

    this.saveActiveWorkout();
    this.startWorkoutTimer();
    App.switchTab('gym');
    this.renderActiveWorkoutView();
    App.showToast(`Treino "${name}" iniciado! Bom treino! 💪`, 'success');
  },

  saveActiveWorkout() {
    if (this.activeWorkout) {
      StorageManager.set(STORAGE_KEYS.ACTIVE_WORKOUT, this.activeWorkout);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT);
    }
  },

  // Timer for duration of workout
  startWorkoutTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const update = () => {
      if (!this.activeWorkout) return;
      const elapsedSec = Math.floor((Date.now() - this.activeWorkout.startTime) / 1000);
      const mins = Math.floor(elapsedSec / 60);
      const secs = elapsedSec % 60;
      const timerEl = document.getElementById('active-workout-duration');
      if (timerEl) {
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    };
    update();
    this.timerInterval = setInterval(update, 1000);
  },

  // Find last session data for an exercise
  getLastExercisePerformance(exerciseId) {
    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    const sorted = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));

    for (const w of sorted) {
      const ex = w.exercises?.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets && ex.sets.length > 0) {
        const completedSets = ex.sets.filter(s => s.completed && s.weightKg > 0);
        if (completedSets.length > 0) {
          const maxWeightSet = completedSets.reduce((max, s) => s.weightKg > max.weightKg ? s : max, completedSets[0]);
          return {
            date: w.date,
            lastWeight: maxWeightSet.weightKg,
            lastReps: maxWeightSet.reps,
            setsCount: completedSets.length
          };
        }
      }
    }
    return null;
  },

  // Get All-time Personal Record for an exercise
  getPersonalRecord(exerciseId) {
    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    let maxWeight = 0;
    let best1RM = 0;
    let bestSet = null;
    let recordDate = null;

    workouts.forEach(w => {
      const ex = w.exercises?.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets) {
        ex.sets.forEach(s => {
          if (s.completed && s.weightKg > 0) {
            const est1RM = s.reps > 1 ? s.weightKg * (1 + s.reps / 30) : s.weightKg;
            if (est1RM > best1RM) {
              best1RM = est1RM;
              maxWeight = s.weightKg;
              bestSet = s;
              recordDate = w.date;
            }
          }
        });
      }
    });

    return { maxWeight, best1RM: Math.round(best1RM * 10) / 10, bestSet, recordDate };
  },

  // Add exercise to active workout
  addExerciseToActive(exerciseId) {
    if (!this.activeWorkout) return;
    const allExercises = StorageManager.get(STORAGE_KEYS.EXERCISES, []);
    const exObj = allExercises.find(e => e.id === exerciseId);
    if (!exObj) return;

    const prevHistory = this.getLastExercisePerformance(exerciseId);

    const newEx = {
      exerciseId: exObj.id,
      exerciseName: exObj.name,
      restSeconds: 90,
      sets: [
        {
          setNumber: 1,
          type: 'normal',
          weightKg: prevHistory ? prevHistory.lastWeight : 0,
          reps: prevHistory ? prevHistory.lastReps : 10,
          rpe: 8,
          completed: false
        }
      ]
    };

    this.activeWorkout.exercises.push(newEx);
    this.saveActiveWorkout();
    this.renderActiveWorkoutView();
    App.showToast(`"${exObj.name}" adicionado ao treino!`, 'success');
  },

  // Remove exercise from active workout
  removeExerciseFromActive(exerciseIndex) {
    if (!this.activeWorkout) return;
    this.activeWorkout.exercises.splice(exerciseIndex, 1);
    this.saveActiveWorkout();
    this.renderActiveWorkoutView();
  },

  // Add set to exercise in active workout
  addSetToExercise(exerciseIndex) {
    if (!this.activeWorkout) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex) return;

    const lastSet = ex.sets[ex.sets.length - 1];
    const newSetNumber = ex.sets.length + 1;

    ex.sets.push({
      setNumber: newSetNumber,
      type: lastSet ? lastSet.type : 'normal',
      weightKg: lastSet ? lastSet.weightKg : 0,
      reps: lastSet ? lastSet.reps : 10,
      rpe: lastSet ? lastSet.rpe : 8,
      completed: false
    });

    this.saveActiveWorkout();
    this.renderActiveWorkoutView();
  },

  // Remove set
  removeSet(exerciseIndex, setIndex) {
    if (!this.activeWorkout) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || ex.sets.length <= 1) return;

    ex.sets.splice(setIndex, 1);
    // Renumber sets
    ex.sets.forEach((s, idx) => s.setNumber = idx + 1);
    this.saveActiveWorkout();
    this.renderActiveWorkoutView();
  },

  // Update set field
  updateSet(exerciseIndex, setIndex, field, value) {
    if (!this.activeWorkout) return;
    const set = this.activeWorkout.exercises[exerciseIndex]?.sets[setIndex];
    if (!set) return;

    if (field === 'weightKg' || field === 'reps' || field === 'rpe') {
      set[field] = parseFloat(value) || 0;
    } else {
      set[field] = value;
    }

    this.saveActiveWorkout();
  },

  // Toggle set completion and trigger rest timer + PR check
  toggleSetCompleted(exerciseIndex, setIndex) {
    if (!this.activeWorkout) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    const set = ex?.sets[setIndex];
    if (!set) return;

    set.completed = !set.completed;
    this.saveActiveWorkout();
    this.renderActiveWorkoutView();

    if (set.completed) {
      // 1. Play sound
      this.playChime('beep');

      // 2. Check if this is a new PR for this exercise
      const currentPR = this.getPersonalRecord(ex.exerciseId);
      const est1RM = set.reps > 1 ? set.weightKg * (1 + set.reps / 30) : set.weightKg;

      if (set.weightKg > 0 && est1RM > currentPR.best1RM && currentPR.best1RM > 0) {
        this.triggerPRCelebration(ex.exerciseName, set.weightKg, set.reps, Math.round(est1RM * 10) / 10);
      }

      // 3. Start Rest Timer
      this.startRestTimer(ex.restSeconds || 90);
    }
  },

  // Trigger confetti and PR banner
  triggerPRCelebration(exerciseName, weight, reps, est1RM) {
    this.playChime('fanfare');
    if (window.confetti) {
      window.confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    App.showToast(`🔥 NOVO RECORDE PESSOAL (PR)! ${exerciseName}: ${weight}kg × ${reps} reps (1RM: ${est1RM}kg)`, 'pr');
  },

  // Rest Timer logic
  startRestTimer(seconds = 90) {
    this.restTimeTotal = seconds;
    this.restTimeRemaining = seconds;

    const overlay = document.getElementById('rest-timer-bar');
    if (overlay) overlay.classList.remove('hidden');

    if (this.restTimerInterval) clearInterval(this.restTimerInterval);

    const updateUI = () => {
      const textEl = document.getElementById('rest-timer-digits');
      const progEl = document.getElementById('rest-timer-progress');
      
      const m = Math.floor(this.restTimeRemaining / 60);
      const s = this.restTimeRemaining % 60;
      if (textEl) textEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

      if (progEl) {
        const pct = (this.restTimeRemaining / this.restTimeTotal) * 100;
        progEl.style.width = `${pct}%`;
      }

      if (this.restTimeRemaining <= 0) {
        clearInterval(this.restTimerInterval);
        this.playChime('fanfare');
        App.showToast('⏰ Tempo de descanso terminado! Vamos à próxima série!', 'info');
        setTimeout(() => {
          if (overlay) overlay.classList.add('hidden');
        }, 2000);
      }
      this.restTimeRemaining--;
    };

    updateUI();
    this.restTimerInterval = setInterval(updateUI, 1000);
  },

  adjustRestTimer(secondsDelta) {
    this.restTimeRemaining = Math.max(0, this.restTimeRemaining + secondsDelta);
    this.restTimeTotal = Math.max(this.restTimeRemaining, this.restTimeTotal);
  },

  stopRestTimer() {
    if (this.restTimerInterval) clearInterval(this.restTimerInterval);
    const overlay = document.getElementById('rest-timer-bar');
    if (overlay) overlay.classList.add('hidden');
  },

  // Finish Workout
  finishWorkout() {
    if (!this.activeWorkout) return;

    const completedExercises = this.activeWorkout.exercises.filter(ex => 
      ex.sets.some(s => s.completed && s.weightKg > 0)
    );

    if (completedExercises.length === 0) {
      if (!confirm('Não registaste nenhuma série concluída. Desejas descartar este treino?')) {
        return;
      }
      this.cancelWorkout();
      return;
    }

    const durationMins = Math.max(1, Math.round((Date.now() - this.activeWorkout.startTime) / 60000));
    
    // Compute total tonnage volume
    let totalVolume = 0;
    let totalSets = 0;
    completedExercises.forEach(ex => {
      ex.sets.forEach(s => {
        if (s.completed && s.weightKg > 0) {
          totalVolume += (s.weightKg * s.reps);
          totalSets++;
        }
      });
    });

    const finished = {
      id: this.activeWorkout.id,
      name: this.activeWorkout.name,
      date: this.activeWorkout.date,
      durationMinutes: durationMins,
      notes: this.activeWorkout.notes || '',
      exercises: completedExercises
    };

    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    workouts.unshift(finished);
    StorageManager.set(STORAGE_KEYS.WORKOUTS, workouts);

    // Clean up active
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.stopRestTimer();
    this.activeWorkout = null;
    this.saveActiveWorkout();

    // Check achievements
    AchievementsManager.checkAll();

    // Confetti celebration
    if (window.confetti) {
      window.confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
    }

    App.showToast(`🎉 Treino Concluído com Sucesso! Volume Total: ${totalVolume.toLocaleString('pt-PT')} kg (${totalSets} séries em ${durationMins} min)`, 'success');
    App.switchTab('gym');
    this.renderGymHomeView();
    App.updateDashboard();
  },

  cancelWorkout() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.stopRestTimer();
    this.activeWorkout = null;
    this.saveActiveWorkout();
    this.renderGymHomeView();
    App.showToast('Treino descartado.', 'info');
  },

  // Save current active workout as a reusable template
  saveAsTemplate(templateName) {
    if (!this.activeWorkout || !templateName.trim()) return;

    const templates = StorageManager.get(STORAGE_KEYS.TEMPLATES, []);
    const newTemplate = {
      id: 'tpl_' + Date.now(),
      name: templateName.trim(),
      category: 'Personalizado',
      description: `Criado em ${new Date().toLocaleDateString('pt-PT')}`,
      exercises: this.activeWorkout.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        targetSets: ex.sets.length,
        targetReps: '8-12',
        restSeconds: ex.restSeconds || 90
      }))
    };

    templates.push(newTemplate);
    StorageManager.set(STORAGE_KEYS.TEMPLATES, templates);
    App.showToast(`Rotina "${newTemplate.name}" guardada nos teus modelos!`, 'success');
  },

  // Render UI for the Gym tab
  renderGymHomeView() {
    const container = document.getElementById('gym-view-container');
    if (!container) return;

    if (this.activeWorkout) {
      this.renderActiveWorkoutView();
      return;
    }

    const templates = StorageManager.get(STORAGE_KEYS.TEMPLATES, []);
    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    const exercises = StorageManager.get(STORAGE_KEYS.EXERCISES, []);

    let templatesHtml = templates.map(t => `
      <div class="glass-card template-card p-4 hover:border-emerald-500/50 transition flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-bold text-slate-100 text-base">${t.name}</h4>
            <span class="badge badge-emerald">${t.category}</span>
          </div>
          <p class="text-xs text-slate-400 mb-3">${t.description || ''}</p>
          <div class="space-y-1 mb-4">
            ${t.exercises.slice(0, 4).map(e => {
              const exObj = exercises.find(x => x.id === e.exerciseId);
              return `<div class="text-xs text-slate-300 flex items-center gap-1.5"><i data-lucide="check" class="w-3 h-3 text-emerald-400"></i> ${exObj ? exObj.name : 'Exercício'} (${e.targetSets} séries)</div>`;
            }).join('')}
            ${t.exercises.length > 4 ? `<div class="text-xs text-slate-500 font-medium">+${t.exercises.length - 4} outros exercícios...</div>` : ''}
          </div>
        </div>
        <button class="btn btn-primary w-full text-xs py-2" onclick="WorkoutManager.startWorkout('${t.name}', '${t.id}')">
          <i data-lucide="play" class="w-3.5 h-3.5"></i> Iniciar Rotina
        </button>
      </div>
    `).join('');

    let recentWorkoutsHtml = workouts.slice(0, 5).map(w => {
      let vol = 0;
      let totalSets = 0;
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
          if (s.completed && s.weightKg > 0) {
            vol += (s.weightKg * s.reps);
            totalSets++;
          }
        });
      });

      return `
        <div class="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">${w.date}</span>
              <h4 class="font-bold text-slate-100 text-sm md:text-base">${w.name}</h4>
            </div>
            <div class="text-xs text-slate-400 flex flex-wrap items-center gap-4">
              <span><i data-lucide="clock" class="w-3 h-3 inline text-slate-500"></i> ${w.durationMinutes || 60} min</span>
              <span><i data-lucide="layers" class="w-3 h-3 inline text-slate-500"></i> ${totalSets} séries</span>
              <span><i data-lucide="dumbbell" class="w-3 h-3 inline text-emerald-400"></i> ${vol.toLocaleString('pt-PT')} kg volume</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary text-xs py-1.5 px-3" onclick="WorkoutManager.startWorkout('${w.name}')">
              <i data-lucide="repeat" class="w-3.5 h-3.5"></i> Repetir
            </button>
            <button class="btn btn-ghost text-xs py-1.5 px-2 text-rose-400 hover:bg-rose-500/10" onclick="WorkoutManager.deletePastWorkout('${w.id}')" title="Eliminar registo">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Quick Start Bar -->
        <div class="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40">
          <div>
            <h2 class="text-xl font-black text-slate-100 flex items-center gap-2">
              <span class="p-2 rounded-xl bg-emerald-500/20 text-emerald-400"><i data-lucide="flame" class="w-5 h-5"></i></span>
              Pronto para treinar?
            </h2>
            <p class="text-xs text-slate-400 mt-1">Inicia um treino vazio ou escolhe uma das tuas rotinas para acompanhar cargas e repetições.</p>
          </div>
          <div class="flex items-center gap-2.5 w-full sm:w-auto">
            <button class="btn btn-primary flex-1 sm:flex-none py-3 px-6 text-sm font-bold shadow-lg shadow-emerald-500/20" onclick="WorkoutManager.startWorkout('Treino Livre')">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> Iniciar Treino Livre
            </button>
            <button class="btn btn-secondary py-3 px-4 text-xs font-semibold" onclick="App.openExerciseProgressModal()">
              <i data-lucide="line-chart" class="w-4 h-4 text-cyan-400"></i> Ver Evolução Cargas
            </button>
          </div>
        </div>

        <!-- Routine Templates Grid -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <i data-lucide="layout-grid" class="w-4 h-4 text-indigo-400"></i> Planos & Rotinas de Treino
            </h3>
            <button class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold" onclick="App.openNewExerciseModal()">+ Novo Exercício</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${templatesHtml}
          </div>
        </div>

        <!-- Past Workouts History -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <i data-lucide="history" class="w-4 h-4 text-amber-400"></i> Histórico Recente de Treinos
            </h3>
            <button class="text-xs text-slate-400 hover:text-slate-200" onclick="App.exportWorkoutsCSV()">
              <i data-lucide="download" class="w-3.5 h-3.5 inline"></i> Exportar CSV
            </button>
          </div>
          <div class="space-y-3">
            ${recentWorkoutsHtml || '<div class="glass-card p-6 text-center text-slate-400 text-sm">Nenhum treino registado ainda. Começa agora!</div>'}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  // Render Active Workout View
  renderActiveWorkoutView() {
    const container = document.getElementById('gym-view-container');
    if (!container || !this.activeWorkout) return;

    const allExercises = StorageManager.get(STORAGE_KEYS.EXERCISES, []);

    let exercisesHtml = this.activeWorkout.exercises.map((ex, exIdx) => {
      const prev = this.getLastExercisePerformance(ex.exerciseId);
      const pr = this.getPersonalRecord(ex.exerciseId);

      let setsRows = ex.sets.map((s, sIdx) => {
        const est1RM = s.weightKg > 0 && s.reps > 0 ? (s.reps > 1 ? Math.round(s.weightKg * (1 + s.reps / 30) * 10) / 10 : s.weightKg) : 0;
        const isPR = s.completed && est1RM >= pr.best1RM && pr.best1RM > 0;

        return `
          <tr class="border-b border-slate-800/80 ${s.completed ? 'bg-emerald-950/20' : ''} transition">
            <td class="py-2.5 px-3 text-center">
              <span class="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${s.completed ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-400'}">
                ${s.setNumber}
              </span>
            </td>
            <td class="py-2.5 px-2 text-center text-xs text-slate-400">
              ${prev ? `<span class="opacity-80">${prev.lastWeight}kg × ${prev.lastReps}</span>` : '<span class="text-slate-600">—</span>'}
            </td>
            <td class="py-2.5 px-2">
              <div class="flex items-center justify-center gap-1">
                <input type="number" step="0.5" min="0" value="${s.weightKg}" 
                  class="input-clean w-16 text-center font-bold text-slate-100 bg-slate-800/80 border border-slate-700/80 rounded-lg py-1 px-2 focus:border-emerald-500"
                  onchange="WorkoutManager.updateSet(${exIdx}, ${sIdx}, 'weightKg', this.value)" />
                <span class="text-xs text-slate-400">kg</span>
              </div>
            </td>
            <td class="py-2.5 px-2">
              <div class="flex items-center justify-center gap-1">
                <input type="number" step="1" min="1" value="${s.reps}" 
                  class="input-clean w-14 text-center font-bold text-slate-100 bg-slate-800/80 border border-slate-700/80 rounded-lg py-1 px-2 focus:border-emerald-500"
                  onchange="WorkoutManager.updateSet(${exIdx}, ${sIdx}, 'reps', this.value)" />
              </div>
            </td>
            <td class="py-2.5 px-2 text-center hidden sm:table-cell">
              <select class="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-300"
                onchange="WorkoutManager.updateSet(${exIdx}, ${sIdx}, 'rpe', this.value)">
                <option value="6" ${s.rpe === 6 ? 'selected' : ''}>RPE 6 (Leve)</option>
                <option value="7" ${s.rpe === 7 ? 'selected' : ''}>RPE 7 (Moderado)</option>
                <option value="8" ${s.rpe === 8 ? 'selected' : ''}>RPE 8 (2 Reps Reserva)</option>
                <option value="8.5" ${s.rpe === 8.5 ? 'selected' : ''}>RPE 8.5 (1-2 Reps)</option>
                <option value="9" ${s.rpe === 9 ? 'selected' : ''}>RPE 9 (1 Rep Reserva)</option>
                <option value="9.5" ${s.rpe === 9.5 ? 'selected' : ''}>RPE 9.5 (Quase Falha)</option>
                <option value="10" ${s.rpe === 10 ? 'selected' : ''}>RPE 10 (Falha Total 🔥)</option>
              </select>
            </td>
            <td class="py-2.5 px-2 text-center hidden md:table-cell">
              <span class="text-xs font-semibold ${isPR ? 'text-amber-400 font-bold' : 'text-slate-400'}">
                ${est1RM > 0 ? `${est1RM} kg ${isPR ? '🏆' : ''}` : '—'}
              </span>
            </td>
            <td class="py-2.5 px-3 text-center">
              <button class="w-8 h-8 rounded-lg inline-flex items-center justify-center transition ${s.completed ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'}"
                onclick="WorkoutManager.toggleSetCompleted(${exIdx}, ${sIdx})">
                <i data-lucide="${s.completed ? 'check' : 'check'}" class="w-4 h-4"></i>
              </button>
            </td>
            <td class="py-2.5 px-2 text-center">
              <button class="text-slate-500 hover:text-rose-400 transition" onclick="WorkoutManager.removeSet(${exIdx}, ${sIdx})" title="Eliminar série">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="glass-panel p-4 md:p-5 rounded-2xl border border-slate-800 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-black text-slate-100 text-base md:text-lg">${ex.exerciseName}</h4>
                <button class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold" onclick="App.openExerciseChartModal('${ex.exerciseId}')" title="Ver gráfico de evolução de carga">
                  <i data-lucide="trending-up" class="w-4 h-4 inline"></i> Histórico
                </button>
              </div>
              <div class="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                ${pr.best1RM > 0 ? `<span>Recorde Atual: <strong class="text-amber-400">${pr.maxWeight}kg</strong> (1RM ~${pr.best1RM}kg)</span>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                <i data-lucide="timer" class="w-3.5 h-3.5 text-cyan-400"></i>
                <span class="text-slate-400">Descanso:</span>
                <select class="bg-transparent text-slate-200 font-semibold outline-none cursor-pointer" 
                  onchange="WorkoutManager.activeWorkout.exercises[${exIdx}].restSeconds = parseInt(this.value); WorkoutManager.saveActiveWorkout();">
                  <option value="45" ${ex.restSeconds === 45 ? 'selected' : ''}>45s</option>
                  <option value="60" ${ex.restSeconds === 60 ? 'selected' : ''}>60s</option>
                  <option value="90" ${ex.restSeconds === 90 ? 'selected' : ''}>90s</option>
                  <option value="120" ${ex.restSeconds === 120 ? 'selected' : ''}>120s (2m)</option>
                  <option value="180" ${ex.restSeconds === 180 ? 'selected' : ''}>180s (3m)</option>
                </select>
              </div>
              <button class="btn btn-ghost text-xs p-1.5 text-rose-400 hover:bg-rose-500/10" onclick="WorkoutManager.removeExerciseFromActive(${exIdx})" title="Remover exercício">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <!-- Sets Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <th class="py-2 px-3 text-center w-12">Série</th>
                  <th class="py-2 px-2 text-center w-24">Anterior</th>
                  <th class="py-2 px-2 text-center w-28">Carga (kg)</th>
                  <th class="py-2 px-2 text-center w-20">Reps</th>
                  <th class="py-2 px-2 text-center hidden sm:table-cell w-28">Esforço (RPE)</th>
                  <th class="py-2 px-2 text-center hidden md:table-cell w-24">1RM Estim.</th>
                  <th class="py-2 px-3 text-center w-14">Feito</th>
                  <th class="py-2 px-2 text-center w-8"></th>
                </tr>
              </thead>
              <tbody>
                ${setsRows}
              </tbody>
            </table>
          </div>

          <button class="btn btn-secondary w-full text-xs py-2 font-semibold" onclick="WorkoutManager.addSetToExercise(${exIdx})">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Adicionar Série
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Active Workout Header Banner -->
        <div class="glass-panel p-5 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 animate-pulse">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span> EM ANDAMENTO
                </span>
                <span class="text-xs text-slate-400">${this.activeWorkout.date}</span>
              </div>
              <input type="text" value="${this.activeWorkout.name}" 
                class="bg-transparent text-xl md:text-2xl font-black text-slate-100 border-b border-transparent hover:border-slate-700 focus:border-emerald-500 outline-none w-full max-w-md"
                onchange="WorkoutManager.activeWorkout.name = this.value; WorkoutManager.saveActiveWorkout();" />
            </div>

            <div class="flex items-center gap-3">
              <div class="bg-slate-800/90 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
                <i data-lucide="clock" class="w-4 h-4 text-emerald-400 animate-spin-slow"></i>
                <span id="active-workout-duration" class="font-mono text-base font-bold text-slate-100">00:00</span>
              </div>
              <button class="btn btn-primary py-2.5 px-5 text-sm font-bold shadow-lg shadow-emerald-500/30" onclick="WorkoutManager.finishWorkout()">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Concluir Treino
              </button>
              <button class="btn btn-ghost text-xs p-2.5 text-rose-400 hover:bg-rose-500/10" onclick="if(confirm('Tem a certeza que deseja cancelar o treino?')) WorkoutManager.cancelWorkout();" title="Descartar treino">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Exercises List in Active Workout -->
        <div class="space-y-4">
          ${exercisesHtml || `
            <div class="glass-card p-8 text-center text-slate-400 space-y-3">
              <div class="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                <i data-lucide="dumbbell" class="w-6 h-6"></i>
              </div>
              <p class="text-sm font-medium">O teu treino ainda não tem exercícios adicionados.</p>
              <button class="btn btn-primary text-xs py-2 px-4 mx-auto" onclick="App.openAddExercisePickerModal()">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Escolher Exercícios
              </button>
            </div>
          `}
        </div>

        <!-- Add Exercise & Actions Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button class="btn btn-secondary text-xs py-2.5 px-4 font-bold" onclick="App.openAddExercisePickerModal()">
            <i data-lucide="plus-circle" class="w-4 h-4 text-emerald-400"></i> Adicionar Exercício
          </button>
          
          <div class="flex items-center gap-2">
            <button class="btn btn-ghost text-xs py-2 px-3 text-slate-300" onclick="const name = prompt('Nome para guardar este modelo de treino:', WorkoutManager.activeWorkout.name); if (name) WorkoutManager.saveAsTemplate(name);">
              <i data-lucide="bookmark" class="w-3.5 h-3.5 text-indigo-400"></i> Guardar como Rotina
            </button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  deletePastWorkout(id) {
    if (!confirm('Tem a certeza que deseja eliminar este treino do histórico?')) return;
    const workouts = StorageManager.get(STORAGE_KEYS.WORKOUTS, []);
    const updated = workouts.filter(w => w.id !== id);
    StorageManager.set(STORAGE_KEYS.WORKOUTS, updated);
    this.renderGymHomeView();
    App.updateDashboard();
    App.showToast('Treino removido com sucesso.', 'info');
  }
};

window.WorkoutManager = WorkoutManager;
