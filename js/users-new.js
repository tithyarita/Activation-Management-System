import {
    db,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc
} from "../js/firebase.js";
import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";

let users = [];
let editingUserId = null;

/* =============================
   INIT
============================= */
document.addEventListener("DOMContentLoaded", init);

async function init(){
    bindFilters();
    await loadUsers();
}

/* =============================
   LOAD USERS
============================= */
async function loadUsers(){

    const snap = await getDocs(collection(db,"users"));
    users = [];

    snap.forEach(d=>{
        users.push({ id:d.id, ...d.data() });
    });

    updateStats();
    renderUsers(users);
}

/* =============================
   STATS
============================= */
function updateStats(){

    const total = users.length;
    const ba = users.filter(u=>u.role==="ba" || u.role==="staff").length;
    const leaders = users.filter(u=>u.role==="leader").length;
    const admins = users.filter(u=>u.role==="admin").length;

    setText("statTotalUsers", total);
    setText("statStaffMembers", ba);
    setText("statLeaders", leaders);
    setText("statAdmins", admins);
}

function setText(id,val){
    const el=document.getElementById(id);
    if(el) el.textContent=val;
}

/* =============================
   RENDER USERS
============================= */
function renderUsers(list){

    const container = document.getElementById("usersList");

    if(!list.length){
        container.innerHTML="No users found";
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th style="width:160px">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(u=>`
                    <tr>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                        <td>${formatRole(u.role)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary"
                                onclick="openEditRole('${u.id}')">
                                Role
                            </button>

                            <button class="btn btn-sm btn-danger"
                                onclick="deleteUser('${u.id}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function formatRole(r){
    if(r==="ba" || r==="staff") return "Brand Ambassador";
    if(r==="leader") return "Leader";
    if(r==="admin") return "Admin";
    return r;
}

/* =============================
   FILTERS
============================= */
function bindFilters(){

    document.getElementById("searchUser")
        .addEventListener("input", applyFilters);

    document.getElementById("filterRole")
        .addEventListener("change", applyFilters);
}

function applyFilters(){

    const text = document.getElementById("searchUser").value.toLowerCase();
    const role = document.getElementById("filterRole").value;

    let filtered = users.filter(u=>{
        const matchText =
            u.name?.toLowerCase().includes(text) ||
            u.email?.toLowerCase().includes(text);

        // treat legacy "staff" as equivalent to "ba"
        const matchRole = !role || u.role===role || (role==="ba" && u.role==="staff");

        return matchText && matchRole;
    });

    renderUsers(filtered);
}

/* =============================
   ADD USER
============================= */
window.openUserModal = ()=>{
    document.getElementById("userModal").style.display="flex";
};

window.closeUserModal = ()=>{
    document.getElementById("userModal").style.display="none";
};

document.getElementById("userForm")
.addEventListener("submit", async e=>{
    e.preventDefault();

    const name = userName.value.trim();
    const email = userEmail.value.trim();
    const pass = userPassword.value;
    const confirm = userConfirmPassword.value;
    const role = userRole.value;

    if(pass !== confirm){
        alert("Passwords do not match");
        return;
    }
     // 🔐 Hash the password
        const salt = bcrypt.genSaltSync(10);
        const hashedPass = bcrypt.hashSync(pass, salt);

    const docRef = await addDoc(collection(db,"users"),{
        name,
        email,
        password: hashedPass,   // hashed password
        role,
        createdAt: new Date()
    });
    
    // Save the document ID to Firestore
    await updateDoc(doc(db, "users", docRef.id), {
        id: docRef.id
    });
    
    closeUserModal();
    e.target.reset();
    loadUsers();
});

/* =============================
   DELETE USER
============================= */
window.deleteUser = async id=>{

    if(!confirm("Delete this user?")) return;

    await deleteDoc(doc(db,"users",id));
    loadUsers();
};

/* =============================
   EDIT ROLE
============================= */
window.openEditRole = id=>{

    const user = users.find(u=>u.id===id);
    if(!user) return;

    editingUserId = id;

    document.getElementById("editRoleUserName").textContent = user.name;
    // normalize legacy "staff" -> "ba" so select shows Brand Ambassador
    document.getElementById("editRoleSelect").value = (user.role === 'staff') ? 'ba' : user.role;
    document.getElementById("editRoleModal").style.display="flex";
};

window.closeEditRoleModal = ()=>{
    document.getElementById("editRoleModal").style.display="none";
};

window.confirmRoleChange = async ()=>{

    const role = document.getElementById("editRoleSelect").value;

    await updateDoc(
        doc(db,"users",editingUserId),
        { role }
    );

    closeEditRoleModal();
    loadUsers();
};

/* =============================
   LOGOUT
============================= */
window.handleLogout = ()=>{
    if(confirm("Logout?")){
        sessionStorage.clear();
        location.href="login.html";
    }
};
