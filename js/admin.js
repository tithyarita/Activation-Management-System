import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "../js/firebase.js";

// Modal Control
window.openModal = function() {
    const modal = document.getElementById("campaignModal");
    if (modal) {
        modal.style.display = "flex";
        // Clear form
        document.getElementById('campaignForm').reset();
    }
};

window.closeModal = function() {
    const modal = document.getElementById("campaignModal");
    if (modal) {
        modal.style.display = "none";
    }
};

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById("campaignModal");
    if (e.target === modal) {
        closeModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
	// Load header
	const placeholder = document.getElementById('header-placeholder');
	if (placeholder) {
		fetch('component/header.html')
			.then(resp => {
				if (!resp.ok) throw new Error('Failed to fetch header');
				return resp.text();
			})
			.then(html => {
				const parser = new DOMParser();
				const docParsed = parser.parseFromString(html, 'text/html');
				const headNodes = docParsed.head ? Array.from(docParsed.head.querySelectorAll('link, style')) : [];
				headNodes.forEach(node => {
					if (node.tagName.toLowerCase() === 'link') {
						const href = node.getAttribute('href');
						if (!document.head.querySelector(`link[href="${href}"]`)) document.head.appendChild(node.cloneNode(true));
					} else {
						document.head.appendChild(node.cloneNode(true));
					}
				});
				const content = docParsed.body ? docParsed.body.innerHTML : html;
				placeholder.innerHTML = content;
			})
			.catch(err => console.error('Error loading header:', err));
	}

	// Load campaigns and users from Firestore
	// Load users first (so leader lists are available), then campaigns
	loadUsers().then(() => loadCampaigns());

	// Event listeners for form submission
	const campaignForm = document.getElementById('campaignForm');
	if (campaignForm) {
		campaignForm.addEventListener('submit', (e) => {
			e.preventDefault();
			addCampaign();
		});
	}
});
window.openUserModal = function() {
    document.getElementById("userModal").style.display = "flex";
    document.getElementById("userForm").reset();
};

window.closeUserModal = function() {
    document.getElementById("userModal").style.display = "none";
};
// Add user to Firestore
async function addUser(name, email, role){
    try{
        await addDoc(collection(db, 'users'), {
            name,
            email,
            role,
            createdAt: new Date().toISOString()
        });

        closeUserModal();
        loadUsers();
        alert("User added successfully!");

    }catch(err){
        console.error(err);
        alert("Error adding user");
    }
}
const userForm = document.getElementById('userForm');

if(userForm){
    userForm.addEventListener('submit', (e)=>{
        e.preventDefault();

        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const role = document.getElementById('userRole').value;

        if(!name || !email){
            alert("Fill all fields");
            return;
        }

        addUser(name,email,role);
    });
}

// Helper: keep leaders list cached
window.leaders = [];


// Load campaigns from Firestore
async function loadCampaigns() {
	try {
		const campaignsList = document.getElementById('campaignsList');
		if (!campaignsList) {
			console.warn('campaignsList element not found');
			return;
		}

		console.log('Loading campaigns from Firestore...');
		const querySnapshot = await getDocs(collection(db, 'campaigns'));
		console.log('Campaigns loaded:', querySnapshot.size);
		
		campaignsList.innerHTML = '';

		if (querySnapshot.empty) {
			campaignsList.innerHTML = '<p class="loading-text">No campaigns found. Click "Add Campaign" to get started!</p>';
			return;
		}

		querySnapshot.forEach((docSnap) => {
			const campaign = docSnap.data();
			const campaignEl = document.createElement('div');
			campaignEl.className = 'campaign-card';
			campaignEl.innerHTML = `
				<div class="campaign-card-header">
					<h4>${campaign.name}</h4>
					<button class="btn-remove" onclick="removeCampaign('${docSnap.id}')" title="Delete campaign">
						<i class="fa-solid fa-trash"></i>
					</button>
				</div>
				<div class="campaign-card-body">
					<div class="campaign-detail">
						<span class="detail-label"><i class="fa-solid fa-calendar"></i> Date:</span>
						<span class="detail-value">${campaign.date || 'N/A'}</span>
					</div>
					<div class="campaign-detail">
						<span class="detail-label"><i class="fa-solid fa-clock"></i> Start Time:</span>
						<span class="detail-value">${campaign.startTime || 'N/A'}</span>
					</div>
                    <div class="campaign-detail">
                        <span class="detail-label"><i class="fa-solid fa-clock"></i> End Time:</span>
                        <span class="detail-value">${campaign.endTime || 'N/A'}</span>
                    </div>
					<div class="campaign-detail">
						<span class="detail-label"><i class="fa-solid fa-map-pin"></i> Location:</span>
						<span class="detail-value">${campaign.location || 'N/A'}</span>
					</div>
				</div>
			`;
			campaignsList.appendChild(campaignEl);
		});
	} catch (err) {
		console.error('Error loading campaigns:', err);
		document.getElementById('campaignsList').innerHTML = '<p class="loading-text" style="color:red">Error: ' + err.message + '</p>';
	}
}

window.loadCampaigns = loadCampaigns;

// Add campaign to Firestore
window.addCampaign = async function() {
	const nameInput = document.getElementById('campaignName');
	const dateInput = document.getElementById('campaignDate');
	const startTimeInput = document.getElementById('campaignStartTime');
	const endTimeInput = document.getElementById('campaignEndTime');
	const locationInput = document.getElementById('campaignLocation');

	if (!nameInput || !dateInput || !startTimeInput || !endTimeInput || !locationInput) {
		console.error('Form elements not found');
		return;
	}

	const name = nameInput.value.trim();
	const date = dateInput.value;
	const startTime = startTimeInput.value;
	const endTime = endTimeInput.value;
	const location = locationInput.value.trim();

	if (!name || !date || !startTime || !endTime || !location) {
		alert('Please fill in all required fields');
		return;
	}

	try {
		console.log('Adding campaign:', { name, date, startTime, endTime, location });
		const docRef = await addDoc(collection(db, 'campaigns'), {
			name,
			date,
			startTime,
			endTime,
			location,
			createdAt: new Date().toISOString(),
		});
		console.log('Campaign added with ID:', docRef.id);
		
		nameInput.value = '';
		dateInput.value = '';
		startTimeInput.value = '';
		endTimeInput.value = '';
		locationInput.value = '';
		
		closeModal();
		loadCampaigns();
		alert('Campaign added successfully!');
	} catch (err) {
		console.error('Error adding campaign:', err);
		alert('Error adding campaign: ' + err.message);
	}
};
async function loadReports(){

    const list = document.getElementById("reportsList");

    try{

        const snap = await getDocs(collection(db,"attendance"));

        let total = 0;
        let inCount = 0;
        let outCount = 0;

        list.innerHTML = "";

        snap.forEach(docSnap=>{
            const data = docSnap.data();

            total++;

            if(data.clockIn) inCount++;
            if(data.clockOut) outCount++;

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${data.userName || "-"}</td>
                <td>${data.campaign || "-"}</td>
                <td>${data.clockIn || "-"}</td>
                <td>${data.clockOut || "-"}</td>
                <td>${data.location || "-"}</td>
                <td>
                    ${data.photoURL ? 
                        `<img src="${data.photoURL}" width="50">` 
                        : "No Photo"}
                </td>
            `;

            list.appendChild(row);
        });

        // Analytics
        document.getElementById("totalRecords").textContent = total;
        document.getElementById("totalIn").textContent = inCount;
        document.getElementById("totalOut").textContent = outCount;

        const rate = total ? Math.round((inCount/total)*100) : 0;
        document.getElementById("attendanceRate").textContent = rate+"%";

    }catch(err){
        console.error(err);
        list.innerHTML = "<tr><td colspan='6'>Error loading reports</td></tr>";
    }
}

window.loadReports = loadReports;



// Remove campaign from Firestore
window.removeCampaign = async function(docId) {
	if (!confirm('Are you sure you want to delete this campaign?')) return;

	try {
		console.log('Removing campaign:', docId);
		await deleteDoc(doc(db, 'campaigns', docId));
		console.log('Campaign removed');
		loadCampaigns();
		alert('Campaign removed successfully!');
	} catch (err) {
		console.error('Error removing campaign:', err);
		alert('Error removing campaign: ' + err.message);
	}
};

// Load users from Firestore
async function loadUsers() {
	try {
		const usersList = document.getElementById('usersList');
		if (!usersList) {
			console.warn('usersList element not found');
			return;
		}

		console.log('Loading users from Firestore...');
		const querySnapshot = await getDocs(collection(db, 'users'));
		console.log('Users loaded:', querySnapshot.size);
		usersList.innerHTML = '';

		if (querySnapshot.empty) {
			usersList.innerHTML = '<p class="loading-text">No users found</p>';
			return;
		}

		querySnapshot.forEach((docSnap) => {
			const user = docSnap.data();
			// cache leaders
			if (user.role && user.role.toLowerCase() === 'leader') {
				window.leaders.push({ id: docSnap.id, ...user });
			}
			const userEl = document.createElement('div');
			userEl.className = 'user-card';
			userEl.innerHTML = `
				<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
					<div>
						<strong>${user.name || 'Unknown'}</strong>
						<div style="font-size:13px;color:var(--text-muted);">${user.email || 'N/A'}</div>
						<div style="font-size:13px;color:var(--text-muted);">Role: ${user.role || 'N/A'}</div>
					</div>
					<div>
						<button class="btn-remove" onclick="removeUser('${docSnap.id}')" title="Delete user"><i class="fa-solid fa-trash"></i></button>
					</div>
				</div>
			`;
			usersList.appendChild(userEl);
		});

		// Populate report campaign dropdown and leader lists
		populateReportCampaigns();
	} catch (err) {
		console.error('Error loading users:', err);
		document.getElementById('usersList').innerHTML = '<p style="color:red">Error: ' + err.message + '</p>';
	}
}

function populateReportCampaigns(){
	const select = document.getElementById('reportCampaign');
	if (!select) return;
	// clear existing campaign options (keep first)
	select.querySelectorAll('option[value]').forEach(o=>{ if(o.value) o.remove(); });
	// load campaigns for dropdown
	getDocs(collection(db, 'campaigns')).then(snapshot=>{
		snapshot.forEach(snap=>{
			const c = snap.data();
			const opt = document.createElement('option');
			opt.value = snap.id;
			opt.textContent = c.name || snap.id;
			select.appendChild(opt);
		});
	}).catch(err=>console.error('Error loading campaigns for report dropdown', err));
}

// Assign leader to campaign
window.assignLeader = async function(campaignId, leaderId){
	try{
		const leader = window.leaders.find(l=>l.id===leaderId);
		const updates = { leaderId };
		if (leader) updates.leaderName = leader.name;
		await updateDoc(doc(db, 'campaigns', campaignId), updates);
		alert('Leader assigned');
		loadCampaigns();
	}catch(err){
		console.error('Error assigning leader', err);
		alert('Error assigning leader: '+err.message);
	}
}

// Report generation
window.reportDataCache = null;
window.generateReport = async function(){
	const start = document.getElementById('reportStart').value;
	const end = document.getElementById('reportEnd').value;
	const campaignId = document.getElementById('reportCampaign').value;
	const resultsEl = document.getElementById('reportResults');
	resultsEl.innerHTML = '<p class="loading-text">Generating report...</p>';

	try{
		// Basic query over attendance collection
		let qSnapshot = await getDocs(collection(db, 'attendance'));
		const rows = [];
		qSnapshot.forEach(snap=>{
			const r = snap.data();
			r._id = snap.id;
			rows.push(r);
		});

		// Filter by dates and campaign if provided
		const filtered = rows.filter(r=>{
			if (campaignId && r.campaignId !== campaignId) return false;
			if (start && r.timestamp && new Date(r.timestamp) < new Date(start)) return false;
			if (end && r.timestamp && new Date(r.timestamp) > new Date(end+'T23:59:59')) return false;
			return true;
		});

		window.reportDataCache = filtered;

		// Compute analytics
		const total = filtered.length;
		const uniqueUsers = new Set(filtered.map(r=>r.userId)).size;
		// attendance rate relative to total users
		const usersSnapshot = await getDocs(collection(db, 'users'));
		const totalUsers = usersSnapshot.size;
		const attendanceRate = totalUsers ? Math.round((uniqueUsers/totalUsers)*100) : 0;

		// Render summary + table
		let html = `<div class="card"><strong>Total records:</strong> ${total} &nbsp; <strong>Unique users:</strong> ${uniqueUsers} &nbsp; <strong>Attendance rate:</strong> ${attendanceRate}%</div>`;
		html += '<table style="width:100%;margin-top:12px;border-collapse:collapse"><thead><tr><th>User</th><th>Campaign</th><th>Type</th><th>Time</th><th>Photo</th><th>Location</th></tr></thead><tbody>';
		for(const r of filtered){
			html += `<tr style="border-bottom:1px solid #eee"><td>${r.userName||r.userId||''}</td><td>${r.campaignName||''}</td><td>${r.type||''}</td><td>${r.timestamp||''}</td><td>${r.photoUrl?`<a href=\"${r.photoUrl}\" target=\"_blank\">View</a>`:''}</td><td>${r.location||''}</td></tr>`;
		}
		html += '</tbody></table>';
		resultsEl.innerHTML = html;
	}catch(err){
		console.error('Error generating report', err);
		resultsEl.innerHTML = '<p style="color:red">Error: '+err.message+'</p>';
	}
}

window.downloadReportCSV = function(){
	const data = window.reportDataCache || [];
	if (!data.length) { alert('No report data to download'); return; }
	const headers = ['userId','userName','campaignId','campaignName','type','timestamp','photoUrl','location'];
	const rows = data.map(r=>headers.map(h=>`"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(','));
	const csv = [headers.join(','), ...rows].join('\n');
	const blob = new Blob([csv], {type: 'text/csv'});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url; a.download = 'report.csv'; a.click();
	URL.revokeObjectURL(url);
}

// Report modal controls
window.openReportModal = function(){ document.getElementById('reportModal').style.display='flex'; };
window.closeReportModal = function(){ document.getElementById('reportModal').style.display='none'; };

// Remove user from Firestore
window.removeUser = async function(userId) {
	if (!confirm('Are you sure you want to delete this user?')) return;
	try {
		console.log('Removing user:', userId);
		await deleteDoc(doc(db, 'users', userId));
		console.log('User removed');
		loadUsers();
		alert('User removed successfully');
	} catch (err) {
		console.error('Error removing user:', err);
		alert('Error removing user: ' + err.message);
	}
};
