import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBiEQsW2ClPd6dbpmy0EQCNr6JArQnSDYc",
    authDomain: "nwtnmusical-5af09.firebaseapp.com",
    projectId: "nwtnmusical-5af09",
    storageBucket: "nwtnmusical-5af09.firebasestorage.app",
    messagingSenderId: "828049148732",
    appId: "1:828049148732:web:10a4122df30d8422506c39",
    measurementId: "G-K78TCR2ENH"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, getDoc, ref, uploadBytes, getDownloadURL, deleteObject, signInWithEmailAndPassword, signOut };
