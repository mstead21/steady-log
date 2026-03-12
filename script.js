const STORAGE_KEY = 'steadylog-v2';

const defaultData = {
  daily: [],
  workouts: [],
  progress: [],
  nutrition: [],
  cardio: [],
  notes: '',
  timerSeconds: 60
};

const exerciseVideos = [
  { title: 'Incline Chest Press', category: 'Chest', favourite: true, url: 'https://www.youtube.com/results?search_query=incline+chest+press+exercise' },
  { title: 'Seated Row', category: 'Back', favourite: true, url: 'https://www.youtube.com/results?search_query=seated+row+exercise' },
  { title: 'Lat Pulldown', category: 'Back', favourite: false, url: 'https://www.youtube.com/results?search_query=lat+pulldown+exercise' },
  { title: 'Shoulder Press Machine', category: 'Shoulders', favourite: true, url: 'https://www.youtube.com/results?search_query=shoulder+press+machine+exercise' },
  { title: 'Leg Press', category: 'Legs', favourite: true, url: 'https://www.youtube.com/results?search_query=leg+press+exercise' },
  { title: 'RDL', category: 'Hamstrings', favourite: false, url: 'https://www.youtube.com/results?search_query=romanian+deadlift+exercise' },
  { title: 'Cable Curl', category: 'Arms', favourite: false, url: 'https://www.youtube.com/results?search_query=cable+bicep+curl+exercise' },
  { title: 'Tricep Pushdown', category: 'Arms', favourite: false, url: 'https://www.youtube.com/results?search_query=tricep+pushdown+exercise' },
  { title: 'Stair Climber Technique', category: 'Cardio', favourite: true, url: 'https://www.youtube.com/results?search_query=stair+climber+technique' }
];

let data = loadData();
let timerSeconds = data.timerSeconds || 60;
let timerInterval = null;
let timerRunning = false;

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultData);
  try {
    return { ...structuredClone(defaultData), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData() {
  data.timerSeconds = timerSeconds;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getLatest(arr, key = 'date') {
  return [...arr].sort((a, b) => (a[key] < b[key] ? 1 : -1))[0];
}

function byNewest(arr, key = 'date') {
  return [...arr].sort((a, b) => (a[key] < b[key] ? 1 : -1));
}

function last7DaysFilter(itemDate) {
  const now = new Date();
  const then = new Date(itemDate + 'T00:00:00');
  const diff = (now - then) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

function setDefaultDates() {
  ['workoutDate', 'progressDate', 'nutritionDate', 'cardioDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = todayISO();
  });
}

function setupNavigation() {
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.page-section');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(btn => btn.classList.remove('active'));
      sections.forEach(section => section.classList.remove('active'));
      link.classList.add('active');
      document.getElementById(link.dataset.section).classList.add('active');
      document.getElementById('pageTitle').textContent = link.textContent;
    });
  });
}

