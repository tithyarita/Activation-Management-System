import { db, collection, getDocs, query, where } from "../js/firebase.js";


// Hash helper
async function hashPassword(password) {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


// Login handler
async function handleLogin(event) {

    event.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    try {

        const enteredHash = await hashPassword(password);

        // 🔥 Query ONLY matching email
        const q = query(
            collection(db, "users"),
            where("email", "==", email)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            alert("Invalid email or password");
            return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        const passwordMatches =
            (userData.passwordHash === enteredHash) ||
            (userData.password === password);

        if (!passwordMatches) {
            alert("Invalid email or password");
            return;
        }

        // ✅ Save session
        sessionStorage.setItem("user", JSON.stringify({
            id: userDoc.id,
            role: userData.role,
            name: userData.name
        }));

        // Redirect by role
        switch (userData.role) {
            case "staff":
                window.location.href = "ba.html";
                break;
            case "leader":
                window.location.href = "leader.html";
                break;
            case "admin":
                window.location.href = "admin.html";
                break;
            default:
                window.location.href = "ba.html";
        }

    } catch (error) {
        console.error(error);
        alert("Login error. Please try again.");
    }
}


// Attach event
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}
