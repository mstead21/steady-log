const STORAGE_KEY = 'steadyLogV3';

const defaultState = {
  stats: {
    currentWeight: null,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    water: 0,
    steps: 0,
    weeklySessions: 0,
  },
  todayWorkout: 'Upper Body',
  workoutFocus: 'Chest, shoulders, triceps',
  workouts: [],
  weightLogs: [],
  measurements: [],
  nutritionDays: [],
  cardioLogs: [],
  history: [],
};

let state = loadState();
let timerSeconds = 60;
let timerInterval = null;
let timerRunning = false;

const videos = [
  { title: 'Incline Dumbbell Press', area: 'Chest', url: 'https://www.youtube.com/results?search_query=incline+dumbbell+press' },
  { title: 'Lat Pulldown', area: 'Back', url: 'https://www.youtube.com/results?search_query=lat+pulldown+form' },
  { title: 'Shoulder Press', area: 'Shoulders', url: 'https://www.youtube.com/results?search_query=shoulder+press+form' },
  { title: 'Leg Press', area: 'Legs', url: 'https://www.youtube.com/results?search_query=leg+press+form' },
  { title: 'Romanian Deadlift', area: 'Hamstrings', url: 'https://www.youtube.com/results?search_query=romanian+deadlift+form' },
  { title: 'Cable Curl', area: 'Arms', url: 'https://www.youtube.com/results?search_query=cable+bicep+curl+form' },
];

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addHistory(type, text) {
  state.history.unshift({ type, text, date: new Date().toLocaleString() });
  state.history = state.history.slice(0, 30);
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function setTodayDefaults() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
  document.getElementById('weightDate').value = today;
}

function bindNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
  document.querySelectorAll('[data-jump]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.jump));
  });
}

function switchSection(sectionId) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === sectionId));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active-page', p.id === sectionId));
  document.getElementById('pageTitle').textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
}

function renderDashboard() {
  const latestWeight = state.weightLogs[0]?.weight ?? state.stats.currentWeight;
  const latestNutrition = state.nutritionDays[0] || {};
  const cardioTotalMins = state.cardioLogs.reduce((sum, c) => sum + Number(c.minutes || 0), 0);
  const waterAvg = state.nutritionDays.length
    ? state.nutritionDays.reduce((sum, d) => sum + Number(d.water || 0), 0) / state.nutritionDays.length
    : 0;
  const mealsPossible = state.nutritionDays.length * 7;
  const mealsCompleted = state.nutritionDays.reduce((sum, d) => sum + d.meals.length, 0);
  const mealRate = mealsPossible ? Math.round((mealsCompleted / mealsPossible) * 100) : 0;
  const avgWeight = state.weightLogs.length
    ? (state.weightLogs.reduce((sum, log) => sum + Number(log.weight), 0) / state.weightLogs.length).toFixed(1)
    : '--';

  setText('heroWeight', latestWeight ? `${latestWeight} kg` : '-- kg');
  setText('heroCalories', latestNutrition.calories ?? '--');
  setText('heroWater', latestNutrition.water ? `${latestNutrition.water} L` : '-- L');
  setText('todayWorkoutCard', state.todayWorkout);
  setText('todayWorkoutNote', state.workoutFocus);
  setText('stepsCard', state.stats.steps || 0);
  setText('proteinCard', `${latestNutrition.protein || 0} g`);
  setText('sessionsCard', `${state.stats.weeklySessions || 0} / 6`);
  setText('consistencyCard', state.stats.weeklySessions >= 5 ? 'Strong week' : 'Keep pushing');
  setText('avgWeight', avgWeight === '--' ? '-- kg' : `${avgWeight} kg`);
  setText('weeklyCardio', cardioTotalMins);
  setText('waterAvg', `${waterAvg.toFixed(1)} L`);
  setText('mealHitRate', `${mealRate}%`);

  const plan = [
    `${state.todayWorkout} session`,
    '20 mins stair climber',
    '30–40 mins treadmill walk',
    'Hit protein target and 4L water',
  ];
  document.getElementById('todayPlan').innerHTML = plan.map(item => `<li>${item}</li>`).join('');
}

