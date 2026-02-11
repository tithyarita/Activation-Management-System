import { db, collection, getDocs } from "../js/firebase.js";

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", loadPage);

async function loadPage(){
    const data = await gatherLeaderData();
    renderPerformance(data);
    renderRanking(data);
    renderTimeline(data);
}

/* =========================
   DATA GATHERING
========================= */
async function gatherLeaderData(){

    const usersSnap = await getDocs(collection(db,'users'));
    const attendanceSnap = await getDocs(collection(db,'attendance'));
    const campaignsSnap = await getDocs(collection(db,'campaigns'));

    const leaders=[];

    usersSnap.forEach(d=>{
        const u=d.data();
        if(u.role==="leader"){
            leaders.push({id:d.id,...u});
        }
    });

    leaders.forEach(l=>{
        l.campaigns=0;
        l.attendance=0;
        l.staff=new Set();

        campaignsSnap.forEach(c=>{
            if(c.data().leaderId===l.id){
                l.campaigns++;
                (c.data().staffIds||[]).forEach(s=>l.staff.add(s));
            }
        });

        attendanceSnap.forEach(a=>{
            if(a.data().userId===l.id){
                l.attendance++;
            }
        });

        l.staffCount=l.staff.size;
        l.rate=l.campaigns
            ? Math.round((l.attendance/l.campaigns)*100)
            : 0;
    });

    leaders.sort((a,b)=>b.attendance-a.attendance);
    return leaders;
}

/* =========================
   UI RENDER
========================= */
function renderPerformance(leaders){
    const el=document.getElementById("leaderPerformance");

    if(!leaders.length){
        el.innerHTML="No leaders found";
        return;
    }

    el.innerHTML=leaders.slice(0,3).map((l,i)=>`
        <div class="performance-card">
            <div class="rank-badge">#${i+1}</div>
            <h4>${l.name}</h4>
            <p>${l.email}</p>
            <div class="stat-row">
                <span>Campaigns: ${l.campaigns}</span>
                <span>Check-ins: ${l.attendance}</span>
            </div>
        </div>
    `).join("");
}

function renderRanking(leaders){
    const el=document.getElementById("leaderRankingTable");

    el.innerHTML=leaders.map((l,i)=>`
        <tr>
            <td>${i+1}</td>
            <td>${l.name}</td>
            <td>${l.email}</td>
            <td>${l.campaigns}</td>
            <td>${l.staffCount}</td>
            <td>${l.rate}%</td>
            <td>${l.attendance}</td>
        </tr>
    `).join("");
}

function renderTimeline(leaders){
    const el=document.getElementById("leaderActivityTimeline");

    el.innerHTML=leaders.slice(0,5).map(l=>`
        <div class="timeline-item">
            <strong>${l.name}</strong>
            checked in ${l.attendance} times
        </div>
    `).join("");
}

/* =========================
   LOGOUT
========================= */
window.handleLogout=()=>{
    if(confirm("Logout?")){
        sessionStorage.clear();
        location.href="login.html";
    }
};
