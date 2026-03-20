import {db,collection,getDocs,query,where,updateDoc,doc,addDoc} from "./firebase.js";


// ===============================
// Leader Info (from login session)
// ===============================
let leaderName = null;
let leaderId = null;
let userRole = null;
const userSession = sessionStorage.getItem("user");
if (userSession) {
  try {
    const user = JSON.parse(userSession);
    if (user.role === "leader") {
      leaderName = user.name;
      leaderId = user.id;
      userRole = user.role;
      // Optionally, set in localStorage for compatibility
      localStorage.setItem("leaderName", leaderName);
      localStorage.setItem("leaderId", leaderId);
    }
  } catch (e) { leaderName = null; }
}
// Fallback for dev/testing
if (!leaderName) {
  leaderName = localStorage.getItem("leaderName") || "ming";
}


// ===============================
// Load Dashboard
// ===============================
async function loadDashboard() {
  await loadCampaigns();
  await loadBrandAmbassadors();
}


// ===============================
// Load Campaign Cards
// ===============================
async function loadCampaigns() {

  const container = document.getElementById("campaignsCardContainer");

  if (!container) return;

  container.innerHTML = `<p class="loading-text">Loading campaigns...</p>`;

  try {

    const q = query(
      collection(db, "campaigns"),
      where("assignedLeader", "==", leaderName)
    );

    const snapshot = await getDocs(q);

    let campaigns = [];

    snapshot.forEach(doc => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });

    document.getElementById("leaderTotalCampaigns").innerText = campaigns.length;

    if (campaigns.length === 0) {
      container.innerHTML = `<p>No campaigns assigned.</p>`;
      return;
    }

    container.innerHTML = "";

    campaigns.forEach(campaign => {

      const card = document.createElement("div");
      card.className = "campaign-card";

      card.innerHTML = `
        <div class="campaign-header">
          <h3>${campaign.name}</h3>
          <span class="campaign-status">${campaign.status}</span>
        </div>
        <div class="campaign-actions">
          <button class="btn btn-assign" onclick="viewCampaign('${campaign.id}')">View</button>
          <button class="btn btn-edit" onclick="openAssignBAModal('${campaign.id}')">Assign BA</button>
        </div>
      `;

      container.appendChild(card);

    });

  } catch (err) {
    console.error(err);
  }

}


