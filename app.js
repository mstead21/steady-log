/* =========================================================
   Steady Log — Feature Build (NO PREMIUM UI)
   - Dashboard + Quick Log with exercises & sets
   - Templates (routines)
   - Full session log + session detail
   - Video library (delegated click handler = reliable)
   - Settings + measurements
   - Export/Import/Reset
   ========================================================= */

const STORAGE_KEY = "steadylog_feature_v2";

const defaultState = {
  settings: {
    name: "",
    defaultSession: "",
    units: "kg",        // kg or lb
    weekStart: "mon"    // mon or sun
  },
  templates: [],        // {id, name, exercises:[{id,name,notes,defaultSets,defaultReps,defaultRest}]}
  sessions: [],         // {id, date, name, notes, exercises:[{id,name,notes,sets:[{id,weight,reps,rir,done}]}]}
  videos: [
    { id: uid(), title: "Incline Chest Press (Machine) - Form", url: "https://www.youtube.com/results?search_query=incline+chest+press+machine+form" },
    { id: uid(), title: "Incline Bench Press - Setup & Cues", url: "https://www.youtube.com/results?search_query=incline+bench+press+setup+cues" },
    { id: uid(), title: "Upper Chest Training - Common Mistakes", url: "https://www.youtube.com/results?search_query=upper+chest+training+mistakes" }
  ],
  measurements: []      // {id,date,weight,notes}
};

/* -------------------------
   Utilities
------------------------- */
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function clampStr(s, max = 2000) {
  const t = String(s ?? "");
  return t.length > max ? t.slice(0, max) : t;
}
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("`", "&#096;");
}
function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add("show");
  m.setAttribute("aria-hidden", "false");
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove("show");
  m.setAttribute("aria-hidden", "true");
}
function formatWeight(w, units) {
  if (w === "" || w === null || w === undefined) return "";
  const n = safeNumber(w, NaN);
  if (!Number.isFinite(n)) return "";
  return `${n}${units}`;
}

/* -------------------------
   Storage
------------------------- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);

    // soft-migration / guardrails
    const st = structuredClone(defaultState);
    const out = {
      ...st,
      ...parsed,
      settings: { ...st.settings, ...(parsed.settings || {}) },
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      videos: Array.isArray(parsed.videos) ? parsed.videos : structuredClone(st.videos),
      measurements: Array.isArray(parsed.measurements) ? parsed.measurements : []
    };

    // ensure ids exist
    out.videos = out.videos.map(v => ({ id: v.id || uid(), title: v.title || "Video", url: v.url || "" }));
    out.templates = out.templates.map(t => ({
      id: t.id || uid(),
      name: t.name || "Template",
      exercises: Array.isArray(t.exercises) ? t.exercises.map(ex => ({
        id: ex.id || uid(),
        name: ex.name || "Exercise",
        notes: ex.notes || "",
        defaultSets: safeNumber(ex.defaultSets, 3),
        defaultReps: ex.defaultReps || "8-12",
        defaultRest: safeNumber(ex.defaultRest, 90)
      })) : []
    }));
    out.sessions = out.sessions.map(s => ({
      id: s.id || uid(),
      date: s.date || todayISO(),
      name: s.name || "Session",
      notes: s.notes || "",
      exercises: Array.isArray(s.exercises) ? s.exercises.map(ex => ({
        id: ex.id || uid(),
        name: ex.name || "Exercise",
        notes: ex.notes || "",
        sets: Array.isArray(ex.sets) ? ex.sets.map(set => ({
          id: set.id || uid(),
          weight: set.weight ?? "",
          reps: set.reps ?? "",
          rir: set.rir ?? "",
          done: !!set.done
        })) : []
      })) : []
    }));
    out.measurements = out.measurements.map(m => ({
      id: m.id || uid(),
      date: m.date || todayISO(),
      weight: m.weight ?? "",
      notes: m.notes || ""
    }));

    return out;
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* -------------------------
   DOM
------------------------- */
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

