/* Steady Log - Premium Build (vP1)
   Features:
   - Rest timer overlay + vibrate + auto-start on ✓
   - Per-exercise rest time (60/75/90/120) shown + used automatically
   - Suggested KG from last session for same exercise
   - Notes: per session + per exercise
   - PRs + recent progress
   - Editable templates (add/remove/reorder/change sets & rep targets + rest + video)
   - Tracker: daily weight, weekly waist
   - Macros: daily save + targets + progress bars + streak
   - Dashboard: workout streak + macros streak
*/

const STORAGE_KEY   = "steadylog.sessions.v2";
const SETTINGS_KEY  = "steadylog.settings.v2";
const TEMPLATES_KEY = "steadylog.templates.v3";
const TRACKER_KEY   = "steadylog.tracker.v2";
const MACROS_KEY    = "steadylog.macros.v1";

const MACRO_TARGETS = { calories:2010, protein:210, carbs:180, fat:50 };

const DEFAULT_TEMPLATES = [
  {
    id:"upperA",
    name:"Upper A",
    subtitle:"Chest & Arms",
    exercises:[
      { id:"smith_incline", name:"Smith Incline Bench Press", sets:3, reps:"6–8", rest:120, video:"ytsearch" },
      { id:"chest_supported_row", name:"Chest Supported Row Machine (Plate)", sets:3, reps:"8–12", rest:90, video:"ytsearch" }, // row before press (as you wanted)
      { id:"flat_plate_press", name:"Chest Press Plate Loaded (Flat)", sets:3, reps:"8–10", rest:90, video:"ytsearch" },
      { id:"shoulder_press_plate", name:"Shoulder Press Plate Machine", sets:3, reps:"8–10", rest:90, video:"ytsearch" },
      { id:"tri_pushdown", name:"Cable Tricep Pushdown", sets:3, reps:"10–15", rest:60, video:"ytsearch" },
      { id:"preacher_curl", name:"Preacher Curl Machine", sets:3, reps:"10–15", rest:60, video:"ytsearch" },
    ]
  },
  {
    id:"lowerA",
    name:"Lower A",
    subtitle:"Quads & Burn",
    exercises:[
      { id:"smith_squat", name:"Smith Squat", sets:4, reps:"6–8", rest:120, video:"ytsearch" },
      { id:"leg_press", name:"45° Leg Press", sets:3, reps:"10–15", rest:90, video:"ytsearch" },
      { id:"walking_lunges", name:"Walking Lunges", sets:2, reps:"20 steps", rest:90, video:"ytsearch" },
      { id:"leg_ext", name:"Leg Extension", sets:3, reps:"12–15", rest:60, video:"ytsearch" },
      { id:"standing_calves", name:"Standing Calf Raise", sets:3, reps:"15–20", rest:60, video:"ytsearch" },
    ]
  },
  {
    id:"upperB",
    name:"Upper B",
    subtitle:"Back & Shoulders",
    exercises:[
      { id:"lat_pulldown", name:"Lat Pulldown", sets:3, reps:"8–12", rest:90, video:"ytsearch" },
      { id:"assist_pullup", name:"Assisted Pull-Up Machine", sets:3, reps:"6–10", rest:120, video:"ytsearch" },
      { id:"rear_delt", name:"Rear Delt Machine", sets:3, reps:"12–15", rest:75, video:"ytsearch" },
      { id:"face_pull", name:"Face Pull (Cable)", sets:3, reps:"12–15", rest:60, video:"ytsearch" },
      { id:"pec_deck_pump", name:"Pec Deck (Light Pump Work)", sets:2, reps:"12–15", rest:60, video:"ytsearch" },
      { id:"hammer_curl", name:"DB Hammer Curl", sets:3, reps:"10–12", rest:60, video:"ytsearch" },
    ]
  },
  {
    id:"lowerB",
    name:"Lower B",
    subtitle:"Hamstrings & Glutes",
    exercises:[
      { id:"smith_rdl", name:"Smith Romanian Deadlift", sets:3, reps:"6–8", rest:120, video:"ytsearch" },
      { id:"hip_thrust", name:"Hip Thrust Machine", sets:3, reps:"8–10", rest:90, video:"ytsearch" },
      { id:"lying_curl", name:"Lying Leg Curl", sets:3, reps:"10–12", rest:90, video:"ytsearch" },
      { id:"smith_split", name:"Smith Split Squat", sets:2, reps:"10 / leg", rest:90, video:"ytsearch" },
      { id:"seated_calves", name:"Seated Calf Raise", sets:3, reps:"15–20", rest:60, video:"ytsearch" },
    ]
  }
];

