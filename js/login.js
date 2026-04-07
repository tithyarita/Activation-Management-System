// ===============================
// Firebase Setup
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ===============================
// Config
// ===============================
const firebaseConfig = {
    apiKey: "AIzaSyC0qkGPAbbGQuaFCeGl1QzmqfSo8u1RceE",
    authDomain: "activation-management-system.firebaseapp.com",
    projectId: "activation-management-system",
};

// ===============================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===============================
// LOGIN
// ===============================
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // 🚫 stop refresh

        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            alert("Please enter email and password");
            return;
        }

        try {
            // 🔍 find user
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

            if (!userData.passwordHash) {
                alert("No password hash found for this user");
                return;
            }


            // 🔐 hash entered password with SHA-256
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const enteredHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (enteredHash !== userData.passwordHash) {
                alert("Invalid email or password");
                return;
            }

            // ✅ LOGIN SUCCESS
            alert("Login successful!");

            // save session
            const sessionUser = {
                id: userDoc.id,
                name: userData.name,
                role: userData.role
            };

            sessionStorage.setItem("user", JSON.stringify(sessionUser));
            localStorage.setItem("userRole", userData.role);

            // 🔁 redirect
            if (userData.role === "admin") {
                window.location.href = "/html/admin/admin-dashboard.html";
            } else if (userData.role === "leader") {
                window.location.href = "/html/leader.html";
            } else if (["ba", "brand_ambassador", "staff"].includes((userData.role || "").toLowerCase())) {
                window.location.href = "/html/ba-clockin.html";
            } else {
                window.location.href = "/html/ba-clockin.html";
            }

        } catch (error) {
            console.error("Login error:", error);
            alert("Something went wrong");
        }
    });

});