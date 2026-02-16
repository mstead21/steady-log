/* =========================
   Steady Log — Clean Build
   No premium / no locks
   ========================= */

const STORAGE_KEY = "steadylog_v1";

const defaultState = {
  settings: {
    name: "",
    defaultWorkoutName: ""
  },
  templates: [], // { id, name, exercises:[{name, sets, reps, notes}] }
  logs: [],      // { id, date, name, notes }
  videos: [
    { title: "Incline Chest Press (Machine) - Form", url: "https://www.youtube.com/results?search_query=incline+chest+press+machine+form" },
    { title: "Incline Bench Press - Setup & Cues", url: "https://www.youtube.com/results?search_query=incline+bench+press+setup+cues" },
    { title: "Upper Chest Training - Common Mistakes", url: "https://www.youtube.com/results?search_query=upper+chest+training+mistakes" }
  ]
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);

    // lightweight migration / safety
    return {
      ...structuredClone(defaultState),
      ...parsed,
      settings: { ...defaultState.settings, ...(parsed.settings || {}) },
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      videos: Array.isArray(parsed.videos) ? parsed.videos : structuredClone(defaultState.videos)
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

/* ===========
   DOM helpers
   =========== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function setSubtitle(text) {
  $("#headerSubtitle").textContent = text;
}

function showScreen(key) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  const el = $(`#screen-${key}`);
  if (el) el.classList.add("active");

  $$(".nav-btn").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.nav-btn[data-nav="${key}"]`);
  if (btn) btn.classList.add("active");

  setSubtitle(el?.dataset?.title || key);
}

/* ===================
   Render functions
   =================== */

function renderStats() {
  $("#statWorkouts").textContent = String(state.logs.length);

  const last = [...state.logs].sort((a,b) => (a.date || "").localeCompare(b.date || "")).pop();
  $("#statLastWorkout").textContent = last ? `${last.date} — ${last.name}` : "—";
}

function renderTemplateExercises(tempExercises) {
  const wrap = $("#tplExerciseList");
  wrap.innerHTML = "";

  if (!tempExercises.length) {
    wrap.innerHTML = `<div class="item"><div class="item-title">No exercises added yet</div><div class="item-sub">Add exercises above, then save template.</div></div>`;
    return;
  }

  tempExercises.forEach((ex, idx) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(ex.name || "Exercise")}</div>
          <div class="item-sub">${escapeHtml(ex.sets)} sets • ${escapeHtml(ex.reps)} reps ${ex.notes ? "• " + escapeHtml(ex.notes) : ""}</div>
        </div>
        <button class="secondary-btn" data-action="remove-temp-ex" data-idx="${idx}" type="button">Remove</button>
      </div>
    `;
    wrap.appendChild(div);
  });
}

function renderTemplates() {
  const list = $("#templateList");
  list.innerHTML = "";

  if (!state.templates.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No templates yet</div><div class="item-sub">Create one above.</div></div>`;
    return;
  }

  state.templates
    .slice()
    .sort((a,b) => (a.name || "").localeCompare(b.name || ""))
    .forEach(tpl => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(tpl.name)}</div>
            <div class="item-sub">${tpl.exercises?.length || 0} exercises</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="secondary-btn" data-action="use-template" data-id="${tpl.id}" type="button">Quick Log</button>
            <button class="secondary-btn" data-action="delete-template" data-id="${tpl.id}" type="button">Delete</button>
          </div>
        </div>
      `;
      list.appendChild(div);
    });
}

function renderLogs(filter = "") {
  const list = $("#logList");
  list.innerHTML = "";

  const q = filter.trim().toLowerCase();
  const logs = state.logs
    .slice()
    .sort((a,b) => (b.date || "").localeCompare(a.date || ""))
    .filter(l => {
      if (!q) return true;
      return (l.name || "").toLowerCase().includes(q) || (l.notes || "").toLowerCase().includes(q) || (l.date || "").includes(q);
    });

  if (!logs.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No workouts found</div><div class="item-sub">Try a different search or log a workout.</div></div>`;
    return;
  }

  logs.forEach(l => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(l.name)}</div>
          <div class="item-sub">${escapeHtml(l.date)}${l.notes ? " • " + escapeHtml(l.notes) : ""}</div>
        </div>
        <button class="secondary-btn" data-action="delete-log" data-id="${l.id}" type="button">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderVideos() {
  const list = $("#videoList");
  list.innerHTML = "";

  state.videos.forEach(v => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(v.title)}</div>
          <div class="item-sub">${escapeHtml(v.url)}</div>
        </div>
        <button class="secondary-btn video-btn" data-video="${escapeAttr(v.url)}" type="button">Open</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderSettings() {
  $("#setName").value = state.settings.name || "";
  $("#setDefaultWorkout").value = state.settings.defaultWorkoutName || "";
}

/* ===================
   Utilities (safe)
   =================== */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(s) {
  // for attributes
  return escapeHtml(s).replaceAll("`", "&#096;");
}

/* ===================
   Boot
   =================== */
function init() {
  // Default date on quick log
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  $("#qlDate").value = `${yyyy}-${mm}-${dd}`;

  // Apply default workout name if set
  if (state.settings.defaultWorkoutName) {
    $("#qlName").value = state.settings.defaultWorkoutName;
  }

  renderAll();
  showScreen("home");
}

function renderAll() {
  renderStats();
  renderTemplates();
  renderLogs($("#logSearch")?.value || "");
  renderVideos();
  renderSettings();
}

init();

/* ===================
   Navigation
   =================== */
document.addEventListener("click", (e) => {
  const nav = e.target.closest(".nav-btn");
  if (nav) {
    showScreen(nav.dataset.nav);
    return;
  }
});

/* ===================
   Video button handler
   (delegated so always works)
   =================== */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".video-btn");
  if (!btn) return;

  const url = btn.getAttribute("data-video");
  if (!url) return;

  window.open(url, "_blank", "noopener,noreferrer");
});

