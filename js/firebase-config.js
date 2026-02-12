// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    onValue, 
    off,
    push,
    update,
    remove,
    onDisconnect 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase configuration - Using a demo project config
// In production, replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyABei0Z3yZ3xV741mW3ekV2ibFEf9QlCjc",
    authDomain: "bubble-town-25f24.firebaseapp.com",
    databaseURL: "https://bubble-town-25f24-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "bubble-town-25f24",
    storageBucket: "bubble-town-25f24.firebasestorage.app",
    messagingSenderId: "885824915709",
    appId: "1:885824915709:web:fd25195326cfd31577d694"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Export everything
export { 
    app, 
    auth, 
    database, 
    googleProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile,
    ref,
    set,
    get,
    onValue,
    off,
    push,
    update,
    remove,
    onDisconnect
};