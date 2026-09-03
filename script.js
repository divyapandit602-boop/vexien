/* ============================================================
   VEXIEN — Main Application (script.js)
   Utilities · Modals · Dashboard · Weight · Achievements ·
   Settings · Notifications · Router & App shell
   ============================================================ */

/* ================= UTILITIES ================= */
const U = {
  todayStr(){ return this.fmtDate(new Date()); },
  fmtDate(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); },
  dateOffset(n){ const d=new Date(); d.setDate(d.getDate()+n); return this.fmtDate(d); },
  dateOffsetFrom(ds,n){ const d=new Date(ds+"T00:00:00"); d.setDate(d.getDate()+n); return this.fmtDate(d); },
  lastNDays(n){ const a=[]; for(let i=n-1;i>=0;i--) a.push(this.dateOffset(-i)); return a; },
  dayLabel(ds){ const d=new Date(ds+"T00:00:00"); return d.toLocaleDateString("en",{weekday:"short"}); },
  monthName(){ return new Date().toLocaleDateString("en",{month:"long", year:"numeric"}); },
  prettyDate(ds){ if(!ds) return ""; const d=new Date(ds.length<=10?ds+"T00:00:00":ds); return d.toLocaleDateString("en",{day:"numeric",month:"short"}); },
  timeAgo(t){
    if(!t) return "";
    const ms = Date.now() - (typeof t==="number"?t:new Date(t).getTime());
    const m=Math.floor(ms/60000), h=Math.floor(m/60), d=Math.floor(h/24);
    if (m<1) return "just now"; if (m<60) return m+"m ago"; if (h<24) return h+"h ago"; if (d<7) return d+"d ago";
    return this.prettyDate(typeof t==="number"?new Date(t).toISOString():t);
  },
  esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); },
  capitalize(s){ return s? s[0].toUpperCase()+s.slice(1):s; },
  isEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); },
  clamp01(v){ return Math.max(0, Math.min(1, v)); },
  seededRand(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return ((h>>>0)%10000)/10000; },
  highlight(text, q){
    if(!q) return this.esc(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if(i<0) return this.esc(text);
    return this.esc(text.slice(0,i))+"<b>"+this.esc(text.slice(i,i+q.length))+"</b>"+this.esc(text.slice(i+q.length));
  },
  catEmoji(cat){
    return {fruits:"🍎",vegetables:"🥦",grains:"🌾",protein:"🍗",dairy:"🥛",legumes:"🫘",nuts:"🥜",
      snacks:"🍿",sweets:"🍰",beverages:"🥤",indian:"🍛","soups-salads":"🥗",condiments:"🫙",
      custom:"✨",cardio:"🏃",strength:"🏋️",yoga:"🧘",stretching:"🤸",sports:"🏸",recipe:"👨‍🍳",
      fitness:"💪",plan:"🍱",recent:"⚡"}[cat]||"🍽️";
  },
  suggestMealType(){
    const h = new Date().getHours();
    if (h<11) return "breakfast"; if (h<16) return "lunch"; if (h<22) return "dinner"; return "snacks";
  },
  friendlyAuthError(err){
    const map = {
      "auth/email-already-in-use":"An account with this email already exists.",
      "auth/invalid-email":"Please enter a valid email address.",
      "auth/weak-password":"Password should be at least 6 characters.",
      "auth/user-not-found":"No account found with this email.",
      "auth/wrong-password":"Incorrect password. Try again or reset it.",
      "auth/invalid-credential":"Incorrect email or password.",
      "auth/too-many-requests":"Too many attempts. Please try again later.",
      "auth/network-request-failed":"Network error — check your connection."
    };
    return map[err && err.code] || (err && err.message) || "Something went wrong. Please try again.";
  },
  showScreen(name){
    document.getElementById("auth-screen").classList.toggle("hidden", name!=="auth");
    document.getElementById("onboarding-screen").classList.toggle("hidden", name!=="onboarding");
    document.getElementById("app").classList.toggle("hidden", name!=="app");
    document.getElementById("app").classList.toggle("ready", name==="app");
  },
  toast(type, title, msg){
    const root = document.getElementById("toast-root");
    const ico = {success:"✅",error:"⛔",warn:"⚠️",info:"ℹ️"}[type]||"ℹ️";
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.innerHTML = `<span class="toast-ico">${ico}</span><div><b>${this.esc(title)}</b>${msg?`<span>${this.esc(msg)}</span>`:""}</div>`;
    root.appendChild(el);
    setTimeout(()=>{ el.classList.add("out"); setTimeout(()=>el.remove(), 320); }, 3600);
  },
  confetti(){
    const root = document.getElementById("confetti-root");
    const colors = ["#87CEEB","#FFEB99","#B0E0E6","#ADD8E6","#8FD694","#F2A6A6"];
    for (let i=0;i<70;i++){
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random()*100+"vw";
      c.style.background = colors[i%colors.length];
      c.style.animationDuration = (1.6+Math.random()*1.8)+"s";
      c.style.animationDelay = (Math.random()*0.5)+"s";
      c.style.transform = `rotate(${Math.random()*360}deg)`;
      root.appendChild(c);
      setTimeout(()=>c.remove(), 4000);
    }
  },
  download(filename, text){
    const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  }
};

/* ================= MODAL SYSTEM ================= */
const Modal = {
  _stack: [],
  open({title, body, actions, wide}){
    const back = document.createElement("div");
    back.className = "modal-backdrop";
    back.innerHTML = `<div class="modal ${wide?"wide":""}" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${title||""}</h3><button class="modal-close">✕</button></div>
      <div class="modal-body">${body||""}</div>
      ${actions&&actions.length?`<div class="modal-foot">${actions.map((a,i)=>`<button class="btn ${a.cls||"btn-ghost"}" data-mact="${i}">${a.label}</button>`).join("")}</div>`:""}
    </div>`;
    document.getElementById("modal-root").appendChild(back);
    this._stack.push(back);
    const close = () => this._closeEl(back);
    back.querySelector(".modal-close").onclick = close;
    back.onclick = e => { if (e.target === back) close(); };
    back.querySelectorAll("[data-mact]").forEach(b => b.onclick = async () => {
      const act = actions[+b.dataset.mact];
      if (act && act.onClick){
        const r = act.onClick();
        if (r === false) return;          // keep open
        if (r && typeof r.then === "function"){ await r; }
      }
      this._closeEl(back);
    });
    document.addEventListener("keydown", this._escHandler);
    return back;
  },
  _escHandler(e){ if (e.key === "Escape") Modal.close(); },
  _closeEl(back){
    back.style.animation = "fadeIn .18s reverse";
    setTimeout(()=>back.remove(), 160);
    this._stack = this._stack.filter(x=>x!==back);
    if (!this._stack.length) document.removeEventListener("keydown", this._escHandler);
  },
  close(){ if (this._stack.length) this._closeEl(this._stack[this._stack.length-1]); },
  confirm(title, msg){
    return new Promise(res => {
      let answered = false;
      Modal.open({title, body:`<p style="font-size:14px">${msg||"Are you sure?"}</p>`, actions:[
        {label:"Cancel", cls:"btn-ghost", onClick:()=>{answered=true;res(false);}},
        {label:"Confirm", cls:"btn-danger", onClick:()=>{answered=true;res(true);}}
      ]});
      const iv = setInterval(()=>{ if(!Modal._stack.length && !answered){ clearInterval(iv); res(false);} if(answered) clearInterval(iv); }, 200);
    });
  },
  prompt(title, label, def){
    return new Promise(res => {
      let answered = false;
      Modal.open({title, body:`<div class="field"><span class="lbl">${label||"Value"}</span>
        <input id="modal-prompt-input" value="${U.esc(def||"")}"></div>`, actions:[
        {label:"Cancel", cls:"btn-ghost", onClick:()=>{answered=true;res(null);}},
        {label:"OK", cls:"btn-primary", onClick:()=>{answered=true;res(document.getElementById("modal-prompt-input").value);}}
      ]});
      setTimeout(()=>{ const i=document.getElementById("modal-prompt-input"); if(i){i.focus(); i.select();} },80);
      const iv = setInterval(()=>{ if(answered) clearInterval(iv); else if(!Modal._stack.length){ clearInterval(iv); res(null);} }, 200);
    });
  }
};

