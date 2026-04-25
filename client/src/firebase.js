import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAcPujEHy5FebMFsSP_qpqqgRvvqWqUSds",
  authDomain: "promptwarpune.firebaseapp.com",
  projectId: "promptwarpune",
  storageBucket: "promptwarpune.firebasestorage.app",
  messagingSenderId: "580654673728",
  appId: "1:580654673728:web:8c7add2dc6657ac34814a5",
  measurementId: "G-CKVJLTJ3DL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
