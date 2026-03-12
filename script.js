const STORAGE_KEY = 'steady_log_workouts_v1';

const dateInput = document.getElementById('dateInput');
const sessionInput = document.getElementById('sessionInput');
const exerciseInput = document.getElementById('exerciseInput');
const previousBox = document.getElementById('previousBox');
const setsBody = document.getElementById('setsBody');
const setRowTemplate = document.getElementById('setRowTemplate');
const sessionNotes = document.getElementById('sessionNotes');
const saveWorkoutBtn = document.getElementById('saveWorkoutBtn');
const addSetBtn = document.getElementById('addSetBtn');
const copyPrevBtn = document.getElementById('copyPrevBtn');
const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchInput');
const totalWorkouts = document.getElementById('totalWorkouts');
const totalSets = document.getElementById('totalSets');
const weekCount = document.getElementById('weekCount');
const lastSession = document.getElementById('lastSession');
const loadDemoBtn = document.getElementById('loadDemoBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');

const timerDisplay = document.getElementById('timerDisplay');
const startTimerBtn = document.getElementById('startTimerBtn');
const pauseTimerBtn = document.getElementById('pauseTimerBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');
const presetButtons = document.querySelectorAll('.preset');

let timerSeconds = 90;
let timerRemaining = timerSeconds;
let timerInterval = null;

function getWorkouts() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveWorkouts(workouts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

function todayValue() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function addSetRow(values = {}) {
  const clone = setRowTemplate.content.cloneNode(true);
  const row = clone.querySelector('tr');
  row.querySelector('.weight-input').value = values.weight ?? '';
  row.querySelector('.reps-input').value = values.reps ?? '';
  row.querySelector('.set-notes-input').value = values.notes ?? '';
  row.querySelector('.remove-set').addEventListener('click', () => {
    row.remove();
    renumberSets();
  });
  setsBody.appendChild(clone);
  renumberSets();
}

function renumberSets() {
  [...setsBody.querySelectorAll('tr')].forEach((row, index) => {
    row.querySelector('.set-number').textContent = `Set ${index + 1}`;
  });
}

function collectSets() {
  return [...setsBody.querySelectorAll('tr')]
    .map((row) => ({
      weight: Number(row.querySelector('.weight-input').value || 0),
      reps: Number(row.querySelector('.reps-input').value || 0),
      notes: row.querySelector('.set-notes-input').value.trim()
    }))
    .filter((set) => set.weight > 0 || set.reps > 0 || set.notes);
}

function findPreviousEntry(exerciseName) {
  const workouts = getWorkouts();
  const match = [...workouts].reverse().find((item) =>
    item.exercise.toLowerCase() === exerciseName.trim().toLowerCase()
  );
  return match || null;
}

function updatePreviousBox() {
  const exerciseName = exerciseInput.value.trim();
  if (!exerciseName) {
    previousBox.textContent = 'Type an exercise name to see your last logged weights.';
    return;
  }
  const previous = findPreviousEntry(exerciseName);
  if (!previous) {
    previousBox.textContent = 'No previous log found for this exercise yet.';
    return;
  }
  const setsText = previous.sets
    .map((set, index) => `Set ${index + 1}: ${set.weight || 0}kg x ${set.reps || 0}${set.notes ? ` (${set.notes})` : ''}`)
    .join(' | ');
  previousBox.textContent = `Last time: ${previous.date} • ${previous.session} • ${setsText}`;
}

function copyPreviousSets() {
  const exerciseName = exerciseInput.value.trim();
  const previous = findPreviousEntry(exerciseName);
  if (!previous) return;
  setsBody.innerHTML = '';
  previous.sets.forEach((set) => addSetRow(set));
  flashCard();
}

function flashCard() {
  const card = saveWorkoutBtn.closest('.card');
  card.classList.add('success-flash');
  setTimeout(() => card.classList.remove('success-flash'), 600);
}

function saveWorkout() {
  const exercise = exerciseInput.value.trim();
  const sets = collectSets();
  if (!exercise) {
    alert('Add an exercise name first.');
    return;
  }
  if (!sets.length) {
    alert('Add at least one set with weight or reps.');
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    date: dateInput.value,
    session: sessionInput.value,
    exercise,
    sets,
    notes: sessionNotes.value.trim(),
    createdAt: new Date().toISOString()
  };

  const workouts = getWorkouts();
  workouts.push(entry);
  workouts.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt));
  saveWorkouts(workouts);

  sessionNotes.value = '';
  setsBody.innerHTML = '';
  addSetRow();
  addSetRow();
  updatePreviousBox();
  renderHistory();
  renderSummary();
  flashCard();
}

