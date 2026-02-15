/* Steady Log (V1.4 full upgrade) - iPhone PWA - weights-only (Dark Mode)
   Upgrades:
   - Per-exercise rest timer (auto-start on ✓)
   - Tracker: daily weight + daily macros + weekly waist
   - Streak + trends (7-day avg, streak counter)
   - Video link button per exercise
   - Export: workout CSV + tracker CSV
*/
const STORAGE_KEY  = "steadylog.sessions.v2";
const SETTINGS_KEY = "steadylog.settings.v2";
const TEMPLATES_KEY= "steadylog.templates.v3";
const TRACKER_KEY  = "steadylog.tracker.v2";

const DEFAULT_TEMPLATES = [
  {
    id:"upperA",
    name:"Upper A",
    subtitle:"Chest & Arms",
    exercises:[
      { id:"incline_smith_press", name:"Incline Smith Press", sets:3, reps:"8–10", rest:120, video:"https://www.youtube.com/watch?v=b8DqTO6ak0k" }, // :contentReference[oaicite:0]{index=0}
      { id:"chest_supported_row", name:"Chest Supported Row (Plate Loaded)", sets:3, reps:"10–12", rest:120, video:"https://www.youtube.com/watch?v=BeTZjAneZpk" }, // :contentReference[oaicite:1]{index=1}
      { id:"incline_plate_chest_press", name:"Incline Plate Chest Press Machine", sets:3, reps:"10–12", rest:90, video:"https://www.youtube.com/watch?v=O2OxhEcpxmw" }, // (search earlier block; keep editable)
      { id:"shoulder_press", name:"Shoulder Press Machine", sets:3, reps:"8–10", rest:120, video:"https://www.youtube.com/watch?v=ef-hOkkRuY0" }, // :contentReference[oaicite:2]{index=2}
      { id:"tri_pushdown", name:"Tricep Pushdown (Cable)", sets:3, reps:"12–15", rest:60, video:"https://www.youtube.com/watch?v=odbyvJm7d8s" }, // :contentReference[oaicite:3]{index=3}
      { id:"preacher_curl", name:"Preacher Curl Machine", sets:3, reps:"12–15", rest:60, video:"https://www.youtube.com/watch?v=to3m8zws1n8" }, // :contentReference[oaicite:4]{index=4}
    ]
  },
  {
    id:"lowerA",
    name:"Lower A",
    subtitle:"Quads & Burn",
    exercises:[
      { id:"smith_squat", name:"Smith Squat", sets:4, reps:"6–8", rest:150, video:"https://www.youtube.com/watch?v=AHnX-aimA4E" },
      { id:"leg_press", name:"Leg Press", sets:3, reps:"12–15", rest:150, video:"https://www.youtube.com/watch?v=kf4_xcbfjrc" }, // :contentReference[oaicite:5]{index=5}
      { id:"walking_lunges", name:"Walking Lunges", sets:2, reps:"20 steps", rest:90, video:"https://www.youtube.com/watch?v=vYfp2t4XgqQ" }, // :contentReference[oaicite:6]{index=6}
      { id:"leg_ext", name:"Leg Extension", sets:3, reps:"12–15", rest:75, video:"https://www.youtube.com/watch?v=W5AZCNTFpBk" }, // :contentReference[oaicite:7]{index=7}
      { id:"standing_calves", name:"Standing Calf Raise (Machine)", sets:3, reps:"15–20", rest:60, video:"https://www.youtube.com/watch?v=Pw0O0fIIG-g" }, // :contentReference[oaicite:8]{index=8}
    ]
  },
  {
    id:"upperB",
    name:"Upper B",
    subtitle:"Back & Shoulders",
    exercises:[
      { id:"lat_pulldown", name:"Lat Pulldown", sets:3, reps:"8–12", rest:120, video:"https://www.youtube.com/watch?v=nZip-pdLlQM" }, // :contentReference[oaicite:9]{index=9}
      { id:"assist_pullup", name:"Assisted Pull-Up Machine", sets:3, reps:"6–10", rest:120, video:"https://www.youtube.com/watch?v=ogKeZ6vb1lo" }, // :contentReference[oaicite:10]{index=10}
      { id:"pec_deck", name:"Pec Deck / Fly", sets:3, reps:"12–15", rest:75, video:"https://www.youtube.com/watch?v=_4JjOqy0UiY" }, // :contentReference[oaicite:11]{index=11}
      { id:"rear_delt", name:"Rear Delt Machine", sets:3, reps:"12–15", rest:60, video:"https://www.youtube.com/watch?v=JL8nHvZcAK8" }, // :contentReference[oaicite:12]{index=12}
      { id:"face_pull", name:"Face Pull (Cable)", sets:3, reps:"12–15", rest:60, video:"https://www.youtube.com/watch?v=ljgqer1ZpXg" }, // :contentReference[oaicite:13]{index=13}
      { id:"hammer_curl", name:"Hammer Curl", sets:3, reps:"10–12", rest:60, video:"https://www.youtube.com/watch?v=BRVDS6HVR9Q" }, // :contentReference[oaicite:14]{index=14}
    ]
  },
  {
    id:"lowerB",
    name:"Lower B",
    subtitle:"Hamstrings & Glutes",
    exercises:[
      { id:"smith_rdl", name:"Smith RDL", sets:3, reps:"8–10", rest:150, video:"https://www.youtube.com/watch?v=NBR6tozmx2I" }, // :contentReference[oaicite:15]{index=15}
      { id:"lying_curl", name:"Lying Leg Curl", sets:3, reps:"10–12", rest:90, video:"https://www.youtube.com/watch?v=sbke8rheN7Y" }, // :contentReference[oaicite:16]{index=16}
      { id:"hip_thrust", name:"Hip Thrust / Glute Drive Machine", sets:3, reps:"8–10", rest:120, video:"https://www.youtube.com/watch?v=EAdDjw-k3ow" }, // :contentReference[oaicite:17]{index=17}
      { id:"smith_split", name:"Smith Split Squat", sets:2, reps:"10 / leg", rest:120, video:"https://www.youtube.com/watch?v=MXrSCU4P9L4" }, // :contentReference[oaicite:18]{index=18}
      { id:"seated_calves", name:"Seated Calf Raise", sets:3, reps:"15–20", rest:60, video:"https://www.youtube.com/watch?v=yTkZOIEAWm0" }, // :contentReference[oaicite:19]{index=19}
    ]
  }
];

