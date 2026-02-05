/* Steady Log (V1) - iPhone PWA - weights-only */
const STORAGE_KEY = "steadylog.sessions.v1";
const SETTINGS_KEY = "steadylog.settings.v1";

const TEMPLATES = [
  {
    id: "upperA",
    name: "Upper A",
    subtitle: "Chest & Arms",
    exercises: [
      { id:"smith_bench", name:"Smith Bench Press", sets:3, reps:"8–10" },
      { id:"chest_press", name:"Chest Press Machine", sets:3, reps:"10–12" },
      { id:"row_machine", name:"Seated Row Machine", sets:3, reps:"10–12" },
      { id:"shoulder_press", name:"Shoulder Press Machine", sets:3, reps:"8–10" },
      { id:"tri_pushdown", name:"Tricep Pushdown", sets:3, reps:"12–15" },
      { id:"preacher_curl", name:"Preacher Curl Machine", sets:3, reps:"12–15" },
    ]
  },
  {
    id: "lowerA",
    name: "Lower A",
    subtitle: "Quads & Burn",
    exercises: [
      { id:"smith_squat", name:"Smith Squat", sets:4, reps:"6–8" },
      { id:"leg_press", name:"45° Leg Press", sets:3, reps:"12–15" },
      { id:"walking_lunges", name:"Walking Lunges", sets:2, reps:"20 steps" },
      { id:"leg_ext", name:"Leg Extension", sets:3, reps:"12–15" },
      { id:"standing_calves", name:"Standing Calf Raise", sets:3, reps:"15–20" },
    ]
  },
  {
    id: "upperB",
    name: "Upper B",
    subtitle: "Back & Shoulders",
    exercises: [
      { id:"lat_pulldown", name:"Lat Pulldown", sets:3, reps:"8–12" },
      { id:"assist_pullup", name:"Assisted Pull-Up Machine", sets:3, reps:"6–10" },
      { id:"pec_deck", name:"Pec Deck / Fly", sets:3, reps:"12–15" },
      { id:"rear_delt", name:"Rear Delt Machine", sets:3, reps:"12–15" },
      { id:"face_pull", name:"Face Pull (Cable)", sets:3, reps:"12–15" },
      { id:"hammer_curl", name:"Hammer Curl Machine", sets:3, reps:"10–12" },
    ]
  },
  {
    id: "lowerB",
    name: "Lower B",
    subtitle: "Hamstrings & Glutes",
    exercises: [
      { id:"smith_rdl", name:"Smith RDL", sets:3, reps:"8–10" },
      { id:"lying_curl", name:"Lying Leg Curl", sets:3, reps:"10–12" },
      { id:"hip_thrust", name:"Hip Thrust Machine", sets:3, reps:"8–10" },
      { id:"smith_split", name:"Smith Split Squat", sets:2, reps:"10 / leg" },
      { id:"seated_calves", name:"Seated Calf Raise", sets:3, reps:"15–20" },
    ]
  }
];

function nowISO(){
  return new Date().toISOString();
}
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

