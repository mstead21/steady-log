/* Steady Log — FULL PREMIUM LOCKED BUILD (PREMIUM_LOCKED_A_2026_02_15)
   A) Per-exercise rest timers (each exercise has its own rest time)
   Premium:
   - Dashboard + streaks + 7-day weight trend
   - Workout logging + suggested KG
   - Per-exercise rest timer auto-starts on ✓
   - Video button: YouTube SEARCH (never breaks)
   - Templates editor (name, sets, reps, rest, videoSearch) + reorder + delete
   - Tracker: daily weight + weekly waist
   - Macros: daily logging + targets + progress bars + streak
   - Exports: workouts CSV + tracker CSV + macros CSV
*/
const BUILD_TAG = "PREMIUM_LOCKED_A_2026_02_16_FIX1";

const STORAGE_KEY   = "steadylog.sessions.v3";
const TEMPLATES_KEY = "steadylog.templates.v3";
const TRACKER_KEY   = "steadylog.tracker.v2";
const MACROS_KEY    = "steadylog.macros.v1";

const MACRO_TARGETS = { calories: 2010, protein: 210, carbs: 180, fat: 50 };

const DEFAULT_TEMPLATES = [
  {
    id: "upperA",
    name: "Upper A",
    subtitle: "Chest & Arms",
    exercises: [
      { id:"smith_incline", name:"Smith Incline Bench Press", sets:3, reps:"6–8",  rest:120, videoSearch:"smith machine incline bench press form" },
      { id:"row_chest_support", name:"Chest Supported Row Machine (Plate)", sets:3, reps:"8–12", rest:90,  videoSearch:"chest supported row machine plate loaded form" },
      { id:"chest_press_flat", name:"Chest Press (Plate Loaded Flat)", sets:3, reps:"8–10", rest:90,  videoSearch:"plate loaded chest press machine form" },
      { id:"shoulder_press_plate", name:"Shoulder Press (Plate Machine)", sets:3, reps:"8–10", rest:90,  videoSearch:"plate loaded shoulder press machine form" },
      { id:"tri_pushdown", name:"Cable Tricep Pushdown", sets:3, reps:"10–15", rest:60, videoSearch:"cable tricep pushdown form" },
      { id:"preacher_curl", name:"Preacher Curl Machine", sets:3, reps:"10–15", rest:60, videoSearch:"preacher curl machine form" }
    ]
  },
  {
    id: "lowerA",
    name: "Lower A",
    subtitle: "Quads & Burn",
    exercises: [
      { id:"smith_squat", name:"Smith Squat", sets:4, reps:"6–8", rest:120, videoSearch:"smith machine squat form" },
      { id:"leg_press", name:"45° Leg Press", sets:3, reps:"10–15", rest:90, videoSearch:"45 degree leg press form" },
      { id:"walking_lunges", name:"Walking Lunges", sets:3, reps:"10–12/leg", rest:75, videoSearch:"walking lunges form" },
      { id:"leg_ext", name:"Leg Extension", sets:3, reps:"12–15", rest:60, videoSearch:"leg extension machine form" },
      { id:"calf_raise", name:"Standing Calf Raise", sets:4, reps:"10–15", rest:60, videoSearch:"standing calf raise machine form" }
    ]
  }
];

/* -------------------- Utilities -------------------- */
const $ = (id)=>document.getElementById(id);
const view = $("view");
const pillStatus = $("pillStatus");

function nowISO(){ return new Date().toISOString(); }
function todayStr(){
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

function loadJSON(key, fallback){
  try{
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  }catch(e){
    return fallback;
  }
}
function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function toast(msg="Saved ✅"){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 900);
}

/* -------------------- State -------------------- */
let sessions = loadJSON(STORAGE_KEY, []);
let templates = loadJSON(TEMPLATES_KEY, DEFAULT_TEMPLATES);
let tracker = loadJSON(TRACKER_KEY, { weights: [], waist: [] });
let macros = loadJSON(MACROS_KEY, { days: [] });