// ===============================
// View Campaign Detail
// ===============================
window.viewCampaign = async function (id) {

  const modal = document.getElementById("detailModal");
  const content = document.getElementById("detailModalContent");

  const snapshot = await getDocs(collection(db, "campaigns"));

  let campaignData = null;

  snapshot.forEach(doc => {
    if (doc.id === id) {
      campaignData = doc.data();
    }
  });

  if (!campaignData) return;

  // Make location a Google Maps link if present
  let locationHtml = '-';
  if (campaignData.location && typeof campaignData.location === 'string' && campaignData.location.trim() !== '-') {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(campaignData.location)}`;
    locationHtml = `<a href="${mapsUrl}" target="_blank" style="color:#2563eb;text-decoration:underline;">${campaignData.location}</a>`;
  } else if (campaignData.location) {
    locationHtml = campaignData.location;
  }

  // Assigned BA: show names if possible
  let assignedBAHtml = '-';
  let assignedBA = campaignData.assignedba || campaignData.assignedBA || campaignData.assigned_bas || '-';
  if (Array.isArray(assignedBA) && assignedBA.length > 0) {
    // Lookup BA names
    const baSnapshot = await getDocs(collection(db, "users"));
    const baMap = {};
    baSnapshot.forEach(doc => {
      const data = doc.data();
      baMap[doc.id] = data.name || data.email || doc.id;
    });
    assignedBAHtml = assignedBA.map(id => baMap[id] || id).join(', ');
  } else if (typeof assignedBA === 'string') {
    assignedBAHtml = assignedBA;
  }

  content.innerHTML = `
    <h2>${campaignData.name || '-'}<\/h2>
    <p><b>Start:</b> ${campaignData.start_date || '-'} ${campaignData.startTime || ''}<\/p>
    <p><b>End:</b> ${campaignData.end_date || '-'} ${campaignData.endTime || ''}<\/p>
    <p><b>Budget:</b> $${campaignData.budget || 0}<\/p>
    <p><b>Location:</b> ${locationHtml}<\/p>
    <p><b>Status:</b> ${campaignData.status || '-'}<\/p>
    <p><b>Description:</b> ${campaignData.description || '-'}<\/p>
    <p><b>Assigned BA:</b> ${assignedBAHtml}<\/p>
  `;

  modal.style.display = "flex";
};



// ===============================
// Load Brand Ambassadors
// ===============================
async function loadBrandAmbassadors() {

  const table = document.getElementById("baTableBody");
  if (!table) return;
  table.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
  try {
    // Try to get BAs and campaigns from localStorage
    let bas = [];
    let campaigns = [];
    let baIdMap = {};
    let baCampaigns = {};
    const basLS = localStorage.getItem("baList");
    const campaignsLS = localStorage.getItem("campaignList");
    if (basLS && campaignsLS) {
      bas = JSON.parse(basLS);
      campaigns = JSON.parse(campaignsLS);
      bas.forEach(ba => { baIdMap[ba._id] = ba; });
      // Map BA id to campaign names (ALL campaigns, not just for this leader)
      campaigns.forEach(c => {
        const assigned = Array.isArray(c.assignedba) ? c.assignedba : [];
        assigned.forEach(baid => {
          if (!baCampaigns[baid]) baCampaigns[baid] = [];
          baCampaigns[baid].push(c.name || c.id);
        });
      });
    } else {
      // Fallback to Firestore and cache results
      const q = query(
        collection(db, "users"),
        where("role", "==", "ba")
      );
      const snapshot = await getDocs(q);
      bas = [];
      baIdMap = {};
      snapshot.forEach(doc => {
        const ba = doc.data();
        ba._id = doc.id;
        bas.push(ba);
        baIdMap[doc.id] = ba;
      });
      localStorage.setItem("baList", JSON.stringify(bas));
      // Get ALL campaigns (not just for this leader)
      const campSnap = await getDocs(collection(db, "campaigns"));
      campaigns = [];
      baCampaigns = {};
      campSnap.forEach(doc => {
        const c = { id: doc.id, ...doc.data() };
        campaigns.push(c);
        const assigned = Array.isArray(c.assignedba) ? c.assignedba : [];
        assigned.forEach(baid => {
          if (!baCampaigns[baid]) baCampaigns[baid] = [];
          baCampaigns[baid].push(c.name || c.id);
        });
      });
      localStorage.setItem("campaignList", JSON.stringify(campaigns));
    }
    document.getElementById("leaderTotalBAs").innerText = bas.length;
    if (bas.length === 0) {
      table.innerHTML = `<tr><td colspan="5">No BA found</td></tr>`;
      return;
    }
    table.innerHTML = "";
          bas.forEach(ba => {
            const campaignsArr = baCampaigns[ba._id] || [];
            const campaignNames = campaignsArr.length > 0 ? campaignsArr.join(", ") : "-";
            const campaignCount = campaignsArr.length;

            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${ba.name || ba.email || ba.id || '-'}</td>
              <td>${ba.role}</td>
              <td>${campaignCount}</td>
              <td>active</td>
              <td>
                <button class="btn btn-assign" onclick="viewUser('${ba._id || ba.email || ''}')">View</button>
              </td>
            `;
            table.appendChild(row);
          });
  } catch (err) {
    console.error(err);
  }
}


// ===============================
// View User Detail
// ===============================
window.viewUser = async function (userIdOrEmail) {
  const modal = document.getElementById("detailModal");
  const content = document.getElementById("detailModalContent");

  // Try to find by id, fallback to email
  let userData = null;
  const q = query(collection(db, "users"));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const data = doc.data();
    if (doc.id === userIdOrEmail || data.email === userIdOrEmail) {
      userData = data;
      userData._id = doc.id;
    }
  });
  if (!userData) {
    content.innerHTML = `<h2>User Not Found</h2>`;
    modal.style.display = "flex";
    return;
  }

  // Find campaigns this BA is assigned to
  let campaignNames = '-';
  let campaignCount = 0;
  if (userData._id) {
    const campSnap = await getDocs(collection(db, "campaigns"));
    const assigned = [];
    campSnap.forEach(doc => {
      const c = doc.data();
      if (Array.isArray(c.assignedba) && c.assignedba.includes(userData._id)) {
        assigned.push(c.name || doc.id);
      }
    });
    if (assigned.length > 0) {
      campaignNames = assigned.join(', ');
      campaignCount = assigned.length;
    }
  }

  // Load BA clock-ins from Firebase
  let clockinsHtml = '<p>No clock-ins found.</p>';
  if (userData._id) {
    const clockinSnap = await getDocs(query(collection(db, "ba_clockins"), where("baId", "==", userData._id)));
    const clockins = [];
    clockinSnap.forEach(doc => {
      const d = doc.data();
      clockins.push(d);
    });
    if (clockins.length > 0) {
      clockinsHtml = `<table style="width:100%;margin-top:10px;font-size:0.98rem"><thead><tr><th>Time</th><th>Type</th><th>Campaign</th></tr></thead><tbody>` +
        clockins.sort((a, b) => b.timestamp - a.timestamp).map(c =>
          `<tr><td>${new Date(c.timestamp).toLocaleString()}</td><td>${c.type || '-'}</td><td>${c.campaignName || '-'}</td></tr>`
        ).join('') + '</tbody></table>';
    }
  }

  content.innerHTML = `
    <h2>${userData.name || userData.email || '-'}</h2>
    <p><b>Email:</b> ${userData.email || '-'}</p>
    <p><b>Phone:</b> ${userData.phone || '-'}</p>
    <p><b>Status:</b> ${userData.status || 'Active'}</p>
    <p><b>Role:</b> ${userData.role || '-'}</p>
    <p><b>Address:</b> ${userData.address || '-'}</p>
    <p><b>Campaigns:</b> ${campaignNames} <span style="color:#888;font-size:0.95em;">(${campaignCount})</span></p>
    <h3 style="margin-top:18px;">Clock-ins</h3>
    ${clockinsHtml}
  `;
  modal.style.display = "flex";
}


