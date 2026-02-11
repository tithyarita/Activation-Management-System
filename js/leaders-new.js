import { db, collection, getDocs } from "../js/firebase.js";

// Initialize leaders page
export async function initLeaders() {
    try {
        await loadLeadersData();
    } catch (err) {
        console.error('Error initializing leaders:', err);
    }
}

// Load leaders performance data
async function loadLeadersData() {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const campaignsSnap = await getDocs(collection(db, 'campaigns'));
        const attendanceSnap = await getDocs(collection(db, 'attendance'));

        const leaders = [];

        usersSnap.forEach(userDoc => {
            const user = userDoc.data();
            if (user.role === 'leader') {
                const leaderId = userDoc.id;
                const leaderCampaigns = Array.from(campaignsSnap.docs).filter(c => (c.data().leaderId || c.data().leader) === leaderId).length;
                const leaderAttendance = Array.from(attendanceSnap.docs).filter(a => (a.data().leaderId || a.data().leader) === leaderId).length;

                // staffManaged: number of unique staff who checked in under this leader
                const staffSet = new Set(Array.from(attendanceSnap.docs)
                    .filter(a => (a.data().leaderId || a.data().leader) === leaderId)
                    .map(a => a.data().userId)
                );

                const staffManaged = staffSet.size;

                const attendanceRate = leaderCampaigns > 0 ? Math.round((leaderAttendance / (leaderCampaigns * 10)) * 100) : 0;

                leaders.push({
                    id: leaderId,
                    name: user.name || 'Unnamed',
                    email: user.email || '',
                    campaigns: leaderCampaigns,
                    staffManaged,
                    attendance: leaderAttendance,
                    attendanceRate,
                    rating: (leaderAttendance > 0 ? Math.min(5, 3 + leaderAttendance / 10) : 3).toFixed(1)
                });
            }
        });

        // Sort by attendanceRate then rating
        leaders.sort((a, b) => b.attendanceRate - a.attendanceRate || b.rating - a.rating);

        // Update performance cards (leaderPerformance)
        const perfEl = document.getElementById('leaderPerformance');
        if (perfEl) {
            if (leaders.length === 0) {
                perfEl.innerHTML = '<p class="loading-text">No leaders found.</p>';
            } else {
                let html = '';
                leaders.slice(0, 3).forEach((leader, idx) => {
                    html += `
                        <div class="performance-card">
                            <div class="performance-rank">#${idx + 1}</div>
                            <h4>${leader.name}</h4>
                            <p class="email">${leader.email}</p>
                            <div class="performance-stats">
                                <div class="stat"><span class="stat-label">Campaigns</span><span class="stat-value">${leader.campaigns}</span></div>
                                <div class="stat"><span class="stat-label">Staff Managed</span><span class="stat-value">${leader.staffManaged}</span></div>
                                <div class="stat"><span class="stat-label">Check-ins</span><span class="stat-value">${leader.attendance}</span></div>
                                <div class="stat"><span class="stat-label">Attendance Rate</span><span class="stat-value">${leader.attendanceRate}%</span></div>
                            </div>
                        </div>
                    `;
                });
                perfEl.innerHTML = html;
            }
        }

        // Update ranking table (leaderRankingTable)
        const rankingTable = document.getElementById('leaderRankingTable');
        if (rankingTable) {
            if (leaders.length === 0) {
                rankingTable.innerHTML = '<tr><td colspan="8" class="loading-text">No leaders found.</td></tr>';
            } else {
                let html = '';
                leaders.forEach((leader, idx) => {
                    html += `
                        <tr>
                            <td>#${idx + 1}</td>
                            <td>${leader.name}</td>
                            <td>${leader.email}</td>
                            <td>${leader.campaigns}</td>
                            <td>${leader.staffManaged}</td>
                            <td>${leader.attendanceRate}%</td>
                            <td>${leader.attendance}</td>
                            <td><button class="btn btn-small" onclick="viewLeader('${leader.id}')">View</button></td>
                        </tr>
                    `;
                });
                rankingTable.innerHTML = html;
            }
        }

        // Activity timeline (leaderActivityTimeline)
        const activityEl = document.getElementById('leaderActivityTimeline');
        if (activityEl) {
            const activities = [];

            attendanceSnap.forEach(aDoc => {
                const a = aDoc.data();
                if (a.timestamp) {
                    activities.push({
                        time: new Date(a.timestamp),
                        message: `${a.userName || 'User'} checked in at ${a.location || 'Unknown'}`
                    });
                }
            });

            campaignsSnap.forEach(cDoc => {
                const c = cDoc.data();
                if (c.createdAt) activities.push({ time: new Date(c.createdAt), message: `Campaign "${c.name}" created` });
            });

            activities.sort((x, y) => y.time - x.time);
            const recent = activities.slice(0, 12);

            if (recent.length === 0) {
                activityEl.innerHTML = '<p class="loading-text">No recent activities</p>';
            } else {
                let html = '';
                recent.forEach(act => {
                    html += `
                        <div class="timeline-item">
                            <div class="timeline-time">${act.time.toLocaleString()}</div>
                            <div class="timeline-message">${act.message}</div>
                        </div>
                    `;
                });
                activityEl.innerHTML = html;
            }
        }

    } catch (err) {
        console.error('Error loading leaders data:', err);
    }
}

// Simple view action
window.viewLeader = function(leaderId) {
    alert('View leader details: ' + leaderId);
};