let activeTab = "dashboard";
let activeWorkout = null;

function setStatus(text){ pillStatus.textContent = text; }

/* -------------------- Premium Lock (UI copy only) -------------------- */
const PREMIUM_LOCKED = true;

/* -------------------- Dashboard helpers -------------------- */
function dayStreak(){
  const days = new Set(sessions.map(s=>s.date));
  let streak=0;
  for(let i=0;i<365;i++){
    const d = new Date();
    d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    if(days.has(key)) streak++;
    else break;
  }
  return streak;
}

/* Video modal (YouTube search) */
let currentSearch = "";
const videoModal = document.getElementById("videoModal");
const videoFrame = document.getElementById("videoFrame");
const videoClose = document.getElementById("videoClose");
const videoOpenNew = document.getElementById("videoOpenNew");
const videoTitle = document.getElementById("videoTitle");

function youtubeWebSearchUrl(q){ return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q); }
function youtubeEmbedSearchUrl(q){ return "https://www.youtube.com/embed?listType=search&list=" + encodeURIComponent(q) + "&rel=0&modestbranding=1&playsinline=1"; }

/* ✅ FIXED: accepts either a search phrase OR a full URL, and wires the correct button */
function openVideo(title, searchOrUrl){
  // iOS/Safari can be unreliable with embedded YouTube (and many videos block embeds),
  // so we use a clean modal + "Open in YouTube" button.
  const q = (searchOrUrl || "").trim();
  const youtubeUrl = q ? (q.startsWith("http") ? q : youtubeWebSearchUrl(q)) : "https://www.youtube.com/";

  videoTitle.textContent = `Video • ${title}`;
  videoFrame.innerHTML = `
    <div class="videoPlaceholder">
      <div class="vpTitle">Watch this exercise</div>
      <div class="vpSub">Tap <b>Open in YouTube</b> to play (best reliability on iPhone).</div>
    </div>`;

  // Always open a real YouTube page (most reliable)
  videoOpenNew.onclick = ()=> window.open(youtubeUrl, "_blank", "noopener,noreferrer");

  videoModal.classList.add("show");
  videoModal.setAttribute("aria-hidden","false");
}
function closeVideo(){
  videoFrame.innerHTML = "";
  videoModal.classList.remove("show");
  videoModal.setAttribute("aria-hidden","true");
}
videoClose.onclick = closeVideo;
videoOpenNew.onclick = ()=>{ window.open(currentSearch ? youtubeWebSearchUrl(currentSearch) : "https://www.youtube.com/", "_blank", "noopener,noreferrer"); };
videoModal.addEventListener("click",(e)=>{ if(e.target===videoModal) closeVideo(); });