function renderWorkoutEntries() {
  const container = document.getElementById('workoutEntries');
  if (!state.workouts.length) {
    container.className = 'entry-list empty-state';
    container.textContent = 'No exercises logged yet.';
    document.getElementById('previousBestBox').textContent = 'Previous best: none yet';
    return;
  }
  container.className = 'entry-list';
  container.innerHTML = state.workouts.slice(0, 8).map(w => `
    <div class="entry-card">
      <h4>${w.exercise}</h4>
      <div class="entry-meta">${w.session} • ${w.weight} kg • ${w.completedSets}/${w.targetSets} sets • ${w.targetReps} reps</div>
      <p>${w.notes || 'No notes'}</p>
    </div>
  `).join('');
  const last = state.workouts[0];
  document.getElementById('previousBestBox').textContent = `Previous best: ${last.exercise} — ${last.weight} kg for ${last.targetReps} reps`;
}

function renderMeasurements() {
  const container = document.getElementById('measurementEntries');
  if (!state.measurements.length) {
    container.className = 'entry-list empty-state';
    container.textContent = 'No measurements saved yet.';
    return;
  }
  container.className = 'entry-list';
  container.innerHTML = state.measurements.slice(0, 6).map(m => `
    <div class="entry-card">
      <h4>${formatDate(m.date)}</h4>
      <div class="entry-meta">Waist ${m.waist || '-'} cm • Chest ${m.chest || '-'} cm • Arms ${m.arms || '-'} cm</div>
      <p>${m.note || 'No progress note'}</p>
    </div>
  `).join('');
}

function renderNutrition() {
  const latest = state.nutritionDays[0];
  setText('nutritionCalories', latest ? latest.calories : '--');
  setText('nutritionProtein', latest ? `${latest.protein} g` : '--');
  setText('nutritionCarbs', latest ? `${latest.carbs} g` : '--');
  setText('nutritionFat', latest ? `${latest.fat} g` : '--');
  setText('nutritionWater', latest ? `${latest.water} L` : '--');
  setText('mealsCompleted', latest ? `${latest.meals.length} / 7` : '0 / 7');
  setText('supplementList', latest?.supplements ? `Supplements: ${latest.supplements}` : 'No supplement log saved yet.');
}

function renderCardio() {
  setText('cardioSessions', state.cardioLogs.length);
  setText('cardioMinutesTotal', state.cardioLogs.reduce((sum, c) => sum + Number(c.minutes || 0), 0));
  setText('cardioStepsTotal', state.cardioLogs.reduce((sum, c) => sum + Number(c.steps || 0), 0).toLocaleString());
  const container = document.getElementById('cardioEntries');
  if (!state.cardioLogs.length) {
    container.className = 'entry-list empty-state';
    container.textContent = 'No cardio entries yet.';
    return;
  }
  container.className = 'entry-list';
  container.innerHTML = state.cardioLogs.slice(0, 6).map(c => `
    <div class="entry-card">
      <h4>${c.type}</h4>
      <div class="entry-meta">${c.minutes} mins • ${Number(c.steps).toLocaleString()} steps</div>
      <p>${c.notes || 'No notes'}</p>
    </div>
  `).join('');
}

function renderHistory() {
  const container = document.getElementById('historyFeed');
  if (!state.history.length) {
    container.className = 'entry-list empty-state';
    container.textContent = 'No history yet. Start logging to populate this feed.';
    return;
  }
  container.className = 'entry-list';
  container.innerHTML = state.history.map(h => `
    <div class="entry-card">
      <h4>${h.type}</h4>
      <div class="entry-meta">${h.date}</div>
      <p>${h.text}</p>
    </div>
  `).join('');
}

function renderVideos() {
  document.getElementById('videoGrid').innerHTML = videos.map(video => `
    <div class="video-card">
      <span>${video.area}</span>
      <strong>${video.title}</strong>
      <a class="primary-btn" href="${video.url}" target="_blank" rel="noopener noreferrer">Open video</a>
    </div>
  `).join('');
}

