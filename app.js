const view = document.getElementById("view");
const footerWrap = document.getElementById("footerWrap");

const templates = [
  {
    id:"upperA",
    name:"Upper A",
    exercises:[
      {name:"Smith Incline Bench Press", videoSearch:"smith machine incline bench press form"},
      {name:"Chest Supported Row", videoSearch:"chest supported row machine form"},
      {name:"Cable Tricep Pushdown", videoSearch:"cable tricep pushdown form"}
    ]
  }
];

let activeWorkout = null;

function openVideo(search){
  const youtubeUrl = search.startsWith("http")
    ? search
    : "https://www.youtube.com/results?search_query=" + encodeURIComponent(search);

  window.open(youtubeUrl, "_blank", "noopener,noreferrer");
}

function renderNav(){
  footerWrap.innerHTML = `
    <button class="navbtn" onclick="renderHome()">Home</button>
    <button class="navbtn" onclick="renderWorkout()">Workout</button>
  `;
}

function renderHome(){
  view.innerHTML = `
    <div class="card">
      <h2>Dashboard</h2>
      <button class="btn" onclick="renderWorkout()">Start Workout</button>
    </div>
  `;
}

function renderWorkout(){
  if(!activeWorkout){
    activeWorkout = templates[0];
  }

  const exercises = activeWorkout.exercises.map(ex => `
    <div class="exercise">
      <div>${ex.name}</div>
      <button class="btn" onclick="openVideo('${ex.videoSearch}')">Video</button>
    </div>
  `).join("");

  view.innerHTML = `
    <div class="card">
      <h2>${activeWorkout.name}</h2>
      ${exercises}
    </div>
  `;
}

renderNav();
renderHome();
