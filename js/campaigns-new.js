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
  // Attach geolocation button
  const useLocBtn = document.getElementById('useLocationBtn');
  if (useLocBtn) useLocBtn.addEventListener('click', handleUseLocation);
  const searchLocBtn = document.getElementById('searchLocationBtn');
  if (searchLocBtn) searchLocBtn.addEventListener('click', ()=>{
    const q = (document.getElementById('campaignLocation')?.value || '').trim();
    if (q) searchPlace(q);
  });
  // also search on Enter inside input
  const locInput = document.getElementById('campaignLocation');
  if (locInput) {
    locInput.addEventListener('keydown', (ev)=>{
      if (ev.key === 'Enter') { ev.preventDefault(); const v=locInput.value.trim(); if (v) searchPlace(v); }
    });
    // live autocomplete (debounced)
    locInput.addEventListener('input', ()=>{
      const v = locInput.value.trim();
      if (v.length < 2) { document.getElementById('locationSuggestions').style.display='none'; return; }
      debounceSearch(v);
    });
  }
  // hide suggestions when clicking outside
  document.addEventListener('click', (ev)=>{
    const s = document.getElementById('locationSuggestions');
    const map = document.getElementById('locationMap');
    const target = ev.target;
    if (!s) return;
    if (!s.contains(target) && target.id !== 'campaignLocation' && target.id !== 'searchLocationBtn') {
      s.style.display = 'none';
    }
  });
  // prepare map variables
  window.__ams_location_map = null;
  window.__ams_location_marker = null;
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
    locationCoords: (function(){
      const lat = parseFloat(document.getElementById('campaignLat').value || '') || null;
      const lng = parseFloat(document.getElementById('campaignLng').value || '') || null;
      return (lat && lng) ? { lat, lng } : null;
    })(),
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
// GEOLOCATION
// ===============================
function handleUseLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }

  const btn = document.getElementById('useLocationBtn');
  btn.disabled = true;
  btn.textContent = 'Locating...';

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    document.getElementById('campaignLat').value = lat;
    document.getElementById('campaignLng').value = lng;
    // Try reverse-geocoding to a human-readable place name
    let label = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      if (r && r.ok) {
        const j = await r.json();
        if (j && j.display_name) label = j.display_name;
      }
    } catch (e) { console.warn('Reverse geocode failed', e); }
    document.getElementById('campaignLocation').value = label;
    // show on map
    showLocationOnMap(lat, lng, label);
    btn.textContent = 'Location Set';
    setTimeout(()=>{ btn.textContent = 'Use My Location'; btn.disabled = false; }, 1200);
  }, (err) => {
    console.warn('Geolocation error', err);
    alert('Could not get location: ' + (err.message || 'permission denied'));
    const btn = document.getElementById('useLocationBtn');
    btn.textContent = 'Use My Location';
    btn.disabled = false;
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

// ===============================
// PLACE SEARCH (Nominatim)
// ===============================
async function searchPlace(query) {
  const suggestions = document.getElementById('locationSuggestions');
  if (!suggestions) return;
  suggestions.innerHTML = '<div style="padding:8px;color:#6b7280;">Searching...</div>';
  suggestions.style.display = 'block';

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=8`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Search failed');
    const list = await res.json();
    if (!list || !list.length) {
      suggestions.innerHTML = '<div style="padding:8px;color:#6b7280;">No results found</div>';
      return;
    }

    suggestions.innerHTML = list.map(item => `
      <div class="location-suggestion" data-lat="${item.lat}" data-lon="${item.lon}" style="padding:8px;cursor:pointer;border-bottom:1px solid #f1f5f9;">
        <div style="font-weight:600;">${escapeHtml(item.display_name)}</div>
        <div style="font-size:12px;color:#6b7280;">${item.type || ''} ${item.class ? '· ' + item.class : ''}</div>
      </div>
    `).join('');

    // attach clicks
    Array.from(suggestions.querySelectorAll('.location-suggestion')).forEach(el=>{
      el.addEventListener('click', ()=>{
        const lat = el.getAttribute('data-lat');
        const lon = el.getAttribute('data-lon');
        const name = el.querySelector('div').textContent;
        document.getElementById('campaignLat').value = lat;
        document.getElementById('campaignLng').value = lon;
        document.getElementById('campaignLocation').value = name;
        suggestions.style.display = 'none';
        showLocationOnMap(parseFloat(lat), parseFloat(lon), name);
      });
    });

  } catch (e) {
    console.warn('Place search error', e);

// ===============================
// MAP HELPERS (Leaflet)
// ===============================
function ensureMapReady(){
  const mapEl = document.getElementById('locationMap');
  if (!mapEl) return false;
  if (window.__ams_location_map) return true;
  try {
    if (typeof L === 'undefined') return false; // Leaflet not loaded yet
    window.__ams_location_map = L.map('locationMap', { zoomControl: true }).setView([0,0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.__ams_location_map);
    return true;
  } catch (e) {
    console.warn('Could not initialize map', e);
    return false;
  }
}

function showLocationOnMap(lat, lng, label){
  const mapEl = document.getElementById('locationMap');
  if (!mapEl) return;
  mapEl.style.display = 'block';
  // try to initialize map (Leaflet must be loaded via HTML)
  const ok = ensureMapReady();
  if (!ok) return; // skip if Leaflet not available
  const map = window.__ams_location_map;
  if (!map) return;
  // update marker
  if (window.__ams_location_marker) {
    window.__ams_location_marker.setLatLng([lat, lng]);
    window.__ams_location_marker.bindPopup(label || '').openPopup();
  } else {
    window.__ams_location_marker = L.marker([lat, lng]).addTo(map).bindPopup(label || '');
    window.__ams_location_marker.openPopup();
  }
  map.setView([lat, lng], 15);
}

// Debounce helper
let __ams_debounce_timer = null;
function debounceSearch(q){
  if (__ams_debounce_timer) clearTimeout(__ams_debounce_timer);
  __ams_debounce_timer = setTimeout(()=>{ searchPlace(q); }, 450);
}
    suggestions.innerHTML = '<div style="padding:8px;color:#6b7280;">Search failed</div>';
  }
}

function escapeHtml(s){ return String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }


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
