    import { db, collection, getDocs } from "./firebase.js";

    async function loadDashboardData() {
        try {
            // Load all required data from Firebase
            const campaignsSnap = await getDocs(collection(db, 'campaigns'));
            const usersSnap = await getDocs(collection(db, 'users'));
            const clockRecordsSnap = await getDocs(collection(db, 'clock_records'));
            
            // Count users by role
            let activeLeaders = 0, staffCount = 0, leaderCount = 0;
            usersSnap.forEach(doc => {
                const user = doc.data();
                if (user.role === 'leader') { 
                    leaderCount++; 
                    activeLeaders++; 
                }
                else if (user.role === 'ba') {
                    staffCount++;
                }
            });

            // Calculate today's attendance from clock records
            const today = new Date().toISOString().split('T')[0];
            let todayAttendance = 0;
            const todayClockIns = new Set();
            
            clockRecordsSnap.forEach(doc => {
                const record = doc.data();
                if (record.timestamp && record.timestamp.split('T')[0] === today) {
                    todayAttendance++;
                    if (record.staff_id) todayClockIns.add(record.staff_id);
                }
            });

            // Calculate campaigns for this week
            const thisWeekStart = new Date();
            thisWeekStart.setDate(thisWeekStart.getDate() - 7);
            let weeklyCampaigns = 0;
            
            campaignsSnap.forEach(doc => {
                const campaign = doc.data();
                if (campaign.createdAt) {
                    const createdDate = new Date(campaign.createdAt);
                    if (createdDate >= thisWeekStart) {
                        weeklyCampaigns++;
                    }
                }
            });

            // Update dashboard cards
            document.getElementById('totalCampaigns').textContent = campaignsSnap.size;
            document.getElementById('totalUsers').textContent = usersSnap.size;
            document.getElementById('activeLeaders').textContent = activeLeaders;
            document.getElementById('todayAttendance').textContent = todayClockIns.size;
            document.getElementById('statStaffCount').textContent = staffCount;
            document.getElementById('statLeaderCount').textContent = leaderCount;
            document.getElementById('statWeeklyCampaigns').textContent = weeklyCampaigns;

            // Calculate attendance rate
            const rate = staffCount > 0 ? Math.round((todayClockIns.size / staffCount) * 100) : 0;
            document.getElementById('statAttendanceRate').textContent = rate + '%';

            // Build attendance trend (7 days)
            const attendanceData = {};
            const today_date = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today_date);
                d.setDate(d.getDate() - i);
                const ds = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                attendanceData[ds] = 0;
            }

            clockRecordsSnap.forEach(doc => {
                const record = doc.data();
                if (record.timestamp) {
                    const ad = new Date(record.timestamp);
                    const ds = ad.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (attendanceData[ds] !== undefined) {
                        attendanceData[ds]++;
                    }
                }
            });

            // Create attendance trend chart
            if (document.getElementById('attendanceTrendChart')) {
                new Chart(document.getElementById('attendanceTrendChart'), {
                    type: 'line',
                    data: {
                        labels: Object.keys(attendanceData),
                        datasets: [{
                            label: 'Daily Attendance',
                            data: Object.values(attendanceData),
                            borderColor: '#007bff',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            tension: 0.4,
                            fill: true,
                            borderWidth: 2,
                            pointRadius: 5,
                            pointBackgroundColor: '#007bff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: { 
                            legend: { display: true, position: 'top' } 
                        },
                        scales: { 
                            y: { beginAtZero: true, ticks: { stepSize: 1 } }
                        }
                    }
                });
            }

            // Count campaign statuses
            let activeCount = 0, completedCount = 0, upcomingCount = 0;
            campaignsSnap.forEach(doc => {
                const status = doc.data().status || 'upcoming';
                if (status === 'completed') completedCount++;
                else if (status === 'ongoing' || status === 'active') activeCount++;
                else upcomingCount++;
            });

            // Create campaign activity chart
            if (document.getElementById('campaignActivityChart')) {
                new Chart(document.getElementById('campaignActivityChart'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Active', 'Completed', 'Upcoming'],
                        datasets: [{
                            data: [activeCount, completedCount, upcomingCount],
                            backgroundColor: ['#007bff', '#28a745', '#ffc107'],
                            borderColor: '#fff',
                            borderWidth: 2
                        }]
                    },
                    options: { 
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: { 
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }

            // Build activity log
            const activities = [];
            
            clockRecordsSnap.forEach(doc => {
                const record = doc.data();
                if (record.timestamp) {
                    activities.push({
                        time: new Date(record.timestamp),
                        msg: `${record.staff_name || 'Staff'} ${record.type === 'in' ? 'clocked in' : 'clocked out'}`,
                        icon: 'fa-clock'
                    });
                }
            });

            campaignsSnap.forEach(doc => {
                const campaign = doc.data();
                if (campaign.createdAt) {
                    activities.push({
                        time: new Date(campaign.createdAt),
                        msg: `Campaign "${campaign.name}" created`,
                        icon: 'fa-calendar'
                    });
                }
            });

            // Sort and display activities
            activities.sort((a, b) => b.time - a.time);
            const activityHtml = activities.slice(0, 10).map(a => `
                <div class="activity-item">
                    <div class="activity-icon"><i class="fa-solid ${a.icon}"></i></div>
                    <div class="activity-content">
                        <p>${a.msg}</p>
                        <span class="activity-time">${a.time.toLocaleString()}</span>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('activityLog').innerHTML = activityHtml || '<p class="loading-text">No activities</p>';

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            document.getElementById('activityLog').innerHTML = '<p class="loading-text">Error loading dashboard</p>';
        }
    }

    loadDashboardData();