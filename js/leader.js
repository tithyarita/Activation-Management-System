import { db, collection, getDocs } from "../js/firebase.js";

let currentLeader = null;
let leaderCampaigns = [];
let teamMembers = [];

// Initialize leader page
export async function initLeader() {
    try {
        console.log('Initializing leader dashboard...');
        await loadCurrentLeader();
        await loadLeaderCampaigns();
        await loadTeamMembers();
        await loadAttendanceRecords();
        await loadPerformanceStats();
    } catch (err) {
        console.error('Error initializing leader dashboard:', err);
    }
}

// Load current leader from session
async function loadCurrentLeader() {
    try {
        const userEmail = sessionStorage.getItem('userEmail');
        if (!userEmail) {
            window.location.href = 'login.html';
            return;
        }

        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach(doc => {
            const user = doc.data();
            if (user.email === userEmail && user.role === 'leader') {
                currentLeader = { id: doc.id, ...user };
                const nameDisplay = document.getElementById('leaderNameDisplay');
                if (nameDisplay) nameDisplay.textContent = user.name || 'Leader';
            }
        });

        if (!currentLeader) {
            window.location.href = 'login.html';
        }
    } catch (err) {
        console.error('Error loading current leader:', err);
    }
}

// Load leader's campaigns
async function loadLeaderCampaigns() {
    try {
        const campaignsSnap = await getDocs(collection(db, 'campaigns'));
        leaderCampaigns = [];

        campaignsSnap.forEach(doc => {
            const campaign = doc.data();
            // Show campaigns assigned to this leader
            if (campaign.assignedLeader === currentLeader?.name || 
                campaign.leaderId === currentLeader?.id ||
                campaign.leader === currentLeader?.id) {
                leaderCampaigns.push({ id: doc.id, ...campaign });
            }
        });

        // Also show all active campaigns for overview
        campaignsSnap.forEach(doc => {
            const campaign = doc.data();
            if ((campaign.status === 'active' || campaign.status === 'ongoing') && !leaderCampaigns.find(c => c.id === doc.id)) {
                leaderCampaigns.push({ id: doc.id, ...campaign });
            }
        });

        renderCampaigns();
    } catch (err) {
        console.error('Error loading campaigns:', err);
    }
}

// Render campaigns list
function renderCampaigns() {
    const campaignsList = document.getElementById('leaderCampaigns');
    if (!campaignsList) return;

    if (leaderCampaigns.length === 0) {
        campaignsList.innerHTML = '<p class="loading-text">No campaigns found.</p>';
        return;
    }

    let html = '';
    leaderCampaigns.forEach(campaign => {
        html += `
            <div class="campaign-card">
                <div class="campaign-header">
                    <h3>${campaign.name}</h3>
                    <span class="campaign-status status-${campaign.status || 'active'}">${campaign.status || 'Active'}</span>
                </div>
                <div class="campaign-details">
                    <p><strong>Date:</strong> ${campaign.date}</p>
                    <p><strong>Time:</strong> ${campaign.startTime} - ${campaign.endTime}</p>
                    <p><strong>Location:</strong> ${campaign.location}</p>
                    <p><strong>Progress:</strong> ${campaign.progress || 0}%</p>
                </div>
                <div class="campaign-actions">
                    <button class="btn btn-secondary" onclick="viewCampaignDetails('${campaign.id}')">
                        View Details
                    </button>
                </div>
            </div>
        `;
    });

    campaignsList.innerHTML = html;
}

// Load team members (staff assigned to this leader)
async function loadTeamMembers() {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        teamMembers = [];

        usersSnap.forEach(doc => {
            const user = doc.data();
            if (user.role === 'staff') {
                teamMembers.push({ id: doc.id, ...user });
            }
        });

        renderTeamMembers();
    } catch (err) {
        console.error('Error loading team members:', err);
    }
}