function drawWeightChart() {
  const canvas = document.getElementById('weightChart');
  const ctx = canvas.getContext('2d');
  const logs = [...state.weightLogs].reverse();
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 180 * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, 180);

  if (logs.length < 2) {
    ctx.fillStyle = '#9eb0cc';
    ctx.font = '14px Inter';
    ctx.fillText('Add at least 2 weight entries to show trend.', 14, 28);
    return;
  }

  const values = logs.map(l => Number(l.weight));
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const pad = 28;
  const width = rect.width - pad * 2;
  const height = 180 - pad * 2;

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = pad + (height / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + width, y);
    ctx.stroke();
  }

  ctx.beginPath();
  logs.forEach((log, index) => {
    const x = pad + (index / (logs.length - 1)) * width;
    const y = pad + ((max - Number(log.weight)) / (max - min)) * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#6fa8ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  logs.forEach((log, index) => {
    const x = pad + (index / (logs.length - 1)) * width;
    const y = pad + ((max - Number(log.weight)) / (max - min)) * height;
    ctx.fillStyle = '#4fe3a1';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function bindForms() {
  document.getElementById('workoutForm').addEventListener('submit', e => {
    e.preventDefault();
    const entry = {
      session: value('sessionName'),
      exercise: value('exerciseName'),
      targetSets: Number(value('targetSets')),
      targetReps: Number(value('targetReps')),
      weight: Number(value('weightUsed')),
      completedSets: Number(value('completedSets')),
      notes: value('workoutNotes'),
      date: new Date().toISOString(),
    };
    state.workouts.unshift(entry);
    addHistory('Workout', `${entry.exercise} logged at ${entry.weight} kg.`);
    saveState();
    renderAll();
    e.target.reset();
    document.getElementById('targetSets').value = 3;
    document.getElementById('targetReps').value = 10;
    document.getElementById('weightUsed').value = 20;
    document.getElementById('completedSets').value = 0;
  });

  document.getElementById('completeWorkoutBtn').addEventListener('click', () => {
    state.stats.weeklySessions += 1;
    addHistory('Session Complete', 'Workout session marked complete.');
    saveState();
    renderAll();
  });

  document.getElementById('weightForm').addEventListener('submit', e => {
    e.preventDefault();
    const log = { date: value('weightDate'), weight: Number(value('weightValue')).toFixed(1) };
    state.weightLogs.unshift(log);
    state.stats.currentWeight = log.weight;
    addHistory('Weight', `Bodyweight updated to ${log.weight} kg.`);
    saveState();
    renderAll();
    e.target.reset();
    setTodayDefaults();
  });

  document.getElementById('measurementForm').addEventListener('submit', e => {
    e.preventDefault();
    const entry = {
      date: new Date().toISOString(),
      waist: value('waistValue'),
      chest: value('chestValue'),
      arms: value('armsValue'),
      note: value('progressNote'),
    };
    state.measurements.unshift(entry);
    addHistory('Measurements', 'Progress check-in saved.');
    saveState();
    renderAll();
    e.target.reset();
  });

  document.getElementById('nutritionForm').addEventListener('submit', e => {
    e.preventDefault();
    const meals = [...document.querySelectorAll('#mealChecklist input:checked')].map(i => i.value);
    const day = {
      date: new Date().toISOString(),
      calories: Number(value('caloriesInput')),
      protein: Number(value('proteinInput')),
      carbs: Number(value('carbsInput')),
      fat: Number(value('fatInput')),
      water: Number(value('waterInput')),
      meals,
      supplements: value('supplementInput'),
    };
    state.nutritionDays.unshift(day);
    state.stats.calories = day.calories;
    state.stats.protein = day.protein;
    state.stats.carbs = day.carbs;
    state.stats.fat = day.fat;
    state.stats.water = day.water;
    addHistory('Nutrition', `Nutrition saved: ${day.calories} kcal and ${day.protein}g protein.`);
    saveState();
    renderAll();
  });

  document.getElementById('cardioForm').addEventListener('submit', e => {
    e.preventDefault();
    const entry = {
      type: value('cardioType'),
      minutes: Number(value('cardioMinutes')),
      steps: Number(value('cardioSteps')),
      notes: value('cardioNotes'),
      date: new Date().toISOString(),
    };
    state.cardioLogs.unshift(entry);
    state.stats.steps += entry.steps;
    addHistory('Cardio', `${entry.type} logged for ${entry.minutes} mins.`);
    saveState();
    renderAll();
    e.target.reset();
    document.getElementById('cardioMinutes').value = 30;
    document.getElementById('cardioSteps').value = 5000;
  });
}

function value(id) {
  return document.getElementById(id).value;
}

function bindTimer() {
  updateTimerDisplay();
  document.querySelectorAll('.timer-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      timerSeconds = Number(btn.dataset.seconds);
      stopTimer(false);
      updateTimerDisplay();
    });
  });
  document.getElementById('timerStartPause').addEventListener('click', () => {
    if (timerRunning) stopTimer(false);
    else startTimer();
  });
  document.getElementById('timerReset').addEventListener('click', () => {
    stopTimer(false);
    timerSeconds = 60;
    updateTimerDisplay();
  });
  document.getElementById('startTimerBtn').addEventListener('click', startTimer);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  document.getElementById('timerStartPause').textContent = 'Pause';
  timerInterval = setInterval(() => {
    timerSeconds -= 1;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      stopTimer(true);
      timerSeconds = 60;
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer(finished) {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById('timerStartPause').textContent = 'Start';
  if (finished) alert('Rest complete. Back to work.');
}

function updateTimerDisplay() {
  const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const secs = String(timerSeconds % 60).padStart(2, '0');
  setText('timerDisplay', `${mins}:${secs}`);
}

function bindQuickLog() {
  const modal = document.getElementById('quickLogModal');
  document.getElementById('openQuickLog').addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('closeQuickLog').addEventListener('click', () => modal.classList.add('hidden'));
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const quick = btn.dataset.quick;
      if (quick === 'water') state.stats.water = Number((Number(state.stats.water || 0) + 0.5).toFixed(1));
      if (quick === 'steps') state.stats.steps += 1000;
      if (quick === 'protein') state.stats.protein += 25;
      if (quick === 'session') state.stats.weeklySessions += 1;
      addHistory('Quick Log', `${btn.textContent} applied.`);
      saveState();
      renderAll();
    });
  });
}

