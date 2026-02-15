/* Steady Log (PWA) - weights-only (Dark Mode)
   Features:
   - Rest timer overlay + vibrate + auto-start on ✓
   - Suggested KG = last working set from last session for that exercise
   - Notes: per session + per exercise
   - PRs + recent progress
   - Editable templates (add/remove/reorder/change sets & rep targets)
   - Tracker tab (daily weight + weekly waist)
   - Export: workout CSV + tracker CSV
   - Per-exercise rest seconds (visible + editable)
   - Export/Import Templates (JSON backup)
   - Tracker streak + trends (7/14 day averages + 7-day change)
*/

const STORAGE_KEY   = "steadylog.sessions.v2";
const SETTINGS_KEY  = "steadylog.settings.v2";
const TEMPLATES_KEY = "steadylog.templates.v2";
const TRACKER_KEY   = "steadylog.tracker.v1";

/* LOCKED DEFAULT PROGRAM (yours) + rest seconds */
const DEFAULT_TEMPLATES = [
  {
    id: "upperA",
    name: "Upper A",
    subtitle: "Chest & Arms",
    exercises: [
      { id:"incline_smith",    name:"Smith Incline Press",              sets:3, reps:"6–8",     rest:120 },
      { id:"plate_row",        name:"Chest Supported Row (Plate)",      sets:3, reps:"8–12",    rest:90  },
      { id:"flat_plate_press", name:"Plate Loaded Chest Press (Flat)",  sets:3, reps:"8–10",    rest:90  },
      { id:"plate_shoulder",   name:"Plate Shoulder Press",             sets:3, reps:"8–10",    rest:90  },
      { id:"tri_pushdown",     name:"Cable Tricep Pushdown",            sets:3, reps:"10–15",   rest:60  },
      { id:"preacher_curl",    name:"Preacher Curl Machine",            sets:3, reps:"10–15",   rest:60  }
    ]
  },
  {
    id: "lowerA",
    name: "Lower A",
    subtitle: "Quads",
    exercises: [
      { id:"smith_squat",      name:"Smith Squat",                      sets:4, reps:"6–8",     rest:120 },
      { id:"leg_press",        name:"45° Leg Press",                    sets:3, reps:"10–15",   rest:120 },
      { id:"lunges",           name:"Walking Lunges",                   sets:2, reps:"20 steps",rest:75  },
      { id:"leg_ext",          name:"Leg Extension",                    sets:3, reps:"12–15",   rest:60  },
      { id:"standing_calves",  name:"Standing Calf Raise",              sets:3, reps:"15–20",   rest:60  }
    ]
  },
  {
    id: "upperB",
    name: "Upper B",
    subtitle: "Back & Delts",
    exercises: [
      { id:"assist_pullup",    name:"Assisted Pull-Up",                 sets:3, reps:"6–10",    rest:120 },
      { id:"seated_row",       name:"Seated Row",                       sets:3, reps:"8–12",    rest:120 },
      { id:"rear_delt",        name:"Rear Delt Machine",                sets:3, reps:"12–15",   rest:60  },
      { id:"face_pull",        name:"Face Pull",                        sets:3, reps:"12–15",   rest:60  },
      { id:"pec_deck",         name:"Pec Deck (Pump)",                  sets:2, reps:"12–15",   rest:60  },
      { id:"hammer_curl",      name:"Hammer Curl",                      sets:3, reps:"10–12",   rest:60  }
    ]
  },
  {
    id: "lowerB",
    name: "Lower B",
    subtitle: "Hamstrings & Glutes",
    exercises: [
      { id:"smith_rdl",        name:"Smith RDL",                        sets:3, reps:"6–8",     rest:120 },
      { id:"hip_thrust",       name:"Hip Thrust Machine",               sets:3, reps:"8–10",    rest:120 },
      { id:"lying_curl",       name:"Lying Leg Curl",                   sets:3, reps:"10–12",   rest:60  },
      { id:"smith_split",      name:"Smith Split Squat",                sets:2, reps:"10 / leg",rest:75  },
      { id:"seated_calves",    name:"Seated Calf Raise",                sets:3, reps:"15–20",   rest:60  }
    ]
  }
];

