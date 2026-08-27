/**
 * ApexPulse - Data Layer & Persistence
 * Stores exercises, foods, templates, realistic initial history, and localStorage sync.
 */

const STORAGE_KEYS = {
  WORKOUTS: 'apexpulse_workouts',
  EXERCISES: 'apexpulse_exercises',
  TEMPLATES: 'apexpulse_templates',
  ACTIVE_WORKOUT: 'apexpulse_active_workout',
  NUTRITION_LOGS: 'apexpulse_nutrition_logs',
  FOODS: 'apexpulse_foods',
  BODY_METRICS: 'apexpulse_body_metrics',
  USER_PROFILE: 'apexpulse_user_profile',
  ACHIEVEMENTS: 'apexpulse_achievements',
  SETTINGS: 'apexpulse_settings'
};

// Initial Exercise Database
const DEFAULT_EXERCISES = [
  // Peito
  { id: 'ex_bench_press', name: 'Supino Reto com Barra', category: 'Peito', primaryMuscle: 'Peitoral Maior', equipment: 'Barra', isCustom: false },
  { id: 'ex_incline_dumbbell_press', name: 'Supino Inclinado com Halteres', category: 'Peito', primaryMuscle: 'Peitoral Superior', equipment: 'Halteres', isCustom: false },
  { id: 'ex_cable_crossover', name: 'Crossover na Polia', category: 'Peito', primaryMuscle: 'Peitoral', equipment: 'Polia', isCustom: false },
  { id: 'ex_dips', name: 'Fundos nas Paralelas (Dips)', category: 'Peito', primaryMuscle: 'Peitoral / Tríceps', equipment: 'Peso Corporal', isCustom: false },
  { id: 'ex_peck_deck', name: 'Peck Deck / Voador', category: 'Peito', primaryMuscle: 'Peitoral', equipment: 'Máquina', isCustom: false },
  { id: 'ex_decline_press', name: 'Supino Declinado com Barra', category: 'Peito', primaryMuscle: 'Peitoral Inferior', equipment: 'Barra', isCustom: false },
  { id: 'ex_pushups', name: 'Flexões de Braços (Push-ups)', category: 'Peito', primaryMuscle: 'Peitoral', equipment: 'Peso Corporal', isCustom: false },

  // Costas
  { id: 'ex_deadlift', name: 'Levantamento Terra (Deadlift)', category: 'Costas', primaryMuscle: 'Dorsais / Cadeia Posterior', equipment: 'Barra', isCustom: false },
  { id: 'ex_lat_pulldown', name: 'Puxada na Polia Alta (Lat Pulldown)', category: 'Costas', primaryMuscle: 'Grande Dorsal', equipment: 'Polia', isCustom: false },
  { id: 'ex_barbell_row', name: 'Remada Curvada com Barra', category: 'Costas', primaryMuscle: 'Dorsais / Trapézio', equipment: 'Barra', isCustom: false },
  { id: 'ex_dumbbell_row', name: 'Remada Unilateral com Halter (Serrote)', category: 'Costas', primaryMuscle: 'Grande Dorsal', equipment: 'Halteres', isCustom: false },
  { id: 'ex_cable_seated_row', name: 'Remada Baixa no Triângulo', category: 'Costas', primaryMuscle: 'Dorsais / Romboides', equipment: 'Polia', isCustom: false },
  { id: 'ex_pullups', name: 'Elevações na Barra Fixa (Pull-ups)', category: 'Costas', primaryMuscle: 'Grande Dorsal', equipment: 'Peso Corporal', isCustom: false },
  { id: 'ex_face_pulls', name: 'Face Pulls na Polia', category: 'Costas', primaryMuscle: 'Deltóide Posterior / Trapézio', equipment: 'Polia', isCustom: false },

  // Pernas
  { id: 'ex_squat', name: 'Agachamento Livre com Barra', category: 'Pernas', primaryMuscle: 'Quadríceps / Glúteos', equipment: 'Barra', isCustom: false },
  { id: 'ex_leg_press', name: 'Leg Press 45°', category: 'Pernas', primaryMuscle: 'Quadríceps / Glúteos', equipment: 'Máquina', isCustom: false },
  { id: 'ex_leg_extension', name: 'Cadeira Extensora', category: 'Pernas', primaryMuscle: 'Quadríceps', equipment: 'Máquina', isCustom: false },
  { id: 'ex_leg_curl', name: 'Mesa / Cadeira Flexora', category: 'Pernas', primaryMuscle: 'Isquiotibiais', equipment: 'Máquina', isCustom: false },
  { id: 'ex_romanian_deadlift', name: 'Stiff / RDL com Halteres', category: 'Pernas', primaryMuscle: 'Isquiotibiais / Glúteos', equipment: 'Halteres', isCustom: false },
  { id: 'ex_bulgarian_split_squat', name: 'Agachamento Búlgaro', category: 'Pernas', primaryMuscle: 'Quadríceps / Glúteos', equipment: 'Halteres', isCustom: false },
  { id: 'ex_calf_raise', name: 'Elevação de Gémeos em Pé', category: 'Pernas', primaryMuscle: 'Gémeos / Panturrilhas', equipment: 'Máquina', isCustom: false },
  { id: 'ex_hip_thrust', name: 'Elevação Pélvica (Hip Thrust)', category: 'Pernas', primaryMuscle: 'Glúteos', equipment: 'Barra', isCustom: false },

  // Ombros
  { id: 'ex_overhead_press', name: 'Press Militar com Barra (OHP)', category: 'Ombros', primaryMuscle: 'Deltóide Anterior/Médio', equipment: 'Barra', isCustom: false },
  { id: 'ex_lateral_raise', name: 'Elevação Lateral com Halteres', category: 'Ombros', primaryMuscle: 'Deltóide Lateral', equipment: 'Halteres', isCustom: false },
  { id: 'ex_dumbbell_shoulder_press', name: 'Desenvolvimento com Halteres', category: 'Ombros', primaryMuscle: 'Deltóide Anterior/Médio', equipment: 'Halteres', isCustom: false },
  { id: 'ex_cable_lateral_raise', name: 'Elevação Lateral na Polia', category: 'Ombros', primaryMuscle: 'Deltóide Lateral', equipment: 'Polia', isCustom: false },
  { id: 'ex_rear_delt_fly', name: 'Elevação Posterior (Pássaro)', category: 'Ombros', primaryMuscle: 'Deltóide Posterior', equipment: 'Halteres', isCustom: false },

  // Braços (Bíceps e Tríceps)
  { id: 'ex_barbell_curl', name: 'Curl com Barra EZ', category: 'Braços', primaryMuscle: 'Bíceps', equipment: 'Barra', isCustom: false },
  { id: 'ex_hammer_curl', name: 'Curl Martelo com Halteres', category: 'Braços', primaryMuscle: 'Braquial / Bíceps', equipment: 'Halteres', isCustom: false },
  { id: 'ex_incline_curl', name: 'Curl Inclinado com Halteres', category: 'Braços', primaryMuscle: 'Bíceps Cabeça Longa', equipment: 'Halteres', isCustom: false },
  { id: 'ex_tricep_rope_pushdown', name: 'Tríceps na Polia com Corda', category: 'Braços', primaryMuscle: 'Tríceps', equipment: 'Polia', isCustom: false },
  { id: 'ex_skull_crusher', name: 'Tríceps Testa (Skull Crusher)', category: 'Braços', primaryMuscle: 'Tríceps', equipment: 'Barra EZ', isCustom: false },
  { id: 'ex_tricep_overhead_extension', name: 'Tríceps Francês com Halter', category: 'Braços', primaryMuscle: 'Tríceps Cabeça Longa', equipment: 'Halteres', isCustom: false },

  // Core & Abdominais
  { id: 'ex_plank', name: 'Prancha Isométrica', category: 'Abdominais', primaryMuscle: 'Core / Transverso', equipment: 'Peso Corporal', isCustom: false },
  { id: 'ex_hanging_leg_raise', name: 'Elevação de Pernas em Suspensão', category: 'Abdominais', primaryMuscle: 'Abdominal Inferior', equipment: 'Barra Fixa', isCustom: false },
  { id: 'ex_cable_crunch', name: 'Crunch na Polia Alta', category: 'Abdominais', primaryMuscle: 'Reto Abdominal', equipment: 'Polia', isCustom: false },
  { id: 'ex_ab_wheel', name: 'Abdominal com Roda (Ab Wheel)', category: 'Abdominais', primaryMuscle: 'Core', equipment: 'Roda Abdominal', isCustom: false },

  // Cardio
  { id: 'ex_treadmill', name: 'Passadeira / Corrida', category: 'Cardio', primaryMuscle: 'Cardiovascular', equipment: 'Máquina', isCustom: false },
  { id: 'ex_stationary_bike', name: 'Bicicleta Estática', category: 'Cardio', primaryMuscle: 'Cardiovascular', equipment: 'Máquina', isCustom: false },
  { id: 'ex_rowing_machine', name: 'Remo Indoor', category: 'Cardio', primaryMuscle: 'Full Body Cardio', equipment: 'Máquina', isCustom: false }
];