/* -------------------------
   Quick Session Draft (in-memory)
------------------------- */
let quickDraft = {
  date: todayISO(),
  name: "",
  notes: "",
  exercises: [] // {id,name,notes,sets:[{id,weight,reps,rir,done}]}
};

function resetQuickDraft(keepDate = true) {
  const date = keepDate ? ($("#qsDate").value || todayISO()) : todayISO();
  quickDraft = { date, name: "", notes: "", exercises: [] };
}

/* -------------------------
   Rendering
------------------------- */
function renderDashboard() {
  const name = (state.settings.name || "").trim();
  $("#helloLine").textContent = name ? `Morning ${name} 👊` : "Ready when you are.";
  $("#todayPill").textContent = todayISO();

  // sessions last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const sessions30 = state.sessions.filter(s => new Date(s.date) >= cutoff);
  $("#stat30d").textContent = String(sessions30.length);

  const last = state.sessions.slice().sort((a,b) => (b.date || "").localeCompare(a.date || ""))[0];
  $("#statLast").textContent = last ? `${last.date} — ${last.name}` : "—";

  // top exercise by frequency
  const freq = new Map();
  state.sessions.forEach(s => {
    (s.exercises || []).forEach(ex => {
      const k = (ex.name || "").trim().toLowerCase();
      if (!k) return;
      freq.set(k, (freq.get(k) || 0) + 1);
    });
  });
  let top = "—";
  let topN = 0;
  for (const [k,v] of freq.entries()) {
    if (v > topN) { topN = v; top = k; }
  }
  $("#statTop").textContent = top === "—" ? "—" : top.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  // recent list
  const recent = state.sessions.slice().sort((a,b) => (b.date||"").localeCompare(a.date||"")).slice(0, 5);
  const list = $("#recentList");
  list.innerHTML = "";
  if (!recent.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No sessions yet</div><div class="item-sub">Use Quick Log to add your first one.</div></div>`;
  } else {
    recent.forEach(s => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(s.name)}</div>
            <div class="item-sub">${escapeHtml(s.date)} • ${(s.exercises?.length || 0)} exercises</div>
          </div>
          <button class="secondary-btn" type="button" data-action="open-session" data-id="${s.id}">View</button>
        </div>
      `;
      list.appendChild(div);
    });
  }
}

function renderQuickForm() {
  $("#qsDate").value = quickDraft.date || todayISO();
  $("#qsName").value = quickDraft.name || "";
  $("#qsNotes").value = quickDraft.notes || "";
  renderQuickExercises();
}

function renderQuickExercises() {
  const list = $("#quickExercisesList");
  list.innerHTML = "";

  if (!quickDraft.exercises.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No exercises yet</div><div class="item-sub">Add exercises and sets, then save session.</div></div>`;
    return;
  }

  quickDraft.exercises.forEach(ex => {
    const setsHtml = (ex.sets || []).map((set, idx) => {
      const units = state.settings.units || "kg";
      return `
        <div class="item" style="margin-top:10px">
          <div class="item-head">
            <div>
              <div class="item-title">Set ${idx + 1}</div>
              <div class="item-sub">Weight / Reps / RIR</div>
            </div>
            <button class="secondary-btn danger" type="button" data-action="qs-del-set" data-ex="${ex.id}" data-set="${set.id}">Remove</button>
          </div>

          <div class="grid-3" style="margin-top:10px">
            <div class="form-row">
              <label>Weight (${units})</label>
              <input inputmode="decimal" type="number" step="0.5" value="${escapeAttr(set.weight)}"
                data-action="qs-set-weight" data-ex="${ex.id}" data-set="${set.id}" />
            </div>
            <div class="form-row">
              <label>Reps</label>
              <input inputmode="numeric" type="number" step="1" value="${escapeAttr(set.reps)}"
                data-action="qs-set-reps" data-ex="${ex.id}" data-set="${set.id}" />
            </div>
            <div class="form-row">
              <label>RIR</label>
              <input inputmode="numeric" type="number" step="1" value="${escapeAttr(set.rir)}"
                data-action="qs-set-rir" data-ex="${ex.id}" data-set="${set.id}" />
            </div>
          </div>
        </div>
      `;
    }).join("");

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(ex.name)}</div>
          <div class="item-sub">${escapeHtml(ex.notes || "")}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="secondary-btn" type="button" data-action="qs-add-set" data-ex="${ex.id}">+ Set</button>
          <button class="secondary-btn danger" type="button" data-action="qs-del-ex" data-ex="${ex.id}">Remove</button>
        </div>
      </div>

      <div style="margin-top:10px">
        <div class="grid-2">
          <div class="form-row">
            <label>Exercise name</label>
            <input type="text" value="${escapeAttr(ex.name)}" data-action="qs-ex-name" data-ex="${ex.id}" />
          </div>
          <div class="form-row">
            <label>Notes</label>
            <input type="text" value="${escapeAttr(ex.notes || "")}" data-action="qs-ex-notes" data-ex="${ex.id}" />
          </div>
        </div>
      </div>

      ${setsHtml}
    `;
    list.appendChild(div);
  });
}