function nowISO(){ return new Date().toISOString(); }
function todayYMD(){ return new Date().toISOString().slice(0,10); }

function fmtDate(iso){
  const d=new Date(iso);
  return d.toLocaleString(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}

function toast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1600);
}

function vibrate(pattern=[120,60,120]){
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}

function loadJSON(key,fallback){
  try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }
  catch(e){ return fallback; }
}
function saveJSON(key,val){ localStorage.setItem(key,JSON.stringify(val)); }

function loadSessions(){ return loadJSON(STORAGE_KEY,[]); }
function saveSessions(s){ saveJSON(STORAGE_KEY,s); }

function loadSettings(){ return loadJSON(SETTINGS_KEY,{ restSeconds:90 }); }
function saveSettings(s){ saveJSON(SETTINGS_KEY,s); }

function loadTemplates(){
  const saved=loadJSON(TEMPLATES_KEY,null);
  if(saved && Array.isArray(saved) && saved.length) return saved;
  return DEFAULT_TEMPLATES;
}
function saveTemplates(t){ saveJSON(TEMPLATES_KEY,t); }

function loadTracker(){
  return loadJSON(TRACKER_KEY,{ weights:[], waists:[] });
}
function saveTracker(t){ saveJSON(TRACKER_KEY,t); }

function loadMacros(){
  return loadJSON(MACROS_KEY,{ byDate:{} });
}
function saveMacros(m){ saveJSON(MACROS_KEY,m); }

let SETTINGS=loadSettings();
let TEMPLATES=loadTemplates();

function setPill(text){ document.getElementById("pillStatus").textContent=text; }

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

/* Video links: stable (never 404) */
function getVideoUrlForExercise(exName, videoField){
  if(videoField && videoField !== "ytsearch") return videoField;
  const q = encodeURIComponent(exName + " form");
  return `https://www.youtube.com/results?search_query=${q}`;
}

function getLastSetsForExercise(exId){
  const sessions=loadSessions();
  for(let i=sessions.length-1;i>=0;i--){
    const ses=sessions[i];
    for(const ex of ses.exercises){
      if(ex.id===exId && ex.sets && ex.sets.length) return ex.sets;
    }
  }
  return [];
}
function getSuggestedKg(exId){
  const lastSets=getLastSetsForExercise(exId);
  if(!lastSets.length) return "";
  const last=lastSets[lastSets.length-1];
  return (Number(last.kg)||"");
}

/* Stats + streaks */
function computeWorkoutStreak(){
  const sessions=loadSessions();
  if(!sessions.length) return 0;
  const dates = new Set(sessions.map(s => s.startedAt.slice(0,10)));
  // streak up to today or yesterday (if missed today)
  let d = new Date();
  let streak=0;
  for(;;){
    const ymd=d.toISOString().slice(0,10);
    if(dates.has(ymd)){ streak++; d.setDate(d.getDate()-1); continue; }
    // allow streak to count if today not done but yesterday was (common)
    if(streak===0){
      d.setDate(d.getDate()-1);
      const ymd2=d.toISOString().slice(0,10);
      if(dates.has(ymd2)){ streak++; d.setDate(d.getDate()-1); continue; }
    }
    break;
  }
  return streak;
}

function computeMacrosStreak(){
  const m=loadMacros();
  const dates = Object.keys(m.byDate||{});
  if(!dates.length) return 0;
  const doneSet = new Set(dates.filter(d=>{
    const x=m.byDate[d]||{};
    return Number(x.calories)||Number(x.protein)||Number(x.carbs)||Number(x.fat);
  }));

  let d=new Date();
  let streak=0;
  for(;;){
    const ymd=d.toISOString().slice(0,10);
    if(doneSet.has(ymd)){ streak++; d.setDate(d.getDate()-1); continue; }
    if(streak===0){
      d.setDate(d.getDate()-1);
      const ymd2=d.toISOString().slice(0,10);
      if(doneSet.has(ymd2)){ streak++; d.setDate(d.getDate()-1); continue; }
    }
    break;
  }
  return streak;
}

