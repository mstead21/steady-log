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
      { id:"walking_lunges", name:"Walking Lunges", sets:2, reps:"20 steps", rest:90, videoSearch:"walking lunges form" },
      { id:"leg_ext", name:"Leg Extension", sets:3, reps:"12–15", rest:60, videoSearch:"leg extension machine form" },
      { id:"standing_calves", name:"Standing Calf Raise", sets:3, reps:"15–20", rest:60, videoSearch:"standing calf raise machine form" }
    ]
  },
  {
    id: "upperB",
    name: "Upper B",
    subtitle: "Back & Shoulders",
    exercises: [
      { id:"assist_pullup", name:"Assisted Pull-Up Machine", sets:3, reps:"6–10", rest:120, videoSearch:"assisted pull up machine form" },
      { id:"lat_pulldown", name:"Lat Pulldown", sets:3, reps:"8–12", rest:90, videoSearch:"lat pulldown form" },
      { id:"rear_delt", name:"Rear Delt Machine", sets:3, reps:"12–15", rest:60, videoSearch:"rear delt machine form" },
      { id:"face_pull", name:"Face Pull (Cable)", sets:3, reps:"12–15", rest:60, videoSearch:"cable face pull form" },
      { id:"pec_deck", name:"Pec Deck / Fly (Light)", sets:2, reps:"12–15", rest:60, videoSearch:"pec deck machine fly form" },
      { id:"hammer_curl", name:"DB Hammer Curl", sets:3, reps:"10–12", rest:60, videoSearch:"dumbbell hammer curl form" }
    ]
  },
  {
    id: "lowerB",
    name: "Lower B",
    subtitle: "Hamstrings & Glutes",
    exercises: [
      { id:"smith_rdl", name:"Smith Romanian Deadlift", sets:3, reps:"6–8", rest:120, videoSearch:"smith machine romanian deadlift form" },
      { id:"hip_thrust", name:"Hip Thrust Machine", sets:3, reps:"8–10", rest:90, videoSearch:"hip thrust machine form" },
      { id:"lying_curl", name:"Lying Leg Curl", sets:3, reps:"10–12", rest:90, videoSearch:"lying leg curl machine form" },
      { id:"smith_split", name:"Smith Split Squat", sets:2, reps:"10 / leg", rest:90, videoSearch:"smith machine split squat form" },
      { id:"seated_calves", name:"Seated Calf Raise", sets:3, reps:"15–20", rest:60, videoSearch:"seated calf raise machine form" }
    ]
  }
];