function renderTemplates() {
  const list = $("#templatesList");
  list.innerHTML = "";

  if (!state.templates.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No templates yet</div><div class="item-sub">Create one above.</div></div>`;
    return;
  }

  state.templates.slice().sort((a,b) => (a.name||"").localeCompare(b.name||"")).forEach(t => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(t.name)}</div>
          <div class="item-sub">${(t.exercises?.length || 0)} exercises</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="secondary-btn" type="button" data-action="tpl-use" data-id="${t.id}">Use</button>
          <button class="secondary-btn danger" type="button" data-action="tpl-del" data-id="${t.id}">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderTemplatePickList() {
  const list = $("#tplPickList");
  list.innerHTML = "";

  if (!state.templates.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No templates yet</div><div class="item-sub">Create one in Workouts first.</div></div>`;
    return;
  }

  state.templates.slice().sort((a,b)=> (a.name||"").localeCompare(b.name||"")).forEach(t => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(t.name)}</div>
          <div class="item-sub">${(t.exercises?.length || 0)} exercises</div>
        </div>
        <button class="secondary-btn" type="button" data-action="tpl-pick" data-id="${t.id}">Select</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderLog(filter = "") {
  const list = $("#logList");
  list.innerHTML = "";

  const q = filter.trim().toLowerCase();
  const sessions = state.sessions
    .slice()
    .sort((a,b) => (b.date||"").localeCompare(a.date||""))
    .filter(s => {
      if (!q) return true;
      const inSession = (s.name||"").toLowerCase().includes(q) || (s.notes||"").toLowerCase().includes(q) || (s.date||"").includes(q);
      const inEx = (s.exercises||[]).some(ex => (ex.name||"").toLowerCase().includes(q));
      return inSession || inEx;
    });

  if (!sessions.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No sessions found</div><div class="item-sub">Try a different search.</div></div>`;
    return;
  }

  sessions.forEach(s => {
    const exCount = s.exercises?.length || 0;
    const setCount = (s.exercises || []).reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(s.name)}</div>
          <div class="item-sub">${escapeHtml(s.date)} • ${exCount} exercises • ${setCount} sets</div>
        </div>
        <button class="secondary-btn" type="button" data-action="open-session" data-id="${s.id}">View</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderSessionDetail(sessionId) {
  const card = $("#sessionDetailCard");
  const s = state.sessions.find(x => x.id === sessionId);
  if (!s) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";
  $("#detailTitle").textContent = s.name || "Session";
  $("#detailMeta").textContent = `${s.date} • ${(s.exercises?.length || 0)} exercises`;
  $("#detailNotes").textContent = s.notes ? s.notes : "";

  $("#btnDeleteSession").setAttribute("data-session", s.id);

  const list = $("#detailExercises");
  list.innerHTML = "";

  const units = state.settings.units || "kg";

  (s.exercises || []).forEach(ex => {
    const div = document.createElement("div");
    div.className = "item";

    const sets = (ex.sets || []).map((set, idx) => {
      const w = set.weight === "" ? "—" : `${set.weight}${units}`;
      const r = set.reps === "" ? "—" : `${set.reps} reps`;
      const rir = set.rir === "" ? "" : ` • RIR ${set.rir}`;
      return `<div class="item-sub">Set ${idx+1}: ${escapeHtml(w)} • ${escapeHtml(r)}${escapeHtml(rir)}</div>`;
    }).join("");

    div.innerHTML = `
      <div class="item-title">${escapeHtml(ex.name)}</div>
      ${ex.notes ? `<div class="item-sub">${escapeHtml(ex.notes)}</div>` : ""}
      <div style="margin-top:8px">${sets || `<div class="item-sub">No sets logged</div>`}</div>
    `;
    list.appendChild(div);
  });

  // scroll into view
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderVideos() {
  const list = $("#videosList");
  list.innerHTML = "";

  if (!state.videos.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No videos yet</div><div class="item-sub">Add one above.</div></div>`;
    return;
  }

  state.videos.forEach(v => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(v.title)}</div>
          <div class="item-sub">${escapeHtml(v.url)}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="secondary-btn video-btn" type="button" data-video="${escapeAttr(v.url)}">Open</button>
          <button class="secondary-btn danger" type="button" data-action="vid-del" data-id="${v.id}">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderSettings() {
  $("#setName").value = state.settings.name || "";
  $("#setDefaultSession").value = state.settings.defaultSession || "";
  $("#setUnits").value = state.settings.units || "kg";
  $("#setWeekStart").value = state.settings.weekStart || "mon";
}

function renderMeasurements() {
  const list = $("#measList");
  list.innerHTML = "";

  const units = state.settings.units || "kg";
  const sorted = state.measurements.slice().sort((a,b) => (b.date||"").localeCompare(a.date||""));

  if (!sorted.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No measurements yet</div><div class="item-sub">Add weight entries to track progress.</div></div>`;
    return;
  }

  sorted.forEach(m => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(m.date)}</div>
          <div class="item-sub">${escapeHtml(formatWeight(m.weight, units) || "—")}${m.notes ? ` • ${escapeHtml(m.notes)}` : ""}</div>
        </div>
        <button class="secondary-btn danger" type="button" data-action="meas-del" data-id="${m.id}">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderAll() {
  renderDashboard();
  renderQuickForm();
  renderTemplates();
  renderTemplatePickList();
  renderLog($("#logSearch")?.value || "");
  renderVideos();
  renderSettings();
  renderMeasurements();
}

/* -------------------------
   Init
------------------------- */
function init() {
  // default dates
  $("#qsDate").value = todayISO();
  $("#measDate").value = todayISO();

  // quick defaults
  quickDraft.date = todayISO();
  quickDraft.name = state.settings.defaultSession || "";
  $("#qsName").value = quickDraft.name;

  renderAll();
  showScreen("dashboard");
}

init();

/* =========================================================
   EVENTS
   ========================================================= */

/* NAV */
document.addEventListener("click", (e) => {
  const nav = e.target.closest(".nav-btn");
  if (!nav) return;

  const key = nav.dataset.nav;
  showScreen(key);

  // Close detail if switching screens
  if (key !== "log") {
    $("#sessionDetailCard").style.display = "none";
  }
});

/* MODAL CLOSE */
document.addEventListener("click", (e) => {
  const close = e.target.closest("[data-close]");
  if (!close) return;
  closeModal(close.getAttribute("data-close"));
});

/* VIDEO OPEN (delegated = ALWAYS works) */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".video-btn");
  if (!btn) return;
  const url = btn.getAttribute("data-video");
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
});

/* DASH: go log */
$("#btnGoLog").addEventListener("click", () => showScreen("log"));

/* QUICK DRAFT change handlers */
$("#qsDate").addEventListener("change", () => {
  quickDraft.date = $("#qsDate").value || todayISO();
});
$("#qsName").addEventListener("input", () => {
  quickDraft.name = clampStr($("#qsName").value, 80);
});
$("#qsNotes").addEventListener("input", () => {
  quickDraft.notes = clampStr($("#qsNotes").value, 2000);
});

/* Quick: add exercise */
$("#btnAddExerciseToQuick").addEventListener("click", () => {
  quickDraft.exercises.push({
    id: uid(),
    name: "New Exercise",
    notes: "",
    sets: [
      { id: uid(), weight: "", reps: "", rir: "", done: false }
    ]
  });
  renderQuickExercises();
});

/* Quick: delegated inputs/buttons */
document.addEventListener("input", (e) => {
  const a = e.target.getAttribute("data-action");
  if (!a) return;

  const exId = e.target.getAttribute("data-ex");
  const setId = e.target.getAttribute("data-set");

  const ex = quickDraft.exercises.find(x => x.id === exId);
  if (!ex) return;

  if (a === "qs-ex-name") ex.name = clampStr(e.target.value, 80);
  if (a === "qs-ex-notes") ex.notes = clampStr(e.target.value, 200);

  if (a === "qs-set-weight") {
    const set = ex.sets.find(s => s.id === setId);
    if (set) set.weight = e.target.value;
  }
  if (a === "qs-set-reps") {
    const set = ex.sets.find(s => s.id === setId);
    if (set) set.reps = e.target.value;
  }
  if (a === "qs-set-rir") {
    const set = ex.sets.find(s => s.id === setId);
    if (set) set.rir = e.target.value;
  }
});

document.addEventListener("click", (e) => {
  const a = e.target.getAttribute("data-action");
  if (!a) return;

  if (a === "qs-add-set") {
    const exId = e.target.getAttribute("data-ex");
    const ex = quickDraft.exercises.find(x => x.id === exId);
    if (!ex) return;
    ex.sets.push({ id: uid(), weight: "", reps: "", rir: "", done: false });
    renderQuickExercises();
  }

  if (a === "qs-del-ex") {
    const exId = e.target.getAttribute("data-ex");
    quickDraft.exercises = quickDraft.exercises.filter(x => x.id !== exId);
    renderQuickExercises();
  }

  if (a === "qs-del-set") {
    const exId = e.target.getAttribute("data-ex");
    const setId = e.target.getAttribute("data-set");
    const ex = quickDraft.exercises.find(x => x.id === exId);
    if (!ex) return;
    ex.sets = (ex.sets || []).filter(s => s.id !== setId);
    renderQuickExercises();
  }
});

/* Quick: save session */
$("#quickSessionForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const date = $("#qsDate").value;
  const name = ($("#qsName").value || "").trim();
  const notes = ($("#qsNotes").value || "").trim();

  if (!date || !name) return;

  const session = {
    id: uid(),
    date,
    name: clampStr(name, 80),
    notes: clampStr(notes, 2000),
    exercises: quickDraft.exercises.map(ex => ({
      id: uid(),
      name: clampStr(ex.name, 80),
      notes: clampStr(ex.notes, 200),
      sets: (ex.sets || []).map(s => ({
        id: uid(),
        weight: s.weight ?? "",
        reps: s.reps ?? "",
        rir: s.rir ?? "",
        done: !!s.done
      }))
    }))
  };

  state.sessions.push(session);
  saveState();

  // reset quick draft but keep date today
  $("#qsNotes").value = "";
  resetQuickDraft(true);
  quickDraft.date = todayISO();
  quickDraft.name = state.settings.defaultSession || "";
  $("#qsDate").value = quickDraft.date;
  $("#qsName").value = quickDraft.name;

  renderAll();
  showScreen("log");
});

/* -------------------------
   Templates builder
------------------------- */
let tplDraft = []; // exercises for the template being built

function renderTplPreview() {
  const list = $("#tplExercisesPreview");
  list.innerHTML = "";

  if (!tplDraft.length) {
    list.innerHTML = `<div class="item"><div class="item-title">No exercises added</div><div class="item-sub">Add exercises above.</div></div>`;
    return;
  }

  tplDraft.forEach(ex => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(ex.name)}</div>
          <div class="item-sub">${escapeHtml(ex.defaultSets)} sets • ${escapeHtml(ex.defaultReps)} reps • rest ${escapeHtml(ex.defaultRest)}s ${ex.notes ? "• " + escapeHtml(ex.notes) : ""}</div>
        </div>
        <button class="secondary-btn danger" type="button" data-action="tpl-draft-del" data-id="${ex.id}">Remove</button>
      </div>
    `;
    list.appendChild(div);
  });
}
renderTplPreview();

$("#btnTplAddExercise").addEventListener("click", () => {
  const name = ($("#tplExName").value || "").trim();
  if (!name) return;

  tplDraft.push({
    id: uid(),
    name: clampStr(name, 80),
    notes: clampStr($("#tplExNotes").value || "", 200),
    defaultSets: safeNumber($("#tplExSets").value, 3),
    defaultReps: clampStr($("#tplExReps").value || "8-12", 30),
    defaultRest: safeNumber($("#tplExRest").value, 90)
  });

  $("#tplExName").value = "";
  $("#tplExNotes").value = "";
  renderTplPreview();
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action='tpl-draft-del']");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  tplDraft = tplDraft.filter(x => x.id !== id);
  renderTplPreview();
});

