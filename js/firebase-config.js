// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjHL2xudGeGnz5QnPFpwlgZA9Aom7CIs8",
    authDomain: "ninhtax-6d87e.firebaseapp.com",
    databaseURL: "https://ninhtax-6d87e-default-rtdb.firebaseio.com",
    projectId: "ninhtax-6d87e",
    storageBucket: "ninhtax-6d87e.firebasestorage.app",
    messagingSenderId: "262312945285",
    appId: "1:262312945285:web:09e73f91c483201fb36bec",
    measurementId: "G-7MZ7RP3499"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Lấy các service
const auth = firebase.auth();
const db = firebase.database();

// Export ra window object
window.firebaseAuth = auth;
window.firebaseDb = db;

// Các hàm Firebase
window.firebaseSignInWithEmailAndPassword = (email, password) => {
    return auth.signInWithEmailAndPassword(email, password);
};

window.firebaseCreateUserWithEmailAndPassword = (email, password) => {
    return auth.createUserWithEmailAndPassword(email, password);
};

window.firebaseSignOut = () => {
    return auth.signOut();
};

window.firebaseOnAuthStateChanged = (callback) => {
    return auth.onAuthStateChanged(callback);
};

// Database helpers
window.firebaseRef = (db, path) => {
    return db.ref(path);
};

window.firebaseSet = (ref, value) => {
    return ref.set(value);
};

window.firebasePush = (ref, value) => {
    return ref.push(value);
};

window.firebaseUpdate = (ref, value) => {
    return ref.update(value);
};

window.firebaseRemove = (ref) => {
    return ref.remove();
};

window.firebaseGet = async (ref) => {
    const snapshot = await ref.once('value');
    return snapshot;
};

console.log('Firebase initialized!');