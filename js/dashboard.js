import { db, collection, getDocs } from "../js/firebase.js";

// Initialize dashboard
export async function initDashboard() {
    try {
        console.log('Initializing dashboard...');
        // Load Chart.js library
        loadChartJS();
        await loadDashboardData();
    } catch (err) {
        console.error('Error initializing dashboard:', err);
    }
}

// Load Chart.js library
function loadChartJS() {
    if (window.Chart) return; // Already loaded
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => {
        console.log('Chart.js loaded successfully');
    };
    document.head.appendChild(script);
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const campaignsSnap = await getDocs(collection(db, 'campaigns'));
        const usersSnap = await getDocs(collection(db, 'users'));
        const attendanceSnap = await getDocs(collection(db, 'attendance'));

        // Calculate metrics
        const totalCampaigns = campaignsSnap.size;
        const totalUsers = usersSnap.size;
        
        let activeLeaders = 0;
        let staffCount = 0;
        let leaderCount = 0;

        usersSnap.forEach(doc => {
            const user = doc.data();
            if (user.role === 'leader') {
                leaderCount++;
                activeLeaders++;
            } else if (user.role === 'staff') {
                staffCount++;
            }
        });

        // Today's attendance
        const today = new Date().toDateString();
        let todayAttendance = 0;
        attendanceSnap.forEach(doc => {
            const data = doc.data();
            if (data.timestamp && new Date(data.timestamp).toDateString() === today) {
                todayAttendance++;
            }
        });

        // Overall attendance rate
        const uniqueAttendees = new Set(Array.from(attendanceSnap.docs).map(doc => doc.data().userId)).size;
        const avgAttendanceRate = totalUsers > 0 ? Math.round((uniqueAttendees / totalUsers) * 100) : 0;

        // Calculate this week's campaigns
        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        thisWeekStart.setHours(0, 0, 0, 0);
        
        let thisWeekCampaigns = 0;
        campaignsSnap.forEach(doc => {
            const data = doc.data();
            if (data.date) {
                const campaignDate = new Date(data.date);
                if (campaignDate >= thisWeekStart) {
                    thisWeekCampaigns++;
                }
            }
        });

        // Update UI - Summary Cards
        const totalCampaignsEl = document.getElementById('totalCampaigns');
        const totalUsersEl = document.getElementById('totalUsers');
        const activeLeadersEl = document.getElementById('activeLeaders');
        const todayAttendanceEl = document.getElementById('todayAttendance');

        if (totalCampaignsEl) totalCampaignsEl.textContent = totalCampaigns;
        if (totalUsersEl) totalUsersEl.textContent = totalUsers;
        if (activeLeadersEl) activeLeadersEl.textContent = activeLeaders;
        if (todayAttendanceEl) todayAttendanceEl.textContent = todayAttendance;

        // Update UI - Quick Stats
        const statStaffCount = document.getElementById('statStaffCount');
        const statLeaderCount = document.getElementById('statLeaderCount');
        const statAttendanceRate = document.getElementById('statAttendanceRate');
        const statWeeklyCampaigns = document.getElementById('statWeeklyCampaigns');

        if (statStaffCount) statStaffCount.textContent = staffCount;
        if (statLeaderCount) statLeaderCount.textContent = leaderCount;
        if (statAttendanceRate) statAttendanceRate.textContent = avgAttendanceRate + '%';
        if (statWeeklyCampaigns) statWeeklyCampaigns.textContent = thisWeekCampaigns;

        // Load charts after a delay to ensure Chart.js is loaded
        setTimeout(() => {
            loadCharts(attendanceSnap, campaignsSnap);
        }, 500);

        // Load recent activity
        const activityLogEl = document.getElementById('activityLog');
        if (activityLogEl) {
            loadRecentActivity(campaignsSnap, usersSnap, attendanceSnap);
        }

    } catch (err) {
        console.error('Error loading dashboard data:', err);
    }
}

// Load charts
async function loadCharts(attendanceSnap, campaignsSnap) {
    try {
        // Wait for Chart.js to load
        if (!window.Chart) {
            setTimeout(() => loadCharts(attendanceSnap, campaignsSnap), 100);
            return;
        }

        // Attendance Trend Chart (7 days)
        loadAttendanceTrendChart(attendanceSnap);

        // Campaign Activity Chart
        loadCampaignActivityChart(campaignsSnap);

    } catch (err) {
        console.error('Error loading charts:', err);
    }
}

// Load 7-day attendance trend chart
function loadAttendanceTrendChart(attendanceSnap) {
    const ctx = document.getElementById('attendanceTrendChart');
    if (!ctx) return;

    // Calculate attendance counts for last 7 days
    const data = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        data[dateStr] = 0;
    }

    attendanceSnap.forEach(doc => {
        const attendance = doc.data();
        if (attendance.timestamp) {
            const attendDate = new Date(attendance.timestamp);
            const dateStr = attendDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (data[dateStr] !== undefined) {
                data[dateStr]++;
            }
        }
    });

    new window.Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Attendance Count',
                data: Object.values(data),
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointBackgroundColor: '#007bff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Load campaign activity doughnut chart
function loadCampaignActivityChart(campaignsSnap) {
    const ctx = document.getElementById('campaignActivityChart');
    if (!ctx) return;

    let activeCount = 0;
    let completedCount = 0;

    campaignsSnap.forEach(doc => {
        const campaign = doc.data();
        if (campaign.status && campaign.status === 'completed') {
            completedCount++;
        } else {
            activeCount++;
        }
    });

    new window.Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Completed'],
            datasets: [{
                data: [activeCount, completedCount],
                backgroundColor: ['#007bff', '#28a745'],
                borderColor: ['#0056b3', '#1e7e34'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Load recent activity
async function loadRecentActivity(campaignsSnap, usersSnap, attendanceSnap) {
    try {
        const activityLog = document.getElementById('activityLog');
        const activities = [];

        // Collect recent activities
        attendanceSnap.forEach(doc => {
            const data = doc.data();
            if (data.timestamp) {
                activities.push({
                    time: new Date(data.timestamp),
                    type: 'clock-in',
                    message: `${data.userName || 'User'} clocked in at ${data.location || 'Unknown location'}`
                });
            }
        });

        campaignsSnap.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
                activities.push({
                    time: new Date(data.createdAt),
                    type: 'campaign',
                    message: `Campaign "${data.name}" created`
                });
            }
        });

        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
                activities.push({
                    time: new Date(data.createdAt),
                    type: 'user',
                    message: `User "${data.name}" added`
                });
            }
        });

        // Sort by time and get 10 most recent
        activities.sort((a, b) => b.time - a.time);
        const recent = activities.slice(0, 10);

        if (recent.length === 0) {
            activityLog.innerHTML = '<p class="loading-text">No recent activities</p>';
            return;
        }

        let html = '';
        recent.forEach(activity => {
            const timeStr = activity.time.toLocaleString();
            const icon = activity.type === 'clock-in' ? 'fa-check-circle' : 
                         activity.type === 'campaign' ? 'fa-calendar' : 'fa-user-plus';
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.message}</p>
                        <span class="activity-time">${timeStr}</span>
                    </div>
                </div>
            `;
        });

        activityLog.innerHTML = html;
    } catch (err) {
        console.error('Error loading recent activity:', err);
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

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initDashboard);