// ---------- helpers ----------
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
function vibrate(pattern=[120,60,120]){
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}
function loadJSON(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch(e){ return fallback; }
}
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function avg(arr){
  if(!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
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

function loadTracker(){
  // v2: weights[], waists[], macros[]
  return loadJSON(TRACKER_KEY, { weights: [], waists: [], macros: [] });
}
function saveTracker(t){ saveJSON(TRACKER_KEY, t); }

// Tracker CSV
function trackerToCSV(tr){
  const rows = [];
  rows.push("type,date,kg,cm,calories,protein,carbs,fat");

  (tr.weights||[]).forEach(w=>{
    rows.push(`weight,${w.date},${w.kg},,,,,`);
  });
  (tr.waists||[]).forEach(w=>{
    rows.push(`waist,${w.date},,${w.cm},,,,`);
  });
  (tr.macros||[]).forEach(m=>{
    rows.push(`macros,${m.date},,,${m.calories},${m.protein},${m.carbs},${m.fat}`);
  });

  return rows.join("\n");
}

function downloadText(filename, content, mime="text/plain"){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// Workout export CSV
function downloadCSV(sessions){
  const rows=[["date","workout","exercise","set_index","kg","reps","session_notes","exercise_note"]];
  for(const ses of sessions){
    for(const ex of ses.exercises){
      (ex.sets||[]).forEach((st,idx)=>{
        rows.push([ses.startedAt,ses.name,ex.name,String(idx+1),String(st.kg),String(st.reps),ses.notes||"",ex.note||""]);
      });
    }
  }
  const csv = rows.map(r=> r.map(v=> `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  downloadText(`steady-log-${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
  toast("Workout CSV downloaded ✅");
}

// Suggested KG from last session
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

// Stats
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

// ---------- Rest Timer overlay ----------
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
        <button class="btn" style="flex:1" data-tquick="30">+30s</button>
        <button class="btn" style="flex:1" data-tquick="60">+60s</button>
        <button class="btn" style="flex:1" data-tquick="90">+90s</button>
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

// ---------- Views ----------
const view = document.getElementById("view");
let activeWorkout=null;

let SETTINGS = loadSettings();
let TEMPLATES = loadTemplates();

function setPill(text){ document.getElementById("pillStatus").textContent = text; }

function resetFooterNav(){
  const wrap = document.querySelector(".footerbar .wrap");
  wrap.innerHTML = `
    <button class="btn ghost" id="navHome">Home</button>
    <button class="btn ghost" id="navHistory">History</button>
    <button class="btn ghost" id="navExercises">Exercises</button>
    <button class="btn ghost" id="navTracker">Tracker</button>
    <button class="btn ghost" id="navExport">Export</button>
  `;
  document.getElementById("navHome").onclick = ()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); homeView(); resetFooterNav(); };
  document.getElementById("navHistory").onclick = ()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); historyView(); resetFooterNav(); };
  document.getElementById("navExercises").onclick = ()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); exercisesView(); resetFooterNav(); };
  document.getElementById("navTracker").onclick = ()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); trackerView(); resetFooterNav(); };
  document.getElementById("navExport").onclick = ()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); exportView(); resetFooterNav(); };
}