/* ================= PROFILE CALCULATIONS ================= */
const Profile = {
  calcTargets(gender, age, heightCm, weightKg, activity, goal){
    // Mifflin-St Jeor
    let bmr = 10*weightKg + 6.25*heightCm - 5*age + 5;
    if (gender === "female") bmr = 10*weightKg + 6.25*heightCm - 5*age - 161;
    else if (gender === "other") bmr -= 78; // average of the two formulas
    const tdee = bmr * (DEFAULTS.activityFactors[activity]||1.375);
    let cal = Math.round(tdee + (DEFAULTS.goalAdjust[goal]||0));
    cal = Math.max(1200, Math.min(4000, cal));
    return { bmr, tdee, calories: cal, macros: this.macroGrams(cal, goal) };
  },
  macroGrams(cal, goal){
    const r = DEFAULTS.macroRatio[goal] || DEFAULTS.macroRatio.maintain;
    return {
      protein: Math.round(cal*r.p/100/4/5)*5,
      carbs: Math.round(cal*r.c/100/4/5)*5,
      fats: Math.round(cal*r.f/100/9/5)*5,
      ratio: r
    };
  },
  calcMaintenance(prof){
    if (!prof || !prof.height || !prof.weight || !prof.age) return prof && prof.daily_calorie_target ? prof.daily_calorie_target + 500 : 2200;
    const t = this.calcTargets(prof.gender||"other", prof.age, prof.height, prof.weight, prof.activity_level||"light", "maintain");
    return t.calories;
  },
  recalcTargets(prof){
    return this.calcTargets(prof.gender, prof.age, prof.height, prof.weight, prof.activity_level, prof.goal);
  }
};

/* ================= WEIGHT MODULE ================= */
const Weight = {
  range: 30,
  logs(uid){ return Store.listFor("weight_logs", uid).sort((a,b)=>a.date.localeCompare(b.date)); },
  entryFor(uid, date){ return Store.dayLogs("weight_logs", uid, date)[0] || null; },
  current(uid){ const l=this.logs(uid); return l.length? l[l.length-1].weight : (Auth.profile.weight||null); },
  start(uid){ const l=this.logs(uid); return l.length? l[0].weight : (Auth.profile.weight||null); },
  waterFor(uid, date){ const w = Store.dayLogs("water_logs", uid, date)[0]; return w? (w.glasses||0):0; },

  render(){
    const uid = Auth.uid, prof = Auth.profile;
    const root = document.getElementById("weight-root");
    const logs = this.logs(uid);
    const cur = this.current(uid), st = this.start(uid);
    const goalW = prof.goal_weight || prof.weight || 70;
    const toGo = +(cur - goalW).toFixed(1);
    const sinceStart = +(cur - st).toFixed(1);

    // rate over last 14 days
    let rate = 0;
    const last14 = logs.filter(l=>l.date >= U.dateOffset(-14));
    if (last14.length >= 2){
      const days = (new Date(last14[last14.length-1].date) - new Date(last14[0].date))/86400000;
      if (days > 0) rate = +(((last14[last14.length-1].weight - last14[0].weight)/days)*7).toFixed(2);
    }
    const last7w = logs.filter(l=>l.date >= U.dateOffset(-7)).map(l=>l.weight);
    const weekAvg = last7w.length ? +(last7w.reduce((a,b)=>a+b,0)/last7w.length).toFixed(1) : cur;

    let pctGoal = 100;
    if (Math.abs(st-goalW) > 0.05){
      pctGoal = Math.round(U.clamp01((st-cur)/(st-goalW))*100);
      if ((cur-goalW)*(st-goalW) <= 0 && cur!==st) pctGoal = 100;
    }
    const trend = sinceStart < -0.2 ? ["📉 Losing","green"] : sinceStart > 0.2 ? ["📈 Gaining","yellow"] : ["⚖️ Stable","sky"];

    const viewLogs = logs.slice(-(this.range===0?logs.length:this.range));
    const weights = viewLogs.map(l=>l.weight);

    root.innerHTML = `
      <div class="page-head">
        <div><h2>Weight Tracking</h2><p>Progress over perfection — the trend is your friend.</p></div>
        <button class="btn btn-primary" id="w-log-btn">⚖️ Log Weight</button>
      </div>

      <div class="grid grid-4 mb16">
        <div class="card"><div class="stat-big">${cur?cur:"—"}<span style="font-size:14px"> kg</span></div><div class="stat-label">current weight</div>
          <div class="stat-sub">${logs.length? "logged "+U.prettyDate(logs[logs.length-1].date):"from profile"}</div></div>
        <div class="card"><div class="stat-big" style="color:${toGo<=0?'var(--green-deep)':'inherit'}">${toGo>0?"−"+toGo:toGo===0?"✓":"+"+Math.abs(toGo)}<span style="font-size:14px"> kg</span></div>
          <div class="stat-label">${toGo>0?"to goal":toGo===0?"at goal!":"past goal 🎉"}</div><div class="stat-sub">goal: ${goalW} kg</div></div>
        <div class="card"><div class="stat-big">${rate>0?"+":""}${rate}<span style="font-size:14px"> kg/wk</span></div><div class="stat-label">change rate (14d)</div>
          <div class="stat-sub">${rate<0&&rate>-1.1?"✅ healthy pace":rate<=-1.1?"⚠️ fast — consider eating more":rate>0.5?"surplus — good for gaining":"holding steady"}</div></div>
        <div class="card"><div class="stat-big">${weekAvg}<span style="font-size:14px"> kg</span></div><div class="stat-label">weekly average</div>
          <div class="stat-sub">start: ${st} kg · <span class="pill ${trend[1]}">${trend[0]}</span></div></div>
      </div>

      <div class="grid grid-23 mb16">
        <div class="card">
          <div class="card-title"><span class="t">📈 Weight Trend</span>
            <div class="chips">${[[30,"30d"],[90,"90d"],[0,"All"]].map(r=>`<button class="chip ${Weight.range===r[0]?'sel':''}" data-wrange="${r[0]}">${r[1]}</button>`).join("")}</div></div>
          ${viewLogs.length>=2 ? `<div id="w-chart"></div>` :
            `<div class="empty"><div class="e-ico">📈</div><b>Not enough data yet</b><span>Log your weight on at least 2 different days to see the trend.</span></div>`}
        </div>
        <div class="card center">
          <div class="card-title"><span class="t">🎯 Goal Progress</span></div>
          ${FX.ringHtml(pctGoal, 100, "#8FD694", pctGoal+"%", "of goal", 160)}
          <div class="small muted mt8">${cur>goalW?`${(cur-goalW).toFixed(1)} kg to go`:"Goal reached — amazing! 🎉"}</div>
          <hr class="divider">
          <div class="small muted mb8">Goal weight</div>
          <div class="flex" style="justify-content:center">
            <input type="number" id="w-goal-input" value="${goalW}" step="0.5" min="30" max="250" style="width:90px;background:var(--soft);border:1.5px solid var(--border);border-radius:10px;padding:8px;text-align:center">
            <button class="btn btn-sm btn-primary" id="w-goal-save">Save</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="t">🗒️ Weight History</span><span class="pill sky">${logs.length} entries</span></div>
        ${logs.length?`<div class="tbl-wrap" style="max-height:340px;overflow-y:auto"><table class="tbl">
          <thead><tr><th>Date</th><th class="num">Weight</th><th class="num">Change</th><th>Notes</th><th></th></tr></thead>
          <tbody>${logs.slice().reverse().map((l,i,arr)=>{
            const prev = arr[i+1];
            const ch = prev? (l.weight-prev.weight):null;
            return `<tr><td>${U.prettyDate(l.date)}</td><td class="num"><b>${l.weight}</b> kg</td>
              <td class="num">${ch===null?"—":`<span style="color:${ch<0?'var(--green-deep)':ch>0?'var(--red-deep)':'inherit'}">${ch>0?"+":""}${ch.toFixed(1)}</span>`}</td>
              <td class="muted small">${U.esc(l.notes||"")}</td>
              <td><button class="btn btn-sm btn-ghost" data-delw="${l.id}">🗑️</button></td></tr>`;}).join("")}
          </tbody></table></div>`
          :`<div class="empty"><div class="e-ico">⚖️</div><b>No weigh-ins yet</b><span>Tap "Log Weight" — morning weigh-ins are most consistent.</span></div>`}
      </div>`;

    document.getElementById("w-log-btn").onclick = () => Weight.openModal();
    root.querySelectorAll("[data-wrange]").forEach(b=>b.onclick=()=>{Weight.range=+b.dataset.wrange;Weight.render();});
    document.getElementById("w-goal-save").onclick = async ()=>{
      const g = parseFloat(document.getElementById("w-goal-input").value);
      if (!g || g<30 || g>250) return U.toast("warn","Invalid goal","Enter a weight between 30 and 250 kg.");
      await Store.saveProfile(uid, {goal_weight:g});
      Auth.profile.goal_weight = g;
      U.toast("success","Goal updated 🎯",`Target weight: ${g} kg`);
      App.rerender();
    };
    root.querySelectorAll("[data-delw]").forEach(b=>b.onclick=async()=>{
      if (await Modal.confirm("Delete weigh-in?","This entry will be removed.")){
        await Store.remove("weight_logs", b.dataset.delw);
        U.toast("success","Deleted");
      }
    });

    if (viewLogs.length >= 2){
      FX.line(document.getElementById("w-chart"), {
        labels: viewLogs.map(l=>U.prettyDate(l.date)),
        series:[{name:"Weight (kg)", data:weights, color:"#87CEEB"}],
        height:240, zero:false
      });
    }
  },

  openModal(){
    const cur = this.current(Auth.uid);
    Modal.open({
      title:"⚖️ Log Weight",
      body:`<div class="form-row">
          <div class="field"><span class="lbl">Weight (kg) *</span>
            <input type="number" id="wl-weight" step="0.1" min="30" max="300" placeholder="${cur||70}" inputmode="decimal" value=""></div>
          <div class="field"><span class="lbl">Date</span><input type="date" id="wl-date" value="${U.todayStr()}" max="${U.todayStr()}"></div>
        </div>
        <div class="field"><span class="lbl">Notes (optional)</span><input id="wl-notes" placeholder="Morning, after gym…"></div>
        ${cur?`<p class="small muted">Current: <b>${cur} kg</b>${(Auth.profile.weight&&cur!==Auth.profile.weight)?` · profile says ${Auth.profile.weight} kg`:""}</p>`:""}`,
      actions:[{label:"Cancel",cls:"btn-ghost"},{label:"Save weigh-in ✓",cls:"btn-primary",onClick:async()=>{
        const w = parseFloat(document.getElementById("wl-weight").value);
        const date = document.getElementById("wl-date").value || U.todayStr();
        if (!w || w<30 || w>300) { U.toast("warn","Valid weight required","Enter a weight between 30 and 300 kg."); return false; }
        const uid = Auth.uid;
        const prevMin = Math.min(...Weight.logs(uid).map(l=>l.weight), 9999);
        const existing = Store.dayLogs("weight_logs", uid, date)[0];
        const payload = {user_id:uid, date, weight:w, notes:document.getElementById("wl-notes").value.trim(), created:Date.now()};
        if (existing) await Store.update("weight_logs", existing.id, payload);
        else await Store.add("weight_logs", payload);
        // keep profile weight fresh
        await Store.saveProfile(uid, {weight:w});
        Auth.profile.weight = w;
        U.toast("success","Weight logged ⚖️", `${w} kg saved for ${U.prettyDate(date)}.`);
        if (w < prevMin && prevMin < 9999){
          U.confetti();
          U.toast("success","New record low! 🎉", "Your lightest weigh-in yet — huge milestone!");
          Notifier.add("🎉","New weight milestone!", `You hit a new low of ${w} kg. Celebrate!`);
          Social.quickShare && setTimeout(()=>{}, 0);
        }
        Achievements.check();
      }}]
    });
    setTimeout(()=>{const i=document.getElementById("wl-weight"); if(i)i.focus();},80);
  },

  addWater(delta){
    const uid = Auth.uid, today = U.todayStr();
    const existing = Store.dayLogs("water_logs", uid, today)[0];
    const cur = existing? (existing.glasses||0):0;
    const next = Math.max(0, cur + delta);
    const payload = {user_id:uid, date:today, glasses:next, created:Date.now()};
    (existing ? Store.update("water_logs", existing.id, payload) : Store.add("water_logs", payload)).then(()=>{
      if (delta>0 && next === (Auth.profile.water_goal||DEFAULTS.waterGoal)){
        U.toast("success","Hydration goal reached 💧","8/8 glasses — nicely done!");
        Achievements.check();
      }
      App.rerender();
    });
  }
};

