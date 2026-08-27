/**
 * ApexPulse - Nutrition & Diet Tracking Engine
 * Manages daily meal logs, calorie/macro/micro breakdowns, food search, water tracking, and TDEE calculation.
 */

const NutritionManager = {
  selectedDate: new Date().toISOString().split('T')[0],

  init() {
    this.renderNutritionView();
  },

  setSelectedDate(dateStr) {
    this.selectedDate = dateStr;
    this.renderNutritionView();
    App.updateDashboard();
  },

  changeDateBy(daysDelta) {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + daysDelta);
    this.setSelectedDate(d.toISOString().split('T')[0]);
  },

  // Get or initialize logs for the selected date
  getDayLog(dateStr = this.selectedDate) {
    const logs = StorageManager.get(STORAGE_KEYS.NUTRITION_LOGS, {});
    if (!logs[dateStr]) {
      logs[dateStr] = {
        date: dateStr,
        waterMl: 0,
        meals: {
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: []
        }
      };
    }
    return logs[dateStr];
  },

  saveDayLog(dayLog) {
    const logs = StorageManager.get(STORAGE_KEYS.NUTRITION_LOGS, {});
    logs[dayLog.date] = dayLog;
    StorageManager.set(STORAGE_KEYS.NUTRITION_LOGS, logs);
    this.renderNutritionView();
    App.updateDashboard();
    AchievementsManager.checkAll();
  },

  // Compute daily totals for all macros and micros
  calculateDailyTotals(dateStr = this.selectedDate) {
    const day = this.getDayLog(dateStr);
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      potassium: 0,
      calcium: 0,
      iron: 0,
      waterMl: day.waterMl || 0
    };

    const mealTotals = {
      breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      lunch: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      dinner: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      snacks: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    };

    Object.entries(day.meals || {}).forEach(([mealKey, items]) => {
      (items || []).forEach(item => {
        const cal = item.calories || 0;
        const p = item.protein || 0;
        const c = item.carbs || 0;
        const f = item.fat || 0;

        totals.calories += cal;
        totals.protein += p;
        totals.carbs += c;
        totals.fat += f;
        totals.fiber += (item.fiber || 0);
        totals.sugar += (item.sugar || 0);
        totals.sodium += (item.sodium || 0);
        totals.potassium += (item.potassium || 0);
        totals.calcium += (item.calcium || 0);
        totals.iron += (item.iron || 0);

        if (mealTotals[mealKey]) {
          mealTotals[mealKey].calories += cal;
          mealTotals[mealKey].protein += p;
          mealTotals[mealKey].carbs += c;
          mealTotals[mealKey].fat += f;
        }
      });
    });

    // Rounding
    Object.keys(totals).forEach(k => totals[k] = Math.round(totals[k] * 10) / 10);
    Object.keys(mealTotals).forEach(m => {
      Object.keys(mealTotals[m]).forEach(k => mealTotals[m][k] = Math.round(mealTotals[m][k] * 10) / 10);
    });

    return { totals, mealTotals };
  },

  // Add food item to specific meal
  addFoodToMeal(mealKey, foodId, amount) {
    const foods = StorageManager.get(STORAGE_KEYS.FOODS, []);
    const food = foods.find(f => f.id === foodId);
    if (!food) return;

    const ratio = amount / food.servingSize;
    const entry = {
      id: 'food_entry_' + Date.now(),
      foodId: food.id,
      name: food.name,
      amount: amount,
      unit: food.unit,
      calories: Math.round(food.calories * ratio),
      protein: Math.round(food.protein * ratio * 10) / 10,
      carbs: Math.round(food.carbs * ratio * 10) / 10,
      fat: Math.round(food.fat * ratio * 10) / 10,
      fiber: Math.round((food.fiber || 0) * ratio * 10) / 10,
      sugar: Math.round((food.sugar || 0) * ratio * 10) / 10,
      sodium: Math.round((food.sodium || 0) * ratio),
      potassium: Math.round((food.potassium || 0) * ratio),
      calcium: Math.round((food.calcium || 0) * ratio),
      iron: Math.round((food.iron || 0) * ratio * 10) / 10
    };

    const dayLog = this.getDayLog();
    if (!dayLog.meals[mealKey]) dayLog.meals[mealKey] = [];
    dayLog.meals[mealKey].push(entry);

    this.saveDayLog(dayLog);
    App.showToast(`"${food.name}" adicionado ao ${this.getMealTitle(mealKey)}!`, 'success');
  },

  // Quick Add calories and macros directly without choosing a food
  addQuickCalories(mealKey, name, calories, protein = 0, carbs = 0, fat = 0) {
    const entry = {
      id: 'food_quick_' + Date.now(),
      name: name || 'Adição Rápida',
      amount: 1,
      unit: 'porção',
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      fiber: 0,
      sodium: 0
    };

    const dayLog = this.getDayLog();
    if (!dayLog.meals[mealKey]) dayLog.meals[mealKey] = [];
    dayLog.meals[mealKey].push(entry);
    this.saveDayLog(dayLog);
    App.showToast('Alimento rápido registado!', 'success');
  },

  // Remove single item from meal
  removeFoodItem(mealKey, itemIndex) {
    const dayLog = this.getDayLog();
    if (dayLog.meals[mealKey]) {
      dayLog.meals[mealKey].splice(itemIndex, 1);
      this.saveDayLog(dayLog);
    }
  },

  // Clear meal
  clearMeal(mealKey) {
    if (!confirm(`Limpar todos os itens de ${this.getMealTitle(mealKey)}?`)) return;
    const dayLog = this.getDayLog();
    if (dayLog.meals[mealKey]) {
      dayLog.meals[mealKey] = [];
      this.saveDayLog(dayLog);
    }
  },

  // Water logging
  addWater(deltaMl) {
    const dayLog = this.getDayLog();
    dayLog.waterMl = Math.max(0, (dayLog.waterMl || 0) + deltaMl);
    this.saveDayLog(dayLog);
    App.showToast(deltaMl > 0 ? `+${deltaMl}ml de água registados! 💧` : `${deltaMl}ml de água retirados.`, 'info');
  },

  getMealTitle(key) {
    switch (key) {
      case 'breakfast': return 'Pequeno-Almoço';
      case 'lunch': return 'Almoço';
      case 'dinner': return 'Jantar';
      case 'snacks': return 'Lanches & Snacks';
      default: return key;
    }
  },

  // TDEE & Macro Split Calculator
  calculateTDEE(age, gender, heightCm, weightKg, activityLevel, goal) {
    // Mifflin-St Jeor BMR
    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    bmr = gender === 'male' ? bmr + 5 : bmr - 161;

    // Activity Multiplier
    const multipliers = {
      sedentary: 1.2,    // Little or no exercise
      light: 1.375,      // 1-3 days/week
      moderate: 1.55,    // 3-5 days/week
      heavy: 1.725,      // 6-7 days/week
      extreme: 1.9       // Hard daily training & physical job
    };

    const multiplier = multipliers[activityLevel] || 1.55;
    const tdee = Math.round(bmr * multiplier);

    // Goal adjustment
    let targetCalories = tdee;
    if (goal === 'cut') targetCalories = Math.round(tdee - 450); // Moderate deficit
    else if (goal === 'lean_bulk') targetCalories = Math.round(tdee + 250); // Slight surplus
    else if (goal === 'heavy_bulk') targetCalories = Math.round(tdee + 450);

    // Target Macros
    const proteinG = Math.round(weightKg * 2.2); // 2.2g per kg
    const fatG = Math.round(weightKg * 0.9);      // 0.9g per kg
    const remainingCalories = Math.max(0, targetCalories - (proteinG * 4 + fatG * 9));
    const carbsG = Math.round(remainingCalories / 4);

    return {
      bmr: Math.round(bmr),
      tdee: tdee,
      targetCalories,
      proteinG,
      carbsG,
      fatG
    };
  },

  // Render Nutrition View UI
  renderNutritionView() {
    const container = document.getElementById('nutrition-view-container');
    if (!container) return;

    const userProfile = StorageManager.get(STORAGE_KEYS.USER_PROFILE, DEFAULT_USER_PROFILE);
    const targets = userProfile.dailyTargets || DEFAULT_USER_PROFILE.dailyTargets;
    const { totals, mealTotals } = this.calculateDailyTotals(this.selectedDate);

    const calRemaining = Math.max(0, targets.calories - totals.calories);
    const calPct = Math.min(100, Math.round((totals.calories / targets.calories) * 100));

    const pPct = Math.min(100, Math.round((totals.protein / targets.protein) * 100));
    const cPct = Math.min(100, Math.round((totals.carbs / targets.carbs) * 100));
    const fPct = Math.min(100, Math.round((totals.fat / targets.fat) * 100));
    const wPct = Math.min(100, Math.round((totals.waterMl / targets.waterMl) * 100));

    const isToday = this.selectedDate === new Date().toISOString().split('T')[0];

    // Render Meals Section
    const dayLog = this.getDayLog();
    const mealKeys = ['breakfast', 'lunch', 'dinner', 'snacks'];
    
    let mealsHtml = mealKeys.map(key => {
      const items = dayLog.meals[key] || [];
      const mTot = mealTotals[key];
      const title = this.getMealTitle(key);

      const itemsHtml = items.map((item, idx) => `
        <div class="flex items-center justify-between py-2 border-b border-slate-800/60 text-xs">
          <div class="flex-1 pr-2">
            <span class="font-semibold text-slate-200">${item.name}</span>
            <div class="text-[11px] text-slate-400">
              <span>${item.amount} ${item.unit}</span> · 
              <span class="text-cyan-400 font-medium">${item.protein}g P</span> · 
              <span class="text-amber-400 font-medium">${item.carbs}g C</span> · 
              <span class="text-rose-400 font-medium">${item.fat}g G</span>
              ${item.fiber ? ` · <span class="text-emerald-400">${item.fiber}g Fibra</span>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold text-slate-100">${item.calories} kcal</span>
            <button class="text-slate-500 hover:text-rose-400 p-1 transition" onclick="NutritionManager.removeFoodItem('${key}', ${idx})" title="Remover item">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `).join('');

      return `
        <div class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h4 class="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span class="w-2 h-2 rounded-full ${key === 'breakfast' ? 'bg-amber-400' : key === 'lunch' ? 'bg-emerald-400' : key === 'dinner' ? 'bg-indigo-400' : 'bg-purple-400'}"></span>
                ${title}
              </h4>
              <span class="text-[11px] text-slate-400">${mTot.calories} kcal (${mTot.protein}g P · ${mTot.carbs}g C · ${mTot.fat}g G)</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button class="btn btn-secondary text-xs py-1 px-2.5" onclick="App.openAddFoodModal('${key}')">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Alimento
              </button>
              <button class="btn btn-ghost text-xs p-1 text-slate-400 hover:text-slate-200" onclick="App.openQuickAddModal('${key}')" title="Adição Rápida de Calorias">
                <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
              </button>
              ${items.length > 0 ? `
                <button class="btn btn-ghost text-xs p-1 text-rose-400 hover:bg-rose-500/10" onclick="NutritionManager.clearMeal('${key}')" title="Limpar refeição">
                  <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="space-y-1">
            ${itemsHtml || '<div class="text-xs text-slate-500 py-3 text-center">Nenhum alimento adicionado nesta refeição.</div>'}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Date Navigation Bar -->
        <div class="glass-panel p-3 rounded-2xl flex items-center justify-between border border-slate-800">
          <button class="btn btn-ghost p-2 text-slate-300 hover:text-white" onclick="NutritionManager.changeDateBy(-1)">
            <i data-lucide="chevron-left" class="w-5 h-5"></i>
          </button>
          
          <div class="flex items-center gap-2">
            <i data-lucide="calendar" class="w-4 h-4 text-emerald-400"></i>
            <input type="date" value="${this.selectedDate}" 
              class="bg-transparent text-slate-100 font-bold text-sm outline-none cursor-pointer"
              onchange="NutritionManager.setSelectedDate(this.value)" />
            ${isToday ? '<span class="badge badge-emerald text-[10px]">HOJE</span>' : ''}
          </div>

          <button class="btn btn-ghost p-2 text-slate-300 hover:text-white" onclick="NutritionManager.changeDateBy(1)">
            <i data-lucide="chevron-right" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Calorie & Macronutrient Overview Card -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 space-y-5">
          <div class="flex flex-col lg:flex-row items-center justify-between gap-6">
            <!-- Calorie Ring / Status -->
            <div class="flex items-center gap-6">
              <div class="relative w-28 h-28 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path class="text-slate-800" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="text-emerald-400 stroke-current transition-all duration-1000 ease-out" stroke-dasharray="${calPct}, 100" stroke-width="3.5" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div class="absolute text-center">
                  <span class="text-xl font-black text-slate-100">${totals.calories}</span>
                  <span class="block text-[10px] text-slate-400 font-semibold uppercase">Consumidas</span>
                </div>
              </div>

              <div>
                <div class="text-xs text-slate-400">Meta Diária: <strong class="text-slate-200">${targets.calories} kcal</strong></div>
                <div class="text-sm font-bold text-slate-100 mt-1">
                  ${totals.calories > targets.calories ? `<span class="text-amber-400">+${totals.calories - targets.calories} kcal acima da meta</span>` : `<span class="text-emerald-400">${calRemaining} kcal restantes</span>`}
                </div>
                <button class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold mt-2 flex items-center gap-1" onclick="App.openTDEECalculatorModal()">
                  <i data-lucide="calculator" class="w-3.5 h-3.5"></i> Calcular Metas & TDEE
                </button>
              </div>
            </div>

            <!-- Macro Bars -->
            <div class="w-full lg:max-w-md grid grid-cols-3 gap-3">
              <!-- Protein -->
              <div class="glass-card p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/10">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-bold text-cyan-400">Proteína</span>
                  <span class="text-[11px] text-slate-400">${pPct}%</span>
                </div>
                <div class="text-base font-black text-slate-100">${totals.protein}<span class="text-xs font-normal text-slate-400">/${targets.protein}g</span></div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div class="bg-cyan-400 h-full rounded-full transition-all duration-500" style="width: ${pPct}%"></div>
                </div>
              </div>

              <!-- Carbs -->
              <div class="glass-card p-3 rounded-xl border border-amber-500/20 bg-amber-950/10">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-bold text-amber-400">Hidratos</span>
                  <span class="text-[11px] text-slate-400">${cPct}%</span>
                </div>
                <div class="text-base font-black text-slate-100">${totals.carbs}<span class="text-xs font-normal text-slate-400">/${targets.carbs}g</span></div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div class="bg-amber-400 h-full rounded-full transition-all duration-500" style="width: ${cPct}%"></div>
                </div>
              </div>

              <!-- Fat -->
              <div class="glass-card p-3 rounded-xl border border-rose-500/20 bg-rose-950/10">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-bold text-rose-400">Gorduras</span>
                  <span class="text-[11px] text-slate-400">${fPct}%</span>
                </div>
                <div class="text-base font-black text-slate-100">${totals.fat}<span class="text-xs font-normal text-slate-400">/${targets.fat}g</span></div>
                <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div class="bg-rose-400 h-full rounded-full transition-all duration-500" style="width: ${fPct}%"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Micronutrients Summary Row -->
          <div class="pt-4 border-t border-slate-800/80">
            <h5 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Micronutrientes Essenciais</h5>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
              <div class="bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                <span class="text-slate-400 block text-[10px]">Fibras</span>
                <strong class="text-emerald-400 font-bold">${totals.fiber}g</strong>
                <span class="text-[9px] text-slate-500">/ ${targets.fiber || 35}g</span>
              </div>
              <div class="bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                <span class="text-slate-400 block text-[10px]">Açúcares</span>
                <strong class="text-amber-400 font-bold">${totals.sugar}g</strong>
              </div>
              <div class="bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                <span class="text-slate-400 block text-[10px]">Sódio</span>
                <strong class="text-indigo-400 font-bold">${totals.sodium}mg</strong>
                <span class="text-[9px] text-slate-500">/ ${targets.sodium || 2300}mg</span>
              </div>
              <div class="bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                <span class="text-slate-400 block text-[10px]">Potássio</span>
                <strong class="text-cyan-400 font-bold">${totals.potassium}mg</strong>
                <span class="text-[9px] text-slate-500">/ ${targets.potassium || 3500}mg</span>
              </div>
              <div class="bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                <span class="text-slate-400 block text-[10px]">Cálcio</span>
                <strong class="text-purple-400 font-bold">${totals.calcium}mg</strong>
              </div>
              <div class="bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                <span class="text-slate-400 block text-[10px]">Ferro</span>
                <strong class="text-rose-400 font-bold">${totals.iron}mg</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Water Intake Tracker Bar -->
        <div class="glass-panel p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <i data-lucide="droplet" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-slate-100 text-sm">Registo de Hidratação</h4>
                <span class="text-xs font-extrabold text-cyan-400">${totals.waterMl} ml / ${targets.waterMl} ml (${wPct}%)</span>
              </div>
              <div class="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div class="bg-cyan-400 h-full rounded-full transition-all duration-300" style="width: ${wPct}%"></div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 w-full md:w-auto justify-end">
            <button class="btn btn-secondary text-xs py-1.5 px-2.5" onclick="NutritionManager.addWater(250)">
              +250ml (Copo)
            </button>
            <button class="btn btn-secondary text-xs py-1.5 px-2.5" onclick="NutritionManager.addWater(500)">
              +500ml (Garrafa)
            </button>
            <button class="btn btn-ghost text-xs p-1.5 text-slate-400 hover:text-rose-400" onclick="NutritionManager.addWater(-250)" title="Corrigir / Retirar 250ml">
              <i data-lucide="minus" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- Meals Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${mealsHtml}
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }
};

window.NutritionManager = NutritionManager;
