// Firebase config provided by user
const firebaseConfig = {
  apiKey: "AIzaSyC100EQLiUIWYnfS5z44-o6DBXg__u-MC0",
  authDomain: "ps-tasks.firebaseapp.com",
  projectId: "ps-tasks",
  storageBucket: "ps-tasks.firebasestorage.app",
  messagingSenderId: "534102113394",
  appId: "1:534102113394:web:1836b35ece7e5a2a63d6eb"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
} else {
  console.error('Firebase SDK not loaded!');
}
