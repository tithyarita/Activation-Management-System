// ===============================
// Firebase Initialization (v12 modular)
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

// -------------------------------
// Firebase Configuration
// -------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyC0qkGPAbbGQuaFCeGl1QzmqfSo8u1RceE",
  authDomain: "activation-management-system.firebaseapp.com",
  projectId: "activation-management-system",
  storageBucket: "activation-management-system.appspot.com",
  messagingSenderId: "200209966919",
  appId: "1:200209966919:web:58032b2b2cf950a6434e62",
  measurementId: "G-34WJPLB817"
};

// -------------------------------
// Initialize Firebase & Firestore
// -------------------------------
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

// -------------------------------
// Export for ES Modules
// -------------------------------
export { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, storage, storageRef, uploadString, getDownloadURL };

// -------------------------------
// Attach to window for global use
// -------------------------------
window.firebaseApp = app;
window.analytics = analytics;
window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.deleteDoc = deleteDoc;
window.doc = doc;
window.updateDoc = updateDoc;
window.query = query;
window.where = where;
window.storage = storage;
window.storageRef = storageRef;
window.uploadString = uploadString;
window.getDownloadURL = getDownloadURL;