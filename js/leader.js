// ===============================
// LEADER DASHBOARD - FULL IMPLEMENTATION
// ===============================

import { db, collection, getDocs, addDoc, updateDoc, doc, query, where, deleteDoc } from '../js/firebase.js';

// ===============================
// 1. GLOBAL STATE & CONFIGURATION
// ===============================
const leaderState = {
    leaderId: 'leader_001', // overwritten by login/profile when available
    leaderName: 'Loading...',
    leaderRole: 'Leader',
    leaderPhoto: '../asset/e8509f8003b9dc24c37ba8d92a9a069b.jpg',
    campaigns: [],
    assignedStaff: [],
    clockRecords: [],
    brandAmbassadors: [],
    currentCampaignFilter: null,
    selectedStaff: new Set()
};

const LATE_ARRIVAL_THRESHOLD = 30; // minutes
const SHIFT_START_TIME = '09:00';

// ===============================
// 2. INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    loadLeaderData();
});

async function initializeDashboard() {
    console.log('✓ Initializing Leader Dashboard');

    // Try to load saved leader profile FIRST before data loads
    try {
        const lp = localStorage.getItem('leaderProfile');
        if (lp) {
            const profile = JSON.parse(lp);
            // Set state WITHOUT calling loadLeaderData yet (it will be called below)
            leaderState.leaderId = profile.id || leaderState.leaderId;
            leaderState.leaderName = profile.name || leaderState.leaderName;
            leaderState.leaderRole = profile.role || leaderState.leaderRole;
            leaderState.leaderPhoto = profile.photo || leaderState.leaderPhoto;
            updateHeader();
            console.log(`✓ Loaded profile for leader: ${profile.name}`);
        }
    } catch (e) {
        console.warn('Could not parse saved leader profile', e);
    }

    // Initialize modals
    initializeModals();

    // Set default dates for reports
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (document.getElementById('reportStartDate')) {
        document.getElementById('reportStartDate').value = yesterday;
        document.getElementById('reportEndDate').value = today;
        document.getElementById('attendanceDateFilter').value = today;
    }

    // Set attendance date filter to today
    if (document.getElementById('attendanceDateFilter')) {
        document.getElementById('attendanceDateFilter').value = today;
    }
}

// ===============================
// 3. LOAD DATA FROM FIREBASE
// ===============================
async function loadLeaderData() {
    try {
        // Load campaigns assigned to this leader
        await loadLeaderCampaigns();

        // Load staff assigned to leader's campaigns
        await loadAssignedStaff();

        // Load clock records
        await loadClockRecords();

        // Load brand ambassadors
        await loadBrandAmbassadors();

        // Render initial UI
        renderCampaignsList();
        renderStaffList();
        renderBrandAmbassadorsList();
        updateDashboardStats();
        // Update header with leader info
        updateHeader();

        console.log('✓ Leader data loaded successfully');
    } catch (error) {
        console.error('Error loading leader data:', error);
        showNotification('Error loading data', 'error');
    }
}

// ===============================
// Header updates
// ===============================
function updateHeader() {
    const nameEl = document.getElementById('leaderName');
    const roleEl = document.getElementById('leaderRole');
    const avatarEl = document.getElementById('leaderAvatar');

    if (nameEl) nameEl.textContent = leaderState.leaderName || nameEl.textContent;
    if (roleEl) roleEl.textContent = leaderState.leaderRole || roleEl.textContent;
    if (avatarEl && leaderState.leaderPhoto) avatarEl.src = leaderState.leaderPhoto;
}