function bindUtilityButtons() {
  document.getElementById('loadDemoBtn').addEventListener('click', loadDemoData);
  document.getElementById('resetDataBtn').addEventListener('click', () => {
    if (!confirm('Reset all app data?')) return;
    state = structuredClone(defaultState);
    saveState();
    renderAll();
  });
}

function loadDemoData() {
  state = {
    ...structuredClone(defaultState),
    stats: { currentWeight: 95.0, calories: 1950, protein: 220, carbs: 155, fat: 47, water: 4, steps: 23450, weeklySessions: 5 },
    todayWorkout: 'Upper Body',
    workoutFocus: 'Pressing, delts and arms',
    workouts: [
      { session: 'Upper Body A', exercise: 'Incline Dumbbell Press', targetSets: 3, targetReps: 10, weight: 32.5, completedSets: 3, notes: 'Strong today', date: new Date().toISOString() },
      { session: 'Upper Body A', exercise: 'Cable Row', targetSets: 3, targetReps: 12, weight: 55, completedSets: 3, notes: 'Controlled reps', date: new Date().toISOString() }
    ],
    weightLogs: [
      { date: '2026-03-12', weight: '95.0' },
      { date: '2026-03-08', weight: '95.8' },
      { date: '2026-03-04', weight: '96.4' },
      { date: '2026-02-28', weight: '97.1' }
    ],
    measurements: [
      { date: '2026-03-12', waist: '92', chest: '109', arms: '41', note: 'Waist tightening and energy good.' }
    ],
    nutritionDays: [
      { date: new Date().toISOString(), calories: 1950, protein: 220, carbs: 155, fat: 47, water: 4, meals: ['3:30 AM shake','6:00 AM post-workout','8:00 AM eggs','12:00 PM meal','3:00 PM shake','6:00 PM meal'], supplements: 'Multivitamin, cod liver oil, magnesium, collagen' }
    ],
    cardioLogs: [
      { type: 'Treadmill Walk', minutes: 30, steps: 5200, notes: 'Incline 12, speed 3.5 mph', date: new Date().toISOString() },
      { type: 'Stair Climber', minutes: 20, steps: 3100, notes: 'Level 7', date: new Date().toISOString() }
    ],
    history: [
      { type: 'Demo Loaded', text: 'Preview data added for Steady Log V3.', date: new Date().toLocaleString() }
    ]
  };
  saveState();
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderWorkoutEntries();
  renderMeasurements();
  renderNutrition();
  renderCardio();
  renderHistory();
  renderVideos();
  drawWeightChart();
}

window.addEventListener('resize', drawWeightChart);

document.addEventListener('DOMContentLoaded', () => {
  setTodayDefaults();
  bindNavigation();
  bindForms();
  bindTimer();
  bindQuickLog();
  bindUtilityButtons();
  renderAll();
});