/* ================= ACHIEVEMENTS ================= */
const Achievements = {
  unlocked(uid){
    const recs = Store.listFor("user_achievements", uid);
    return recs.map(r => {
      const def = ACHIEVEMENT_DEFS.find(a=>a.id===r.achievement_id);
      return def ? Object.assign({}, def, {unlocked_date:r.unlocked_date, rec:r}) : null;
    }).filter(Boolean).sort((a,b)=>(b.unlocked_date||"").localeCompare(a.unlocked_date||""));
  },
  unlockedInRange(days){
    const from = U.dateOffset(-days);
    return this.unlocked(Auth.uid).filter(a=>(a.unlocked_date||"") >= from);
  },

  stats(uid){
    const prof = Auth.profile;
    const meals = Store.listFor("meals", uid);
    const workouts = Store.listFor("workouts", uid);
    const weights = Store.listFor("weight_logs", uid).sort((a,b)=>a.date.localeCompare(b.date));
    const steps = Store.listFor("step_logs", uid);
    const waters = Store.listFor("water_logs", uid);

    // streak: consecutive days (today or yesterday backwards) with any activity
    const activeDays = new Set();
    meals.forEach(m=>activeDays.add(m.date));
    workouts.forEach(w=>activeDays.add(w.date));
    steps.forEach(s=>{ if((s.steps||0)>0) activeDays.add(s.date); });
    waters.forEach(w=>{ if((w.glasses||0)>0) activeDays.add(w.date); });
    weights.forEach(w=>activeDays.add(w.date));
    let streak = 0;
    let d = activeDays.has(U.todayStr()) ? U.todayStr() : U.dateOffset(-1);
    while (activeDays.has(d) && streak < 400){ streak++; d = U.dateOffsetFrom(d, -1); }

    // per-day aggregates
    const dayIn = {}, dayP = {}, dayW = {};
    meals.forEach(m=>{
      dayIn[m.date]=(dayIn[m.date]||0)+(m.calories||0);
      dayP[m.date]=(dayP[m.date]||0)+(m.protein||0);
    });
    waters.forEach(w=> dayW[w.date]=(w.glasses||0));
    const target = prof.daily_calorie_target || 2000;
    const pTarget = (prof.macro_targets && prof.macro_targets.protein) || 100;
    const daysUnderGoal = Object.keys(dayIn).filter(k=>dayIn[k]>0 && dayIn[k]<=target).length;
    const daysProteinHit = Object.keys(dayP).filter(k=>dayP[k]>=pTarget).length;
    const daysWaterGoal = Object.keys(dayW).filter(k=>dayW[k]>=(prof.water_goal||DEFAULTS.waterGoal)).length;

    return {
      foodCount: meals.length,
      workoutCount: workouts.length,
      totalBurned: workouts.reduce((a,w)=>a+(w.calories_burned||0),0),
      weightCount: weights.length,
      startWeight: weights.length? weights[0].weight : (prof.weight||0),
      minWeight: weights.length? Math.min(...weights.map(w=>w.weight)) : (prof.weight||0),
      maxSteps: steps.length? Math.max(...steps.map(s=>s.steps||0)) : 0,
      streak, daysUnderGoal, daysProteinHit, daysWaterGoal,
      challengesCompleted: Store.listFor("user_challenges", uid).filter(uc=>uc.completed && !uc.dummy).length,
      friends: Store.listFor("social_connections", uid).filter(c=>c.status==="accepted").length,
      posts: Store.listFor("social_posts", uid).length,
      favRecipes: Store.listFor("favorites", uid).filter(f=>f.type==="recipe").length,
      mealPlans: Store.listFor("meal_plans", uid).length,
      clamp01: U.clamp01
    };
  },

  async check(){
    const uid = Auth.uid; if (!uid || !Auth.profile) return;
    const stats = this.stats(uid);
    const existing = {};
    Store.listFor("user_achievements", uid).forEach(r => existing[r.achievement_id] = r);
    for (const def of ACHIEVEMENT_DEFS){
      let res; try{ res = def.check(stats); }catch(e){ continue; }
      if (res.done && !existing[def.id]){
        await Store.add("user_achievements", {
          user_id:uid, achievement_id:def.id, name:def.name, icon_emoji:def.emoji,
          unlocked_date:U.todayStr(), progress:100, created:Date.now()
        });
        U.toast("success",`Achievement unlocked! ${def.emoji}`, def.name + " — " + def.desc);
        Notifier.add(def.emoji, "Achievement unlocked: " + def.name, def.desc);
        U.confetti();
      }
    }
  },

  render(){
    const uid = Auth.uid;
    const stats = this.stats(uid);
    const unlocked = {};
    Store.listFor("user_achievements", uid).forEach(r => unlocked[r.achievement_id] = r);
    const root = document.getElementById("achievements-root");
    const nUnlocked = Object.keys(unlocked).length;

    root.innerHTML = `
      <div class="page-head">
        <div><h2>Achievements &amp; Badges</h2><p>Every badge is proof of consistency.</p></div>
        <span class="pill yellow">🏆 ${nUnlocked} / ${ACHIEVEMENT_DEFS.length} unlocked</span>
      </div>
      <div class="pbar yellow mb16" style="height:12px"><div style="width:${Math.round(nUnlocked/ACHIEVEMENT_DEFS.length*100)}%"></div></div>
      <div class="badge-grid">
        ${ACHIEVEMENT_DEFS.map(def=>{
          const rec = unlocked[def.id];
          let res={pct:0,done:false}; try{ res = def.check(stats); }catch(e){}
          const pct = Math.round(res.pct*100);
          return `<div class="badge-card ${rec?"unlocked":""}" data-badge="${def.id}">
            <div class="badge-emoji">${def.emoji}</div>
            <b>${U.esc(def.name)}</b>
            <span>${U.esc(def.desc)}</span>
            ${rec ? `<span class="badge-date">Unlocked ${U.prettyDate(rec.unlocked_date)}</span>`
                  : `<div class="badge-prog"><div class="pbar"><div style="width:${pct}%"></div></div>
                     <div class="small muted mt8">${pct}%</div></div>`}
          </div>`;}).join("")}
      </div>`;

    root.querySelectorAll("[data-badge]").forEach(el=>el.onclick=()=>{
      const def = ACHIEVEMENT_DEFS.find(a=>a.id===el.dataset.badge);
      const rec = unlocked[def.id];
      Modal.open({
        title:`${def.emoji} ${U.esc(def.name)}`,
        body:`<p style="font-size:14px">${U.esc(def.desc)}</p>
          <div class="ob-result mt12">${rec?`✅ <b>Unlocked on ${U.prettyDate(rec.unlocked_date)}</b>`:
            (()=>{ let r={pct:0}; try{r=def.check(stats);}catch(e){} return `🔒 Locked — ${Math.round(r.pct*100)}% complete`; })()}</div>
          <p class="small muted mt8">Type: ${U.capitalize(def.type)}</p>`,
        actions:[{label:"Close",cls:"btn-ghost"},
          ...(rec?[{label:"📣 Share",cls:"btn-primary",onClick:()=>Social.shareDialog("achievement",`Just unlocked the "${def.name}" ${def.emoji} badge on VEXIEN! ${def.desc}`)}]:[])]
      });
    });
  }
};

