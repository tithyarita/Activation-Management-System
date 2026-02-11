import {
    db,
    collection,
    getDocs,
    addDoc,
    query,
    where
} from "./firebase.js";


// =======================
// AUTH SESSION CHECK
// =======================
const user = JSON.parse(sessionStorage.getItem("user"));

if (!user || user.role !== "staff") {
    window.location.href = "../html/login.html";
}


// =======================
// UI REFERENCES
// =======================
const nameEl = document.getElementById("userName");
const currentEl = document.getElementById("currentCampaign");
const listEl = document.getElementById("campaignList");
const historyEl = document.getElementById("historyList");

nameEl.textContent = user.name;


// =======================
// LOAD CAMPAIGNS
// =======================
async function loadCampaigns() {

    const q = query(
        collection(db,"campaignAssignments"),
        where("userId","==",user.id)
    );

    const snap = await getDocs(q);

    let campaigns = [];

    snap.forEach(doc => campaigns.push(doc.data()));

    if (campaigns.length === 0){
        currentEl.innerHTML = "No campaign assigned";
        return;
    }

    renderCurrent(campaigns[0]);
    renderList(campaigns);
}


// =======================
// RENDER CURRENT
// =======================
function renderCurrent(c) {

    currentEl.innerHTML = `
        <div class="campaign active-campaign">
            <div>
                <h3>${c.name}</h3>
                <p>${c.date} · ${c.start} - ${c.end}</p>
                <small>${c.location}</small>
            </div>
            <button class="btn" id="checkBtn">✔ Check In</button>
        </div>
    `;

    document
        .getElementById("checkBtn")
        .addEventListener("click", () => checkIn(c));
}


// =======================
// CHECK IN
// =======================
async function checkIn(campaign){

    await addDoc(collection(db,"attendance"),{

        userId:user.id,
        userName:user.name,

        campaignId:campaign.id,
        campaignName:campaign.name,

        type:"checkin",
        timestamp:Date.now()

    });

    alert("Check-In Successful!");
    loadHistory();
}


// =======================
// RENDER LIST
// =======================
function renderList(campaigns){

    listEl.innerHTML = campaigns.map(c => `
        <div class="list-item">
            <span class="icon-green">📣</span>
            <div>
                <h4>${c.name}</h4>
                <p>${c.date} · ${c.start}-${c.end}</p>
            </div>
        </div>
    `).join("");
}


// =======================
// LOAD HISTORY
// =======================
async function loadHistory(){

    const q = query(
        collection(db,"attendance"),
        where("userId","==",user.id)
    );

    const snap = await getDocs(q);

    let html="";

    snap.forEach(doc=>{
        const d=doc.data();

        html += `
        <div class="campaign history-item">
            <div>
                <h3>${d.campaignName}</h3>
                <p>${new Date(d.timestamp).toLocaleString()}</p>
            </div>
            <button class="btn secondary">${d.type}</button>
        </div>`;
    });

    historyEl.innerHTML = html || "No history yet";
}


// =======================
// LOGOUT
// =======================
window.logout = function(){
    sessionStorage.clear();
    window.location.href="../html/login.html";
}


// =======================
// INIT
// =======================
loadCampaigns();
loadHistory();