function loadSessions(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveSessions(sessions){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { };
  }catch(e){ return {}; }
}
function saveSettings(s){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function setPill(text){
  document.getElementById("pillStatus").textContent = text;
}

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

function computeStats(){
  const sessions = loadSessions();
  const total = sessions.length;
  const last = total ? sessions[total-1].startedAt : null;

  // Best set per exercise (max weight; if tie, max reps)
  const best = {};
  for(const ses of sessions){
    for(const ex of ses.exercises){
      for(const s of (ex.sets||[])){
        const w = Number(s.kg)||0, r=Number(s.reps)||0;
        if(!best[ex.id] || w > best[ex.id].kg || (w === best[ex.id].kg && r > best[ex.id].reps)){
          best[ex.id] = { kg:w, reps:r, at: ses.startedAt, exName: ex.name };
        }
      }
    }
  }
  return { total, last, best };
}

/* Views */
const view = document.getElementById("view");

function homeView(){
  setPill("Ready");
  const stats = computeStats();
  const lastText = stats.last ? fmtDate(stats.last) : "—";
  view.innerHTML = `
    <div class="card">
      <h2>Start Workout</h2>
      <p>Tap a template. Log sets in KG + reps. Finish to save.</p>
      <div class="hr"></div>
      <div class="grid">
        ${TEMPLATES.map(t=>`
          <button class="btn primary" data-action="start" data-id="${t.id}">
            ${t.name} <span class="tag">${t.subtitle}</span>
          </button>
        `).join("")}
      </div>
      <div class="hr"></div>
      <div class="kpi">
        <div class="tile"><b>${stats.total}</b><span>sessions logged</span></div>
        <div class="tile"><b>${lastText}</b><span>last session</span></div>
      </div>
    </div>

    <div class="section-title">Weekly Structure</div>
    <div class="card">
      <p class="muted">
        Mon Upper A • Tue Lower A • Thu Upper B • Fri Lower B<br/>
        Steps: target 20k/day • Optional Stairmaster 2–3×/week (10–15 mins)
      </p>
    </div>
  `;

  view.querySelectorAll('[data-action="start"]').forEach(btn=>{
    btn.addEventListener("click", ()=> startWorkout(btn.dataset.id));
  });
}

let activeWorkout = null;

function startWorkout(templateId){
  const tpl = TEMPLATES.find(t=>t.id===templateId);
  if(!tpl) return;

  activeWorkout = {
    id: crypto.randomUUID(),
    templateId: tpl.id,
    name: tpl.name,
    subtitle: tpl.subtitle,
    startedAt: nowISO(),
    exercises: tpl.exercises.map(ex=> ({
      id: ex.id,
      name: ex.name,
      targetSets: ex.sets,
      targetReps: ex.reps,
      sets: []
    }))
  };

  workoutView();
  toast(`${tpl.name} started`);
}

function addSet(exIndex){
  const ex = activeWorkout.exercises[exIndex];
  const lastSets = getLastSetsForExercise(ex.id);
  const suggestedKg = lastSets.length ? (Number(lastSets[0].kg)||"") : "";
  ex.sets.push({ kg: suggestedKg, reps: "", done: false });
  workoutView();
}

function updateSet(exIndex, setIndex, field, value){
  const s = activeWorkout.exercises[exIndex].sets[setIndex];
  if(field === "kg" || field === "reps"){
    s[field] = value === "" ? "" : Number(value);
  }else{
    s[field] = value;
  }
  // Save draft to sessionStorage to survive accidental nav
  sessionStorage.setItem("steadylog.draft", JSON.stringify(activeWorkout));
}

function toggleDone(exIndex, setIndex){
  const s = activeWorkout.exercises[exIndex].sets[setIndex];
  s.done = !s.done;
  workoutView();
  sessionStorage.setItem("steadylog.draft", JSON.stringify(activeWorkout));
}

function deleteSet(exIndex, setIndex){
  activeWorkout.exercises[exIndex].sets.splice(setIndex,1);
  workoutView();
  sessionStorage.setItem("steadylog.draft", JSON.stringify(activeWorkout));
}

function workoutView(){
  if(!activeWorkout){
    homeView();
    return;
  }
  setPill("In session");
  view.innerHTML = `
    <div class="card">
      <h2>${activeWorkout.name} <span class="tag">${activeWorkout.subtitle}</span></h2>
      <p class="muted">Started: ${fmtDate(activeWorkout.startedAt)}</p>
      <div class="hr"></div>

      <div class="list">
        ${activeWorkout.exercises.map((ex, idx)=>{
          const last = getLastSetsForExercise(ex.id);
          const lastStr = last.length ? last.slice(0,3).map(s=>`${s.kg}kg×${s.reps}`).join(", ") : "—";
          return `
            <div class="exercise">
              <div class="exercise-head">
                <div>
                  <div class="exercise-name">${ex.name}</div>
                  <div class="exercise-meta">🎯 ${ex.targetSets} sets • ${ex.targetReps} reps • Last: ${lastStr}</div>
                </div>
                <button class="btn" style="width:auto; padding:10px 12px;" data-action="addset" data-idx="${idx}">+ Set</button>
              </div>

              <div class="sets">
                ${(ex.sets||[]).map((s, sidx)=>`
                  <div class="set">
                    <input inputmode="decimal" class="input" placeholder="KG" value="${s.kg ?? ""}" data-action="kg" data-idx="${idx}" data-sidx="${sidx}">
                    <input inputmode="numeric" class="input" placeholder="Reps" value="${s.reps ?? ""}" data-action="reps" data-idx="${idx}" data-sidx="${sidx}">
                    <button class="smallbtn ok ${s.done ? "ok": ""}" data-action="done" data-idx="${idx}" data-sidx="${sidx}">✓</button>
                    <button class="smallbtn del" data-action="del" data-idx="${idx}" data-sidx="${sidx}">🗑</button>
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <div style="height:10px"></div>
  `;

  // Attach events
  view.querySelectorAll('[data-action="addset"]').forEach(b=>{
    b.addEventListener("click", ()=> addSet(Number(b.dataset.idx)));
  });

  view.querySelectorAll('input[data-action="kg"]').forEach(inp=>{
    inp.addEventListener("input", ()=> updateSet(Number(inp.dataset.idx), Number(inp.dataset.sidx), "kg", inp.value));
  });
  view.querySelectorAll('input[data-action="reps"]').forEach(inp=>{
    inp.addEventListener("input", ()=> updateSet(Number(inp.dataset.idx), Number(inp.dataset.sidx), "reps", inp.value));
  });

  view.querySelectorAll('button[data-action="done"]').forEach(btn=>{
    btn.addEventListener("click", ()=> toggleDone(Number(btn.dataset.idx), Number(btn.dataset.sidx)));
  });
  view.querySelectorAll('button[data-action="del"]').forEach(btn=>{
    btn.addEventListener("click", ()=> deleteSet(Number(btn.dataset.idx), Number(btn.dataset.sidx)));
  });

  // Footer actions override
  setFooterActions([
    { label: "Finish & Save", cls:"primary", onClick: finishWorkout },
    { label: "Cancel", cls:"danger", onClick: cancelWorkout },
  ]);
}

function setFooterActions(actions){
  const wrap = document.querySelector(".footerbar .wrap");
  wrap.innerHTML = actions.map((a,i)=>`<button class="btn ${a.cls||"ghost"}" data-foot="${i}">${a.label}</button>`).join("");
  wrap.querySelectorAll("[data-foot]").forEach(btn=>{
    btn.addEventListener("click", ()=> actions[Number(btn.dataset.foot)].onClick());
  });
}

function resetFooterNav(){
  const wrap = document.querySelector(".footerbar .wrap");
  wrap.innerHTML = `
    <button class="btn ghost" id="navHome">Home</button>
    <button class="btn ghost" id="navHistory">History</button>
    <button class="btn ghost" id="navExercises">Exercises</button>
    <button class="btn ghost" id="navExport">Export</button>
  `;
  document.getElementById("navHome").onclick = ()=>{ activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); homeView(); resetFooterNav(); };
  document.getElementById("navHistory").onclick = ()=>{ activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); historyView(); resetFooterNav(); };
  document.getElementById("navExercises").onclick = ()=>{ activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); exercisesView(); resetFooterNav(); };
  document.getElementById("navExport").onclick = ()=>{ activeWorkout=null; sessionStorage.removeItem("steadylog.draft"); exportView(); resetFooterNav(); };
}

