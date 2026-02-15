/* Steady Log (Premium build) - iPhone PWA
   - Templates + per-exercise rest
   - Workout logging + suggested kg
   - Exercise library + best sets
   - Tracker: daily weight + weekly waist
   - Macros: daily entry + progress bars + streak
   - Streaks: workout streak + macros streak
   - Video button uses YouTube search (robust, no dead links)
*/
const STORAGE_KEY   = "steadylog.sessions.v3";
const SETTINGS_KEY  = "steadylog.settings.v3";
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
      { id:"smith_incline", name:"Smith Incline Bench Press", sets:3, reps:"6–8",  rest:120, videoQ:"smith machine incline bench press form" },
      { id:"row_chest_support", name:"Chest Supported Row Machine (Plate)", sets:3, reps:"8–12", rest:90, videoQ:"chest supported row machine plate loaded form" },
      { id:"chest_press_flat", name:"Chest Press (Plate Loaded Flat)", sets:3, reps:"8–10", rest:90, videoQ:"plate loaded chest press machine form" },
      { id:"shoulder_press_plate", name:"Shoulder Press (Plate Machine)", sets:3, reps:"8–10", rest:90, videoQ:"plate loaded shoulder press machine form" },
      { id:"tri_pushdown", name:"Cable Tricep Pushdown", sets:3, reps:"10–15", rest:60, videoQ:"cable tricep pushdown form" },
      { id:"preacher_curl", name:"Preacher Curl Machine", sets:3, reps:"10–15", rest:60, videoQ:"preacher curl machine form" }
    ]
  },
  {
    id: "lowerA",
    name: "Lower A",
    subtitle: "Quads & Burn",
    exercises: [
      { id:"smith_squat", name:"Smith Squat", sets:4, reps:"6–8", rest:120, videoQ:"smith machine squat form" },
      { id:"leg_press", name:"45° Leg Press", sets:3, reps:"10–15", rest:90, videoQ:"45 degree leg press foot placement form" },
      { id:"walking_lunges", name:"Walking Lunges", sets:2, reps:"20 steps", rest:90, videoQ:"walking lunges form" },
      { id:"leg_ext", name:"Leg Extension", sets:3, reps:"12–15", rest:60, videoQ:"leg extension machine form" },
      { id:"standing_calves", name:"Standing Calf Raise", sets:3, reps:"15–20", rest:60, videoQ:"standing calf raise machine form" }
    ]
  },
  {
    id: "upperB",
    name: "Upper B",
    subtitle: "Back & Shoulders",
    exercises: [
      { id:"lat_pulldown", name:"Lat Pulldown", sets:3, reps:"8–12", rest:90, videoQ:"lat pulldown form" },
      { id:"assist_pullup", name:"Assisted Pull-Up Machine", sets:3, reps:"6–10", rest:120, videoQ:"assisted pull up machine form" },
      { id:"pec_deck", name:"Pec Deck / Fly", sets:3, reps:"12–15", rest:75, videoQ:"pec deck fly machine form" },
      { id:"rear_delt", name:"Rear Delt Machine", sets:3, reps:"12–15", rest:60, videoQ:"rear delt machine form" },
      { id:"face_pull", name:"Face Pull (Cable)", sets:3, reps:"12–15", rest:60, videoQ:"cable face pull form" },
      { id:"hammer_curl", name:"DB Hammer Curl", sets:3, reps:"10–12", rest:60, videoQ:"dumbbell hammer curl form" }
    ]
  },
  {
    id: "lowerB",
    name: "Lower B",
    subtitle: "Hamstrings & Glutes",
    exercises: [
      { id:"smith_rdl", name:"Smith Romanian Deadlift", sets:3, reps:"6–8", rest:120, videoQ:"smith machine romanian deadlift form" },
      { id:"hip_thrust", name:"Hip Thrust Machine", sets:3, reps:"8–10", rest:90, videoQ:"hip thrust machine form" },
      { id:"lying_curl", name:"Lying Leg Curl", sets:3, reps:"10–12", rest:90, videoQ:"lying leg curl machine form" },
      { id:"smith_split", name:"Smith Split Squat", sets:2, reps:"10 / leg", rest:90, videoQ:"smith machine split squat form" },
      { id:"seated_calves", name:"Seated Calf Raise", sets:3, reps:"15–20", rest:60, videoQ:"seated calf raise machine form" }
    ]
  }
];