function computeStats(){
  const sessions=loadSessions();
  const total=sessions.length;
  const last=total?sessions[sessions.length-1].startedAt:null;
  const best={};
  for(const ses of sessions){
    for(const ex of ses.exercises){
      for(const st of (ex.sets||[])){
        const kg=Number(st.kg)||0, reps=Number(st.reps)||0;
        if(!best[ex.id] || kg>best[ex.id].kg || (kg===best[ex.id].kg && reps>best[ex.id].reps)){
          best[ex.id]={kg,reps,at:ses.startedAt};
        }
      }
    }
  }
  return {total,last,best};
}

/* Rest timer overlay */
let timerInterval=null, timerEndsAt=null;
function stopTimer(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval=null; timerEndsAt=null;
  const o=document.getElementById("timerOverlay");
  if(o) o.remove();
}
function startTimer(seconds){
  stopTimer();
  timerEndsAt=Date.now()+seconds*1000;

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

  overlay.innerHTML=`
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

  overlay.querySelector("#timerStop").onclick=()=>{ stopTimer(); toast("Timer stopped"); };
  overlay.querySelectorAll("[data-tquick]").forEach(b=>{
    b.onclick=()=>{ timerEndsAt += Number(b.dataset.tquick)*1000; toast(`+${b.dataset.tquick}s`); };
  });

  const tick=()=>{
    const remain=Math.max(0,timerEndsAt-Date.now());
    const sec=Math.ceil(remain/1000);
    const m=String(Math.floor(sec/60));
    const s=String(sec%60).padStart(2,"0");
    const clock=overlay.querySelector("#timerClock");
    if(clock) clock.textContent=`${m}:${s}`;
    if(remain<=0){
      stopTimer();
      vibrate([180,80,180,80,220]);
      toast("Rest done ✅");
    }
  };
  tick();
  timerInterval=setInterval(tick,250);
}

/* Views */
const view=document.getElementById("view");
const footerWrap=document.getElementById("footerWrap");
let activeWorkout=null;

function setFooterActions(actions){
  footerWrap.innerHTML = actions.map((a,i)=>`<button class="btn ${a.cls||"ghost"}" data-foot="${i}">${a.label}</button>`).join("");
  footerWrap.querySelectorAll("[data-foot]").forEach(btn=>{
    btn.onclick=()=>actions[Number(btn.dataset.foot)].onClick();
  });
}

function resetFooterNav(){
  setFooterActions([
    {label:"Home", cls:"ghost", onClick:()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); homeView(); }},
    {label:"History", cls:"ghost", onClick:()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); historyView(); }},
    {label:"Exercises", cls:"ghost", onClick:()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); exercisesView(); }},
    {label:"Tracker", cls:"ghost", onClick:()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); trackerView(); }},
    {label:"Export", cls:"ghost", onClick:()=>{ stopTimer(); activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); exportView(); }},
  ]);
}

function avg(arr){
  if(!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function homeView(){
  SETTINGS=loadSettings();
  TEMPLATES=loadTemplates();
  setPill("Ready");

  const stats=computeStats();
  const lastText=stats.last?fmtDate(stats.last):"—";
  const workoutStreak=computeWorkoutStreak();
  const macrosStreak=computeMacrosStreak();

  // Macros today preview
  const m=loadMacros();
  const d=todayYMD();
  const today = (m.byDate||{})[d] || { calories:0, protein:0, carbs:0, fat:0 };

  view.innerHTML=`
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
        <div class="exercise"><div class="exercise-name">${workoutStreak} 🔥</div><div class="exercise-meta">workout streak</div></div>
        <div class="exercise"><div class="exercise-name">${macrosStreak} ✅</div><div class="exercise-meta">macros streak</div></div>
      </div>
    </div>

    <div class="section-title">Today’s Macros</div>
    <div class="card">
      <div class="grid">
        <input class="input" id="mCal" placeholder="Calories" inputmode="numeric" value="${today.calories||""}">
        <input class="input" id="mPro" placeholder="Protein (g)" inputmode="numeric" value="${today.protein||""}">
        <input class="input" id="mCarb" placeholder="Carbs (g)" inputmode="numeric" value="${today.carbs||""}">
        <input class="input" id="mFat" placeholder="Fat (g)" inputmode="numeric" value="${today.fat||""}">
      </div>
      <div style="height:10px"></div>
      <button class="btn primary" id="saveMacrosBtn">Save Today</button>

      <div class="hr"></div>
      <div class="exercise">
        <div class="exercise-name">Progress</div>
        <div class="exercise-meta">Calories: ${Number(today.calories)||0}/${MACRO_TARGETS.calories}</div>
        <div class="progress"><div style="width:${Math.min(100, ((Number(today.calories)||0)/MACRO_TARGETS.calories)*100)}%"></div></div>

        <div style="height:10px"></div>
        <div class="exercise-meta">Protein: ${Number(today.protein)||0}/${MACRO_TARGETS.protein}</div>
        <div class="progress"><div style="width:${Math.min(100, ((Number(today.protein)||0)/MACRO_TARGETS.protein)*100)}%"></div></div>

        <div style="height:10px"></div>
        <div class="exercise-meta">Carbs: ${Number(today.carbs)||0}/${MACRO_TARGETS.carbs}</div>
        <div class="progress"><div style="width:${Math.min(100, ((Number(today.carbs)||0)/MACRO_TARGETS.carbs)*100)}%"></div></div>

        <div style="height:10px"></div>
        <div class="exercise-meta">Fat: ${Number(today.fat)||0}/${MACRO_TARGETS.fat}</div>
        <div class="progress"><div style="width:${Math.min(100, ((Number(today.fat)||0)/MACRO_TARGETS.fat)*100)}%"></div></div>
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
    btn.onclick=()=>startWorkout(btn.dataset.id);
  });

  document.getElementById("btnTemplateEditor").onclick=templatesView;
  document.getElementById("btnSettings").onclick=settingsView;

  document.getElementById("saveMacrosBtn").onclick=()=>{
    const d=todayYMD();
    const mm=loadMacros();
    if(!mm.byDate) mm.byDate={};
    mm.byDate[d]={
      calories:Number(document.getElementById("mCal").value)||0,
      protein:Number(document.getElementById("mPro").value)||0,
      carbs:Number(document.getElementById("mCarb").value)||0,
      fat:Number(document.getElementById("mFat").value)||0,
    };
    saveMacros(mm);
    toast("Macros saved ✅");
    homeView();
  };
}

