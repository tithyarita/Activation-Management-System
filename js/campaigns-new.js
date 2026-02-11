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

    html += `
      <div class="campaign-card">

        <div class="campaign-header">
          <h4>${data.name}</h4>
          <span class="campaign-status">${data.status || "upcoming"}</span>
        </div>

        <div class="campaign-info">
          <p><b>Date:</b> ${data.date}</p>
          <p><b>Location:</b> ${data.location}</p>
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
    name: campaignName.value,
    date: campaignDate.value,
    startTime: campaignStartTime.value,
    endTime: campaignEndTime.value,
    location: campaignLocation.value,
    status: "upcoming",
    progress: 0,
    assignedLeader: "",
    createdAt: new Date()
  };

  await addDoc(collection(db, "campaigns"), campaign);

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
      select.innerHTML += `
        <option value="${user.name}">
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
  const leaderName = leaderSelect.value;

  if (!leaderName) {
    alert("Select leader first");
    return;
  }

  await updateDoc(doc(db, "campaigns", campaignId), {
    assignedLeader: leaderName
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
