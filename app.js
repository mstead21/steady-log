/* Steady Log (V1.4) - iPhone PWA - weights-only (Dark Mode)
   Features:
   - Rest timer overlay + vibrate + auto-start on ✓
   - Per-exercise rest seconds (e.g. arms 60s, compounds 120s)
   - Mini per-exercise rest badge countdown
   - Suggested KG = last working set from last session for that exercise
   - Notes: per session + per exercise
   - PRs + recent progress
   - Editable templates (name/sets/reps/rest/video + reorder)
   - Tracker: daily weight + weekly waist
   - Tracker: daily calories/macros (optional) + Refeed/Drink marker
   - Streaks + trends
   - Export workout CSV + tracker CSV
*/

const STORAGE_KEY   = "steadylog.sessions.v2";
const SETTINGS_KEY  = "steadylog.settings.v2";
const TEMPLATES_KEY = "steadylog.templates.v2";
const TRACKER_KEY   = "steadylog.tracker.v3";

/* ---------- DEFAULT TEMPLATES ---------- */
const DEFAULT_TEMPLATES = [
  {
    id: "upperA",
    name: "Upper A",
    subtitle: "Chest & Arms",
    exercises: [
      { id:"smith_incline", name:"Smith Incline Bench Press", sets:3, reps:"6–8",  rest:120, video:"" },
      { id:"row_chest_supported", name:"Chest Supported Row Machine (Plate)", sets:3, reps:"8–12", rest:90,  video:"" },
      { id:"chest_press_plate_flat", name:"Chest Press Plate Loaded (Flat)", sets:3, reps:"8–10", rest:90,  video:"" },
      { id:"shoulder_press_plate", name:"Shoulder Press Plate Machine", sets:3, reps:"8–10", rest:90,  video:"" },
      { id:"tri_pushdown", name:"Cable Tricep Pushdown", sets:3, reps:"10–15", rest:60,  video:"" },
      { id:"preacher_curl", name:"Preacher Curl Machine", sets:3, reps:"10–15", rest:60,  video:"" },
    ]
  },
  {
    id: "lowerA",
    name: "Lower A",
    subtitle: "Quads & Burn",
    exercises: [
      { id:"smith_squat", name:"Smith Squat", sets:4, reps:"6–8", rest:120, video:"" },
      { id:"leg_press", name:"45° Leg Press", sets:3, reps:"10–15", rest:90,  video:"" },
      { id:"walking_lunges", name:"Walking Lunges", sets:2, reps:"20 steps", rest:90, video:"" },
      { id:"leg_ext", name:"Leg Extension", sets:3, reps:"12–15", rest:60,  video:"" },
      { id:"standing_calves", name:"Standing Calf Raise", sets:3, reps:"15–20", rest:60, video:"" },
    ]
  },
  {
    id: "upperB",
    name: "Upper B",
    subtitle: "Back & Shoulders",
    exercises: [
      { id:"assist_pullup", name:"Assisted Pull-Up Machine", sets:3, reps:"6–10", rest:120, video:"" },
      { id:"seated_row", name:"Seated Row", sets:3, reps:"8–12", rest:90, video:"" },
      { id:"pec_deck", name:"Pec Deck / Fly", sets:3, reps:"12–15", rest:75, video:"" },
      { id:"rear_delt", name:"Rear Delt Machine", sets:3, reps:"12–15", rest:60, video:"" },
      { id:"face_pull", name:"Face Pull (Cable)", sets:3, reps:"12–15", rest:60, video:"" },
      { id:"hammer_curl", name:"Hammer Curl", sets:3, reps:"10–12", rest:60, video:"" },
    ]
  },
  {
    id: "lowerB",
    name: "Lower B",
    subtitle: "Hamstrings & Glutes",
    exercises: [
      { id:"smith_rdl", name:"Smith Romanian Deadlift", sets:3, reps:"6–8", rest:120, video:"" },
      { id:"hip_thrust", name:"Hip Thrust Machine", sets:3, reps:"8–10", rest:90, video:"" },
      { id:"lying_curl", name:"Lying Leg Curl", sets:3, reps:"10–12", rest:90, video:"" },
      { id:"smith_split", name:"Smith Split Squat", sets:2, reps:"10 / leg", rest:90, video:"" },
      { id:"seated_calves", name:"Seated Calf Raise", sets:3, reps:"15–20", rest:60, video:"" },
    ]
  }
];

/* ---------- Helpers ---------- */
function nowISO(){ return new Date().toISOString(); }
function todayYMD(){ return new Date().toISOString().slice(0,10); }
function ymdFromISO(iso){ return new Date(iso).toISOString().slice(0,10); }

function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday:"short", year:"numeric", month:"short", day:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

function toast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1600);
}