function nowISO(){ return new Date().toISOString(); }
function todayYMD(){ return new Date().toISOString().slice(0,10); }
function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday:"short", year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1600);
}
function loadJSON(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch(e){ return fallback; }
}
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function loadSettings(){ return loadJSON(SETTINGS_KEY, { restSeconds: 90 }); }
function saveSettings(s){ saveJSON(SETTINGS_KEY, s); }
function loadTemplates(){
  const saved = loadJSON(TEMPLATES_KEY, null);
  if(saved && Array.isArray(saved) && saved.length) return saved;
  return DEFAULT_TEMPLATES;
}
function saveTemplates(tpls){ saveJSON(TEMPLATES_KEY, tpls); }
function loadSessions(){ return loadJSON(STORAGE_KEY, []); }
function saveSessions(s){ saveJSON(STORAGE_KEY, s); }

function loadTracker(){ return loadJSON(TRACKER_KEY, { weights: [], waists: [] }); }
function saveTracker(t){ saveJSON(TRACKER_KEY, t); }

function loadMacros(){ return loadJSON(MACROS_KEY, { days: [] }); }
function saveMacros(m){ saveJSON(MACROS_KEY, m); }

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

function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }

function setPill(text){ document.getElementById("pillStatus").textContent = text; }

function calcConsecutiveStreak(daySet){
  let streak = 0;
  let d = new Date();
  for(;;){
    const key = d.toISOString().slice(0,10);
    if(daySet.has(key)){
      streak++;
      d.setDate(d.getDate()-1);
      continue;
    }
    if(streak===0){
      d.setDate(d.getDate()-1);
      const key2 = d.toISOString().slice(0,10);
      if(daySet.has(key2)){
        streak++;
        d.setDate(d.getDate()-1);
        continue;
      }
    }
    break;
  }
  return streak;
}

/* Modal */
function openModal(title, html){
  const m = document.getElementById("modal");
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = html;
  m.hidden = false;
}
function closeModal(){
  document.getElementById("modal").hidden = true;
  document.getElementById("modalBody").innerHTML = "";
}

/* Suggested KG */
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

  const byDay = new Set(sessions.map(s=> s.startedAt.slice(0,10)));
  const workoutStreak = calcConsecutiveStreak(byDay);

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
  return { total, last, best, workoutStreak };
}

/* Rest Timer overlay */
let timerInterval=null, timerEndsAt=null;
function vibrate(pattern=[120,60,120]){
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}
function stopTimer(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval=null; timerEndsAt=null;
  const o=document.getElementById("timerOverlay");
  if(o) o.remove();
}
function startTimer(seconds){
  stopTimer();
  timerEndsAt = Date.now() + seconds*1000;

  const overlay = document.createElement("div");
  overlay.id="timerOverlay";
  overlay.style.position="fixed";
  overlay.style.inset="0";
  overlay.style.background="rgba(0,0,0,.55)";
  overlay.style.backdropFilter="blur(10px)";
  overlay.style.display="flex";
  overlay.style.alignItems="center";
  overlay.style.justifyContent="center";
  overlay.style.zIndex="5000";

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
    b.onclick = ()=>{ timerEndsAt += Number(b.dataset.tquick)*1000; toast(`+${b.dataset.tquick}s`); };
  });

  const tick=()=>{
    const remain = Math.max(0, timerEndsAt - Date.now());
    const sec = Math.ceil(remain/1000);
    const m = String(Math.floor(sec/60));
    const s = String(sec%60).padStart(2,"0");
    const clock = overlay.querySelector("#timerClock");
    if(clock) clock.textContent = `${m}:${s}`;
    if(remain<=0){
      stopTimer();
      vibrate([180,80,180,80,220]);
      toast("Rest done ✅");
    }
  };
  tick();
  timerInterval=setInterval(tick, 250);
}

/* Views */
const view = document.getElementById("view");
let SETTINGS = loadSettings();
let TEMPLATES = loadTemplates();
let activeWorkout=null;

