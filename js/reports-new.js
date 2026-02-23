import { db, collection, getDocs } from "../js/firebase.js";

let allAttendanceRecords = [];
let allCampaigns = [];
let allUsers = [];
let reportData = [];

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", initReports);

async function initReports(){
    await loadAllData();
    updateSummary();
    renderTable(allAttendanceRecords);
}

/* =========================
   SAFE DATE PARSER
========================= */
function parseTime(t){
    if(!t) return "N/A";

    if(t.seconds) return new Date(t.seconds*1000).toLocaleString();
    if(typeof t==="number") return new Date(t).toLocaleString();

    return new Date(t).toLocaleString();
}

/* =========================
   LOAD DATA
========================= */
async function loadAllData(){

    const [att,camp,users] = await Promise.all([
        getDocs(collection(db,"attendance")),
        getDocs(collection(db,"campaigns")),
        getDocs(collection(db,"users"))
    ]);

    allAttendanceRecords=[];
    allCampaigns=[];
    allUsers=[];

    att.forEach(d=>allAttendanceRecords.push({id:d.id,...d.data()}));
    camp.forEach(d=>allCampaigns.push({id:d.id,...d.data()}));
    users.forEach(d=>allUsers.push({id:d.id,...d.data()}));

    populateFilters();
}

/* =========================
   SUMMARY CARDS
========================= */
function updateSummary(){

    let checkins=0;
    let checkouts=0;

    allAttendanceRecords.forEach(r=>{
        if(r.type==="checkout") checkouts++;
        else checkins++;
    });

    const total=allAttendanceRecords.length;
    const rate= total ? Math.round((checkins/total)*100) : 0;

    setText("totalRecords", total);
    setText("totalIn", checkins);
    setText("totalOut", checkouts);
    setText("attendanceRate", rate+"%");
}

function setText(id,val){
    const el=document.getElementById(id);
    if(el) el.textContent=val;
}

/* =========================
   MAIN TABLE
========================= */
function renderTable(records){

    const list=document.getElementById("reportsList");
    if(!list) return;

    if(!records.length){
        list.innerHTML="<tr><td colspan='6'>No records</td></tr>";
        return;
    }

    list.innerHTML = records.slice(0,50).map(r=>{
        const camp=allCampaigns.find(c=>c.id===r.campaignId);

        return `
        <tr>
            <td>${r.userName||"Unknown"}</td>
            <td>${camp?.name||"N/A"}</td>
            <td>${r.type!=="checkout"?parseTime(r.timestamp):"N/A"}</td>
            <td>${r.type==="checkout"?parseTime(r.timestamp):"N/A"}</td>
            <td>${r.location||"N/A"}</td>
            <td>${r.photo?"✓":"✕"}</td>
        </tr>`;
    }).join("");
}

/* =========================
   FILTER MODAL
========================= */
function populateFilters(){

    const cSel=document.getElementById("reportCampaign");
    const uSel=document.getElementById("reportUser");

    if(cSel){
        cSel.innerHTML="<option value=''>All Campaigns</option>";
        allCampaigns.forEach(c=>{
            cSel.innerHTML+=`<option value="${c.id}">${c.name}</option>`;
        });
    }

    if(uSel){
        uSel.innerHTML="<option value=''>All Users</option>";
        allUsers.forEach(u=>{
            uSel.innerHTML+=`<option value="${u.id}">${u.name}</option>`;
        });
    }
}

/* =========================
   GENERATE REPORT
========================= */
window.generateReport=function(){

    let res=[...allAttendanceRecords];

    const s=document.getElementById("reportStart").value;
    const e=document.getElementById("reportEnd").value;
    const c=document.getElementById("reportCampaign").value;
    const u=document.getElementById("reportUser").value;

    if(s) res=res.filter(r=>new Date(r.timestamp)>=new Date(s));
    if(e){
        const end=new Date(e);
        end.setHours(23,59,59);
        res=res.filter(r=>new Date(r.timestamp)<=end);
    }

    if(c) res=res.filter(r=>r.campaignId===c);
    if(u) res=res.filter(r=>r.userId===u);

    reportData=res;
    showResults(res);
    closeReportModal();
};

/* =========================
   SHOW RESULTS
========================= */
function showResults(records){

    const sec=document.getElementById("reportResultsSection");
    const div=document.getElementById("reportResults");

    if(!records.length){
        div.innerHTML="No results";
        sec.style.display="block";
        return;
    }

    div.innerHTML=records.map(r=>{
        const camp=allCampaigns.find(c=>c.id===r.campaignId);

        return `
        <div class="result-row">
            ${r.userName} — ${camp?.name||""} — ${parseTime(r.timestamp)}
        </div>`;
    }).join("");

    sec.style.display="block";
}

/* =========================
   EXPORT CSV
========================= */
window.downloadReportCSV=function(){

    if(!reportData.length) return alert("Generate report first");

    let csv="User,Campaign,Date,Location,Type\n";

    reportData.forEach(r=>{
        const camp=allCampaigns.find(c=>c.id===r.campaignId);
        csv+=`${r.userName},${camp?.name||""},${parseTime(r.timestamp)},${r.location||""},${r.type||"checkin"}\n`;
    });

    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);

    const a=document.createElement("a");
    a.href=url;
    a.download="report.csv";
    a.click();
};

/* =========================
   MODAL
========================= */
window.openReportModal=()=>{
    document.getElementById("reportModal")?.style.display="flex";
};

window.closeReportModal=()=>{
    document.getElementById("reportModal")?.style.display="none";
};

/* =========================
   LOGOUT
========================= */
window.handleLogout=()=>{
    if(confirm("Logout?")){
        sessionStorage.clear();
        // Replace history entry so Back can't return to protected pages
        location.replace('login.html');
    }
};

// =======================
// AUTH GUARD (protected pages)
// =======================
(function(){
    function _loginRedirect(){
        const p = location.pathname || '';
        const loginPath = p.includes('/admin/') ? '../login.html' : 'login.html';
        location.replace(loginPath);
    }
    let cu = null;
    try { cu = JSON.parse(sessionStorage.getItem('user')); } catch(e) { cu = null; }
    if (!cu) {
        try { sessionStorage.clear(); } catch(e){}
        _loginRedirect();
    }
})();