/* Utils */
function nowISO(){ return new Date().toISOString(); }
function todayYMD(){ return new Date().toISOString().slice(0,10); }
function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday:"short", year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}
function toast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1600);
}
function vibrate(pattern=[120,60,120]){ try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){} }
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(str){
  return String(str ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}
function loadJSON(key,fallback){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch(e){ return fallback; } }
function saveJSON(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
function avg(arr){ if(!arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length; }

/* Data */
function loadSessions(){ return loadJSON(STORAGE_KEY, []); }
function saveSessions(s){ saveJSON(STORAGE_KEY, s); }

function loadTemplates(){
  const saved = loadJSON(TEMPLATES_KEY, null);
  if(saved && Array.isArray(saved) && saved.length) return saved;
  return DEFAULT_TEMPLATES;
}
function saveTemplates(tpls){ saveJSON(TEMPLATES_KEY, tpls); }

function loadTracker(){ return loadJSON(TRACKER_KEY, { weights:[], waists:[] }); }
function saveTracker(t){ saveJSON(TRACKER_KEY, t); }

function loadMacros(){ return loadJSON(MACROS_KEY, {}); }
function saveMacros(m){ saveJSON(MACROS_KEY, m); }

/* Suggested KG */
function getLastSetsForExercise(exId){
  const sessions = loadSessions();
  for(let i=sessions.length-1;i>=0;i--){
    const ses=sessions[i];
    for(const ex of ses.exercises){
      if(ex.id===exId && ex.sets && ex.sets.length) return ex.sets;
    }
  }
  return [];
}
function getSuggestedKg(exId){
  const lastSets = getLastSetsForExercise(exId);
  if(!lastSets.length) return "";
  const last = lastSets[lastSets.length-1];
  return (Number(last.kg)||"");
}

/* Stats + streaks */
function ymdFromISO(iso){ return new Date(iso).toISOString().slice(0,10); }
function computeStats(){
  const sessions = loadSessions();
  const total=sessions.length;
  const last= total? sessions[sessions.length-1].startedAt : null;
  const best={};
  for(const ses of sessions){
    for(const ex of ses.exercises){
      for(const st of (ex.sets||[])){
        const kg=Number(st.kg)||0, reps=Number(st.reps)||0;
        if(!best[ex.id] || kg>best[ex.id].kg || (kg===best[ex.id].kg && reps>best[ex.id].reps)) best[ex.id]={kg,reps,at:ses.startedAt};
      }
    }
  }
  return {total,last,best};
}
function calcWorkoutStreak(){
  const sessions = loadSessions();
  if(!sessions.length) return 0;
  const days = Array.from(new Set(sessions.map(s=>ymdFromISO(s.startedAt)))).sort();
  let streak=0;
  let cur=todayYMD();
  for(let i=days.length-1;i>=0;i--){
    const d=days[i];
    if(d===cur){
      streak++;
      const dt=new Date(cur+"T00:00:00Z");
      dt.setUTCDate(dt.getUTCDate()-1);
      cur=dt.toISOString().slice(0,10);
    }
  }
  return streak;
}
function calcMacrosStreak(){
  const m=loadMacros();
  const days=Object.keys(m).sort();
  if(!days.length) return 0;
  let streak=0;
  let cur=todayYMD();
  for(let i=days.length-1;i>=0;i--){
    const d=days[i];
    const row=m[d];
    const ok=row && (Number(row.calories)||0)>0;
    if(d===cur && ok){
      streak++;
      const dt=new Date(cur+"T00:00:00Z");
      dt.setUTCDate(dt.getUTCDate()-1);
      cur=dt.toISOString().slice(0,10);
    }
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
function openVideo(title, searchOrUrl){
  // Reliability-first on iPhone: open a real YouTube page (search or direct URL).
  const q = (searchOrUrl || "").trim();
  currentSearch = q;

  const youtubeUrl = q
    ? (q.startsWith("http") ? q : youtubeWebSearchUrl(q))
    : "https://www.youtube.com/";

  videoTitle.textContent = `Video • ${title}`;
  videoFrame.innerHTML = `
    <div class="videoPlaceholder">
      <div class="vpTitle">Watch this exercise</div>
      <div class="vpSub">Tap <b>Open in YouTube</b> to play (best reliability on iPhone).</div>
    </div>`;

  videoOpenNew.onclick = ()=> window.open(youtubeUrl, "_blank", "noopener,noreferrer");

  videoModal.classList.add("show");
  videoModal.setAttribute("aria-hidden","false");
}
function closeVideo(){{
  videoFrame.innerHTML = "";
  videoModal.classList.remove("show");
  videoModal.setAttribute("aria-hidden","true");
}
videoClose.onclick = closeVideo;
videoOpenNew.onclick = ()=>{ if(currentSearch) window.open(youtubeWebSearchUrl(currentSearch), "_blank"); };
videoModal.addEventListener("click",(e)=>{ if(e.target===videoModal) closeVideo(); });

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
    b.onclick = ()=>{ timerEndsAt += Number(b.dataset.tquick)*1000; toast("Added"); };
  });

  const tick=()=>{
    const remain=Math.max(0, timerEndsAt-Date.now());
    const sec=Math.ceil(remain/1000);
    const m=String(Math.floor(sec/60));
    const s=String(sec%60).padStart(2,"0");
    const clock=overlay.querySelector("#timerClock");
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
let TEMPLATES = loadTemplates();
let activeWorkout = null;

function setPill(text){ document.getElementById("pillStatus").textContent=text; }

function setFooterNav(active){
  const wrap = document.getElementById("footerWrap");
  const items = [
    {id:"home", label:"Home", ico:"🏠", on:homeView},
    {id:"history", label:"History", ico:"🗓️", on:historyView},
    {id:"exercises", label:"Exercises", ico:"🏋️", on:exercisesView},
    {id:"tracker", label:"Tracker", ico:"📈", on:trackerView},
    {id:"export", label:"Export", ico:"⬇️", on:exportView}
  ];
  wrap.innerHTML = items.map(x=>`
    <button class="navbtn ${active===x.id?"active":""}" data-nav="${x.id}">
      <div class="ico">${x.ico}</div>
      <div>${x.label}</div>
    </button>
  `).join("");
  wrap.querySelectorAll("[data-nav]").forEach(b=>{
    b.onclick = ()=>{
      stopTimer();
      const id=b.dataset.nav;
      const item=items.find(x=>x.id===id);
      if(item) item.on();
      setFooterNav(id);
    };
  });
}
function setFooterActions(actions){
  const wrap = document.getElementById("footerWrap");
  wrap.innerHTML = actions.map((a,i)=>`<button class="btn ${a.cls||"ghost"}" data-foot="${i}">${a.label}</button>`).join("");
  wrap.querySelectorAll("[data-foot]").forEach(btn=>{
    btn.onclick = ()=> actions[Number(btn.dataset.foot)].onClick();
  });
}
function pct(n,t){ if(!t) return 0; return Math.max(0, Math.min(100, (n/t)*100)); }

/* Home */
function homeView(){
  TEMPLATES = loadTemplates();
  setPill("Ready");

  const stats=computeStats();
  const lastText = stats.last? fmtDate(stats.last) : "—";
  const wStreak = calcWorkoutStreak();
  const mStreak = calcMacrosStreak();

  const macrosAll = loadMacros();
  const d=todayYMD();
  const today = macrosAll[d] || { calories:"", protein:"", carbs:"", fat:"" };
  const cal=Number(today.calories)||0, p=Number(today.protein)||0, c=Number(today.carbs)||0, f=Number(today.fat)||0;

  const tr = loadTracker();
  const weightsSorted = (tr.weights||[]).slice().sort((a,b)=>(a.date>b.date?1:-1));
  const last7 = weightsSorted.slice(-7).map(x=>Number(x.kg)||0).filter(x=>x>0);
  const last7Avg = last7.length ? avg(last7) : 0;

  view.innerHTML = `
    <div class="card">
      <h2>Dashboard</h2>
      <div class="hr"></div>
      <div class="list">
        <div class="exercise"><div class="exercise-name">${stats.total}</div><div class="exercise-meta">sessions logged</div></div>
        <div class="exercise"><div class="exercise-name">${lastText}</div><div class="exercise-meta">last session</div></div>
        <div class="exercise"><div class="exercise-name">${wStreak} 🔥</div><div class="exercise-meta">workout streak</div></div>
        <div class="exercise"><div class="exercise-name">${mStreak} ✅</div><div class="exercise-meta">macros streak</div></div>
        <div class="exercise"><div class="exercise-name">${last7Avg? last7Avg.toFixed(1) : "—"}</div><div class="exercise-meta">7-day avg weight</div></div>
      </div>
    </div>

    <div class="section-title">Start Workout</div>
    <div class="card">
      <div class="grid">
        ${TEMPLATES.map(t=>`
          <button class="btn primary" data-start="${t.id}">
            ${escapeHtml(t.name)}<span class="tag">${escapeHtml(t.subtitle||"")}</span>
          </button>
        `).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn" id="btnTemplateEditor">Edit Templates</button>
    </div>

    <div class="section-title">Today's Macros</div>
    <div class="card">
      <div class="grid">
        <input class="input" id="mCal" inputmode="numeric" placeholder="Calories" value="${escapeAttr(today.calories)}">
        <input class="input" id="mP" inputmode="numeric" placeholder="Protein (g)" value="${escapeAttr(today.protein)}">
        <input class="input" id="mC" inputmode="numeric" placeholder="Carbs (g)" value="${escapeAttr(today.carbs)}">
        <input class="input" id="mF" inputmode="numeric" placeholder="Fat (g)" value="${escapeAttr(today.fat)}">
      </div>
      <div style="height:10px"></div>
      <button class="btn primary" id="saveMacrosBtn">Save Today</button>

      <div class="hr"></div>
      <div class="exercise">
        <div class="exercise-name">Progress</div>
        <div class="exercise-meta">Calories: ${cal}/${MACRO_TARGETS.calories}</div>
        <div class="bar"><div style="width:${pct(cal,MACRO_TARGETS.calories).toFixed(0)}%"></div></div>

        <div style="height:10px"></div>
        <div class="exercise-meta">Protein: ${p}/${MACRO_TARGETS.protein}</div>
        <div class="bar"><div style="width:${pct(p,MACRO_TARGETS.protein).toFixed(0)}%"></div></div>

        <div style="height:10px"></div>
        <div class="exercise-meta">Carbs: ${c}/${MACRO_TARGETS.carbs}</div>
        <div class="bar"><div style="width:${pct(c,MACRO_TARGETS.carbs).toFixed(0)}%"></div></div>

        <div style="height:10px"></div>
        <div class="exercise-meta">Fat: ${f}/${MACRO_TARGETS.fat}</div>
        <div class="bar"><div style="width:${pct(f,MACRO_TARGETS.fat).toFixed(0)}%"></div></div>
      </div>
    </div>
  `;

  view.querySelectorAll("[data-start]").forEach(btn=>btn.onclick=()=>startWorkout(btn.dataset.start));
  document.getElementById("btnTemplateEditor").onclick = templatesView;

  document.getElementById("saveMacrosBtn").onclick = ()=>{
    const m=loadMacros();
    m[d] = {
      calories: Number(document.getElementById("mCal").value)||0,
      protein:  Number(document.getElementById("mP").value)||0,
      carbs:    Number(document.getElementById("mC").value)||0,
      fat:      Number(document.getElementById("mF").value)||0
    };
    saveMacros(m);
    toast("Macros saved ✅");
    homeView();
  };

  setFooterNav("home");
}

/* Tracker */
function trackerView(){
  setPill("Tracker");
  const t=loadTracker();
  const d=todayYMD();

  const weightsSorted=(t.weights||[]).slice().sort((a,b)=>(a.date>b.date?1:-1));
  const waistsSorted=(t.waists||[]).slice().sort((a,b)=>(a.date>b.date?1:-1));
  const lastW=weightsSorted.slice(-1)[0];
  const lastWaist=waistsSorted.slice(-1)[0];

  const last7 = weightsSorted.slice(-7).map(x=>Number(x.kg)||0).filter(x=>x>0);
  const last7Avg = last7.length ? avg(last7) : 0;

  view.innerHTML = `
    <div class="card">
      <h2>Cut Tracker</h2>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Daily Weight</div>
      <input class="input" id="wtKg" inputmode="decimal" placeholder="Weight (kg)">
      <div style="height:10px"></div>
      <button class="btn primary" id="saveWeight">Save Weight</button>
      <div class="hr"></div>
      <div class="exercise-meta">Last: <b>${lastW ? (lastW.kg + " kg ("+lastW.date+")") : "—"}</b></div>
      <div class="exercise-meta">7-day avg: <b>${last7Avg ? last7Avg.toFixed(1) : "—"}</b></div>

      <div class="hr"></div>
      <div class="section-title">Weekly Waist</div>
      <input class="input" id="waistCm" inputmode="decimal" placeholder="Waist (cm)">
      <div style="height:10px"></div>
      <button class="btn primary" id="saveWaist">Save Waist</button>
      <div class="hr"></div>
      <div class="exercise-meta">Last: <b>${lastWaist ? (lastWaist.cm + " cm ("+lastWaist.date+")") : "—"}</b></div>
    </div>
  `;

  document.getElementById("saveWeight").onclick = ()=>{
    const kg=Number(document.getElementById("wtKg").value);
    if(!kg){ alert("Enter weight"); return; }
    const tt=loadTracker();
    tt.weights.push({date:d, kg});
    saveTracker(tt);
    toast("Weight saved ✅");
    trackerView();
  };

  document.getElementById("saveWaist").onclick = ()=>{
    const cm=Number(document.getElementById("waistCm").value);
    if(!cm){ alert("Enter waist"); return; }
    const tt=loadTracker();
    tt.waists.push({date:d, cm});
    saveTracker(tt);
    toast("Waist saved ✅");
    trackerView();
  };

  setFooterNav("tracker");
}

/* Workout flow */
function startWorkout(templateId){
  TEMPLATES=loadTemplates();
  const tpl=TEMPLATES.find(t=>t.id===templateId);
  if(!tpl) return;

  activeWorkout={
    id: crypto.randomUUID(),
    templateId: tpl.id,
    name: tpl.name,
    subtitle: tpl.subtitle||"",
    startedAt: nowISO(),
    notes: "",
    exercises: (tpl.exercises||[]).map(ex=>({
      id: ex.id,
      name: ex.name,
      targetSets: Number(ex.sets)||0,
      targetReps: ex.reps||"",
      rest: Number(ex.rest)||60,
      videoSearch: ex.videoSearch||"",
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
  const ex=activeWorkout.exercises[exIndex];
  ex.sets.push({ kg:getSuggestedKg(ex.id), reps:"", done:false });
  saveDraft();
  workoutView();
}
function updateSet(exIndex,setIndex,field,value){
  const s=activeWorkout.exercises[exIndex].sets[setIndex];
  s[field] = (value==="" ? "" : Number(value));
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
    const rest = Number(activeWorkout.exercises[exIndex].rest)||60;
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
  view.innerHTML = `
    <div class="card">
      <h2>${escapeHtml(activeWorkout.name)}<span class="tag">${escapeHtml(activeWorkout.subtitle||"")}</span></h2>
      <div class="exercise-meta">Started: ${fmtDate(activeWorkout.startedAt)}</div>
      <div class="hr"></div>

      <div class="section-title" style="margin-top:0;">Session Notes</div>
      <textarea id="sessionNotes" class="input" style="min-height:64px; resize:vertical;" placeholder="Notes (optional)">${escapeHtml(activeWorkout.notes||"")}</textarea>

      <div class="hr"></div>

      <div class="list">
        ${activeWorkout.exercises.map((ex,idx)=>{
          const last=getLastSetsForExercise(ex.id);
          const lastStr = last.length ? last.slice(0,3).map(s=>`${s.kg}kg×${s.reps}`).join(", ") : "—";
          const rest = Number(ex.rest)||60;

          return `
          <div class="exercise">
            <div class="exercise-head">
              <div style="flex:1">
                <div class="exercise-name">${escapeHtml(ex.name)}</div>
                <div class="exercise-meta">🎯 ${ex.targetSets} sets • ${escapeHtml(ex.targetReps)} • Rest: ${rest}s • Last: ${escapeHtml(lastStr)}</div>
              </div>
              <div style="display:flex; gap:8px; align-items:center">
                <button class="btn small" style="width:auto" data-video="${idx}">▶ Video</button>
                <button class="btn small" style="width:auto" data-add="${idx}">+ Set</button>
              </div>
            </div>

            <div style="display:flex; gap:8px; align-items:center; margin-top:10px">
              <span class="tag">Note</span>
              <input class="input" style="padding:10px" value="${escapeAttr(ex.note||"")}" placeholder="e.g. slow tempo / drop set" data-exnote="${idx}">
            </div>

            ${(ex.sets||[]).map((s,sidx)=>`
              <div class="set">
                <input class="input" inputmode="decimal" placeholder="KG" value="${s.kg ?? ""}" data-role="kg" data-kg="${idx}:${sidx}">
                <input class="input" inputmode="numeric" placeholder="Reps" value="${s.reps ?? ""}" data-role="reps" data-reps="${idx}:${sidx}">
                <button class="smallbtn ok ${s.done?"on":""}" data-role="done" data-done="${idx}:${sidx}">✓</button>
                <button class="smallbtn del" data-role="del" data-del="${idx}:${sidx}">🗑</button>
              </div>
            `).join("")}
          </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  document.getElementById("sessionNotes").oninput = (e)=>updateSessionNotes(e.target.value);

  view.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addSet(Number(b.dataset.add)));
  view.querySelectorAll("[data-video]").forEach(b=>b.onclick=()=>{
    const ex=activeWorkout.exercises[Number(b.dataset.video)];
    openVideo(ex.name, ex.videoSearch);
  });
  view.querySelectorAll("[data-exnote]").forEach(inp=>inp.oninput=(e)=>updateExerciseNote(Number(inp.dataset.exnote), e.target.value));
  view.querySelectorAll("[data-kg]").forEach(inp=>inp.oninput=(e)=>{
    const [i,j]=inp.dataset.kg.split(":").map(Number);
    updateSet(i,j,"kg", e.target.value);
  });
  view.querySelectorAll("[data-reps]").forEach(inp=>inp.oninput=(e)=>{
    const [i,j]=inp.dataset.reps.split(":").map(Number);
    updateSet(i,j,"reps", e.target.value);
  });
  view.querySelectorAll("[data-done]").forEach(btn=>btn.onclick=()=>{
    const [i,j]=btn.dataset.done.split(":").map(Number);
    toggleDone(i,j);
  });
  view.querySelectorAll("[data-del]").forEach(btn=>btn.onclick=()=>{
    const [i,j]=btn.dataset.del.split(":").map(Number);
    deleteSet(i,j);
  });

  setFooterActions([
    {label:"Finish & Save", cls:"primary", onClick:finishWorkout},
    {label:"Rest 60s", cls:"ghost", onClick:()=>startTimer(60)},
    {label:"Cancel", cls:"danger", onClick:cancelWorkout}
  ]);
}
function finishWorkout(){
  stopTimer();
  for(const ex of activeWorkout.exercises){
    ex.sets = (ex.sets||[]).filter(s=>(Number(s.kg)||0)>0 && (Number(s.reps)||0)>0);
  }
  const sessions=loadSessions();
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

/* History */
function historyView(){
  setPill("History");
  const sessions=loadSessions();
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
  view.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>sessionDetailView(b.dataset.open));
  setFooterNav("history");
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
            <div class="exercise-meta">🎯 ${ex.targetSets} • ${escapeHtml(ex.targetReps)} • Rest: ${ex.rest}s</div>
            ${ex.note?`<div class="exercise-meta"><b>Note:</b> ${escapeHtml(ex.note)}</div>`:""}
            <div class="hr"></div>
            <div class="exercise-meta">${(ex.sets||[]).map(st=>`${st.kg}kg×${st.reps}`).join(" • ") || "—"}</div>
          </div>
        `).join("")}
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
  const exList = Array.from(exMap.entries()).map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name));

  view.innerHTML = `
    <div class="card">
      <h2>Exercises</h2>
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
  view.querySelectorAll("[data-ex]").forEach(b=>b.onclick=()=>exerciseDetailView(b.dataset.ex));
  document.getElementById("editTplFromEx").onclick = templatesView;
  setFooterNav("exercises");
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

/* Export */
function trackerToCSV(t){
  const rows = [];
  rows.push("type,date,value");
  (t.weights||[]).forEach(w=>rows.push(`weight,${w.date},${w.kg}`));
  (t.waists||[]).forEach(w=>rows.push(`waist,${w.date},${w.cm}`));
  return rows.join("\n");
}
function macrosToCSV(m){
  const rows=[["date","calories","protein","carbs","fat"]];
  Object.keys(m).sort().forEach(d=>{
    const r=m[d]||{};
    rows.push([d, r.calories||0, r.protein||0, r.carbs||0, r.fat||0]);
  });
  return rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
}
function downloadText(filename, text, mime="text/plain"){
  const blob = new Blob([text], {type:mime+";charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
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
function exportView(){
  setPill("Export");
  view.innerHTML = `
    <div class="card">
      <h2>Export</h2>
      <div class="exercise-meta">Download backups.</div>
      <div class="hr"></div>

      <button class="btn primary" id="btnCsv">Download Workout CSV</button>
      <button class="btn" id="btnExportTracker">Download Tracker CSV</button>
      <button class="btn" id="btnExportMacros">Download Macros CSV</button>

      <div style="height:10px"></div>
      <button class="btn danger" id="btnWipe">Wipe all data</button>
    </div>`;

  document.getElementById("btnCsv").onclick = ()=> downloadCSV(loadSessions());
  document.getElementById("btnExportTracker").onclick = ()=>{
    const t = loadTracker();
    downloadText(`steady-tracker-${new Date().toISOString().slice(0,10)}.csv`, trackerToCSV(t), "text/csv");
    toast("Tracker CSV downloaded ✅");
  };
  document.getElementById("btnExportMacros").onclick = ()=>{
    const m = loadMacros();
    downloadText(`steady-macros-${new Date().toISOString().slice(0,10)}.csv`, macrosToCSV(m), "text/csv");
    toast("Macros CSV downloaded ✅");
  };

  document.getElementById("btnWipe").onclick = ()=>{
    if(confirm("Wipe ALL Steady Log data from this phone?")){
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TRACKER_KEY);
      localStorage.removeItem(MACROS_KEY);
      localStorage.removeItem(TEMPLATES_KEY);
      sessionStorage.removeItem("steadylog.draft");
      toast("Wiped");
      exportView();
    }
  };
  setFooterNav("export");
}

/* Templates */
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
      <button class="btn" id="backHome">Back</button>
    </div>`;
  view.querySelectorAll("[data-tpl]").forEach(b=> b.onclick = ()=> templateEditView(b.dataset.tpl));
  document.getElementById("backHome").onclick = homeView;
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
      <div class="exercise-meta">Edit name • sets • reps • rest • video search</div>
      <div class="hr"></div>

      <div class="list">
        ${(tpl.exercises||[]).map((ex,i)=>`
          <div class="exercise">
            <div class="exercise-head">
              <div style="flex:1">
                <input class="input" style="width:100%;font-weight:900" value="${escapeAttr(ex.name)}" data-edit="name" data-i="${i}">
                <div style="display:grid;grid-template-columns:110px 1fr;gap:10px;margin-top:8px;">
                  <input class="input" inputmode="numeric" value="${ex.sets}" data-edit="sets" data-i="${i}" placeholder="Sets">
                  <input class="input" value="${escapeAttr(ex.reps)}" data-edit="reps" data-i="${i}" placeholder="Reps">
                </div>
                <div style="display:grid;grid-template-columns:110px 1fr;gap:10px;margin-top:8px;">
                  <input class="input" inputmode="numeric" value="${ex.rest||60}" data-edit="rest" data-i="${i}" placeholder="Rest (s)">
                  <input class="input" value="${escapeAttr(ex.videoSearch||"")}" data-edit="videoSearch" data-i="${i}" placeholder="YouTube search e.g. 'lat pulldown form'">
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
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn primary" id="addEx">+ Add Exercise</button>
        <button class="btn" id="saveTplBtn">Save</button>
        <button class="btn" id="backTpls">Back</button>
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
    tpl.exercises.push({id:crypto.randomUUID(), name:"New Exercise", sets:3, reps:"10–12", rest:60, videoSearch:""});
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
  homeView();
}
boot();