$("#templateForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = ($("#tplName").value || "").trim();
  if (!name) return;

  state.templates.push({
    id: uid(),
    name: clampStr(name, 80),
    exercises: tplDraft.map(ex => ({ ...ex, id: uid() }))
  });

  tplDraft = [];
  $("#tplName").value = "";
  renderTplPreview();

  saveState();
  renderAll();
});

/* Use / delete templates */
document.addEventListener("click", (e) => {
  const useBtn = e.target.closest("[data-action='tpl-use']");
  if (useBtn) {
    const id = useBtn.getAttribute("data-id");
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return;

    // Fill Quick Log with template
    showScreen("dashboard");
    $("#qsName").value = tpl.name;
    quickDraft.name = tpl.name;

    quickDraft.exercises = (tpl.exercises || []).map(ex => {
      const sets = [];
      const nSets = Math.max(1, safeNumber(ex.defaultSets, 3));
      for (let i = 0; i < nSets; i++) {
        sets.push({ id: uid(), weight: "", reps: "", rir: "", done: false });
      }
      return {
        id: uid(),
        name: ex.name,
        notes: ex.notes || "",
        sets
      };
    });

    renderQuickExercises();
    return;
  }

  const delBtn = e.target.closest("[data-action='tpl-del']");
  if (delBtn) {
    const id = delBtn.getAttribute("data-id");
    state.templates = state.templates.filter(t => t.id !== id);
    saveState();
    renderAll();
    return;
  }

  const pickBtn = e.target.closest("[data-action='tpl-pick']");
  if (pickBtn) {
    const id = pickBtn.getAttribute("data-id");
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return;
    closeModal("tplModal");

    // Prefill quick log
    showScreen("dashboard");
    $("#qsName").value = tpl.name;
    quickDraft.name = tpl.name;

    quickDraft.exercises = (tpl.exercises || []).map(ex => {
      const sets = [];
      const nSets = Math.max(1, safeNumber(ex.defaultSets, 3));
      for (let i = 0; i < nSets; i++) sets.push({ id: uid(), weight: "", reps: "", rir: "", done: false });
      return { id: uid(), name: ex.name, notes: ex.notes || "", sets };
    });
    renderQuickExercises();
  }
});

