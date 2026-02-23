 import { db, collection, getDocs } from "./firebase.js";

    async function loadLeaders() {
        try {
            // Load all required collections
            const usersSnap = await getDocs(collection(db, 'users'));
            const clockRecordsSnap = await getDocs(collection(db, 'clock_records'));
            const campaignsSnap = await getDocs(collection(db, 'campaigns'));
            const staffSnap = await getDocs(collection(db, 'staff'));

            // Filter leaders
            const leaders = [];
            usersSnap.forEach(doc => {
                const user = doc.data();
                if (user.role === 'leader') {
                    leaders.push({ id: doc.id, ...user });
                }
            });

            // Calculate stats for each leader
            leaders.forEach(leader => {
                let campaigns = 0;
                let staffManaged = new Set();
                let checkIns = 0;
                let checkedInToday = 0;

                // Count campaigns assigned to this leader
                campaignsSnap.forEach(doc => {
                    const campaign = doc.data();
                    if (campaign.assigned_leaders && campaign.assigned_leaders.includes(leader.id)) {
                        campaigns++;
                        
                        // Count staff assigned to these campaigns
                        staffSnap.forEach(staffDoc => {
                            const staff = staffDoc.data();
                            if (staff.assigned_campaigns && staff.assigned_campaigns.includes(campaign.id)) {
                                staffManaged.add(staffDoc.id);
                            }
                        });
                    }
                });

                // Count check-ins for this leader's staff
                const today = new Date().toISOString().split('T')[0];
                clockRecordsSnap.forEach(doc => {
                    const record = doc.data();
                    if (staffManaged.has(record.staff_id)) {
                        if (record.type === 'in') {
                            checkIns++;
                            if (record.timestamp && record.timestamp.split('T')[0] === today) {
                                checkedInToday++;
                            }
                        }
                    }
                });

                leader.campaigns = campaigns;
                leader.staff = staffManaged.size;
                leader.checkIns = checkIns;
                leader.checkedInToday = checkedInToday;
                leader.rate = staffManaged.size > 0 ? Math.round((checkedInToday / staffManaged.size) * 100) : 0;
            });

            // Sort by attendance rate
            leaders.sort((a, b) => b.rate - a.rate);

            // Display performance cards (top 3)
            const perfDiv = document.getElementById('leaderPerformance');
            if (leaders.length > 0) {
                perfDiv.innerHTML = leaders.slice(0, 3).map((l, i) => `
                    <div class="performance-card">
                        <div class="rank-badge">#${i + 1}</div>
                        <h4>${l.name}</h4>
                        <p>${l.email}</p>
                        <div class="stat-row">
                            <span>Campaigns: ${l.campaigns}</span>
                            <span>Staff: ${l.staff}</span>
                            <span>Check-ins: ${l.checkIns}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                perfDiv.innerHTML = '<p class="loading-text">No leaders found</p>';
            }

            // Display ranking table
            const rankTable = document.getElementById('leaderRankingTable');
            if (leaders.length > 0) {
                rankTable.innerHTML = leaders.map((l, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${l.name}</td>
                        <td>${l.email}</td>
                        <td>${l.campaigns}</td>
                        <td>${l.staff}</td>
                        <td>${l.rate}%</td>
                        <td>${l.checkIns}</td>
                    </tr>
                `).join('');
            } else {
                rankTable.innerHTML = '<tr><td colspan="7" class="loading-text">No leaders found</td></tr>';
            }

            // Build activity timeline
            const activities = [];
            clockRecordsSnap.forEach(doc => {
                const record = doc.data();
                // Only show activities for staff managed by leaders
                let isManaged = false;
                leaders.forEach(leader => {
                    campaignsSnap.forEach(campaign => {
                        if (campaign.assigned_leaders && campaign.assigned_leaders.includes(leader.id)) {
                            staffSnap.forEach(staff => {
                                if (staff.assigned_campaigns && staff.assigned_campaigns.includes(campaign.id) && staff.id === record.staff_id) {
                                    isManaged = true;
                                }
                            });
                        }
                    });
                });
                
                if (isManaged && record.timestamp) {
                    activities.push({
                        time: new Date(record.timestamp),
                        msg: `${record.staff_name || 'Staff'} ${record.type === 'in' ? 'clocked in' : 'clocked out'}`,
                        staffName: record.staff_name
                    });
                }
            });

            // Sort and display recent activities
            activities.sort((a, b) => b.time - a.time);
            const timelineDiv = document.getElementById('leaderActivityTimeline');
            if (activities.length > 0) {
                timelineDiv.innerHTML = activities.slice(0, 15).map(a => `
                    <div class="timeline-item">
                        <div class="timeline-time">${a.time.toLocaleString()}</div>
                        <div class="timeline-content">
                            <p>${a.msg}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                timelineDiv.innerHTML = '<p class="loading-text">No recent activity</p>';
            }

        } catch (err) {
            console.error('Error loading leaders:', err);
            document.getElementById('leaderPerformance').innerHTML = '<p class="loading-text">Error loading data</p>';
            document.getElementById('leaderRankingTable').innerHTML = '<tr><td colspan="7" class="loading-text">Error loading data</td></tr>';
        }
    }

    loadLeaders();