// Initial Food Database with full Macronutrients & Micronutrients (per 100g or standard unit)
const DEFAULT_FOODS = [
  // Proteínas
  { id: 'food_chicken_breast', name: 'Peito de Frango Grelhado', servingSize: 100, unit: 'g', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, potassium: 256, calcium: 15, iron: 1.0, category: 'Proteína' },
  { id: 'food_lean_beef', name: 'Carne de Vaca Magra (Patinho/Alcatra)', servingSize: 100, unit: 'g', calories: 180, protein: 26.0, carbs: 0.0, fat: 8.0, fiber: 0, sugar: 0, sodium: 65, potassium: 330, calcium: 12, iron: 2.7, category: 'Proteína' },
  { id: 'food_salmon', name: 'Salmão Grelhado', servingSize: 100, unit: 'g', calories: 206, protein: 22.0, carbs: 0.0, fat: 12.0, fiber: 0, sugar: 0, sodium: 59, potassium: 384, calcium: 15, iron: 0.8, category: 'Proteína' },
  { id: 'food_tuna_water', name: 'Atum ao Natural em Lata', servingSize: 100, unit: 'g', calories: 116, protein: 26.0, carbs: 0.0, fat: 1.0, fiber: 0, sugar: 0, sodium: 320, potassium: 250, calcium: 10, iron: 1.3, category: 'Proteína' },
  { id: 'food_whole_egg', name: 'Ovo Inteiro Cozido (1 Unidade M)', servingSize: 50, unit: 'g', calories: 74, protein: 6.3, carbs: 0.4, fat: 5.0, fiber: 0, sugar: 0.2, sodium: 70, potassium: 69, calcium: 28, iron: 0.9, category: 'Proteína' },
  { id: 'food_egg_whites', name: 'Claras de Ovo Pasteurizadas', servingSize: 100, unit: 'ml', calories: 48, protein: 11.0, carbs: 0.7, fat: 0.2, fiber: 0, sugar: 0.7, sodium: 166, potassium: 163, calcium: 7, iron: 0.1, category: 'Proteína' },
  { id: 'food_whey_isolate', name: 'Whey Protein (1 Scoop)', servingSize: 30, unit: 'g', calories: 120, protein: 24.0, carbs: 2.0, fat: 1.5, fiber: 0.5, sugar: 1.0, sodium: 140, potassium: 160, calcium: 130, iron: 0.5, category: 'Suplementos' },
  { id: 'food_greek_yogurt_0', name: 'Iogurte Grego 0% Gordura', servingSize: 150, unit: 'g', calories: 85, protein: 15.0, carbs: 5.5, fat: 0.2, fiber: 0, sugar: 5.0, sodium: 55, potassium: 210, calcium: 170, iron: 0.1, category: 'Laticínios' },
  { id: 'food_cottage_cheese', name: 'Queijo Cottage / Quark', servingSize: 100, unit: 'g', calories: 72, protein: 12.5, carbs: 2.7, fat: 1.0, fiber: 0, sugar: 2.5, sodium: 360, potassium: 104, calcium: 83, iron: 0.1, category: 'Laticínios' },
  
  // Hidratos de Carbono
  { id: 'food_basmati_rice', name: 'Arroz Basmati Cozido', servingSize: 100, unit: 'g', calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 2, potassium: 35, calcium: 10, iron: 0.8, category: 'Hidratos' },
  { id: 'food_sweet_potato', name: 'Batata Doce Cozida/Assada', servingSize: 100, unit: 'g', calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, fiber: 3.0, sugar: 4.2, sodium: 55, potassium: 337, calcium: 30, iron: 0.6, category: 'Hidratos' },
  { id: 'food_rolled_oats', name: 'Aveia em Flocos', servingSize: 50, unit: 'g', calories: 190, protein: 6.8, carbs: 34.0, fat: 3.5, fiber: 5.0, sugar: 0.5, sodium: 3, potassium: 180, calcium: 27, iron: 2.3, category: 'Hidratos' },
  { id: 'food_pasta_cooked', name: 'Massa / Macarrão Cozido', servingSize: 100, unit: 'g', calories: 158, protein: 5.8, carbs: 31.0, fat: 0.9, fiber: 1.8, sugar: 0.6, sodium: 1, potassium: 44, calcium: 7, iron: 1.2, category: 'Hidratos' },
  { id: 'food_whole_bread', name: 'Pão 100% Integral (1 Fatia)', servingSize: 40, unit: 'g', calories: 95, protein: 4.0, carbs: 18.0, fat: 1.2, fiber: 2.8, sugar: 1.5, sodium: 180, potassium: 90, calcium: 40, iron: 1.1, category: 'Hidratos' },
  { id: 'food_banana', name: 'Banana Média (1 Unidade)', servingSize: 100, unit: 'g', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, sugar: 12.2, sodium: 1, potassium: 358, calcium: 5, iron: 0.3, category: 'Frutas' },
  { id: 'food_berries', name: 'Frutos Vermelhos / Mirtilos', servingSize: 100, unit: 'g', calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4, sugar: 9.9, sodium: 1, potassium: 77, calcium: 6, iron: 0.3, category: 'Frutas' },
  { id: 'food_apple', name: 'Maçã com Casca', servingSize: 150, unit: 'g', calories: 78, protein: 0.4, carbs: 20.7, fat: 0.3, fiber: 3.6, sugar: 15.5, sodium: 2, potassium: 160, calcium: 9, iron: 0.2, category: 'Frutas' },

  // Gorduras Saudáveis
  { id: 'food_olive_oil', name: 'Azeite de Oliva Extra Virgem (1 Colher Sopa)', servingSize: 13, unit: 'ml', calories: 119, protein: 0.0, carbs: 0.0, fat: 13.5, fiber: 0, sugar: 0, sodium: 0, potassium: 0, calcium: 0, iron: 0.1, category: 'Gorduras' },
  { id: 'food_peanut_butter', name: 'Manteiga de Amendoim 100%', servingSize: 20, unit: 'g', calories: 120, protein: 5.2, carbs: 3.2, fat: 10.0, fiber: 1.6, sugar: 1.0, sodium: 2, potassium: 140, calcium: 11, iron: 0.5, category: 'Gorduras' },
  { id: 'food_avocado', name: 'Abacate Fresco', servingSize: 100, unit: 'g', calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7, fiber: 6.7, sugar: 0.7, sodium: 7, potassium: 485, calcium: 12, iron: 0.6, category: 'Gorduras' },
  { id: 'food_almonds', name: 'Amêndoas / Nozes Naturais', servingSize: 30, unit: 'g', calories: 175, protein: 6.3, carbs: 6.0, fat: 15.0, fiber: 3.5, sugar: 1.2, sodium: 1, potassium: 210, calcium: 75, iron: 1.1, category: 'Gorduras' },

  // Vegetais & Fibras
  { id: 'food_broccoli', name: 'Brócolos Cozidos ao Vapor', servingSize: 100, unit: 'g', calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, fiber: 3.3, sugar: 1.4, sodium: 40, potassium: 290, calcium: 40, iron: 0.7, category: 'Vegetais' },
  { id: 'food_spinach', name: 'Espinafres Frescos / Cozidos', servingSize: 100, unit: 'g', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79, potassium: 558, calcium: 99, iron: 2.7, category: 'Vegetais' }
];