function renderDashboard() {
  const latestDaily = getLatest(data.daily) || {};
  const latestProgress = getLatest(data.progress) || {};
  const latestNutrition = getLatest(data.nutrition) || {};
  const weeklyWeights = data.progress.filter(x => last7DaysFilter(x.date)).map(x => Number(x.weight)).filter(Boolean);
  const weeklyCardio = data.cardio.filter(x => last7DaysFilter(x.date));
  const cardioTotal = weeklyCardio.reduce((sum, x) => sum + Number(x.minutes || 0), 0);
  const workoutTotal = data.workouts.filter(x => last7DaysFilter(x.date)).length;
  const nutritionTotal = data.nutrition.filter(x => last7DaysFilter(x.date)).length;
  const progressTotal = data.progress.filter(x => last7DaysFilter(x.date)).length;
  const cardioDays = new Set(weeklyCardio.map(x => x.date)).size;
  const score = Math.min(100, Math.round(((workoutTotal > 0) + (nutritionTotal > 0) + (progressTotal > 0) + (cardioDays > 0)) * 25));
  const avgWeight = weeklyWeights.length ? (weeklyWeights.reduce((a, b) => a + b, 0) / weeklyWeights.length).toFixed(1) : '--';

  document.getElementById('heroWorkout').textContent = latestDaily.workoutType || 'Ready for today';
  document.getElementById('heroSubtitle').textContent = latestDaily.date ? `Last daily check-in: ${formatDate(latestDaily.date)}` : 'Stay consistent and keep the standard high.';
  document.getElementById('heroWeight').textContent = latestProgress.weight ? `${latestProgress.weight} kg` : '-- kg';
  document.getElementById('heroCalories').textContent = latestNutrition.calories || '--';
  document.getElementById('heroSteps').textContent = latestDaily.steps || '--';
  document.getElementById('dashWorkoutType').textContent = latestDaily.workoutType || '--';
  document.getElementById('dashWorkoutStatus').textContent = latestDaily.date ? `Updated ${formatDate(latestDaily.date)}` : 'No session logged';
  document.getElementById('dashWeeklyAverage').textContent = avgWeight === '--' ? '-- kg' : `${avgWeight} kg`;
  document.getElementById('dashProtein').textContent = latestNutrition.protein ? `${latestNutrition.protein} g` : '-- g';
  document.getElementById('dashCardio').textContent = `${cardioTotal || 0} min`;
  document.getElementById('consistencyScore').textContent = `${score}%`;
  document.getElementById('consistencyText').textContent = score ? `You logged activity across ${[workoutTotal > 0, nutritionTotal > 0, progressTotal > 0, cardioDays > 0].filter(Boolean).length} of 4 key areas this week.` : 'No recent activity yet.';
}

function renderWorkoutList() {
  const wrap = document.getElementById('workoutList');
  const items = byNewest(data.workouts).slice(0, 8);
  if (!items.length) {
    wrap.className = 'stack-list empty-state';
    wrap.textContent = 'No workout entries yet.';
    return;
  }
  wrap.className = 'stack-list';
  wrap.innerHTML = items.map(item => `
    <div class="stack-item">
      <strong>${item.exercise} <span class="label">${item.sessionType}</span></strong>
      <div>Target: ${item.target || '--'} | Completed: ${item.completedSets || '--'}</div>
      <div>Previous best: ${item.previousBest || '--'}</div>
      <small>${formatDate(item.date)}${item.notes ? ` · ${item.notes}` : ''}</small>
    </div>
  `).join('');
}

