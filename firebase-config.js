/* ============================================================
   VEXIEN — Firebase Configuration
   ------------------------------------------------------------
   1. Create a project at https://console.firebase.google.com
   2. Add a Web App, copy its config into `firebaseConfig` below
   3. Enable Authentication → Sign-in method → Email/Password
   4. Create a Realtime Database and paste database.rules.json
      from this folder into the Rules tab.
   Until then, VEXIEN automatically runs in LOCAL DEMO MODE
   (fully functional, data stored in your browser).
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyA0Ybprbv8rrv54uph7cvV0Oj3nUNLXm6s",
  authDomain: "vexien-3fb32.firebaseapp.com",
  databaseURL: "https://vexien-3fb32-default-rtdb.firebaseio.com",
  projectId: "vexien-3fb32",
  storageBucket: "vexien-3fb32.firebasestorage.app",
  messagingSenderId: "135994303501",
  appId: "1:135994303501:web:106f5593826bc0d02a6144",
  measurementId: "G-4Y8K0NBTJH"
};

/* True only when a real config is present AND the Firebase SDK loaded */
const FIREBASE_ENABLED = (function(){
  try{
    const looksReal = firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== "YOUR_API_KEY" &&
      firebaseConfig.databaseURL &&
      firebaseConfig.databaseURL.indexOf("YOUR_PROJECT") === -1;
    return !!(looksReal && typeof firebase !== "undefined" && firebase.apps !== undefined);
  }catch(e){ return false; }
})();

let firebaseApp = null, firebaseAuth = null, firebaseDb = null;
if (FIREBASE_ENABLED) {
  try{
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.database();
  }catch(e){
    console.error("Firebase init failed, falling back to demo mode:", e);
  }
}
const FIREBASE_OK = !!(firebaseApp && firebaseAuth && firebaseDb);