/* Utils */
function nowISO(){ return new Date().toISOString(); }
function todayYMD(){ return new Date().toISOString().slice(0,10); }

function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday:"short", year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"
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

function downloadText(filename, text, mime="text/plain"){
  const blob = new Blob([text], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

function avg(arr){
  if(!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

/* Tracker */
function loadTracker(){
  return loadJSON(TRACKER_KEY, { weights: [], waists: [] });
}
function saveTracker(t){ saveJSON(TRACKER_KEY, t); }

function calcWeightStreak(weights){
  if(!weights.length) return 0;
  const dates = weights.map(w=>w.date).sort((a,b)=> new Date(b)-new Date(a));

  let streak = 0;
  let cursor = new Date(todayYMD());

  for(const d of dates){
    const dd = new Date(d);
    if(dd.toDateString() === cursor.toDateString()){
      streak++;
      cursor.setDate(cursor.getDate()-1);
    }else{
      break;
    }
  }
  return streak;
}

function calcTrendAvg(weights, days){
  if(weights.length < days) return null;
  const sorted = weights.slice().sort((a,b)=> new Date(a.date)-new Date(b.date));
  const recent = sorted.slice(-days);
  return avg(recent.map(x=>Number(x.kg)||0));
}

function calcDelta7(weights){
  // delta = today - 7 days ago (based on last 8 logged points in ascending date order)
  if(weights.length < 8) return null;
  const sorted = weights.slice().sort((a,b)=> new Date(a.date)-new Date(b.date));
  const last = sorted[sorted.length-1];
  const weekAgo = sorted[sorted.length-8];
  if(!last || !weekAgo) return null;
  return Number((Number(last.kg) - Number(weekAgo.kg)).toFixed(1));
}

function trackerToCSV(tracker){
  const rows = [];
  rows.push("type,date,value");
  (tracker.weights||[]).forEach(w=> rows.push(`weight,${w.date},${w.kg}`));
  (tracker.waists||[]).forEach(w=> rows.push(`waist,${w.date},${w.cm}`));
  return rows.join("\n");
}

/* Sessions / settings / templates */
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

let SETTINGS = loadSettings();
let TEMPLATES = loadTemplates();

function setPill(text){
  const pill = document.getElementById("pillStatus");
  if(pill) pill.textContent = text;
}

/* Suggested KG */
function getLastSetsForExercise(exId){
  const sessions = loadSessions();
  for(let i=sessions.length-1;i>=0;i--){
    const ses = sessions[i];
    for(const ex of ses.exercises){
      if(ex.id === exId && ex.sets && ex.sets.length) return ex.sets;
    }
  }
  return [];
}
function getSuggestedKg(exId){
  const lastSets = getLastSetsForExercise(exId);
  if(!lastSets.length) return "";
  const last = lastSets[lastSets.length-1];
  return (Number(last.kg) || "");
}

/* Stats */
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

/* Rest Timer overlay */
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
let activeWorkout=null;

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
  wrap.innerHTML = actions
    .map((a,i)=>`<button class="btn ${a.cls||"ghost"}" data-foot="${i}">${a.label}</button>`)
    .join("");
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
          <button class="btn primary" data-action="start" data-id="${t.id}">
            ${t.name}<span class="tag">${t.subtitle||""}</span>
          </button>
        `).join("")}
      </div>
      <div class="hr"></div>
      <div class="list">
        <div class="exercise"><div class="exercise-name">${stats.total}</div><div class="exercise-meta">sessions logged</div></div>
        <div class="exercise"><div class="exercise-name">${lastText}</div><div class="exercise-meta">last session</div></div>
        <div class="exercise"><div class="exercise-name">${SETTINGS.restSeconds}s</div><div class="exercise-meta">default rest</div></div>
      </div>
    </div>

    <div class="section-title">Tools</div>
    <div class="card">
      <button class="btn" id="btnTemplateEditor">Edit Templates</button>
      <div style="height:10px"></div>
      <button class="btn" id="btnSettings">Timer Settings</button>
    </div>
  `;

  view.querySelectorAll('[data-action="start"]').forEach(btn=>{
    btn.onclick = ()=> startWorkout(btn.dataset.id);
  });
  document.getElementById("btnTemplateEditor").onclick = templatesView;
  document.getElementById("btnSettings").onclick = settingsView;
}

/* Tracker view */
function trackerView(){
  setPill("Tracker");
  const t = loadTracker();
  const d = todayYMD();

  const weights = (t.weights||[]).slice().sort((a,b)=> (a.date>b.date?1:-1));
  const lastWeight = weights.length ? weights[weights.length-1] : null;

  const waists = (t.waists||[]).slice().sort((a,b)=> (a.date>b.date?1:-1));
  const lastWaist = waists.length ? waists[waists.length-1] : null;

  const streak = calcWeightStreak(t.weights||[]);
  const avg7 = calcTrendAvg(t.weights||[], 7);
  const avg14 = calcTrendAvg(t.weights||[], 14);
  const delta7 = calcDelta7(t.weights||[]);

  view.innerHTML = `
    <div class="card">
      <h2>Cut Tracker</h2>
      <div class="exercise-meta">
        Daily weigh-in + weekly waist. Focus on averages (not daily noise).
      </div>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Daily Weight</div>
      <input class="input" id="wtKg" inputmode="decimal" placeholder="Weight (kg)">
      <div style="height:10px"></div>
      <button class="btn primary" id="saveWeight">Save Weight</button>

      <div class="sub" style="margin-top:10px;">
        🔥 Streak: <b>${streak} day${streak!==1?"s":""}</b><br>
        ✅ Last weigh-in: <b>${lastWeight ? `${lastWeight.kg} kg (${lastWeight.date})` : "—"}</b><br>
        📊 7-day avg: <b>${avg7 ? avg7.toFixed(1) : "—"}</b><br>
        📊 14-day avg: <b>${avg14 ? avg14.toFixed(1) : "—"}</b><br>
        📉 7-day change: <b>${delta7!==null ? `${delta7} kg` : "—"}</b>
      </div>

      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Weekly Waist</div>
      <input class="input" id="waistCm" inputmode="decimal" placeholder="Waist (cm)">
      <div style="height:10px"></div>
      <button class="btn primary" id="saveWaist">Save Waist</button>
      <div class="sub" style="margin-top:10px;">Last waist: <b>${lastWaist ? `${lastWaist.cm} cm (${lastWaist.date})` : "—"}</b></div>

      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Recent Weights</div>
      <div class="list">
        ${(weights.slice(-10).reverse().map(x=>`
          <div class="exercise">
            <div class="exercise-head">
              <div class="exercise-name">${x.kg} kg</div>
              <div class="exercise-meta">${x.date}</div>
            </div>
          </div>
        `).join("") || `<div class="exercise"><div class="exercise-meta">No weights logged yet.</div></div>`)}
      </div>
    </div>
  `;

  document.getElementById("saveWeight").onclick = ()=>{
    const kg = Number(document.getElementById("wtKg").value);
    if(!kg){ alert("Enter weight (kg)"); return; }

    const tt = loadTracker();
    tt.weights = (tt.weights||[]).filter(x=>x.date!==d); // overwrite same day
    tt.weights.push({date:d, kg:Number(kg.toFixed(1))});
    saveTracker(tt);
    toast("Weight saved ✅");
    trackerView();
  };

  document.getElementById("saveWaist").onclick = ()=>{
    const cm = Number(document.getElementById("waistCm").value);
    if(!cm){ alert("Enter waist (cm)"); return; }

    const tt = loadTracker();
    tt.waists = (tt.waists||[]).filter(x=>x.date!==d); // overwrite same day
    tt.waists.push({date:d, cm:Number(cm.toFixed(1))});
    saveTracker(tt);
    toast("Waist saved ✅");
    trackerView();
  };
}

/* Workout flow */
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
      restSeconds: Number(ex.rest)||0,
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
    SETTINGS = loadSettings();
    const perEx = Number(activeWorkout.exercises[exIndex].restSeconds) || 0;
    const fallback = Number(SETTINGS.restSeconds) || 90;
    startTimer(perEx || fallback);
  }
}

function deleteSet(exIndex,setIndex){
  activeWorkout.exercises[exIndex].sets.splice(setIndex,1);
  saveDraft();
  workoutView();
}

function workoutView(){
  SETTINGS = loadSettings();
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
          const rest = Number(ex.restSeconds) || Number(SETTINGS.restSeconds) || 90;

          return `
            <div class="exercise">
              <div class="exercise-head">
                <div>
                  <div class="exercise-name">${ex.name}</div>
                  <div class="exercise-meta">🎯 ${ex.targetSets} sets • ${ex.targetReps} • Rest: ${rest}s • Last: ${lastStr}</div>
                </div>
                <button class="btn" style="width:auto;padding:10px 12px" data-add="${idx}">+ Set</button>
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
    const [i,j]=inp.dataset.kg.split(":").map(Number);
    updateSet(i,j,"kg", e.target.value);
  });
  view.querySelectorAll("[data-reps]").forEach(inp=> inp.oninput = (e)=>{
    const [i,j]=inp.dataset.reps.split(":").map(Number);
    updateSet(i,j,"reps", e.target.value);
  });
  view.querySelectorAll("[data-done]").forEach(btn=> btn.onclick = ()=>{
    const [i,j]=btn.dataset.done.split(":").map(Number);
    toggleDone(i,j);
  });
  view.querySelectorAll("[data-del]").forEach(btn=> btn.onclick = ()=>{
    const [i,j]=btn.dataset.del.split(":").map(Number);
    deleteSet(i,j);
  });

  setFooterActions([
    {label:"Finish & Save", cls:"primary", onClick: finishWorkout},
    {label:`Rest ${SETTINGS.restSeconds}s`, cls:"ghost", onClick: ()=> startTimer(Number(SETTINGS.restSeconds)||90)},
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

/* History */
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
  const sessions = loadSessions();
  const s = sessions.find(x=>x.id===id);
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
            <div class="exercise-meta">🎯 ${ex.targetSets} • ${ex.targetReps} • Rest: ${(ex.restSeconds||0)}s</div>
            ${ex.note?`<div class="exercise-meta"><b>Note:</b> ${escapeHtml(ex.note)}</div>`:""}
            <div class="hr"></div>
            <div class="exercise-meta">${(ex.sets||[]).map(st=>`${st.kg}kg×${st.reps}`).join(" • ") || "—"}</div>
          </div>`).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn danger" id="delSes">Delete session</button>
      <div style="height:10px"></div>
      <button class="btn" id="backHist">Back</button>
    </div>
  `;

  document.getElementById("backHist").onclick = historyView;
  document.getElementById("delSes").onclick = ()=>{
    if(confirm("Delete this session permanently?")){
      saveSessions(sessions.filter(x=>x.id!==id));
      toast("Deleted");
      historyView();
    }
  };
}

/* Exercises */
function exercisesView(){
  setPill("Exercises");
  const stats = computeStats();

  const exMap = new Map();
  for(const t of loadTemplates()){
    for(const ex of (t.exercises||[])) exMap.set(ex.id, ex.name);
  }
  const exList = Array.from(exMap.entries())
    .map(([id,name])=>({id,name}))
    .sort((a,b)=>a.name.localeCompare(b.name));

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
    </div>
  `;

  view.querySelectorAll("[data-ex]").forEach(b=> b.onclick = ()=> exerciseDetailView(b.dataset.ex));
  document.getElementById("editTplFromEx").onclick = templatesView;
}