function vibrate(pattern=[120,60,120]){
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){
    return fallback;
  }
}
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function avg(arr){ if(!arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length; }

/* ---------- Storage ---------- */
function loadSessions(){ return loadJSON(STORAGE_KEY, []); }
function saveSessions(sessions){ saveJSON(STORAGE_KEY, sessions); }

function loadSettings(){ return loadJSON(SETTINGS_KEY, { restSeconds: 90 }); }
function saveSettings(s){ saveJSON(SETTINGS_KEY, s); }

function loadTemplates(){
  const saved = loadJSON(TEMPLATES_KEY, null);
  if(saved && Array.isArray(saved) && saved.length) return saved;
  return DEFAULT_TEMPLATES;
}
function saveTemplates(tpls){ saveJSON(TEMPLATES_KEY, tpls); }

/* Tracker model (v3):
{
  weights:[{date, kg}],
  waists:[{date, cm}],
  macros:[{date, calories, p, c, f, refeed, note}],
  photos:[]
}
*/
function loadTracker(){
  const t = loadJSON(TRACKER_KEY, null);
  if(!t) return { weights: [], waists: [], macros: [], photos: [] };
  if(!Array.isArray(t.macros)) t.macros = [];
  if(!Array.isArray(t.weights)) t.weights = [];
  if(!Array.isArray(t.waists)) t.waists = [];
  if(!Array.isArray(t.photos)) t.photos = [];
  return t;
}
function saveTracker(t){ saveJSON(TRACKER_KEY, t); }

/* ---------- CSV helpers ---------- */
function trackerToCSV(tracker){
  const rows = [];
  rows.push("type,date,value,p,c,f,refeed,note");

  (tracker.weights||[]).forEach(w=>{
    rows.push(`weight,${w.date},${w.kg},,,,,`);
  });

  (tracker.waists||[]).forEach(w=>{
    rows.push(`waist,${w.date},${w.cm},,,,,`);
  });

  (tracker.macros||[]).forEach(m=>{
    rows.push(`macros,${m.date},${m.calories||""},${m.p||""},${m.c||""},${m.f||""},${m.refeed?1:0},"${String(m.note||"").replaceAll('"','""')}"`);
  });

  return rows.join("\n");
}

function downloadText(filename, text, mime="text/plain"){
  const blob = new Blob([text], {type:`${mime};charset=utf-8`});
  const url = URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* ---------- Stats ---------- */
function getLastSetsForExercise(exId){
  const sessions = loadSessions();
  for(let i=sessions.length-1;i>=0;i--){
    const ses = sessions[i];
    for(const ex of ses.exercises){
      if(ex.id === exId && ex.sets && ex.sets.length){
        return ex.sets;
      }
    }
  }
  return [];
}
function getSuggestedKg(exId){
  const lastSets = getLastSetsForExercise(exId);
  if(!lastSets.length) return "";
  const last = lastSets[lastSets.length - 1];
  return (Number(last.kg) || "");
}
function computeStats(){
  const sessions = loadSessions();
  const total = sessions.length;
  const last = total ? sessions[sessions.length-1].startedAt : null;
  const best = {};
  for(const ses of sessions){
    for(const ex of ses.exercises){
      for(const st of (ex.sets||[])){
        const kg = Number(st.kg)||0, reps = Number(st.reps)||0;
        if(!best[ex.id] || kg>best[ex.id].kg || (kg===best[ex.id].kg && reps>best[ex.id].reps)){
          best[ex.id] = {kg,reps,at:ses.startedAt};
        }
      }
    }
  }
  return {total,last,best};
}

/* ---------- Tracker trends + streaks ---------- */
function normalizeWeights(tracker){
  const map = new Map();
  (tracker.weights||[]).forEach(w=>{
    const d = String(w.date||"").slice(0,10);
    const kg = Number(w.kg);
    if(!d || !kg) return;
    map.set(d, kg);
  });
  return Array.from(map.entries())
    .map(([date,kg])=>({date,kg}))
    .sort((a,b)=> a.date.localeCompare(b.date));
}

function normalizeSessions(sessions){
  const set = new Set();
  sessions.forEach(s=>{
    if(s && s.startedAt) set.add(ymdFromISO(s.startedAt));
  });
  return Array.from(set).sort();
}

function computeStreak(datesSorted, today){
  if(!datesSorted.length) return 0;
  const dateSet = new Set(datesSorted);
  let cursor = dateSet.has(today) ? today : datesSorted[datesSorted.length-1];
  let streak = 0;
  while(dateSet.has(cursor)){
    streak++;
    const prev = new Date(cursor+"T00:00:00Z");
    prev.setUTCDate(prev.getUTCDate()-1);
    cursor = prev.toISOString().slice(0,10);
  }
  return streak;
}

function trackerTrends(){
  const t = loadTracker();
  const weights = normalizeWeights(t);
  if(!weights.length){
    return { latest:null, last7Avg:0, prev7Avg:0, delta7:0, deltaAvg:0, weighStreak:0 };
  }
  const today = todayYMD();
  const weighStreak = computeStreak(weights.map(w=>w.date), today);
  const latest = weights[weights.length-1];

  const last7 = weights.slice(-7).map(x=>x.kg);
  const prev7 = weights.slice(-14,-7).map(x=>x.kg);
  const last7Avg = last7.length ? avg(last7) : 0;
  const prev7Avg = prev7.length ? avg(prev7) : 0;
  const deltaAvg = (last7Avg && prev7Avg) ? (last7Avg - prev7Avg) : 0;

  const w7 = weights.length >= 8 ? weights[weights.length-8].kg : null;
  const delta7 = (w7!=null) ? (latest.kg - w7) : 0;

  return { latest, last7Avg, prev7Avg, delta7, deltaAvg, weighStreak };
}

function trainingStreak(){
  const days = normalizeSessions(loadSessions());
  return computeStreak(days, todayYMD());
}

function latestMacros(){
  const t = loadTracker();
  const map = new Map((t.macros||[]).map(m=>[m.date, m]));
  const d = todayYMD();
  return map.get(d) || null;
}

/* ---------- Rest Timer overlay + mini badge ---------- */
let timerInterval=null, timerEndsAt=null;
let activeRest = null; // { exIndex:number, endsAt:number }

function stopTimer(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval=null; timerEndsAt=null; activeRest=null;
  const o=document.getElementById("timerOverlay");
  if(o) o.remove();
  // clear badge text if visible
  document.querySelectorAll("[data-restbadge]").forEach(el=> el.textContent = "");
}

function setRestBadge(exIndex, text){
  const el = document.querySelector(`[data-restbadge="${exIndex}"]`);
  if(el) el.textContent = text;
}

function startTimer(seconds, exIndex=null){
  stopTimer();
  timerEndsAt = Date.now() + seconds*1000;
  activeRest = (exIndex===null || exIndex===undefined) ? null : { exIndex, endsAt: timerEndsAt };

  const overlay = document.createElement("div");
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
    <div style="width:min(420px,92vw); background:rgba(20,20,27,.92); border:1px solid rgba(255,255,255,.14); border-radius:20px; padding:18px; box-shadow: 0 20px 60px rgba(0,0,0,.45);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div>
          <div style="font-weight:900; font-size:14px;">Rest Timer</div>
          <div style="color:rgba(233,233,242,.75); font-size:12px; margin-top:4px;">Vibrates when finished</div>
        </div>
        <button id="timerStop" class="btn danger" style="width:auto; padding:10px 12px;">Stop</button>
      </div>
      <div style="height:12px"></div>
      <div id="timerClock" style="font-size:54px; font-weight:900; text-align:center;">--</div>
      <div style="height:10px"></div>
      <div style="display:flex; gap:10px;">
        <button class="btn" style="flex:1" data-tquick="60">+60s</button>
        <button class="btn" style="flex:1" data-tquick="90">+90s</button>
        <button class="btn" style="flex:1" data-tquick="120">+120s</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector("#timerStop").onclick = ()=>{ stopTimer(); toast("Timer stopped"); };
  overlay.querySelectorAll("[data-tquick]").forEach(b=>{
    b.onclick = ()=>{
      timerEndsAt += Number(b.dataset.tquick)*1000;
      if(activeRest) activeRest.endsAt = timerEndsAt;
      toast(`+${b.dataset.tquick}s`);
    };
  });

  const tick=()=>{
    const remain = Math.max(0, timerEndsAt - Date.now());
    const sec = Math.ceil(remain/1000);
    const m = String(Math.floor(sec/60));
    const s = String(sec%60).padStart(2,"0");

    const clock = overlay.querySelector("#timerClock");
    if(clock) clock.textContent = `${m}:${s}`;

    // mini badge
    if(activeRest){
      setRestBadge(activeRest.exIndex, `⏱ ${m}:${s}`);
    }

    if(remain<=0){
      stopTimer();
      vibrate([180,80,180,80,220]);
      toast("Rest done ✅");
    }
  };

  tick();
  timerInterval=setInterval(tick, 250);
}

/* ---------- View helpers ---------- */
const view = document.getElementById("view");
let activeWorkout=null;

let SETTINGS = loadSettings();
let TEMPLATES = loadTemplates();

function setPill(text){
  const el = document.getElementById("pillStatus");
  if(el) el.textContent = text;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function resetFooterNav(){
  const wrap = document.querySelector(".footerbar .wrap");
  if(!wrap) return;

  wrap.innerHTML = `
    <button class="btn ghost" id="navHome">Home</button>
    <button class="btn ghost" id="navHistory">History</button>
    <button class="btn ghost" id="navExercises">Exercises</button>
    <button class="btn ghost" id="navTracker">Tracker</button>
    <button class="btn ghost" id="navExport">Export</button>
  `;

  document.getElementById("navHome").onclick = ()=>{
    stopTimer();
    activeWorkout=null;
    sessionStorage.removeItem("steadylog.draft");
    homeView(); resetFooterNav();
  };
  document.getElementById("navHistory").onclick = ()=>{
    stopTimer();
    activeWorkout=null;
    sessionStorage.removeItem("steadylog.draft");
    historyView(); resetFooterNav();
  };
  document.getElementById("navExercises").onclick = ()=>{
    stopTimer();
    activeWorkout=null;
    sessionStorage.removeItem("steadylog.draft");
    exercisesView(); resetFooterNav();
  };
  document.getElementById("navTracker").onclick = ()=>{
    stopTimer();
    activeWorkout=null;
    sessionStorage.removeItem("steadylog.draft");
    trackerView(); resetFooterNav();
  };
  document.getElementById("navExport").onclick = ()=>{
    stopTimer();
    activeWorkout=null;
    sessionStorage.removeItem("steadylog.draft");
    exportView(); resetFooterNav();
  };
}

function setFooterActions(actions){
  const wrap = document.querySelector(".footerbar .wrap");
  if(!wrap) return;
  wrap.innerHTML = actions.map((a,i)=>`<button class="btn ${a.cls||"ghost"}" data-foot="${i}">${a.label}</button>`).join("");
  wrap.querySelectorAll("[data-foot]").forEach(btn=>{
    btn.onclick = ()=> actions[Number(btn.dataset.foot)].onClick();
  });
}

/* ---------- HOME ---------- */
function homeView(){
  SETTINGS = loadSettings();
  TEMPLATES = loadTemplates();
  setPill("Ready");

  const stats = computeStats();
  const lastText = stats.last ? fmtDate(stats.last) : "—";

  const tt = trackerTrends();
  const trainStreak = trainingStreak();
  const today = todayYMD();
  const t = loadTracker();
  const macrosMap = new Map((t.macros||[]).map(m=>[m.date,m]));
  const mToday = macrosMap.get(today) || null;

  const latestWeight = tt.latest ? `${tt.latest.kg.toFixed(1)} kg` : "—";
  const last7Avg = tt.last7Avg ? `${tt.last7Avg.toFixed(1)} kg` : "—";

  let delta7Text = "—";
  if(tt.latest && (normalizeWeights(loadTracker()).length >= 8)){
    const sign = tt.delta7 > 0 ? "+" : "";
    delta7Text = `${sign}${tt.delta7.toFixed(1)} kg`;
  }

  let deltaAvgText = "—";
  if(tt.last7Avg && tt.prev7Avg){
    const d = tt.deltaAvg;
    const sign = d > 0 ? "+" : "";
    deltaAvgText = `${sign}${d.toFixed(1)} kg`;
  }

  const calText = mToday && mToday.calories ? `${mToday.calories} kcal` : "—";
  const macroText = mToday && (mToday.p||mToday.c||mToday.f)
    ? `P ${mToday.p||0} • C ${mToday.c||0} • F ${mToday.f||0}`
    : "—";
  const refeedText = mToday && mToday.refeed ? "YES 🍻" : "—";

  view.innerHTML = `
    <div class="card">
      <h2>Start Workout</h2>
      <div class="hr"></div>

      <div class="grid">
        ${TEMPLATES.map(t=>`
          <button class="btn primary" data-action="start" data-id="${t.id}">
            ${t.name}<span class="tag">${t.subtitle||""}</span>
          </button>
        `).join("")}
      </div>

      <div class="hr"></div>

      <div class="list">
        <div class="exercise"><div class="exercise-name">${stats.total}</div><div class="exercise-meta">sessions logged</div></div>
        <div class="exercise"><div class="exercise-name">${lastText}</div><div class="exercise-meta">last session</div></div>
        <div class="exercise"><div class="exercise-name">${SETTINGS.restSeconds}s</div><div class="exercise-meta">default rest timer</div></div>
      </div>
    </div>

    <div class="section-title">Cut Snapshot</div>
    <div class="card">
      <div class="list">
        <div class="exercise"><div class="exercise-name">${latestWeight}</div><div class="exercise-meta">latest weigh-in</div></div>
        <div class="exercise"><div class="exercise-name">${last7Avg}</div><div class="exercise-meta">7-day average</div></div>
        <div class="exercise"><div class="exercise-name">${delta7Text}</div><div class="exercise-meta">change vs ~7 entries ago</div></div>
        <div class="exercise"><div class="exercise-name">${deltaAvgText}</div><div class="exercise-meta">7-day avg vs previous 7</div></div>
        <div class="exercise"><div class="exercise-name">${trainStreak} 🔥</div><div class="exercise-meta">training streak (days)</div></div>
        <div class="exercise"><div class="exercise-name">${tt.weighStreak} ✅</div><div class="exercise-meta">weigh-in streak (days)</div></div>
      </div>

      <div class="hr"></div>

      <div class="section-title" style="margin-top:0">Today (optional)</div>
      <div class="list">
        <div class="exercise"><div class="exercise-name">${calText}</div><div class="exercise-meta">calories</div></div>
        <div class="exercise"><div class="exercise-name">${macroText}</div><div class="exercise-meta">macros</div></div>
        <div class="exercise"><div class="exercise-name">${refeedText}</div><div class="exercise-meta">refeed/drink day</div></div>
      </div>

      <div class="hr"></div>
      <button class="btn" id="goTracker">Open Tracker</button>
    </div>

    <div class="section-title">Tools</div>
    <div class="card">
      <button class="btn" id="btnTemplateEditor">Edit Templates</button>
      <div style="height:10px"></div>
      <button class="btn" id="btnSettings">Default Timer Settings</button>
    </div>
  `;

  view.querySelectorAll('[data-action="start"]').forEach(btn=>{
    btn.onclick = ()=> startWorkout(btn.dataset.id);
  });

  document.getElementById("btnTemplateEditor").onclick = templatesView;
  document.getElementById("btnSettings").onclick = settingsView;
  document.getElementById("goTracker").onclick = trackerView;
}

/* ---------- TRACKER ---------- */
function trackerView(){
  setPill("Tracker");

  const t = loadTracker();
  const d = todayYMD();

  const weights = normalizeWeights(t);
  const latest = weights.length ? weights[weights.length-1] : null;

  const last7 = weights.slice(-7).map(x=>x.kg);
  const last7Avg = last7.length ? avg(last7) : 0;

  const prev7 = weights.slice(-14,-7).map(x=>x.kg);
  const prev7Avg = prev7.length ? avg(prev7) : 0;
  let deltaAvg = (last7Avg && prev7Avg) ? (last7Avg - prev7Avg) : 0;

  let delta7 = 0;
  const hasDelta7 = (weights.length >= 8);
  if(hasDelta7) delta7 = weights[weights.length-1].kg - weights[weights.length-8].kg;

  const weighStreak = computeStreak(weights.map(w=>w.date), d);
  const trainStreak = trainingStreak();

  const lastWaist = (t.waists||[]).slice().sort((a,b)=> (a.date>b.date?1:-1)).slice(-1)[0];

  const macrosMap = new Map((t.macros||[]).map(m=>[m.date,m]));
  const m = macrosMap.get(d) || {date:d, calories:"", p:"", c:"", f:"", refeed:false, note:""};

  view.innerHTML = `
    <h2>Cut Tracker</h2>

    <div class="card">
      <div class="section-title" style="margin-top:0">Today</div>
      <div class="exercise-meta">Date: <b>${d}</b></div>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0">Daily Weight</div>
      <input class="input" id="wtKg" inputmode="decimal" placeholder="Weight (kg)">
      <button class="btn primary" id="saveWeight">Save Today's Weight</button>

      <div class="hr"></div>

      <div class="list">
        <div class="exercise"><div class="exercise-name">${latest ? latest.kg.toFixed(1)+" kg" : "—"}</div><div class="exercise-meta">latest saved weight</div></div>
        <div class="exercise"><div class="exercise-name">${last7Avg ? last7Avg.toFixed(1)+" kg" : "—"}</div><div class="exercise-meta">7-day average</div></div>
        <div class="exercise"><div class="exercise-name">${hasDelta7 ? ((delta7>0?"+":"")+delta7.toFixed(1)+" kg") : "—"}</div><div class="exercise-meta">change vs ~7 entries ago</div></div>
        <div class="exercise"><div class="exercise-name">${(last7Avg && prev7Avg) ? ((deltaAvg>0?"+":"")+deltaAvg.toFixed(1)+" kg") : "—"}</div><div class="exercise-meta">7-day avg vs previous 7</div></div>
        <div class="exercise"><div class="exercise-name">${weighStreak} ✅</div><div class="exercise-meta">weigh-in streak (days)</div></div>
        <div class="exercise"><div class="exercise-name">${trainStreak} 🔥</div><div class="exercise-meta">training streak (days)</div></div>
      </div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0">Weekly Waist</div>
      <input class="input" id="waistCm" inputmode="decimal" placeholder="Waist (cm)">
      <button class="btn primary" id="saveWaist">Save Waist</button>
      <div class="sub">Last saved: <b>${lastWaist ? lastWaist.cm + " cm ("+lastWaist.date+")" : "—"}</b></div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0">Calories & Macros (optional)</div>
      <input class="input" id="calIn" inputmode="numeric" placeholder="Calories (kcal)" value="${m.calories ?? ""}">
      <div style="height:10px"></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <input class="input" id="pIn" inputmode="numeric" style="flex:1; min-width:120px" placeholder="Protein (g)" value="${m.p ?? ""}">
        <input class="input" id="cIn" inputmode="numeric" style="flex:1; min-width:120px" placeholder="Carbs (g)" value="${m.c ?? ""}">
        <input class="input" id="fIn" inputmode="numeric" style="flex:1; min-width:120px" placeholder="Fat (g)" value="${m.f ?? ""}">
      </div>
      <div style="height:10px"></div>

      <label class="exercise-meta" style="display:flex; gap:10px; align-items:center;">
        <input type="checkbox" id="refeedIn" ${m.refeed ? "checked" : ""} />
        Refeed / Drink day 🍻
      </label>

      <div style="height:10px"></div>
      <input class="input" id="noteIn" placeholder="Note (optional) e.g. curry + beers" value="${escapeAttr(m.note||"")}">

      <div style="height:10px"></div>
      <button class="btn primary" id="saveMacros">Save Macros</button>
    </div>
  `;

  document.getElementById("saveWeight").onclick = ()=>{
    const kg = Number(document.getElementById("wtKg").value);
    if(!kg){ alert("Enter weight"); return; }
    const tt = loadTracker();
    const map = new Map((tt.weights||[]).map(w=>[w.date, w]));
    map.set(d, {date:d, kg:kg});
    tt.weights = Array.from(map.values()).sort((a,b)=> a.date.localeCompare(b.date));
    saveTracker(tt);
    toast("Weight saved ✅");
    trackerView();
  };

  document.getElementById("saveWaist").onclick = ()=>{
    const cm = Number(document.getElementById("waistCm").value);
    if(!cm){ alert("Enter waist"); return; }
    const tt = loadTracker();
    tt.waists = tt.waists || [];
    tt.waists.push({date:d, cm:cm});
    saveTracker(tt);
    toast("Waist saved ✅");
    trackerView();
  };

  document.getElementById("saveMacros").onclick = ()=>{
    const calories = document.getElementById("calIn").value.trim();
    const p = document.getElementById("pIn").value.trim();
    const c = document.getElementById("cIn").value.trim();
    const f = document.getElementById("fIn").value.trim();
    const refeed = document.getElementById("refeedIn").checked;
    const note = document.getElementById("noteIn").value;

    const tt = loadTracker();
    const map = new Map((tt.macros||[]).map(x=>[x.date, x]));
    map.set(d, {
      date: d,
      calories: calories ? Number(calories) : "",
      p: p ? Number(p) : "",
      c: c ? Number(c) : "",
      f: f ? Number(f) : "",
      refeed,
      note
    });
    tt.macros = Array.from(map.values()).sort((a,b)=> a.date.localeCompare(b.date));
    saveTracker(tt);
    toast("Macros saved ✅");
    trackerView();
  };
}

/* ---------- WORKOUT FLOW ---------- */
function startWorkout(templateId){
  TEMPLATES = loadTemplates();
  const tpl = TEMPLATES.find(t=>t.id===templateId);
  if(!tpl) return;

  activeWorkout = {
    id: crypto.randomUUID(),
    templateId: tpl.id,
    name: tpl.name,
    subtitle: tpl.subtitle || "",
    startedAt: nowISO(),
    notes: "",
    exercises: (tpl.exercises||[]).map(ex => ({
      id: ex.id || crypto.randomUUID(),
      name: ex.name,
      targetSets: Number(ex.sets)||0,
      targetReps: ex.reps || "",
      rest: Number(ex.rest)||0,
      video: ex.video || "",
      note: "",
      sets: []
    }))
  };

  saveDraft();
  workoutView();
  toast(`${tpl.name} started`);
}

function saveDraft(){ sessionStorage.setItem("steadylog.draft", JSON.stringify(activeWorkout)); }

function addSet(exIndex){
  const ex = activeWorkout.exercises[exIndex];
  ex.sets.push({ kg: getSuggestedKg(ex.id), reps: "", done:false });
  saveDraft();
  workoutView();
}

function updateSet(exIndex, setIndex, field, value){
  const s = activeWorkout.exercises[exIndex].sets[setIndex];
  s[field] = (value === "" ? "" : Number(value));
  saveDraft();
}

function updateSessionNotes(v){ activeWorkout.notes=v; saveDraft(); }
function updateExerciseNote(exIndex,v){ activeWorkout.exercises[exIndex].note=v; saveDraft(); }

function toggleDone(exIndex,setIndex){
  const s = activeWorkout.exercises[exIndex].sets[setIndex];
  s.done = !s.done;
  saveDraft();
  workoutView();

  if(s.done){
    const ex = activeWorkout.exercises[exIndex];
    const secs = Number(ex.rest) || Number(loadSettings().restSeconds) || 90;
    startTimer(secs, exIndex);
  }
}

function deleteSet(exIndex,setIndex){
  activeWorkout.exercises[exIndex].sets.splice(setIndex,1);
  saveDraft();
  workoutView();
}

function openVideo(url){
  if(!url){ toast("No video link set yet"); return; }
  window.open(url, "_blank", "noopener,noreferrer");
}

function workoutView(){
  SETTINGS=loadSettings();
  setPill("In session");

  view.innerHTML = `
    <div class="card">
      <h2>${activeWorkout.name}<span class="tag">${activeWorkout.subtitle||""}</span></h2>
      <div class="exercise-meta">Started: ${fmtDate(activeWorkout.startedAt)} • Default Rest: ${SETTINGS.restSeconds}s</div>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Session Notes</div>
      <textarea id="sessionNotes" class="input" style="min-height:64px; resize:vertical;" placeholder="Notes (optional)">${activeWorkout.notes||""}</textarea>

      <div class="hr"></div>

      <div class="list">
        ${activeWorkout.exercises.map((ex,idx)=>{
          const last = getLastSetsForExercise(ex.id);
          const lastStr = last.length ? last.slice(0,3).map(s=>`${s.kg}kg×${s.reps}`).join(", ") : "—";
          const restStr = ex.rest ? `${ex.rest}s` : `${SETTINGS.restSeconds}s`;
          return `
            <div class="exercise">
              <div class="exercise-head">
                <div>
                  <div class="exercise-name">${ex.name}</div>
                  <div class="exercise-meta">🎯 ${ex.targetSets} sets • ${ex.targetReps} • Rest: ${restStr} • Last: ${lastStr}</div>
                </div>

                <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                  <div class="tag" data-restbadge="${idx}" style="min-width:86px; text-align:center;"></div>
                  <div style="display:flex; gap:8px;">
                    <button class="btn" style="width:auto;padding:10px 12px" data-video="${idx}">▶ Video</button>
                    <button class="btn" style="width:auto;padding:10px 12px" data-add="${idx}">+ Set</button>
                  </div>
                </div>
              </div>

              <div style="display:flex; gap:8px; align-items:center; margin-top:8px">
                <span class="tag">Note</span>
                <input class="input" style="padding:10px" value="${escapeAttr(ex.note||"")}" placeholder="e.g. slow tempo / drop set" data-exnote="${idx}">
              </div>

              ${(ex.sets||[]).map((s,sidx)=>`
                <div class="set">
                  <input class="input" inputmode="decimal" enterkeyhint="next" placeholder="KG" value="${s.kg ?? ""}" data-role="kg" data-kg="${idx}:${sidx}">
                  <input class="input" inputmode="numeric" pattern="[0-9]*" enterkeyhint="done" placeholder="Reps" value="${s.reps ?? ""}" data-role="reps" data-reps="${idx}:${sidx}">
                  <button class="smallbtn ok ${s.done?"ok":""}" data-role="done" data-done="${idx}:${sidx}">✓</button>
                  <button class="smallbtn del" data-role="del" data-del="${idx}:${sidx}">🗑</button>
                </div>
              `).join("")}
            </div>`;
        }).join("")}
      </div>
    </div>
  `;

  // if a rest is currently active, refresh badge instantly
  if(activeRest){
    const remain = Math.max(0, activeRest.endsAt - Date.now());
    const sec = Math.ceil(remain/1000);
    const m = String(Math.floor(sec/60));
    const s = String(sec%60).padStart(2,"0");
    setRestBadge(activeRest.exIndex, remain>0 ? `⏱ ${m}:${s}` : "");
  }

  document.getElementById("sessionNotes").oninput = (e)=> updateSessionNotes(e.target.value);
  view.querySelectorAll("[data-video]").forEach(b=> b.onclick = ()=> openVideo(activeWorkout.exercises[Number(b.dataset.video)].video || ""));
  view.querySelectorAll("[data-add]").forEach(b=> b.onclick = ()=> addSet(Number(b.dataset.add)));
  view.querySelectorAll("[data-exnote]").forEach(inp=> inp.oninput = (e)=> updateExerciseNote(Number(inp.dataset.exnote), e.target.value));
  view.querySelectorAll("[data-kg]").forEach(inp=> inp.oninput = (e)=>{ const [i,j]=inp.dataset.kg.split(":").map(Number); updateSet(i,j,"kg", e.target.value); });
  view.querySelectorAll("[data-reps]").forEach(inp=> inp.oninput = (e)=>{ const [i,j]=inp.dataset.reps.split(":").map(Number); updateSet(i,j,"reps", e.target.value); });
  view.querySelectorAll("[data-done]").forEach(btn=> btn.onclick = ()=>{ const [i,j]=btn.dataset.done.split(":").map(Number); toggleDone(i,j); });
  view.querySelectorAll("[data-del]").forEach(btn=> btn.onclick = ()=>{ const [i,j]=btn.dataset.del.split(":").map(Number); deleteSet(i,j); });

  setFooterActions([
    {label:"Finish & Save", cls:"primary", onClick: finishWorkout},
    {label:"Rest", cls:"ghost", onClick: ()=> startTimer(Number(SETTINGS.restSeconds)||90, null)},
    {label:"Cancel", cls:"danger", onClick: cancelWorkout},
  ]);
}

function finishWorkout(){
  stopTimer();
  for(const ex of activeWorkout.exercises){
    ex.sets = (ex.sets||[]).filter(s => (Number(s.kg)||0)>0 && (Number(s.reps)||0)>0);
  }
  const sessions = loadSessions();
  sessions.push(activeWorkout);
  saveSessions(sessions);
  sessionStorage.removeItem("steadylog.draft");
  activeWorkout=null;
  toast("Saved ✅");
  resetFooterNav();
  homeView();
}

function cancelWorkout(){
  stopTimer();
  if(confirm("Cancel this workout? (Nothing will be saved)")){
    activeWorkout=null;
    sessionStorage.removeItem("steadylog.draft");
    toast("Cancelled");
    resetFooterNav();
    homeView();
  }
}

/* ---------- HISTORY / EXERCISES / EXPORT / SETTINGS / TEMPLATES ---------- */
/* (kept same as before, but with macros export + rest + video editing) */

function historyView(){
  setPill("History");
  const sessions = loadSessions();
  view.innerHTML = `
    <div class="card">
      <h2>History</h2>
      <div class="hr"></div>
      <div class="list">
        ${sessions.length ? sessions.slice().reverse().map(s=>`
          <button class="btn" data-open="${s.id}">${s.name}<span class="tag">${new Date(s.startedAt).toLocaleDateString()}</span></button>
        `).join("") : `<div class="exercise"><div class="exercise-meta">No sessions yet.</div></div>`}
      </div>
    </div>
  `;
  view.querySelectorAll("[data-open]").forEach(b=> b.onclick = ()=> sessionDetailView(b.dataset.open));
}

function sessionDetailView(id){
  const sessions=loadSessions();
  const s=sessions.find(x=>x.id===id);
  if(!s){ historyView(); return; }
  setPill("Session");
  view.innerHTML = `
    <div class="card">
      <h2>${s.name}<span class="tag">${s.subtitle||""}</span></h2>
      <div class="exercise-meta">${fmtDate(s.startedAt)}</div>
      ${s.notes?`<div class="hr"></div><div class="exercise-meta"><b>Notes:</b> ${escapeHtml(s.notes)}</div>`:""}
      <div class="hr"></div>
      <div class="list">
        ${s.exercises.map(ex=>`
          <div class="exercise">
            <div class="exercise-name">${ex.name}</div>
            <div class="exercise-meta">🎯 ${ex.targetSets} • ${ex.targetReps}${ex.rest ? ` • Rest: ${ex.rest}s` : ""}</div>
            ${ex.note?`<div class="exercise-meta"><b>Note:</b> ${escapeHtml(ex.note)}</div>`:""}
            <div class="hr"></div>
            <div class="exercise-meta">${(ex.sets||[]).map(st=>`${st.kg}kg×${st.reps}`).join(" • ") || "—"}</div>
          </div>`).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn danger" id="delSes">Delete session</button>
      <div style="height:10px"></div>
      <button class="btn" id="backHist">Back</button>
    </div>`;
  document.getElementById("backHist").onclick = historyView;
  document.getElementById("delSes").onclick = ()=>{
    if(confirm("Delete this session permanently?")){
      saveSessions(sessions.filter(x=>x.id!==id));
      toast("Deleted");
      historyView();
    }
  };
}

function exercisesView(){
  setPill("Exercises");
  const stats = computeStats();
  const exMap = new Map();
  for(const t of loadTemplates()){
    for(const ex of (t.exercises||[])) exMap.set(ex.id, ex.name);
  }
  const exList = Array.from(exMap.entries()).map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name));

  view.innerHTML = `
    <div class="card">
      <h2>Exercises</h2>
      <div class="hr"></div>
      <div class="list">
        ${exList.map(ex=>{
          const best = stats.best[ex.id];
          const bestStr = best ? `${best.kg}kg×${best.reps}` : "—";
          return `<button class="btn" data-ex="${ex.id}">${ex.name}<span class="tag">Best: ${bestStr}</span></button>`;
        }).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn" id="editTplFromEx">Edit Templates</button>
    </div>`;
  view.querySelectorAll("[data-ex]").forEach(b=> b.onclick = ()=> exerciseDetailView(b.dataset.ex));
  document.getElementById("editTplFromEx").onclick = templatesView;
}

function exerciseDetailView(exId){
  const sessions=loadSessions();
  const entries=[];
  let name=exId;
  for(const ses of sessions){
    for(const ex of ses.exercises){
      if(ex.id===exId){
        name=ex.name;
        for(const st of (ex.sets||[])) entries.push({at:ses.startedAt, kg:st.kg, reps:st.reps});
      }
    }
  }
  entries.sort((a,b)=> new Date(b.at)-new Date(a.at));
  const best = entries.reduce((acc,cur)=>{
    if(!acc) return cur;
    if(cur.kg>acc.kg) return cur;
    if(cur.kg===acc.kg && cur.reps>acc.reps) return cur;
    return acc;
  }, null);
  const recent = entries.slice(0,12);
  setPill("Exercise");
  view.innerHTML = `
    <div class="card">
      <h2>${name}</h2>
      <div class="exercise-meta">Best: ${best?`${best.kg}kg×${best.reps}`:"—"}</div>
      <div class="hr"></div>
      <div class="section-title" style="margin-top:0;">Recent Progress</div>
      <div class="list">
        ${recent.length ? recent.map(e=>`
          <div class="exercise"><div class="exercise-name">${e.kg}kg × ${e.reps}</div><div class="exercise-meta">${new Date(e.at).toLocaleDateString()}</div></div>
        `).join("") : `<div class="exercise"><div class="exercise-meta">No logs yet for this exercise.</div></div>`}
      </div>
      <div class="hr"></div>
      <button class="btn" id="backEx">Back</button>
    </div>`;
  document.getElementById("backEx").onclick = exercisesView;
}

function exportView(){
  setPill("Export");
  view.innerHTML = `
    <div class="card">
      <h2>Export</h2>
      <div class="exercise-meta">Download a CSV backup.</div>
      <div class="hr"></div>
      <button class="btn primary" id="btnCsv">Download Workout CSV</button>
      <button class="btn" id="btnExportTracker">Export Tracker CSV</button>
      <div style="height:10px"></div>
      <button class="btn danger" id="btnWipe">Wipe all data</button>
    </div>`;

  document.getElementById("btnCsv").onclick = ()=> downloadCSV(loadSessions());

  document.getElementById("btnExportTracker").onclick = ()=>{
    const t = loadTracker();
    const csv = trackerToCSV(t);
    downloadText(`steady-tracker-${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
    toast("Tracker CSV downloaded ✅");
  };

  document.getElementById("btnWipe").onclick = ()=>{
    if(confirm("Wipe ALL Steady Log data from this phone?")){
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(TEMPLATES_KEY);
      localStorage.removeItem(TRACKER_KEY);
      sessionStorage.removeItem("steadylog.draft");
      toast("Wiped");
      exportView();
    }
  };
}

function downloadCSV(sessions){
  const rows=[["date","workout","exercise","set_index","kg","reps","session_notes","exercise_note","rest_seconds"]];
  for(const ses of sessions){
    for(const ex of ses.exercises){
      (ex.sets||[]).forEach((st,idx)=>{
        rows.push([ses.startedAt,ses.name,ex.name,String(idx+1),String(st.kg),String(st.reps),ses.notes||"",ex.note||"",String(ex.rest||"")]);
      });
    }
  }
  const csv = rows.map(r=> r.map(v=> `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  downloadText(`steady-log-${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
  toast("Workout CSV downloaded ✅");
}

function settingsView(){
  SETTINGS=loadSettings();
  setPill("Settings");
  view.innerHTML = `
    <div class="card">
      <h2>Default Timer Settings</h2>
      <div class="exercise-meta">Used when an exercise doesn't have its own rest time.</div>
      <div class="hr"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${[60,90,120].map(s=>`<button class="btn ${SETTINGS.restSeconds===s?"primary":"ghost"}" style="width:auto" data-s="${s}">${s}s</button>`).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn" id="backHome">Back</button>
    </div>`;
  view.querySelectorAll("[data-s]").forEach(b=> b.onclick = ()=>{
    SETTINGS.restSeconds = Number(b.dataset.s);
    saveSettings(SETTINGS);
    toast(`Default rest set to ${SETTINGS.restSeconds}s`);
    settingsView();
  });
  document.getElementById("backHome").onclick = homeView;
}

function templatesView(){
  TEMPLATES = loadTemplates();
  setPill("Templates");
  view.innerHTML = `
    <div class="card">
      <h2>Edit Templates</h2>
      <div class="hr"></div>
      <div class="list">
        ${TEMPLATES.map(t=>`<button class="btn" data-tpl="${t.id}">${t.name}<span class="tag">${t.subtitle||""}</span></button>`).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn danger" id="resetTpl">Reset to default</button>
      <div style="height:10px"></div>
      <button class="btn" id="backTplHome">Back</button>
    </div>`;
  view.querySelectorAll("[data-tpl]").forEach(b=> b.onclick = ()=> templateEditView(b.dataset.tpl));
  document.getElementById("backTplHome").onclick = homeView;
  document.getElementById("resetTpl").onclick = ()=>{
    if(confirm("Reset templates to default?")){
      saveTemplates(DEFAULT_TEMPLATES);
      toast("Templates reset");
      templatesView();
    }
  };
}

function templateEditView(tplId){
  TEMPLATES = loadTemplates();
  const idx = TEMPLATES.findIndex(t=>t.id===tplId);
  if(idx<0){ templatesView(); return; }
  const tpl = TEMPLATES[idx];
  setPill("Edit");

  view.innerHTML = `
    <div class="card">
      <h2>${tpl.name}<span class="tag">${tpl.subtitle||""}</span></h2>
      <div class="exercise-meta">Edit name, sets/reps, rest seconds, and video link.</div>
      <div class="hr"></div>

      <div class="list">
        ${(tpl.exercises||[]).map((ex,i)=>`
          <div class="exercise">
            <div class="exercise-head">
              <div style="flex:1">
                <input class="input" style="width:100%;font-weight:900" value="${escapeAttr(ex.name)}" data-edit="name" data-i="${i}">
                <div style="display:flex;gap:10px;margin-top:8px; flex-wrap:wrap;">
                  <input class="input" inputmode="numeric" style="max-width:110px" value="${ex.sets}" data-edit="sets" data-i="${i}" placeholder="Sets">
                  <input class="input" style="flex:1; min-width:160px" value="${escapeAttr(ex.reps)}" data-edit="reps" data-i="${i}" placeholder="Reps">
                  <input class="input" inputmode="numeric" style="max-width:130px" value="${ex.rest ?? ""}" data-edit="rest" data-i="${i}" placeholder="Rest (s)">
                </div>
                <div style="display:flex;gap:10px;margin-top:8px;">
                  <input class="input" style="width:100%" value="${escapeAttr(ex.video||"")}" data-edit="video" data-i="${i}" placeholder="YouTube link (optional)">
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:8px;">
                <button class="smallbtn" data-move="up" data-i="${i}">↑</button>
                <button class="smallbtn" data-move="down" data-i="${i}">↓</button>
                <button class="smallbtn del" data-del="${i}">🗑</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="hr"></div>
      <div style="display:flex;gap:10px; flex-wrap:wrap;">
        <button class="btn primary" id="addEx">+ Add Exercise</button>
        <button class="btn" id="saveTplBtn">Save</button>
      </div>

      <div style="height:10px"></div>
      <button class="btn" id="backTpls">Back</button>
    </div>`;

  view.querySelectorAll("[data-edit]").forEach(inp=>{
    inp.oninput = ()=>{
      const i=Number(inp.dataset.i);
      const field=inp.dataset.edit;
      if(field==="sets") tpl.exercises[i][field] = Number(inp.value)||0;
      else if(field==="rest") tpl.exercises[i][field] = inp.value==="" ? "" : Number(inp.value)||0;
      else tpl.exercises[i][field] = inp.value;
    };
  });

  view.querySelectorAll("[data-move]").forEach(btn=>{
    btn.onclick = ()=>{
      const i=Number(btn.dataset.i);
      const j = btn.dataset.move==="up" ? i-1 : i+1;
      if(j<0 || j>=tpl.exercises.length) return;
      const tmp=tpl.exercises[i]; tpl.exercises[i]=tpl.exercises[j]; tpl.exercises[j]=tmp;
      TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
      templateEditView(tplId);
    };
  });

  view.querySelectorAll("[data-del]").forEach(btn=>{
    btn.onclick = ()=>{
      const i=Number(btn.dataset.del);
      if(confirm("Delete this exercise?")){
        tpl.exercises.splice(i,1);
        TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
        templateEditView(tplId);
      }
    };
  });

  document.getElementById("addEx").onclick = ()=>{
    tpl.exercises.push({ id:crypto.randomUUID(), name:"New Exercise", sets:3, reps:"10–12", rest:90, video:"" });
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    templateEditView(tplId);
  };

  document.getElementById("saveTplBtn").onclick = ()=>{
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    toast("Template saved ✅");
  };

  document.getElementById("backTpls").onclick = templatesView;
}

/* ---------- Boot ---------- */
function boot(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
  const draft = sessionStorage.getItem("steadylog.draft");
  if(draft){
    try{
      activeWorkout = JSON.parse(draft);
      workoutView();
      return;
    }catch(e){
      sessionStorage.removeItem("steadylog.draft");
    }
  }
  resetFooterNav();
  homeView();
}
boot();