function setFooterTabs(tab){
  const wrap = document.getElementById("footerWrap");
  wrap.innerHTML = `
    <button class="tab ${tab==="home"?"active":""}" data-tab="home"><div class="ico">🏠</div><div>Home</div></button>
    <button class="tab ${tab==="history"?"active":""}" data-tab="history"><div class="ico">🗓️</div><div>History</div></button>
    <button class="tab ${tab==="ex"?"active":""}" data-tab="ex"><div class="ico">🏋️</div><div>Exercises</div></button>
    <button class="tab ${tab==="tracker"?"active":""}" data-tab="tracker"><div class="ico">📈</div><div>Tracker</div></button>
    <button class="tab ${tab==="export"?"active":""}" data-tab="export"><div class="ico">⬇️</div><div>Export</div></button>
  `;
  wrap.querySelectorAll(".tab").forEach(btn=>{
    btn.onclick = ()=>{
      const t = btn.dataset.tab;
      stopTimer();
      if(t==="home") homeView();
      if(t==="history") historyView();
      if(t==="ex") exercisesView();
      if(t==="tracker") trackerView();
      if(t==="export") exportView();
      setFooterTabs(t);
    };
  });
}

function homeView(){
  SETTINGS = loadSettings();
  TEMPLATES = loadTemplates();
  setPill("Ready");
  setFooterTabs("home");

  const stats = computeStats();
  const lastText = stats.last ? fmtDate(stats.last) : "—";

  const macros = loadMacros();
  const macroDays = new Set((macros.days||[]).map(d=>d.date));
  const macrosStreak = calcConsecutiveStreak(macroDays);

  const tr = loadTracker();
  const w = (tr.weights||[]).slice().sort((a,b)=> a.date>b.date?1:-1);
  const last7 = w.slice(-7).map(x=>Number(x.kg)||0).filter(Boolean);
  const prev7 = w.slice(-14,-7).map(x=>Number(x.kg)||0).filter(Boolean);
  const trend = (last7.length>=3 && prev7.length>=3) ? (avg(last7)-avg(prev7)) : null;

  view.innerHTML = `
    <div class="card">
      <h2>Start Workout</h2>
      <div class="hr"></div>
      <div class="grid">
        ${TEMPLATES.map(t=>`
          <button class="btn primary" data-action="start" data-id="${t.id}">${t.name}<span class="tag">${t.subtitle||""}</span></button>
        `).join("")}
      </div>

      <div class="hr"></div>
      <div class="list">
        <div class="exercise"><div class="exercise-name">${stats.total}</div><div class="exercise-meta">sessions logged</div></div>
        <div class="exercise"><div class="exercise-name">${lastText}</div><div class="exercise-meta">last session</div></div>
        <div class="exercise"><div class="exercise-name">${stats.workoutStreak} 🔥</div><div class="exercise-meta">workout streak</div></div>
        <div class="exercise"><div class="exercise-name">${macrosStreak} ✅</div><div class="exercise-meta">macros streak</div></div>
        <div class="exercise"><div class="exercise-name">${trend===null?"—":(trend>0?"+":"") + trend.toFixed(1) + "kg"}</div><div class="exercise-meta">7-day trend (vs previous 7)</div></div>
      </div>
    </div>

    <div class="section-title">Today’s Macros</div>
    ${macrosCardHTML()}

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
  wireMacrosCard();
}

function macrosCardHTML(){
  const d = todayYMD();
  const m = loadMacros();
  const today = (m.days||[]).find(x=>x.date===d) || {date:d, calories:0, protein:0, carbs:0, fat:0};
  const prog = {
    calories: Math.min(1, (Number(today.calories)||0)/MACRO_TARGETS.calories),
    protein:  Math.min(1, (Number(today.protein)||0)/MACRO_TARGETS.protein),
    carbs:    Math.min(1, (Number(today.carbs)||0)/MACRO_TARGETS.carbs),
    fat:      Math.min(1, (Number(today.fat)||0)/MACRO_TARGETS.fat),
  };

  return `
    <div class="card" id="macrosCard">
      <div class="grid">
        <input class="input" id="mCal" placeholder="Calories" inputmode="numeric" value="${today.calories||""}">
        <input class="input" id="mPro" placeholder="Protein (g)" inputmode="numeric" value="${today.protein||""}">
        <input class="input" id="mCarb" placeholder="Carbs (g)" inputmode="numeric" value="${today.carbs||""}">
        <input class="input" id="mFat" placeholder="Fat (g)" inputmode="numeric" value="${today.fat||""}">
      </div>
      <div style="height:10px"></div>
      <button class="btn primary" id="saveMacros">Save Today</button>

      <div class="hr"></div>

      <div class="exercise">
        <div class="exercise-name">Progress</div>
        <div class="progressRow">
          <div class="progressLabel"><span>Calories</span><span>${Number(today.calories||0)}/${MACRO_TARGETS.calories}</span></div>
          <div class="bar"><div class="fill" style="width:${(prog.calories*100).toFixed(0)}%"></div></div>
        </div>
        <div class="progressRow">
          <div class="progressLabel"><span>Protein</span><span>${Number(today.protein||0)}/${MACRO_TARGETS.protein}</span></div>
          <div class="bar"><div class="fill" style="width:${(prog.protein*100).toFixed(0)}%"></div></div>
        </div>
        <div class="progressRow">
          <div class="progressLabel"><span>Carbs</span><span>${Number(today.carbs||0)}/${MACRO_TARGETS.carbs}</span></div>
          <div class="bar"><div class="fill" style="width:${(prog.carbs*100).toFixed(0)}%"></div></div>
        </div>
        <div class="progressRow">
          <div class="progressLabel"><span>Fat</span><span>${Number(today.fat||0)}/${MACRO_TARGETS.fat}</span></div>
          <div class="bar"><div class="fill" style="width:${(prog.fat*100).toFixed(0)}%"></div></div>
        </div>
      </div>

      <div class="sub" style="margin-top:10px;color:rgba(233,233,242,.75)">
        Targets locked: ${MACRO_TARGETS.calories} kcal • P${MACRO_TARGETS.protein} C${MACRO_TARGETS.carbs} F${MACRO_TARGETS.fat}
      </div>
    </div>
  `;
}

function wireMacrosCard(){
  const d = todayYMD();
  const btn = document.getElementById("saveMacros");
  if(!btn) return;
  btn.onclick = ()=>{
    const calories = Number(document.getElementById("mCal").value)||0;
    const protein  = Number(document.getElementById("mPro").value)||0;
    const carbs    = Number(document.getElementById("mCarb").value)||0;
    const fat      = Number(document.getElementById("mFat").value)||0;

    const m = loadMacros();
    const days = m.days||[];
    const idx = days.findIndex(x=>x.date===d);
    const row = {date:d, calories, protein, carbs, fat};
    if(idx>=0) days[idx]=row; else days.push(row);
    m.days = days;
    saveMacros(m);
    toast("Macros saved ✅");
    homeView();
  };
}

function trackerView(){
  setPill("Tracker");
  setFooterTabs("tracker");

  const t = loadTracker();
  const d = todayYMD();

  const weightsSorted = (t.weights||[]).slice().sort((a,b)=> (a.date>b.date?1:-1));
  const last7 = weightsSorted.slice(-7);
  const last7Avg = last7.length ? avg(last7.map(x=>Number(x.kg)||0)) : 0;

  const lastWaist = (t.waists||[]).slice().sort((a,b)=> (a.date>b.date?1:-1)).slice(-1)[0];

  view.innerHTML = `
    <div class="card">
      <h2>Cut Tracker</h2>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Daily Weight</div>
      <input class="input" id="wtKg" placeholder="Weight (kg)" inputmode="decimal">
      <div style="height:10px"></div>
      <button class="btn primary" id="saveWeight">Save Weight</button>
      <div class="sub" style="margin-top:10px">Last 7 day avg: <b>${last7Avg ? last7Avg.toFixed(1) : "—"}</b></div>

      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Weekly Waist</div>
      <input class="input" id="waistCm" placeholder="Waist (cm)" inputmode="decimal">
      <div style="height:10px"></div>
      <button class="btn primary" id="saveWaist">Save Waist</button>
      <div class="sub" style="margin-top:10px">Last saved: <b>${lastWaist ? lastWaist.cm + " cm ("+lastWaist.date+")" : "—"}</b></div>
    </div>
  `;

  document.getElementById("saveWeight").onclick = ()=>{
    const kg = Number(document.getElementById("wtKg").value);
    if(!kg){ alert("Enter weight"); return; }
    const tt = loadTracker();
    tt.weights = tt.weights||[];
    const i = tt.weights.findIndex(x=>x.date===d);
    if(i>=0) tt.weights[i] = {date:d, kg}; else tt.weights.push({date:d, kg});
    saveTracker(tt);
    toast("Weight saved ✅");
    trackerView();
  };

  document.getElementById("saveWaist").onclick = ()=>{
    const cm = Number(document.getElementById("waistCm").value);
    if(!cm){ alert("Enter waist"); return; }
    const tt = loadTracker();
    tt.waists = tt.waists||[];
    const i = tt.waists.findIndex(x=>x.date===d);
    if(i>=0) tt.waists[i] = {date:d, cm}; else tt.waists.push({date:d, cm});
    saveTracker(tt);
    toast("Waist saved ✅");
    trackerView();
  };
}

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
      rest: Number(ex.rest)||Number(loadSettings().restSeconds)||90,
      videoQ: ex.videoQ || (ex.name + " form"),
      note: "",
      sets: []
    }))
  };
  saveDraft();
  workoutView();
  toast(`${tpl.name} started`);
}

function saveDraft(){ sessionStorage.setItem("steadylog.draft", JSON.stringify(activeWorkout)); }
function loadDraft(){
  const raw = sessionStorage.getItem("steadylog.draft");
  if(!raw) return null;
  try{ return JSON.parse(raw); }catch(e){ sessionStorage.removeItem("steadylog.draft"); return null; }
}

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
    startTimer(Number(ex.rest)||Number(loadSettings().restSeconds)||90);
  }
}
function deleteSet(exIndex,setIndex){
  activeWorkout.exercises[exIndex].sets.splice(setIndex,1);
  saveDraft();
  workoutView();
}

function openVideoForExercise(ex){
  const q = ex.videoQ || ex.name;
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  openModal("Exercise Video", `
    <div class="exercise-meta">Opens YouTube search (best chance of never breaking).</div>
    <div class="hr"></div>
    <div class="exercise"><div class="exercise-name">${escapeHtml(ex.name)}</div>
      <div class="exercise-meta">Search: <b>${escapeHtml(q)}</b></div>
    </div>
    <div style="height:10px"></div>
    <a class="btn primary" style="display:block;text-align:center;text-decoration:none" href="${url}" target="_blank" rel="noopener">Open on YouTube</a>
    <div style="height:10px"></div>
    <div class="exercise-meta">Tip: If you find a better video, edit the “Video Search” text in Templates.</div>
  `);
}

function workoutView(){
  SETTINGS=loadSettings();
  setPill("In session");
  setFooterTabs("home");

  view.innerHTML = `
    <div class="card">
      <h2>${activeWorkout.name}<span class="tag">${activeWorkout.subtitle||""}</span></h2>
      <div class="exercise-meta">Started: ${fmtDate(activeWorkout.startedAt)}</div>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Session Notes</div>
      <textarea id="sessionNotes" class="input" style="min-height:64px; resize:vertical;" placeholder="Notes (optional)">${activeWorkout.notes||""}</textarea>

      <div class="hr"></div>

      <div class="list">
        ${activeWorkout.exercises.map((ex,idx)=>{
          const last = getLastSetsForExercise(ex.id);
          const lastStr = last.length ? last.slice(0,3).map(s=>`${s.kg}kg×${s.reps}`).join(", ") : "—";
          return `
            <div class="exercise">
              <div class="exercise-head">
                <div>
                  <div class="exercise-name">${escapeHtml(ex.name)}</div>
                  <div class="exercise-meta">🎯 ${ex.targetSets} sets • ${escapeHtml(ex.targetReps)} • Rest: ${ex.rest}s • Last: ${escapeHtml(lastStr)}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                  <button class="smallbtn video" data-video="${idx}">▶</button>
                  <button class="btn" style="width:auto;padding:10px 12px" data-add="${idx}">+ Set</button>
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

      <div class="hr"></div>
      <div class="grid">
        <button class="btn primary" id="btnFinish">Finish & Save</button>
        <button class="btn" id="btnRest">Rest (${SETTINGS.restSeconds}s)</button>
        <button class="btn danger" id="btnCancel">Cancel</button>
        <button class="btn" id="btnDash">Back to Dashboard</button>
      </div>
    </div>
  `;

  document.getElementById("sessionNotes").oninput = (e)=> updateSessionNotes(e.target.value);
  view.querySelectorAll("[data-add]").forEach(b=> b.onclick = ()=> addSet(Number(b.dataset.add)));
  view.querySelectorAll("[data-video]").forEach(b=> b.onclick = ()=> openVideoForExercise(activeWorkout.exercises[Number(b.dataset.video)]));
  view.querySelectorAll("[data-exnote]").forEach(inp=> inp.oninput = (e)=> updateExerciseNote(Number(inp.dataset.exnote), e.target.value));
  view.querySelectorAll("[data-kg]").forEach(inp=> inp.oninput = (e)=>{
    const [i,j]=inp.dataset.kg.split(":").map(Number); updateSet(i,j,"kg", e.target.value);
  });
  view.querySelectorAll("[data-reps]").forEach(inp=> inp.oninput = (e)=>{
    const [i,j]=inp.dataset.reps.split(":").map(Number); updateSet(i,j,"reps", e.target.value);
  });
  view.querySelectorAll("[data-done]").forEach(btn=> btn.onclick = ()=>{
    const [i,j]=btn.dataset.done.split(":").map(Number); toggleDone(i,j);
  });
  view.querySelectorAll("[data-del]").forEach(btn=> btn.onclick = ()=>{
    const [i,j]=btn.dataset.del.split(":").map(Number); deleteSet(i,j);
  });

  document.getElementById("btnFinish").onclick = finishWorkout;
  document.getElementById("btnRest").onclick = ()=> startTimer(Number(SETTINGS.restSeconds)||90);
  document.getElementById("btnCancel").onclick = cancelWorkout;
  document.getElementById("btnDash").onclick = ()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); homeView(); };
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
  homeView();
}
function cancelWorkout(){
  stopTimer();
  if(confirm("Cancel this workout? (Nothing will be saved)")){
    activeWorkout=null;
    sessionStorage.removeItem("steadylog.draft");
    toast("Cancelled");
    homeView();
  }
}

function historyView(){
  setPill("History");
  setFooterTabs("history");
  const sessions = loadSessions();
  view.innerHTML = `
    <div class="card">
      <h2>History</h2>
      <div class="hr"></div>
      <div class="list">
        ${sessions.length ? sessions.slice().reverse().map(s=>`
          <button class="btn" data-open="${s.id}">${escapeHtml(s.name)}<span class="tag">${new Date(s.startedAt).toLocaleDateString()}</span></button>
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
  setFooterTabs("history");
  view.innerHTML = `
    <div class="card">
      <h2>${escapeHtml(s.name)}<span class="tag">${escapeHtml(s.subtitle||"")}</span></h2>
      <div class="exercise-meta">${fmtDate(s.startedAt)}</div>
      ${s.notes?`<div class="hr"></div><div class="exercise-meta"><b>Notes:</b> ${escapeHtml(s.notes)}</div>`:""}
      <div class="hr"></div>
      <div class="list">
        ${s.exercises.map(ex=>`
          <div class="exercise">
            <div class="exercise-name">${escapeHtml(ex.name)}</div>
            <div class="exercise-meta">🎯 ${ex.targetSets} • ${escapeHtml(ex.targetReps)} • Rest: ${ex.rest||""}s</div>
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
  setFooterTabs("ex");
  const stats = computeStats();
  const exMap = new Map();
  for(const t of loadTemplates()){
    for(const ex of (t.exercises||[])) exMap.set(ex.id, ex.name);
  }
  const exList = Array.from(exMap.entries()).map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name));

  view.innerHTML = `
    <div class="card">
      <h2>Exercises</h2>
      <div class="exercise-meta">Tap an exercise to see best + recent progress.</div>
      <div class="hr"></div>
      <div class="list">
        ${exList.map(ex=>{
          const best = stats.best[ex.id];
          const bestStr = best ? `${best.kg}kg×${best.reps}` : "—";
          return `<button class="btn" data-ex="${ex.id}">${escapeHtml(ex.name)}<span class="tag">Best: ${escapeHtml(bestStr)}</span></button>`;
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
  setFooterTabs("ex");
  view.innerHTML = `
    <div class="card">
      <h2>${escapeHtml(name)}</h2>
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
  setFooterTabs("export");
  view.innerHTML = `
    <div class="card">
      <h2>Export</h2>
      <div class="exercise-meta">Backup your workouts, tracker, and macros.</div>
      <div class="hr"></div>

      <button class="btn primary" id="btnCsv">Download Workouts CSV</button>
      <div style="height:10px"></div>
      <button class="btn" id="btnTrackerCsv">Download Tracker CSV</button>
      <div style="height:10px"></div>
      <button class="btn" id="btnMacrosCsv">Download Macros CSV</button>

      <div class="hr"></div>
      <button class="btn danger" id="btnWipe">Wipe all data</button>
    </div>`;

  document.getElementById("btnCsv").onclick = ()=> downloadWorkoutsCSV(loadSessions());
  document.getElementById("btnTrackerCsv").onclick = ()=> downloadText(
    `steady-tracker-${todayYMD()}.csv`,
    trackerToCSV(loadTracker()),
    "text/csv"
  );
  document.getElementById("btnMacrosCsv").onclick = ()=> downloadText(
    `steady-macros-${todayYMD()}.csv`,
    macrosToCSV(loadMacros()),
    "text/csv"
  );

  document.getElementById("btnWipe").onclick = ()=>{
    if(confirm("Wipe ALL Steady Log data from this phone?")){
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(TEMPLATES_KEY);
      localStorage.removeItem(TRACKER_KEY);
      localStorage.removeItem(MACROS_KEY);
      sessionStorage.removeItem("steadylog.draft");
      toast("Wiped");
      homeView();
    }
  };
}