/* ================= NOTIFICATIONS ================= */
const Notifier = {
  list(uid){
    return Store.listFor("notifications", uid).sort((a,b)=>(b.created||0)-(a.created||0)).slice(0,30);
  },
  async add(icon, title, body){
    await Store.add("notifications", {
      user_id: Auth.uid, icon, title, body, read:false,
      created_date: new Date().toISOString(), created: Date.now()
    });
    this.renderBell();
  },
  renderBell(){
    const items = this.list(Auth.uid);
    const unread = items.filter(n=>!n.read).length;
    const badge = document.getElementById("notif-count");
    badge.textContent = unread;
    badge.classList.toggle("hidden", unread===0);
    document.getElementById("notif-list").innerHTML = items.length ? items.map(n=>`
      <div class="notif-row ${n.read?"":"unread"}">
        <span class="notif-ico">${n.icon||"🔔"}</span>
        <div class="notif-txt"><strong>${U.esc(n.title)}</strong><span>${U.esc(n.body||"")}</span></div>
        <span class="notif-time">${U.timeAgo(n.created)}</span>
      </div>`).join("") : `<div class="empty" style="padding:22px"><span>No notifications yet.</span></div>`;
  },
  async markAllRead(){
    const uid = Auth.uid;
    await Promise.all(this.list(uid).filter(n=>!n.read).map(n=>Store.update("notifications", n.id, {read:true})));
    this.renderBell();
  },
  /* daily reminder logic — runs once per day per type */
  async dailyReminders(){
    const uid = Auth.uid, prof = Auth.profile;
    if (!prof) return;
    const sent = prof.reminders_sent || {};
    const today = U.todayStr(), h = new Date().getHours();
    const mark = async key => { sent[key] = today; await Store.saveProfile(uid, {reminders_sent:sent}); };
    const prefs = prof.prefs || {};
    if (prefs.remindersOff) return;

    const hasMeals = Diet.dayMeals(uid, today).length > 0;
    if (h >= 8 && h < 15 && !hasMeals && sent.meal !== today){
      await this.add("🍽️","Time to log your meals","Track what you eat to stay on target today.");
      await mark("meal");
    }
    const hasWorkout = Fitness.dayWorkouts(uid, today).length > 0;
    if (h >= 16 && !hasWorkout && sent.workout !== today){
      await this.add("🏋️","Workout reminder","Even 15 minutes counts. Log your session!");
      await mark("workout");
    }
    const water = Weight.waterFor(uid, today);
    if (h >= 12 && water < (prof.water_goal||8) && sent.water !== today){
      await this.add("💧","Hydration check-in",`You've had ${water}/${prof.water_goal||8} glasses today.`);
      await mark("water");
    }
    const lastWeigh = Weight.logs(uid).slice(-1)[0];
    const daysSinceWeigh = lastWeigh ? Math.floor((new Date(today)-new Date(lastWeigh.date))/86400000) : 99;
    if (daysSinceWeigh >= 3 && sent.weighin !== today){
      await this.add("⚖️","Weigh-in reminder","It's been a few days — log your weight to keep the trend accurate.");
      await mark("weighin");
    }
    // challenge updates
    const active = Challenges.myChallenges(uid).filter(uc=>!uc.completed);
    if (active.length && sent.challenge !== today){
      const ev = Challenges.evaluate(active[0], active[0].tpl, uid, prof);
      await this.add(active[0].tpl.emoji, "Challenge update",
        `${active[0].tpl.name}: ${ev.pct}% done · ${ev.daysLeft} day(s) left${ev.daysLeft<=3?" — final push!":""}`);
      await mark("challenge");
    }
    this.renderBell();
  },
  maybeRemindAfterLog(){ /* positive reinforcement handled by toasts/achievements */ }
};

