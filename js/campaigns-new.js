// Ensure openCampaignModal is globally available for HTML button
window.openCampaignModal = function() {
  window.openModal('campaignModal');
};
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
  // Assign Leader button in campaign modal
  const assignBtn = document.getElementById('openAssignLeaderBtn');
  if (assignBtn) {
    assignBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      // Get campaign name and id from modal fields
      const campaignId = document.getElementById('campaignId').value;
      const campaignName = document.getElementById('campaignName').value || '(New Campaign)';
      // Prefill modal fields
      document.getElementById('leaderAssignCampaignId').value = campaignId;
      document.getElementById('leaderAssignCampaignName').textContent = campaignName;
      await loadLeaders();
      window.openModal('leaderAssignModal');
    });
  }
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
    locInput.addEventListener('keydown', async (ev)=>{
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const v = locInput.value.trim();
        if (!v) return;
        // Search and auto-select first result
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(v)}&addressdetails=1&limit=8`;
        try {
          const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
          if (!res.ok) throw new Error('Search failed');
          const list = await res.json();
          if (list && list.length) {
            const item = list[0];
            const lat = item.lat, lon = item.lon, name = item.display_name;
            document.getElementById('campaignLat').value = lat;
            document.getElementById('campaignLng').value = lon;
            document.getElementById('campaignLocation').value = name;
            document.getElementById('locationSuggestions').style.display = 'none';
            // Always update map, fallback to window.showLocationOnMap if needed
            if (typeof showLocationOnMap === 'function') {
              showLocationOnMap(parseFloat(lat), parseFloat(lon), name);
            } else if (typeof window.showLocationOnMap === 'function') {
              window.showLocationOnMap(parseFloat(lat), parseFloat(lon), name);
            } else {
              // fallback: try to set marker directly
              if (window.__ams_location_map) {
                if (window.__ams_location_marker) {
                  window.__ams_location_marker.setLatLng([parseFloat(lat), parseFloat(lon)]);
                  window.__ams_location_marker.bindPopup(name || '').openPopup();
                } else {
                  window.__ams_location_marker = L.marker([parseFloat(lat), parseFloat(lon)]).addTo(window.__ams_location_map).bindPopup(name || '');
                  window.__ams_location_marker.openPopup();
                }
                window.__ams_location_map.setView([parseFloat(lat), parseFloat(lon)], 15);
              }
            }
          } else {
            searchPlace(v); // fallback to show suggestions
          }
        } catch (e) {
          searchPlace(v); // fallback to show suggestions
        }
      }
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
// LOAD CAMPAIGNS FROM FIRESTORE (ALWAYS LIVE)
// ===============================
async function loadCampaigns() {

  const list = document.getElementById("campaignsList");
  const adminList = document.getElementById("adminCampaignsList");
  if (list) list.innerHTML = "Loading campaigns...";
  if (adminList) adminList.innerHTML = "Loading campaigns...";

  try {
    // Get current user from sessionStorage
    let user = null;
    try { user = JSON.parse(sessionStorage.getItem('user')); } catch (e) {}
    let snapshot;
    if (user && user.role === "leader") {
      // Only show campaigns assigned to this leader
      const q = query(collection(db, "campaigns"), where("assigned_leaders", "array-contains", user.id));
      snapshot = await getDocs(q);
    } else {
      // Admin or others see all campaigns
      snapshot = await getDocs(collection(db, "campaigns"));
    }
    if (snapshot.empty) {
      if (list) list.innerHTML = "No campaigns found";
      if (adminList) adminList.innerHTML = "No campaigns found";
      updateAnalytics([]);
      return;
    }
    let html = "";
    let dataArr = [];
    snapshot.forEach(c => {
      const data = c.data();
      // Always use Firestore data, never local cache
      data.id = c.id;
      dataArr.push(data);
    });
    // Sort if requested
    if (window.__sortCampaignsByDateDesc !== undefined) {
      dataArr.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date) : new Date(0);
        const db = b.start_date ? new Date(b.start_date) : new Date(0);
        return window.__sortCampaignsByDateDesc ? db - da : da - db;
      });
    }
    dataArr.forEach(data => {
      const startDate = data.start_date ? new Date(data.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
      const endDate = data.end_date ? new Date(data.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
      const budget = (typeof data.budget !== 'undefined' && data.budget !== null && data.budget !== '') ? `$${data.budget}` : 'N/A';
      html += `
        <div class="campaign-card">
          <div class="campaign-header">
            <h4>${data.name}</h4>
            <span class="campaign-status">${data.status || "upcoming"}</span>
          </div>
          <div class="campaign-info">
            <p><b>Dates:</b> ${startDate} to ${endDate}</p>
            <p><b>Location:</b> ${data.location}</p>
            <p><b>Budget:</b> ${budget}</p>
            <p><b>Leader:</b> ${data.assignedLeader || "Unassigned"}</p>
          </div>
          <div class="campaign-actions">
            <button class="btn btn-edit" onclick="editCampaign('${data.id}')">Edit</button>
            <button class="btn btn-danger" onclick="deleteCampaign('${data.id}')">Delete</button>
            <button class="btn btn-assign" onclick="openAssignModal('${data.id}','${data.name}')">Assign Leader</button>
          </div>
        </div>
      `;
    });
    if (list) list.innerHTML = html;
    if (adminList) adminList.innerHTML = html;
    updateAnalytics(dataArr);
  } catch (err) {
    if (list) list.innerHTML = '<div style="color:red">Error loading campaigns: ' + (err.message || err) + '</div>';
    console.error('Error loading campaigns:', err);
  }
}

// Sort button logic
document.addEventListener('DOMContentLoaded', function() {
  const sortBtn = document.getElementById('sortCampaignsBtn');
  if (sortBtn) {
    window.__sortCampaignsByDateDesc = false;
    sortBtn.addEventListener('click', function() {
      window.__sortCampaignsByDateDesc = !window.__sortCampaignsByDateDesc;
      loadCampaigns();
      sortBtn.innerHTML = window.__sortCampaignsByDateDesc ? '<i class="fa-solid fa-sort-up"></i> Sort by Event Day' : '<i class="fa-solid fa-sort-down"></i> Sort by Event Day';
    });
  }
});



// ===============================
// ADD CAMPAIGN
// ===============================
async function handleAddCampaign(e) {
  e.preventDefault();

  const campaignId = document.getElementById('campaignId').value;
  const campaign = {
    name: document.getElementById('campaignName').value,
    start_date: document.getElementById('campaignStartDate').value,
    end_date: document.getElementById('campaignEndDate').value,
    location: document.getElementById('campaignLocation').value,
    locationCoords: (function(){
      const lat = parseFloat(document.getElementById('campaignLat').value || '') || null;
      const lng = parseFloat(document.getElementById('campaignLng').value || '') || null;
      return (lat && lng) ? { lat, lng } : null;
    })(),
    budget: parseFloat(document.getElementById('campaignBudget').value) || 0,
    status: document.getElementById('campaignStatus').value || "upcoming",
    progress: 0,
    assignedLeader: document.getElementById('campaignLeader')?.selectedOptions?.[0]?.textContent || "",
    assigned_leaders: document.getElementById('campaignLeader')?.value ? [document.getElementById('campaignLeader').value] : [],
    description: document.getElementById('campaignDescription').value || "",
    createdAt: campaignId ? undefined : new Date().toISOString()
  };
  try {
    if (campaignId) {
      // Edit/update
      await updateDoc(doc(db, "campaigns", campaignId), campaign);
      alert("Campaign Updated ✔");
    } else {
      // Add new
      const docRef = await addDoc(collection(db, "campaigns"), campaign);
      await updateDoc(doc(db, "campaigns", docRef.id), { id: docRef.id });
      alert("Campaign Added ✔");
    }
    e.target.reset();
    document.getElementById('campaignId').value = '';
    closeModal();
    await loadCampaigns();
  } catch (err) {
    console.error('Error saving campaign:', err);
    alert('Error saving campaign: ' + (err.message || err));
  }
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

// Ensure global for Enter key search
window.showLocationOnMap = showLocationOnMap;
}

// Debounce helper
let __ams_debounce_timer = null;
function debounceSearch(q){
  if (__ams_debounce_timer) clearTimeout(__ams_debounce_timer);
  __ams_debounce_timer = setTimeout(()=>{ searchPlace(q); }, 450);
}
    suggestions.innerHTML = '<div style="padding:8px;color:#6b7280;">Search failed</div>';
  }


function escapeHtml(s){ return String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }


// ===============================
// EDIT CAMPAIGN
// ===============================
window.editCampaign = async id => {
  // Load campaign data from Firestore
  const snap = await getDocs(collection(db, "campaigns"));
  let campaign = null;
  snap.forEach(docSnap => {
    if (docSnap.id === id) campaign = { ...docSnap.data(), id: docSnap.id };
  });
  if (!campaign) return alert("Campaign not found");

  // Fill modal fields
  document.getElementById('campaignId').value = campaign.id;
  document.getElementById('campaignName').value = campaign.name || '';
  document.getElementById('campaignDescription').value = campaign.description || '';
  document.getElementById('campaignStartDate').value = campaign.start_date || '';
  document.getElementById('campaignEndDate').value = campaign.end_date || '';
  document.getElementById('campaignBudget').value = campaign.budget || '';
  document.getElementById('campaignStatus').value = campaign.status || 'upcoming';
  document.getElementById('campaignLocation').value = campaign.location || '';
  document.getElementById('campaignLat').value = campaign.locationCoords?.lat || '';
  document.getElementById('campaignLng').value = campaign.locationCoords?.lng || '';
  document.getElementById('campaignRadius').value = campaign.radius || 100;
  // Set leader dropdown if present
  const leaderDropdown = document.getElementById('campaignLeader');
  if (leaderDropdown && campaign.assignedLeader) {
    let found = false;
    for (let i = 0; i < leaderDropdown.options.length; i++) {
      if (leaderDropdown.options[i].textContent === campaign.assignedLeader) {
        leaderDropdown.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      const opt = document.createElement('option');
      opt.value = campaign.assigned_leaders?.[0] || '';
      opt.textContent = campaign.assignedLeader;
      leaderDropdown.appendChild(opt);
      leaderDropdown.value = campaign.assigned_leaders?.[0] || '';
    }
  }
  window.openModal('campaignModal');
}


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
  const campaignDropdown = document.getElementById("campaignLeader");
  // Only handle leader dropdowns
  if (select) select.innerHTML = `<option value="">-- Select Leader --</option>`;
  if (campaignDropdown) campaignDropdown.innerHTML = `<option value="">-- Select Leader --</option>`;

  const snapshot = await getDocs(collection(db, "users"));

  snapshot.forEach(u => {
    const user = u.data();
    if (user.role === "leader") {
      const optionHtml = `<option value="${u.id}" data-name="${user.name}">${user.name}</option>`;
      if (select) select.innerHTML += optionHtml;
      if (campaignDropdown) campaignDropdown.innerHTML += optionHtml;
    }
  });
}


// ===============================
// ASSIGN LEADER
// ===============================
window.confirmLeaderAssign = async () => {
  const campaignId = document.getElementById('leaderAssignCampaignId').value;
  const leaderId = document.getElementById('leaderSelect').value;
  if (!leaderId) {
    alert("Select leader first");
    return;
  }
  // get display name from selected option
  const opt = document.getElementById('leaderSelect').querySelector(`option[value="${leaderId}"]`);
  const leaderName = opt ? opt.getAttribute('data-name') || opt.textContent : leaderId;
  await updateDoc(doc(db, "campaigns", campaignId), {
    assignedLeader: leaderName,
    assigned_leaders: [leaderId]
  });

  // Only assign leader, no BA assignment
  closeModal("leaderAssignModal");

  // Update the campaign modal dropdown if open and matches this campaign
  const campaignIdInput = document.getElementById('campaignId');
  if (campaignIdInput && campaignIdInput.value === campaignId) {
    const leaderDropdown = document.getElementById('campaignLeader');
    if (leaderDropdown) {
      // Set the dropdown to the new leader
      let found = false;
      for (let i = 0; i < leaderDropdown.options.length; i++) {
        if (leaderDropdown.options[i].textContent === leaderName) {
          leaderDropdown.selectedIndex = i;
          found = true;
          break;
        }
      }
      // If not found, add it
      if (!found) {
        const opt = document.createElement('option');
        opt.value = leaderId;
        opt.textContent = leaderName;
        leaderDropdown.appendChild(opt);
        leaderDropdown.value = leaderId;
      }
    }
  }
  await loadLeaders(); // Refresh dropdowns after assignment
  await loadCampaigns(); // Await to ensure UI updates before user interacts again
};


// ===============================
// ANALYTICS
// ===============================
function updateAnalytics(campaigns) {

  if (typeof analyticsTotalCampaigns !== 'undefined' && analyticsTotalCampaigns)
    analyticsTotalCampaigns.textContent = campaigns.length;

  const week = campaigns.filter(c => {
    const d = new Date(c.createdAt);
    return (new Date() - d) < 604800000;
  });

  if (typeof analyticsThisWeek !== 'undefined' && analyticsThisWeek)
    analyticsThisWeek.textContent = week.length;
  if (typeof analyticsStaffDeployed !== 'undefined' && analyticsStaffDeployed)
    analyticsStaffDeployed.textContent = campaigns.filter(c => c.assignedLeader).length;
  if (typeof analyticsAvgAttendance !== 'undefined' && analyticsAvgAttendance)
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

window.openAssignModal = async (id, name) => {
  const idInput = document.getElementById('leaderAssignCampaignId');
  const nameSpan = document.getElementById('leaderAssignCampaignName');
  if (idInput) idInput.value = id;
  if (nameSpan) nameSpan.textContent = name;
  // Always reload leaders when opening modal
  await loadLeaders();
  openModal("leaderAssignModal");
};