/* ===================
   Quick Log
   =================== */
$("#quickLogForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const date = $("#qlDate").value;
  const name = $("#qlName").value.trim();
  const notes = $("#qlNotes").value.trim();

  if (!date || !name) return;

  state.logs.push({ id: uid(), date, name, notes });
  saveState();

  $("#qlNotes").value = "";
  renderAll();
  showScreen("log");
});

/* ===================
   Template builder
   =================== */
let tempExercises = [];

$("#btnAddExercise").addEventListener("click", () => {
  const name = $("#exName").value.trim();
  const sets = $("#exSets").value;
  const reps = $("#exReps").value.trim();
  const notes = $("#exNotes").value.trim();

  if (!name) return;

  tempExercises.push({ name, sets, reps, notes });

  $("#exName").value = "";
  $("#exNotes").value = "";
  renderTemplateExercises(tempExercises);
});

renderTemplateExercises(tempExercises);

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action='remove-temp-ex']");
  if (!btn) return;
  const idx = Number(btn.getAttribute("data-idx"));
  if (Number.isNaN(idx)) return;

  tempExercises.splice(idx, 1);
  renderTemplateExercises(tempExercises);
});

$("#templateForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#tplName").value.trim();
  if (!name) return;

  state.templates.push({
    id: uid(),
    name,
    exercises: tempExercises.slice()
  });

  tempExercises = [];
  $("#tplName").value = "";
  renderTemplateExercises(tempExercises);

  saveState();
  renderAll();
});

/* ===================
   Templates actions
   =================== */
document.addEventListener("click", (e) => {
  const useBtn = e.target.closest("[data-action='use-template']");
  if (useBtn) {
    const id = useBtn.getAttribute("data-id");
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return;

    // Quick log fills Home form
    showScreen("home");
    $("#qlName").value = tpl.name;

    // Put exercises into notes nicely
    const lines = (tpl.exercises || []).map(ex =>
      `- ${ex.name} (${ex.sets}x${ex.reps}${ex.notes ? `, ${ex.notes}` : ""})`
    );
    $("#qlNotes").value = lines.join("\n");
    return;
  }

  const delBtn = e.target.closest("[data-action='delete-template']");
  if (delBtn) {
    const id = delBtn.getAttribute("data-id");
    state.templates = state.templates.filter(t => t.id !== id);
    saveState();
    renderAll();
    return;
  }
});

/* ===================
   Logs actions
   =================== */
document.addEventListener("click", (e) => {
  const del = e.target.closest("[data-action='delete-log']");
  if (!del) return;
  const id = del.getAttribute("data-id");
  state.logs = state.logs.filter(l => l.id !== id);
  saveState();
  renderAll();
});

/* ===================
   Search
   =================== */
$("#logSearch").addEventListener("input", (e) => {
  renderLogs(e.target.value);
});

$("#btnClearSearch").addEventListener("click", () => {
  $("#logSearch").value = "";
  renderLogs("");
});

/* ===================
   Settings
   =================== */
$("#btnSaveSettings").addEventListener("click", () => {
  state.settings.name = $("#setName").value.trim();
  state.settings.defaultWorkoutName = $("#setDefaultWorkout").value.trim();
  saveState();

  // Apply default workout name to quick log if empty
  if (!$("#qlName").value.trim() && state.settings.defaultWorkoutName) {
    $("#qlName").value = state.settings.defaultWorkoutName;
  }

  renderAll();
  showScreen("home");
});

/* ===================
   Export / Reset
   =================== */
$("#btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "steady-log-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});

$("#btnReset").addEventListener("click", () => {
  const ok = confirm("Reset all Steady Log data on this device? This cannot be undone.");
  if (!ok) return;

  state = structuredClone(defaultState);
  saveState();

  // refresh UI
  $("#qlNotes").value = "";
  $("#qlName").value = state.settings.defaultWorkoutName || "";
  renderTemplateExercises([]);
  renderAll();
  showScreen("home");
});