function setFooterActions(actions){
  const wrap = document.querySelector(".footerbar .wrap");
  wrap.innerHTML = actions.map((a,i)=>`<button class="btn ${a.cls||"ghost"}" data-foot="${i}">${a.label}</button>`).join("");
  wrap.querySelectorAll("[data-foot]").forEach(btn=>{
    btn.onclick = ()=> actions[Number(btn.dataset.foot)].onClick();
  });
}

function homeView(){
  SETTINGS = loadSettings();
  TEMPLATES = loadTemplates();
  setPill("Ready");
  const stats = computeStats();
  const lastText = stats.last ? fmtDate(stats.last) : "—";

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
        <div class="exercise"><div class="exercise-name">${SETTINGS.restSeconds}s</div><div class="exercise-meta">default rest timer</div></div>
      </div>
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
}

// ---------- Tracker (Weight/Waist/Macros) ----------
function calcStreak(dates){
  // dates array of YYYY-MM-DD strings
  if(!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  let cur = new Date();
  for(;;){
    const d = cur.toISOString().slice(0,10);
    if(set.has(d)){
      streak++;
      cur.setDate(cur.getDate()-1);
    }else{
      break;
    }
  }
  return streak;
}

function trackerView(){
  setPill("Tracker");
  const t = loadTracker();
  const d = todayYMD();

  const weightsSorted = (t.weights||[]).slice().sort((a,b)=> (a.date>b.date?1:-1));
  const last7 = weightsSorted.slice(-7);
  const last7Avg = last7.length ? avg(last7.map(x=>Number(x.kg)||0)) : 0;

  const macrosSorted = (t.macros||[]).slice().sort((a,b)=> (a.date>b.date?1:-1));
  const lastMacro = macrosSorted.slice(-1)[0];

  const lastWaist = (t.waists||[]).slice().sort((a,b)=> (a.date>b.date?1:-1)).slice(-1)[0];

  const streakWeight = calcStreak((t.weights||[]).map(x=>x.date));
  const streakMacros = calcStreak((t.macros||[]).map(x=>x.date));

  view.innerHTML = `
    <h2>Cut Tracker</h2>

    <div class="card">
      <div class="section-title">Trends</div>
      <div class="list">
        <div class="exercise">
          <div class="exercise-name">${last7Avg ? last7Avg.toFixed(1) + " kg" : "—"}</div>
          <div class="exercise-meta">7-day weight average</div>
        </div>
        <div class="exercise">
          <div class="exercise-name">${streakWeight} 🔥</div>
          <div class="exercise-meta">weight logging streak (days)</div>
        </div>
        <div class="exercise">
          <div class="exercise-name">${streakMacros} 🍽️</div>
          <div class="exercise-meta">macro logging streak (days)</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">Daily Weight</div>
      <input class="input" id="wtKg" placeholder="Weight (kg)" inputmode="decimal">
      <button class="btn primary" id="saveWeight">Save Weight</button>
      <div class="sub">Tip: log every morning, same conditions.</div>
    </div>

    <div class="card">
      <div class="section-title">Daily Macros</div>
      <input class="input" id="cals" placeholder="Calories" inputmode="numeric">
      <div style="height:10px"></div>
      <div class="grid">
        <input class="input" id="p" placeholder="Protein (g)" inputmode="numeric">
        <input class="input" id="c" placeholder="Carbs (g)" inputmode="numeric">
        <input class="input" id="f" placeholder="Fat (g)" inputmode="numeric">
        <button class="btn primary" id="saveMacros">Save Macros</button>
      </div>
      <div class="sub">Last saved: <b>${lastMacro ? `${lastMacro.calories} kcal • P${lastMacro.protein} C${lastMacro.carbs} F${lastMacro.fat}` : "—"}</b></div>
    </div>

    <div class="card">
      <div class="section-title">Weekly Waist</div>
      <input class="input" id="waistCm" placeholder="Waist (cm)" inputmode="decimal">
      <button class="btn primary" id="saveWaist">Save Waist</button>
      <div class="sub">Last saved: <b>${lastWaist ? lastWaist.cm + " cm" : "—"}</b></div>
    </div>
  `;

  document.getElementById("saveWeight").onclick = ()=>{
    const kg = Number(document.getElementById("wtKg").value);
    if(!kg){ alert("Enter weight"); return; }

    const tt = loadTracker();
    // overwrite today if already exists
    tt.weights = (tt.weights||[]).filter(x=>x.date!==d);
    tt.weights.push({date:d, kg:kg});
    saveTracker(tt);
    toast("Weight saved ✅");
    trackerView();
  };

  document.getElementById("saveMacros").onclick = ()=>{
    const calories = Number(document.getElementById("cals").value);
    const protein  = Number(document.getElementById("p").value);
    const carbs    = Number(document.getElementById("c").value);
    const fat      = Number(document.getElementById("f").value);

    if(!calories || !protein || !carbs || !fat){
      alert("Enter calories + P/C/F");
      return;
    }

    const tt = loadTracker();
    tt.macros = (tt.macros||[]).filter(x=>x.date!==d);
    tt.macros.push({date:d, calories, protein, carbs, fat});
    saveTracker(tt);
    toast("Macros saved ✅");
    trackerView();
  };

  document.getElementById("saveWaist").onclick = ()=>{
    const cm = Number(document.getElementById("waistCm").value);
    if(!cm){ alert("Enter waist"); return; }

    const tt = loadTracker();
    tt.waists = (tt.waists||[]).filter(x=>x.date!==d);
    tt.waists.push({date:d, cm:cm});
    saveTracker(tt);
    toast("Waist saved ✅");
    trackerView();
  };
}

// ---------- Workout flow ----------
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

  sessionStorage.setItem("steadylog.draft", JSON.stringify(activeWorkout));
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
  const ex = activeWorkout.exercises[exIndex];
  const s = ex.sets[setIndex];
  s.done = !s.done;
  saveDraft();
  workoutView();

  if(s.done){
    const secs = Number(ex.rest)||Number(loadSettings().restSeconds)||90;
    startTimer(secs);
  }
}
function deleteSet(exIndex,setIndex){
  activeWorkout.exercises[exIndex].sets.splice(setIndex,1);
  saveDraft();
  workoutView();
}