function trackerView(){
  setPill("Tracker");
  const t=loadTracker();
  const d=todayYMD();

  const weightsSorted=(t.weights||[]).slice().sort((a,b)=> (a.date>b.date?1:-1));
  const last7=weightsSorted.slice(-7);
  const last7Avg=last7.length?avg(last7.map(x=>Number(x.kg)||0)):0;
  const lastWeight=weightsSorted.slice(-1)[0];

  const lastWaist=(t.waists||[]).slice().sort((a,b)=> (a.date>b.date?1:-1)).slice(-1)[0];

  view.innerHTML=`
    <div class="card">
      <h2>Cut Tracker</h2>
      <div class="exercise-meta">Daily weight + weekly waist</div>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Daily Weight</div>
      <input class="input" id="wtKg" placeholder="Weight (kg)" inputmode="decimal">
      <div style="height:10px"></div>
      <button class="btn primary" id="saveWeight">Save Weight</button>
      <div class="hr"></div>
      <div class="exercise-meta">Last: <b>${lastWeight ? `${lastWeight.kg} kg (${lastWeight.date})` : "—"}</b></div>
      <div class="exercise-meta">7-day avg: <b>${last7Avg ? last7Avg.toFixed(1) : "—"}</b></div>

      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Weekly Waist</div>
      <input class="input" id="waistCm" placeholder="Waist (cm)" inputmode="decimal">
      <div style="height:10px"></div>
      <button class="btn primary" id="saveWaist">Save Waist</button>
      <div class="hr"></div>
      <div class="exercise-meta">Last saved: <b>${lastWaist ? `${lastWaist.cm} cm (${lastWaist.date})` : "—"}</b></div>
    </div>
  `;

  document.getElementById("saveWeight").onclick=()=>{
    const kg=Number(document.getElementById("wtKg").value);
    if(!kg){ alert("Enter weight"); return; }
    const tt=loadTracker();
    tt.weights.push({date:d, kg});
    saveTracker(tt);
    toast("Weight saved ✅");
    trackerView();
  };

  document.getElementById("saveWaist").onclick=()=>{
    const cm=Number(document.getElementById("waistCm").value);
    if(!cm){ alert("Enter waist"); return; }
    const tt=loadTracker();
    tt.waists.push({date:d, cm});
    saveTracker(tt);
    toast("Waist saved ✅");
    trackerView();
  };
}

