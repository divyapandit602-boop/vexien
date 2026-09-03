/* ============================================================
   VEXIEN — Data Layer (db.js)
   Dual-mode store:
   • FIREBASE MODE  → Realtime Database with live sync (onValue)
   • DEMO MODE      → localStorage, same API, simulates sync events
   All collections mirror the Firebase structure in the spec.
   ============================================================ */

const COLLECTIONS = ["users","meals","workouts","weight_logs","step_logs","water_logs",
  "user_challenges","user_achievements","social_connections","social_posts","meal_plans",
  "notifications","custom_foods","favorites","challenge_comments"];

const Store = {
  mode: "demo",
  _db: null,            // demo-mode data object
  _fbCache: {},         // firebase-mode mirror
  _listeners: [],
  _ready: false,

  /* ---------- init ---------- */
  async init(){
    if (FIREBASE_OK){
      this.mode = "firebase";
      COLLECTIONS.forEach(c => this._fbCache[c] = {});
      // Live realtime listeners
      COLLECTIONS.forEach(col => {
        firebaseDb.ref(col).on("value", snap => {
          this._fbCache[col] = snap.val() || {};
          this._notify(col);
        }, err => console.error("FB listen error", col, err));
      });
      this._ready = true;
      return true;
    }
    this.mode = "demo";
    try{
      const raw = localStorage.getItem("vexien_db_v1");
      this._db = raw ? JSON.parse(raw) : {};
    }catch(e){ this._db = {}; }
    COLLECTIONS.forEach(c => { if (!this._db[c]) this._db[c] = {}; });
    if (!this._db._accounts) this._db._accounts = {};
    this._save();
    this._ready = true;
    return true;
  },

  _save(){ if (this.mode === "demo") localStorage.setItem("vexien_db_v1", JSON.stringify(this._db)); },
  _notify(col){ this._listeners.forEach(fn => { try{ fn(col||"*"); }catch(e){ console.error(e); } }); },
  onChange(fn){ this._listeners.push(fn); },

  _genId(col){ return col.slice(0,3) + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); },

  /* ---------- reads ---------- */
  raw(col){
    if (this.mode === "firebase") return this._fbCache[col] || {};
    return this._db[col] || {};
  },
  list(col){
    const src = this.raw(col);
    return Object.keys(src).map(k => Object.assign({id:k}, src[k]));
  },
  listFor(col, uid){
    if (!uid) return [];
    return this.list(col).filter(r => r.user_id === uid);
  },
  get(col, id){ const src = this.raw(col); return src[id] ? Object.assign({id}, src[id]) : null; },

  /* ---------- writes ---------- */
  async add(col, obj){
    const id = obj.id || this._genId(col);
    if (this.mode === "firebase"){
      await firebaseDb.ref(col + "/" + id).set(obj);
    }else{
      this._db[col][id] = obj;
      this._save();
    }
    this._notify(col);
    return id;
  },
  async push(col, obj){
    if (this.mode === "firebase"){
      const ref = firebaseDb.ref(col).push();
      await ref.set(obj);
      this._notify(col);
      return ref.key;
    }
    return this.add(col, obj);
  },
  async update(col, id, patch){
    if (this.mode === "firebase"){
      await firebaseDb.ref(col + "/" + id).update(patch);
    }else{
      if (this._db[col][id]) Object.assign(this._db[col][id], patch);
      this._save();
    }
    this._notify(col);
  },
  async remove(col, id){
    if (this.mode === "firebase"){
      await firebaseDb.ref(col + "/" + id).remove();
    }else{
      delete this._db[col][id];
      this._save();
    }
    this._notify(col);
  },

  /* ---------- profile ---------- */
  async getProfile(uid){ return this.get("users", uid); },
  async saveProfile(uid, profile){
    if (this.mode === "firebase") await firebaseDb.ref("users/" + uid).update(profile);
    else { this._db.users[uid] = Object.assign({}, this._db.users[uid]||{}, profile); this._save(); }
    this._notify("users");
  },

  /* ---------- convenience queries ---------- */
  dayLogs(col, uid, date){ return this.listFor(col, uid).filter(r => r.date === date); },
  recent(col, uid, n){
    return this.listFor(col, uid).sort((a,b)=> (b.date||"").localeCompare(a.date||"") || (b.created||0)-(a.created||0)).slice(0, n||10);
  }
};

