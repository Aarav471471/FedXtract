
const API = "https://fedxtract-backend.onrender.com";

function show(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if(id === "dashboard"){
     loadDashboard();
    loadCases();  
  }
}
/* ====== TOAST ====== */
function toast(msg){
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),3000);
}

/* ====== REGISTER DCA ====== */
async function registerDCA(){
  let name = document.getElementById("dcaName").value;
  let cin  = document.getElementById("cin").value;
  let stars= parseInt(document.getElementById("stars").value);

  const res = await fetch(`${API}/register_dca`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({name,cin,stars})
  });

  const data = await res.json();
  toast(data.message);       
  loadDCAs(); 
}

async function createCase(){
  const client  = document.getElementById("clientName").value;
  const amount  = parseFloat(document.getElementById("amount").value);
  const country = document.getElementById("country").value;

  const res = await fetch(`${API}/create_case`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({client,amount,country})
  });

  const data = await res.json();
  alert("CASE CREATED: " + data.case_id);
  loadCases();
}

async function loadCases(){
  const res = await fetch(`${API}/cases`);
  const data = await res.json();

  const body = document.getElementById("caseBody");
  body.innerHTML = "";

  data.forEach(c=>{
    body.innerHTML += `
      <tr>
        <td>${c.id}</td>
        <td>${c.client}</td>
        <td>$${c.amount}</td>
        <td>${c.country}</td>
        <td>${c.dca}</td>
        <td><span class="status ${c.status.toLowerCase()}">${c.status}</span></td>
      </tr>`;
  });
}

// window.onload = loadCases;
async function registerDCA(){
  let name = document.getElementById("dcaName").value;
  let cin  = document.getElementById("cin").value;
  let stars= parseInt(document.getElementById("stars").value);

  const res = await fetch(`${API}/register_dca`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({name,cin,stars})
  });

  const data = await res.json();

  alert("SERVER SAYS: " + data.message);   // <-- ALWAYS VISIBLE
}
/* ====== LOAD DCA TABLE ====== */
async function loadDCAs(){
  const res = await fetch(`${API}/dcas`);
  const data = await res.json();

  const t = document.getElementById("dcaTable");
  t.innerHTML = `<tr><th>Name</th><th>CIN</th><th>Stars</th><th>Score</th></tr>`;

  data.forEach(d=>{
    t.innerHTML += `<tr>
      <td>${d.name}</td>
      <td>${d.cin}</td>
      <td>${"⭐".repeat(d.stars)}</td>
      <td>${d.score}</td>
    </tr>`;
  });
}

loadDCAs();


async function assignCase(){
  let res = await fetch(`${API}/assign_case`,{
    method:"POST"
  });

  let data = await res.json();

  if(data.message){
    alert(data.message);
  }else{
    alert("Case " + data.case + " assigned to " + data.assigned_to);
  }

  loadCases();
}

async function recoverCase(){
  let cid = prompt("Enter Case ID");
  let days = prompt("Days taken");

  let res = await fetch(`${API}/recover_case`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({case_id:cid, days:parseInt(days)})
  });

  let data = await res.json();
  alert("ΔS = " + Math.round(data.deltaS) + " | Country Tavg updated to " + Math.round(data.new_tavg) + " days");
  loadCases();
}
async function autopayCase(){
  let cid = prompt("Enter Case ID");

  let res = await fetch(`${API}/autopay`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({case_id:cid})
  });

  let data = await res.json();
  alert("₹" + Math.round(data.commission) + " auto‑paid to " + data.dca);
  loadCases();
}

async function loadLeaderboard(){
  let res = await fetch(`${API}/leaderboard`);
  let data = await res.json();

  let html = "<tr><th>Rank</th><th>DCA</th><th>Stars</th><th>AI Score</th></tr>";
  data.forEach(d=>{
    html += `<tr>
      <td>#${d.rank}</td>
      <td>${d.name}</td>
      <td>${"⭐".repeat(d.stars)}</td>
      <td>${d.score}</td>
    </tr>`;
  });

  document.getElementById("leaderTable").innerHTML = html;
}


async function loadDashboard(){
  let res = await fetch(`${API}/dashboard_stats`);
  let d = await res.json();

  document.getElementById("pendingAmt").innerText = "₹" + d.total_pending;
  document.getElementById("activeDcas").innerText = d.active_dcas;
  document.getElementById("recoveredMonth").innerText = "₹" + d.recovered_month;
  document.getElementById("topDca").innerText = d.top_dca;
}