async function loadLeaderCampaigns() {
    try {
        console.log(`Loading campaigns for leader ID: ${leaderState.leaderId}`);

        // Query campaigns where leader is assigned
        const campaignsRef = collection(db, 'campaigns');
        const q = query(
            campaignsRef,
            where('assigned_leaders', 'array-contains', leaderState.leaderId)
        );

        const snapshot = await getDocs(q);
        leaderState.campaigns = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✓ Loaded ${leaderState.campaigns.length} campaigns from Firestore`);

        // If no campaigns found, log a note
        if (leaderState.campaigns.length === 0) {
            console.log('No campaigns assigned to this leader in Firestore');
        }
    } catch (error) {
        console.error('Error loading campaigns from Firestore:', error);
        // For demo: Create sample campaigns with actual leader ID
        leaderState.campaigns = [
            {
                id: 'camp_001',
                name: 'Product Launch 2026',
                status: 'Active',
                start_date: '2026-02-01',
                end_date: '2026-03-01',
                assigned_leaders: [leaderState.leaderId],
                budget: 50000
            },
            {
                id: 'camp_002',
                name: 'Brand Activation - North Region',
                status: 'Active',
                start_date: '2026-02-10',
                end_date: '2026-02-28',
                assigned_leaders: [leaderState.leaderId],
                budget: 30000
            }
        ];
        console.log(`Using demo campaigns (error: ${error.message})`);
    }
}

async function loadAssignedStaff() {
    try {
        const campaignIds = leaderState.campaigns.map(c => c.id);

        // Get all staff assigned to these campaigns
        const staffRef = collection(db, 'staff');
        const staffData = [];

        for (const campaignId of campaignIds) {
            const q = query(staffRef, where('assigned_campaigns', 'array-contains', campaignId));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                if (!staffData.find(s => s.id === doc.id)) {
                    staffData.push({ id: doc.id, ...doc.data() });
                }
            });
        }

        leaderState.assignedStaff = staffData;
        console.log(`✓ Loaded ${leaderState.assignedStaff.length} staff members`);
    } catch (error) {
        console.error('Error loading staff:', error);
        // For demo: Create sample staff
        leaderState.assignedStaff = [
            {
                id: 'staff_001',
                name: 'John Smith',
                role: 'Brand Ambassador',
                email: 'john@example.com',
                phone: '555-0101',
                photo: '../asset/e8509f8003b9dc24c37ba8d92a9a069b.jpg',
                assigned_campaigns: ['camp_001', 'camp_002'],
                status: 'Active'
            },
            {
                id: 'staff_002',
                name: 'Sarah Johnson',
                role: 'Field Agent',
                email: 'sarah@example.com',
                phone: '555-0102',
                photo: '../asset/e8509f8003b9dc24c37ba8d92a9a069b.jpg',
                assigned_campaigns: ['camp_001'],
                status: 'Active'
            },
            {
                id: 'staff_003',
                name: 'Michael Brown',
                role: 'Brand Ambassador',
                email: 'michael@example.com',
                phone: '555-0103',
                photo: '../asset/e8509f8003b9dc24c37ba8d92a9a069b.jpg',
                assigned_campaigns: ['camp_002'],
                status: 'Active'
            }
        ];
    }
}

async function loadClockRecords() {
    try {
        const staffIds = leaderState.assignedStaff.map(s => s.id);
        const clockRef = collection(db, 'clock_records');
        const allRecords = [];

        for (const staffId of staffIds) {
            const q = query(clockRef, where('staff_id', '==', staffId));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                allRecords.push({ id: doc.id, ...doc.data() });
            });
        }

        leaderState.clockRecords = allRecords;
        console.log(`✓ Loaded ${leaderState.clockRecords.length} clock records`);
    } catch (error) {
        console.error('Error loading clock records:', error);
        // For demo: Create sample clock records
        leaderState.clockRecords = generateSampleClockRecords();
    }
}

function generateSampleClockRecords() {
    const today = new Date().toISOString().split('T')[0];
    const records = [];

    leaderState.assignedStaff.forEach((staff, index) => {
        // Clock in
        records.push({
            id: `clock_${staff.id}_in`,
            staff_id: staff.id,
            staff_name: staff.name,
            type: 'in',
            timestamp: `${today}T09:${15 + (index % 3) * 10}:00Z`,
            location: `Location ${index % 3 + 1}`,
            photo: staff.photo,
            gps_verified: true,
            campaign_id: staff.assigned_campaigns[0]
        });

        // Clock out
        records.push({
            id: `clock_${staff.id}_out`,
            staff_id: staff.id,
            staff_name: staff.name,
            type: 'out',
            timestamp: `${today}T17:${30 + (index % 2) * 15}:00Z`,
            location: `Location ${index % 3 + 1}`,
            photo: staff.photo,
            gps_verified: true,
            campaign_id: staff.assigned_campaigns[0]
        });
    });

    return records;
}
// GLOBAL STATE
let brandAmbassadors = [];

// =====================================
// LOAD BRAND AMBASSADORS (WORKING)
// =====================================
async function loadBrandAmbassadors() {

    const tbody = document.getElementById("baTableBody");

    if (!tbody) {
        console.error("❌ baTableBody not found in HTML");
        return;
    }

    tbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

    try {

        const snapshot = await getDocs(collection(db, "users"));

        console.log("Firestore users count:", snapshot.size);

        brandAmbassadors = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => {
                const role = (u.role || "").toLowerCase();

                return (
                    role === "staff" ||
                    role === "brand ambassador" ||
                    role === "brand_ambassador" ||
                    role === "ba" ||
                    role === "BA"
                );
            });

        renderBrandAmbassadors();

    } catch (err) {

        console.error("🔥 Firebase error:", err);
        tbody.innerHTML = "<tr><td colspan='4'>Error loading data</td></tr>";
    }
}




// ===============================
// 4. RENDER UI COMPONENTS
// ===============================

function renderCampaignsList() {
    const tbody = document.getElementById('campaignsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    leaderState.campaigns.forEach(campaign => {
        const staffCount = leaderState.assignedStaff.filter(
            s => s.assigned_campaigns.includes(campaign.id)
        ).length;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${campaign.name}</td>
            <td><span class="badge-status active">${campaign.status}</span></td>
            <td>${staffCount}</td>
            <td>
                <button class="btn-secondary btn-sm" onclick="viewCampaignDetails('${campaign.id}')">
                    <i class="fa-solid fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (leaderState.campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#6b7280;">No campaigns assigned</td></tr>';
    }
}

// ===============================
// RENDER BRAND AMBASSADORS TABLE
// ===============================
function renderBrandAmbassadors(data = brandAmbassadors) {

    const tbody = document.getElementById("baTableBody");
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;color:#6b7280;">
                    No brand ambassadors found
                </td>
            </tr>`;
        return;
    }

    data.forEach(ba => {

        const campaignNames = (ba.assigned_campaigns || [])
            .map(cid => leaderState.campaigns.find(c => c.id === cid)?.name || 'Unknown')
            .join(', ');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ba.name}</td>
            <td>${ba.role || 'Brand Ambassador'}</td>
            <td>${campaignNames || 'N/A'}</td>
            <td>
                <span class="badge-status ${(ba.status || 'active').toLowerCase()}">
                    ${ba.status || 'active'}
                </span>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// ===== SEARCH + SUGGESTION =====
(function initBrandAmbassadorSearch() {

    const input = document.getElementById("baSearch");
    const suggestionBox = document.getElementById("baSuggestions");

    if (!input || !suggestionBox) return;

    function filterData(keyword) {
        return brandAmbassadors.filter(ba =>
            ba.name.toLowerCase().includes(keyword)
        );
    }

    function showSuggestions(data) {

        suggestionBox.innerHTML = '';

        if (!data.length) {
            suggestionBox.style.display = 'none';
            return;
        }

        data.forEach(ba => {

            const div = document.createElement('div');
            div.className = 'search-item';
            div.textContent = ba.name;

            div.addEventListener('click', () => {
                input.value = ba.name;
                suggestionBox.style.display = 'none';
                renderBrandAmbassadors([ba]);
            });

            suggestionBox.appendChild(div);
        });

        suggestionBox.style.display = 'block';
    }

    input.addEventListener("input", function () {

        const keyword = this.value.trim().toLowerCase();

        if (!keyword) {
            suggestionBox.style.display = 'none';
            renderBrandAmbassadors();
            return;
        }

        const filtered = filterData(keyword);

        renderBrandAmbassadors(filtered);
        showSuggestions(filtered);
    });

    document.addEventListener("click", function (e) {
        if (!e.target.closest(".search-box")) {
            suggestionBox.style.display = "none";
        }
    });

})();

// ===============================
// RENDER BRAND AMBASSADORS LIST
// ===============================
function renderBrandAmbassadorsList() {
    const container = document.getElementById('baListContainer');
    if (!container) return;

    container.innerHTML = '';

    if (leaderState.brandAmbassadors.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">No brand ambassadors found</p>';
        return;
    }

    leaderState.brandAmbassadors.forEach(ba => {
        const card = document.createElement('div');
        card.className = 'ba-card';
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
                <img src="${ba.photo || '../asset/e8509f8003b9dc24c37ba8d92a9a069b.jpg'}" alt="${ba.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-weight: 600; color: #1f2937;">${ba.name} <span style=\"font-size:0.8rem;color:#6b7280;font-weight:400;margin-left:8px;\">${ba.role || 'Brand Ambassador'}</span></h4>
                    <p style="margin: 4px 0 0 0; font-size: 0.875rem; color: #6b7280;">${ba.email || 'No email'}</p>
                    <p style="margin: 4px 0 0 0; font-size: 0.75rem; color: #9ca3af;">${ba.phone || 'No phone'}</p>
                </div>
                <span style="padding: 6px 12px; background: #dbeafe; color: #1e40af; border-radius: 6px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">${ba.role || 'Brand Ambassador'}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderStaffList() {
    const tbody = document.getElementById('campaignsStaffTableBody') ||
        document.getElementById('staffTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    leaderState.assignedStaff.forEach(staff => {
        const campaignNames = staff.assigned_campaigns
            .map(cid => leaderState.campaigns.find(c => c.id === cid)?.name || 'Unknown')
            .join(', ');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${staff.name}</td>
            <td>${staff.role}</td>
            <td>${campaignNames || 'N/A'}</td>
            <td><span class="badge-status active">${staff.status}</span></td>
            <td style="display:${document.getElementById('staffTableBody') ? 'table-cell' : 'none'};">
                <img src="${staff.photo}" alt="${staff.name}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
            </td>
            <td style="display:${document.getElementById('staffTableBody') ? 'table-cell' : 'none'};">
                ${staff.email || 'N/A'}
            </td>
            <td>
                <button class="btn-secondary btn-sm" onclick="viewStaffDetails('${staff.id}')">
                    <i class="fa-solid fa-info-circle"></i> Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (leaderState.assignedStaff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#6b7280;">No staff assigned</td></tr>';
    }
}

function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const dateFilter = document.getElementById('attendanceDateFilter')?.value || new Date().toISOString().split('T')[0];

    // Group records by staff
    const staffAttendance = {};

    leaderState.assignedStaff.forEach(staff => {
        staffAttendance[staff.id] = {
            staff,
            inRecord: null,
            outRecord: null
        };
    });

    // Find in/out records for the date
    leaderState.clockRecords.forEach(record => {
        const recordDate = record.timestamp.split('T')[0];
        if (recordDate === dateFilter && staffAttendance[record.staff_id]) {
            if (record.type === 'in') {
                staffAttendance[record.staff_id].inRecord = record;
            } else {
                staffAttendance[record.staff_id].outRecord = record;
            }
        }
    });

    // Render rows
    Object.values(staffAttendance).forEach(att => {
        const staff = att.staff;
        const inTime = att.inRecord ? new Date(att.inRecord.timestamp).toLocaleTimeString() : '-';
        const outTime = att.outRecord ? new Date(att.outRecord.timestamp).toLocaleTimeString() : '-';
        const status = att.inRecord ? 'Checked In' : 'Absent';
        const photoUrl = att.inRecord?.photo || staff.photo;

        // Check for late arrival
        const isLate = att.inRecord && isLateArrival(att.inRecord.timestamp);
        const statusClass = isLate ? 'late' : (att.inRecord ? 'present' : 'absent');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${staff.name}</td>
            <td><img src="${photoUrl}" alt="${staff.name}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"></td>
            <td>${att.inRecord?.location || '-'}</td>
            <td>${inTime}</td>
            <td>${outTime}</td>
            <td><span class="badge-status ${statusClass}">${status}${isLate ? ' (Late)' : ''}</span></td>
            <td>
                ${att.inRecord ? `<button class="btn-secondary btn-sm" onclick="showClockDetail('${att.inRecord.id}')">
                    <i class="fa-solid fa-eye"></i> View
                </button>` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderReportsTable() {
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const startDate = document.getElementById('reportStartDate')?.value;
    const endDate = document.getElementById('reportEndDate')?.value;

    if (!startDate || !endDate) return;

    // Filter records within date range
    const filteredRecords = leaderState.clockRecords.filter(record => {
        const recordDate = record.timestamp.split('T')[0];
        return recordDate >= startDate && recordDate <= endDate;
    });

    // Group in/out pairs to calculate hours
    const staffDays = {};

    filteredRecords.forEach(record => {
        const date = record.timestamp.split('T')[0];
        const key = `${record.staff_id}_${date}`;

        if (!staffDays[key]) {
            staffDays[key] = {
                staff_id: record.staff_id,
                staff_name: record.staff_name,
                date: date,
                in_time: null,
                out_time: null,
                campaign_id: record.campaign_id
            };
        }

        if (record.type === 'in') {
            staffDays[key].in_time = record.timestamp;
        } else {
            staffDays[key].out_time = record.timestamp;
        }
    });

    // Render table
    Object.values(staffDays).forEach(day => {
        const inTime = day.in_time ? new Date(day.in_time).toLocaleTimeString() : '-';
        const outTime = day.out_time ? new Date(day.out_time).toLocaleTimeString() : '-';

        let hoursWorked = '-';
        if (day.in_time && day.out_time) {
            const inMs = new Date(day.in_time).getTime();
            const outMs = new Date(day.out_time).getTime();
            hoursWorked = ((outMs - inMs) / (1000 * 60 * 60)).toFixed(2) + ' hrs';
        }

        const campaignName = leaderState.campaigns.find(c => c.id === day.campaign_id)?.name || 'Unknown';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${day.staff_name}</td>
            <td>${campaignName}</td>
            <td>${inTime}</td>
            <td>${outTime}</td>
            <td>${hoursWorked}</td>
            <td><span class="badge-status ${day.in_time ? 'present' : 'absent'}">
                ${day.in_time ? 'Present' : 'Absent'}
            </span></td>
        `;
        tbody.appendChild(row);
    });

    if (Object.keys(staffDays).length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#6b7280;">No records in date range</td></tr>';
    }
}

function renderAnomaliesTable() {
    const tbody = document.getElementById('anomaliesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const anomalies = detectAnomalies();

    anomalies.forEach(anomaly => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge-alert ${anomaly.type}">${anomaly.type}</span></td>
            <td>${anomaly.staff_name}</td>
            <td>${anomaly.details}</td>
            <td>${new Date(anomaly.timestamp).toLocaleString()}</td>
            <td>
                <button class="btn-secondary btn-sm" onclick="reviewAnomaly('${anomaly.id}')">
                    <i class="fa-solid fa-check"></i> Review
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (anomalies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6b7280;">No anomalies detected</td></tr>';
    }
}

// ===============================
// 5. BUSINESS LOGIC
// ===============================

function detectAnomalies() {
    const anomalies = [];
    const today = new Date().toISOString().split('T')[0];

    leaderState.assignedStaff.forEach(staff => {
        // Find today's records
        const todayRecords = leaderState.clockRecords.filter(r =>
            r.staff_id === staff.id &&
            r.timestamp.split('T')[0] === today
        );

        const inRecord = todayRecords.find(r => r.type === 'in');
        const outRecord = todayRecords.find(r => r.type === 'out');

        // Check for late arrival
        if (inRecord && isLateArrival(inRecord.timestamp)) {
            anomalies.push({
                id: `anomaly_late_${staff.id}`,
                type: 'Late Arrival',
                staff_name: staff.name,
                details: `Arrived ${Math.round((new Date(inRecord.timestamp).getHours() * 60 + new Date(inRecord.timestamp).getMinutes() - 9 * 60 - parseInt(SHIFT_START_TIME.split(':')[1])) / 60)} hours late`,
                timestamp: inRecord.timestamp,
                severity: 'warning'
            });
        }

        // Check for missing check-out
        if (inRecord && !outRecord) {
            anomalies.push({
                id: `anomaly_nocheckout_${staff.id}`,
                type: 'Missing Check-Out',
                staff_name: staff.name,
                details: `No check-out recorded. Last seen at ${new Date(inRecord.timestamp).toLocaleTimeString()}`,
                timestamp: inRecord.timestamp,
                severity: 'alert'
            });
        }

        // Check for GPS not verified
        if (inRecord && !inRecord.gps_verified) {
            anomalies.push({
                id: `anomaly_nogps_${staff.id}`,
                type: 'GPS Not Verified',
                staff_name: staff.name,
                details: `GPS verification failed at ${inRecord.location}`,
                timestamp: inRecord.timestamp,
                severity: 'info'
            });
        }
    });

    return anomalies;
}

function isLateArrival(timestamp) {
    const time = new Date(timestamp);
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const shiftStart = 9 * 60; // 9:00 AM

    return (totalMinutes - shiftStart) > LATE_ARRIVAL_THRESHOLD;
}

function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = leaderState.clockRecords.filter(r =>
        r.timestamp.split('T')[0] === today && r.type === 'in'
    );

    const totalStaff = leaderState.assignedStaff.length;
    const checkedIn = todayRecords.length;
    const attendanceRate = totalStaff > 0 ? Math.round((checkedIn / totalStaff) * 100) : 0;

    // Update stat cards
    const statCards = document.querySelectorAll('.stat-value');
    if (statCards.length > 0) {
        statCards[0].textContent = totalStaff;
    }
    if (statCards.length > 1) {
        statCards[1].textContent = checkedIn;
    }
    if (statCards.length > 2) {
        const highlights = document.querySelectorAll('.stat-value.highlight');
        if (highlights.length > 0) {
            highlights[0].textContent = attendanceRate + '%';
        }
    }

    // Update report stats
    if (document.getElementById('reportAttendanceRate')) {
        document.getElementById('reportAttendanceRate').textContent = attendanceRate + '%';
        document.getElementById('reportActiveStaff').textContent = checkedIn;
        document.getElementById('reportLateArrivals').textContent = detectAnomalies().filter(a => a.type === 'Late Arrival').length;
    }
}

// ===============================
// 6. MODAL MANAGEMENT
// ===============================

function initializeModals() {
    // Assign Staff Modal
    setupModal('assignStaffBtn', 'assignStaffModal');

    // Clock Detail Modal
    setupModal(null, 'clockDetailModal');

    // Staff Detail Modal
    setupModal(null, 'staffDetailModal');

    // Settings Modal
    setupModal('settingsBtn', 'settingsModal');
}

function setupModal(openBtnId, modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const closeBtn = modal.querySelector('.close');
    const openBtn = openBtnId ? document.getElementById(openBtnId) : null;

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (modalId === 'assignStaffModal') {
                populateAssignModal();
            }
        });
    }

    closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
        }
    });
}

function populateAssignModal() {
    const campaignSelect = document.getElementById('campaignSelect');
    const userList = document.getElementById('userList');

    if (campaignSelect) {
        campaignSelect.innerHTML = '<option value="">-- Select Campaign --</option>';
        leaderState.campaigns.forEach(campaign => {
            const option = document.createElement('option');
            option.value = campaign.id;
            option.textContent = campaign.name;
            campaignSelect.appendChild(option);
        });
    }

    if (userList) {
        renderUserSelectionList('');
    }
}

function renderUserSelectionList(searchQuery) {
    const userList = document.getElementById('userList');
    if (!userList) return;

    const filtered = leaderState.assignedStaff.filter(staff =>
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    userList.innerHTML = '';
    filtered.forEach(staff => {
        const div = document.createElement('div');
        div.className = 'user-selection-item';
        div.innerHTML = `
            <input type="checkbox" value="${staff.id}" ${leaderState.selectedStaff.has(staff.id) ? 'checked' : ''}>
            <span>${staff.name} (${staff.role})</span>
        `;
        div.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                leaderState.selectedStaff.add(staff.id);
            } else {
                leaderState.selectedStaff.delete(staff.id);
            }
        });
        userList.appendChild(div);
    });
}

// ===============================
// 7. EVENT LISTENERS
// ===============================

function setupEventListeners() {
    // Page navigation
    document.querySelectorAll('.main-nav li').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');
            switchPage(pageId);
        });
    });

    // Assign Staff Confirm
    const confirmAssignBtn = document.getElementById('confirmAssign');
    if (confirmAssignBtn) {
        confirmAssignBtn.addEventListener('click', handleAssignStaff);
    }

    // User Search
    const userSearchInput = document.getElementById('userSearch');
    if (userSearchInput) {
        userSearchInput.addEventListener('keyup', (e) => {
            renderUserSelectionList(e.target.value);
        });
    }

    // Staff Search
    const staffSearchInput = document.getElementById('staffSearchInput');
    if (staffSearchInput) {
        staffSearchInput.addEventListener('keyup', (e) => {
            filterStaffTable(e.target.value);
        });
    }

    // BA Search
    const baSearchInput = document.getElementById('baSearchInput');
    if (baSearchInput) {
        baSearchInput.addEventListener('keyup', (e) => {
            filterBAList(e.target.value);
        });
    }

    // Attendance Date Filter
    const attendanceDateFilter = document.getElementById('attendanceDateFilter');
    if (attendanceDateFilter) {
        attendanceDateFilter.addEventListener('change', renderAttendanceTable);
    }

    // Reports Filters
    const reportStartDate = document.getElementById('reportStartDate');
    const reportEndDate = document.getElementById('reportEndDate');
    const applyReportFilterBtn = document.getElementById('applyReportFilter');

    if (applyReportFilterBtn) {
        applyReportFilterBtn.addEventListener('click', () => {
            renderReportsTable();
            updateReportStats();
        });
    }

    // Generate Report
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', exportReport);
    }

    // Settings
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    // Bell notification
    const bellBtn = document.querySelector('.fa-bell')?.parentElement;
    if (bellBtn) {
        bellBtn.addEventListener('click', () => {
            showNotification('You have 0 new notifications', 'info');
        });
    }
}

function switchPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active from nav
    document.querySelectorAll('.main-nav li').forEach(li => {
        li.classList.remove('active');
    });

    // Show selected page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');

        // Highlight nav item
        document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');

        // Refresh data for the page
        if (pageId === 'attendance') {
            renderAttendanceTable();
        } else if (pageId === 'stafflist') {
            renderStaffList();
        } else if (pageId === 'reports') {
            renderReportsTable();
            renderAnomaliesTable();
            updateReportStats();
        }
    }
}

// ===============================
// 8. ACTIONS & HANDLERS
// ===============================

async function handleAssignStaff() {
    const campaignId = document.getElementById('campaignSelect').value;

    if (!campaignId) {
        showNotification('Please select a campaign', 'warning');
        return;
    }

    if (leaderState.selectedStaff.size === 0) {
        showNotification('Please select at least one staff member', 'warning');
        return;
    }

    try {
        // Update Firebase for each selected staff
        for (const staffId of leaderState.selectedStaff) {
            const staffRef = doc(db, 'staff', staffId);
            const staff = leaderState.assignedStaff.find(s => s.id === staffId);
            const campaignIds = staff.assigned_campaigns || [];

            if (!campaignIds.includes(campaignId)) {
                campaignIds.push(campaignId);
            }

            // In production, this would update Firebase
            // await updateDoc(staffRef, { assigned_campaigns: campaignIds });
        }

        // Clear selection and show success
        leaderState.selectedStaff.clear();
        document.getElementById('assignStaffModal').style.display = 'none';
        showNotification(`Assigned ${leaderState.selectedStaff.size} staff to campaign`, 'success');

        // Refresh UI
        renderStaffList();
    } catch (error) {
        console.error('Error assigning staff:', error);
        showNotification('Error assigning staff', 'error');
    }
}

function viewCampaignDetails(campaignId) {
    // Set current campaign filter for UI
    leaderState.currentCampaignFilter = campaignId;
    switchPage('stafflist');
    showNotification(`Viewing campaign: ${leaderState.campaigns.find(c => c.id === campaignId)?.name}`, 'info');
}

function viewStaffDetails(staffId) {
    const staff = leaderState.assignedStaff.find(s => s.id === staffId);
    if (!staff) return;

    const modal = document.getElementById('staffDetailModal');
    if (!modal) return;

    document.getElementById('staffDetailName').textContent = staff.name;
    document.getElementById('staffDetailRole').textContent = staff.role;
    document.getElementById('staffDetailContact').textContent = staff.email;
    document.getElementById('staffDetailPhoto').src = staff.photo;
    document.getElementById('staffDetailStatus').textContent = staff.status;

    const campaigns = staff.assigned_campaigns
        .map(cid => leaderState.campaigns.find(c => c.id === cid)?.name || 'Unknown')
        .join(', ');
    document.getElementById('staffDetailCampaign').textContent = campaigns || 'None';

    // Calculate hours worked today
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = leaderState.clockRecords.filter(r =>
        r.staff_id === staffId &&
        r.timestamp.split('T')[0] === today
    );

    const inRecord = todayRecords.find(r => r.type === 'in');
    const outRecord = todayRecords.find(r => r.type === 'out');

    let hours = '0 hrs';
    if (inRecord && outRecord) {
        const inMs = new Date(inRecord.timestamp).getTime();
        const outMs = new Date(outRecord.timestamp).getTime();
        hours = ((outMs - inMs) / (1000 * 60 * 60)).toFixed(2) + ' hrs';
    }

    document.getElementById('staffDetailHours').textContent = hours;

    modal.style.display = 'flex';
}

function showClockDetail(clockId) {
    const record = leaderState.clockRecords.find(r => r.id === clockId);
    if (!record) return;

    const modal = document.getElementById('clockDetailModal');
    if (!modal) return;

    document.getElementById('clockDetailName').textContent = record.staff_name;
    document.getElementById('clockDetailTime').textContent = new Date(record.timestamp).toLocaleString();
    document.getElementById('clockDetailLocation').textContent = record.location;
    document.getElementById('clockDetailGPS').textContent = record.gps_verified ? 'Yes' : 'No';
    document.getElementById('clockDetailPhoto').src = record.photo;
    document.getElementById('clockDetailNotes').textContent = record.notes || 'No notes';

    modal.style.display = 'flex';
}

function reviewAnomaly(anomalyId) {
    showNotification('Anomaly reviewed and logged', 'success');
}

function filterStaffTable(query) {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

function filterBAList(query) {
    const container = document.getElementById('baListContainer');
    if (!container) return;

    const cards = container.querySelectorAll('.ba-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

function exportReport() {
    const startDate = document.getElementById('reportStartDate')?.value;
    const endDate = document.getElementById('reportEndDate')?.value;

    if (!startDate || !endDate) {
        showNotification('Please select date range', 'warning');
        return;
    }

    // Generate CSV
    let csv = 'Staff,Campaign,Check-In,Check-Out,Hours Worked,Status\n';

    const startDate_ = new Date(startDate);
    const endDate_ = new Date(endDate);

    const filteredRecords = leaderState.clockRecords.filter(record => {
        const recordDate = new Date(record.timestamp.split('T')[0]);
        return recordDate >= startDate_ && recordDate <= endDate_;
    });

    const staffDays = {};
    filteredRecords.forEach(record => {
        const date = record.timestamp.split('T')[0];
        const key = `${record.staff_id}_${date}`;

        if (!staffDays[key]) {
            staffDays[key] = {
                staff_id: record.staff_id,
                staff_name: record.staff_name,
                date: date,
                in_time: null,
                out_time: null,
                campaign_id: record.campaign_id
            };
        }

        if (record.type === 'in') {
            staffDays[key].in_time = record.timestamp;
        } else {
            staffDays[key].out_time = record.timestamp;
        }
    });

    Object.values(staffDays).forEach(day => {
        const campaignName = leaderState.campaigns.find(c => c.id === day.campaign_id)?.name || 'Unknown';
        const inTime = day.in_time ? new Date(day.in_time).toLocaleTimeString() : '-';
        const outTime = day.out_time ? new Date(day.out_time).toLocaleTimeString() : '-';
        let hours = '-';
        if (day.in_time && day.out_time) {
            const inMs = new Date(day.in_time).getTime();
            const outMs = new Date(day.out_time).getTime();
            hours = ((outMs - inMs) / (1000 * 60 * 60)).toFixed(2);
        }
        const status = day.in_time ? 'Present' : 'Absent';
        csv += `${day.staff_name},${campaignName},"${inTime}","${outTime}",${hours},${status}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leader_report_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showNotification('Report exported successfully', 'success');
}

function saveSettings() {
    const theme = document.getElementById('themeSelect')?.value || 'light';
    const notifications = document.getElementById('notifToggle')?.checked ?? true;

    // Apply theme
    if (theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('leaderTheme', theme);
    localStorage.setItem('leaderNotifications', notifications);

    document.getElementById('settingsModal').style.display = 'none';
    showNotification('Settings saved successfully', 'success');
}

function updateReportStats() {
    const startDate = document.getElementById('reportStartDate')?.value;
    const endDate = document.getElementById('reportEndDate')?.value;

    if (!startDate || !endDate) return;

    const filteredRecords = leaderState.clockRecords.filter(record => {
        const recordDate = record.timestamp.split('T')[0];
        return recordDate >= startDate && recordDate <= endDate;
    });

    const presentCount = new Set(
        filteredRecords.filter(r => r.type === 'in').map(r => r.staff_id)
    ).size;

    const totalStaff = leaderState.assignedStaff.length;
    const rate = totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0;

    if (document.getElementById('reportAttendanceRate')) {
        document.getElementById('reportAttendanceRate').textContent = rate + '%';
        document.getElementById('reportActiveStaff').textContent = presentCount;
    }
}

// ===============================
// 9. UTILITY FUNCTIONS
// ===============================

function showNotification(message, type = 'info') {
    const notif = document.getElementById('notification');
    if (!notif) return;

    notif.textContent = message;
    notif.style.display = 'block';

    const colors = {
        success: '#16a34a',
        error: '#dc2626',
        warning: '#f59e0b',
        info: '#2563eb'
    };

    notif.style.background = colors[type] || colors.info;
    notif.style.color = '#fff';
    notif.style.padding = '10px 15px';
    notif.style.borderRadius = '4px';
    notif.style.marginTop = '10px';

    setTimeout(() => {
        notif.style.display = 'none';
    }, 3000);
}

// Load saved theme on page load
window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('leaderTheme') || 'light';
    document.getElementById('themeSelect').value = savedTheme;
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
    // If a leader profile was saved (by login), load it and update header
    try {
        const lp = localStorage.getItem('leaderProfile');
        if (lp) {
            const profile = JSON.parse(lp);
            setLeaderProfile(profile);
        }
    } catch (e) {
        console.warn('Could not parse saved leader profile', e);
    }
});

// Global functions for onclick handlers
window.viewCampaignDetails = viewCampaignDetails;
window.viewStaffDetails = viewStaffDetails;
window.showClockDetail = showClockDetail;
window.reviewAnomaly = reviewAnomaly;

// Public API: allow login flow to set the leader profile
function setLeaderProfile(profile) {
    if (!profile) return;
    leaderState.leaderId = profile.id || leaderState.leaderId;
    leaderState.leaderName = profile.name || leaderState.leaderName;
    leaderState.leaderRole = profile.role || leaderState.leaderRole;
    leaderState.leaderPhoto = profile.photo || leaderState.leaderPhoto;
    try { localStorage.setItem('leaderProfile', JSON.stringify(profile)); } catch (e) { }
    updateHeader();
    // Reload leader-specific data now that identity changed
    loadLeaderData();
}

window.setLeaderProfile = setLeaderProfile;

function logout() {
    try { localStorage.removeItem('leaderProfile'); } catch (e) { }
    try { sessionStorage.removeItem('user'); } catch (e) { }
    window.location.href = 'login.html';
}

window.logout = logout;