function exerciseDetailView(exId){
  const sessions = loadSessions();
  const entries = [];
  let name = exId;

  for(const ses of sessions){
    for(const ex of ses.exercises){
      if(ex.id===exId){
        name = ex.name;
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
          <div class="exercise">
            <div class="exercise-name">${e.kg}kg × ${e.reps}</div>
            <div class="exercise-meta">${new Date(e.at).toLocaleDateString()}</div>
          </div>
        `).join("") : `<div class="exercise"><div class="exercise-meta">No logs yet for this exercise.</div></div>`}
      </div>
      <div class="hr"></div>
      <button class="btn" id="backEx">Back</button>
    </div>
  `;
  document.getElementById("backEx").onclick = exercisesView;
}

/* Export */
function exportView(){
  setPill("Export");
  view.innerHTML = `
    <div class="card">
      <h2>Export</h2>
      <div class="exercise-meta">Download backups.</div>
      <div class="hr"></div>

      <button class="btn primary" id="btnCsv">Download Workout CSV</button>
      <button class="btn" id="btnExportTracker">Export Tracker CSV</button>

      <div style="height:10px"></div>

      <button class="btn danger" id="btnWipe">Wipe all data</button>
    </div>
  `;

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
      localStorage.removeItem(TRACKER_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(TEMPLATES_KEY);
      sessionStorage.removeItem("steadylog.draft");
      toast("Wiped");
      exportView();
    }
  };
}

function downloadCSV(sessions){
  const rows=[["date","workout","exercise","set_index","kg","reps","session_notes","exercise_note"]];
  for(const ses of sessions){
    for(const ex of ses.exercises){
      (ex.sets||[]).forEach((st,idx)=>{
        rows.push([
          ses.startedAt,
          ses.name,
          ex.name,
          String(idx+1),
          String(st.kg),
          String(st.reps),
          ses.notes||"",
          ex.note||""
        ]);
      });
    }
  }
  const csv = rows
    .map(r=> r.map(v=> `"${String(v).replaceAll('"','""')}"`).join(","))
    .join("\n");

  downloadText(`steady-log-${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
  toast("Workout CSV downloaded ✅");
}

/* Settings */
function settingsView(){
  SETTINGS = loadSettings();
  setPill("Settings");

  view.innerHTML = `
    <div class="card">
      <h2>Timer Settings</h2>
      <div class="exercise-meta">Default rest used when an exercise rest is not set.</div>
      <div class="hr"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${[60,90,120].map(s=>`<button class="btn ${SETTINGS.restSeconds===s?"primary":"ghost"}" style="width:auto" data-s="${s}">${s}s</button>`).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn" id="backHome">Back</button>
    </div>
  `;

  view.querySelectorAll("[data-s]").forEach(b=> b.onclick = ()=>{
    SETTINGS.restSeconds = Number(b.dataset.s);
    saveSettings(SETTINGS);
    toast(`Default rest set to ${SETTINGS.restSeconds}s`);
    settingsView();
  });

  document.getElementById("backHome").onclick = homeView;
}

/* Template editor + Export/Import */
function templatesView(){
  TEMPLATES = loadTemplates();
  setPill("Templates");

  view.innerHTML = `
    <div class="card">
      <h2>Edit Templates</h2>
      <div class="hr"></div>
      <div class="list">
        ${TEMPLATES.map(t=>`
          <button class="btn" data-tpl="${t.id}">
            ${t.name}<span class="tag">${t.subtitle||""}</span>
          </button>
        `).join("")}
      </div>
      <div class="hr"></div>

      <button class="btn danger" id="resetTpl">Reset to default</button>
      <div style="height:10px"></div>
      <button class="btn" id="exportTpl">Export Templates (JSON)</button>
      <div style="height:10px"></div>
      <button class="btn" id="importTpl">Import Templates (JSON)</button>

      <div style="height:10px"></div>
      <button class="btn" id="backTplHome">Back</button>
    </div>
  `;

  view.querySelectorAll("[data-tpl]").forEach(b=> b.onclick = ()=> templateEditView(b.dataset.tpl));
  document.getElementById("backTplHome").onclick = homeView;

  document.getElementById("resetTpl").onclick = ()=>{
    if(confirm("Reset templates to default program?")){
      saveTemplates(DEFAULT_TEMPLATES);
      toast("Templates reset ✅");
      templatesView();
    }
  };

  document.getElementById("exportTpl").onclick = ()=>{
    const data = JSON.stringify(loadTemplates(), null, 2);
    downloadText("steady-templates.json", data, "application/json");
    toast("Templates exported ✅");
  };

  document.getElementById("importTpl").onclick = ()=>{
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e)=>{
      const file = e.target.files && e.target.files[0];
      if(!file) return;

      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const parsed = JSON.parse(reader.result);
          if(!Array.isArray(parsed)) throw new Error("Not array");
          saveTemplates(parsed);
          toast("Templates imported ✅");
          templatesView();
        }catch(err){
          alert("Invalid templates file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
      <div class="hr"></div>

      <div class="list">
        ${(tpl.exercises||[]).map((ex,i)=>`
          <div class="exercise">
            <div class="exercise-head">
              <div style="flex:1">
                <input class="input" style="width:100%;font-weight:900" value="${escapeAttr(ex.name)}" data-edit="name" data-i="${i}">

                <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
                  <input class="input" inputmode="numeric" style="max-width:110px" value="${ex.sets}" data-edit="sets" data-i="${i}" placeholder="Sets">
                  <input class="input" style="flex:1; min-width:160px" value="${escapeAttr(ex.reps)}" data-edit="reps" data-i="${i}" placeholder="Reps (e.g. 8–10)">
                  <input class="input" inputmode="numeric" style="max-width:130px" value="${Number(ex.rest)||0}" data-edit="rest" data-i="${i}" placeholder="Rest (sec)">
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
      <div style="display:flex;gap:10px">
        <button class="btn primary" id="addEx">+ Add Exercise</button>
        <button class="btn" id="saveTplBtn">Save</button>
      </div>

      <div style="height:10px"></div>
      <button class="btn" id="backTpls">Back</button>
    </div>
  `;

  view.querySelectorAll("[data-edit]").forEach(inp=>{
    inp.oninput = ()=>{
      const i = Number(inp.dataset.i);
      const field = inp.dataset.edit;

      if(field==="sets") tpl.exercises[i][field] = Number(inp.value)||0;
      else if(field==="rest") tpl.exercises[i][field] = Number(inp.value)||0;
      else tpl.exercises[i][field] = inp.value;
    };
  });

  view.querySelectorAll("[data-move]").forEach(btn=>{
    btn.onclick = ()=>{
      const i = Number(btn.dataset.i);
      const j = btn.dataset.move==="up" ? i-1 : i+1;
      if(j<0 || j>=tpl.exercises.length) return;
      const tmp = tpl.exercises[i]; tpl.exercises[i]=tpl.exercises[j]; tpl.exercises[j]=tmp;
      TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
      templateEditView(tplId);
    };
  });

  view.querySelectorAll("[data-del]").forEach(btn=>{
    btn.onclick = ()=>{
      const i = Number(btn.dataset.del);
      if(confirm("Delete this exercise?")){
        tpl.exercises.splice(i,1);
        TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
        templateEditView(tplId);
      }
    };
  });

  document.getElementById("addEx").onclick = ()=>{
    tpl.exercises.push({ id: crypto.randomUUID(), name:"New Exercise", sets:3, reps:"10–12", rest:90 });
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    templateEditView(tplId);
  };

  document.getElementById("saveTplBtn").onclick = ()=>{
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    toast("Template saved ✅");
  };

  document.getElementById("backTpls").onclick = templatesView;
}

/* Boot */
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