// Pre-built Workout Templates / Routines
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_push_a',
    name: 'Push A (Peito, Ombros, Tríceps)',
    category: 'Hipertrofia',
    description: 'Foco em força no supino reto, deltóide anterior/lateral e tríceps.',
    exercises: [
      { exerciseId: 'ex_bench_press', targetSets: 4, targetReps: '6-8', restSeconds: 120 },
      { exerciseId: 'ex_incline_dumbbell_press', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'ex_cable_crossover', targetSets: 3, targetReps: '12-15', restSeconds: 60 },
      { exerciseId: 'ex_overhead_press', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'ex_lateral_raise', targetSets: 4, targetReps: '12-15', restSeconds: 60 },
      { exerciseId: 'ex_tricep_rope_pushdown', targetSets: 3, targetReps: '10-12', restSeconds: 60 }
    ]
  },
  {
    id: 'tpl_pull_a',
    name: 'Pull A (Costas, Bíceps, Posterior)',
    category: 'Hipertrofia',
    description: 'Foco em puxadas pesadas, espessura das costas e bíceps completo.',
    exercises: [
      { exerciseId: 'ex_deadlift', targetSets: 3, targetReps: '5', restSeconds: 180 },
      { exerciseId: 'ex_lat_pulldown', targetSets: 4, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'ex_barbell_row', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'ex_face_pulls', targetSets: 3, targetReps: '15', restSeconds: 60 },
      { exerciseId: 'ex_barbell_curl', targetSets: 3, targetReps: '10-12', restSeconds: 60 },
      { exerciseId: 'ex_hammer_curl', targetSets: 3, targetReps: '10-12', restSeconds: 60 }
    ]
  },
  {
    id: 'tpl_legs_a',
    name: 'Legs A (Quadríceps, Isquiotibiais, Gémeos)',
    category: 'Pernas',
    description: 'Treino completo e intenso de pernas focado em agachamento livre.',
    exercises: [
      { exerciseId: 'ex_squat', targetSets: 4, targetReps: '6-8', restSeconds: 150 },
      { exerciseId: 'ex_leg_press', targetSets: 3, targetReps: '10-12', restSeconds: 90 },
      { exerciseId: 'ex_romanian_deadlift', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'ex_leg_curl', targetSets: 3, targetReps: '12-15', restSeconds: 60 },
      { exerciseId: 'ex_leg_extension', targetSets: 3, targetReps: '12-15', restSeconds: 60 },
      { exerciseId: 'ex_calf_raise', targetSets: 4, targetReps: '15-20', restSeconds: 45 }
    ]
  },
  {
    id: 'tpl_upper_power',
    name: 'Upper Body Power (Superior Completo)',
    category: 'Força & Potência',
    description: 'Rotina compacta de membros superiores com ênfase em carga progressiva.',
    exercises: [
      { exerciseId: 'ex_bench_press', targetSets: 4, targetReps: '5', restSeconds: 150 },
      { exerciseId: 'ex_pullups', targetSets: 4, targetReps: '6-8', restSeconds: 120 },
      { exerciseId: 'ex_overhead_press', targetSets: 3, targetReps: '6-8', restSeconds: 120 },
      { exerciseId: 'ex_cable_seated_row', targetSets: 3, targetReps: '8-10', restSeconds: 90 },
      { exerciseId: 'ex_skull_crusher', targetSets: 3, targetReps: '10-12', restSeconds: 60 },
      { exerciseId: 'ex_incline_curl', targetSets: 3, targetReps: '10-12', restSeconds: 60 }
    ]
  }
];