/* Log: open session + delete */
document.addEventListener("click", (e) => {
  const openBtn = e.target.closest("[data-action='open-session']");
  if (openBtn) {
    const id = openBtn.getAttribute("data-id");
    showScreen("log");
    renderSessionDetail(id);
    return;
  }
});

$("#btnCloseDetail").addEventListener("click", () => {
  $("#sessionDetailCard").style.display = "none";
});

$("#btnDeleteSession").addEventListener("click", () => {
  const id = $("#btnDeleteSession").getAttribute("data-session");
  if (!id) return;
  const ok = confirm("Delete this session? This cannot be undone.");
  if (!ok) return;

  state.sessions = state.sessions.filter(s => s.id !== id);
  saveState();
  $("#sessionDetailCard").style.display = "none";
  renderAll();
});

/* Log search */
$("#logSearch").addEventListener("input", (e) => renderLog(e.target.value));
$("#btnClearSearch").addEventListener("click", () => {
  $("#logSearch").value = "";
  renderLog("");
});

/* New from template */
$("#btnNewFromTemplate").addEventListener("click", () => {
  renderTemplatePickList();
  openModal("tplModal");
});

/* Videos add/delete */
$("#videoAddForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = ($("#vidTitle").value || "").trim();
  const url = ($("#vidUrl").value || "").trim();
  if (!title || !url) return;

  state.videos.push({ id: uid(), title: clampStr(title, 120), url: clampStr(url, 400) });
  saveState();

  $("#vidTitle").value = "";
  $("#vidUrl").value = "";
  renderVideos();
});