/* ================= DASHBOARD ================= */
function renderDashboard(){
  const uid = Auth.uid, prof = Auth.profile;
  const today = U.todayStr();
  const root = document.getElementById("dashboard-root");
  const h = new Date().getHours();
  const greet = h<12?"Good morning":h<17?"Good afternoon":h<21?"Good evening":"Hello night owl";
  const first = (prof.name||"Athlete").split(" ")[0];

  const diet = Diet.dayTotals(uid, today);
  const goal = prof.daily_calorie_target || 2000;
  const burned = Math.round(Fitness.dayBurned(uid, today));
  const steps = Fitness.daySteps(uid, today);
  const stepGoal = prof.daily_step_goal || DEFAULTS.stepGoal;
  const net = Math.round(diet.calories - burned);
  const macros = prof.macro_targets || Profile.macroGrams(goal, prof.goal||"maintain");
  const water = Weight.waterFor(uid, today);
  const waterGoal = prof.water_goal || DEFAULTS.waterGoal;

  const qIdx = Math.floor(new Date(today+"T00:00:00").getTime()/86400000) % QUOTES.length;
  const quote = QUOTES[qIdx];

  const activeCh = Challenges.myChallenges(uid).filter(uc=>!uc.completed);
  const streak = Achievements.stats(uid).streak;
  const workoutsToday = Fitness.dayWorkouts(uid, today).length;
  const remaining = goal - Math.round(diet.calories);
  const remColor = remaining < 0 ? "var(--red-deep)" : remaining < goal*0.15 ? "#C9A227" : "var(--green-deep)";

  root.innerHTML = `
    <div class="grid grid-32 mb16">
      <div>
        <div class="page-head" style="margin-bottom:12px">
          <div><h2>${greet}, ${U.esc(first)}! 👋</h2><p>${new Date().toLocaleDateString("en",{weekday:"long", day:"numeric", month:"long"})} · ${streak>0?`🔥 ${streak}-day streak`:"Start a streak today!"}</p></div>
        </div>
        <div class="quick-actions mb16">
          <button class="qa-btn" data-qa="food"><span class="qa-ico">🍎</span>Log Food</button>
          <button class="qa-btn y" data-qa="workout"><span class="qa-ico">🏋️</span>Log Workout</button>
          <button class="qa-btn" data-qa="weight"><span class="qa-ico">⚖️</span>Log Weight</button>
          <button class="qa-btn y" data-qa="steps"><span class="qa-ico">👟</span>Log Steps</button>
          <button class="qa-btn" data-qa="report"><span class="qa-ico">📊</span>Reports</button>
        </div>
        <div class="card mb16">
          <div class="card-title"><span class="t">📋 Today's Summary</span>
            <span class="pill ${remaining>=0?'green':'red'}">${remaining>=0?remaining.toLocaleString()+" kcal left":Math.abs(remaining).toLocaleString()+" over"}</span></div>
          <div class="grid grid-3 mb12" style="gap:10px">
            <div class="card" style="padding:12px"><div class="stat-big" style="font-size:21px">${Math.round(diet.calories).toLocaleString()}</div><div class="stat-label">🍽️ consumed</div><div class="stat-sub">goal ${goal.toLocaleString()}</div></div>
            <div class="card" style="padding:12px"><div class="stat-big" style="font-size:21px">${burned.toLocaleString()}</div><div class="stat-label">🔥 burned</div><div class="stat-sub">${workoutsToday} workout${workoutsToday===1?"":"s"}</div></div>
            <div class="card" style="padding:12px"><div class="stat-big" style="font-size:21px;color:${remColor}">${net>0?"+":""}${net.toLocaleString()}</div><div class="stat-label">⚖️ net balance</div><div class="stat-sub">${net<=0?"deficit 🎉":"surplus"}</div></div>
          </div>
          ${Diet.macroBar("Protein", diet.protein, macros.protein, "macro-p")}
          ${Diet.macroBar("Carbs", diet.carbs, macros.carbs, "macro-c")}
          ${Diet.macroBar("Fats", diet.fats, macros.fats, "macro-f")}
          <hr class="divider">
          <div class="flex-between">
            <div><span class="stat-label">💧 Water — ${water}/${waterGoal} glasses</span>
              <div class="water-glasses mt8">
                ${Array.from({length:waterGoal},(_,i)=>`<div class="water-glass ${i<water?"full":""}" data-water="${i+1}" title="${i+1} glass${i>0?"es":""}"></div>`).join("")}
              </div>
            </div>
            <button class="btn btn-sm btn-ghost" id="dash-water-add">+ Add glass</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><span class="t">🍽️ Today's Meals</span>
            <button class="btn btn-sm btn-ghost" data-qa="food">+ Add</button></div>
          ${Diet.mealsHtml(uid, today)}
        </div>
      </div>

      <div class="grid" style="gap:16px">
        <div class="card">
          <div class="card-title"><span class="t">⭕ Daily Rings</span></div>
          <div class="flex" style="justify-content:space-around;flex-wrap:wrap;gap:14px">
            ${FX.ringHtml(diet.calories, goal, "#87CEEB", Math.round(diet.calories).toLocaleString(), "/ "+goal.toLocaleString()+" kcal", 108)}
            ${FX.ringHtml(burned, Math.max(400, burned), "#FFD97A", burned.toLocaleString(), "kcal burned", 108)}
            ${FX.ringHtml(steps, stepGoal, "#8FD694", steps>=1000?(steps/1000).toFixed(1)+"k":steps, "/ "+(stepGoal/1000)+"k steps", 108)}
          </div>
        </div>
        <div class="card quote-card">
          <div class="q-text">“${U.esc(quote[0])}”</div>
          <div class="q-author">— ${U.esc(quote[1])} · Quote of the day</div>
        </div>
        ${activeCh.length ? `<div class="card">
          <div class="card-title"><span class="t">🎯 Active Challenge</span>
            <span class="pill sky">${activeCh.length} running</span></div>
          ${activeCh.slice(0,2).map(uc=>{
            const ev = Challenges.evaluate(uc, uc.tpl, uid, prof);
            return `<div class="mb12">
              <div class="pbar-row"><span>${uc.tpl.emoji} ${U.esc(uc.tpl.name)}</span><b>${ev.pct}%</b></div>
              <div class="pbar ${ev.pct>=100?'green':''}"><div style="width:${ev.pct}%"></div></div>
              <div class="stat-sub">${ev.daysLeft>0?ev.daysLeft+" days remaining · "+ev.met+"/"+uc.tpl.days+" days met":"Challenge window ended"}</div>
            </div>`;}).join("")}
          <button class="btn btn-sm btn-ghost btn-block" data-goto="challenges">View all challenges →</button>
        </div>` : `<div class="card">
          <div class="card-title"><span class="t">🎯 Upcoming Challenge</span></div>
          <p class="small muted mb12">No active challenges. Join one and turn intention into routine.</p>
          ${CHALLENGE_TEMPLATES.slice(0,2).map(t=>`<div class="list-row"><div class="lr-ico">${t.emoji}</div>
            <div class="lr-body"><b>${U.esc(t.name)}</b><span>${t.days} days · ${U.capitalize(t.difficulty)}</span></div>
            <button class="btn btn-sm btn-primary" data-joinch="${t.id}">Join</button></div>`).join("")}
        </div>`}
        <div class="card">
          <div class="card-title"><span class="t">📊 7-Day Calories</span></div>
          <div id="dash-mini-chart"></div>
        </div>
      </div>
    </div>`;

  root.querySelectorAll("[data-qa]").forEach(b=>b.onclick=()=>{
    ({food:()=>Diet.openAddModal(null,null),
      workout:()=>Fitness.openWorkoutModal(),
      weight:()=>Weight.openModal(),
      steps:()=>Fitness.openStepsModal(),
      report:()=>App.navigate("analytics")})[b.dataset.qa]();
  });
  root.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>App.navigate(b.dataset.goto));
  root.querySelectorAll("[data-joinch]").forEach(b=>b.onclick=()=>Challenges.join(CHALLENGE_TEMPLATES.find(t=>t.id===b.dataset.joinch)));
  document.getElementById("dash-water-add").onclick = ()=>Weight.addWater(1);
  root.querySelectorAll("[data-water]").forEach(g=>g.onclick=()=>{
    const cur = Weight.waterFor(uid, U.todayStr());
    Weight.addWater(+g.dataset.water === cur ? -1 : (+g.dataset.water - cur));
  });
  Diet.bindMealActions(uid, today);

  const days7 = U.lastNDays(7);
  FX.bar(document.getElementById("dash-mini-chart"), {
    labels: days7.map(d=>U.dayLabel(d)),
    values: days7.map(d=>Math.round(Diet.dayTotals(uid,d).calories)),
    color:"#B0E0E6", height:150, goal
  });
}

