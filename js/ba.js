import { db, collection, getDocs, addDoc, query, where } from "../js/firebase.js";

let currentUser = null;
let assignedCampaigns = [];

// Initialize BA page
export async function initBA() {
    try {
        console.log('Initializing BA dashboard...');
        await loadCurrentUser();
        await loadAssignedCampaigns();
        await loadDashboardStats();
        await loadRecentCheckIns();
        setupEventListeners();
    } catch (err) {
        console.error('Error initializing BA dashboard:', err);
    }
}

// Load current user from session
async function loadCurrentUser() {
    try {
        const userEmail = sessionStorage.getItem('userEmail');
        if (!userEmail) {
            window.location.href = 'login.html';
            return;
        }

        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach(doc => {
            const user = doc.data();
            if (user.email === userEmail) {
                currentUser = { id: doc.id, ...user };
                const nameDisplay = document.getElementById('userNameDisplay');
                if (nameDisplay) nameDisplay.textContent = user.name || 'User';
            }
        });

        if (!currentUser) {
            window.location.href = 'login.html';
        }
    } catch (err) {
        console.error('Error loading current user:', err);
    }
}

// Load assigned campaigns
async function loadAssignedCampaigns() {
    try {
        const campaignsSnap = await getDocs(collection(db, 'campaigns'));
        assignedCampaigns = [];

        campaignsSnap.forEach(doc => {
            const campaign = doc.data();
            // For now, show all active campaigns. Can be customized based on assignment logic
            if (campaign.status === 'active' || campaign.status === 'ongoing') {
                assignedCampaigns.push({ id: doc.id, ...campaign });
            }
        });

        // Populate campaign select in modals
        const campaignSelect = document.getElementById('campaignSelect');
        if (campaignSelect) {
            campaignSelect.innerHTML = '<option value="">-- Select a campaign --</option>';
            assignedCampaigns.forEach(campaign => {
                const option = document.createElement('option');
                option.value = campaign.id;
                option.textContent = `${campaign.name} (${campaign.date})`;
                campaignSelect.appendChild(option);
            });
        }

        // Display campaigns
        renderCampaigns();
    } catch (err) {
        console.error('Error loading campaigns:', err);
    }
}

// Render campaigns list
function renderCampaigns() {
    const campaignsList = document.getElementById('campaignsList');
    if (!campaignsList) return;

    if (assignedCampaigns.length === 0) {
        campaignsList.innerHTML = '<p class="loading-text">No campaigns assigned.</p>';
        return;
    }

    let html = '';
    assignedCampaigns.forEach(campaign => {
        html += `
            <div class="campaign-item">
                <div class="campaign-info">
                    <h3>${campaign.name}</h3>
                    <p><strong>Date:</strong> ${campaign.date}</p>
                    <p><strong>Time:</strong> ${campaign.startTime} - ${campaign.endTime}</p>
                    <p><strong>Location:</strong> ${campaign.location}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${campaign.status}">${campaign.status}</span></p>
                </div>
                <div class="campaign-actions">
                    <button class="btn btn-primary" onclick="openCheckInModal('${campaign.id}')">
                        Clock In
                    </button>
                </div>
            </div>
        `;
    });

    campaignsList.innerHTML = html;
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const assignedCampaignsEl = document.getElementById('assignedCampaigns');
        const attendanceRateEl = document.getElementById('attendanceRate');

        if (assignedCampaignsEl) {
            assignedCampaignsEl.textContent = assignedCampaigns.length;
        }

        // Get check-ins for current user
        const attendanceSnap = await getDocs(collection(db, 'attendance'));
        const userCheckIns = [];
        const todayCheckIns = [];
        const today = new Date().toDateString();

        attendanceSnap.forEach(doc => {
            const record = doc.data();
            if (record.userId === currentUser?.id || record.userEmail === currentUser?.email) {
                userCheckIns.push(record);
                if (new Date(record.timestamp).toDateString() === today) {
                    todayCheckIns.push(record);
                }
            }
        });

        const todayCheckInsEl = document.getElementById('todayCheckIns');
        const totalCheckInsEl = document.getElementById('totalCheckIns');
        
        if (todayCheckInsEl) todayCheckInsEl.textContent = todayCheckIns.length;
        if (totalCheckInsEl) totalCheckInsEl.textContent = userCheckIns.length;

        // Calculate attendance rate
        const campaignsSnap = await getDocs(collection(db, 'campaigns'));
        const totalCampaigns = campaignsSnap.size;
        const rate = totalCampaigns > 0 ? Math.round((userCheckIns.length / totalCampaigns) * 100) : 0;
        
        if (attendanceRateEl) attendanceRateEl.textContent = rate + '%';
    } catch (err) {
        console.error('Error loading dashboard stats:', err);
    }
}

