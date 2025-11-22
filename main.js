const arriveBtn=document.getElementById('arriveBtn');
const leaveBtn=document.getElementById('leaveBtn');
const exportBtn=document.getElementById('exportBtn');
const clearBtn=document.getElementById('clearBtn');
const undoBtn=document.getElementById('undoBtn');
const darkModeBtn=document.getElementById('darkModeBtn');
const filterSelect=document.getElementById('filterSelect');
const fromDate=document.getElementById('fromDate');
const toDate=document.getElementById('toDate');
const applyRangeBtn=document.getElementById('applyRangeBtn');
const clearRangeBtn=document.getElementById('clearRangeBtn');
const historyTable=document.querySelector('#historyTable tbody');
const totalHoursDiv=document.getElementById('totalHours');
const summaryBox=document.getElementById('summaryBox');
const ctx=document.getElementById('hoursChart').getContext('2d');

let history=JSON.parse(localStorage.getItem('workLog')||'[]');
let lastHistoryState=null;
let chart;
let customFilter=null;

function saveState(){ lastHistoryState=JSON.parse(JSON.stringify(history)); }
function undoLastAction(){
  if(lastHistoryState){
    history=JSON.parse(JSON.stringify(lastHistoryState));
    localStorage.setItem('workLog',JSON.stringify(history));
    lastHistoryState=null;
    renderHistory();
    alert("Last action undone!");
  } else alert("No recent action to undo.");
}

function calcDuration(start,end){const [sh,sm,ss]=start.split(':').map(Number);const [eh,em,es]=end.split(':').map(Number);
  let diff=(new Date(0,0,0,eh,em,es)-new Date(0,0,0,sh,sm,ss))/1000/60/60; if(diff<0) diff+=24; return diff;}
function formatDuration(hours){const h=Math.floor(hours);const m=Math.round((hours-h)*60); return `${h}h ${m}m`;}

// Render
function renderHistory(){
  let filtered=[...history];
  const now=new Date();
  if(customFilter){ filtered=filtered.filter(e=>new Date(e.date)>=new Date(customFilter.from) && new Date(e.date)<=new Date(customFilter.to)); }
  else{
    if(filterSelect.value==='week'){const start=new Date(now); start.setDate(now.getDate()-now.getDay()); start.setHours(0,0,0,0); filtered=filtered.filter(e=>new Date(e.date)>=start);}
    if(filterSelect.value==='month'){const m=now.getMonth(), y=now.getFullYear(); filtered=filtered.filter(e=>{const d=new Date(e.date); return d.getMonth()===m && d.getFullYear()===y;});}
  }

  historyTable.innerHTML='';
  filtered.forEach((e,i)=>{
    const duration=(e.arrived&&e.left)?calcDuration(e.arrived,e.left):null;
    const row=document.createElement('tr');
    const displayDate=new Date(e.date).toLocaleDateString();
    row.innerHTML=`<td>${displayDate}</td><td>${e.arrived||'-'}</td><td>${e.left||'-'}</td><td>${duration?formatDuration(duration):'-'}</td>
      <td><button onclick="editEntry(${i})">Edit</button> <button onclick="deleteEntry(${i})">Delete</button></td>`;
    historyTable.appendChild(row);
  });

  updateChart(filtered);
  updateTotalHours(filtered);
  updateSummary();
}

// Total Hours
function updateTotalHours(filtered){
  let total=0; filtered.forEach(e=>{if(e.arrived&&e.left) total+=calcDuration(e.arrived,e.left);});
  totalHoursDiv.textContent=`Total: ${formatDuration(total)} ${customFilter?'in range':filterSelect.value==='week'?'this week':filterSelect.value==='month'?'this month':'in total'}`;
}

// Chart
function updateChart(filtered){
  const labels=[], hours=[];
  filtered.slice().reverse().forEach(e=>{if(e.arrived&&e.left){labels.push(new Date(e.date).toLocaleDateString()); hours.push(calcDuration(e.arrived,e.left));}});
  if(chart) chart.destroy();
  chart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Hours Worked',data:hours,backgroundColor:'#4caf50'}]},options:{scales:{y:{beginAtZero:true,title:{display:true,text:'Hours'}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>formatDuration(ctx.parsed.y)}}}}});
}

// Summary Box
function updateSummary(){
  const now=new Date();
  const weekStart=new Date(now); weekStart.setDate(now.getDate()-now.getDay()); weekStart.setHours(0,0,0,0);
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  let weekTotal=0, monthTotal=0;
  history.forEach(e=>{const d=new Date(e.date); if(e.arrived&&e.left){const hrs=calcDuration(e.arrived,e.left); if(d>=weekStart) weekTotal+=hrs; if(d>=monthStart) monthTotal+=hrs;}});
  summaryBox.textContent=`Weekly: ${formatDuration(weekTotal)} | Monthly: ${formatDuration(monthTotal)}`;
}

// CRUD
function logArrival(){ saveState(); const now=new Date(), iso=now.toISOString().split('T')[0], time=now.toLocaleTimeString();
  const existing=history.find(e=>e.date===iso); if(existing) existing.arrived=time; else history.unshift({date:iso,arrived:time,left:null});
  localStorage.setItem('workLog',JSON.stringify(history)); renderHistory();}
function logLeave(){ saveState(); const now=new Date(), iso=now.toISOString().split('T')[0], time=now.toLocaleTimeString();
  const existing=history.find(e=>e.date===iso); if(existing) existing.left=time; else history.unshift({date:iso,arrived:null,left:time});
  localStorage.setItem('workLog',JSON.stringify(history)); renderHistory();}
function exportCSV(){ if(history.length===0){alert('No data to export!');return;}
  let csv="Date,Arrived,Left,Duration (hours)\n"; history.forEach(e=>{const duration=(e.arrived&&e.left)?calcDuration(e.arrived,e.left).toFixed(2):''; csv+=`"${e.date}","${e.arrived||''}","${e.left||''}","${duration}"\n`;});
  const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`WorkLog_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);}
function clearAllData(){ saveState(); if(confirm('Are you sure you want to clear all data?')){history=[];localStorage.removeItem('workLog'); renderHistory();}}
function toggleDarkMode(){document.body.classList.toggle('dark');}
function editEntry(i){ saveState(); const entry=history[i]; const newArr=prompt("Edit arrival time:",entry.arrived||""); if(newArr!==null) entry.arrived=newArr.trim(); const newLeave=prompt("Edit leave time:",entry.left||""); if(newLeave!==null) entry.left=newLeave.trim(); localStorage.setItem('workLog',JSON.stringify(history)); renderHistory();}
function deleteEntry(i){ saveState(); if(confirm("Delete this entry?")){history.splice(i,1); localStorage.setItem('workLog',JSON.stringify(history)); renderHistory();}}

// Custom Range
applyRangeBtn.addEventListener('click',()=>{if(fromDate.value&&toDate.value){customFilter={from:fromDate.value,to:toDate.value}; renderHistory();}});
clearRangeBtn.addEventListener('click',()=>{customFilter=null; fromDate.value=''; toDate.value=''; renderHistory();});

// Events
arriveBtn.addEventListener('click',logArrival);
leaveBtn.addEventListener('click',logLeave);
exportBtn.addEventListener('click',exportCSV);
clearBtn.addEventListener('click',clearAllData);
undoBtn.addEventListener('click',undoLastAction);
darkModeBtn.addEventListener('click',toggleDarkMode);
filterSelect.addEventListener('change',()=>{customFilter=null; renderHistory();});

// Initial Render
renderHistory();