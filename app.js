
let sessions = JSON.parse(localStorage.getItem("steady_sessions")||"[]");
let current = null;

function save(){
  localStorage.setItem("steady_sessions",JSON.stringify(sessions));
}

function home(){
document.getElementById("view").innerHTML=`
<h2>Start Workout</h2>
<button onclick="start('Upper A')">Upper A</button>
<button onclick="start('Lower A')">Lower A</button>
<button onclick="start('Upper B')">Upper B</button>
<button onclick="start('Lower B')">Lower B</button>
`;
}

function start(name){
current={name:name,date:new Date().toISOString(),sets:[]};
document.getElementById("view").innerHTML=`
<h2>${name}</h2>
<input id="kg" placeholder="KG">
<input id="reps" placeholder="Reps">
<br>
<button onclick="addSet()">Add Set</button>
<button onclick="finish()">Finish</button>
`;
}

function addSet(){
current.sets.push({
kg:document.getElementById("kg").value,
reps:document.getElementById("reps").value
});
alert("Set added");
}

function finish(){
sessions.push(current);
save();
alert("Saved");
home();
}

function history(){
let h = "<h2>History</h2>";
sessions.slice().reverse().forEach(s=>{
h+=`<p>${s.name} - ${new Date(s.date).toLocaleDateString()}</p>`;
});
document.getElementById("view").innerHTML=h;
}

home();
