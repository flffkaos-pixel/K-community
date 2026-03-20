import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBmbviWejB6lDMxQC-yD_mkLxDaFjaOCk",
  authDomain: "k-community-845d3.firebaseapp.com",
  projectId: "k-community-845d3",
  storageBucket: "k-community-845d3.firebasestorage.app",
  messagingSenderId: "290156857078",
  appId: "1:290156857078:web:64f529dd23e3b1e1a34ed7",
  measurementId: "G-WPKPR1SM3E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { db, auth };
