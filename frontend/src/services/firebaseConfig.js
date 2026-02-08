// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Added Firestore

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBRBozuU-UB-lXaMA1jsl07-f5Z2IQFWyo",
    authDomain: "wisefinan-af83a.firebaseapp.com",
    projectId: "wisefinan-af83a",
    storageBucket: "wisefinan-af83a.firebasestorage.app",
    messagingSenderId: "387970213697",
    appId: "1:387970213697:web:7ca4927f9b753d4ced63c0",
    measurementId: "G-9F7ME12PH0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

export { app, analytics, auth, db };