function startWorkout(templateId){
  TEMPLATES=loadTemplates();
  const tpl=TEMPLATES.find(t=>t.id===templateId);
  if(!tpl) return;

  activeWorkout={
    id: crypto.randomUUID(),
    templateId: tpl.id,
    name: tpl.name,
    subtitle: tpl.subtitle || "",
    startedAt: nowISO(),
    notes: "",
    exercises: (tpl.exercises||[]).map(ex=>({
      id: ex.id || crypto.randomUUID(),
      name: ex.name,
      targetSets: Number(ex.sets)||0,
      targetReps: ex.reps || "",
      restSeconds: Number(ex.rest)||Number(loadSettings().restSeconds)||90,
      video: ex.video || "ytsearch",
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
  const ex=activeWorkout.exercises[exIndex];
  ex.sets.push({ kg:getSuggestedKg(ex.id), reps:"", done:false });
  saveDraft();
  workoutView();
}

function updateSet(exIndex,setIndex,field,value){
  const s=activeWorkout.exercises[exIndex].sets[setIndex];
  s[field]=(value===""? "": Number(value));
  saveDraft();
}

function updateSessionNotes(v){ activeWorkout.notes=v; saveDraft(); }
function updateExerciseNote(exIndex,v){ activeWorkout.exercises[exIndex].note=v; saveDraft(); }

function toggleDone(exIndex,setIndex){
  const s=activeWorkout.exercises[exIndex].sets[setIndex];
  s.done=!s.done;
  saveDraft();
  workoutView();
  if(s.done){
    const rest = Number(activeWorkout.exercises[exIndex].restSeconds) || 90;
    startTimer(rest);
  }
}

function deleteSet(exIndex,setIndex){
  activeWorkout.exercises[exIndex].sets.splice(setIndex,1);
  saveDraft();
  workoutView();
}

function workoutView(){
  setPill("In session");
  view.innerHTML=`
    <div class="card">
      <h2>${activeWorkout.name}<span class="tag">${activeWorkout.subtitle||""}</span></h2>
      <div class="exercise-meta">Started: ${fmtDate(activeWorkout.startedAt)}</div>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Session Notes</div>
      <textarea id="sessionNotes" class="input" style="min-height:64px; resize:vertical;" placeholder="Notes (optional)">${activeWorkout.notes||""}</textarea>

      <div class="hr"></div>

      <div class="list">
        ${activeWorkout.exercises.map((ex,idx)=>{
          const last=getLastSetsForExercise(ex.id);
          const lastStr=last.length ? last.slice(0,3).map(s=>`${s.kg}kg×${s.reps}`).join(", ") : "—";
          return `
            <div class="exercise">
              <div class="exercise-head">
                <div>
                  <div class="exercise-name">${ex.name}</div>
                  <div class="exercise-meta">🎯 ${ex.targetSets} sets • ${ex.targetReps} • Rest: ${ex.restSeconds}s • Last: ${lastStr}</div>
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="btn" style="width:auto;padding:10px 12px" data-video="${idx}">▶ Video</button>
                  <button class="btn" style="width:auto;padding:10px 12px" data-add="${idx}">+ Set</button>
                </div>
              </div>

              <div style="display:flex; gap:8px; align-items:center; margin-top:8px">
                <span class="tag">Note</span>
                <input class="input" style="padding:10px" value="${escapeAttr(ex.note||"")}" placeholder="e.g. slow tempo / drop set" data-exnote="${idx}">
              </div>

              ${(ex.sets||[]).map((s,sidx)=>`
                <div class="set">
                  <input class="input" inputmode="decimal" placeholder="KG" value="${s.kg ?? ""}" data-role="kg" data-kg="${idx}:${sidx}">
                  <input class="input" inputmode="numeric" pattern="[0-9]*" placeholder="Reps" value="${s.reps ?? ""}" data-role="reps" data-reps="${idx}:${sidx}">
                  <button class="smallbtn ok ${s.done?"ok":""}" data-role="done" data-done="${idx}:${sidx}">✓</button>
                  <button class="smallbtn del" data-role="del" data-del="${idx}:${sidx}">🗑</button>
                </div>
              `).join("")}
            </div>`;
        }).join("")}
      </div>
    </div>
  `;

  document.getElementById("sessionNotes").oninput=(e)=>updateSessionNotes(e.target.value);

  view.querySelectorAll("[data-add]").forEach(b=> b.onclick=()=>addSet(Number(b.dataset.add)));
  view.querySelectorAll("[data-video]").forEach(b=> b.onclick=()=>{
    const i=Number(b.dataset.video);
    const ex=activeWorkout.exercises[i];
    const url=getVideoUrlForExercise(ex.name, ex.video);
    window.open(url,"_blank");
  });

  view.querySelectorAll("[data-exnote]").forEach(inp=> inp.oninput=(e)=>updateExerciseNote(Number(inp.dataset.exnote), e.target.value));
  view.querySelectorAll("[data-kg]").forEach(inp=> inp.oninput=(e)=>{
    const [i,j]=inp.dataset.kg.split(":").map(Number);
    updateSet(i,j,"kg",e.target.value);
  });
  view.querySelectorAll("[data-reps]").forEach(inp=> inp.oninput=(e)=>{
    const [i,j]=inp.dataset.reps.split(":").map(Number);
    updateSet(i,j,"reps",e.target.value);
  });
  view.querySelectorAll("[data-done]").forEach(btn=> btn.onclick=()=>{
    const [i,j]=btn.dataset.done.split(":").map(Number);
    toggleDone(i,j);
  });
  view.querySelectorAll("[data-del]").forEach(btn=> btn.onclick=()=>{
    const [i,j]=btn.dataset.del.split(":").map(Number);
    deleteSet(i,j);
  });

  setFooterActions([
    {label:"Finish & Save", cls:"primary", onClick:finishWorkout},
    {label:"Rest", cls:"ghost", onClick:()=>startTimer(SETTINGS.restSeconds||90)},
    {label:"Cancel", cls:"danger", onClick:cancelWorkout},
  ]);
}

function finishWorkout(){
  stopTimer();
  for(const ex of activeWorkout.exercises){
    ex.sets=(ex.sets||[]).filter(s=>(Number(s.kg)||0)>0 && (Number(s.reps)||0)>0);
  }
  const sessions=loadSessions();
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

function historyView(){
  setPill("History");
  const sessions=loadSessions();
  view.innerHTML=`
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
  view.querySelectorAll("[data-open]").forEach(b=> b.onclick=()=>sessionDetailView(b.dataset.open));
}

function sessionDetailView(id){
  const sessions=loadSessions();
  const s=sessions.find(x=>x.id===id);
  if(!s){ historyView(); return; }
  setPill("Session");
  view.innerHTML=`
    <div class="card">
      <h2>${s.name}<span class="tag">${s.subtitle||""}</span></h2>
      <div class="exercise-meta">${fmtDate(s.startedAt)}</div>
      ${s.notes?`<div class="hr"></div><div class="exercise-meta"><b>Notes:</b> ${escapeHtml(s.notes)}</div>`:""}
      <div class="hr"></div>
      <div class="list">
        ${s.exercises.map(ex=>`
          <div class="exercise">
            <div class="exercise-name">${ex.name}</div>
            <div class="exercise-meta">🎯 ${ex.targetSets} • ${ex.targetReps}</div>
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
  document.getElementById("backHist").onclick=historyView;
  document.getElementById("delSes").onclick=()=>{
    if(confirm("Delete this session permanently?")){
      saveSessions(sessions.filter(x=>x.id!==id));
      toast("Deleted");
      historyView();
    }
  };
}

function exercisesView(){
  setPill("Exercises");
  const stats=computeStats();
  const exMap=new Map();
  for(const t of loadTemplates()){
    for(const ex of (t.exercises||[])) exMap.set(ex.id, ex.name);
  }
  const exList=Array.from(exMap.entries()).map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name));

  view.innerHTML=`
    <div class="card">
      <h2>Exercises</h2>
      <div class="hr"></div>
      <div class="list">
        ${exList.map(ex=>{
          const best=stats.best[ex.id];
          const bestStr=best?`${best.kg}kg×${best.reps}`:"—";
          return `<button class="btn" data-ex="${ex.id}">${ex.name}<span class="tag">Best: ${bestStr}</span></button>`;
        }).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn" id="editTplFromEx">Edit Templates</button>
    </div>
  `;
  view.querySelectorAll("[data-ex]").forEach(b=> b.onclick=()=>exerciseDetailView(b.dataset.ex));
  document.getElementById("editTplFromEx").onclick=templatesView;
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
  const best=entries.reduce((acc,cur)=>{
    if(!acc) return cur;
    if(cur.kg>acc.kg) return cur;
    if(cur.kg===acc.kg && cur.reps>acc.reps) return cur;
    return acc;
  },null);
  const recent=entries.slice(0,12);

  setPill("Exercise");
  view.innerHTML=`
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
    </div>
  `;
  document.getElementById("backEx").onclick=exercisesView;
}

function trackerToCSV(tracker){
  const rows=[];
  rows.push("type,date,value");
  (tracker.weights||[]).forEach(w=> rows.push(`weight,${w.date},${w.kg}`));
  (tracker.waists||[]).forEach(w=> rows.push(`waist,${w.date},${w.cm}`));
  return rows.join("\n");
}

function macrosToCSV(m){
  const rows=["date,calories,protein,carbs,fat"];
  const keys=Object.keys(m.byDate||{}).sort();
  keys.forEach(d=>{
    const x=m.byDate[d]||{};
    rows.push(`${d},${x.calories||0},${x.protein||0},${x.carbs||0},${x.fat||0}`);
  });
  return rows.join("\n");
}

function downloadText(filename,text,type="text/plain"){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function downloadCSV(sessions){
  const rows=[["date","workout","exercise","set_index","kg","reps","session_notes","exercise_note","rest_seconds"]];
  for(const ses of sessions){
    for(const ex of ses.exercises){
      (ex.sets||[]).forEach((st,idx)=>{
        rows.push([ses.startedAt,ses.name,ex.name,String(idx+1),String(st.kg),String(st.reps),ses.notes||"",ex.note||"", String(ex.restSeconds||"")]);
      });
    }
  }
  const csv=rows.map(r=> r.map(v=> `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  downloadText(`steady-log-${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
  toast("Workouts CSV downloaded ✅");
}

function exportView(){
  setPill("Export");
  view.innerHTML=`
    <div class="card">
      <h2>Export</h2>
      <div class="exercise-meta">Backup your data</div>
      <div class="hr"></div>

      <button class="btn primary" id="btnCsv">Download Workouts CSV</button>
      <div style="height:10px"></div>
      <button class="btn" id="btnExportTracker">Download Tracker CSV</button>
      <div style="height:10px"></div>
      <button class="btn" id="btnExportMacros">Download Macros CSV</button>

      <div class="hr"></div>
      <button class="btn danger" id="btnWipe">Wipe all data</button>
    </div>
  `;

  document.getElementById("btnCsv").onclick=()=>downloadCSV(loadSessions());
  document.getElementById("btnExportTracker").onclick=()=>{
    const t=loadTracker();
    downloadText(`steady-tracker-${new Date().toISOString().slice(0,10)}.csv`, trackerToCSV(t), "text/csv");
    toast("Tracker CSV downloaded ✅");
  };
  document.getElementById("btnExportMacros").onclick=()=>{
    const m=loadMacros();
    downloadText(`steady-macros-${new Date().toISOString().slice(0,10)}.csv`, macrosToCSV(m), "text/csv");
    toast("Macros CSV downloaded ✅");
  };

  document.getElementById("btnWipe").onclick=()=>{
    if(confirm("Wipe ALL Steady Log data from this phone?")){
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TRACKER_KEY);
      localStorage.removeItem(MACROS_KEY);
      sessionStorage.removeItem("steadylog.draft");
      toast("Wiped");
      exportView();
    }
  };
}

function settingsView(){
  SETTINGS=loadSettings();
  setPill("Settings");
  view.innerHTML=`
    <div class="card">
      <h2>Default Timer Settings</h2>
      <div class="exercise-meta">Fallback rest timer (per-exercise rest overrides this)</div>
      <div class="hr"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${[60,75,90,120].map(s=>`<button class="btn ${SETTINGS.restSeconds===s?"primary":"ghost"}" style="width:auto" data-s="${s}">${s}s</button>`).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn" id="backHome">Back</button>
    </div>
  `;
  view.querySelectorAll("[data-s]").forEach(b=> b.onclick=()=>{
    SETTINGS.restSeconds=Number(b.dataset.s);
    saveSettings(SETTINGS);
    toast(`Default rest set to ${SETTINGS.restSeconds}s`);
    settingsView();
  });
  document.getElementById("backHome").onclick=homeView;
}

/* Template editor */
function templatesView(){
  TEMPLATES=loadTemplates();
  setPill("Templates");
  view.innerHTML=`
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
    </div>
  `;
  view.querySelectorAll("[data-tpl]").forEach(b=> b.onclick=()=>templateEditView(b.dataset.tpl));
  document.getElementById("backTplHome").onclick=homeView;
  document.getElementById("resetTpl").onclick=()=>{
    if(confirm("Reset templates to default?")){
      saveTemplates(DEFAULT_TEMPLATES);
      toast("Templates reset");
      templatesView();
    }
  };
}

function templateEditView(tplId){
  TEMPLATES=loadTemplates();
  const idx=TEMPLATES.findIndex(t=>t.id===tplId);
  if(idx<0){ templatesView(); return; }
  const tpl=TEMPLATES[idx];

  setPill("Edit");
  view.innerHTML=`
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
                  <input class="input" inputmode="numeric" style="max-width:110px" value="${ex.sets}" data-edit="sets" data-i="${i}" title="Sets">
                  <input class="input" style="flex:1" value="${escapeAttr(ex.reps)}" data-edit="reps" data-i="${i}" title="Reps">
                  <input class="input" inputmode="numeric" style="max-width:110px" value="${ex.rest||90}" data-edit="rest" data-i="${i}" title="Rest (s)">
                </div>
                <div style="margin-top:8px;">
                  <input class="input" value="${escapeAttr(ex.video && ex.video!=="ytsearch" ? ex.video : "")}" data-edit="video" data-i="${i}" placeholder="Optional: paste YouTube link (leave blank = search)">
                  <div class="exercise-meta" style="margin-top:6px;">Tip: leave video blank to use YouTube search (never breaks).</div>
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
    inp.oninput=()=>{
      const i=Number(inp.dataset.i);
      const field=inp.dataset.edit;
      if(field==="sets") tpl.exercises[i][field]=Number(inp.value)||0;
      else if(field==="rest") tpl.exercises[i][field]=Number(inp.value)||90;
      else if(field==="video"){
        tpl.exercises[i][field]= inp.value ? inp.value.trim() : "ytsearch";
      }else tpl.exercises[i][field]=inp.value;
    };
  });

  view.querySelectorAll("[data-move]").forEach(btn=>{
    btn.onclick=()=>{
      const i=Number(btn.dataset.i);
      const j=btn.dataset.move==="up"?i-1:i+1;
      if(j<0 || j>=tpl.exercises.length) return;
      const tmp=tpl.exercises[i]; tpl.exercises[i]=tpl.exercises[j]; tpl.exercises[j]=tmp;
      TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
      templateEditView(tplId);
    };
  });

  view.querySelectorAll("[data-del]").forEach(btn=>{
    btn.onclick=()=>{
      const i=Number(btn.dataset.del);
      if(confirm("Delete this exercise?")){
        tpl.exercises.splice(i,1);
        TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
        templateEditView(tplId);
      }
    };
  });

  document.getElementById("addEx").onclick=()=>{
    tpl.exercises.push({id:crypto.randomUUID(), name:"New Exercise", sets:3, reps:"10–12", rest:90, video:"ytsearch"});
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    templateEditView(tplId);
  };

  document.getElementById("saveTplBtn").onclick=()=>{
    TEMPLATES[idx]=tpl; saveTemplates(TEMPLATES);
    toast("Template saved ✅");
  };

  document.getElementById("backTpls").onclick=templatesView;
}

/* Boot */
function boot(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js?v=sl-p1").catch(()=>{});
  }
  const draft=sessionStorage.getItem("steadylog.draft");
  if(draft){
    try{
      activeWorkout=JSON.parse(draft);
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
