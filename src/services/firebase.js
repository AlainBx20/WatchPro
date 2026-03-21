import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwba0_huFegL2JfiovazvSXo3PDa-vMXE",
  authDomain: "watchpro-3f7d4.firebaseapp.com",
  databaseURL: "https://watchpro-3f7d4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "watchpro-3f7d4",
  storageBucket: "watchpro-3f7d4.firebasestorage.app",
  messagingSenderId: "214284255579",
  appId: "1:214284255579:web:8af80be565c9f374129a7e",
  measurementId: "G-7Z3SZTZ8G7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize core Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);

export default app;
