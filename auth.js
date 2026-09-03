/* ============================================================
   VEXIEN — Authentication (auth.js)
   Works with Firebase Auth when configured, otherwise Local
   Demo Mode (accounts stored in your browser only).
   ============================================================ */

const Auth = {
  uid: null,
  profile: null,
  _ob: { step:1, gender:null, goal:null },

  /* ---------- bootstrap ---------- */
  initUI(){
    // backend status chip
    const bs = document.getElementById("backend-status");
    if (FIREBASE_OK){
      bs.textContent = "☁️ Connected to Firebase (live sync)";
      bs.style.background = "#DDF3DF"; bs.style.color = "#2c6e38";
    } else {
      bs.textContent = "💾 Local Demo Mode — add your Firebase keys in firebase-config.js for cloud sync";
    }

    // tabs
    document.getElementById("tab-login").onclick   = () => this.showTab("login");
    document.getElementById("tab-signup").onclick  = () => this.showTab("signup");
    document.getElementById("tab-forgot").onclick  = () => this.showTab("forgot");

    document.getElementById("login-form").onsubmit = e => { e.preventDefault(); this.login(); };
    document.getElementById("signup-form").onsubmit = e => { e.preventDefault(); this.signUp(); };
    document.getElementById("forgot-form").onsubmit = e => { e.preventDefault(); this.forgotPassword(); };

    // demo hint
    const hint = document.getElementById("demo-hint");
    if (Store.mode === "demo"){
      hint.innerHTML = 'Demo account: <b>demo@vexien.app</b> / <b>demo123</b><br><button type="button" id="demo-fill">✨ Try the demo account</button>';
      document.getElementById("demo-fill").onclick = () => {
        document.getElementById("login-email").value = "demo@vexien.app";
        document.getElementById("login-password").value = "demo123";
      };
      Auth._demoReady = this.ensureDemoAccount();
    } else {
      hint.textContent = "Signed in sessions persist via Firebase Auth.";
    }

    // onboarding nav
    document.getElementById("ob-next").onclick = () => this.obNext();
    document.getElementById("ob-back").onclick = () => this.obBack();
    document.querySelectorAll("#ob-gender .choice").forEach(b => b.onclick = () => {
      document.querySelectorAll("#ob-gender .choice").forEach(x=>x.classList.remove("sel"));
      b.classList.add("sel"); this._ob.gender = b.dataset.val; this.obPreview();
    });
    document.querySelectorAll("#ob-goal .choice").forEach(b => b.onclick = () => {
      document.querySelectorAll("#ob-goal .choice").forEach(x=>x.classList.remove("sel"));
      b.classList.add("sel"); this._ob.goal = b.dataset.val; this.obPreview();
    });
    ["ob-age","ob-height","ob-weight","ob-activity"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.oninput = () => this.obPreview();
    });
  },

  showTab(which){
    ["login","signup","forgot"].forEach(t => {
      document.getElementById("tab-"+t).classList.toggle("active", t===which);
      document.getElementById(t+"-form").classList.toggle("hidden", t!==which);
      const err = document.getElementById(t+"-error"); if (err) err.classList.add("hidden");
    });
  },

  authError(id, msg){
    const el = document.getElementById(id);
    el.textContent = msg; el.classList.remove("hidden");
  },

  /* ---------- demo account (with seeded profile + sample history) ---------- */
  async ensureDemoAccount(){
    const acc = Store._db._accounts;
    if (!acc["demo@vexien.app"]){
      acc["demo@vexien.app"] = { uid:"demo_user_1", name:"Demo Explorer", pass:this._hash("demo123") };
      Store._save();
    }
    const uid = "demo_user_1";
    if (Store._db.users[uid]) return;
    const t = Profile.calcTargets("male", 28, 172, 74, "moderate", "lose");
    await Store.saveProfile(uid, {
      uid, email:"demo@vexien.app", name:"Demo Explorer", age:28, height:172, weight:74,
      gender:"male", goal:"lose", activity_level:"moderate",
      daily_calorie_target:t.calories, macro_targets:t.macros,
      daily_step_goal:10000, water_goal:8, goal_weight:68,
      created_date:U.dateOffset(-45), prefs:{}, onboarded:true
    });
    // sample history so charts/dashboard are alive on first demo login
    const breakfasts = [["Masala Oats",1,230,8,40,5],["Veggie Omelette",1,260,19,6,18],["Poha",1,250,4,45,5.4],["Overnight Oats Jar",1,340,12,52,9],["Moong Dal Chilla",1,210,12,28,5],["Banana Protein Smoothie",1,310,25,38,6]];
    const lunches = [["Rajma (kidney bean curry)",1,250,13,38,5],["Chicken Breast Salad",1,320,35,10,16],["Vegetable Biryani",1,390,10,62,12],["Chana Masala",1,280,14,38,9],["Quinoa Salad Bowl",1,360,12,48,14]];
    const dinners = [["Dal Tadka",1,180,10,24,5],["Palak Paneer",1,320,15,12,24],["Grilled Salmon & Asparagus",1,420,36,8,28],["Tofu Stir-Fry",1,310,20,20,17],["Paneer Bhurji",1,340,22,8,25]];
    const workouts = [["Brisk Walking","cardio",4.3,40],["Push-ups","strength",3.8,20],["Running (8 km/h)","cardio",8.3,25],["Yoga Flow (Vinyasa)","yoga",4.5,35],["Bodyweight Squats","strength",5,25]];
    for (let d=6; d>=1; d--){
      const date = U.dateOffset(-d);
      const bi=(d)%6, li=(d)%5, di=(d+2)%5;
      const b=breakfasts[bi], l=lunches[li], dn=dinners[di];
      await Store.add("meals",{user_id:uid,date,meal_type:"breakfast",food_id:null,name:b[0],serving_size:"1 serving",quantity:1,emoji:"🍽️",calories:b[2],protein:b[3],carbs:b[4],fats:b[5],created:Date.now()-d*86400000});
      await Store.add("meals",{user_id:uid,date,meal_type:"lunch",food_id:null,name:l[0],serving_size:"1 serving",quantity:1,emoji:"🍽️",calories:l[2],protein:l[3],carbs:l[4],fats:l[5],created:Date.now()-d*86400000+1});
      await Store.add("meals",{user_id:uid,date,meal_type:"dinner",food_id:null,name:dn[0],serving_size:"1 serving",quantity:1,emoji:"🍽️",calories:dn[2],protein:dn[3],carbs:dn[4],fats:dn[5],created:Date.now()-d*86400000+2});
      const steps = 7000 + ((d*1733)%6000);
      await Store.add("step_logs",{user_id:uid,date,steps,distance_km:+(steps*DEFAULTS.stepLengthKm).toFixed(2),created:Date.now()-d*86400000});
      if (d%2===0){
        const w=workouts[(d)%5], mins=w[3];
        await Store.add("workouts",{user_id:uid,date,exercise_name:w[0],category:w[1],duration:mins,intensity:"medium",
          calories_burned:estimateCaloriesBurned(w[2],mins,74),created:Date.now()-d*86400000});
      }
      await Store.add("weight_logs",{user_id:uid,date,weight:+(75.4-d*0.18).toFixed(1),notes:"",created:Date.now()-d*86400000});
      await Store.add("water_logs",{user_id:uid,date,glasses:5+((d*3)%4),created:Date.now()-d*86400000});
    }
  },
  _hash(s){ return btoa(unescape(encodeURIComponent("vx::"+s))); }, // demo-only obfuscation

  /* ---------- session restore ---------- */
  async handleAuthState(){
    if (FIREBASE_OK){
      return new Promise(resolve => {
        firebaseAuth.onAuthStateChanged(async user => {
          if (user){
            this.uid = user.uid;
            this.profile = await Store.getProfile(user.uid);
            if (this.profile){ App.start(this.uid, this.profile); }
            else { this.showOnboarding(); }
          } else {
            this.uid = null; this.profile = null;
            U.showScreen("auth");
          }
          resolve();
        });
      });
    }
    const uid = localStorage.getItem("vexien_session");
    if (uid){
      this.profile = await Store.getProfile(uid);
      if (this.profile){ this.uid = uid; App.start(uid, this.profile); return; }
      localStorage.removeItem("vexien_session");
    }
    U.showScreen("auth");
  },

  /* ---------- sign up ---------- */
  async signUp(){
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim().toLowerCase();
    const pass = document.getElementById("signup-password").value;
    const pass2 = document.getElementById("signup-password2").value;

    if (name.length < 2) return this.authError("signup-error","Please enter your name (2+ characters).");
    if (!U.isEmail(email)) return this.authError("signup-error","Please enter a valid email address.");
    if (pass.length < 6) return this.authError("signup-error","Password must be at least 6 characters.");
    if (pass !== pass2) return this.authError("signup-error","Passwords do not match.");

    try{
      let uid;
      if (FIREBASE_OK){
        const cred = await firebaseAuth.createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: name });
        uid = cred.user.uid;
      }else{
        const acc = Store._db._accounts;
        if (acc[email]) return this.authError("signup-error","An account with this email already exists. Try logging in.");
        uid = "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        acc[email] = { uid, name, pass:this._hash(pass) };
        Store._save();
      }
      this.uid = uid;
      this._pendingName = name; this._pendingEmail = email;
      localStorage.setItem("vexien_session", uid);
      U.toast("success","Account created 🎉","Welcome to VEXIEN, " + name.split(" ")[0] + "! Let's set up your profile.");
      this.showOnboarding();
    }catch(err){
      this.authError("signup-error", U.friendlyAuthError(err));
    }
  },

  /* ---------- login ---------- */
  async login(){
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const pass = document.getElementById("login-password").value;
    if (!U.isEmail(email)) return this.authError("login-error","Please enter a valid email.");
    if (!pass) return this.authError("login-error","Please enter your password.");

    try{
      let uid;
      if (FIREBASE_OK){
        const cred = await firebaseAuth.signInWithEmailAndPassword(email, pass);
        uid = cred.user.uid;
      }else{
        const acc = Store._db._accounts[email];
        if (!acc || acc.pass !== this._hash(pass)) return this.authError("login-error","Incorrect email or password.");
        uid = acc.uid;
      }
      this.uid = uid;
      localStorage.setItem("vexien_session", uid);
      this.profile = await Store.getProfile(uid);
      if (this.profile){
        U.toast("success","Welcome back! 👋","Good to see you again" + (this.profile.name ? ", " + this.profile.name.split(" ")[0] : "") + ".");
        App.start(uid, this.profile);
      }else{
        this.showOnboarding();
      }
    }catch(err){
      this.authError("login-error", U.friendlyAuthError(err));
    }
  },

  /* ---------- forgot password ---------- */
  async forgotPassword(){
    const email = document.getElementById("forgot-email").value.trim().toLowerCase();
    if (!U.isEmail(email)) return this.authError("forgot-error","Please enter a valid email.");
    try{
      if (FIREBASE_OK){
        await firebaseAuth.sendPasswordResetEmail(email);
        U.toast("success","Reset email sent 📧","Check your inbox for " + email + ".");
      }else{
        const acc = Store._db._accounts[email];
        if (!acc) return this.authError("forgot-error","No demo account found with that email.");
        // demo mode: let user set a new password directly
        Modal.open({
          title:"Reset password (Demo Mode)",
          body:`<div class="field"><span>New password for ${U.esc(email)}</span>
                <input type="password" id="reset-pass" placeholder="Min 6 characters"></div>
                <p class="small muted">In Firebase mode, a secure reset link is emailed instead.</p>`,
          actions:[{label:"Cancel",cls:"btn-ghost"},{label:"Set new password",cls:"btn-primary",onClick:()=>{
            const np = document.getElementById("reset-pass").value;
            if (!np || np.length < 6){ U.toast("error","Too short","Password must be at least 6 characters."); return false; }
            acc.pass = Auth._hash(np); Store._save();
            U.toast("success","Password updated ✅","You can now log in with your new password.");
          }}]
        });
      }
    }catch(err){
      this.authError("forgot-error", U.friendlyAuthError(err));
    }
  },

  /* ---------- logout ---------- */
  async logout(){
    try{
      if (FIREBASE_OK) await firebaseAuth.signOut();
    }catch(e){ console.warn(e); }
    localStorage.removeItem("vexien_session");
    this.uid = null; this.profile = null;
    location.hash = "";
    U.showScreen("auth");
    U.toast("success","Logged out 👋","See you at your next workout!");
  },

  /* ---------- change password ---------- */
  async changePassword(current, next){
    if (!next || next.length < 6) throw new Error("New password must be at least 6 characters.");
    if (FIREBASE_OK){
      const user = firebaseAuth.currentUser;
      const email = user.email;
      const cred = firebase.auth.EmailAuthProvider.credential(email, current);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(next);
    }else{
      const prof = this.profile;
      const email = (prof.email||"").toLowerCase();
      const acc = Store._db._accounts[email];
      if (!acc || acc.pass !== this._hash(current)) throw new Error("Current password is incorrect.");
      acc.pass = this._hash(next);
      Store._save();
    }
  },

  /* ---------- onboarding ---------- */
  showOnboarding(){
    U.showScreen("onboarding");
    this._ob = { step:1, gender:null, goal:null };
    this.obRender();
    const p = this.profile;
    if (p){ // returning user re-editing
      if (p.gender){ this._ob.gender = p.gender; const b = document.querySelector(`#ob-gender [data-val="${p.gender}"]`); if(b) b.classList.add("sel"); }
      if (p.goal){ this._ob.goal = p.goal; const b = document.querySelector(`#ob-goal [data-val="${p.goal}"]`); if(b) b.classList.add("sel"); }
      document.getElementById("ob-age").value = p.age || "";
      document.getElementById("ob-height").value = p.height || "";
      document.getElementById("ob-weight").value = p.weight || "";
      document.getElementById("ob-activity").value = p.activity_level || "light";
    }
    this.obPreview();
  },

  obRender(){
    const s = this._ob.step;
    [1,2,3].forEach(i => {
      document.getElementById("ob-step-"+i).classList.toggle("active", i===s);
      document.querySelectorAll(".ob-dot")[i-1].classList.toggle("active", i===s);
    });
    document.getElementById("ob-back").classList.toggle("hidden", s===1);
    document.getElementById("ob-next").textContent = s===3 ? "Finish ✓" : "Next →";
  },

  obNext(){
    const s = this._ob.step;
    if (s===1){
      const age = +document.getElementById("ob-age").value;
      if (!this._ob.gender) return U.toast("warn","Gender required","Please select an option to continue.");
      if (!age || age < 10 || age > 100) return U.toast("warn","Valid age required","Please enter an age between 10 and 100.");
    }
    if (s===2){
      const h = +document.getElementById("ob-height").value, w = +document.getElementById("ob-weight").value;
      if (!h || h < 100 || h > 250) return U.toast("warn","Valid height required","Enter height in cm (100–250).");
      if (!w || w < 30 || w > 300) return U.toast("warn","Valid weight required","Enter weight in kg (30–300).");
    }
    if (s===3){
      if (!this._ob.goal) return U.toast("warn","Goal required","Pick a fitness goal to continue.");
      return this.finishOnboarding();
    }
    this._ob.step++;
    this.obRender();
  },

  obBack(){ if (this._ob.step > 1){ this._ob.step--; this.obRender(); } },

  obPreview(){
    const age = +document.getElementById("ob-age").value;
    const h = +document.getElementById("ob-height").value;
    const w = +document.getElementById("ob-weight").value;
    const act = document.getElementById("ob-activity").value;
    const box = document.getElementById("ob-result");
    if (age && h && w && this._ob.gender && this._ob.goal){
      const t = Profile.calcTargets(this._ob.gender, age, h, w, act, this._ob.goal);
      box.classList.remove("hidden");
      document.getElementById("ob-target").textContent = t.calories.toLocaleString();
      document.getElementById("ob-macros").textContent =
        `Protein ${t.macros.protein}g · Carbs ${t.macros.carbs}g · Fats ${t.macros.fats}g (BMR ${Math.round(t.bmr)} kcal)`;
    }else{
      box.classList.add("hidden");
    }
  },

  async finishOnboarding(){
    const age = +document.getElementById("ob-age").value;
    const h = +document.getElementById("ob-height").value;
    const w = +document.getElementById("ob-weight").value;
    const act = document.getElementById("ob-activity").value;
    const t = Profile.calcTargets(this._ob.gender, age, h, w, act, this._ob.goal);

    let uid = this.uid, email = this._pendingEmail;
    if (FIREBASE_OK && firebaseAuth.currentUser){ uid = firebaseAuth.currentUser.uid; email = firebaseAuth.currentUser.email; }
    else if (!email){
      const prof = await Store.getProfile(uid);
      email = prof ? prof.email : "";
    }
    if (!uid){ U.toast("error","Session lost","Please log in again."); return U.showScreen("auth"); }

    const existing = await Store.getProfile(uid) || {};
    const profile = Object.assign({}, existing, {
      uid,
      email: email || existing.email || "",
      name: this._pendingName || existing.name || "Athlete",
      age, height:h, weight:w, gender:this._ob.gender, goal:this._ob.goal,
      activity_level: act,
      daily_calorie_target: t.calories,
      macro_targets: t.macros,
      daily_step_goal: existing.daily_step_goal || DEFAULTS.stepGoal,
      water_goal: existing.water_goal || DEFAULTS.waterGoal,
      goal_weight: existing.goal_weight || (this._ob.goal==="lose" ? +(w*0.92).toFixed(1) : this._ob.goal==="gain" ? +(w*1.05).toFixed(1) : w),
      created_date: existing.created_date || U.todayStr(),
      prefs: existing.prefs || {},
      onboarded: true
    });

    await Store.saveProfile(uid, profile);
    // first weight log
    await Store.add("weight_logs", { user_id:uid, date:U.todayStr(), weight:w, notes:"Profile setup", created:Date.now() });

    this.profile = profile;
    await seedDemoCommunity(uid);
    U.toast("success","Profile saved 🎯",`Your daily target: ${t.calories.toLocaleString()} kcal. Let's go!`);
    U.confetti();
    App.start(uid, profile);
  }
};
