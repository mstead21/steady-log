function toast(msg){
const t=document.getElementById('toast');
t.textContent=msg;
t.classList.add('show');
setTimeout(()=>t.classList.remove('show'),1500);
}

function homeView(){
document.getElementById('pillStatus').textContent='Dashboard';
document.getElementById('view').innerHTML=`
<div class="card">
<h2>Start Workout</h2>
<button class="btn" onclick="toast('Workout Started')">Upper A</button>
</div>`;
}

function trackerView(){
document.getElementById('pillStatus').textContent='Tracker';
document.getElementById('view').innerHTML=`
<div class="card">
<h2>Log Weight</h2>
<input type="number" id="weight" placeholder="Weight (kg)" />
<button class="btn" onclick="saveWeight()">Save</button>
</div>`;
}

function saveWeight(){
const w=document.getElementById('weight').value;
if(!w) return alert('Enter weight');
localStorage.setItem('lastWeight',w);
toast('Weight saved');
}

homeView();
