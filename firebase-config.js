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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000"
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