function downloadText(filename, content, mime){
  const blob = new Blob([content], {type:mime||"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast("Downloaded ✅");
}

function downloadWorkoutsCSV(sessions){
  const rows=[["date","workout","exercise","set_index","kg","reps","session_notes","exercise_note"]];
  for(const ses of sessions){
    for(const ex of ses.exercises){
      (ex.sets||[]).forEach((st,idx)=>{
        rows.push([ses.startedAt,ses.name,ex.name,String(idx+1),String(st.kg),String(st.reps),ses.notes||"",ex.note||""]);
      });
    }
  }
  const csv = rows.map(r=> r.map(v=> `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  downloadText(`steady-log-${todayYMD()}.csv`, csv, "text/csv");
}

function trackerToCSV(tracker){
  const rows = [];
  rows.push("type,date,value");
  (tracker.weights||[]).forEach(w=> rows.push(`weight,${w.date},${w.kg}`));
  (tracker.waists||[]).forEach(w=> rows.push(`waist,${w.date},${w.cm}`));
  return rows.join("\n");
}

function macrosToCSV(macros){
  const rows = [];
  rows.push("date,calories,protein,carbs,fat");
  (macros.days||[]).slice().sort((a,b)=>a.date>b.date?1:-1).forEach(d=>{
    rows.push(`${d.date},${d.calories||0},${d.protein||0},${d.carbs||0},${d.fat||0}`);
  });
  return rows.join("\n");
}

function settingsView(){
  SETTINGS=loadSettings();
  setPill("Settings");
  setFooterTabs("home");
  view.innerHTML = `
    <div class="card">
      <h2>Default Timer Settings</h2>
      <div class="exercise-meta">Used when an exercise doesn’t have its own rest set.</div>
      <div class="hr"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${[60,75,90,120].map(s=>`<button class="btn ${SETTINGS.restSeconds===s?"primary":"ghost"}" style="width:auto" data-s="${s}">${s}s</button>`).join("")}
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

/* Template editor */
function templatesView(){
  TEMPLATES = loadTemplates();
  setPill("Templates");
  setFooterTabs("home");
  view.innerHTML = `
    <div class="card">
      <h2>Edit Templates</h2>
      <div class="exercise-meta">You can edit exercise order, sets/reps, rest, and video search.</div>
      <div class="hr"></div>
      <div class="list">
        ${TEMPLATES.map(t=>`<button class="btn" data-tpl="${t.id}">${escapeHtml(t.name)}<span class="tag">${escapeHtml(t.subtitle||"")}</span></button>`).join("")}
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
  setFooterTabs("home");

  view.innerHTML = `
    <div class="card">
      <h2>${escapeHtml(tpl.name)}<span class="tag">${escapeHtml(tpl.subtitle||"")}</span></h2>
      <div class="hr"></div>
      <div class="list">
        ${(tpl.exercises||[]).map((ex,i)=>`
          <div class="exercise">
            <div class="exercise-head">
              <div style="flex:1">
                <input class="input" style="width:100%;font-weight:900" value="${escapeAttr(ex.name)}" data-edit="name" data-i="${i}">
                <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
                  <input class="input" inputmode="numeric" style="max-width:110px" value="${ex.sets}" data-edit="sets" data-i="${i}" title="Sets">
                  <input class="input" style="flex:1;min-width:160px" value="${escapeAttr(ex.reps)}" data-edit="reps" data-i="${i}" title="Rep target">
                  <input class="input" inputmode="numeric" style="max-width:120px" value="${ex.rest||""}" data-edit="rest" data-i="${i}" title="Rest (sec)">
                </div>
                <div style="margin-top:8px;">
                  <input class="input" value="${escapeAttr(ex.videoQ||"")}" data-edit="videoQ" data-i="${i}" title="Video Search" placeholder="Video search (YouTube)">
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <button class="smallbtn" data-move="up" data-i="${i}">↑</button>
                <button class="smallbtn" data-move="down" data-i="${i}">↓</button>
                <button class="smallbtn del" data-del="${i}">🗑</button>
              </div>
            </div>
          </div>`).join("")}
      </div>
      <div class="hr"></div>
      <div class="grid">
        <button class="btn primary" id="addEx">+ Add Exercise</button>
        <button class="btn" id="saveTplBtn">Save</button>
        <button class="btn" id="backTpls">Back</button>
        <button class="btn" id="demoVideo">What’s Video?</button>
      </div>
    </div>`;

  view.querySelectorAll("[data-edit]").forEach(inp=>{
    inp.oninput = ()=>{
      const i=Number(inp.dataset.i);
      const field=inp.dataset.edit;
      if(field==="sets" || field==="rest") tpl.exercises[i][field] = Number(inp.value)||0;
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
    tpl.exercises.push({id:crypto.randomUUID(), name:"New Exercise", sets:3, reps:"10–12", rest:90, videoQ:"exercise form"});
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    templateEditView(tplId);
  };
  document.getElementById("saveTplBtn").onclick = ()=>{
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    toast("Template saved ✅");
  };
  document.getElementById("backTpls").onclick = templatesView;

  document.getElementById("demoVideo").onclick = ()=>{
    openModal("Video System", `
      <div class="exercise-meta">Each exercise has a “Video Search” string.</div>
      <div class="hr"></div>
      <div class="exercise-meta">When you tap ▶ it opens a YouTube search using that text — so links don’t die.</div>
      <div class="exercise-meta">You can change the search anytime in Templates.</div>
    `);
  };
}

/* Boot */
function boot(){
  document.getElementById("modalClose").onclick = closeModal;
  document.getElementById("modal").addEventListener("click",(e)=>{
    if(e.target.id==="modal") closeModal();
  });

  document.getElementById("btnDashboard").onclick = ()=>{
    stopTimer();
    activeWorkout=null;
    sessionStorage.removeItem("steadylog.draft");
    homeView();
  };

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }

  const draft = loadDraft();
  if(draft){
    activeWorkout = draft;
    workoutView();
    return;
  }

  homeView();
}
boot();