/* ================= SETTINGS ================= */
function renderSettings(){
  const prof = Auth.profile, root = document.getElementById("settings-root");
  const prefs = prof.prefs || {};
  const macros = prof.macro_targets || Profile.macroGrams(prof.daily_calorie_target||2000, prof.goal||"maintain");
  const ratio = macros.ratio || DEFAULTS.macroRatio[prof.goal||"maintain"];

  root.innerHTML = `
    <div class="page-head"><div><h2>Settings &amp; Profile</h2><p>Your body, your targets, your rules.</p></div></div>
    <div class="grid grid-2">
      <div class="grid" style="gap:16px">
        <div class="card">
          <div class="card-title"><span class="t">👤 Profile</span></div>
          <div class="flex mb12" style="gap:14px">
            <div class="post-avatar" id="set-avatar" style="width:64px;height:64px;font-size:26px;cursor:pointer" title="Click to upload photo">
              ${prof.profile_picture_url?`<img src="${prof.profile_picture_url}">`:U.esc((prof.name||"V")[0].toUpperCase())}</div>
            <div class="small muted">Tap the avatar to upload a profile photo.<br><button class="link-btn" id="set-remove-photo">Remove photo</button></div>
            <input type="file" id="set-photo-input" accept="image/*" class="hidden">
          </div>
          <div class="form-row">
            <div class="field"><span class="lbl">Name</span><input id="set-name" value="${U.esc(prof.name||"")}"></div>
            <div class="field"><span class="lbl">Email</span><input id="set-email" value="${U.esc(prof.email||"")}" ${FIREBASE_OK?"disabled title='Email is managed by Firebase Auth'":""}></div>
          </div>
          <div class="form-row">
            <div class="field"><span class="lbl">Age</span><input id="set-age" type="number" min="10" max="100" value="${prof.age||""}"></div>
            <div class="field"><span class="lbl">Gender</span>
              <select id="set-gender">${["male","female","other"].map(g=>`<option value="${g}" ${prof.gender===g?"selected":""}>${U.capitalize(g)}</option>`).join("")}</select></div>
          </div>
          <div class="form-row">
            <div class="field"><span class="lbl">Height (cm)</span><input id="set-height" type="number" min="100" max="250" step="0.5" value="${prof.height||""}"></div>
            <div class="field"><span class="lbl">Weight (kg)</span><input id="set-weight" type="number" min="30" max="300" step="0.1" value="${prof.weight||""}"></div>
          </div>
          <div class="form-row">
            <div class="field"><span class="lbl">Fitness goal</span>
              <select id="set-goal"><option value="lose" ${prof.goal==="lose"?"selected":""}>🔥 Lose weight</option><option value="maintain" ${prof.goal==="maintain"?"selected":""}>⚖️ Maintain</option><option value="gain" ${prof.goal==="gain"?"selected":""}>💪 Gain muscle</option></select></div>
            <div class="field"><span class="lbl">Activity level</span>
              <select id="set-activity">
                <option value="sedentary" ${prof.activity_level==="sedentary"?"selected":""}>Sedentary</option>
                <option value="light" ${prof.activity_level==="light"?"selected":""}>Lightly active</option>
                <option value="moderate" ${prof.activity_level==="moderate"?"selected":""}>Moderately active</option>
                <option value="very" ${prof.activity_level==="very"?"selected":""}>Very active</option>
                <option value="extra" ${prof.activity_level==="extra"?"selected":""}>Extra active</option>
              </select></div>
          </div>
          <div class="flex" style="gap:8px">
            <button class="btn btn-primary grow" id="set-save">Save profile</button>
            <button class="btn btn-yellow" id="set-recalc">🧮 Auto-recalc targets</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><span class="t">🎯 Targets &amp; Preferences</span></div>
          <div class="form-row">
            <div class="field"><span class="lbl">Daily calorie target</span><input id="set-cal" type="number" min="1000" max="6000" step="50" value="${prof.daily_calorie_target||2000}"></div>
            <div class="field"><span class="lbl">Daily step goal</span><input id="set-steps" type="number" min="1000" max="50000" step="500" value="${prof.daily_step_goal||10000}"></div>
          </div>
          <div class="form-row">
            <div class="field"><span class="lbl">Protein %</span><input id="set-p" type="number" min="10" max="60" value="${ratio.p}"></div>
            <div class="field"><span class="lbl">Carbs %</span><input id="set-c" type="number" min="10" max="70" value="${ratio.c}"></div>
          </div>
          <div class="form-row">
            <div class="field"><span class="lbl">Fats %</span><input id="set-f" type="number" min="10" max="50" value="${ratio.f}"></div>
            <div class="field"><span class="lbl">Water goal (glasses)</span><input id="set-water" type="number" min="4" max="16" value="${prof.water_goal||8}"></div>
          </div>
          <p class="small muted mb8" id="set-macro-preview"></p>
          <button class="btn btn-primary btn-block" id="set-save-prefs">Save targets</button>
        </div>
      </div>

      <div class="grid" style="gap:16px">
        <div class="card">
          <div class="card-title"><span class="t">🔔 Notifications</span></div>
          ${[["reminders","In-app reminders","Meals, workouts, water, weigh-ins"],["weeklyEmail","📧 Weekly summary email","Progress digest every Monday"],
             ["challengeEmail","📧 Challenge progress email","Updates on your active challenges"],["friendEmail","📧 Friend activity email","When someone adds you"],
             ["leaderEmail","📧 Leaderboard email","Your weekly ranking"]].map(([k,label,sub])=>`
            <div class="setting-row"><div class="sr-txt"><b>${label}</b><span>${sub}</span></div>
              <label class="switch"><input type="checkbox" data-pref="${k}" ${k==="reminders"?(prefs.remindersOff?"":"checked"):(prefs[k]?"checked":"")}><span class="slider"></span></label>
            </div>`).join("")}
          <p class="small muted mt8">📧 Email delivery requires a Firebase project with Cloud Functions/Email service — toggles are saved to your profile either way.</p>
          <div class="setting-row"><div class="sr-txt"><b>🌙 Dark mode</b><span>Easy on the eyes at night</span></div>
            <label class="switch"><input type="checkbox" id="set-dark" ${document.body.dataset.theme==="dark"?"checked":""}><span class="slider"></span></label></div>
        </div>

        <div class="card">
          <div class="card-title"><span class="t">🔐 Account</span></div>
          <div class="setting-row"><div class="sr-txt"><b>Change password</b><span>Keep your account secure</span></div>
            <button class="btn btn-sm btn-ghost" id="set-pass">Change</button></div>
          <div class="setting-row"><div class="sr-txt"><b>Privacy</b><span>Who can find &amp; compare with you</span></div>
            <select id="set-privacy" style="background:var(--soft);border:1.5px solid var(--border);border-radius:10px;padding:7px">
              <option value="everyone" ${(prefs.privacy||"everyone")==="everyone"?"selected":""}>Everyone</option>
              <option value="friends" ${prefs.privacy==="friends"?"selected":""}>Friends only</option>
              <option value="nobody" ${prefs.privacy==="nobody"?"selected":""}>Nobody</option>
            </select></div>
          <div class="setting-row"><div class="sr-txt"><b>Export my data</b><span>Download everything as JSON</span></div>
            <button class="btn btn-sm btn-ghost" id="set-export">⬇️ Export</button></div>
          <div class="setting-row"><div class="sr-txt"><b>Backend</b><span>${FIREBASE_OK?"☁️ Firebase connected":"💾 Local demo mode"}</span></div>
            <span class="pill ${FIREBASE_OK?"green":"yellow"}">${Store.mode}</span></div>
          <div class="setting-row"><div class="sr-txt"><b style="color:var(--red-deep)">Delete account</b><span>Removes all your VEXIEN data permanently</span></div>
            <button class="btn btn-sm btn-danger" id="set-delete">Delete</button></div>
          <button class="btn btn-ghost btn-block mt12" id="set-logout">🚪 Logout</button>
        </div>
      </div>
    </div>`;

  /* --- profile save --- */
  const macroPreview = () => {
    const cal = +document.getElementById("set-cal").value || 2000;
    const p = +document.getElementById("set-p").value||30, c2 = +document.getElementById("set-c").value||40, f = +document.getElementById("set-f").value||30;
    document.getElementById("set-macro-preview").textContent =
      `Preview: Protein ${Math.round(cal*p/100/4/5)*5}g · Carbs ${Math.round(cal*c2/100/4/5)*5}g · Fats ${Math.round(cal*f/100/9/5)*5}g ${p+c2+f!==100?"⚠️ (percentages add to "+(p+c2+f)+"%)":""}`;
  };
  ["set-cal","set-p","set-c","set-f"].forEach(id=>document.getElementById(id).oninput=macroPreview);
  macroPreview();

  document.getElementById("set-save").onclick = async ()=>{
    const name = document.getElementById("set-name").value.trim();
    const age = +document.getElementById("set-age").value;
    const height = +document.getElementById("set-height").value;
    const weight = +document.getElementById("set-weight").value;
    if (!name) return U.toast("warn","Name required");
    if (!age||age<10||age>100) return U.toast("warn","Valid age required","10–100 years.");
    if (!height||height<100||height>250) return U.toast("warn","Valid height required","100–250 cm.");
    if (!weight||weight<30||weight>300) return U.toast("warn","Valid weight required","30–300 kg.");
    const email = document.getElementById("set-email").value.trim().toLowerCase();
    if (!FIREBASE_OK && email && !U.isEmail(email)) return U.toast("warn","Valid email required");
    const patch = {
      name, age, height, weight,
      gender: document.getElementById("set-gender").value,
      goal: document.getElementById("set-goal").value,
      activity_level: document.getElementById("set-activity").value,
      email: FIREBASE_OK ? (prof.email||"") : (email||prof.email||"")
    };
    if (Store.mode==="demo" && email && email !== (prof.email||"").toLowerCase()){
      const acc = Store._db._accounts;
      const old = acc[(prof.email||"").toLowerCase()];
      if (old){ delete acc[(prof.email||"").toLowerCase()]; acc[email] = old; }
    }
    await Store.saveProfile(Auth.uid, patch);
    Object.assign(Auth.profile, patch);
    U.toast("success","Profile saved ✅","Your details have been updated.");
    App.refreshChrome(); App.rerender();
  };

  document.getElementById("set-recalc").onclick = async ()=>{
    const p = Object.assign({}, prof, {
      age:+document.getElementById("set-age").value||prof.age,
      height:+document.getElementById("set-height").value||prof.height,
      weight:+document.getElementById("set-weight").value||prof.weight,
      gender:document.getElementById("set-gender").value,
      goal:document.getElementById("set-goal").value,
      activity_level:document.getElementById("set-activity").value
    });
    const t = Profile.recalcTargets(p);
    if (await Modal.confirm("Recalculate targets?",
      `Based on your inputs: <b>${t.calories.toLocaleString()} kcal/day</b><br>Protein ${t.macros.protein}g · Carbs ${t.macros.carbs}g · Fats ${t.macros.fats}g<br><br>Apply these targets?`)){
      await Store.saveProfile(Auth.uid, {daily_calorie_target:t.calories, macro_targets:t.macros});
      Auth.profile.daily_calorie_target = t.calories; Auth.profile.macro_targets = t.macros;
      U.toast("success","Targets updated 🎯",`${t.calories.toLocaleString()} kcal/day applied.`);
      renderSettings();
    }
  };

  document.getElementById("set-save-prefs").onclick = async ()=>{
    const cal = +document.getElementById("set-cal").value;
    const steps = +document.getElementById("set-steps").value;
    const p = +document.getElementById("set-p").value, c2 = +document.getElementById("set-c").value, f = +document.getElementById("set-f").value;
    const water = +document.getElementById("set-water").value;
    if (!cal||cal<1000||cal>6000) return U.toast("warn","Invalid calorie target","1000–6000 kcal.");
    if (!steps||steps<1000) return U.toast("warn","Invalid step goal","Minimum 1,000 steps.");
    if (p+c2+f !== 100) return U.toast("warn","Macro split must total 100%",`Currently ${p+c2+f}%.`);
    const patch = {
      daily_calorie_target: cal, daily_step_goal: steps, water_goal: water||8,
      macro_targets: {protein:Math.round(cal*p/100/4/5)*5, carbs:Math.round(cal*c2/100/4/5)*5, fats:Math.round(cal*f/100/9/5)*5, ratio:{p,c:c2,f}}
    };
    await Store.saveProfile(Auth.uid, patch);
    Object.assign(Auth.profile, patch);
    U.toast("success","Targets saved ✅",`${cal.toLocaleString()} kcal · ${steps.toLocaleString()} steps · ${water||8} glasses`);
  };

  /* notification prefs */
  root.querySelectorAll("[data-pref]").forEach(cb=>cb.onchange=async()=>{
    const prefs2 = Object.assign({}, Auth.profile.prefs||{});
    if (cb.dataset.pref==="reminders") prefs2.remindersOff = !cb.checked;
    else prefs2[cb.dataset.pref] = cb.checked;
    await Store.saveProfile(Auth.uid, {prefs:prefs2});
    Auth.profile.prefs = prefs2;
    U.toast("success","Preference saved");
  });
  document.getElementById("set-privacy").onchange = async e=>{
    const prefs2 = Object.assign({}, Auth.profile.prefs||{}, {privacy:e.target.value});
    await Store.saveProfile(Auth.uid, {prefs:prefs2});
    Auth.profile.prefs = prefs2;
    U.toast("success","Privacy updated");
  };

  /* dark mode */
  document.getElementById("set-dark").onchange = e => App.setTheme(e.target.checked?"dark":"light");

  /* photo upload */
  document.getElementById("set-avatar").onclick = ()=>document.getElementById("set-photo-input").click();
  document.getElementById("set-photo-input").onchange = e=>{
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) return U.toast("error","Image too large","Please choose an image under 5 MB.");
    const reader = new FileReader();
    reader.onload = ev=>{
      const img = new Image();
      img.onload = async ()=>{
        // downscale to 128px
        const cv = document.createElement("canvas");
        const s = 128/Math.max(img.width,img.height);
        cv.width = Math.round(img.width*s); cv.height = Math.round(img.height*s);
        cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
        const url = cv.toDataURL("image/jpeg", 0.8);
        await Store.saveProfile(Auth.uid, {profile_picture_url:url});
        Auth.profile.profile_picture_url = url;
        U.toast("success","Photo updated 📸");
        App.refreshChrome(); renderSettings();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  document.getElementById("set-remove-photo").onclick = async ()=>{
    await Store.saveProfile(Auth.uid, {profile_picture_url:null});
    Auth.profile.profile_picture_url = null;
    App.refreshChrome(); renderSettings();
    U.toast("success","Photo removed");
  };

  /* password */
  document.getElementById("set-pass").onclick = ()=>{
    Modal.open({title:"🔐 Change password", body:`
      <div class="field"><span class="lbl">Current password</span><input type="password" id="cp-old"></div>
      <div class="field"><span class="lbl">New password (6+ chars)</span><input type="password" id="cp-new"></div>
      <div class="field"><span class="lbl">Confirm new password</span><input type="password" id="cp-new2"></div>`,
      actions:[{label:"Cancel",cls:"btn-ghost"},{label:"Update password",cls:"btn-primary",onClick:async()=>{
        const o=document.getElementById("cp-old").value, n=document.getElementById("cp-new").value, n2=document.getElementById("cp-new2").value;
        if (n!==n2){ U.toast("warn","Passwords don't match"); return false; }
        try{ await Auth.changePassword(o,n); U.toast("success","Password changed 🔐"); }
        catch(err){ U.toast("error","Couldn't change password", err.message||String(err)); return false; }
      }}]});
  };

  /* export */
  document.getElementById("set-export").onclick = ()=>{
    const uid = Auth.uid;
    const dump = {exported_at:new Date().toISOString(), profile:prof};
    ["meals","workouts","weight_logs","step_logs","water_logs","user_challenges","user_achievements",
     "social_connections","social_posts","meal_plans","custom_foods","favorites","notifications"]
      .forEach(col=> dump[col] = Store.listFor(col, uid));
    U.download("vexien_export_"+U.todayStr()+".json", JSON.stringify(dump,null,2));
    U.toast("success","Data exported ⬇️","JSON download started.");
  };

  /* delete account */
  document.getElementById("set-delete").onclick = async ()=>{
    if (!await Modal.confirm("Delete account? ⚠️","This permanently removes ALL your VEXIEN data — logs, achievements, friends, posts. This cannot be undone.")) return;
    const uid = Auth.uid;
    const cols = ["meals","workouts","weight_logs","step_logs","water_logs","user_challenges","user_achievements",
      "social_connections","social_posts","meal_plans","custom_foods","favorites","notifications"];
    for (const col of cols){
      for (const rec of Store.listFor(col, uid)) await Store.remove(col, rec.id);
    }
    await Store.remove("users", uid);
    if (Store.mode==="demo"){
      const email = (prof.email||"").toLowerCase();
      delete Store._db._accounts[email];
      if (Store._db._seeded) delete Store._db._seeded[uid];
      Store._save();
    } else {
      try{ await firebase.auth().currentUser.delete(); }catch(e){ console.warn(e); }
    }
    localStorage.removeItem("vexien_session");
    U.toast("success","Account deleted","Your data has been removed.");
    setTimeout(()=>location.reload(), 900);
  };

  document.getElementById("set-logout").onclick = ()=>Auth.logout();
}

/* ================= APP SHELL / ROUTER ================= */
const App = {
  current: "dashboard",
  _rerenderTimer: null,

  VIEWS: {
    dashboard: {title:"Dashboard", render:()=>renderDashboard()},
    diet: {title:"Diet Tracking", render:()=>Diet.render()},
    fitness: {title:"Fitness", render:()=>Fitness.render()},
    weight: {title:"Weight", render:()=>Weight.render()},
    analytics: {title:"Analytics", render:()=>Analytics.render()},
    challenges: {title:"Challenges", render:()=>Challenges.renderChallenges()},
    social: {title:"Social", render:()=>Social.render()},
    achievements: {title:"Achievements", render:()=>Achievements.render()},
    settings: {title:"Settings", render:()=>renderSettings()}
  },

  start(uid, profile){
    Auth.uid = uid; Auth.profile = profile;
    U.showScreen("app");
    this.applyTheme(profile);
    this.bindShell();
    seedDemoCommunity(uid); // idempotent — demo mode only
    this.refreshChrome();
    const hashView = (location.hash||"").replace("#","");
    this.navigate(this.VIEWS[hashView] ? hashView : "dashboard");
    // real-time sync: re-render on data changes
    Store.onChange(col => {
      clearTimeout(this._rerenderTimer);
      this._rerenderTimer = setTimeout(()=>{ this.rerender(); this.refreshChrome(); }, 220);
    });
    Notifier.dailyReminders();
    Achievements.check();
    Challenges.updateDailyProgress();
  },

  bindShell(){
    if (this._bound) return;
    this._bound = true;
    document.querySelectorAll("#sidebar .nav-item, #bottom-nav .bn-item[data-view], #more-sheet .sheet-item").forEach(b=>{
      b.onclick = () => {
        if (b.id === "bn-more") return;
        document.getElementById("more-sheet-backdrop").classList.add("hidden");
        this.navigate(b.dataset.view);
      };
    });
    document.getElementById("bn-more").onclick = ()=>document.getElementById("more-sheet-backdrop").classList.toggle("hidden");
    document.getElementById("more-sheet-backdrop").onclick = e=>{ if(e.target.id==="more-sheet-backdrop") e.target.classList.add("hidden"); };

    // notification bell
    document.getElementById("notif-bell").onclick = e=>{
      e.stopPropagation();
      const dd = document.getElementById("notif-dropdown");
      dd.classList.toggle("hidden");
      document.getElementById("user-menu").classList.add("hidden");
      if (!dd.classList.contains("hidden")) Notifier.renderBell();
    };
    document.getElementById("mark-all-read").onclick = ()=>Notifier.markAllRead();
    // user menu
    document.getElementById("avatar-btn").onclick = e=>{
      e.stopPropagation();
      document.getElementById("user-menu").classList.toggle("hidden");
      document.getElementById("notif-dropdown").classList.add("hidden");
    };
    document.querySelectorAll("#user-menu .dd-item").forEach(b=>b.onclick=()=>{
      document.getElementById("user-menu").classList.add("hidden");
      if (b.dataset.act==="logout") Auth.logout();
      else if (b.dataset.act==="settings") this.navigate("settings");
      else if (b.dataset.act==="theme") this.setTheme(document.body.dataset.theme==="dark"?"light":"dark");
    });
    document.addEventListener("click", ()=>{
      document.getElementById("notif-dropdown").classList.add("hidden");
      document.getElementById("user-menu").classList.add("hidden");
    });
    // quick water
    document.getElementById("quick-water").onclick = ()=>{
      Weight.addWater(1);
      U.toast("success","💧 +1 glass",`Today: ${Weight.waterFor(Auth.uid,U.todayStr())}/${Auth.profile.water_goal||8}`);
    };
    window.addEventListener("hashchange", ()=>{
      const v = (location.hash||"").replace("#","");
      if (this.VIEWS[v] && v !== this.current) this.navigate(v, true);
    });
  },

  navigate(view, fromHash){
    if (!this.VIEWS[view]) view = "dashboard";
    this.current = view;
    if (!fromHash) location.hash = view;
    document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active", s.id==="view-"+view));
    document.querySelectorAll("#sidebar .nav-item").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
    document.querySelectorAll("#bottom-nav .bn-item[data-view]").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
    document.getElementById("topbar-title").textContent = this.VIEWS[view].title;
    window.scrollTo({top:0, behavior:"instant"});
    this.VIEWS[view].render();
  },

  rerender(){
    if (!Auth.uid || !Auth.profile) return;
    try{ this.VIEWS[this.current].render(); }
    catch(e){ console.error("Render error:", e); }
  },

  refreshChrome(){
    const prof = Auth.profile; if (!prof) return;
    document.getElementById("today-date").textContent =
      new Date().toLocaleDateString("en",{weekday:"short", day:"numeric", month:"short", year:"numeric"});
    document.getElementById("menu-user-name").textContent = prof.name || "Athlete";
    const av = document.getElementById("avatar-inner");
    av.innerHTML = prof.profile_picture_url ? `<img src="${prof.profile_picture_url}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">` : U.esc((prof.name||"V")[0].toUpperCase());
    const streak = Achievements.stats(Auth.uid).streak;
    document.getElementById("side-streak").textContent = `🔥 ${streak} day streak`;
    Notifier.renderBell();
  },

  applyTheme(prof){
    const dark = (prof && prof.prefs && prof.prefs.dark) || false;
    document.body.dataset.theme = dark ? "dark" : "light";
  },
  setTheme(mode){
    document.body.dataset.theme = mode;
    Store.saveProfile(Auth.uid, {prefs: Object.assign({}, Auth.profile.prefs||{}, {dark: mode==="dark"})}).then(()=>{
      Auth.profile.prefs = Object.assign({}, Auth.profile.prefs||{}, {dark: mode==="dark"});
      this.rerender();
      U.toast("success", mode==="dark"?"Dark mode on 🌙":"Light mode on ☀️");
    });
  }
};

/* ================= BOOT ================= */
document.addEventListener("DOMContentLoaded", async ()=>{
  await Store.init();
  Auth.initUI();
  // splash
  setTimeout(()=>{
    const sp = document.getElementById("splash");
    if (!sp) return;
    sp.classList.add("done");
    setTimeout(()=>{ const s=document.getElementById("splash"); if (s) s.remove(); }, 600);
  }, 1100);
  if (Auth._demoReady) { try{ await Auth._demoReady; }catch(e){ console.warn(e); } }
  await Auth.handleAuthState();
});