// Render team members
async function renderTeamMembers() {
    const teamList = document.getElementById('teamMembersList');
    if (!teamList) return;

    if (teamMembers.length === 0) {
        teamList.innerHTML = '<tr><td colspan="5" class="loading-text">No team members found.</td></tr>';
        return;
    }

    try {
        const attendanceSnap = await getDocs(collection(db, 'attendance'));
        
        let html = '';
        teamMembers.forEach(member => {
            const memberCheckIns = Array.from(attendanceSnap.docs).filter(doc => {
                const record = doc.data();
                return record.userId === member.id || record.userEmail === member.email;
            });

            const totalCheckIns = memberCheckIns.length;
            const attendanceRate = leaderCampaigns.length > 0 
                ? Math.round((totalCheckIns / leaderCampaigns.length) * 100) 
                : 0;
            
            const lastCheckIn = memberCheckIns.length > 0 
                ? new Date(memberCheckIns[memberCheckIns.length - 1].data().timestamp).toLocaleString()
                : 'N/A';

            html += `
                <tr>
                    <td>${member.name}</td>
                    <td>${member.email}</td>
                    <td>${totalCheckIns}</td>
                    <td>${attendanceRate}%</td>
                    <td>${lastCheckIn}</td>
                </tr>
            `;
        });

        teamList.innerHTML = html;
    } catch (err) {
        console.error('Error rendering team members:', err);
    }
}

// Load attendance records for campaigns led by this leader
async function loadAttendanceRecords() {
    try {
        const attendanceSnap = await getDocs(collection(db, 'attendance'));
        const attendanceList = document.getElementById('attendanceList');
        
        if (!attendanceList) return;

        let records = [];
        attendanceSnap.forEach(doc => {
            const record = doc.data();
            records.push({ id: doc.id, ...record });
        });

        if (records.length === 0) {
            attendanceList.innerHTML = '<tr><td colspan="6" class="loading-text">No attendance records found.</td></tr>';
            return;
        }

        // Sort by date descending
        records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let html = '';
        records.slice(0, 50).forEach(record => {
            const timestamp = new Date(record.timestamp).toLocaleString();
            const campaign = leaderCampaigns.find(c => c.id === record.campaignId);
            
            html += `
                <tr>
                    <td>${record.campaignName || campaign?.name || 'Unknown'}</td>
                    <td>${campaign?.date || 'N/A'}</td>
                    <td>${record.userName || 'Unknown'}</td>
                    <td>${timestamp}</td>
                    <td>${record.location || 'N/A'}</td>
                    <td><span class="status-badge status-${record.type || 'checkin'}">${record.type === 'checkout' ? 'Clock Out' : 'Clock In'}</span></td>
                </tr>
            `;
        });

        attendanceList.innerHTML = html;
    } catch (err) {
        console.error('Error loading attendance records:', err);
    }
}

// Load performance statistics
async function loadPerformanceStats() {
    try {
        const campaignsLedEl = document.getElementById('campaignsLed');
        const teamMembersEl = document.getElementById('teamMembers');
        const totalCheckInsEl = document.getElementById('totalCheckIns');
        const attendanceRateEl = document.getElementById('attendanceRate');

        if (campaignsLedEl) campaignsLedEl.textContent = leaderCampaigns.length;
        if (teamMembersEl) teamMembersEl.textContent = teamMembers.length;

        const attendanceSnap = await getDocs(collection(db, 'attendance'));
        const leaderCampaignCheckIns = [];

        attendanceSnap.forEach(doc => {
            const record = doc.data();
            if (leaderCampaigns.find(c => c.id === record.campaignId)) {
                leaderCampaignCheckIns.push(record);
            }
        });

        const totalCheckIns = leaderCampaignCheckIns.length;
        const uniqueStaff = new Set(leaderCampaignCheckIns.map(r => r.userId)).size;
        const expectedAttendance = leaderCampaigns.length * 10; // Assume 10 staff per campaign
        const attendanceRate = expectedAttendance > 0 
            ? Math.round((totalCheckIns / expectedAttendance) * 100) 
            : 0;

        if (totalCheckInsEl) totalCheckInsEl.textContent = totalCheckIns;
        if (attendanceRateEl) attendanceRateEl.textContent = attendanceRate + '%';
    } catch (err) {
        console.error('Error loading performance stats:', err);
    }
}

// View campaign details
window.viewCampaignDetails = function(campaignId) {
    const campaign = leaderCampaigns.find(c => c.id === campaignId);
    if (campaign) {
        alert(`Campaign: ${campaign.name}\nDate: ${campaign.date}\nLocation: ${campaign.location}\nStatus: ${campaign.status}`);
    }
};

// Handle logout
window.handleLogout = function() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = 'login.html';
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initLeader);