/* -------------------- Rest timer overlay -------------------- */
let timerInterval=null, timerEndsAt=null;
function stopTimer(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval=null; timerEndsAt=null;
  const o=document.getElementById("timerOverlay");
  if(o) o.remove();
}
function startTimer(seconds){
  stopTimer();
  timerEndsAt = Date.now() + seconds*1000;

  const overlay=document.createElement("div");
  overlay.id="timerOverlay";
  overlay.style.position="fixed";
  overlay.style.inset="0";
  overlay.style.background="rgba(0,0,0,.55)";
  overlay.style.backdropFilter="blur(10px)";
  overlay.style.display="flex";
  overlay.style.alignItems="center";
  overlay.style.justifyContent="center";
  overlay.style.zIndex="9999";
  overlay.innerHTML = `
    <div style="background:rgba(20,20,27,.94);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:16px;width:min(520px,92vw);text-align:center;">
      <div style="font-weight:900;font-size:16px;margin-bottom:10px;">Rest</div>
      <div id="timerLeft" style="font-weight:950;font-size:44px;letter-spacing:.04em;margin:10px 0;">--</div>
      <button class="btn danger" id="timerStop">Stop</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("timerStop").onclick = stopTimer;

  function tick(){
    const left = Math.max(0, Math.ceil((timerEndsAt - Date.now())/1000));
    document.getElementById("timerLeft").textContent = left+"s";
    if(left<=0) stopTimer();
  }
  tick();
  timerInterval = setInterval(tick, 200);
}

/* -------------------- UI Renderers -------------------- */
function navButton(id,label,ico){
  return `<button class="navbtn ${activeTab===id?"active":""}" data-nav="${id}">
    <div class="ico">${ico}</div><div>${label}</div></button>`;
}

function renderNav(){
  const wrap = $("footerWrap");
  wrap.innerHTML = [
    navButton("dashboard","Dash","🏠"),
    navButton("workout","Workout","🏋️"),
    navButton("templates","Templates","📋"),
    navButton("tracker","Tracker","📈"),
    navButton("macros","Macros","🍽️")
  ].join("");
  wrap.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>{
    activeTab=b.dataset.nav;
    activeWorkout=null;
    render();
  });
}

function formatKg(v){
  if(v===null || v===undefined || v==="") return "";
  const n = Number(v);
  if(Number.isFinite(n)) return (Math.round(n*10)/10).toString();
  return "";
}

function lastWeightFor(exName){
  for(let i=sessions.length-1;i>=0;i--){
    const s = sessions[i];
    const ex = (s.exercises||[]).find(e=>e.name===exName);
    if(!ex) continue;
    const sets = ex.sets||[];
    for(let j=sets.length-1;j>=0;j--){
      const kg = Number(sets[j].kg);
      if(Number.isFinite(kg) && kg>0) return kg;
    }
  }
  return null;
}

function renderDashboard(){
  const today = todayStr();
  const last = sessions.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-1)[0];
  const streak = dayStreak();

  // 7-day weight trend
  const weights = tracker.weights.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const last7 = weights.filter(w=>{
    const d = new Date(w.date);
    const diff = (new Date(today) - d) / (1000*60*60*24);
    return diff>=0 && diff<=6.999;
  });
  const start = last7[0]?.kg;
  const end = last7[last7.length-1]?.kg;
  const delta = (Number.isFinite(start) && Number.isFinite(end)) ? (Math.round((end-start)*10)/10) : null;

  return `
    <div class="card">
      <h2>Dashboard</h2>
      <div class="hr"></div>
      <div class="grid">
        <div class="exercise">
          <div class="exercise-name">Streak</div>
          <div class="exercise-meta">${streak} day(s)</div>
          <div class="hr"></div>
          <div class="bar"><div style="width:${clamp(streak*8,0,100)}%"></div></div>
        </div>
        <div class="exercise">
          <div class="exercise-name">Last session</div>
          <div class="exercise-meta">${last ? `${last.date} • ${last.name}` : "—"}</div>
          <div class="hr"></div>
          <div class="bar"><div style="width:${last?70:0}%"></div></div>
        </div>
        <div class="exercise">
          <div class="exercise-name">7-day weight</div>
          <div class="exercise-meta">${(delta===null) ? "—" : (delta>0?`+${delta}kg`:`${delta}kg`)}</div>
          <div class="hr"></div>
          <div class="bar"><div style="width:${delta===null?0:clamp(Math.abs(delta)*35,10,100)}%"></div></div>
        </div>
        <div class="exercise">
          <div class="exercise-name">Today</div>
          <div class="exercise-meta">${today}</div>
          <div class="hr"></div>
          <button class="btn primary" id="dashStart">Start workout</button>
        </div>
      </div>
    </div>
  `;
}

function newSessionFromTemplate(tpl){
  const s = {
    id: "s_"+Math.random().toString(16).slice(2),
    date: todayStr(),
    name: tpl.name,
    createdAt: nowISO(),
    exercises: tpl.exercises.map(ex=>{
      const lastKg = lastWeightFor(ex.name);
      return {
        name: ex.name,
        reps: ex.reps,
        rest: ex.rest,
        videoSearch: ex.videoSearch || "",
        note: "",
        sets: Array.from({length: ex.sets}, ()=>({kg: lastKg?formatKg(lastKg):"", reps:"", done:false}))
      };
    })
  };
  sessions.push(s);
  saveJSON(STORAGE_KEY, sessions);
  toast("Workout created ✅");
  activeWorkout = s;
  activeTab = "workout";
  render();
}

function renderWorkoutHome(){
  if(!activeWorkout){
    const tplCards = templates.map(t=>`
      <div class="exercise">
        <div class="exercise-head">
          <div>
            <div class="exercise-name">${t.name}</div>
            <div class="exercise-meta">${t.subtitle||""} • ${t.exercises.length} exercises</div>
          </div>
          <button class="btn primary" data-start="${t.id}">Start</button>
        </div>
      </div>
    `).join("");

    return `
      <div class="card">
        <h2>Workout</h2>
        <div class="sub">${PREMIUM_LOCKED ? "Premium is currently locked (buttons shown but disabled elsewhere)." : ""}</div>
        <div class="hr"></div>
        <div class="section-title">Start from template</div>
        <div class="list">${tplCards || `<div class="exercise"><div class="exercise-name">No templates</div></div>`}</div>
      </div>
    `;
  }

  // active workout view
  const s = activeWorkout;
  const exHtml = s.exercises.map((ex, idx)=>{
    const setsHtml = ex.sets.map((set, si)=>`
      <div class="set">
        <input class="input" data-role="kg" inputmode="decimal" placeholder="kg" value="${escapeHtml(set.kg)}" data-kg="${idx}" data-si="${si}">
        <input class="input" data-role="reps" inputmode="numeric" placeholder="reps" value="${escapeHtml(set.reps)}" data-reps="${idx}" data-si="${si}">
        <button class="smallbtn ok ${set.done?"on":""}" data-role="done" data-done="${idx}" data-si="${si}">✓</button>
        <button class="smallbtn del" data-role="del" data-del="${idx}" data-si="${si}">✕</button>
      </div>
    `).join("");

    const rest = ex.rest ? `${ex.rest}s rest` : "";
    const meta = [ex.reps?`${ex.reps} reps target`:"", rest].filter(Boolean).join(" • ");
    const videoBtn = ex.videoSearch ? `<button class="btn" data-video="${idx}">Video</button>` : "";

    return `
      <div class="exercise">
        <div class="exercise-head">
          <div>
            <div class="exercise-name">${ex.name}</div>
            <div class="exercise-meta">${meta}</div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;">
            ${videoBtn}
            <button class="btn danger" data-exdel="${idx}">Remove</button>
          </div>
        </div>
        <div class="hr"></div>
        ${setsHtml}
        <div class="hr"></div>
        <button class="btn" data-addset="${idx}">+ Add set</button>
        <div class="hr"></div>
        <input class="input" placeholder="Exercise note (optional)" value="${escapeHtml(ex.note||"")}" data-exnote="${idx}">
      </div>
    `;
  }).join("");

  return `
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
        <div>
          <h2>${s.name}</h2>
          <div class="sub">${s.date}</div>
        </div>
        <button class="btn danger small" id="endWorkout">End</button>
      </div>
      <div class="hr"></div>
      <div class="list">${exHtml}</div>
      <div class="hr"></div>
      <button class="btn primary" id="saveWorkout">Save</button>
    </div>
  `;
}

function renderTemplates(){
  const tplList = templates.map(t=>`
    <div class="exercise">
      <div class="exercise-head">
        <div>
          <div class="exercise-name">${t.name}</div>
          <div class="exercise-meta">${t.subtitle||""} • ${t.exercises.length} exercises</div>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn" data-edit="${t.id}">Edit</button>
          <button class="btn danger" data-deltpl="${t.id}">Delete</button>
        </div>
      </div>
    </div>
  `).join("");

  return `
    <div class="card">
      <h2>Templates</h2>
      <div class="sub">${PREMIUM_LOCKED ? "Premium locked (templates still editable in this build)." : ""}</div>
      <div class="hr"></div>
      <button class="btn primary" id="newTpl">+ New Template</button>
      <div class="hr"></div>
      <div class="list">${tplList || `<div class="exercise"><div class="exercise-name">No templates</div></div>`}</div>
    </div>
  `;
}

function renderTracker(){
  const today = todayStr();
  const lastW = tracker.weights.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-1)[0];
  const lastWaist = tracker.waist.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-1)[0];

  return `
    <div class="card">
      <h2>Tracker</h2>
      <div class="sub">Daily weight + weekly waist</div>
      <div class="hr"></div>

      <div class="grid">
        <div class="exercise">
          <div class="exercise-name">Weight</div>
          <div class="exercise-meta">Last: ${lastW ? `${lastW.date} • ${lastW.kg}kg` : "—"}</div>
          <div class="hr"></div>
          <input class="input" id="trkWeight" inputmode="decimal" placeholder="kg (today)" />
          <button class="btn primary" id="saveWeight">Save weight</button>
        </div>

        <div class="exercise">
          <div class="exercise-name">Waist</div>
          <div class="exercise-meta">Last: ${lastWaist ? `${lastWaist.date} • ${lastWaist.cm}cm` : "—"}</div>
          <div class="hr"></div>
          <input class="input" id="trkWaist" inputmode="decimal" placeholder="cm (weekly)" />
          <button class="btn primary" id="saveWaist">Save waist</button>
        </div>
      </div>

      <div class="hr"></div>
      <button class="btn" id="exportTracker">Export tracker CSV</button>
    </div>
  `;
}

function sumMacrosFor(date){
  const day = macros.days.find(d=>d.date===date);
  if(!day) return { calories:0, protein:0, carbs:0, fat:0 };
  return { calories:day.calories||0, protein:day.protein||0, carbs:day.carbs||0, fat:day.fat||0 };
}

function renderMacros(){
  const today = todayStr();
  const totals = sumMacrosFor(today);

  function bar(p){
    const w = clamp(Math.round(p*100), 0, 100);
    return `<div class="bar"><div style="width:${w}%"></div></div>`;
  }
  const cP = MACRO_TARGETS.calories ? totals.calories / MACRO_TARGETS.calories : 0;
  const pP = MACRO_TARGETS.protein ? totals.protein / MACRO_TARGETS.protein : 0;
  const crP= MACRO_TARGETS.carbs ? totals.carbs / MACRO_TARGETS.carbs : 0;
  const fP = MACRO_TARGETS.fat ? totals.fat / MACRO_TARGETS.fat : 0;

  return `
    <div class="card">
      <h2>Macros</h2>
      <div class="sub">Targets: ${MACRO_TARGETS.calories} kcal • P${MACRO_TARGETS.protein}/C${MACRO_TARGETS.carbs}/F${MACRO_TARGETS.fat}</div>
      <div class="hr"></div>

      <div class="grid">
        <div class="exercise">
          <div class="exercise-name">Calories</div>
          <div class="exercise-meta">${totals.calories} / ${MACRO_TARGETS.calories}</div>
          ${bar(cP)}
        </div>
        <div class="exercise">
          <div class="exercise-name">Protein</div>
          <div class="exercise-meta">${totals.protein}g / ${MACRO_TARGETS.protein}g</div>
          ${bar(pP)}
        </div>
        <div class="exercise">
          <div class="exercise-name">Carbs</div>
          <div class="exercise-meta">${totals.carbs}g / ${MACRO_TARGETS.carbs}g</div>
          ${bar(crP)}
        </div>
        <div class="exercise">
          <div class="exercise-name">Fat</div>
          <div class="exercise-meta">${totals.fat}g / ${MACRO_TARGETS.fat}g</div>
          ${bar(fP)}
        </div>
      </div>

      <div class="hr"></div>

      <div class="grid">
        <div class="exercise">
          <div class="exercise-name">Log today</div>
          <div class="exercise-meta">${today}</div>
          <div class="hr"></div>

          <input class="input" id="mCal" inputmode="numeric" placeholder="calories" value="${totals.calories||""}" />
          <div class="hr"></div>
          <input class="input" id="mP" inputmode="numeric" placeholder="protein (g)" value="${totals.protein||""}" />
          <div class="hr"></div>
          <input class="input" id="mC" inputmode="numeric" placeholder="carbs (g)" value="${totals.carbs||""}" />
          <div class="hr"></div>
          <input class="input" id="mF" inputmode="numeric" placeholder="fat (g)" value="${totals.fat||""}" />

          <div class="hr"></div>
          <button class="btn primary" id="saveMacros">Save macros</button>
        </div>

        <div class="exercise">
          <div class="exercise-name">Export</div>
          <div class="exercise-meta">Download all days</div>
          <div class="hr"></div>
          <button class="btn" id="exportMacros">Export macros CSV</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s){
  return String(s??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function render(){
  renderNav();

  let html = "";
  if(activeTab==="dashboard") html = renderDashboard();
  if(activeTab==="workout") html = renderWorkoutHome();
  if(activeTab==="templates") html = renderTemplates();
  if(activeTab==="tracker") html = renderTracker();
  if(activeTab==="macros") html = renderMacros();

  view.innerHTML = html;

  // dashboard
  const dashStart = $("dashStart");
  if(dashStart) dashStart.onclick=()=>{ activeTab="workout"; render(); };

  // workout home: start
  view.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>{
    const tpl = templates.find(t=>t.id===b.dataset.start);
    if(tpl) newSessionFromTemplate(tpl);
  });

  // workout view handlers
  const saveWorkout = $("saveWorkout");
  if(saveWorkout) saveWorkout.onclick=()=>{
    saveJSON(STORAGE_KEY, sessions);
    toast("Workout saved ✅");
    setStatus("Saved");
  };

  const endWorkout = $("endWorkout");
  if(endWorkout) endWorkout.onclick=()=>{
    activeWorkout=null;
    activeTab="dashboard";
    toast("Workout ended");
    render();
  };

  view.querySelectorAll("[data-addset]").forEach(b=>b.onclick=()=>{
    const ex = activeWorkout.exercises[Number(b.dataset.addset)];
    ex.sets.push({kg:"", reps:"", done:false});
    render();
  });

  view.querySelectorAll("[data-exdel]").forEach(b=>b.onclick=()=>{
    activeWorkout.exercises.splice(Number(b.dataset.exdel),1);
    render();
  });

  view.querySelectorAll("[data-kg]").forEach(inp=>inp.oninput=()=>{
    const ex = activeWorkout.exercises[Number(inp.dataset.kg)];
    ex.sets[Number(inp.dataset.si)].kg = inp.value;
  });
  view.querySelectorAll("[data-reps]").forEach(inp=>inp.oninput=()=>{
    const ex = activeWorkout.exercises[Number(inp.dataset.reps)];
    ex.sets[Number(inp.dataset.si)].reps = inp.value;
  });

  view.querySelectorAll("[data-done]").forEach(btn=>btn.onclick=()=>{
    const ex = activeWorkout.exercises[Number(btn.dataset.done)];
    const set = ex.sets[Number(btn.dataset.si)];
    set.done = !set.done;
    saveJSON(STORAGE_KEY, sessions);
    toast(set.done ? "Set done ✅" : "Undone");
    // start rest timer when marking done
    if(set.done && ex.rest) startTimer(ex.rest);
    render();
  });

  view.querySelectorAll("[data-del]").forEach(btn=>btn.onclick=()=>{
    const ex = activeWorkout.exercises[Number(btn.dataset.del)];
    ex.sets.splice(Number(btn.dataset.si),1);
    render();
  });

  // ✅ FIXED: correct argument order for video
  view.querySelectorAll("[data-video]").forEach(b=>b.onclick=()=>{
    const ex=activeWorkout.exercises[Number(b.dataset.video)];
    openVideo(ex.name, ex.videoSearch);
  });

  view.querySelectorAll("[data-exnote]").forEach(inp=>inp.oninput=()=>{
    const ex = activeWorkout.exercises[Number(inp.dataset.exnote)];
    ex.note = inp.value;
  });

  // templates page
  const newTpl = $("newTpl");
  if(newTpl) newTpl.onclick=()=>{
    const name = prompt("Template name?", "New Template");
    if(!name) return;
    templates.push({id:"t_"+Math.random().toString(16).slice(2), name, subtitle:"", exercises:[]});
    saveJSON(TEMPLATES_KEY, templates);
    toast("Template added ✅");
    render();
  };

  view.querySelectorAll("[data-deltpl]").forEach(b=>b.onclick=()=>{
    if(!confirm("Delete template?")) return;
    templates = templates.filter(t=>t.id!==b.dataset.deltpl);
    saveJSON(TEMPLATES_KEY, templates);
    toast("Deleted");
    render();
  });

  // tracker
  const saveWeightBtn = $("saveWeight");
  if(saveWeightBtn) saveWeightBtn.onclick=()=>{
    const v = Number($("trkWeight").value);
    if(!Number.isFinite(v) || v<=0) return alert("Enter a valid weight");
    tracker.weights.push({date: todayStr(), kg: Math.round(v*10)/10});
    saveJSON(TRACKER_KEY, tracker);
    toast("Weight saved ✅");
    render();
  };

  const saveWaistBtn = $("saveWaist");
  if(saveWaistBtn) saveWaistBtn.onclick=()=>{
    const v = Number($("trkWaist").value);
    if(!Number.isFinite(v) || v<=0) return alert("Enter a valid waist");
    tracker.waist.push({date: todayStr(), cm: Math.round(v*10)/10});
    saveJSON(TRACKER_KEY, tracker);
    toast("Waist saved ✅");
    render();
  };

  const exportTrackerBtn = $("exportTracker");
  if(exportTrackerBtn) exportTrackerBtn.onclick=()=>{
    const rows = [["date","weight_kg","waist_cm"]];
    const map = new Map();
    tracker.weights.forEach(w=>{ map.set(w.date, {date:w.date, weight:w.kg, waist:""}); });
    tracker.waist.forEach(w=>{
      const r = map.get(w.date) || {date:w.date, weight:"", waist:""};
      r.waist = w.cm;
      map.set(w.date, r);
    });
    [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).forEach(r=>{
      rows.push([r.date, r.weight, r.waist]);
    });
    downloadCSV("steadylog-tracker.csv", rows);
  };

  // macros
  const saveMacrosBtn = $("saveMacros");
  if(saveMacrosBtn) saveMacrosBtn.onclick=()=>{
    const d = todayStr();
    let day = macros.days.find(x=>x.date===d);
    if(!day){
      day = {date:d, calories:0, protein:0, carbs:0, fat:0};
      macros.days.push(day);
    }
    day.calories = Number($("mCal").value)||0;
    day.protein = Number($("mP").value)||0;
    day.carbs = Number($("mC").value)||0;
    day.fat = Number($("mF").value)||0;
    saveJSON(MACROS_KEY, macros);
    toast("Macros saved ✅");
    render();
  };

  const exportMacrosBtn = $("exportMacros");
  if(exportMacrosBtn) exportMacrosBtn.onclick=()=>{
    const rows = [["date","calories","protein_g","carbs_g","fat_g"]];
    macros.days.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(d=>{
      rows.push([d.date, d.calories||0, d.protein||0, d.carbs||0, d.fat||0]);
    });
    downloadCSV("steadylog-macros.csv", rows);
  };
}

function downloadCSV(filename, rows){
  const esc = (v)=> `"${String(v??"").replaceAll('"','""')}"`;
  const csv = rows.map(r=>r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

render();
setStatus("Ready");
