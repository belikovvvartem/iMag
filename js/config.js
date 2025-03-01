import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBKARuWT--Pv4I-yp6lle9MYUFXmMic5Ko",
    authDomain: "my-shop-trritonix.firebaseapp.com",
    projectId: "my-shop-trritonix",
    storageBucket: "my-shop-trritonix.firebasestorage.app",
    messagingSenderId: "444271119831",
    appId: "1:444271119831:web:8b487a6bb336149cfbcf92",
    measurementId: "G-ES1PJRD2MZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };