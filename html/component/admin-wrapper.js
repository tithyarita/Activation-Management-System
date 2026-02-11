fetch("../admin/admin-wrapper.html")
  .then(res => res.text())
  .then(data => {

    document.getElementById("wrapper-placeholder").innerHTML = data;

    // Inject USERS PAGE content into layout
    document.getElementById("page-content").innerHTML = `
    
        <!-- User Statistics -->
        <section class="stats-section">
            <h3>User Statistics</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Total Users</h4>
                    <p id="statTotalUsers" class="stat-number">0</p>
                </div>

                <div class="stat-card">
                    <h4>Staff Members</h4>
                    <p id="statStaffMembers" class="stat-number">0</p>
                </div>

                <div class="stat-card">
                    <h4>Leaders</h4>
                    <p id="statLeaders" class="stat-number">0</p>
                </div>

                <div class="stat-card">
                    <h4>Admins</h4>
                    <p id="statAdmins" class="stat-number">0</p>
                </div>
            </div>
        </section>

        <!-- Top Row -->
        <section class="top-row">
            <div class="page-title">User Management</div>
            <button class="btn btn-primary" onclick="openUserModal()">
                Add User
            </button>
        </section>

        <!-- Filters -->
        <section class="filters-section">
            <input type="text" placeholder="Search user..." class="filter-input">
            <select class="filter-input">
                <option>All Roles</option>
                <option>Brand Ambassador</option>
                <option>Leader</option>
                <option>Admin</option>
            </select>
        </section>

        <!-- User List -->
        <section class="users-section">
            <div id="usersList" class="users-grid">
                Loading users...
            </div>
        </section>

    `;
});