function workoutView(){
  setPill("In session");
  const defaultRest = Number(loadSettings().restSeconds)||90;

  view.innerHTML = `
    <div class="card">
      <h2>${activeWorkout.name}<span class="tag">${activeWorkout.subtitle||""}</span></h2>
      <div class="exercise-meta">Started: ${fmtDate(activeWorkout.startedAt)} • Default Rest: ${defaultRest}s</div>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Session Notes</div>
      <textarea id="sessionNotes" class="input" style="min-height:64px; resize:vertical;" placeholder="Notes (optional)">${activeWorkout.notes||""}</textarea>

      <div class="hr"></div>

      <div class="list">
        ${activeWorkout.exercises.map((ex,idx)=>{
          const last = getLastSetsForExercise(ex.id);
          const lastStr = last.length ? last.slice(0,3).map(s=>`${s.kg}kg×${s.reps}`).join(", ") : "—";
          const rest = Number(ex.rest)||defaultRest;
          const vidBtn = ex.video ? `<button class="btn" style="width:auto;padding:10px 12px" data-vid="${idx}">▶ Video</button>` : "";
          return `
            <div class="exercise">
              <div class="exercise-head">
                <div>
                  <div class="exercise-name">${escapeHtml(ex.name)}</div>
                  <div class="exercise-meta">🎯 ${ex.targetSets} sets • ${escapeHtml(ex.targetReps)} • Rest: ${rest}s • Last: ${lastStr}</div>
                </div>
                <div style="display:flex; gap:8px;">
                  ${vidBtn}
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
    </div>
  `;

  document.getElementById("sessionNotes").oninput = (e)=> updateSessionNotes(e.target.value);
  view.querySelectorAll("[data-add]").forEach(b=> b.onclick = ()=> addSet(Number(b.dataset.add)));
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
  view.querySelectorAll("[data-vid]").forEach(btn=> btn.onclick = ()=>{
    const i = Number(btn.dataset.vid);
    const url = activeWorkout.exercises[i].video;
    if(url) window.open(url, "_blank", "noopener,noreferrer");
  });

  setFooterActions([
    {label:"Finish & Save", cls:"primary", onClick: finishWorkout},
    {label:`Rest`, cls:"ghost", onClick: ()=> startTimer(Number(loadSettings().restSeconds)||90)},
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

// ---------- History ----------
function historyView(){
  setPill("History");
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
            <div class="exercise-meta">🎯 ${ex.targetSets} • ${escapeHtml(ex.targetReps)}</div>
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

// ---------- Exercises ----------
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
          return `<button class="btn" data-ex="${ex.id}">${escapeHtml(ex.name)}<span class="tag">Best: ${bestStr}</span></button>`;
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

// ---------- Export ----------
function exportView(){
  setPill("Export");
  view.innerHTML = `
    <div class="card">
      <h2>Export</h2>
      <div class="exercise-meta">Download backups (CSV).</div>
      <div class="hr"></div>

      <button class="btn primary" id="btnCsv">Download Workout CSV</button>
      <button class="btn" id="btnExportTracker">Download Tracker CSV</button>

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
      localStorage.removeItem(TEMPLATES_KEY);
      localStorage.removeItem(TRACKER_KEY);
      sessionStorage.removeItem("steadylog.draft");
      toast("Wiped");
      exportView();
    }
  };
}