function renderHistory() {
  const workouts = getWorkouts();
  const term = searchInput.value.trim().toLowerCase();
  const filtered = workouts.filter((item) => {
    if (!term) return true;
    return item.exercise.toLowerCase().includes(term) || item.session.toLowerCase().includes(term);
  });

  if (!filtered.length) {
    historyList.innerHTML = '<div class="empty">No workouts logged yet.</div>';
    return;
  }

  historyList.innerHTML = filtered.map((item) => {
    const setsHtml = item.sets.map((set, index) => `
      <div class="history-set">
        <div><strong>Set ${index + 1}</strong></div>
        <div>${set.weight || 0}kg</div>
        <div>${set.reps || 0} reps</div>
        <div>${set.notes || ''}</div>
      </div>
    `).join('');

    return `
      <article class="history-item">
        <div class="history-top">
          <div>
            <h3 class="history-title">${item.exercise}</h3>
            <div class="history-meta">${item.date} • ${item.session}</div>
          </div>
        </div>
        ${item.notes ? `<div class="history-meta">${item.notes}</div>` : ''}
        <div class="history-sets">${setsHtml}</div>
      </article>
    `;
  }).join('');
}

function renderSummary() {
  const workouts = getWorkouts();
  totalWorkouts.textContent = workouts.length;
  totalSets.textContent = workouts.reduce((sum, item) => sum + item.sets.length, 0);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const thisWeekCount = workouts.filter((item) => new Date(item.date) >= startOfWeek).length;
  weekCount.textContent = thisWeekCount;
  lastSession.textContent = workouts[0] ? `${workouts[0].date}` : '—';
}

function loadDemo() {
  const demo = [
    {
      id: crypto.randomUUID(),
      date: todayValue(),
      session: 'Upper Body',
      exercise: 'Incline Smith Press',
      sets: [
        { weight: 60, reps: 12, notes: 'smooth' },
        { weight: 70, reps: 10, notes: '' },
        { weight: 75, reps: 8, notes: 'hard' }
      ],
      notes: 'Good energy.',
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      date: todayValue(),
      session: 'Cardio',
      exercise: 'Stair Climber',
      sets: [
        { weight: 0, reps: 20, notes: '20 mins level 7' }
      ],
      notes: '',
      createdAt: new Date().toISOString()
    }
  ];
  saveWorkouts(demo);
  renderHistory();
  renderSummary();
  updatePreviousBox();
}

function clearData() {
  const ok = confirm('Clear all saved workout data from this browser?');
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  renderSummary();
  updatePreviousBox();
}

function exportData() {
  const data = JSON.stringify(getWorkouts(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'steady-log-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

function updateTimerDisplay() {
  const mins = Math.floor(timerRemaining / 60).toString().padStart(2, '0');
  const secs = (timerRemaining % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${mins}:${secs}`;
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      alert('Rest time done.');
      return;
    }
    timerRemaining -= 1;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  timerRemaining = timerSeconds;
  updateTimerDisplay();
}

exerciseInput.addEventListener('input', updatePreviousBox);
copyPrevBtn.addEventListener('click', copyPreviousSets);
addSetBtn.addEventListener('click', () => addSetRow());
saveWorkoutBtn.addEventListener('click', saveWorkout);
searchInput.addEventListener('input', renderHistory);
loadDemoBtn.addEventListener('click', loadDemo);
clearBtn.addEventListener('click', clearData);
exportBtn.addEventListener('click', exportData);
startTimerBtn.addEventListener('click', startTimer);
pauseTimerBtn.addEventListener('click', pauseTimer);
resetTimerBtn.addEventListener('click', resetTimer);
presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    timerSeconds = Number(button.dataset.seconds);
    timerRemaining = timerSeconds;
    updateTimerDisplay();
  });
});

dateInput.value = todayValue();
addSetRow();
addSetRow();
updatePreviousBox();
renderHistory();
renderSummary();
updateTimerDisplay();
