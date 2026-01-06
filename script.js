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
  let cin = document.getElementById("dcaCin").value;
  let stars = document.getElementById("dcaStars").value;

  let res = await fetch(`${API}/register_dca`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ name, cin, stars })
  });

  let data = await res.json();
  alert(data.message);
}


async function createCase(){
  let client = document.getElementById("caseClient").value;
  let amount = document.getElementById("caseAmount").value;
  let country = document.getElementById("caseCountry").value;

  let res = await fetch(`${API}/create_case`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ client, amount, country })
  });

  let data = await res.json();
  alert("Case Created: " + data.case_id);
  loadCases();
}

async function loadCases(){
  let res = await fetch(`${API}/cases`);
  let data = await res.json();

  let html="";
  data.forEach(c=>{
    html+=`<tr>
      <td>${c.id}</td>
      <td>${c.client}</td>
      <td>₹${c.amount}</td>
      <td>${c.country}</td>
      <td>${c.dca}</td>
      <td><span class="status ${c.status.toLowerCase()}">${c.status}</span></td>
    </tr>`;
  });

  document.getElementById("casesBody").innerHTML = html;
}

// window.onload = loadCases;
async function registerDCA(){
  let name = document.getElementById("dcaName").value;
  let cin  = document.getElementById("cin").value;
  let stars= parseInt(document.getElementById("stars").value);

  const res = await fetch("http://127.0.0.1:8000/register_dca", {
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
  // render your DCA table here
}

async function assignCase(){
  let res = await fetch(`${API}/assign_case`,{ method:"POST" });
  let data = await res.json();
  alert(data.message || `Case ${data.case} assigned to ${data.assigned_to}`);
  loadCases();
}


async function recoverCase(){
  let case_id = document.getElementById("recoverCaseId").value;
  let days = document.getElementById("recoverDays").value;

  let res = await fetch(`${API}/recover_case`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ case_id, days })
  });

  let data = await res.json();
  alert("Recovered. Score gained: " + Math.round(data.deltaS));
  loadCases();
}

async function autopay(){
  let case_id = document.getElementById("payCaseId").value;

  let res = await fetch(`${API}/autopay?case_id=` + case_id,{ method:"POST" });
  let data = await res.json();
  alert("Commission Paid: ₹" + Math.round(data.commission));
  loadCases();
}


async function loadLeaderboard(){
  let res = await fetch(`${API}/leaderboard`);
  let data = await res.json();

  let html="";
  data.forEach(r=>{
    html+=`<tr>
      <td>#${r.rank}</td>
      <td>${r.name}</td>
      <td>${r.stars}⭐</td>
      <td>${r.score}</td>
    </tr>`;
  });

  document.getElementById("leaderboardBody").innerHTML = html;
}

async function loadDashboard(){
  let res = await fetch(`${API}/dashboard_stats`);
  let d = await res.json();

  document.getElementById("pendingAmt").innerText = "₹" + d.total_pending;
  document.getElementById("activeDcas").innerText = d.active_dcas;
  document.getElementById("recoveredMonth").innerText = "₹" + d.recovered_month;
  document.getElementById("topDca").innerText = d.top_dca;
}