// Generate Realistic Past History (so the app looks rich with past progression on first launch)
function generateSampleHistory() {
  const today = new Date();
  const workouts = [];
  const nutritionLogs = {};
  const bodyMetrics = [];

  // 1. Generate 12 past workouts across 4 weeks with progressive overload
  const workoutDaysAgo = [28, 25, 22, 19, 16, 13, 10, 7, 5, 3, 1];

  workoutDaysAgo.forEach((days, index) => {
    const workoutDate = new Date(today);
    workoutDate.setDate(today.getDate() - days);
    const dateStr = workoutDate.toISOString().split('T')[0];

    const isPush = index % 3 === 0;
    const isPull = index % 3 === 1;

    const progFactor = index * 1.25; // Gradual weight increase

    if (isPush) {
      const benchWeight = Math.round((70 + progFactor * 1.5) * 2) / 2;
      const inclineWeight = Math.round((22 + progFactor * 0.8) * 2) / 2;
      const ohpWeight = Math.round((42.5 + progFactor * 0.9) * 2) / 2;

      workouts.push({
        id: 'w_' + dateStr + '_push',
        name: 'Push A - Peito & Ombros',
        date: dateStr,
        durationMinutes: 65,
        notes: index === workoutDaysAgo.length - 1 ? 'Excelente sessão! Senti o supino muito sólido e aumentei a carga.' : 'Treino concluído com boa intensidade.',
        exercises: [
          {
            exerciseId: 'ex_bench_press',
            exerciseName: 'Supino Reto com Barra',
            sets: [
              { setNumber: 1, type: 'warmup', weightKg: benchWeight - 20, reps: 10, rpe: 6, completed: true },
              { setNumber: 2, type: 'normal', weightKg: benchWeight, reps: 8, rpe: 8, completed: true },
              { setNumber: 3, type: 'normal', weightKg: benchWeight, reps: 8, rpe: 8.5, completed: true },
              { setNumber: 4, type: 'normal', weightKg: benchWeight, reps: 7, rpe: 9.5, completed: true }
            ]
          },
          {
            exerciseId: 'ex_incline_dumbbell_press',
            exerciseName: 'Supino Inclinado com Halteres',
            sets: [
              { setNumber: 1, type: 'normal', weightKg: inclineWeight, reps: 10, rpe: 8, completed: true },
              { setNumber: 2, type: 'normal', weightKg: inclineWeight, reps: 9, rpe: 8.5, completed: true },
              { setNumber: 3, type: 'normal', weightKg: inclineWeight, reps: 8, rpe: 9, completed: true }
            ]
          },
          {
            exerciseId: 'ex_overhead_press',
            exerciseName: 'Press Militar com Barra (OHP)',
            sets: [
              { setNumber: 1, type: 'normal', weightKg: ohpWeight, reps: 8, rpe: 8, completed: true },
              { setNumber: 2, type: 'normal', weightKg: ohpWeight, reps: 8, rpe: 8.5, completed: true },
              { setNumber: 3, type: 'normal', weightKg: ohpWeight, reps: 7, rpe: 9, completed: true }
            ]
          },
          {
            exerciseId: 'ex_lateral_raise',
            exerciseName: 'Elevação Lateral com Halteres',
            sets: [
              { setNumber: 1, type: 'normal', weightKg: 10, reps: 15, rpe: 8, completed: true },
              { setNumber: 2, type: 'normal', weightKg: 10, reps: 14, rpe: 8.5, completed: true },
              { setNumber: 3, type: 'drop', weightKg: 8, reps: 15, rpe: 10, completed: true }
            ]
          },
          {
            exerciseId: 'ex_tricep_rope_pushdown',
            exerciseName: 'Tríceps na Polia com Corda',
            sets: [
              { setNumber: 1, type: 'normal', weightKg: 25, reps: 12, rpe: 8, completed: true },
              { setNumber: 2, type: 'normal', weightKg: 25, reps: 11, rpe: 9, completed: true },
              { setNumber: 3, type: 'normal', weightKg: 27.5, reps: 9, rpe: 9.5, completed: true }
            ]
          }
        ]
      });
    } else if (isPull) {
      const deadliftWeight = Math.round((105 + progFactor * 2.2) * 2) / 2;
      const latWeight = Math.round((55 + progFactor * 1.2) * 2) / 2;
      const curlWeight = Math.round((28 + progFactor * 0.7) * 2) / 2;

      workouts.push({
        id: 'w_' + dateStr + '_pull',
        name: 'Pull A - Costas & Bíceps',
        date: dateStr,
        durationMinutes: 70,
        notes: 'Puxadas pesadas com excelente conexão mente-músculo.',
        exercises: [
          {
            exerciseId: 'ex_deadlift',
            exerciseName: 'Levantamento Terra (Deadlift)',
            sets: [
              { setNumber: 1, type: 'warmup', weightKg: deadliftWeight - 40, reps: 8, rpe: 6, completed: true },
              { setNumber: 2, type: 'normal', weightKg: deadliftWeight, reps: 5, rpe: 8.5, completed: true },
              { setNumber: 3, type: 'normal', weightKg: deadliftWeight, reps: 5, rpe: 9, completed: true }
            ]
          },
          {
            exerciseId: 'ex_lat_pulldown',
            exerciseName: 'Puxada na Polia Alta (Lat Pulldown)',
            sets: [
              { setNumber: 1, type: 'normal', weightKg: latWeight, reps: 10, rpe: 8, completed: true },
              { setNumber: 2, type: 'normal', weightKg: latWeight, reps: 9, rpe: 8.5, completed: true },
              { setNumber: 3, type: 'normal', weightKg: latWeight, reps: 8, rpe: 9, completed: true }
            ]
          },
          {
            exerciseId: 'ex_barbell_curl',
            exerciseName: 'Curl com Barra EZ',
            sets: [
              { setNumber: 1, type: 'normal', weightKg: curlWeight, reps: 10, rpe: 8, completed: true },
              { setNumber: 2, type: 'normal', weightKg: curlWeight, reps: 10, rpe: 8.5, completed: true },
              { setNumber: 3, type: 'normal', weightKg: curlWeight, reps: 9, rpe: 9.5, completed: true }
            ]
          }
        ]
      });
    } else {
      const squatWeight = Math.round((85 + progFactor * 2.0) * 2) / 2;
      const legPressWeight = Math.round((180 + progFactor * 5.0) * 2) / 2;

      workouts.push({
        id: 'w_' + dateStr + '_legs',
        name: 'Legs A - Pernas & Glúteos',
        date: dateStr,
        durationMinutes: 60,
        notes: 'Treino de pernas muito intenso. Excelente profundidade no agachamento.',
        exercises: [
          {
            exerciseId: 'ex_squat',
            exerciseName: 'Agachamento Livre com Barra',
            sets: [
              { setNumber: 1, type: 'warmup', weightKg: 60, reps: 10, rpe: 6, completed: true },
              { setNumber: 2, type: 'normal', weightKg: squatWeight, reps: 8, rpe: 8, completed: true },
              { setNumber: 3, type: 'normal', weightKg: squatWeight, reps: 8, rpe: 8.5, completed: true },
              { setNumber: 4, type: 'normal', weightKg: squatWeight, reps: 7, rpe: 9, completed: true }
            ]
          },
          {
            exerciseId: 'ex_leg_press',
            exerciseName: 'Leg Press 45°',
            sets: [
              { setNumber: 1, type: 'normal', weightKg: legPressWeight, reps: 12, rpe: 8, completed: true },
              { setNumber: 2, type: 'normal', weightKg: legPressWeight, reps: 10, rpe: 8.5, completed: true },
              { setNumber: 3, type: 'normal', weightKg: legPressWeight + 20, reps: 8, rpe: 9.5, completed: true }
            ]
          },
          {
            exerciseId: 'ex_calf_raise',
            exerciseName: 'Elevação de Gémeos em Pé',
            sets: [
              { setNumber: 1, type: 'normal', weightKg: 50, reps: 15, rpe: 8, completed: true },
              { setNumber: 2, type: 'normal', weightKg: 50, reps: 15, rpe: 8.5, completed: true },
              { setNumber: 3, type: 'normal', weightKg: 55, reps: 12, rpe: 9.5, completed: true }
            ]
          }
        ]
      });
    }
  });

  // 2. Generate 14 days of realistic Nutrition Logs
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const isToday = i === 0;

    nutritionLogs[dateStr] = {
      date: dateStr,
      waterMl: isToday ? 2250 : 3000 + (i % 3) * 250,
      meals: {
        breakfast: [
          { foodId: 'food_rolled_oats', name: 'Aveia em Flocos', amount: 60, unit: 'g', calories: 228, protein: 8.1, carbs: 40.8, fat: 4.2, fiber: 6.0, sugar: 0.6, sodium: 4, potassium: 216, calcium: 32, iron: 2.7 },
          { foodId: 'food_whey_isolate', name: 'Whey Protein (1 Scoop)', amount: 30, unit: 'g', calories: 120, protein: 24.0, carbs: 2.0, fat: 1.5, fiber: 0.5, sugar: 1.0, sodium: 140, potassium: 160, calcium: 130, iron: 0.5 },
          { foodId: 'food_berries', name: 'Frutos Vermelhos / Mirtilos', amount: 80, unit: 'g', calories: 45, protein: 0.6, carbs: 11.6, fat: 0.2, fiber: 1.9, sugar: 7.9, sodium: 1, potassium: 61, calcium: 5, iron: 0.2 }
        ],
        lunch: [
          { foodId: 'food_chicken_breast', name: 'Peito de Frango Grelhado', amount: 180, unit: 'g', calories: 297, protein: 55.8, carbs: 0.0, fat: 6.5, fiber: 0, sugar: 0, sodium: 133, potassium: 460, calcium: 27, iron: 1.8 },
          { foodId: 'food_basmati_rice', name: 'Arroz Basmati Cozido', amount: 200, unit: 'g', calories: 260, protein: 5.4, carbs: 56.4, fat: 0.6, fiber: 0.8, sugar: 0.2, sodium: 4, potassium: 70, calcium: 20, iron: 1.6 },
          { foodId: 'food_olive_oil', name: 'Azeite de Oliva Extra Virgem', amount: 10, unit: 'ml', calories: 91, protein: 0.0, carbs: 0.0, fat: 10.4, fiber: 0, sugar: 0, sodium: 0, potassium: 0, calcium: 0, iron: 0.1 },
          { foodId: 'food_broccoli', name: 'Brócolos Cozidos ao Vapor', amount: 120, unit: 'g', calories: 42, protein: 2.9, carbs: 8.6, fat: 0.5, fiber: 4.0, sugar: 1.7, sodium: 48, potassium: 348, calcium: 48, iron: 0.8 }
        ],
        dinner: isToday ? [
          { foodId: 'food_salmon', name: 'Salmão Grelhado', amount: 160, unit: 'g', calories: 330, protein: 35.2, carbs: 0.0, fat: 19.2, fiber: 0, sugar: 0, sodium: 94, potassium: 614, calcium: 24, iron: 1.3 },
          { foodId: 'food_sweet_potato', name: 'Batata Doce Cozida/Assada', amount: 220, unit: 'g', calories: 189, protein: 3.5, carbs: 44.2, fat: 0.2, fiber: 6.6, sugar: 9.2, sodium: 121, potassium: 741, calcium: 66, iron: 1.3 },
          { foodId: 'food_spinach', name: 'Espinafres Salteados', amount: 100, unit: 'g', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79, potassium: 558, calcium: 99, iron: 2.7 }
        ] : [
          { foodId: 'food_lean_beef', name: 'Carne de Vaca Magra', amount: 170, unit: 'g', calories: 306, protein: 44.2, carbs: 0.0, fat: 13.6, fiber: 0, sugar: 0, sodium: 110, potassium: 561, calcium: 20, iron: 4.6 },
          { foodId: 'food_sweet_potato', name: 'Batata Doce Cozida', amount: 200, unit: 'g', calories: 172, protein: 3.2, carbs: 40.2, fat: 0.2, fiber: 6.0, sugar: 8.4, sodium: 110, potassium: 674, calcium: 60, iron: 1.2 }
        ],
        snacks: [
          { foodId: 'food_greek_yogurt_0', name: 'Iogurte Grego 0%', amount: 170, unit: 'g', calories: 96, protein: 17.0, carbs: 6.2, fat: 0.2, fiber: 0, sugar: 5.7, sodium: 62, potassium: 238, calcium: 193, iron: 0.1 },
          { foodId: 'food_peanut_butter', name: 'Manteiga de Amendoim 100%', amount: 20, unit: 'g', calories: 120, protein: 5.2, carbs: 3.2, fat: 10.0, fiber: 1.6, sugar: 1.0, sodium: 2, potassium: 140, calcium: 11, iron: 0.5 },
          { foodId: 'food_banana', name: 'Banana Média', amount: 100, unit: 'g', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, sugar: 12.2, sodium: 1, potassium: 358, calcium: 5, iron: 0.3 }
        ]
      }
    };
  }

  // 3. Generate 30 days of body weight & measurements
  const initialWeight = 78.4;
  for (let i = 30; i >= 0; i -= 2) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const progress = (30 - i) / 30;
    const noise = (Math.sin(i * 1.5) * 0.2);
    const weight = Math.round((initialWeight - progress * 2.6 + noise) * 10) / 10;
    const bodyFat = Math.round((16.8 - progress * 2.2 + noise * 0.1) * 10) / 10;
    const waist = Math.round((84.5 - progress * 3.5) * 10) / 10;

    bodyMetrics.push({
      id: 'bm_' + dateStr,
      date: dateStr,
      weightKg: weight,
      bodyFatPct: bodyFat,
      measurements: {
        chestCm: 104.5,
        waistCm: waist,
        armsRightCm: 38.5,
        armsLeftCm: 38.2,
        thighRightCm: 59.0,
        thighLeftCm: 58.8,
        calvesCm: 37.5
      },
      notes: i === 0 ? 'Pesagem em jejum matinal após hidratação.' : 'Progresso consistente.'
    });
  }

  return { workouts, nutritionLogs, bodyMetrics };
}