document.addEventListener("click", (e) => {
  const del = e.target.closest("[data-action='vid-del']");
  if (!del) return;
  const id = del.getAttribute("data-id");
  state.videos = state.videos.filter(v => v.id !== id);
  saveState();
  renderVideos();
});

/* Settings save */
$("#btnSaveSettings").addEventListener("click", () => {
  state.settings.name = clampStr($("#setName").value || "", 40);
  state.settings.defaultSession = clampStr($("#setDefaultSession").value || "", 80);
  state.settings.units = $("#setUnits").value || "kg";
  state.settings.weekStart = $("#setWeekStart").value || "mon";

  saveState();

  // apply default to quick
  if (!($("#qsName").value || "").trim() && state.settings.defaultSession) {
    $("#qsName").value = state.settings.defaultSession;
    quickDraft.name = state.settings.defaultSession;
  }

  renderAll();
  showScreen("dashboard");
});

/* Measurements add/delete */
$("#measForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const date = $("#measDate").value;
  const weight = $("#measWeight").value;
  const notes = ($("#measNotes").value || "").trim();

  if (!date || weight === "") return;

  state.measurements.push({
    id: uid(),
    date,
    weight: weight,
    notes: clampStr(notes, 140)
  });

  saveState();
  $("#measNotes").value = "";
  renderMeasurements();
  renderDashboard();
});