// Load recent check-ins
async function loadRecentCheckIns() {
    try {
        const attendanceSnap = await getDocs(collection(db, 'attendance'));
        const checkinsList = document.getElementById('checkinsList');
        
        if (!checkinsList) return;

        const userCheckIns = [];
        attendanceSnap.forEach(doc => {
            const record = doc.data();
            if (record.userId === currentUser?.id || record.userEmail === currentUser?.email) {
                userCheckIns.push(record);
            }
        });

        if (userCheckIns.length === 0) {
            checkinsList.innerHTML = '<tr><td colspan="4" class="loading-text">No check-ins yet.</td></tr>';
            return;
        }

        // Sort by date descending
        userCheckIns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let html = '';
        userCheckIns.slice(0, 10).forEach(record => {
            const timestamp = new Date(record.timestamp).toLocaleString();
            html += `
                <tr>
                    <td>${timestamp}</td>
                    <td>${record.location || 'N/A'}</td>
                    <td>${record.campaignName || 'N/A'}</td>
                    <td><span class="status-badge status-${record.type || 'checkin'}">${record.type === 'checkout' ? 'Clock Out' : 'Clock In'}</span></td>
                </tr>
            `;
        });

        checkinsList.innerHTML = html;
    } catch (err) {
        console.error('Error loading check-ins:', err);
    }
}

// Handle check-in
window.handleCheckIn = async function(e) {
    e.preventDefault();

    const campaignId = document.getElementById('campaignSelect')?.value;
    const location = document.getElementById('checkInLocation')?.value;
    const notes = document.getElementById('checkInNotes')?.value;

    if (!campaignId || !location) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const campaign = assignedCampaigns.find(c => c.id === campaignId);
        
        await addDoc(collection(db, 'attendance'), {
            userId: currentUser.id,
            userEmail: currentUser.email,
            userName: currentUser.name,
            campaignId: campaignId,
            campaignName: campaign?.name || 'Unknown',
            location: location,
            notes: notes,
            type: 'checkin',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        alert('Clock in recorded successfully!');
        closeCheckInModal();
        await loadRecentCheckIns();
        await loadDashboardStats();
    } catch (err) {
        console.error('Error recording check-in:', err);
        alert('Failed to record check-in');
    }
};

// Handle check-out
window.handleCheckOut = async function(e) {
    e.preventDefault();

    const location = document.getElementById('checkOutLocation')?.value;
    const notes = document.getElementById('checkOutNotes')?.value;

    if (!location) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        await addDoc(collection(db, 'attendance'), {
            userId: currentUser.id,
            userEmail: currentUser.email,
            userName: currentUser.name,
            location: location,
            notes: notes,
            type: 'checkout',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        alert('Clock out recorded successfully!');
        closeCheckOutModal();
        await loadRecentCheckIns();
        await loadDashboardStats();
    } catch (err) {
        console.error('Error recording check-out:', err);
        alert('Failed to record check-out');
    }
};

// Modal functions
window.openCheckInModal = function(campaignId = null) {
    if (campaignId) {
        document.getElementById('campaignSelect').value = campaignId;
    }
    document.getElementById('checkInModal').style.display = 'flex';
};

window.closeCheckInModal = function() {
    document.getElementById('checkInModal').style.display = 'none';
    document.getElementById('checkInForm').reset();
};

window.openCheckOutModal = function() {
    document.getElementById('checkOutModal').style.display = 'flex';
};

window.closeCheckOutModal = function() {
    document.getElementById('checkOutModal').style.display = 'none';
    document.getElementById('checkOutForm').reset();
};

window.viewCampaigns = function() {
    alert('Showing assigned campaigns');
    // Already displayed on main page
};

window.viewAttendance = function() {
    alert('Your attendance records are shown below');
    // Already displayed on main page
};

// Setup event listeners
function setupEventListeners() {
    const checkInForm = document.getElementById('checkInForm');
    const checkOutForm = document.getElementById('checkOutForm');

    if (checkInForm) {
        checkInForm.addEventListener('submit', handleCheckIn);
    }
    if (checkOutForm) {
        checkOutForm.addEventListener('submit', handleCheckOut);
    }
}

// Handle logout
window.handleLogout = function() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = 'login.html';
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initBA);