// User Profile & Default Daily Nutrition Targets
const DEFAULT_USER_PROFILE = {
  name: 'Francisco',
  age: 26,
  gender: 'male',
  heightCm: 178,
  weightKg: 75.8,
  activityLevel: 'moderate', // sedentary, light, moderate, heavy, extreme
  goal: 'lean_bulk', // cut, maintain, lean_bulk, heavy_bulk
  dailyTargets: {
    calories: 2450,
    protein: 170, // grams (~2.2g/kg)
    carbs: 265,   // grams
    fat: 65,      // grams
    waterMl: 3000,
    // Micronutrient Daily Goals
    fiber: 35,    // g
    sodium: 2300, // mg max
    potassium: 3500, // mg
    calcium: 1000,   // mg
    iron: 14         // mg
  }
};

// Gamification Badges & Achievements
const DEFAULT_ACHIEVEMENTS = [
  { id: 'ach_first_workout', title: 'Primeiro Passo', desc: 'Conclui o teu primeiro treino registado.', icon: 'trophy', unlocked: true, unlockedAt: '2026-07-25' },
  { id: 'ach_bench_80', title: 'Clube dos 80kg Supino', desc: 'Atinge 80kg no Supino Reto.', icon: 'award', unlocked: true, unlockedAt: '2026-08-20' },
  { id: 'ach_squat_100', title: 'Mestre do Agachamento', desc: 'Alcança 100kg no Agachamento Livre.', icon: 'zap', unlocked: true, unlockedAt: '2026-08-15' },
  { id: 'ach_deadlift_120', title: 'Poder Puro', desc: 'Alcança 120kg no Levantamento Terra.', icon: 'shield', unlocked: true, unlockedAt: '2026-08-18' },
  { id: 'ach_streak_7', title: 'Disciplina de Ferro', desc: 'Mantém 7 dias seguidos de registo de dieta.', icon: 'flame', unlocked: true, unlockedAt: '2026-08-22' },
  { id: 'ach_volume_10k', title: 'Volume Monstruoso', desc: 'Supera 10.000 kg de volume total num único treino.', icon: 'trending-up', unlocked: true, unlockedAt: '2026-08-12' },
  { id: 'ach_protein_goal', title: 'Construtor de Músculo', desc: 'Cumpre a tua meta diária de proteína 5 vezes.', icon: 'target', unlocked: true, unlockedAt: '2026-08-21' },
  { id: 'ach_water_master', title: 'Hidratação Nível Elite', desc: 'Alcança a tua meta de água 7 dias seguidos.', icon: 'droplet', unlocked: true, unlockedAt: '2026-08-23' }
];

