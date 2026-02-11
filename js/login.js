import { db, collection, getDocs } from "../js/firebase.js";

// Hash helper using SubtleCrypto (SHA-256)
async function hashPassword(password) {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Function to handle login
async function handleLogin(event) {
    event.preventDefault(); // Prevent form submission

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }

    try {
        const enteredHash = await hashPassword(password);
        // Fetch users from Firestore
        const usersSnapshot = await getDocs(collection(db, "users"));
        let userFound = false;

        usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            // Support new hashed passwords (`passwordHash`) and fallback to legacy `password` if present
            const passwordMatches = (userData.passwordHash && userData.passwordHash === enteredHash) || (userData.password && userData.password === password);
            if (userData.email === email && passwordMatches) {
                userFound = true;
                const role = userData.role;
                // Redirect based on role
                if (role === 'staff') {
                    window.location.href = 'ba.html';
                } else if (role === 'leader') {
                    window.location.href = 'leader.html';
                } else if (role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    // fallback
                    window.location.href = 'ba.html';
                }
            }
        });

        if (!userFound) {
            alert("Invalid username or password");
        }
    } catch (error) {
        console.error("Error logging in: ", error);
        alert("An error occurred while logging in. Please try again.");
    }
}

// Add event listener to the login form
const loginForm = document.getElementById('loginForm');
if (loginForm) loginForm.addEventListener('submit', handleLogin);