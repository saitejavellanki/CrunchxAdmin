// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// Add other Firebase products as needed

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDzk7SvyBr6AI9CiH8WVWFrKm9f77OdRl0",
    authDomain: "fitfuel-5abf9.firebaseapp.com",
    projectId: "fitfuel-5abf9",
    storageBucket: "fitfuel-5abf9.firebasestorage.app",
    messagingSenderId: "7920256560",
    appId: "1:7920256560:web:16fb296a586c0a27b1cff5"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };