/* Steady Log — BEST V3 (one-swoop WOW)
   - No service worker registration (prevents caching blanks)
   - Direct YouTube open + thumbnails
   - PR medals + progression hints
   - Dashboard charts + weekly planner (editable)
   - Session summary screen
   - Exercise library search + add to templates
   - Backup/export/import (JSON) + Web Share if available
*/

(() => {
  "use strict";

  // ---------- Crash guard (never silent blank) ----------
  const errEl = document.getElementById("err");
  window.addEventListener("error", (e) => {
    try{
      errEl.hidden = false;
      errEl.textContent = `Steady Log error: ${e.error ? e.error.name : "Error"}: ${e.message}`;
    }catch(_){}
  });
  window.addEventListener("unhandledrejection", (e) => {
    try{
      errEl.hidden = false;
      errEl.textContent = `Steady Log error: ${e.reason && e.reason.name ? e.reason.name : "PromiseError"}: ${e.reason && e.reason.message ? e.reason.message : String(e.reason)}`;
    }catch(_){}
  });

  // ---------- IDs (iOS-safe) ----------
  function safeUUID(){
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c){
      var r = Math.random()*16|0, v = c==="x"? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }

  // ---------- YouTube ----------
  function extractYouTubeId(url){
    try{
      const u = new URL(url);
      if(u.hostname.includes("youtu.be")) return u.pathname.replace("/", "") || null;
      if(u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/shorts\/([^/]+)/);
      if(m) return m[1];
      return null;
    }catch(_){ return null; }
  }
  function youtubeThumbUrl(id){ return `https://img.youtube.com/vi/${id}/hqdefault.jpg`; }
  function openVideo(searchOrUrl){
    const q = (searchOrUrl || "").trim();
    if(!q) return;
    const url = q.startsWith("http")
      ? q
      : "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ---------- Storage ----------
  const KEY = {
    sessions:  "steadylog.sessions.bestv3",
    templates: "steadylog.templates.bestv3",
    tracker:   "steadylog.tracker.bestv3",
    macros:    "steadylog.macros.bestv3",
    settings:  "steadylog.settings.bestv3"
  };

  const DEFAULT_MACROS = { calories: 2010, protein: 210, carbs: 180, fat: 50 };

    const EX_LIBRARY = [
    { name:"Smith Incline Bench Press", video:"smith incline bench press", tags:["chest","press","upper"] },
    { name:"Plate-Loaded Chest Press", video:"plate loaded chest press machine", tags:["chest","press"] },
    { name:"Plate-Loaded Incline Chest Press", video:"plate loaded incline chest press machine", tags:["chest","press","upper"] },
    { name:"Machine Shoulder Press", video:"machine shoulder press", tags:["shoulders","press"] },
    { name:"Dumbbell Lateral Raise", video:"dumbbell lateral raise strict form", tags:["shoulders"] },
    { name:"Lat Pulldown", video:"lat pulldown proper form", tags:["back","lats"] },
    { name:"Chest Supported Row Machine (Plate)", video:"plate loaded chest supported row", tags:["back","row"] },
    { name:"Face Pull", video:"cable face pull correct form", tags:["rear delts","shoulders"] },
    { name:"Cable Tricep Pushdown", video:"cable tricep pushdown form", tags:["triceps","arms"] },
    { name:"Preacher Curl Machine", video:"preacher curl machine", tags:["biceps","arms"] },
    { name:"Cable Curl", video:"cable bicep curl form", tags:["biceps","arms"] },
    { name:"45° Leg Press", video:"45 degree leg press proper form", tags:["legs","quads"] },
    { name:"Leg Extension", video:"leg extension machine form", tags:["legs","quads"] },
    { name:"Seated Hamstring Curl", video:"seated hamstring curl form", tags:["legs","hamstrings"] },
    { name:"Lying Hamstring Curl", video:"lying hamstring curl form", tags:["legs","hamstrings"] },
    { name:"Romanian Deadlift (BB/DB)", video:"romanian deadlift barbell form", tags:["hamstrings","glutes"] },
    { name:"Hip Thrust", video:"barbell hip thrust form", tags:["glutes"] },
    { name:"Hip Abductor", video:"hip abductor machine form", tags:["glutes","hips"] },
    { name:"Standing Calf Raise", video:"standing calf raise machine", tags:["calves"] },
    { name:"Seated Calf Raise", video:"seated calf raise machine", tags:["calves"] },
  ];

      const DEFAULT_TEMPLATES = [
    { id:"upper_push", name:"Upper Push", subtitle:"Chest + Shoulders + Triceps + Cardio",
      exercises:[
        { id:"smith_incline", name:"Smith Incline Bench Press", sets:4, reps:"6–8", rest:120, video:"smith incline bench press" },
        { id:"chest_press", name:"Plate-Loaded Chest Press", sets:3, reps:"8–10", rest:90, video:"plate loaded chest press machine" },
        { id:"shoulder_press", name:"Machine Shoulder Press", sets:3, reps:"8–10", rest:90, video:"machine shoulder press" },
        { id:"lat_raise", name:"Dumbbell Lateral Raise", sets:3, reps:"12–20", rest:60, video:"dumbbell lateral raise strict form" },
        { id:"tri_pushdown", name:"Cable Tricep Pushdown", sets:3, reps:"10–15", rest:60, video:"cable tricep pushdown form" },
        { id:"cardio", name:"20 Min Cardio (Your Choice)", sets:1, reps:"20 mins", rest:0, video:"stairmaster workout 20 minutes" },
      ]
    },
    { id:"lower_quad", name:"Lower Quad", subtitle:"Quads + Calves",
      exercises:[
        { id:"leg_press", name:"45° Leg Press", sets:4, reps:"8–12", rest:120, video:"45 degree leg press proper form" },
        { id:"leg_ext", name:"Leg Extension", sets:3, reps:"12–15", rest:75, video:"leg extension machine form" },
        { id:"ham_curl", name:"Seated Hamstring Curl", sets:3, reps:"10–15", rest:75, video:"seated hamstring curl form" },
        { id:"calves", name:"Standing Calf Raise", sets:4, reps:"10–15", rest:60, video:"standing calf raise machine" },
      ]
    },
    { id:"upper_pull", name:"Upper Pull", subtitle:"Back + Biceps + Cardio",
      exercises:[
        { id:"lat_pd", name:"Lat Pulldown (Slightly Wide Pronated)", sets:4, reps:"8–12", rest:90, video:"lat pulldown proper form" },
        { id:"row_cs", name:"Chest-Supported Row (Neutral Grip)", sets:3, reps:"8–12", rest:90, video:"chest supported row machine neutral grip" },
        { id:"tbar", name:"T-Bar Row (Slightly Wide Grip)", sets:3, reps:"8–12", rest:90, video:"t bar row proper form" },
        { id:"facepull", name:"Face Pull", sets:3, reps:"12–20", rest:60, video:"cable face pull correct form" },
        { id:"cable_curl", name:"Cable Curl", sets:3, reps:"10–15", rest:60, video:"cable bicep curl form" },
        { id:"preacher", name:"Preacher Curl Machine", sets:2, reps:"10–15", rest:60, video:"preacher curl machine" },
        { id:"cardio2", name:"20 Min Cardio (Your Choice)", sets:1, reps:"20 mins", rest:0, video:"stairmaster workout 20 minutes" },
      ]
    },
    { id:"lower_glute_ham", name:"Lower Glute/Ham", subtitle:"Hamstrings + Glutes + Calves",
      exercises:[
        { id:"rdl", name:"Romanian Deadlift (BB/DB)", sets:4, reps:"6–10", rest:120, video:"romanian deadlift barbell form" },
        { id:"hip_thrust", name:"Hip Thrust", sets:4, reps:"8–12", rest:120, video:"barbell hip thrust form" },
        { id:"ham_curl2", name:"Lying Hamstring Curl", sets:3, reps:"10–15", rest:75, video:"lying hamstring curl form" },
        { id:"abduct", name:"Hip Abductor", sets:3, reps:"12–20", rest:60, video:"hip abductor machine form" },
        { id:"calves2", name:"Seated Calf Raise", sets:3, reps:"10–15", rest:60, video:"seated calf raise machine" },
      ]
    },
    { id:"wednesday_core", name:"Wednesday Core + Cardio", subtitle:"Abs + 20 Min Cardio",
      exercises:[
        { id:"crunch", name:"Cable Crunch", sets:3, reps:"12–15", rest:60, video:"cable crunch proper form" },
        { id:"knee_raise", name:"Hanging Knee Raise", sets:3, reps:"Controlled", rest:60, video:"hanging knee raise proper form" },
        { id:"cardio3", name:"20 Min Cardio (Your Choice)", sets:1, reps:"20 mins", rest:0, video:"stairmaster workout 20 minutes" },
      ]
    },
  ];

  function load(key, fallback){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(_){ return fallback; }
  }
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function todayStr(){
    const d = new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function isoDate(d){
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function fmtDateTime(iso){
    try{
      const d = new Date(iso);
      return d.toLocaleString(undefined, { weekday:"short", year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
    }catch(_){ return iso; }
  }
  function fmtShort(iso){
    try{
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
    }catch(_){ return iso; }
  }

  // ---------- State ----------
  const state = {
    tab: "home",
    sessions:  load(KEY.sessions, []),
    templates: load(KEY.templates, DEFAULT_TEMPLATES),
    tracker:   load(KEY.tracker, { weight: [], waist: [] }),
    macros:    load(KEY.macros, { targets: DEFAULT_MACROS, days: [] }),
    settings:  load(KEY.settings, { units:"kg", plan:{} }), // plan: { "YYYY-MM-DD": templateId }
    activeSessionId: null,
    showSummaryFor: null,
    exSearch: ""
  };

  // ---------- DOM ----------
  const view = document.getElementById("view");
  const nav = document.getElementById("nav");
  const pill = document.getElementById("pillStatus");
  const toastEl = document.getElementById("toast");

  // sheet
  const sheet = document.getElementById("sheet");
  const sheetBackdrop = document.getElementById("sheetBackdrop");
  const sheetTitle = document.getElementById("sheetTitle");
  const sheetBody = document.getElementById("sheetBody");
  const sheetClose = document.getElementById("sheetClose");

  // rest timer
  const restBar = document.getElementById("restBar");
  const restTime = document.getElementById("restTime");
  const restPlus15 = document.getElementById("restPlus15");
  const restPlus30 = document.getElementById("restPlus30");
  const restStop = document.getElementById("restStop");
  let timerInterval = null;
  let timerEndsAt = null;

  // ---------- UI helpers ----------
  function setStatus(t){ pill.textContent = t; }
  function toast(msg="Saved ✅"){
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(()=>toastEl.classList.remove("show"), 950);
  }
  function haptic(pattern=30){
    try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(_){}
  }

  function openSheet(title, html){
    sheetTitle.textContent = title;
    sheetBody.innerHTML = html;
    sheetBackdrop.hidden = false;
    sheet.hidden = false;
  }
  function closeSheet(){
    sheetBackdrop.hidden = true;
    sheet.hidden = true;
    sheetBody.innerHTML = "";
  }
  sheetBackdrop.addEventListener("click", closeSheet);
  sheetClose.addEventListener("click", closeSheet);

  // ---------- Rest timer ----------
  function stopTimer(){
    if(timerInterval) clearInterval(timerInterval);
    timerInterval=null; timerEndsAt=null;
    restBar.hidden = true;
  }
  function startTimer(seconds){
    stopTimer();
    timerEndsAt = Date.now() + seconds*1000;
    restBar.hidden = false;

    const plus = (s)=>{ timerEndsAt += s*1000; tick(); };
    restPlus15.onclick = ()=> plus(15);
    restPlus30.onclick = ()=> plus(30);
    restStop.onclick = stopTimer;

    function tick(){
      const left = Math.max(0, Math.ceil((timerEndsAt - Date.now())/1000));
      restTime.textContent = left + "s";
      if(left<=0){
        stopTimer();
        haptic([80,40,80]);
        toast("Rest done ✅");
      }
    }
    tick();
    timerInterval = setInterval(tick, 200);
  }

  // ---------- Navigation ----------
  const NAV_ITEMS = [
    { id:"home",     ico:"🏠", label:"Home" },
    { id:"history",  ico:"🗓️", label:"History" },
    { id:"workouts", ico:"🏋️", label:"Workouts" },
    { id:"exlib",    ico:"📚", label:"Exercises" },
    { id:"tracker",  ico:"📈", label:"Tracker" },
    { id:"settings", ico:"⚙️", label:"Settings" },
  ];

  function renderNav(){
    nav.innerHTML = `<div class="navInner">${
      NAV_ITEMS.map(it => `
        <button class="navbtn ${state.tab===it.id?"active":""}" data-nav="${it.id}">
          <div class="ico">${it.ico}</div>
          <div>${it.label}</div>
        </button>
      `).join("")
    }</div>`;
  }

  function setTab(id){
    state.tab = id;
    state.activeSessionId = null;
    state.showSummaryFor = null;
    render();
  }

  // ---------- Data helpers ----------
  function sessionsSorted(){
    return [...state.sessions].sort((a,b)=> (b.startedAt||"").localeCompare(a.startedAt||""));
  }
  function findSession(id){ return state.sessions.find(s => s.id===id) || null; }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
  }
  function escapeAttr(s){ return escapeHtml(s).replace(/"/g,"&quot;"); }

  function avgLastN(arr, n){
    const vals = arr.slice(-n).map(x => Number(x.value)).filter(v => Number.isFinite(v));
    if(!vals.length) return null;
    return vals.reduce((a,b)=>a+b,0) / vals.length;
  }
  function latestVal(arr, unit){
    const last = arr && arr.length ? arr[arr.length-1] : null;
    if(!last) return "—";
    const v = Number(last.value);
    return Number.isFinite(v) ? (v + " " + unit) : "—";
  }

  function getTodayMacros(){
    const ds = todayStr();
    let d = state.macros.days.find(x => x.date===ds);
    if(!d){
      d = { date: ds, calories:0, protein:0, carbs:0, fat:0, completed:false };
      state.macros.days.push(d);
      save(KEY.macros, state.macros);
    }
    return d;
  }

  function countDoneSets(session){
    let n=0;
    for(const ex of (session.exercises||[])){
      for(const st of (ex.sets||[])) if(st.done) n++;
    }
    return n;
  }
  function totalVolume(session){
    let vol=0;
    for(const ex of (session.exercises||[])){
      for(const st of (ex.sets||[])){
        const kg=Number(st.kg), reps=Number(st.reps);
        if(Number.isFinite(kg)&&Number.isFinite(reps)&&kg>0&&reps>0) vol += kg*reps;
      }
    }
    return Math.round(vol);
  }

  // ---------- Streaks ----------
  function calcWorkoutStreak(){
    const days = new Set(state.sessions.map(s => s.date).filter(Boolean));
    if(!days.size) return 0;
    let streak=0;
    let d = new Date();
    for(;;){
      const ds = isoDate(d);
      if(days.has(ds)){ streak++; d.setDate(d.getDate()-1); }
      else break;
    }
    return streak;
  }
  function calcMacrosStreak(){
    const byDate = new Map(state.macros.days.map(d => [d.date, d]));
    let streak=0;
    let d = new Date();
    for(;;){
      const ds = isoDate(d);
      const day = byDate.get(ds);
      if(day && day.completed){ streak++; d.setDate(d.getDate()-1); }
      else break;
    }
    return streak;
  }

  // ---------- PRs / bests ----------
  function bestBeforeSession(exName, sessionId){
    let best=null;
    for(const s of sessionsSorted()){
      if(s.id===sessionId) continue;
      for(const ex of (s.exercises||[])){
        if(ex.name!==exName) continue;
        for(const st of (ex.sets||[])){
          const kg=Number(st.kg);
          if(Number.isFinite(kg)&&kg>0) best = best===null?kg:Math.max(best,kg);
        }
      }
    }
    return best;
  }
  function bestInSession(session, exName){
    let best=null;
    for(const ex of (session.exercises||[])){
      if(ex.name!==exName) continue;
      for(const st of (ex.sets||[])){
        const kg=Number(st.kg);
        if(Number.isFinite(kg)&&kg>0) best = best===null?kg:Math.max(best,kg);
      }
    }
    return best;
  }
  function calcPRs(session){
    const prs=[];
    for(const ex of (session.exercises||[])){
      const before = bestBeforeSession(ex.name, session.id);
      const now = bestInSession(session, ex.name);
      if(now!==null && (before===null || now>before)){
        prs.push({ name: ex.name, value: now, before });
      }
    }
    return prs;
  }
  function computeExerciseStats(exName){
    let last = null;
    let best = null;
    for(const s of sessionsSorted()){
      for(const ex of (s.exercises||[])){
        if(ex.name !== exName) continue;
        const sets = (ex.sets||[]).map(st => ({kg:Number(st.kg), reps:Number(st.reps)}))
          .filter(st => Number.isFinite(st.kg) && st.kg>0);
        if(sets.length){
          if(!last){
            const maxSet = sets.reduce((a,b)=> (b.kg>a.kg?b:a), sets[0]);
            last = `${maxSet.kg}kg x ${Number.isFinite(maxSet.reps)&&maxSet.reps>0?maxSet.reps:"?"}`;
          }
          const maxKg = sets.reduce((m,st)=> Math.max(m, st.kg), 0);
          if(best===null || maxKg>best) best = maxKg;
        }
      }
      if(last && best!==null) break;
    }
    return { last, best };
  }

  function progressionHint(exName){
    const s = computeExerciseStats(exName);
    if(s.best===null) return null;
    const next = Math.round((s.best + 2.5) * 2)/2;
    return `${next}kg target`;
  }

  // ---------- Charts ----------
  function drawLineChart(canvas, points, labelText){
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width = Math.max(1, canvas.clientWidth) * devicePixelRatio;
    const h = canvas.height = Math.max(1, canvas.clientHeight) * devicePixelRatio;
    ctx.clearRect(0,0,w,h);

    const pad = 14*devicePixelRatio;
    ctx.globalAlpha=0.7;
    ctx.fillStyle="#e9e9f2";
    ctx.font = `${11*devicePixelRatio}px -apple-system, system-ui`;
    if(labelText) ctx.fillText(labelText, pad, pad*1.1);

    if(points.length<2){
      ctx.globalAlpha=0.6;
      ctx.fillText("Add more data to see trend", pad, pad*2.4);
      return;
    }

    const minV = Math.min(...points.map(p=>p.y));
    const maxV = Math.max(...points.map(p=>p.y));
    const span = (maxV-minV) || 1;

    ctx.globalAlpha=0.18;
    ctx.strokeStyle="#ffffff";
    ctx.lineWidth = 1*devicePixelRatio;
    for(let i=0;i<4;i++){
      const y = pad*1.6 + (h-2.4*pad)*(i/3);
      ctx.beginPath();
      ctx.moveTo(pad,y);
      ctx.lineTo(w-pad,y);
      ctx.stroke();
    }

    const top = pad*1.6;
    const bottom = h - pad;

    ctx.globalAlpha=0.95;
    ctx.strokeStyle="#00c8ff";
    ctx.lineWidth = 2.5*devicePixelRatio;
    ctx.beginPath();
    points.forEach((p,i)=>{
      const x = pad + (w-2*pad)*(i/(points.length-1));
      const y = top + (bottom-top)*(1 - ((p.y-minV)/span));
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    ctx.fillStyle="#00c8ff";
    points.forEach((p,i)=>{
      const x = pad + (w-2*pad)*(i/(points.length-1));
      const y = top + (bottom-top)*(1 - ((p.y-minV)/span));
      ctx.beginPath();
      ctx.arc(x,y, 3.5*devicePixelRatio, 0, Math.PI*2);
      ctx.fill();
    });

    ctx.globalAlpha=0.55;
    ctx.fillStyle="#e9e9f2";
    ctx.font = `${10.5*devicePixelRatio}px -apple-system, system-ui`;
    ctx.fillText(`${minV.toFixed(1)} → ${maxV.toFixed(1)}`, pad, h - pad*0.4);
  }

  function drawBarChart(canvas, values, labelText){
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width = Math.max(1, canvas.clientWidth) * devicePixelRatio;
    const h = canvas.height = Math.max(1, canvas.clientHeight) * devicePixelRatio;
    ctx.clearRect(0,0,w,h);

    const pad = 14*devicePixelRatio;
    ctx.globalAlpha=0.7;
    ctx.fillStyle="#e9e9f2";
    ctx.font = `${11*devicePixelRatio}px -apple-system, system-ui`;
    if(labelText) ctx.fillText(labelText, pad, pad*1.1);

    const maxV = Math.max(1, ...values);
    const bw = (w-2*pad) / values.length;
    const top = pad*1.6;
    const bottom = h - pad;

    ctx.globalAlpha=0.18;
    ctx.strokeStyle="#ffffff";
    ctx.lineWidth=1*devicePixelRatio;
    ctx.beginPath(); ctx.moveTo(pad,bottom); ctx.lineTo(w-pad,bottom); ctx.stroke();

    values.forEach((v,i)=>{
      const x = pad + i*bw + (bw*0.18);
      const barW = bw*0.64;
      const barH = (bottom-top) * (v/maxV);
      const y = bottom - barH;
      ctx.globalAlpha=0.82;
      ctx.fillStyle="#39d98a";
      ctx.fillRect(x,y,barW,barH);
    });
  }

  function workoutsPerWeek(weeks=6){
    const now = new Date();
    const buckets=[];
    for(let i=weeks-1;i>=0;i--){
      const end = new Date(now); end.setDate(now.getDate() - (i*7));
      const start = new Date(end); start.setDate(end.getDate()-6);
      const sStr = isoDate(start), eStr = isoDate(end);
      const c = state.sessions.filter(x => x.date>=sStr && x.date<=eStr).length;
      buckets.push(c);
    }
    return buckets;
  }

  // ---------- Weekly planner ----------
  function weekDays(startDate){
    const d0 = new Date(startDate);
    const out=[];
    for(let i=0;i<7;i++){
      const d=new Date(d0); d.setDate(d0.getDate()+i);
      out.push({ date: isoDate(d), label: d.toLocaleDateString(undefined,{weekday:"short"}), isToday: isoDate(d)===todayStr() });
    }
    return out;
  }
  function mondayOfThisWeek(){
    const d = new Date();
    const day = d.getDay();
    const diff = (day===0? -6 : 1-day);
    d.setDate(d.getDate()+diff);
    d.setHours(0,0,0,0);
    return d;
  }
  function plannedTemplateId(dateStr){
    return state.settings.plan[dateStr] || "";
  }
  function plannedTemplateName(dateStr){
    const id = plannedTemplateId(dateStr);
    const tpl = state.templates.find(t=>t.id===id);
    return tpl ? tpl.name : "Rest";
  }
  function dayCompleted(dateStr){
    return state.sessions.some(s => s.date===dateStr);
  }

  function openPlanPicker(dateStr){
    openSheet(`Plan • ${dateStr}`, `
      <div class="sub">Pick a workout for this day.</div>
      <div class="hr"></div>
      <div class="list">
        <button class="templateBtn" data-action="planSet" data-date="${dateStr}" data-id="">
          <div><div class="name">Rest day</div><div class="meta">No workout planned</div></div>
          <div class="tag">—</div>
        </button>
        ${state.templates.map(tpl => `
          <button class="templateBtn" data-action="planSet" data-date="${dateStr}" data-id="${tpl.id}">
            <div><div class="name">${escapeHtml(tpl.name)}</div><div class="meta">${escapeHtml(tpl.subtitle||"")}</div></div>
            <div class="tag">${tpl.exercises.length} ex</div>
          </button>
        `).join("")}
      </div>
      <div class="hr"></div>
      <button class="btn primary" data-action="planStart" data-date="${dateStr}">Start planned workout</button>
    `);
  }

  // ---------- Session creation ----------
  function createSessionFromTemplate(tplId, forcedDateStr=null){
    const tpl = state.templates.find(t => t.id===tplId);
    if(!tpl) return null;
    const now = new Date();
    const s = {
      id: safeUUID(),
      date: forcedDateStr || todayStr(),
      name: tpl.name,
      startedAt: now.toISOString(),
      finishedAt: null,
      notes: "",
      exercises: tpl.exercises.map(ex => ({
        name: ex.name,
        reps: ex.reps,
        rest: Number(ex.rest)||60,
        video: ex.video || "",
        sets: Array.from({length: Number(ex.sets)||3}, () => ({ kg:"", reps:"", done:false }))
      }))
    };
    state.sessions.push(s);
    save(KEY.sessions, state.sessions);
    return s;
  }

  // ---------- Templates editor ----------
  function openTemplateEditor(tplId){
    const tpl = state.templates.find(t => t.id===tplId);
    if(!tpl) return;
    openSheet("Edit template", `
      <div class="sub">Template name</div>
      <input class="input" id="tplName" value="${escapeAttr(tpl.name)}" />
      <div class="sub" style="margin-top:10px">Subtitle</div>
      <input class="input" id="tplSub" value="${escapeAttr(tpl.subtitle||"")}" />
      <div class="hr"></div>
      <div class="row wrap">
        <button class="btn primary" data-action="tplAddEx" data-id="${tpl.id}" style="flex:1">+ Add exercise</button>
        <button class="btn ok" data-action="tplSaveHead" data-id="${tpl.id}" style="flex:1">Save</button>
        <button class="btn danger" data-action="tplDelete" data-id="${tpl.id}" style="flex:1">Delete</button>
      </div>
      <div class="sectionTitle">Exercises</div>
      <div class="list">
        ${tpl.exercises.map((ex,i)=>`
          <div class="exercise">
            <div class="exHead">
              <div style="flex:1">
                <div class="exName">${escapeHtml(ex.name)}</div>
                <div class="exMeta">${ex.sets} sets • ${escapeHtml(ex.reps)} • rest ${ex.rest}s</div>
              </div>
              <button class="btn small" data-action="tplEditEx" data-id="${tpl.id}" data-i="${i}">Edit</button>
            </div>
          </div>
        `).join("")}
      </div>
    `);
  }

  function openExerciseEditor(tplId, idx){
    const tpl = state.templates.find(t => t.id===tplId);
    if(!tpl) return;
    const ex = tpl.exercises[idx];
    if(!ex) return;
    openSheet("Edit exercise", `
      <div class="sub">Exercise name</div>
      <input class="input" id="exName" value="${escapeAttr(ex.name)}" />
      <div class="row wrap" style="margin-top:10px">
        <div style="flex:1;min-width:160px">
          <div class="sub">Sets</div>
          <input class="input" id="exSets" inputmode="numeric" value="${escapeAttr(ex.sets)}" />
        </div>
        <div style="flex:1;min-width:160px">
          <div class="sub">Reps</div>
          <input class="input" id="exReps" value="${escapeAttr(ex.reps)}" />
        </div>
        <div style="flex:1;min-width:160px">
          <div class="sub">Rest (s)</div>
          <input class="input" id="exRest" inputmode="numeric" value="${escapeAttr(ex.rest)}" />
        </div>
      </div>
      <div class="sub" style="margin-top:10px">Video (YouTube URL or search phrase)</div>
      <input class="input" id="exVideo" value="${escapeAttr(ex.video||"")}" />
      <div class="hr"></div>
      <div class="row wrap">
        <button class="btn ok" data-action="tplSaveEx" data-id="${tplId}" data-i="${idx}" style="flex:1">Save</button>
        <button class="btn danger" data-action="tplDelEx" data-id="${tplId}" data-i="${idx}" style="flex:1">Delete</button>
      </div>
    `);
  }

  // ---------- Backup ----------
  function download(filename, text){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], {type:"application/json"}));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 800);
  }
  async function shareFileIfPossible(filename, text){
    try{
      if(!navigator.share || !window.File) return false;
      const file = new File([text], filename, { type:"application/json" });
      await navigator.share({ files:[file], title:"Steady Log Backup" });
      return true;
    }catch(_){ return false; }
  }
  function exportJSON(){
    const payload = {
      version:"bestv3",
      exportedAt:new Date().toISOString(),
      sessions: state.sessions,
      templates: state.templates,
      tracker: state.tracker,
      macros: state.macros,
      settings: state.settings
    };
    const name = `steady-log-backup-${todayStr()}.json`;
    const text = JSON.stringify(payload,null,2);
    shareFileIfPossible(name, text).then((shared)=>{
      if(!shared) download(name, text);
      toast(shared ? "Shared ✅" : "Downloaded ✅");
    });
  }
  function importJSONFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if(data.sessions) state.sessions = data.sessions;
        if(data.templates) state.templates = data.templates;
        if(data.tracker) state.tracker = data.tracker;
        if(data.macros) state.macros = data.macros;
        if(data.settings) state.settings = data.settings;

        save(KEY.sessions, state.sessions);
        save(KEY.templates, state.templates);
        save(KEY.tracker, state.tracker);
        save(KEY.macros, state.macros);
        save(KEY.settings, state.settings);

        toast("Imported ✅");
        render();
      }catch(e){
        errEl.hidden=false;
        errEl.textContent = "Import failed: " + e.message;
      }
    };
    reader.readAsText(file);
  }
  function openBackupSheet(){
    openSheet("Backup / Import", `
      <div class="sub">Backup your data (share to iCloud/WhatsApp/email) or import a backup JSON.</div>
      <div class="hr"></div>
      <div class="row wrap">
        <button class="btn primary" data-action="exportJSON" style="flex:1;min-width:220px">Backup / Share</button>
        <button class="btn" data-action="importJSON" style="flex:1;min-width:220px">Import backup</button>
      </div>
      <div class="hr"></div>
      <button class="btn danger" data-action="resetAll">Reset all data</button>
      <input type="file" id="importFile" accept="application/json" hidden />
    `);
  }

  // ---------- Views ----------
  function viewHome(){
    const items = sessionsSorted();
    const last = items[0] || null;
    const streak = calcWorkoutStreak();
    const mStreak = calcMacrosStreak();
    const wAvg = avgLastN(state.tracker.weight, 7);
    const todayM = getTodayMacros();
    const t = state.macros.targets;

    const mon = mondayOfThisWeek();
    const days = weekDays(mon);

    function pct(v, target){
      if(!target) return 0;
      return Math.max(0, Math.min(100, Math.round((v/target)*100)));
    }

    return `
      <div class="card">
        <div class="h2">Dashboard</div>
        <div class="sub">Snapshot + momentum.</div>
        <div class="hr"></div>

        <div class="grid">
          <div class="stat"><div class="statVal">${state.sessions.length}</div><div class="statLab">sessions logged</div></div>
          <div class="stat"><div class="statVal">${last ? fmtShort(last.startedAt) : "—"}</div><div class="statLab">last session</div></div>
          <div class="stat"><div class="statVal">${streak} 🔥</div><div class="statLab">workout streak</div></div>
          <div class="stat"><div class="statVal">${mStreak} ✅</div><div class="statLab">macros streak</div></div>
        </div>

        <div class="hr"></div>

        <div class="row wrap">
          <div style="flex:1;min-width:260px">
            <div class="sub">Today’s macros</div>
            <div style="margin-top:8px">
              <div class="sub">Calories ${todayM.calories}/${t.calories}</div>
              <div class="progress"><div style="width:${pct(todayM.calories,t.calories)}%"></div></div>
            </div>
            <div style="margin-top:8px">
              <div class="sub">Protein ${todayM.protein}g/${t.protein}g</div>
              <div class="progress"><div style="width:${pct(todayM.protein,t.protein)}%"></div></div>
            </div>
          </div>

          <div style="flex:1;min-width:260px">
            <div class="sub">7-day avg weight</div>
            <div class="h2" style="margin:10px 0 0">${wAvg ? wAvg.toFixed(1)+" kg" : "—"}</div>
            <div class="row wrap" style="margin-top:10px">
              <button class="btn small primary" data-action="quickAddWeight">+ Weight</button>
              <button class="btn small" data-action="goTracker">Open Tracker</button>
              <button class="btn small gold" data-action="openBackup">Backup</button>
            </div>
          </div>
        </div>

        <div class="hr"></div>

        <div class="row wrap">
          <div style="flex:1;min-width:280px">
            <div class="sub">Weight trend (last 14)</div>
            <div class="canvasWrap"><canvas class="chart" id="chartWeight"></canvas></div>
          </div>
          <div style="flex:1;min-width:280px">
            <div class="sub">Workouts per week (last 6)</div>
            <div class="canvasWrap"><canvas class="chart" id="chartWorkouts"></canvas></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="h2">Start workout</div>
        <div class="sub">Pick a template and log fast.</div>
        <div class="hr"></div>
        <div class="list">
          ${state.templates.map(tpl => `
            <button class="templateBtn" data-action="startTemplate" data-id="${tpl.id}">
              <div><div class="name">${escapeHtml(tpl.name)}</div><div class="meta">${escapeHtml(tpl.subtitle || "")}</div></div>
              <div class="tag">${tpl.exercises.length} exercises</div>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="card">
        <div class="h2">Weekly plan</div>
        <div class="sub">Tap a day to set a workout. Tap the workout name to start.</div>
        <div class="hr"></div>
        <div class="calGrid">
          ${days.map(d => `
            <div class="day ${d.isToday?"today":""} ${dayCompleted(d.date)?"done":""}" data-action="planDay" data-date="${d.date}">
              <div class="d1">${d.label}</div>
              <div class="d2">${escapeHtml(plannedTemplateName(d.date))}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function viewHistory(){
    const items = sessionsSorted();
    if(!items.length){
      return `<div class="card"><div class="h2">History</div><div class="sub">No sessions yet. Start a workout from Home.</div></div>`;
    }
    return `
      <div class="card">
        <div class="h2">History</div>
        <div class="sub">Tap a session to view. PRs show as medals.</div>
        <div class="hr"></div>
        <div class="list">
          ${items.map(s => {
            const prs = calcPRs(s);
            return `
              <button class="templateBtn" data-action="openSession" data-id="${s.id}">
                <div>
                  <div class="name">${escapeHtml(s.name)} ${prs.length?`<span class="badge gold">🏆 ${prs.length}</span>`:""}</div>
                  <div class="meta">${fmtDateTime(s.startedAt)} • ${countDoneSets(s)} sets • Vol ${totalVolume(s)}</div>
                </div>
                <div class="tag">${s.date}</div>
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function viewWorkouts(){
    return `
      <div class="card">
        <div class="h2">Workouts</div>
        <div class="sub">Start, edit, or build templates.</div>
        <div class="hr"></div>

        <div class="row wrap">
          <button class="btn primary" data-action="newTemplate" style="flex:1;min-width:220px">+ New template</button>
          <button class="btn" data-action="restoreDefaults" style="flex:1;min-width:220px">Restore defaults</button>
          <button class="btn gold" data-action="openBackup" style="flex:1;min-width:220px">Backup / Import</button>
        </div>

        <div class="sectionTitle">Templates</div>
        <div class="list">
          ${state.templates.map(tpl => `
            <div class="exercise">
              <div class="exHead">
                <div>
                  <div class="exName">${escapeHtml(tpl.name)}</div>
                  <div class="exMeta">${escapeHtml(tpl.subtitle||"")} • ${tpl.exercises.length} exercises</div>
                </div>
                <div class="row" style="gap:8px">
                  <button class="btn small primary" data-action="startTemplate" data-id="${tpl.id}">Start</button>
                  <button class="btn small" data-action="editTemplate" data-id="${tpl.id}">Edit</button>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function viewExerciseLib(){
    return `
      <div class="card">
        <div class="h2">Exercise Library</div>
        <div class="sub">Search, watch form, add to templates.</div>
        <div class="hr"></div>
        <div class="row wrap">
          <input class="input" id="exSearch" placeholder="Search: chest, row, triceps…" value="${escapeAttr(state.exSearch)}" />
          <button class="btn small primary" data-action="exSearchApply">Search</button>
          <button class="btn small" data-action="exSearchClear">Clear</button>
        </div>
        <div class="sectionTitle">Results</div>
        <div class="list" id="exLibList"></div>
      </div>
    `;
  }

  function viewTracker(){
    const t = state.macros.targets;
    const d = getTodayMacros();

    function macroField(label, key, val, target){
      const pct = target ? Math.max(0, Math.min(100, Math.round((val/target)*100))) : 0;
      return `
        <div style="flex:1;min-width:210px">
          <div class="sub">${label}: <b>${val}</b> / ${target}</div>
          <div class="row" style="margin-top:8px">
            <input class="input" data-action="macroInput" data-key="${key}" inputmode="decimal" value="${val}">
            <button class="btn small primary" data-action="macroPlus" data-key="${key}" data-amt="10">+10</button>
          </div>
          <div class="progress" style="margin-top:8px"><div style="width:${pct}%"></div></div>
        </div>
      `;
    }

    return `
      <div class="card">
        <div class="h2">Tracker</div>
        <div class="sub">Weight, waist, and macros.</div>
        <div class="hr"></div>

        <div class="row wrap">
          <div style="flex:1;min-width:240px" class="exercise">
            <div class="exName">Weight</div>
            <div class="exMeta">Log daily. Trend on Dashboard.</div>
            <div class="row" style="margin-top:10px">
              <input class="input" id="weightInput" inputmode="decimal" placeholder="kg" />
              <button class="btn small primary" data-action="addWeight">Add</button>
            </div>
            <div class="exStats">
              <div class="pchip">Latest: ${latestVal(state.tracker.weight, "kg")}</div>
              <div class="pchip">7-day avg: ${avgLastN(state.tracker.weight,7)?.toFixed(1) ?? "—"} kg</div>
            </div>
          </div>

          <div style="flex:1;min-width:240px" class="exercise">
            <div class="exName">Waist</div>
            <div class="exMeta">Optional measurement.</div>
            <div class="row" style="margin-top:10px">
              <input class="input" id="waistInput" inputmode="decimal" placeholder="cm" />
              <button class="btn small primary" data-action="addWaist">Add</button>
            </div>
            <div class="exStats">
              <div class="pchip">Latest: ${latestVal(state.tracker.waist, "cm")}</div>
            </div>
          </div>
        </div>

        <div class="sectionTitle">Today's macros</div>
        <div class="exercise">
          <div class="exHead">
            <div>
              <div class="exName">${d.date}</div>
              <div class="exMeta">Tap numbers to update. Mark complete when you hit plan.</div>
            </div>
            <button class="btn small ${d.completed?"ok":"primary"}" data-action="toggleMacrosComplete">${d.completed?"Completed ✅":"Mark complete"}</button>
          </div>

          <div class="hr"></div>

          <div class="row wrap">
            ${macroField("Calories","calories",d.calories,t.calories)}
            ${macroField("Protein (g)","protein",d.protein,t.protein)}
            ${macroField("Carbs (g)","carbs",d.carbs,t.carbs)}
            ${macroField("Fat (g)","fat",d.fat,t.fat)}
          </div>

          <div class="hr"></div>
          <div class="row wrap">
            <button class="btn" data-action="editMacroTargets" style="flex:1;min-width:220px">Edit macro targets</button>
            <button class="btn gold" data-action="openBackup" style="flex:1;min-width:220px">Backup / Import</button>
          </div>

          <input type="file" id="importFile" accept="application/json" hidden />
        </div>
      </div>
    `;
  }

  function viewSettings(){
    const t = state.macros.targets;
    return `
      <div class="card">
        <div class="h2">Settings</div>
        <div class="sub">Targets, backup, and quality-of-life options.</div>
        <div class="hr"></div>

        <div class="sectionTitle">Macro targets</div>
        <div class="row wrap">
          <button class="btn primary" data-action="editMacroTargets" style="flex:1;min-width:220px">Edit targets</button>
          <button class="btn gold" data-action="openBackup" style="flex:1;min-width:220px">Backup / Import</button>
          <button class="btn danger" data-action="resetAll" style="flex:1;min-width:220px">Reset all data</button>
        </div>

        <div class="hr"></div>
        <div class="sub">Current targets: ${t.calories} kcal • P ${t.protein}g • C ${t.carbs}g • F ${t.fat}g</div>
      </div>
    `;
  }

  function viewSession(session){
    if(!session) return `<div class="card"><div class="h2">Session</div><div class="sub">Not found.</div></div>`;
    const prs = calcPRs(session);

    return `
      <div class="card">
        <div class="h2">${escapeHtml(session.name)}</div>
        <div class="sub">Started: ${fmtDateTime(session.startedAt)} • ${session.date}</div>
        ${prs.length ? `<div class="hr"></div><div class="row wrap">${prs.slice(0,4).map(()=>`<span class="badge gold fadeIn">🏆 PR</span>`).join("")}</div>` : ""}
        <div class="hr"></div>

        <div class="sectionTitle">Session notes</div>
        <textarea id="sessionNotes" placeholder="Notes (optional)">${escapeHtml(session.notes||"")}</textarea>

        <div class="hr"></div>

        <div class="row wrap">
          <button class="btn ok" data-action="saveSessionNotes">Save notes</button>
          <button class="btn primary" data-action="finishSession">Finish</button>
          <button class="btn danger" data-action="deleteSession">Delete</button>
        </div>
      </div>

      <div class="card">
        <div class="h2">Exercises</div>
        <div class="sub">Tick ✓ starts rest automatically. Suggestions appear when you’ve got history.</div>
        <div class="hr"></div>

        <div class="list">
          ${session.exercises.map((ex, exIdx) => {
            const stats = computeExerciseStats(ex.name);
            const hint = progressionHint(ex.name);
            const vs = (ex.video||"").trim();
            const vid = vs.startsWith("http") ? extractYouTubeId(vs) : null;
            const thumb = vid ? youtubeThumbUrl(vid) : null;

            const bestBefore = bestBeforeSession(ex.name, session.id);
            const bestNow = bestInSession(session, ex.name);
            const isPR = (bestNow!==null) && (bestBefore===null || bestNow>bestBefore);

            const videoBlock = vs ? `
              <button class="videoPlay" type="button" data-action="video" data-ex="${exIdx}" aria-label="Play video">▶</button>` : "";

            return `
              <div class="exercise">
                <div class="exHead">
                  <div>
                    <div class="exName">${escapeHtml(ex.name)} ${isPR?`<span class="badge pr fadeIn">PR</span>`:""}</div>
                    <div class="exMeta">${escapeHtml(ex.reps)} • Rest: ${ex.rest}s ${hint?` • Next: <b>${hint}</b>`:""}</div>
                    <div class="exStats">
                      <div class="pchip">Last: ${stats.last || "—"}</div>
                      <div class="pchip">Best: ${stats.best!==null ? stats.best+"kg" : "—"}</div>
                    </div>
                  </div>
                  <div class="row" style="align-items:flex-start;gap:10px">
                    ${videoBlock}
                    <button class="btn small primary" data-action="addSet" data-ex="${exIdx}">+ Set</button>
                    <button class="btn small" data-action="rest" data-ex="${exIdx}">Rest</button>
                  </div>
                </div>

                ${(ex.sets||[]).map((st, si) => `
                  <div class="setRow">
                    <input class="input" data-role="kg" data-action="editSet" data-ex="${exIdx}" data-set="${si}" data-field="kg" inputmode="decimal" placeholder="kg" value="${escapeAttr(st.kg ?? "")}">
                    <input class="input" data-role="reps" data-action="editSet" data-ex="${exIdx}" data-set="${si}" data-field="reps" inputmode="numeric" placeholder="reps" value="${escapeAttr(st.reps ?? "")}">
                    <button class="sbtn done ${st.done ? "on":""}" data-role="done" data-action="toggleDone" data-ex="${exIdx}" data-set="${si}">✓</button>
                    <button class="sbtn del" data-role="del" data-action="delSet" data-ex="${exIdx}" data-set="${si}">🗑</button>
                  </div>
                `).join("")}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function viewSummary(session){
    if(!session) return `<div class="card"><div class="h2">Summary</div><div class="sub">Session not found.</div></div>`;
    const prs = calcPRs(session);
    const setsDone = countDoneSets(session);
    const vol = totalVolume(session);
    const dur = session.finishedAt ? Math.max(0, Math.round((new Date(session.finishedAt)-new Date(session.startedAt))/60000)) : 0;

    return `
      <div class="card">
        <div class="h2">Session Summary</div>
        <div class="sub">${escapeHtml(session.name)} • ${session.date}</div>
        <div class="hr"></div>

        <div class="grid">
          <div class="stat"><div class="statVal">${setsDone}</div><div class="statLab">sets completed</div></div>
          <div class="stat"><div class="statVal">${vol}</div><div class="statLab">total volume</div></div>
          <div class="stat"><div class="statVal">${dur}</div><div class="statLab">minutes</div></div>
          <div class="stat"><div class="statVal">${prs.length} 🏆</div><div class="statLab">PRs hit</div></div>
        </div>

        ${prs.length ? `
          <div class="hr"></div>
          <div class="sectionTitle">Personal Records</div>
          <div class="list">
            ${prs.map(p => `
              <div class="exercise">
                <div class="exHead">
                  <div>
                    <div class="exName">${escapeHtml(p.name)}</div>
                    <div class="exMeta">New best: <b>${p.value}kg</b> ${p.before!==null ? ` • Previous: ${p.before}kg` : ""}</div>
                  </div>
                  <span class="badge gold fadeIn">🏆 PR</span>
                </div>
              </div>
            `).join("")}
          </div>
        `:""}

        <div class="hr"></div>
        <div class="row wrap">
          <button class="btn primary" data-action="summaryToHistory" style="flex:1;min-width:220px">Go to History</button>
          <button class="btn" data-action="summaryStartAnother" style="flex:1;min-width:220px">Start another workout</button>
        </div>
      </div>
    `;
  }

  // ---------- Exercise library render ----------
  function renderExLibraryList(){
    const q = (state.exSearch||"").trim().toLowerCase();
    const list = EX_LIBRARY.filter(x => {
      if(!q) return true;
      const hay = (x.name + " " + (x.tags||[]).join(" ")).toLowerCase();
      return hay.includes(q);
    });
    const host = document.getElementById("exLibList");
    if(!host) return;
    host.innerHTML = list.map((x, idx) => `
      <div class="exercise">
        <div class="exHead">
          <div>
            <div class="exName">${escapeHtml(x.name)}</div>
            <div class="exMeta">${escapeHtml((x.tags||[]).join(" • "))}</div>
          </div>
          <div class="row" style="gap:8px">
            <button class="btn small" data-action="libVideo" data-i="${idx}">Video</button>
            <button class="btn small primary" data-action="libAdd" data-i="${idx}">Add</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  // ---------- Render ----------
  function render(){
    renderNav();
    errEl.hidden = true;

    if(state.showSummaryFor){
      view.innerHTML = viewSummary(findSession(state.showSummaryFor));
      setStatus("Summary");
      return;
    }

    if(state.activeSessionId){
      view.innerHTML = viewSession(findSession(state.activeSessionId));
      setStatus("Session");
      return;
    }

    if(state.tab==="home"){
      view.innerHTML = viewHome();
      setStatus("Ready");
      requestAnimationFrame(() => {
        const w = document.getElementById("chartWeight");
        const pts = state.tracker.weight.slice(-14).map(x => ({y:Number(x.value)})).filter(p=>Number.isFinite(p.y));
        drawLineChart(w, pts, "Weight (kg)");
        const b = document.getElementById("chartWorkouts");
        drawBarChart(b, workoutsPerWeek(6), "Workouts/week");
      });
      return;
    }
    if(state.tab==="history"){ view.innerHTML = viewHistory(); setStatus("History"); return; }
    if(state.tab==="workouts"){ view.innerHTML = viewWorkouts(); setStatus("Workouts"); return; }
    if(state.tab==="exlib"){ view.innerHTML = viewExerciseLib(); setStatus("Exercises"); renderExLibraryList(); return; }
    if(state.tab==="tracker"){ view.innerHTML = viewTracker(); setStatus("Tracker"); return; }
    if(state.tab==="settings"){ view.innerHTML = viewSettings(); setStatus("Settings"); return; }

    view.innerHTML = `<div class="card"><div class="h2">Not found</div></div>`;
  }

  // ---------- Events (delegated) ----------
  document.addEventListener("click", (e) => {
    const navBtn = e.target.closest("[data-nav]");
    if(navBtn){
      setTab(navBtn.getAttribute("data-nav"));
      haptic();
      return;
    }

    const act = e.target.closest("[data-action]");
    if(!act) return;
    const a = act.getAttribute("data-action");

    if(a==="openBackup"){ openBackupSheet(); return; }
    if(a==="quickAddWeight"){ setTab("tracker"); render(); setTimeout(()=>document.getElementById("weightInput")?.focus(), 50); return; }
    if(a==="goTracker"){ setTab("tracker"); return; }

    if(a==="startTemplate"){
      const id = act.getAttribute("data-id");
      const s = createSessionFromTemplate(id);
      if(s){ state.activeSessionId = s.id; render(); toast("Session started ✅"); }
      return;
    }
    if(a==="openSession"){ state.activeSessionId = act.getAttribute("data-id"); render(); return; }

    if(a==="planDay"){ openPlanPicker(act.getAttribute("data-date")); return; }
    if(a==="planSet"){
      const date = act.getAttribute("data-date");
      const id = act.getAttribute("data-id") || "";
      if(id) state.settings.plan[date]=id; else delete state.settings.plan[date];
      save(KEY.settings, state.settings);
      toast("Planned ✅");
      closeSheet();
      render();
      return;
    }
    if(a==="planStart"){
      const date = act.getAttribute("data-date");
      const id = plannedTemplateId(date);
      if(!id){ toast("No workout planned"); return; }
      const s = createSessionFromTemplate(id, date);
      if(s){ state.activeSessionId = s.id; closeSheet(); render(); toast("Started ✅"); }
      return;
    }

    if(a==="newTemplate"){
      const tpl = { id: safeUUID(), name:"New Template", subtitle:"", exercises:[] };
      state.templates.unshift(tpl);
      save(KEY.templates, state.templates);
      openTemplateEditor(tpl.id);
      toast("Template created ✅");
      render();
      return;
    }
    if(a==="restoreDefaults"){
      state.templates = DEFAULT_TEMPLATES;
      save(KEY.templates, state.templates);
      toast("Defaults restored ✅");
      render();
      return;
    }
    if(a==="editTemplate"){ openTemplateEditor(act.getAttribute("data-id")); return; }
    if(a==="tplSaveHead"){
      const tpl = state.templates.find(t => t.id===act.getAttribute("data-id"));
      if(!tpl) return;
      tpl.name = (document.getElementById("tplName")?.value?.trim() || tpl.name);
      tpl.subtitle = (document.getElementById("tplSub")?.value?.trim() || "");
      save(KEY.templates, state.templates);
      toast("Saved ✅");
      closeSheet();
      render();
      return;
    }
    if(a==="tplDelete"){
      const id = act.getAttribute("data-id");
      state.templates = state.templates.filter(t => t.id!==id);
      save(KEY.templates, state.templates);
      toast("Deleted ✅");
      closeSheet();
      render();
      return;
    }
    if(a==="tplAddEx"){
      const id = act.getAttribute("data-id");
      const tpl = state.templates.find(t => t.id===id);
      if(!tpl) return;
      tpl.exercises.push({ id:safeUUID(), name:"New Exercise", sets:3, reps:"8–12", rest:90, video:"" });
      save(KEY.templates, state.templates);
      openTemplateEditor(id);
      toast("Added ✅");
      return;
    }
    if(a==="tplEditEx"){ openExerciseEditor(act.getAttribute("data-id"), Number(act.getAttribute("data-i"))); return; }
    if(a==="tplSaveEx"){
      const tplId = act.getAttribute("data-id");
      const i = Number(act.getAttribute("data-i"));
      const tpl = state.templates.find(t => t.id===tplId);
      if(!tpl || !tpl.exercises[i]) return;
      const ex = tpl.exercises[i];
      ex.name = (document.getElementById("exName")?.value || ex.name).trim();
      ex.sets = Number(document.getElementById("exSets")?.value || ex.sets) || 3;
      ex.reps = (document.getElementById("exReps")?.value || ex.reps).trim();
      ex.rest = Number(document.getElementById("exRest")?.value || ex.rest) || 60;
      ex.video = (document.getElementById("exVideo")?.value || "").trim();
      save(KEY.templates, state.templates);
      toast("Saved ✅");
      openTemplateEditor(tplId);
      return;
    }
    if(a==="tplDelEx"){
      const tplId = act.getAttribute("data-id");
      const i = Number(act.getAttribute("data-i"));
      const tpl = state.templates.find(t => t.id===tplId);
      if(!tpl) return;
      tpl.exercises.splice(i,1);
      save(KEY.templates, state.templates);
      toast("Deleted ✅");
      openTemplateEditor(tplId);
      return;
    }

    if(a==="exSearchApply"){
      state.exSearch = document.getElementById("exSearch")?.value || "";
      renderExLibraryList();
      return;
    }
    if(a==="exSearchClear"){
      state.exSearch = "";
      const el = document.getElementById("exSearch"); if(el) el.value="";
      renderExLibraryList();
      return;
    }
    if(a==="libVideo"){
      const idx = Number(act.getAttribute("data-i"));
      const item = EX_LIBRARY[idx];
      if(item) openVideo(item.video || item.name);
      return;
    }
    if(a==="libAdd"){
      const idx = Number(act.getAttribute("data-i"));
      const item = EX_LIBRARY[idx];
      if(!item) return;
      openSheet("Add to template", `
        <div class="sub">Choose template to add <b>${escapeHtml(item.name)}</b>:</div>
        <div class="hr"></div>
        <div class="list">
          ${state.templates.map(tpl => `
            <button class="templateBtn" data-action="libAddConfirm" data-tpl="${tpl.id}" data-name="${escapeAttr(item.name)}" data-video="${escapeAttr(item.video||"")}">
              <div><div class="name">${escapeHtml(tpl.name)}</div><div class="meta">${escapeHtml(tpl.subtitle||"")}</div></div>
              <div class="tag">${tpl.exercises.length} ex</div>
            </button>
          `).join("")}
        </div>
      `);
      return;
    }
    if(a==="libAddConfirm"){
      const tplId = act.getAttribute("data-tpl");
      const name = act.getAttribute("data-name");
      const video = act.getAttribute("data-video");
      const tpl = state.templates.find(t => t.id===tplId);
      if(!tpl) return;
      tpl.exercises.push({ id:safeUUID(), name, sets:3, reps:"8–12", rest:90, video });
      save(KEY.templates, state.templates);
      toast("Added ✅");
      closeSheet();
      return;
    }

    if(a==="addWeight"){
      const v = Number(document.getElementById("weightInput")?.value);
      if(!Number.isFinite(v)) return toast("Enter kg");
      state.tracker.weight.push({ date: todayStr(), value: v });
      save(KEY.tracker, state.tracker);
      toast("Weight saved ✅");
      render();
      return;
    }
    if(a==="addWaist"){
      const v = Number(document.getElementById("waistInput")?.value);
      if(!Number.isFinite(v)) return toast("Enter cm");
      state.tracker.waist.push({ date: todayStr(), value: v });
      save(KEY.tracker, state.tracker);
      toast("Waist saved ✅");
      render();
      return;
    }
    if(a==="toggleMacrosComplete"){
      const d = getTodayMacros();
      d.completed = !d.completed;
      save(KEY.macros, state.macros);
      toast(d.completed ? "Completed ✅" : "Unmarked");
      render();
      return;
    }
    if(a==="macroPlus"){
      const k = act.getAttribute("data-key");
      const amt = Number(act.getAttribute("data-amt")) || 0;
      const d = getTodayMacros();
      d[k] = Number(d[k]||0) + amt;
      save(KEY.macros, state.macros);
      render();
      return;
    }
    if(a==="editMacroTargets"){
      const t = state.macros.targets;
      openSheet("Macro targets", `
        <div class="sub">Calories</div><input class="input" id="tCal" inputmode="numeric" value="${t.calories}">
        <div class="sub" style="margin-top:10px">Protein (g)</div><input class="input" id="tPro" inputmode="numeric" value="${t.protein}">
        <div class="sub" style="margin-top:10px">Carbs (g)</div><input class="input" id="tCar" inputmode="numeric" value="${t.carbs}">
        <div class="sub" style="margin-top:10px">Fat (g)</div><input class="input" id="tFat" inputmode="numeric" value="${t.fat}">
        <div class="hr"></div>
        <button class="btn ok" data-action="saveMacroTargets">Save</button>
      `);
      return;
    }
    if(a==="saveMacroTargets"){
      const t = state.macros.targets;
      t.calories = Number(document.getElementById("tCal")?.value || t.calories) || t.calories;
      t.protein  = Number(document.getElementById("tPro")?.value || t.protein) || t.protein;
      t.carbs    = Number(document.getElementById("tCar")?.value || t.carbs) || t.carbs;
      t.fat      = Number(document.getElementById("tFat")?.value || t.fat) || t.fat;
      save(KEY.macros, state.macros);
      toast("Targets saved ✅");
      closeSheet();
      render();
      return;
    }

    if(a==="exportJSON"){ exportJSON(); return; }
    if(a==="importJSON"){
      const input = document.getElementById("importFile");
      input.onchange = () => {
        const f = input.files && input.files[0];
        if(f) importJSONFile(f);
        input.value = "";
      };
      input.click();
      return;
    }
    if(a==="resetAll"){
      if(!confirm("Reset all data? This cannot be undone.")) return;
      state.sessions=[]; state.templates=DEFAULT_TEMPLATES;
      state.tracker={weight:[], waist:[]};
      state.macros={targets:DEFAULT_MACROS, days:[]};
      state.settings={units:"kg", plan:{}};
      save(KEY.sessions, state.sessions);
      save(KEY.templates, state.templates);
      save(KEY.tracker, state.tracker);
      save(KEY.macros, state.macros);
      save(KEY.settings, state.settings);
      toast("Reset ✅");
      closeSheet();
      render();
      return;
    }

    if(a==="saveSessionNotes"){
      const s = findSession(state.activeSessionId);
      if(!s) return;
      s.notes = document.getElementById("sessionNotes")?.value || "";
      save(KEY.sessions, state.sessions);
      toast("Saved ✅");
      return;
    }
    if(a==="finishSession"){
      const s = findSession(state.activeSessionId);
      if(!s) return;
      s.finishedAt = new Date().toISOString();
      save(KEY.sessions, state.sessions);
      stopTimer();
      toast("Saved ✅");
      state.showSummaryFor = s.id;
      state.activeSessionId = null;
      render();
      return;
    }
    if(a==="deleteSession"){
      if(!confirm("Delete this session?")) return;
      const id = state.activeSessionId;
      state.sessions = state.sessions.filter(s => s.id!==id);
      save(KEY.sessions, state.sessions);
      stopTimer();
      toast("Deleted ✅");
      state.activeSessionId = null;
      setTab("history");
      return;
    }

    if(a==="addSet"){
      const s = findSession(state.activeSessionId); if(!s) return;
      const exIdx = Number(act.getAttribute("data-ex"));
      const ex = s.exercises[exIdx]; if(!ex) return;
      ex.sets.push({kg:"", reps:"", done:false});
      save(KEY.sessions, state.sessions);
      render();
      return;
    }
    if(a==="delSet"){
      const s = findSession(state.activeSessionId); if(!s) return;
      const exIdx = Number(act.getAttribute("data-ex"));
      const si = Number(act.getAttribute("data-set"));
      const ex = s.exercises[exIdx]; if(!ex) return;
      ex.sets.splice(si,1);
      save(KEY.sessions, state.sessions);
      render();
      return;
    }
    if(a==="toggleDone"){
      const s = findSession(state.activeSessionId); if(!s) return;
      const exIdx = Number(act.getAttribute("data-ex"));
      const si = Number(act.getAttribute("data-set"));
      const ex = s.exercises[exIdx]; if(!ex) return;
      const st = ex.sets[si]; if(!st) return;
      st.done = !st.done;
      save(KEY.sessions, state.sessions);
      render();
      if(st.done){
        startTimer(Number(ex.rest)||60);
        haptic(25);
      }
      return;
    }
    if(a==="rest"){
      const s = findSession(state.activeSessionId); if(!s) return;
      const exIdx = Number(act.getAttribute("data-ex"));
      const ex = s.exercises[exIdx]; if(!ex) return;
      startTimer(Number(ex.rest)||60);
      return;
    }
    if(a==="video"){
      const s = findSession(state.activeSessionId); if(!s) return;
      const exIdx = Number(act.getAttribute("data-ex"));
      const ex = s.exercises[exIdx]; if(!ex) return;
      openVideo(ex.video || ex.name);
      return;
    }

    if(a==="summaryToHistory"){ state.showSummaryFor=null; setTab("history"); return; }
    if(a==="summaryStartAnother"){ state.showSummaryFor=null; setTab("home"); return; }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if(!(el instanceof HTMLElement)) return;

    const a = el.getAttribute("data-action");
    if(a==="editSet"){
      const s = findSession(state.activeSessionId); if(!s) return;
      const exIdx = Number(el.getAttribute("data-ex"));
      const si = Number(el.getAttribute("data-set"));
      const field = el.getAttribute("data-field");
      const ex = s.exercises[exIdx]; if(!ex) return;
      const st = ex.sets[si]; if(!st) return;
      st[field] = el.value;
      save(KEY.sessions, state.sessions);
      return;
    }
    if(a==="macroInput"){
      const key = el.getAttribute("data-key");
      const d = getTodayMacros();
      const v = Number(el.value);
      d[key] = Number.isFinite(v) ? v : 0;
      save(KEY.macros, state.macros);
      return;
    }
  });

  renderNav();
  render();
  setStatus("Ready");
})();