/**
 * Storage Manager Helper: Handles LocalStorage CRUD, export and import
 */
const StorageManager = {
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.EXERCISES)) {
      localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(DEFAULT_EXERCISES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FOODS)) {
      localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify(DEFAULT_FOODS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(DEFAULT_USER_PROFILE));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS)) {
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(DEFAULT_ACHIEVEMENTS));
    }

    // If no workouts or nutrition logs exist, initialize with rich sample data
    if (!localStorage.getItem(STORAGE_KEYS.WORKOUTS)) {
      const sample = generateSampleHistory();
      localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(sample.workouts));
      localStorage.setItem(STORAGE_KEYS.NUTRITION_LOGS, JSON.stringify(sample.nutritionLogs));
      localStorage.setItem(STORAGE_KEYS.BODY_METRICS, JSON.stringify(sample.bodyMetrics));
    }
  },

  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  },

  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
      return false;
    }
  },

  // Export full app data as JSON string
  exportBackup() {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userProfile: this.get(STORAGE_KEYS.USER_PROFILE),
      exercises: this.get(STORAGE_KEYS.EXERCISES),
      foods: this.get(STORAGE_KEYS.FOODS),
      templates: this.get(STORAGE_KEYS.TEMPLATES),
      workouts: this.get(STORAGE_KEYS.WORKOUTS),
      nutritionLogs: this.get(STORAGE_KEYS.NUTRITION_LOGS),
      bodyMetrics: this.get(STORAGE_KEYS.BODY_METRICS),
      achievements: this.get(STORAGE_KEYS.ACHIEVEMENTS)
    };
    return JSON.stringify(backup, null, 2);
  },

  // Import JSON backup
  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.workouts) this.set(STORAGE_KEYS.WORKOUTS, data.workouts);
      if (data.nutritionLogs) this.set(STORAGE_KEYS.NUTRITION_LOGS, data.nutritionLogs);
      if (data.bodyMetrics) this.set(STORAGE_KEYS.BODY_METRICS, data.bodyMetrics);
      if (data.exercises) this.set(STORAGE_KEYS.EXERCISES, data.exercises);
      if (data.foods) this.set(STORAGE_KEYS.FOODS, data.foods);
      if (data.templates) this.set(STORAGE_KEYS.TEMPLATES, data.templates);
      if (data.userProfile) this.set(STORAGE_KEYS.USER_PROFILE, data.userProfile);
      if (data.achievements) this.set(STORAGE_KEYS.ACHIEVEMENTS, data.achievements);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Export workouts as CSV
  exportWorkoutsCSV() {
    const workouts = this.get(STORAGE_KEYS.WORKOUTS, []);
    let csv = 'Data,Treino,Exercicio,Serie,Tipo,Carga_kg,Reps,RPE,Concluido,1RM_Estimado_kg\n';

    workouts.forEach(w => {
      w.exercises.forEach(ex => {
        ex.sets.forEach(s => {
          const estimated1RM = s.reps > 1 ? Math.round(s.weightKg * (1 + s.reps / 30) * 10) / 10 : s.weightKg;
          csv += `"${w.date}","${w.name}","${ex.exerciseName}",${s.setNumber},"${s.type}",${s.weightKg},${s.reps},${s.rpe || ''},${s.completed ? 'SIM' : 'NAO'},${estimated1RM}\n`;
        });
      });
    });

    return csv;
  },

  // Reset to default sample state
  resetAll() {
    localStorage.clear();
    this.init();
  }
};

// Expose globally to window
window.StorageManager = StorageManager;
window.STORAGE_KEYS = STORAGE_KEYS;
window.DEFAULT_EXERCISES = DEFAULT_EXERCISES;
window.DEFAULT_FOODS = DEFAULT_FOODS;
window.DEFAULT_TEMPLATES = DEFAULT_TEMPLATES;
window.DEFAULT_USER_PROFILE = DEFAULT_USER_PROFILE;
window.DEFAULT_ACHIEVEMENTS = DEFAULT_ACHIEVEMENTS;

// Initialize immediately
StorageManager.init();
