const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBU3FwiXE-V0yiVo3IA4VnkA8SpSeipxc",
  authDomain: "contact-list-manager-cfd87.firebaseapp.com",
  projectId: "contact-list-manager-cfd87",
  storageBucket: "contact-list-manager-cfd87.firebasestorage.app",
  messagingSenderId: "800219968564",
  appId: "1:800219968564:web:fac539f40eb377deb54661",
  measurementId: "G-BQZZKLQ165"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = db; 