function renderProgressTable() {
  const wrap = document.getElementById('progressTableWrap');
  const items = byNewest(data.progress);
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state">No progress entries yet.</div>';
    return;
  }
  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Weight</th>
          <th>Waist</th>
          <th>Chest</th>
          <th>Arms</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${formatDate(item.date)}</td>
            <td>${item.weight || '--'} kg</td>
            <td>${item.waist || '--'} cm</td>
            <td>${item.chest || '--'} cm</td>
            <td>${item.arms || '--'} cm</td>
            <td>${item.notes || '--'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderWeightChart() {
  const canvas = document.getElementById('weightChart');
  const ctx = canvas.getContext('2d');
  const items = [...data.progress]
    .filter(x => x.weight)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (items.length < 2) {
    ctx.fillStyle = '#a9b4c6';
    ctx.font = '18px Inter';
    ctx.fillText('Add at least 2 weight entries to see the trend.', 30, 50);
    return;
  }

  const padding = 40;
  const values = items.map(x => Number(x.weight));
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const stepX = (canvas.width - padding * 2) / (items.length - 1);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = padding + ((canvas.height - padding * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#5cc8ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  items.forEach((item, index) => {
    const x = padding + stepX * index;
    const y = canvas.height - padding - ((Number(item.weight) - min) / (max - min)) * (canvas.height - padding * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#8d7dff';
  items.forEach((item, index) => {
    const x = padding + stepX * index;
    const y = canvas.height - padding - ((Number(item.weight) - min) / (max - min)) * (canvas.height - padding * 2);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#a9b4c6';
  ctx.font = '12px Inter';
  items.forEach((item, index) => {
    const x = padding + stepX * index;
    ctx.fillText(item.date.slice(5), x - 16, canvas.height - 14);
  });
}

function renderNutrition() {
  const wrap = document.getElementById('nutritionSnapshot');
  const latest = getLatest(data.nutrition);
  if (!latest) {
    wrap.className = 'stack-list empty-state';
    wrap.textContent = 'No nutrition entries yet.';
    return;
  }
  wrap.className = 'stack-list';
  wrap.innerHTML = `
    <div class="stack-item">
      <strong>${formatDate(latest.date)}</strong>
      <div>Calories: ${latest.calories || '--'}</div>
      <div>Protein: ${latest.protein || '--'}g | Carbs: ${latest.carbs || '--'}g | Fats: ${latest.fats || '--'}g</div>
      <div>Water: ${latest.water || '--'}L</div>
      <small>Meals: ${(latest.meals || []).join(', ') || '--'} | Supplements: ${(latest.supps || []).join(', ') || '--'}</small>
    </div>
  `;
}

function renderCardio() {
  const items = byNewest(data.cardio);
  const wrap = document.getElementById('cardioList');
  if (!items.length) {
    wrap.className = 'stack-list empty-state';
    wrap.textContent = 'No cardio entries yet.';
  } else {
    wrap.className = 'stack-list';
    wrap.innerHTML = items.slice(0, 8).map(item => `
      <div class="stack-item">
        <strong>${item.type} · ${item.minutes} min</strong>
        <div>${item.distance || '--'} | Steps: ${item.steps || '--'}</div>
        <small>${formatDate(item.date)}${item.notes ? ` · ${item.notes}` : ''}</small>
      </div>
    `).join('');
  }

  const weekly = data.cardio.filter(x => last7DaysFilter(x.date));
  const minutes = weekly.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const sessions = weekly.length;
  const steps = weekly.reduce((sum, item) => sum + Number(item.steps || 0), 0);
  const consistency = Math.min(100, Math.round((new Set(weekly.map(x => x.date)).size / 7) * 100));

  document.getElementById('cardioWeeklyMinutes').textContent = minutes;
  document.getElementById('cardioWeeklySessions').textContent = sessions;
  document.getElementById('cardioWeeklySteps').textContent = steps;
  document.getElementById('cardioConsistency').textContent = `${consistency}%`;
}

function renderVideos(query = '') {
  const wrap = document.getElementById('videoGrid');
  const filtered = exerciseVideos.filter(video => video.title.toLowerCase().includes(query.toLowerCase()) || video.category.toLowerCase().includes(query.toLowerCase()));
  wrap.innerHTML = filtered.map(video => `
    <article class="panel video-card">
      <div>
        <strong>${video.title}</strong>
        <div class="tag-row">
          <span class="tag">${video.category}</span>
          ${video.favourite ? '<span class="tag">Favourite</span>' : ''}
        </div>
      </div>
      <div class="video-actions">
        <a class="primary-btn" href="${video.url}" target="_blank" rel="noopener noreferrer">Open Video</a>
      </div>
    </article>
  `).join('');
}

function renderHistory() {
  const wrap = document.getElementById('historyFeed');
  const events = [];
  data.daily.forEach(item => events.push({ date: item.date, title: `Daily check-in · ${item.workoutType || 'Logged'}`, meta: `${item.weight || '--'}kg · ${item.calories || '--'} cal · ${item.steps || '--'} steps` }));
  data.workouts.forEach(item => events.push({ date: item.date, title: `Workout · ${item.exercise}`, meta: `${item.sessionType} · ${item.completedSets || '--'}` }));
  data.progress.forEach(item => events.push({ date: item.date, title: 'Progress update', meta: `${item.weight || '--'}kg · Waist ${item.waist || '--'}cm` }));
  data.nutrition.forEach(item => events.push({ date: item.date, title: 'Nutrition log', meta: `${item.calories || '--'} cal · ${item.protein || '--'}g protein` }));
  data.cardio.forEach(item => events.push({ date: item.date, title: `Cardio · ${item.type}`, meta: `${item.minutes || '--'} min · ${item.steps || '--'} steps` }));

  const sorted = events.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12);
  if (!sorted.length) {
    wrap.className = 'stack-list empty-state';
    wrap.textContent = 'No activity yet.';
    return;
  }

  wrap.className = 'stack-list';
  wrap.innerHTML = sorted.map(item => `
    <div class="stack-item">
      <strong>${item.title}</strong>
      <div>${item.meta}</div>
      <small>${formatDate(item.date)}</small>
    </div>
  `).join('');
}

function refreshUI() {
  renderDashboard();
  renderWorkoutList();
  renderProgressTable();
  renderWeightChart();
  renderNutrition();
  renderCardio();
  renderVideos(document.getElementById('videoSearch')?.value || '');
  renderHistory();
  document.getElementById('planningNotes').value = data.notes || '';
  saveData();
}

function handleForms() {
  document.getElementById('quickCheckinForm').addEventListener('submit', e => {
    e.preventDefault();
    data.daily.push({
      date: todayISO(),
      weight: document.getElementById('quickWeight').value,
      calories: document.getElementById('quickCalories').value,
      steps: document.getElementById('quickSteps').value,
      workoutType: document.getElementById('quickWorkoutType').value
    });
    e.target.reset();
    refreshUI();
  });

  document.getElementById('workoutForm').addEventListener('submit', e => {
    e.preventDefault();
    data.workouts.push({
      date: document.getElementById('workoutDate').value,
      sessionType: document.getElementById('sessionType').value,
      exercise: document.getElementById('exerciseName').value,
      previousBest: document.getElementById('previousBest').value,
      target: document.getElementById('targetLift').value,
      completedSets: document.getElementById('completedSets').value,
      notes: document.getElementById('workoutNotes').value
    });
    e.target.reset();
    document.getElementById('workoutDate').value = todayISO();
    refreshUI();
  });

  document.getElementById('progressForm').addEventListener('submit', e => {
    e.preventDefault();
    data.progress.push({
      date: document.getElementById('progressDate').value,
      weight: document.getElementById('progressWeight').value,
      waist: document.getElementById('progressWaist').value,
      chest: document.getElementById('progressChest').value,
      arms: document.getElementById('progressArms').value,
      notes: document.getElementById('progressNotes').value
    });
    e.target.reset();
    document.getElementById('progressDate').value = todayISO();
    refreshUI();
  });

  document.getElementById('nutritionForm').addEventListener('submit', e => {
    e.preventDefault();
    const meals = [...document.querySelectorAll('.meal-check:checked')].map(x => x.value);
    const supps = [...document.querySelectorAll('.supp-check:checked')].map(x => x.value);
    data.nutrition.push({
      date: document.getElementById('nutritionDate').value,
      calories: document.getElementById('nutritionCalories').value,
      protein: document.getElementById('nutritionProtein').value,
      carbs: document.getElementById('nutritionCarbs').value,
      fats: document.getElementById('nutritionFats').value,
      water: document.getElementById('nutritionWater').value,
      meals,
      supps
    });
    e.target.reset();
    document.getElementById('nutritionDate').value = todayISO();
    refreshUI();
  });

  document.getElementById('cardioForm').addEventListener('submit', e => {
    e.preventDefault();
    data.cardio.push({
      date: document.getElementById('cardioDate').value,
      type: document.getElementById('cardioType').value,
      minutes: document.getElementById('cardioMinutes').value,
      distance: document.getElementById('cardioDistance').value,
      steps: document.getElementById('cardioSteps').value,
      notes: document.getElementById('cardioNotes').value
    });
    e.target.reset();
    document.getElementById('cardioDate').value = todayISO();
    refreshUI();
  });
}

function updateTimerDisplay() {
  const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const seconds = String(timerSeconds % 60).padStart(2, '0');
  const value = `${minutes}:${seconds}`;
  document.getElementById('timerDisplay').textContent = value;
  document.getElementById('floatingTimerText').textContent = value;
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds -= 1;
      updateTimerDisplay();
      saveData();
    } else {
      stopTimer();
      alert('Rest time complete. Go again.');
    }
  }, 1000);
}

function setupTimer() {
  updateTimerDisplay();
  document.querySelectorAll('.timer-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      timerSeconds = Number(btn.dataset.seconds);
      updateTimerDisplay();
      saveData();
    });
  });
  document.getElementById('startTimerBtn').addEventListener('click', startTimer);
  document.getElementById('pauseTimerBtn').addEventListener('click', stopTimer);
  document.getElementById('resetTimerBtn').addEventListener('click', () => {
    stopTimer();
    timerSeconds = 60;
    updateTimerDisplay();
    saveData();
  });
  document.getElementById('floatingTimerBtn').addEventListener('click', () => {
    document.querySelector('[data-section="workout"]').click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function setupUtilityButtons() {
  document.getElementById('videoSearch').addEventListener('input', e => renderVideos(e.target.value));
  document.getElementById('saveNotesBtn').addEventListener('click', () => {
    data.notes = document.getElementById('planningNotes').value;
    saveData();
    alert('Notes saved.');
  });
  document.getElementById('exportDataBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'steadylog-v2-data.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    data = {
      daily: [
        { date: todayISO(), weight: 95.0, calories: 1950, steps: 14200, workoutType: 'Upper Body' }
      ],
      workouts: [
        { date: todayISO(), sessionType: 'Upper Body', exercise: 'Incline Chest Press', previousBest: '80kg x 8', target: '82.5kg x 8', completedSets: '82.5x8, 80x8, 75x10', notes: 'Strong first movement.' },
        { date: todayISO(), sessionType: 'Upper Body', exercise: 'Seated Row', previousBest: '75kg x 10', target: '77.5kg x 10', completedSets: '77.5x10, 75x10, 70x12', notes: 'Full stretch.' }
      ],
      progress: [
        { date: '2026-03-06', weight: 96.4, waist: 95, chest: 110, arms: 40, notes: 'Start point' },
        { date: '2026-03-09', weight: 95.7, waist: 94.4, chest: 110, arms: 40.2, notes: 'Tightened up' },
        { date: todayISO(), weight: 95.0, waist: 93.8, chest: 110.5, arms: 40.4, notes: 'Moving nicely' }
      ],
      nutrition: [
        { date: todayISO(), calories: 1950, protein: 220, carbs: 155, fats: 47, water: 4, meals: ['Shake 1', 'Post-workout', 'Meal 1', 'Meal 2', 'Evening'], supps: ['Multi', 'Cod Liver Oil', 'Magnesium', 'Collagen'] }
      ],
      cardio: [
        { date: todayISO(), type: 'Stair Climber', minutes: 20, distance: 'Level 7', steps: 3500, notes: 'Steady pace' },
        { date: todayISO(), type: 'Treadmill', minutes: 30, distance: 'Incline 12 · 3.5 mph', steps: 4200, notes: 'Post weights' }
      ],
      notes: 'Tomorrow: lower body, keep food locked in, hit steps early.',
      timerSeconds: 60
    };
    timerSeconds = 60;
    updateTimerDisplay();
    refreshUI();
  });
}

function init() {
  setupNavigation();
  setDefaultDates();
  handleForms();
  setupTimer();
  setupUtilityButtons();
  refreshUI();
}

document.addEventListener('DOMContentLoaded', init);
