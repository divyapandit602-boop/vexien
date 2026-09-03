/* ============================================================
   VEXIEN — Fitness Tracking (fitness.js)
   Workout logging · exercise database · steps · activity
   ============================================================ */

const Fitness = {
  tab: "log",
  exCat: "all",
  exQuery: "",

  dayBurned(uid, date){
    return Store.listFor("workouts", uid).filter(w => w.date === date)
      .reduce((a,w) => a + (w.calories_burned||0), 0);
  },
  daySteps(uid, date){
    const logs = Store.dayLogs("step_logs", uid, date);
    return logs.reduce((a,l) => a + (l.steps||0), 0);
  },
  dayWorkouts(uid, date){
    return Store.listFor("workouts", uid).filter(w => w.date === date);
  },

  intensityFactor(i){ return i==="high" ? 1.2 : i==="low" ? 0.8 : 1; },

  /* ---------- RENDER ---------- */
  render(){
    const root = document.getElementById("fitness-root");
    const tabs = [["log","🏋️ Log Workout"],["exercises","📖 Exercises"],["steps","👟 Steps"],["activity","📅 Activity"]];
    root.innerHTML = `
      <div class="page-head">
        <div><h2>Fitness Tracking</h2><p>Every rep, every step — logged.</p></div>
        <button class="btn btn-primary" id="fit-quick">➕ Log Workout</button>
      </div>
      <div class="tabs">${tabs.map(t=>`<button class="tab ${Fitness.tab===t[0]?'active':''}" data-ftab="${t[0]}">${t[1]}</button>`).join("")}</div>
      <div id="fit-content"></div>`;
    root.querySelectorAll("[data-ftab]").forEach(b => b.onclick = () => { Fitness.tab=b.dataset.ftab; Fitness.render(); });
    document.getElementById("fit-quick").onclick = () => Fitness.openWorkoutModal();
    const c = document.getElementById("fit-content");
    ({log:()=>this.renderLog(c), exercises:()=>this.renderExercises(c),
      steps:()=>this.renderSteps(c), activity:()=>this.renderActivity(c)})[this.tab]();
  },

  /* ================= LOG WORKOUT ================= */
  renderLog(c){
    const uid = Auth.uid;
    const history = Store.listFor("workouts", uid).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.created||0)-(a.created||0)).slice(0,15);
    const todayBurn = Math.round(this.dayBurned(uid, U.todayStr()));
    c.innerHTML = `
    <div class="grid grid-32">
      <div class="card">
        <div class="card-title"><span class="t">🕘 Workout History</span><span class="pill yellow">Today: ${todayBurn} kcal 🔥</span></div>
        ${history.length ? history.map(w=>`
          <div class="list-row">
            <div class="lr-ico">${U.catEmoji(w.category||"fitness")}</div>
            <div class="lr-body"><b>${U.esc(w.exercise_name)}</b>
              <span>${U.prettyDate(w.date)} · ${w.duration} min · ${U.capitalize(w.intensity||"medium")} intensity
              ${w.sets?` · ${w.sets}×${w.reps||0}${w.weight?` @ ${w.weight}kg`:""}`:""}${w.notes?` · 📝 ${U.esc(w.notes).slice(0,40)}`:""}</span></div>
            <div class="lr-right">${w.calories_burned}<small>kcal</small></div>
            <span class="mi-acts"><button data-delworkout="${w.id}" title="Delete">🗑️</button></span>
          </div>`).join("") : `<div class="empty"><div class="e-ico">🏋️</div><b>No workouts yet</b><span>Log your first workout — even 10 minutes counts!</span></div>`}
      </div>
      <div class="grid" style="gap:16px">
        <div class="card">
          <div class="card-title"><span class="t">⚡ Quick Log</span></div>
          <p class="small muted mb12">Pick a popular exercise or search all ${EXERCISE_DB.length}+.</p>
          <div class="chips" id="quick-ex">
            ${["Brisk Walking","Running (8 km/h)","Push-ups","Bodyweight Squats","Yoga Flow (Vinyasa)","Jump Rope","Cycling (moderate)","Plank"].map(n=>`<button class="chip" data-qex="${n}">${n}</button>`).join("")}
          </div>
          <button class="btn btn-primary btn-block mt12" id="open-full-log">🏋️ Full workout log</button>
        </div>
        <div class="card">
          <div class="card-title"><span class="t">📈 This Week</span></div>
          <div id="fit-week-chart"></div>
          <div class="small muted mt8" id="fit-week-summary"></div>
        </div>
      </div>
    </div>`;
    document.querySelectorAll("[data-qex]").forEach(b => b.onclick = () => {
      const ex = EXERCISE_DB.find(e=>e.name===b.dataset.qex);
      Fitness.openWorkoutModal(ex);
    });
    document.getElementById("open-full-log").onclick = () => Fitness.openWorkoutModal();
    document.querySelectorAll("[data-delworkout]").forEach(b => b.onclick = async () => {
      if (await Modal.confirm("Delete workout?","This entry will be removed from your history.")){
        await Store.remove("workouts", b.dataset.delworkout);
        U.toast("success","Deleted 🗑️","Workout removed.");
      }
    });

    const days = U.lastNDays(7);
    const burns = days.map(d=>Math.round(this.dayBurned(uid,d)));
    FX.bar(document.getElementById("fit-week-chart"), {labels:days.map(d=>U.dayLabel(d)), values:burns, color:"#FFD97A", height:160});
    const wCount = days.reduce((a,d)=>a+this.dayWorkouts(uid,d).length,0);
    document.getElementById("fit-week-summary").innerHTML =
      `${wCount} workout${wCount===1?"":"s"} · <b>${burns.reduce((a,b)=>a+b,0).toLocaleString()}</b> kcal burned this week`;
  },

  openWorkoutModal(presetEx){
    const prof = Auth.profile;
    const w = prof.weight || 70;
    Modal.open({
      title:"🏋️ Log Workout",
      body:`
        <div class="field"><span class="lbl">Exercise *</span>
          <div class="search-wrap"><span class="s-ico">🔍</span>
            <input id="wo-search" placeholder="Search ${EXERCISE_DB.length} exercises…" autocomplete="off" value="${presetEx?U.esc(presetEx.name):""}">
            <div class="autocomplete hidden" id="wo-ac"></div>
          </div>
          <div id="wo-selected" class="mt8"></div>
        </div>
        <div class="form-row">
          <div class="field"><span class="lbl">Duration (min) *</span><input type="number" id="wo-dur" min="1" max="600" value="30" inputmode="numeric"></div>
          <div class="field"><span class="lbl">Intensity</span>
            <select id="wo-int"><option value="low">Low 😌</option><option value="medium" selected>Medium 🙂</option><option value="high">High 🔥</option></select></div>
        </div>
        <div class="form-row">
          <div class="field"><span class="lbl">Sets (optional)</span><input type="number" id="wo-sets" min="0" placeholder="3"></div>
          <div class="field"><span class="lbl">Reps (optional)</span><input type="number" id="wo-reps" min="0" placeholder="12"></div>
        </div>
        <div class="form-row">
          <div class="field"><span class="lbl">Weight used (kg)</span><input type="number" id="wo-weight" min="0" step="0.5" placeholder="20"></div>
          <div class="field"><span class="lbl">Date</span><input type="date" id="wo-date" value="${U.todayStr()}" max="${U.todayStr()}"></div>
        </div>
        <div class="field"><span class="lbl">Notes</span><input id="wo-notes" placeholder="Felt strong, increased weight…"></div>
        <div class="ob-result" id="wo-est"><div class="ob-result-big">🔥 <span id="wo-est-val">—</span> kcal est.</div>
          <div class="ob-result-sub" id="wo-est-sub">Select an exercise to see estimated burn (based on your ${w} kg weight)</div></div>`,
      actions:[{label:"Cancel",cls:"btn-ghost"},{label:"Save workout ✓",cls:"btn-primary",onClick:async()=>{
        const sel = Fitness._selEx || presetEx;
        const name = sel ? sel.name : document.getElementById("wo-search").value.trim();
        const dur = parseInt(document.getElementById("wo-dur").value);
        if (!name) { U.toast("warn","Exercise required","Search or type an exercise name."); return false; }
        if (!dur || dur < 1){ U.toast("warn","Duration required","Enter at least 1 minute."); return false; }
        const intensity = document.getElementById("wo-int").value;
        const met = sel ? sel.met : 5;
        const cal = Math.round(estimateCaloriesBurned(met * Fitness.intensityFactor(intensity), dur, w));
        await Store.add("workouts", {
          user_id:Auth.uid, date:document.getElementById("wo-date").value||U.todayStr(),
          exercise_name:name, category: sel?sel.category:"custom", met,
          duration:dur, intensity, calories_burned:cal,
          sets:+document.getElementById("wo-sets").value||0, reps:+document.getElementById("wo-reps").value||0,
          weight:+document.getElementById("wo-weight").value||0,
          notes:document.getElementById("wo-notes").value.trim(), created:Date.now()
        });
        U.toast("success","Workout logged 💪",`${name} · ${dur} min · ~${cal} kcal burned.`);
        Notifier.maybeRemindAfterLog("workout");
        Achievements.check();
        Social.autoSharePrompt("workout", {name, dur, cal});
      }}]
    });

    const selBox = () => {
      const sel = Fitness._selEx;
      document.getElementById("wo-selected").innerHTML = sel ?
        `<div class="pill sky">${U.catEmoji(sel.category)} ${U.esc(sel.name)} · MET ${sel.met} · ${sel.difficulty}</div>` :
        (document.getElementById("wo-search").value.trim() ? `<div class="pill yellow">Custom exercise — estimated with MET 5.0</div>`:"");
      Fitness.updateEst();
    };
    Fitness._selEx = presetEx || null;
    selBox();

    const inp = document.getElementById("wo-search"), ac = document.getElementById("wo-ac");
    let results = [];
    inp.oninput = () => {
      Fitness._selEx = null; selBox();
      const q = inp.value.trim().toLowerCase();
      if (!q){ ac.classList.add("hidden"); return; }
      results = EXERCISE_DB.filter(e=>e.name.toLowerCase().includes(q)||e.muscles.toLowerCase().includes(q)||e.category.includes(q)).slice(0,10);
      ac.innerHTML = results.map((e,i)=>`<div class="ac-item" data-i="${i}"><span>${U.catEmoji(e.category)} ${U.esc(e.name)} <span class="ac-cat">· ${e.category}</span></span><span class="ac-kcal">MET ${e.met}</span></div>`).join("")
        || `<div class="ac-item"><span>No match — will be logged as a custom exercise.</span></div>`;
      ac.classList.remove("hidden");
      ac.querySelectorAll("[data-i]").forEach(el=>el.onclick=()=>{
        Fitness._selEx = results[+el.dataset.i];
        inp.value = Fitness._selEx.name; ac.classList.add("hidden"); selBox();
      });
    };
    document.getElementById("wo-dur").oninput = () => Fitness.updateEst();
    document.getElementById("wo-int").onchange = () => Fitness.updateEst();
  },

  updateEst(){
    const sel = Fitness._selEx;
    const dur = parseInt(document.getElementById("wo-dur")?.value)||0;
    const int = document.getElementById("wo-int")?.value||"medium";
    const w = Auth.profile.weight||70;
    const val = document.getElementById("wo-est-val");
    if (!val) return;
    if (dur>0){
      const cal = Math.round(estimateCaloriesBurned((sel?sel.met:5)*this.intensityFactor(int), dur, w));
      val.textContent = cal.toLocaleString();
    } else val.textContent = "—";
  },

  /* ================= EXERCISE DB ================= */
  renderExercises(c){
    const draw = () => {
      const q = Fitness.exQuery.toLowerCase();
      let list = EXERCISE_DB;
      if (Fitness.exCat !== "all") list = list.filter(e=>e.category===Fitness.exCat);
      if (q) list = list.filter(e=>e.name.toLowerCase().includes(q)||e.muscles.toLowerCase().includes(q));
      document.getElementById("ex-list").innerHTML = list.map(e=>{
        const cal30 = estimateCaloriesBurned(e.met, 30, Auth.profile.weight||70);
        return `<div class="list-row">
          <div class="lr-ico">${U.catEmoji(e.category)}</div>
          <div class="lr-body"><b>${U.esc(e.name)}</b><span>${U.esc(e.muscles)} · ${e.difficulty} · MET ${e.met}</span></div>
          <div class="lr-right">${cal30}<small>kcal/30min</small></div>
          <button class="btn btn-sm btn-ghost" data-exinfo="${e.id}">ℹ️</button>
          <button class="btn btn-sm btn-primary" data-exlog="${e.id}">+ Log</button>
        </div>`;}).join("");
      document.querySelectorAll("[data-exinfo]").forEach(b=>b.onclick=()=>{
        const e = EXERCISE_DB.find(x=>x.id===b.dataset.exinfo);
        Modal.open({title:`${U.catEmoji(e.category)} ${U.esc(e.name)}`, body:`
          <div class="flex flex-wrap mb12" style="gap:6px">
            <span class="pill sky">${U.capitalize(e.category)}</span>
            <span class="pill yellow">${U.capitalize(e.difficulty)}</span>
            <span class="pill">MET ${e.met}</span>
            <span class="pill green">~${estimateCaloriesBurned(e.met,30,Auth.profile.weight||70)} kcal / 30 min</span>
          </div>
          <p class="small muted mb12"><b>Muscles:</b> ${U.esc(e.muscles)}</p>
          <p style="font-size:14px">${U.esc(e.description)}</p>`,
          actions:[{label:"Close",cls:"btn-ghost"},{label:"🏋️ Log this",cls:"btn-primary",onClick:()=>Fitness.openWorkoutModal(e)}]});
      });
      document.querySelectorAll("[data-exlog]").forEach(b=>b.onclick=()=>{
        Fitness.openWorkoutModal(EXERCISE_DB.find(x=>x.id===b.dataset.exlog));
      });
    };
    c.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="t">📖 Exercise Database</span><span class="pill sky">${EXERCISE_DB.length} exercises</span></div>
        <div class="search-wrap mb12"><span class="s-ico">🔍</span><input id="ex-search" placeholder="Search by name or muscle group…"></div>
        <div class="chips mb12">
          ${["all"].concat(EXERCISE_CATEGORIES).map(x=>`<button class="chip ${Fitness.exCat===x?'sel':''}" data-excat="${x}">${x==="all"?"All ✨":U.catEmoji(x)+" "+U.capitalize(x)}</button>`).join("")}
        </div>
        <div id="ex-list"></div>
      </div>`;
    document.getElementById("ex-search").oninput = e => { Fitness.exQuery = e.target.value; draw(); };
    document.querySelectorAll("[data-excat]").forEach(b=>b.onclick=()=>{Fitness.exCat=b.dataset.excat;Fitness.render();});
    draw();
  },

  /* ================= STEPS ================= */
  stepStreak(uid){
    const goal = Auth.profile.daily_step_goal || DEFAULTS.stepGoal;
    let streak = 0, d = U.todayStr();
    // streak counts today only if goal already met
    for (let i=0;i<400;i++){
      const s = this.daySteps(uid, d);
      if (s >= goal) { streak++; d = U.dateOffsetFrom(d,-1); }
      else if (i===0) { d = U.dateOffsetFrom(d,-1); } // today not yet complete — check yesterday
      else break;
    }
    return streak;
  },

  renderSteps(c){
    const uid = Auth.uid, prof = Auth.profile;
    const goal = prof.daily_step_goal || DEFAULTS.stepGoal;
    const today = this.daySteps(uid, U.todayStr());
    const dist = +(today*DEFAULTS.stepLengthKm).toFixed(2);
    const days = U.lastNDays(7);
    const vals = days.map(d=>this.daySteps(uid,d));
    const avg = Math.round(vals.reduce((a,b)=>a+b,0)/7);
    const streak = this.stepStreak(uid);
    const maxSteps = Math.max(0, ...Store.listFor("step_logs",uid).map(l=>l.steps||0));
    const pct = Math.min(100, Math.round(today/goal*100));
    const milestones = [[5000,"👟"],[10000,"🚶"],[15000,"🌟"]];

    c.innerHTML = `
    <div class="grid grid-23">
      <div class="card">
        <div class="card-title"><span class="t">👟 Step Counting</span>
          <span class="pill sky">Goal: ${goal.toLocaleString()}/day</span></div>
        <div class="flex" style="gap:26px;flex-wrap:wrap;justify-content:center;padding:8px 0">
          ${FX.ringHtml(today, goal, "#87CEEB", today.toLocaleString(), "steps today", 150)}
          <div class="grid" style="gap:10px;flex:1;min-width:220px">
            <div class="grid grid-3" style="gap:10px">
              <div class="card center" style="padding:12px"><div class="stat-big" style="font-size:19px">${dist}</div><div class="stat-label">km today</div></div>
              <div class="card center" style="padding:12px"><div class="stat-big" style="font-size:19px">${Math.round(today*DEFAULTS.calPerStep)}</div><div class="stat-label">kcal est.</div></div>
              <div class="card center" style="padding:12px"><div class="stat-big" style="font-size:19px">🔥${streak}</div><div class="stat-label">day streak</div></div>
            </div>
            <div class="pbar ${pct>=100?'green':pct>=60?'yellow':''}" style="height:13px"><div style="width:${pct}%"></div></div>
            <div class="flex-between small muted"><span>${pct}% of goal</span><span>${Math.max(0,goal-today).toLocaleString()} to go</span></div>
            <button class="btn btn-primary" id="steps-input-btn">✍️ Log / update today's steps</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="t">🏅 Milestones</span></div>
        ${milestones.map(m=>{
          const done = maxSteps >= m[0];
          return `<div class="list-row"><div class="lr-ico" style="${done?"background:var(--yellow)":""}">${done?m[1]:"🔒"}</div>
            <div class="lr-body"><b>${m[0].toLocaleString()} steps in a day</b><span>${done?"Achieved! 🎉":"Best: "+maxSteps.toLocaleString()}</span></div>
            <span class="pill ${done?"green":""}">${done?"Unlocked":Math.round(Math.min(100,maxSteps/m[0]*100))+"%"}</span></div>`;
        }).join("")}
        <hr class="divider">
        <div class="small muted">7-day average: <b>${avg.toLocaleString()}</b> steps/day</div>
      </div>
    </div>
    <div class="card mt16">
      <div class="card-title"><span class="t">📊 Weekly Steps</span></div>
      <div id="steps-chart"></div>
    </div>`;

    FX.bar(document.getElementById("steps-chart"), {labels:days.map(d=>U.dayLabel(d)), values:vals, color:"#8FD694", height:190, goal});

    const openInput = () => {
      const cur = this.daySteps(uid, U.todayStr());
      Modal.open({
        title:"✍️ Log Steps",
        body:`<div class="field"><span class="lbl">Steps for ${U.prettyDate(U.todayStr())}</span>
          <input type="number" id="step-val" min="0" max="100000" value="${cur||""}" placeholder="e.g. 8500" inputmode="numeric"></div>
          <p class="small muted">Already logged today: ${cur.toLocaleString()} steps. Saving replaces today's count.</p>`,
        actions:[{label:"Cancel",cls:"btn-ghost"},{label:"Save steps ✓",cls:"btn-primary",onClick:async()=>{
          const v = parseInt(document.getElementById("step-val").value);
          if (isNaN(v) || v < 0) { U.toast("warn","Invalid steps","Enter a number ≥ 0."); return false; }
          const existing = Store.dayLogs("step_logs", uid, U.todayStr())[0];
          const payload = {user_id:uid, date:U.todayStr(), steps:v, distance_km:+(v*DEFAULTS.stepLengthKm).toFixed(2), created:Date.now()};
          if (existing) await Store.update("step_logs", existing.id, payload);
          else await Store.add("step_logs", payload);
          U.toast("success","Steps saved 👟",`${v.toLocaleString()} steps · ${(v*DEFAULTS.stepLengthKm).toFixed(2)} km`);
          if (v >= (Auth.profile.daily_step_goal||10000)) U.confetti();
          Achievements.check();
          Challenges.updateDailyProgress();
        }}]
      });
    };
    document.getElementById("steps-input-btn").onclick = openInput;
  },

  openStepsModal(){ Fitness.tab="steps"; if (App.current==="fitness") Fitness.render(); else App.navigate("fitness");
    setTimeout(()=>{ const b=document.getElementById("steps-input-btn"); if(b) b.click(); },150); },

  /* ================= ACTIVITY ================= */
  renderActivity(c){
    const uid = Auth.uid;
    const workouts = Store.listFor("workouts", uid);
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const firstDow = new Date(y,m,1).getDay();
    const daysInMonth = new Date(y,m+1,0).getDate();
    const byDate = {};
    workouts.forEach(w => { byDate[w.date] = (byDate[w.date]||0) + (w.calories_burned||0); });

    let cells = "";
    for (let i=0;i<firstDow;i++) cells += `<div class="cal-cell empty"></div>`;
    for (let d=1; d<=daysInMonth; d++){
      const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const burn = byDate[ds]||0;
      const lvl = burn>500?3:burn>250?2:burn>0?1:0;
      const isToday = ds===U.todayStr();
      cells += `<div class="cal-cell ${lvl?("l"+lvl):""} ${isToday?"today":""}" title="${ds}: ${burn} kcal">${d}</div>`;
    }

    // most performed
    const counts = {};
    workouts.forEach(w => { counts[w.exercise_name] = (counts[w.exercise_name]||0)+1; });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);

    const days7 = U.lastNDays(7);
    const active7 = days7.filter(d=>this.dayWorkouts(uid,d).length>0).length;
    const burned7 = Math.round(days7.reduce((a,d)=>a+this.dayBurned(uid,d),0));
    const consumed7 = Math.round(days7.reduce((a,d)=>a+Diet.dayTotals(uid,d).calories,0));
    const mins7 = days7.reduce((a,d)=>a+this.dayWorkouts(uid,d).reduce((x,w)=>x+(w.duration||0),0),0);

    c.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title"><span class="t">📅 ${U.monthName()} Workout Calendar</span>
          <span class="pill sky">${workouts.filter(w=>w.date&&w.date.startsWith(U.todayStr().slice(0,7))).length} this month</span></div>
        <div class="cal-grid mb8">${["S","M","T","W","T","F","S"].map(d=>`<div class="cal-dow">${d}</div>`).join("")}</div>
        <div class="cal-grid">${cells}</div>
        <div class="fx-legend mt8"><span><i style="background:rgba(135,206,235,.3)"></i>light</span><span><i style="background:rgba(135,206,235,.55)"></i>moderate</span><span><i style="background:rgba(135,206,235,.85)"></i>intense</span></div>
      </div>
      <div class="grid" style="gap:16px">
        <div class="card">
          <div class="card-title"><span class="t">⚡ Activity Summary (7 days)</span></div>
          <div class="grid grid-2" style="gap:10px">
            <div class="card" style="padding:12px"><div class="stat-big">${active7}</div><div class="stat-label">active days · ${7-active7} rest day(s)</div></div>
            <div class="card" style="padding:12px"><div class="stat-big">${mins7}</div><div class="stat-label">active minutes</div></div>
            <div class="card" style="padding:12px"><div class="stat-big">${burned7.toLocaleString()}</div><div class="stat-label">kcal burned</div></div>
            <div class="card" style="padding:12px"><div class="stat-big">${consumed7.toLocaleString()}</div><div class="stat-label">kcal consumed</div></div>
          </div>
          <hr class="divider">
          <div class="small muted">7-day balance: <b style="color:${consumed7-burned7<=Auth.profile.daily_calorie_target*7-consumed7+consumed7?'inherit':'inherit'}">${(consumed7-burned7>0?"+":"")+(consumed7-burned7).toLocaleString()} kcal net</b></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="t">🏆 Most Performed</span></div>
          ${top.length?top.map(([n,cnt])=>`<div class="list-row"><div class="lr-ico">💪</div>
            <div class="lr-body"><b>${U.esc(n)}</b><span>${cnt} session${cnt>1?"s":""}</span></div></div>`).join("")
            :`<div class="empty"><span>Log workouts to see your favorites.</span></div>`}
        </div>
      </div>
    </div>
    <div class="card mt16">
      <div class="card-title"><span class="t">🔥 Calories Burned vs Consumed (7 days)</span></div>
      <div id="burn-consume-chart"></div>
    </div>`;

    FX.line(document.getElementById("burn-consume-chart"), {
      labels: days7.map(d=>U.dayLabel(d)),
      series:[
        {name:"Burned", data:days7.map(d=>Math.round(this.dayBurned(uid,d))), color:"#FFD97A"},
        {name:"Consumed", data:days7.map(d=>Math.round(Diet.dayTotals(uid,d).calories)), color:"#87CEEB"}
      ], height:220
    });
  }
};