// ===============================
// Logout
// ===============================
window.handleLogout = function () {

  // Clear all session and local storage
  sessionStorage.clear();
  localStorage.clear();

  // Redirect to login and replace history so back button can't return
  window.location.replace("../html/admin/login.html");

  // Optionally, for extra security, add a popstate handler to block back navigation
  window.addEventListener('popstate', function(event) {
    if (!sessionStorage.getItem('user')) {
      window.location.replace("../html/admin/login.html");
    }
  });
};



// ===============================
// Navigation Tabs
// ===============================
document.querySelectorAll(".nav-item").forEach(item => {

  item.addEventListener("click", function (e) {

    const tab = this.dataset.tab;

    if (!tab) return;

    e.preventDefault();

    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    this.classList.add("active");

    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

    const el = document.getElementById(tab);

    if (el) el.classList.add("active");

  });

});


// ===============================
// Start Dashboard
// ===============================
loadDashboard();

// ===============================
// Assign BA Modal
// ===============================
// Modal HTML injection (if not present)
function ensureAssignBAModal() {
  if (document.getElementById('assignBAModal')) return;
  const modal = document.createElement('div');
  modal.id = 'assignBAModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content-box">
      <button class="modal-close-btn" onclick="document.getElementById('assignBAModal').style.display='none'">&times;</button>
      <div class="modal-detail-content">
        <h2>Assign Brand Ambassadors</h2>
        <div id="assignBAList"></div>
        <button class="btn btn-assign" id="saveAssignBA">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

window.openAssignBAModal = async function (campaignId) {
  ensureAssignBAModal();
  const modal = document.getElementById('assignBAModal');
  const listDiv = document.getElementById('assignBAList');
  listDiv.innerHTML = '<p>Loading...</p>';
  modal.style.display = 'flex';

  // Fetch all BAs
  const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'ba')));
  const bas = [];
  usersSnap.forEach(doc => bas.push({ id: doc.id, ...doc.data() }));

  // Fetch campaign
  const campSnap = await getDocs(query(collection(db, 'campaigns')));
  let campaign = null;
  campSnap.forEach(doc => { if (doc.id === campaignId) campaign = { id: doc.id, ...doc.data() }; });
  if (!campaign) { listDiv.innerHTML = '<p>Campaign not found.</p>'; return; }
  const assigned = Array.isArray(campaign.assignedba) ? campaign.assignedba : [];

  // Render checkboxes
  listDiv.innerHTML = bas.map(ba => `
    <label style="display:block;margin-bottom:8px;">
      <input type="checkbox" class="ba-checkbox" value="${ba.id}" ${assigned.includes(ba.id) ? 'checked' : ''} />
      ${ba.name || ba.email || ba.id}
    </label>
  `).join('');

  // Save handler
  document.getElementById('saveAssignBA').onclick = async function () {
    const checked = Array.from(document.querySelectorAll('.ba-checkbox:checked')).map(cb => cb.value);
    // Update Firestore campaign doc
    const campaignDocRef = doc(db, 'campaigns', campaignId);
    await updateDoc(campaignDocRef, { assignedba: checked });

    // Add assignment records for each BA
    for (const baId of checked) {
      const ba = bas.find(b => b.id === baId);
      await addDoc(collection(db, "campaign_ba_assignments"), {
        baId,
        baName: ba?.name || "",
        campaignId: campaign.id,
        campaignName: campaign.name,
        leaderId: leaderId,
        leaderName: leaderName,
        createdAt: new Date(),
        timestamp: new Date().toISOString()
      });
    }

    // Remove campaign_ba_assignments for BAs that were unselected
    const usersSnap = await getDocs(query(collection(db, 'campaign_ba_assignments'), where('campaignId', '==', campaign.id)));
    usersSnap.forEach(async (docSnap) => {
      const data = docSnap.data();
      if (!checked.includes(data.baId)) {
        await deleteDoc(doc(db, 'campaign_ba_assignments', docSnap.id));
      }
    });

    modal.style.display = 'none';
    alert('Assigned BAs updated!');
    // Refresh BA table
    await loadBrandAmbassadors();
  };
};