function finishWorkout(){
  // Basic validation: ignore empty sets
  for(const ex of activeWorkout.exercises){
    ex.sets = (ex.sets||[]).filter(s => (Number(s.kg)||0) > 0 && (Number(s.reps)||0) > 0);
  }

  const sessions = loadSessions();
  sessions.push(activeWorkout);
  saveSessions(sessions);
  sessionStorage.removeItem("steadylog.draft");
  toast("Saved ✅");
  activeWorkout = null;
  resetFooterNav();
  homeView();
}

function cancelWorkout(){
  if(confirm("Cancel this workout? (Nothing will be saved)")){
    activeWorkout = null;
    sessionStorage.removeItem("steadylog.draft");
    toast("Cancelled");
    resetFooterNav();
    homeView();
  }
}

function historyView(){
  setPill("History");
  const sessions = loadSessions();
  view.innerHTML = `
    <div class="card">
      <h2>History</h2>
      <p class="muted">Tap a session to review.</p>
      <div class="hr"></div>
      <div class="list">
        ${sessions.length ? sessions.slice().reverse().map(s=>`
          <button class="btn" data-action="openSession" data-id="${s.id}">
            ${s.name} <span class="tag">${new Date(s.startedAt).toLocaleDateString()}</span>
          </button>
        `).join("") : `<p class="muted">No sessions yet. Start with Upper A.</p>`}
      </div>
    </div>
  `;

  view.querySelectorAll('[data-action="openSession"]').forEach(b=>{
    b.addEventListener("click", ()=> sessionDetailView(b.dataset.id));
  });
}

function sessionDetailView(sessionId){
  const sessions = loadSessions();
  const s = sessions.find(x=>x.id===sessionId);
  if(!s){ historyView(); return; }
  setPill("Session");
  view.innerHTML = `
    <div class="card">
      <h2>${s.name} <span class="tag">${s.subtitle}</span></h2>
      <p class="muted">${fmtDate(s.startedAt)}</p>
      <div class="hr"></div>
      <div class="list">
        ${s.exercises.map(ex=>`
          <div class="exercise">
            <div class="exercise-name">${ex.name}</div>
            <div class="exercise-meta">🎯 ${ex.targetSets} sets • ${ex.targetReps} reps</div>
            <div class="hr"></div>
            <p class="muted">${(ex.sets||[]).map(st=>`${st.kg}kg×${st.reps}`).join(" • ") || "—"}</p>
          </div>
        `).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn danger" id="deleteSession">Delete this session</button>
      <div style="height:10px"></div>
      <button class="btn" id="backHistory">Back</button>
    </div>
  `;
  document.getElementById("backHistory").onclick = historyView;
  document.getElementById("deleteSession").onclick = ()=>{
    if(confirm("Delete this session permanently?")){
      saveSessions(sessions.filter(x=>x.id!==sessionId));
      toast("Deleted");
      historyView();
    }
  };
}