/* ============================================================
   Demo community seeding (local mode only, runs once per user)
   ============================================================ */
function seedDemoCommunity(uid){
  if (Store.mode !== "demo") return Promise.resolve();
  if (Store._db._seeded && Store._db._seeded[uid]) return Promise.resolve();
  const today = U.todayStr();
  const prom = [];

  // friend connections
  DEMO_USERS.forEach((u,i) => {
    prom.push(Store.add("social_connections", {
      user_id: uid, friend_id: u.uid, friend_name: u.name, friend_avatar: u.avatar,
      status: i < 5 ? "accepted" : "pending_incoming",
      connected_date: U.dateOffset(-3 - i)
    }));
  });

  // bot activity for last 7 days (leaderboards + feed)
  DEMO_USERS.forEach(u => {
    for (let d = 6; d >= 0; d--){
      const date = U.dateOffset(-d);
      const jit = 0.7 + U.seededRand(u.uid + date) * 0.65;
      prom.push(Store.add("step_logs", { user_id: u.uid, date, steps: Math.round(u.base.steps * jit), distance_km: +(Math.round(u.base.steps*jit*DEFAULTS.stepLengthKm*100)/100).toFixed(2), demo:true }));
      if (d % 2 === 0){
        const ex = EXERCISE_DB[(d + u.name.length) % EXERCISE_DB.length];
        prom.push(Store.add("workouts", { user_id: u.uid, date, exercise_name: ex.name, category: ex.category, duration: 25 + (d*5), intensity: ["low","medium","high"][d%3], calories_burned: Math.round(u.base.burn * jit), demo:true }));
      }
    }
  });

  // feed posts
  DEMO_USERS.forEach((u,i) => {
    const tpl = DEMO_POST_TEMPLATES[i % DEMO_POST_TEMPLATES.length];
    const ex = EXERCISE_DB[(i*7) % EXERCISE_DB.length];
    let content = tpl[1].replace("{n}", 30 + i*5).replace("{e}", ex.name).replace("{b}", ACHIEVEMENT_DEFS[i%ACHIEVEMENT_DEFS.length].name)
      .replace("{k}", (0.5 + (i%5)*0.6).toFixed(1)).replace("{s}", (8000 + i*1300).toLocaleString())
      .replace("{d}", 5 + i*3).replace("{c}", CHALLENGE_TEMPLATES[i%CHALLENGE_TEMPLATES.length].name);
    prom.push(Store.add("social_posts", {
      user_id: u.uid, user_name: u.name, avatar: u.avatar,
      post_type: tpl[0], content, created_date: U.dateOffset(-(i % 6)) + "T" + (8 + i) + ":00:00",
      created: Date.now() - i*86400000, likes: DEMO_USERS.slice(0, (i%7)+1).map(x=>x.uid),
      comments: i%3===0 ? [{user_id: DEMO_USERS[(i+2)%8].uid, user_name: DEMO_USERS[(i+2)%8].name, text:"Amazing progress! Keep going 🔥", created: Date.now()-3600000}] : []
    }));
  });

  // challenge participation counts
  CHALLENGE_TEMPLATES.forEach((c,i) => {
    prom.push(Store.add("user_challenges", { challenge_id: c.id, participants_demo: 24 + i*13, dummy:true }));
  });

  return Promise.all(prom).then(()=>{
    Store._db._seeded = Store._db._seeded || {};
    Store._db._seeded[uid] = true;
    Store._save();
    Store._notify("seed");
  });
}

/* Remove bot dummy challenge counters if needed */
function demoParticipantCount(challengeId){
  const rec = Store.list("user_challenges").find(r => r.dummy && r.challenge_id === challengeId);
  return rec ? rec.participants_demo : 0;
}
