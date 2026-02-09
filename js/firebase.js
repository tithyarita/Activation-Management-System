
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
  import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyC0qkGPAbbGQuaFCeGl1QzmqfSo8u1RceE",
    authDomain: "activation-management-system.firebaseapp.com",
    projectId: "activation-management-system",
    storageBucket: "activation-management-system.firebasestorage.app",
    messagingSenderId: "200209966919",
    appId: "1:200209966919:web:58032b2b2cf950a6434e62",
    measurementId: "G-34WJPLB817"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = getFirestore(app);

  // Export Firestore functions for use in other files
  export { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where };