/* Steady Log — FULL PREMIUM LOCKED BUILD
   Direct-to-YouTube video version
*/

const BUILD_TAG = "PREMIUM_LOCKED_A_2026_02_16_DIRECT_VIDEO";

const STORAGE_KEY   = "steadylog.sessions.v3";
const TEMPLATES_KEY = "steadylog.templates.v3";
const TRACKER_KEY   = "steadylog.tracker.v2";
const MACROS_KEY    = "steadylog.macros.v1";

const MACRO_TARGETS = { calories: 2010, protein: 210, carbs: 180, fat: 50 };

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

/* -------------------- DEFAULT TEMPLATES -------------------- */

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
  }
];

/* -------------------- State -------------------- */

let sessions = loadJSON(STORAGE_KEY, []);
let templates = loadJSON(TEMPLATES_KEY, DEFAULT_TEMPLATES);
let tracker = loadJSON(TRACKER_KEY, { weights: [], waist: [] });
let macros = loadJSON(MACROS_KEY, { days: [] });

let activeTab = "dashboard";
let activeWorkout = null;

function setStatus(text){ pillStatus.textContent = text; }

/* -------------------- VIDEO (DIRECT OPEN VERSION) -------------------- */

function openVideo(title, searchOrUrl){
  const q = (searchOrUrl || "").trim();
  if(!q) return;

  const youtubeUrl = q.startsWith("http")
    ? q
    : "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

  window.open(youtubeUrl, "_blank", "noopener,noreferrer");
}

/* -------------------- NAV -------------------- */

function navButton(id,label,ico){
  return `<button class="navbtn ${activeTab===id?"active":""}" data-nav="${id}">
    <div class="ico">${ico}</div><div>${label}</div></button>`;
}

function renderNav(){
  const wrap = $("footerWrap");
  wrap.innerHTML = [
    navButton("dashboard","Dash","🏠"),
    navButton("workout","Workout","🏋️")
  ].join("");

  wrap.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>{
    activeTab=b.dataset.nav;
    activeWorkout=null;
    render();
  });
}

/* -------------------- WORKOUT -------------------- */

function newSessionFromTemplate(tpl){
  const s = {
    id: "s_"+Math.random().toString(16).slice(2),
    date: todayStr(),
    name: tpl.name,
    createdAt: nowISO(),
    exercises: tpl.exercises.map(ex=>{
      return {
        name: ex.name,
        reps: ex.reps,
        rest: ex.rest,
        videoSearch: ex.videoSearch || "",
        sets: Array.from({length: ex.sets}, ()=>({kg:"", reps:"", done:false}))
      };
    })
  };
  sessions.push(s);
  saveJSON(STORAGE_KEY, sessions);
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
            <div class="exercise-meta">${t.subtitle||""}</div>
          </div>
          <button class="btn primary" data-start="${t.id}">Start</button>
        </div>
      </div>
    `).join("");

    return `
      <div class="card">
        <h2>Workout</h2>
        <div class="hr"></div>
        <div class="list">${tplCards}</div>
      </div>
    `;
  }

  const s = activeWorkout;
  const exHtml = s.exercises.map((ex, idx)=>`
    <div class="exercise">
      <div class="exercise-head">
        <div>
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-meta">${ex.reps} • ${ex.rest}s rest</div>
        </div>
        <button class="btn" data-video="${idx}">Video</button>
      </div>
    </div>
  `).join("");

  return `
    <div class="card">
      <h2>${s.name}</h2>
      <div class="list">${exHtml}</div>
    </div>
  `;
}

/* -------------------- RENDER -------------------- */

function render(){
  renderNav();

  let html = "";
  if(activeTab==="dashboard") html = `<div class="card"><h2>Dashboard</h2></div>`;
  if(activeTab==="workout") html = renderWorkoutHome();

  view.innerHTML = html;

  view.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>{
    const tpl = templates.find(t=>t.id===b.dataset.start);
    if(tpl) newSessionFromTemplate(tpl);
  });

  view.querySelectorAll("[data-video]").forEach(b=>b.onclick=()=>{
    const ex = activeWorkout.exercises[Number(b.dataset.video)];
    openVideo(ex.name, ex.videoSearch);
  });
}

render();
setStatus("Ready");
