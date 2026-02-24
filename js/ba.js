import {
    db,
    collection,
    getDocs,
    getDoc,
    addDoc,
    query,
    where,
    doc
} from "./firebase.js";
import { clearAllCache } from "./localStorage.js";


// =======================
// AUTH SESSION CHECK
// =======================
function _loginRedirect() {
    const p = location.pathname || '';
    const loginPath = p.includes('/admin/') ? '../login.html' : 'login.html';
    location.replace(loginPath);
}

const user = (() => {
    try { return JSON.parse(sessionStorage.getItem('user')); } catch (e) { return null; }
})();

if (!user || user.role !== "staff") {
    try { sessionStorage.clear(); } catch (e) {}
    _loginRedirect();
}


// =======================
// UI REFERENCES
// =======================
const nameEl = document.getElementById("userName");
const currentEl = document.getElementById("currentCampaign");
const listEl = document.getElementById("campaignList");
const historyEl = document.getElementById("historyList");
const baListEl = document.getElementById("brandAmbassadorsList");

nameEl.textContent = user.name;


// =======================
// LOAD CAMPAIGNS
// =======================
async function loadCampaigns() {

    // Read explicit assignments, then join campaign details
    const q = query(
        collection(db, "campaign_assignments"),
        where("baId", "==", user.id)
    );

    const snap = await getDocs(q);
    const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const campaigns = [];
    for (const a of assignments) {
        try {
            const cdoc = await getDoc(doc(db, 'campaigns', a.campaignId));
            if (cdoc.exists()) {
                const c = { id: cdoc.id, ...cdoc.data() };
                campaigns.push({ ...c, assignmentId: a.id });
            }
        } catch (err) {
            console.warn('Could not load campaign for assignment', a, err);
        }
    }

    if (campaigns.length === 0) {
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
// LOAD BRAND AMBASSADORS
// =======================
async function loadBrandAmbassadors() {
    try {
        const q = query(
            collection(db, "users"),
            where("role", "==", "brand_ambassador")
        );

        const snap = await getDocs(q);
        let ambassadors = [];

        snap.forEach(doc => {
            ambassadors.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderBrandAmbassadors(ambassadors);
    } catch (error) {
        console.error('Error loading brand ambassadors:', error);
        baListEl.innerHTML = '<p style="color: #ef4444;">Error loading brand ambassadors</p>';
    }
}


// =======================
// RENDER BRAND AMBASSADORS
// =======================
function renderBrandAmbassadors(ambassadors) {
    if (ambassadors.length === 0) {
        baListEl.innerHTML = '<p style="color: #6b7280;">No brand ambassadors found</p>';
        return;
    }

    baListEl.innerHTML = ambassadors.map(ba => `
        <div class="list-item" style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                ${ba.name.charAt(0).toUpperCase()}
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0; font-weight: 600;">${ba.name}</h4>
                <p style="margin: 5px 0 0 0; font-size: 0.875rem; color: #6b7280;">${ba.email || 'No email'}</p>
            </div>
            <span style="padding: 4px 8px; background: #dbeafe; color: #1e40af; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Brand Ambassador</span>
        </div>
    `).join("");
}


// =======================
// LOGOUT
// =======================
window.logout = function(){
    clearAllCache();
    sessionStorage.clear();
    // Replace history so Back doesn't return to protected page
    window.location.replace('login.html');
}


// =======================
// INIT
// =======================
loadCampaigns();
loadBrandAmbassadors();
loadHistory();