// ---------- Settings ----------
function settingsView(){
  SETTINGS=loadSettings();
  setPill("Settings");
  view.innerHTML = `
    <div class="card">
      <h2>Default Rest Timer</h2>
      <div class="exercise-meta">Used when an exercise has no rest set.</div>
      <div class="hr"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${[60,90,120,150].map(s=>`<button class="btn ${SETTINGS.restSeconds===s?"primary":"ghost"}" style="width:auto" data-s="${s}">${s}s</button>`).join("")}
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

// ---------- Template editor ----------
function templatesView(){
  TEMPLATES = loadTemplates();
  setPill("Templates");
  view.innerHTML = `
    <div class="card">
      <h2>Edit Templates</h2>
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
                  <input class="input" style="flex:1;min-width:160px" value="${escapeAttr(ex.reps)}" data-edit="reps" data-i="${i}" title="Reps">
                  <input class="input" inputmode="numeric" style="max-width:120px" value="${ex.rest||""}" data-edit="rest" data-i="${i}" placeholder="Rest s" title="Rest Seconds">
                </div>
                <div style="margin-top:8px;">
                  <input class="input" value="${escapeAttr(ex.video||"")}" data-edit="video" data-i="${i}" placeholder="YouTube link (optional)">
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
      <div style="display:flex;gap:10px">
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
      else if(field==="rest") tpl.exercises[i][field] = Number(inp.value)||0;
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
    tpl.exercises.push({id:crypto.randomUUID(), name:"New Exercise", sets:3, reps:"10–12", rest:90, video:""});
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    templateEditView(tplId);
  };
  document.getElementById("saveTplBtn").onclick = ()=>{
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    toast("Template saved ✅");
  };
  document.getElementById("backTpls").onclick = templatesView;
}

// ---------- Boot ----------
function boot(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
  const draft = sessionStorage.getItem("steadylog.draft");
  if(draft){
    try{
      activeWorkout = JSON.parse(draft);
      workoutView();
      resetFooterNav();
      return;
    }catch(e){
      sessionStorage.removeItem("steadylog.draft");
    }
  }
  resetFooterNav();
  homeView();
}
boot();