document.addEventListener("click", (e) => {
  const del = e.target.closest("[data-action='meas-del']");
  if (!del) return;
  const id = del.getAttribute("data-id");
  state.measurements = state.measurements.filter(m => m.id !== id);
  saveState();
  renderMeasurements();
  renderDashboard();
});

/* Export */
$("#btnExport").addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "steadylog",
    version: 2,
    data: state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "steady-log-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

/* Import */
$("#btnImport").addEventListener("click", () => $("#fileImport").click());

$("#fileImport").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // accept either payload wrapper or raw state
    const incoming = parsed?.data ? parsed.data : parsed;

    const ok = confirm("Import backup and overwrite current data on this device?");
    if (!ok) return;

    // use loader to normalize
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming));
    state = loadState();
    saveState();

    // refresh UI
    $("#fileImport").value = "";
    $("#qsDate").value = todayISO();
    $("#measDate").value = todayISO();
    resetQuickDraft(false);
    quickDraft.name = state.settings.defaultSession || "";
    renderAll();
    showScreen("dashboard");
  } catch (err) {
    alert("Import failed. Make sure it's a valid Steady Log JSON backup.");
  }
});

/* Reset */
$("#btnReset").addEventListener("click", () => {
  const ok = confirm("Reset ALL Steady Log data on this device? This cannot be undone.");
  if (!ok) return;

  state = structuredClone(defaultState);
  saveState();

  tplDraft = [];
  renderTplPreview();

  resetQuickDraft(false);
  quickDraft.date = todayISO();
  quickDraft.name = "";
  $("#qsDate").value = todayISO();
  $("#qsName").value = "";
  $("#qsNotes").value = "";

  $("#measDate").value = todayISO();
  $("#measWeight").value = "";
  $("#measNotes").value = "";

  renderAll();
  showScreen("dashboard");
});