function exercisesView(){
  setPill("Exercises");
  const sessions = loadSessions();
  // Derive list from templates (editable later)
  const exMap = new Map();
  for(const t of TEMPLATES){
    for(const ex of t.exercises){
      exMap.set(ex.id, ex.name);
    }
  }
  const exList = Array.from(exMap.entries()).map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name));

  const stats = computeStats();

  view.innerHTML = `
    <div class="card">
      <h2>Exercises</h2>
      <p class="muted">Tap to see your best set + recent history.</p>
      <div class="hr"></div>
      <div class="list">
        ${exList.map(ex=>{
          const best = stats.best[ex.id];
          const bestStr = best ? `${best.kg}kg×${best.reps}` : "—";
          return `
            <button class="btn" data-action="openEx" data-id="${ex.id}">
              ${ex.name} <span class="tag">Best: ${bestStr}</span>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;

  view.querySelectorAll('[data-action="openEx"]').forEach(b=>{
    b.addEventListener("click", ()=> exerciseDetailView(b.dataset.id));
  });
}

function exerciseDetailView(exId){
  const sessions = loadSessions();
  const entries = [];
  let exName = exId;
  for(const ses of sessions){
    for(const ex of ses.exercises){
      if(ex.id === exId){
        exName = ex.name;
        for(const st of (ex.sets||[])){
          entries.push({ at: ses.startedAt, kg: st.kg, reps: st.reps });
        }
      }
    }
  }
  entries.sort((a,b)=> new Date(b.at) - new Date(a.at));
  const best = entries.reduce((acc,cur)=>{
    if(!acc) return cur;
    if(cur.kg > acc.kg) return cur;
    if(cur.kg === acc.kg && cur.reps > acc.reps) return cur;
    return acc;
  }, null);

  setPill("Exercise");
  view.innerHTML = `
    <div class="card">
      <h2>${exName}</h2>
      <p class="muted">Best: ${best ? `${best.kg}kg×${best.reps}` : "—"}</p>
      <div class="hr"></div>
      <div class="list">
        ${entries.length ? entries.slice(0,30).map(e=>`
          <div class="exercise">
            <div class="exercise-head">
              <div>
                <div class="exercise-name">${e.kg}kg × ${e.reps}</div>
                <div class="exercise-meta">${new Date(e.at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        `).join("") : `<p class="muted">No logs yet for this exercise.</p>`}
      </div>
      <div class="hr"></div>
      <button class="btn" id="backExercises">Back</button>
    </div>
  `;
  document.getElementById("backExercises").onclick = exercisesView;
}

function exportView(){
  setPill("Export");
  const sessions = loadSessions();
  view.innerHTML = `
    <div class="card">
      <h2>Export</h2>
      <p class="muted">Download a CSV backup. Keep your data safe.</p>
      <div class="hr"></div>
      <button class="btn primary" id="btnCsv">Download CSV</button>
      <div style="height:10px"></div>
      <button class="btn danger" id="btnWipe">Wipe all data</button>
      <div class="hr"></div>
      <p class="muted">Tip: iPhone → save the CSV to Files.</p>
    </div>
  `;

  document.getElementById("btnCsv").onclick = ()=> downloadCSV(sessions);
  document.getElementById("btnWipe").onclick = ()=>{
    if(confirm("Wipe ALL Steady Log data from this phone?")){
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("steadylog.draft");
      toast("Wiped");
      exportView();
    }
  };
}

function downloadCSV(sessions){
  const rows = [["date","workout","exercise","set_index","kg","reps"]];
  for(const ses of sessions){
    for(const ex of ses.exercises){
      (ex.sets||[]).forEach((st, idx)=>{
        rows.push([ses.startedAt, ses.name, ex.name, String(idx+1), String(st.kg), String(st.reps)]);
      });
    }
  }
  const csv = rows.map(r=> r.map(v=> `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `steady-log-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast("CSV downloaded");
}

/* Boot */
function boot(){
  // Register service worker
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }

  // restore draft if present
  const draft = sessionStorage.getItem("steadylog.draft");
  if(draft){
    try{
      activeWorkout = JSON.parse(draft);
      workoutView();
      setFooterActions([
        { label: "Finish & Save", cls:"primary", onClick: finishWorkout },
        { label: "Cancel", cls:"danger", onClick: cancelWorkout },
      ]);
      return;
    }catch(e){
      sessionStorage.removeItem("steadylog.draft");
    }
  }

  // Default nav
  resetFooterNav();
  homeView();
}

boot();
