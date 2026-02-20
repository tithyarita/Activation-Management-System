// ===============================
// IMPORT FIREBASE
// ===============================
import {
  db,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "../js/firebase.js";


// ===============================
// PAGE INIT
// ===============================
window.addEventListener("DOMContentLoaded", async () => {
  await loadCampaigns();
  await loadLeaders();

  const form = document.getElementById("campaignForm");
  if (form) form.addEventListener("submit", handleAddCampaign);
});


// ===============================
// LOAD CAMPAIGNS FROM FIRESTORE
// ===============================
async function loadCampaigns() {

  const list = document.getElementById("campaignsList");
  list.innerHTML = "Loading campaigns...";

  const snapshot = await getDocs(collection(db, "campaigns"));

  if (snapshot.empty) {
    list.innerHTML = "No campaigns found";
    updateAnalytics([]);
    return;
  }

  let html = "";
  const dataArr = [];

  snapshot.forEach(c => {
    const data = c.data();
    dataArr.push(data);

    // Format dates
    const startDate = data.start_date ? new Date(data.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    const endDate = data.end_date ? new Date(data.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    const budget = data.budget ? `$${data.budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';

    html += `
      <div class="campaign-card">

        <div class="campaign-header">
          <h4>${data.name}</h4>
          <span class="campaign-status">${data.status || "upcoming"}</span>
        </div>

        <div class="campaign-info">
          <p><b>Dates:</b> ${startDate} to ${endDate}</p>
          <p><b>Time:</b> ${data.startTime || 'N/A'} - ${data.endTime || 'N/A'}</p>
          <p><b>Location:</b> ${data.location}</p>
          <p><b>Budget:</b> ${budget}</p>
          <p><b>Leader:</b> ${data.assignedLeader || "Unassigned"}</p>
        </div>

        <div class="campaign-actions">
          <button class="btn btn-edit"
            onclick="editCampaign('${c.id}')">Edit</button>

          <button class="btn btn-danger"
            onclick="deleteCampaign('${c.id}')">Delete</button>

          <button class="btn btn-assign"
            onclick="openAssignModal('${c.id}','${data.name}')">
            Assign Leader
          </button>
        </div>

      </div>
    `;
  });

  list.innerHTML = html;
  updateAnalytics(dataArr);
}


// ===============================
// ADD CAMPAIGN
// ===============================
async function handleAddCampaign(e) {
  e.preventDefault();

  const campaign = {
    name: document.getElementById('campaignName').value,
    start_date: document.getElementById('campaignStartDate').value,
    end_date: document.getElementById('campaignEndDate').value,
    startTime: document.getElementById('campaignStartTime').value,
    endTime: document.getElementById('campaignEndTime').value,
    location: document.getElementById('campaignLocation').value,
    budget: parseFloat(document.getElementById('campaignBudget').value) || 0,
    status: "upcoming",
    progress: 0,
    assignedLeader: "",
    assigned_leaders: [],
    description: "",
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, "campaigns"), campaign);

  // Save the document ID to Firestore
  await updateDoc(doc(db, "campaigns", docRef.id), {
    id: docRef.id
  });
  
  alert("Campaign Added ✔");

  e.target.reset();
  closeModal(); // closes default modal
  loadCampaigns();
}


// ===============================
// EDIT CAMPAIGN
// ===============================
window.editCampaign = async id => {

  const newName = prompt("Edit campaign name:");
  if (!newName) return;

  await updateDoc(doc(db, "campaigns", id), {
    name: newName
  });

  loadCampaigns();
};


// ===============================
// DELETE CAMPAIGN
// ===============================
window.deleteCampaign = async id => {

  if (!confirm("Delete this campaign?")) return;

  await deleteDoc(doc(db, "campaigns", id));
  loadCampaigns();
};


// ===============================
// LOAD LEADERS
// ===============================
async function loadLeaders() {

  const select = document.getElementById("leaderSelect");
  if (!select) return;

  select.innerHTML = `<option value="">-- Select Leader --</option>`;

  const snapshot = await getDocs(collection(db, "users"));

  snapshot.forEach(u => {
    const user = u.data();

    if (user.role === "leader") {
      // store user ID as value so we can assign by ID
      select.innerHTML += `
        <option value="${u.id}" data-name="${user.name}">
          ${user.name}
        </option>
      `;
    }
  });
}


// ===============================
// ASSIGN LEADER
// ===============================
window.confirmLeaderAssign = async () => {

  const campaignId = leaderAssignCampaignId.value;

  const leaderId = leaderSelect.value;
  if (!leaderId) {
    alert("Select leader first");
    return;
  }

  // get display name from selected option
  const opt = leaderSelect.querySelector(`option[value="${leaderId}"]`);
  const leaderName = opt ? opt.getAttribute('data-name') || opt.textContent : leaderId;

  // Update campaign with both a human-readable assignedLeader and an array of leader IDs
  await updateDoc(doc(db, "campaigns", campaignId), {
    assignedLeader: leaderName,
    assigned_leaders: [leaderId]
  });

  closeModal("leaderAssignModal");
  loadCampaigns();
};


// ===============================
// ANALYTICS
// ===============================
function updateAnalytics(campaigns) {

  analyticsTotalCampaigns.textContent = campaigns.length;

  const week = campaigns.filter(c => {
    const d = new Date(c.createdAt);
    return (new Date() - d) < 604800000;
  });

  analyticsThisWeek.textContent = week.length;
  analyticsStaffDeployed.textContent =
    campaigns.filter(c => c.assignedLeader).length;

  analyticsAvgAttendance.textContent = "N/A";
}


// ===============================
// MODAL HELPERS
// ===============================
window.openModal = (id = "campaignModal") => {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "flex";
};

window.closeModal = (id = "campaignModal") => {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
};

window.openAssignModal = (id, name) => {
  leaderAssignCampaignId.value = id;
  leaderAssignCampaignName.textContent = name;
  openModal("leaderAssignModal");
};
