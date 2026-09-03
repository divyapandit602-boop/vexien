/* ============================================================
   VEXIEN — Challenges & Social (social.js)
   Module 6: Challenges · Module 7: Social & Community
   ============================================================ */

/* ================= CHALLENGES ================= */
const Challenges = {
  myChallenges(uid){
    return Store.listFor("user_challenges", uid).filter(uc => !uc.dummy).map(uc => {
      const tpl = CHALLENGE_TEMPLATES.find(c=>c.id===uc.challenge_id);
      return tpl ? Object.assign({}, uc, {tpl}) : null;
    }).filter(Boolean);
  },

  dayMet(tpl, uid, date, prof){
    const target = tpl.target;
    switch(tpl.metric){
      case "steps": return Fitness.daySteps(uid, date) >= target;
      case "workout": {
        const ws = Fitness.dayWorkouts(uid, date);
        return ws.some(w => !tpl.workoutFilter || w.exercise_name.toLowerCase().includes(tpl.workoutFilter));
      }
      case "calorie_under": {
        const inCal = Diet.dayTotals(uid, date).calories;
        return inCal > 0 && inCal <= (prof.daily_calorie_target || 2000);
      }
      case "deficit": {
        const inCal = Diet.dayTotals(uid, date).calories;
        const burned = Fitness.dayBurned(uid, date);
        const maint = Profile.calcMaintenance(prof);
        return inCal > 0 && (inCal - burned) <= (maint - target);
      }
      case "water": return Weight.waterFor(uid, date) >= target;
      case "any_log":
        return Diet.dayMeals(uid, date).length > 0 || Fitness.dayWorkouts(uid, date).length > 0 ||
               Fitness.daySteps(uid, date) > 0 || Weight.entryFor(uid, date) || Weight.waterFor(uid, date) > 0;
    }
    return false;
  },

  todayMetricProgress(tpl, uid, prof){
    const d = U.todayStr();
    switch(tpl.metric){
      case "steps": return {cur:Fitness.daySteps(uid,d), goal:tpl.target, unit:"steps"};
      case "workout": return {cur:Fitness.dayWorkouts(uid,d).length, goal:1, unit:"workouts"};
      case "calorie_under": return {cur:Math.round(Diet.dayTotals(uid,d).calories), goal:prof.daily_calorie_target||2000, unit:"kcal (stay under)", invert:true};
      case "deficit": {
        const net = Math.round(Diet.dayTotals(uid,d).calories - Fitness.dayBurned(uid,d));
        const maint = Profile.calcMaintenance(prof);
        return {cur:net, goal:maint - tpl.target, unit:"kcal net (stay under)", invert:true};
      }
      case "water": return {cur:Weight.waterFor(uid,d), goal:tpl.target, unit:"glasses"};
      case "any_log": {
        const n = Diet.dayMeals(uid,d).length + Fitness.dayWorkouts(uid,d).length + (Fitness.daySteps(uid,d)>0?1:0);
        return {cur:n, goal:1, unit:"logs"};
      }
    }
    return {cur:0, goal:1, unit:""};
  },

  evaluate(uc, tpl, uid, prof){
    const start = new Date(uc.start_date + "T00:00:00");
    const end = new Date(U.dateOffsetFrom(uc.start_date, tpl.days-1) + "T00:00:00");
    const now = new Date(U.todayStr() + "T00:00:00");
    const last = now < end ? now : end;
    let met = 0, elapsed = 0;
    for (let d = new Date(start); d <= last; d.setDate(d.getDate()+1)){
      elapsed++;
      if (this.dayMet(tpl, uid, U.fmtDate(d), prof)) met++;
    }
    const pct = Math.min(100, Math.round(met / tpl.days * 100));
    const daysLeft = Math.max(0, Math.ceil((end - now)/86400000));
    let eta = "—";
    if (met > 0 && !uc.completed){
      const pace = met / Math.max(1, elapsed);
      const remaining = tpl.days - met;
      const daysNeeded = Math.ceil(remaining / Math.max(0.05, pace));
      eta = U.prettyDate(U.dateOffset(daysNeeded));
    }
    return {met, elapsed, pct, daysLeft, completed: met >= tpl.days, eta,
      participants: demoParticipantCount(tpl.id) + Store.list("user_challenges").filter(x=>!x.dummy && x.challenge_id===tpl.id).length};
  },

  async updateDailyProgress(){
    const uid = Auth.uid, prof = Auth.profile;
    for (const uc of this.myChallenges(uid)){
      if (uc.completed) continue;
      const ev = this.evaluate(uc, uc.tpl, uid, prof);
      if (ev.pct !== uc.progress_percentage || (ev.completed && !uc.completed)){
        await Store.update("user_challenges", uc.id, {
          progress_percentage: ev.pct,
          completed: ev.completed,
          completed_date: ev.completed && !uc.completed ? U.todayStr() : (uc.completed_date||null)
        });
        if (ev.completed && !uc.completed){
          U.toast("success","Challenge complete! 🥇", uc.tpl.name + " — you did it!");
          U.confetti();
          Notifier.add("🥇","Challenge completed!", `${uc.tpl.name}: ${uc.tpl.reward}`);
          Achievements.check();
        }
      }
    }
  },

  async join(tpl){
    const uid = Auth.uid;
    const existing = this.myChallenges(uid).find(uc=>uc.challenge_id===tpl.id);
    if (existing){ U.toast("warn","Already joined","You're already in this challenge."); return; }
    await Store.add("user_challenges", {
      user_id:uid, challenge_id:tpl.id, start_date:U.todayStr(),
      progress_percentage:0, completed:false
    });
    U.toast("success","Challenge joined 🎯", tpl.name + " starts today!");
    Notifier.add("🎯","Challenge started", `${tpl.name} — ${tpl.days} days. Good luck!`);
    await this.updateDailyProgress();
    App.rerender();
  },

  async leave(ucId){
    if (await Modal.confirm("Leave challenge?","Your progress in this challenge will be lost.")){
      await Store.remove("user_challenges", ucId);
      U.toast("success","Left challenge","Progress removed.");
    }
  },

  /* ---------- RENDER (challenges view) ---------- */
  renderChallenges(){
    const uid = Auth.uid, prof = Auth.profile;
    const mine = this.myChallenges(uid);
    const joinedIds = mine.map(m=>m.challenge_id);
    const available = CHALLENGE_TEMPLATES.filter(t=>!joinedIds.includes(t.id));
    const root = document.getElementById("challenges-root");

    root.innerHTML = `
      <div class="page-head">
        <div><h2>Challenges</h2><p>Structured goals with daily tracking and rewards.</p></div>
        <span class="pill yellow">🏅 ${mine.filter(m=>m.completed).length} completed</span>
      </div>

      ${mine.length ? `
      <h3 class="mb12" style="font-size:16px">🔥 Active Challenges</h3>
      <div class="ch-grid mb16">
        ${mine.map(uc=>{
          const ev = this.evaluate(uc, uc.tpl, uid, prof);
          const tp = this.todayMetricProgress(uc.tpl, uid, prof);
          const todayOk = tp.invert ? (tp.cur>0 && tp.cur<=tp.goal) : tp.cur>=tp.goal;
          const todayLine = todayOk
            ? "✅ Today's goal met — keep it up!"
            : "Today: " + (tp.invert
                ? tp.cur.toLocaleString() + " / ≤" + tp.goal.toLocaleString()
                : tp.cur.toLocaleString() + " / " + tp.goal.toLocaleString()) + " " + tp.unit;
          return `<div class="ch-card" style="${uc.completed?'border-color:var(--yellow);background:linear-gradient(160deg,var(--card),rgba(255,235,153,.18))':''}">
            <div class="flex-between">
              <div class="ch-emoji">${uc.tpl.emoji}</div>
              ${uc.completed ? `<span class="pill yellow">🥇 Completed!</span>` :
                ev.daysLeft>0 ? `<span class="pill sky">${ev.daysLeft} day${ev.daysLeft===1?"":"s"} left</span>` : `<span class="pill red">Ended</span>`}
            </div>
            <h4>${U.esc(uc.tpl.name)}</h4>
            <p>${U.esc(uc.tpl.description)}</p>
            <div>
              <div class="pbar-row"><span>Progress</span><b>${ev.pct}%</b></div>
              <div class="pbar ${ev.pct>=100?'green':''}"><div style="width:${ev.pct}%"></div></div>
            </div>
            <div class="small muted">✅ ${ev.met}/${uc.tpl.days} days met · started ${U.prettyDate(uc.start_date)}</div>
            ${!uc.completed && ev.daysLeft>0 ? `<div class="small ${todayOk?'':'muted'}" style="font-weight:600">${todayLine}</div>` : ""}
            <div class="ch-stats">
              <span class="pill">${U.capitalize(uc.tpl.difficulty)}</span>
              <span class="pill">👥 ${ev.participants} in</span>
              <span class="pill">#${Math.max(1, Math.round(ev.participants*(1-ev.pct/100)*(0.4+U.seededRand(uid+uc.tpl.id)*0.6))+1)} on board</span>
            </div>
            ${!uc.completed?`<div class="flex" style="gap:8px;margin-top:2px">
              <button class="btn btn-sm btn-ghost" data-chrules="${uc.tpl.id}">Rules</button>
              <button class="btn btn-sm btn-danger" data-chleave="${uc.id}">Leave</button>
              <button class="btn btn-sm btn-yellow" data-chshare="${uc.tpl.id}">📣 Share</button>
            </div>`:`<button class="btn btn-sm btn-yellow" data-chshare="${uc.tpl.id}">📣 Share achievement</button>`}
          </div>`;}).join("")}
      </div>` : `
      <div class="card mb16"><div class="empty"><div class="e-ico">🎯</div><b>No active challenges</b>
        <span>Join one below — accountability makes goals stick.</span></div></div>`}

      <h3 class="mb12" style="font-size:16px">🗂️ Available Challenges</h3>
      <div class="ch-grid">
        ${available.map(t=>`
          <div class="ch-card">
            <div class="flex-between"><div class="ch-emoji">${t.emoji}</div>
              <span class="pill ${t.difficulty==='easy'?'green':t.difficulty==='medium'?'yellow':'red'}">${U.capitalize(t.difficulty)}</span></div>
            <h4>${U.esc(t.name)}</h4>
            <p>${U.esc(t.description)}</p>
            <div class="ch-stats">
              <span class="pill sky">📅 ${t.days} days</span>
              <span class="pill">🏷️ ${U.esc(t.type)}</span>
              <span class="pill">👥 ${demoParticipantCount(t.id)} joined</span>
            </div>
            <div class="small muted">🎁 ${U.esc(t.reward)}</div>
            <div class="flex" style="gap:8px">
              <button class="btn btn-sm btn-ghost" data-chrules="${t.id}">Rules</button>
              <button class="btn btn-sm btn-primary" data-chjoin="${t.id}">Join challenge</button>
            </div>
          </div>`).join("") || `<div class="empty"><span>You've joined every challenge — legendary! 🏆</span></div>`}
      </div>`;

    root.querySelectorAll("[data-chjoin]").forEach(b=>b.onclick=()=>Challenges.join(CHALLENGE_TEMPLATES.find(t=>t.id===b.dataset.chjoin)));
    root.querySelectorAll("[data-chleave]").forEach(b=>b.onclick=()=>Challenges.leave(b.dataset.chleave));
    root.querySelectorAll("[data-chrules]").forEach(b=>b.onclick=()=>{
      const t = CHALLENGE_TEMPLATES.find(x=>x.id===b.dataset.chrules);
      Modal.open({title:`${t.emoji} ${U.esc(t.name)} — Rules`, body:`
        <p class="small muted mb12">${U.esc(t.description)}</p>
        <ul style="padding-left:18px;font-size:14px;line-height:2">${t.rules.map(r=>`<li>${U.esc(r)}</li>`).join("")}</ul>
        <div class="ob-result mt12"><b>🎁 Reward:</b> ${U.esc(t.reward)}<br><span class="small">Difficulty: ${U.capitalize(t.difficulty)} · Duration: ${t.days} days</span></div>`,
        actions:[{label:"Close",cls:"btn-ghost"}]});
    });
    root.querySelectorAll("[data-chshare]").forEach(b=>b.onclick=()=>{
      const t = CHALLENGE_TEMPLATES.find(x=>x.id===b.dataset.chshare);
      Social.shareDialog("milestone", `I'm taking on the "${t.name}" ${t.emoji} challenge on VEXIEN! ${t.days} days of ${t.metric==="steps"?"steps":"consistency"} — hold me accountable 💪`);
    });
  }
};

/* ================= SOCIAL ================= */
const Social = {
  tab: "feed",
  lbScope: "friends",
  lbMetric: "steps",
  lbRange: "week",

  friendsOf(uid){
    return Store.listFor("social_connections", uid).filter(c=>c.status==="accepted");
  },
  pendingOf(uid){
    return Store.listFor("social_connections", uid).filter(c=>c.status==="pending_incoming"||c.status==="pending_outgoing");
  },

  userStat(uid, metric, range){
    const days = range==="week" ? U.lastNDays(7) : U.lastNDays(30);
    if (metric==="steps") return days.reduce((a,d)=>a+Fitness.daySteps(uid,d),0);
    if (metric==="burned") return Math.round(days.reduce((a,d)=>a+Fitness.dayBurned(uid,d),0));
    if (metric==="workouts") return days.reduce((a,d)=>a+Fitness.dayWorkouts(uid,d).length,0);
    return 0;
  },

  /* ---------- RENDER ---------- */
  render(){
    const root = document.getElementById("social-root");
    const tabs = [["feed","📰 Feed"],["friends","👥 Friends"],["leaderboard","🏅 Leaderboard"],["compare","⚔️ Compare"]];
    root.innerHTML = `
      <div class="page-head">
        <div><h2>Social &amp; Community</h2><p>Fitness is better together.</p></div>
        <button class="btn btn-primary" id="soc-new-post">📣 Share something</button>
      </div>
      <div class="tabs">${tabs.map(t=>`<button class="tab ${Social.tab===t[0]?'active':''}" data-stab="${t[0]}">${t[1]}</button>`).join("")}</div>
      <div id="soc-content"></div>`;
    root.querySelectorAll("[data-stab]").forEach(b=>b.onclick=()=>{Social.tab=b.dataset.stab;Social.render();});
    document.getElementById("soc-new-post").onclick = () => Social.shareDialog("text","");
    const c = document.getElementById("soc-content");
    ({feed:()=>this.renderFeed(c), friends:()=>this.renderFriends(c),
      leaderboard:()=>this.renderLeaderboard(c), compare:()=>this.renderCompare(c)})[this.tab]();
  },

  /* ================= FEED ================= */
  async renderFeed(c){
    const uid = Auth.uid;
    const friends = this.friendsOf(uid).map(f=>f.friend_id);
    let posts = Store.list("social_posts").filter(p => p.user_id===uid || friends.includes(p.user_id));
    posts.sort((a,b)=>(b.created||0)-(a.created||0));
    posts = posts.slice(0,30);
    const typeIco = {achievement:"🏆", workout:"🏋️", weight:"⚖️", milestone:"🎉", text:"💬", steps:"👟"};

    c.innerHTML = `
      <div class="card mb16">
        <div class="card-title"><span class="t">⚡ Quick Share</span></div>
        <div class="chips">
          <button class="chip" data-qs="workout">🏋️ Last workout</button>
          <button class="chip" data-qs="steps">👟 Today's steps</button>
          <button class="chip" data-qs="weight">⚖️ Weight update</button>
          <button class="chip" data-qs="achievement">🏆 Latest badge</button>
        </div>
      </div>
      ${posts.length ? posts.map(p=>{
        const mine = p.user_id===uid;
        const liked = (p.likes||[]).includes(uid);
        const uname = mine ? (Auth.profile.name||"You") : (p.user_name||"Friend");
        const avatar = mine ? (Auth.profile.profile_picture_url?`<img src="${Auth.profile.profile_picture_url}">`:(Auth.profile.name||"V")[0].toUpperCase()) : (p.avatar||"🙂");
        return `<div class="post" data-post="${p.id}">
          <div class="post-head">
            <div class="post-avatar">${avatar}</div>
            <div><b>${U.esc(uname)}</b><span>${U.timeAgo(p.created_date||p.created)} ${mine?"· you":""}</span></div>
            <span class="post-type">${typeIco[p.post_type]||"💬"}</span>
          </div>
          <div class="post-content">${U.esc(p.content)}</div>
          <div class="post-actions">
            <button data-like="${p.id}" class="${liked?'liked':''}">❤️ ${(p.likes||[]).length||""}</button>
            <button data-cmt="${p.id}">💬 ${(p.comments||[]).length||""}</button>
            ${mine?`<button data-delpost="${p.id}">🗑️ Delete</button>`:""}
          </div>
          <div class="comments-wrap">${(p.comments||[]).map(cm=>`
            <div class="comment"><div class="comment-body"><b>${U.esc(cm.user_name||"Friend")}:</b> ${U.esc(cm.text)}</div></div>`).join("")}</div>
          <div class="comment-input">
            <input placeholder="Write a comment…" data-cin="${p.id}">
            <button class="btn btn-sm btn-primary" data-csend="${p.id}">Send</button>
          </div>
        </div>`;}).join("")
      : `<div class="card"><div class="empty"><div class="e-ico">📰</div><b>Your feed is quiet</b><span>Share a workout, add friends, or join a challenge!</span></div></div>`}`;

    c.querySelectorAll("[data-qs]").forEach(b=>b.onclick=()=>Social.quickShare(b.dataset.qs));
    c.querySelectorAll("[data-like]").forEach(b=>b.onclick=async()=>{
      const p = Store.get("social_posts", b.dataset.like);
      let likes = p.likes||[];
      likes = likes.includes(uid) ? likes.filter(x=>x!==uid) : likes.concat([uid]);
      await Store.update("social_posts", p.id, {likes});
      Social.render();
    });
    c.querySelectorAll("[data-csend]").forEach(b=>b.onclick=async()=>{
      const inp = c.querySelector(`[data-cin="${b.dataset.csend}"]`);
      const text = inp.value.trim();
      if (!text) return;
      const p = Store.get("social_posts", b.dataset.csend);
      const comments = (p.comments||[]).concat([{user_id:uid, user_name:Auth.profile.name||"You", text, created:Date.now()}]);
      await Store.update("social_posts", p.id, {comments});
      inp.value = "";
      U.toast("success","Comment added 💬");
      Social.render();
    });
    c.querySelectorAll("[data-cin]").forEach(inp=>inp.onkeydown=e=>{
      if (e.key==="Enter"){ const b=c.querySelector(`[data-csend="${inp.dataset.cin}"]`); if(b) b.click(); }
    });
    c.querySelectorAll("[data-delpost]").forEach(b=>b.onclick=async()=>{
      if (await Modal.confirm("Delete post?","This cannot be undone.")){
        await Store.remove("social_posts", b.dataset.delpost);
        U.toast("success","Post deleted");
      }
    });
  },

  quickShare(type){
    const uid = Auth.uid, today = U.todayStr();
    if (type==="workout"){
      const ws = Fitness.dayWorkouts(uid, today);
      if (!ws.length) return U.toast("warn","No workout today","Log a workout first, then share it!");
      const w = ws[ws.length-1];
      return Social.shareDialog("workout", `Just finished ${w.duration} min of ${w.exercise_name} 🔥 burned ~${w.calories_burned} kcal!`);
    }
    if (type==="steps"){
      const s = Fitness.daySteps(uid, today);
      return Social.shareDialog("steps", `${s.toLocaleString()} steps today 👟 ${(s*DEFAULTS.stepLengthKm).toFixed(1)} km in the books!`);
    }
    if (type==="weight"){
      const cur = Weight.current(uid);
      if (!cur) return U.toast("warn","No weight logged","Log your weight first!");
      const start = Weight.start(uid);
      return Social.shareDialog("weight", `Weighed in at ${cur} kg today ⚖️ (${cur-start>=0?"+":""}${(cur-start).toFixed(1)} kg since I started). Progress over perfection!`);
    }
    if (type==="achievement"){
      const un = Achievements.unlocked(uid);
      if (!un.length) return U.toast("warn","No badges yet","Unlock an achievement first!");
      const a = un[0];
      return Social.shareDialog("achievement", `Just unlocked the "${a.name}" ${a.emoji} badge on VEXIEN! ${a.desc}`);
    }
  },

  shareDialog(type, prefilled){
    const types = [["text","💬 Update"],["workout","🏋️ Workout"],["achievement","🏆 Achievement"],["milestone","🎉 Milestone"],["weight","⚖️ Weight"],["steps","👟 Steps"]];
    Modal.open({
      title:"📣 Share with the community",
      body:`<div class="field"><span class="lbl">Post type</span>
          <div class="choice-row" style="grid-template-columns:repeat(3,1fr)" id="sp-type">
            ${types.map(t=>`<button type="button" class="choice ${t[0]===type?'sel':''}" data-val="${t[0]}">${t[1]}</button>`).join("")}
          </div></div>
        <div class="field"><span class="lbl">Message</span>
          <textarea id="sp-text" placeholder="Share your progress…">${U.esc(prefilled||"")}</textarea></div>`,
      actions:[{label:"Cancel",cls:"btn-ghost"},{label:"Post 🚀",cls:"btn-primary",onClick:async()=>{
        const text = document.getElementById("sp-text").value.trim();
        if (!text){ U.toast("warn","Message required","Write something to post."); return false; }
        const ptype = document.querySelector("#sp-type .sel").dataset.val;
        await Store.add("social_posts", {
          user_id:Auth.uid, user_name:Auth.profile.name||"You",
          avatar:Auth.profile.profile_picture_url||null,
          post_type:ptype, content:text, image_url:null,
          created_date:new Date().toISOString(), created:Date.now(), likes:[], comments:[]
        });
        U.toast("success","Posted 🚀","Your community can see it in the feed.");
        Achievements.check();
        Social.tab="feed"; Social.render();
      }}]
    });
    document.querySelectorAll("#sp-type .choice").forEach(b=>b.onclick=()=>{
      document.querySelectorAll("#sp-type .choice").forEach(x=>x.classList.remove("sel")); b.classList.add("sel");
    });
  },

  autoSharePrompt(type, data){
    // Gentle prompt after notable workouts (30+ min)
    if (type==="workout" && data && data.dur >= 30){
      setTimeout(()=>{
        Modal.open({
          title:"Share your win? 📣",
          body:`<p style="font-size:14px">Nice work — <b>${data.dur} minutes</b> of ${U.esc(data.name)} (~${data.cal} kcal). Inspire your friends?</p>`,
          actions:[{label:"Not now",cls:"btn-ghost"},{label:"Share it 🚀",cls:"btn-primary",onClick:()=>{
            Social.shareDialog("workout", `Just crushed ${data.dur} min of ${data.name} 🔥 ~${data.cal} kcal burned!`);
          }}]
        });
      }, 700);
    }
  },

  /* ================= FRIENDS ================= */
  renderFriends(c){
    const uid = Auth.uid;
    const friends = this.friendsOf(uid);
    const pending = this.pendingOf(uid);

    c.innerHTML = `
      <div class="grid grid-32">
        <div class="card">
          <div class="card-title"><span class="t">👥 Friends</span><span class="pill sky">${friends.length}</span></div>
          ${friends.length ? friends.map(f=>{
            const steps = this.userStat(f.friend_id, "steps", "week");
            const wos = this.userStat(f.friend_id, "workouts", "week");
            return `<div class="list-row">
              <div class="lr-ico" style="background:var(--yellow);font-size:20px">${f.friend_avatar||"🙂"}</div>
              <div class="lr-body"><b>${U.esc(f.friend_name)}</b><span>This week: ${steps.toLocaleString()} steps · ${wos} workouts</span></div>
              <button class="btn btn-sm btn-ghost" data-cmp="${f.friend_id}">⚔️ Compare</button>
              <button class="btn btn-sm btn-danger" data-unfriend="${f.id}">✕</button>
            </div>`;}).join("")
            : `<div class="empty"><div class="e-ico">🫂</div><b>No friends yet</b><span>Add friends by email or name to compete!</span></div>`}
        </div>
        <div class="grid" style="gap:16px">
          <div class="card">
            <div class="card-title"><span class="t">➕ Add Friend</span></div>
            <div class="field"><input id="fr-input" placeholder="Email or name (try: priya@demo.vexien)"></div>
            <button class="btn btn-primary btn-block" id="fr-add">Send request</button>
            <p class="small muted mt8">Demo community members: ${DEMO_USERS.map(u=>u.name.split(" ")[0]).join(", ")}.</p>
          </div>
          ${pending.length?`<div class="card">
            <div class="card-title"><span class="t">📬 Requests</span><span class="pill yellow">${pending.length}</span></div>
            ${pending.map(p=>`<div class="list-row">
              <div class="lr-ico">${p.friend_avatar||"🙂"}</div>
              <div class="lr-body"><b>${U.esc(p.friend_name||p.friend_email||"Unknown")}</b>
              <span>${p.status==="pending_incoming"?"Wants to be your friend":"Request sent"}</span></div>
              ${p.status==="pending_incoming"?`
                <button class="btn btn-sm btn-primary" data-accept="${p.id}">Accept</button>
                <button class="btn btn-sm btn-danger" data-decline="${p.id}">✕</button>`:""}
            </div>`).join("")}
          </div>`:""}
        </div>
      </div>`;

    document.getElementById("fr-add").onclick = () => Social.addFriend();
    document.getElementById("fr-input").onkeydown = e => { if (e.key==="Enter") Social.addFriend(); };
    c.querySelectorAll("[data-unfriend]").forEach(b=>b.onclick=async()=>{
      if (await Modal.confirm("Remove friend?","You can add them again anytime.")){
        await Store.remove("social_connections", b.dataset.unfriend);
        U.toast("success","Friend removed");
      }
    });
    c.querySelectorAll("[data-accept]").forEach(b=>b.onclick=async()=>{
      await Store.update("social_connections", b.dataset.accept, {status:"accepted", connected_date:U.todayStr()});
      U.toast("success","Friend added 🎉","You can now compare stats and compete.");
      Achievements.check();
    });
    c.querySelectorAll("[data-decline]").forEach(b=>b.onclick=async()=>{
      await Store.remove("social_connections", b.dataset.decline);
      U.toast("success","Request declined");
    });
    c.querySelectorAll("[data-cmp]").forEach(b=>b.onclick=()=>{ Social._cmpWith = b.dataset.cmp; Social.tab="compare"; Social.render(); });
  },

  addFriend(){
    const q = document.getElementById("fr-input").value.trim().toLowerCase();
    if (!q) return U.toast("warn","Enter a name or email");
    const uid = Auth.uid;
    // match demo users (demo mode) or firebase users
    let target = null;
    if (Store.mode === "demo"){
      target = DEMO_USERS.find(u => u.email.toLowerCase()===q || u.name.toLowerCase()===q || u.name.toLowerCase().startsWith(q));
    } else {
      const users = Store.list("users");
      target = users.find(u => u.uid!==uid && ((u.email||"").toLowerCase()===q || (u.name||"").toLowerCase()===q));
    }
    if (!target){
      return U.toast("error","User not found", Store.mode==="demo" ?
        `No demo user matches "${q}". Try: ${DEMO_USERS[0].email}` : `No VEXIEN user matches "${q}".`);
    }
    const exists = Store.listFor("social_connections", uid).find(c=>c.friend_id===target.uid);
    if (exists) return U.toast("warn","Already connected", exists.status==="accepted" ? "You're already friends!" : "A request already exists.");
    const name = target.name || target.friend_name;
    const avatar = target.avatar || (target.profile_picture_url ? null : "🙂");
    if (Store.mode === "demo"){
      Store.add("social_connections", {user_id:uid, friend_id:target.uid, friend_name:name, friend_avatar:avatar, status:"accepted", connected_date:U.todayStr()})
        .then(()=>{
          U.toast("success",`Friends with ${name}! 🎉`,"Instant accept in demo mode.");
          Notifier.add("👥","New friend", `${name} is now your fitness friend.`);
          Achievements.check();
        });
    } else {
      Store.add("social_connections", {user_id:uid, friend_id:target.uid, friend_name:name, status:"pending_outgoing", created_date:U.todayStr()})
        .then(()=>U.toast("success","Request sent 📬", `${name} will be added when they accept.`));
    }
    document.getElementById("fr-input").value = "";
  },

  /* ================= LEADERBOARD ================= */
  renderLeaderboard(c){
    const uid = Auth.uid;
    const metrics = [["steps","👟 Steps"],["burned","🔥 Calories burned"],["workouts","🏋️ Workouts"]];
    const ranges = [["week","This week"],["month","This month"]];

    const build = () => {
      let entries = [];
      if (Social.lbScope === "friends"){
        const friends = Social.friendsOf(uid);
        entries = friends.map(f=>({uid:f.friend_id, name:f.friend_name, avatar:f.friend_avatar||"🙂", me:false}));
      } else {
        if (Store.mode === "demo"){
          entries = DEMO_USERS.map(u=>({uid:u.uid, name:u.name, avatar:u.avatar, me:false}));
          // global community members (deterministic filler)
          const gNames = ["Kavya R.","Liam W.","Ananya S.","Noah P.","Meera J.","Ethan L.","Zara A.","Kabir M."];
          gNames.forEach((n,i)=>entries.push({uid:"global_"+i, name:n+" ⭐", avatar:["🦊","🐼","🦁","🐨","🦄","🐯","🦋","🐺"][i], me:false, global:true, seedBase:[7200,11500,9300,13200,8100,10400,9800,12100][i]}));
        } else {
          entries = Store.list("users").filter(u=>u.uid!==uid).map(u=>({uid:u.uid, name:u.name||"Member", avatar:u.profile_picture_url?"👤":"🙂", me:false}));
        }
      }
      entries.push({uid, name:(Auth.profile.name||"You")+" (you)", avatar:Auth.profile.profile_picture_url?null:(Auth.profile.name||"Y")[0].toUpperCase(), me:true});

      const range = Social.lbRange;
      entries.forEach(e=>{
        if (e.global){
          const seed = U.seededRand(e.uid + range + Social.lbMetric);
          const base = e.seedBase * (Social.lbMetric==="steps"?1:Social.lbMetric==="burned"?0.28:0.06) * (range==="month"?4.2:1);
          e.val = Math.round(base * (0.75 + seed*0.5));
        } else {
          e.val = Social.userStat(e.uid, Social.lbMetric, range);
        }
      });
      entries.sort((a,b)=>b.val-a.val);
      const myRank = entries.findIndex(e=>e.me)+1;

      document.getElementById("lb-body").innerHTML = entries.map((e,i)=>`
        <div class="lb-row ${i===0?'top1':i===1?'top2':i===2?'top3':''} ${e.me?'me':''}">
          <div class="lb-rank">${i<3?["🥇","🥈","🥉"][i]:i+1}</div>
          <div class="lb-name">${e.avatar&&typeof e.avatar==="string"&&e.avatar.length<=3?`<span style="margin-right:6px">${e.avatar}</span>`:""}${U.esc(e.name)}</div>
          <div class="lb-val">${e.val.toLocaleString()}${Social.lbMetric==="burned"?" kcal":""}</div>
        </div>`).join("");
      document.getElementById("lb-my-rank").innerHTML =
        `You're <b>#${myRank}</b> of ${entries.length} ${Social.lbScope==="friends"?"among friends":"globally"} ${ranges.find(r=>r[0]===range)[1].toLowerCase()}.`;
    };

    c.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="t">🏅 Leaderboard</span><span class="pill yellow" id="lb-my-rank"></span></div>
        <div class="flex flex-wrap mb12" style="gap:8px">
          <div class="chips">${[["friends","👥 Friends"],["global","🌍 Global"]].map(s=>`<button class="chip ${Social.lbScope===s[0]?'sel':''}" data-lbscope="${s[0]}">${s[1]}</button>`).join("")}</div>
          <div class="chips">${metrics.map(m=>`<button class="chip ${Social.lbMetric===m[0]?'sel':''}" data-lbmetric="${m[0]}">${m[1]}</button>`).join("")}</div>
          <div class="chips">${ranges.map(r=>`<button class="chip ${Social.lbRange===r[0]?'sel':''}" data-lbrange="${r[0]}">${r[1]}</button>`).join("")}</div>
        </div>
        <div id="lb-body"></div>
      </div>`;
    c.querySelectorAll("[data-lbscope]").forEach(b=>b.onclick=()=>{Social.lbScope=b.dataset.lbscope;build();
      c.querySelectorAll("[data-lbscope]").forEach(x=>x.classList.toggle("sel",x===b));});
    c.querySelectorAll("[data-lbmetric]").forEach(b=>b.onclick=()=>{Social.lbMetric=b.dataset.lbmetric;build();
      c.querySelectorAll("[data-lbmetric]").forEach(x=>x.classList.toggle("sel",x===b));});
    c.querySelectorAll("[data-lbrange]").forEach(b=>b.onclick=()=>{Social.lbRange=b.dataset.lbrange;build();
      c.querySelectorAll("[data-lbrange]").forEach(x=>x.classList.toggle("sel",x===b));});
    build();
  },

  /* ================= COMPARE ================= */
  renderCompare(c){
    const uid = Auth.uid;
    const friends = this.friendsOf(uid);
    if (!friends.length){
      c.innerHTML = `<div class="card"><div class="empty"><div class="e-ico">⚔️</div><b>No friends to compare with</b>
        <span>Add friends first, then come back for a side-by-side.</span></div></div>`;
      return;
    }
    if (!Social._cmpWith || !friends.find(f=>f.friend_id===Social._cmpWith)) Social._cmpWith = friends[0].friend_id;
    const f = friends.find(x=>x.friend_id===Social._cmpWith);
    const me = {name:Auth.profile.name||"You", avatar:Auth.profile.profile_picture_url?null:(Auth.profile.name||"Y")[0].toUpperCase()};
    const stats = [
      ["Steps (7 days)", this.userStat(uid,"steps","week").toLocaleString(), this.userStat(f.friend_id,"steps","week").toLocaleString(),
        this.userStat(uid,"steps","week") >= this.userStat(f.friend_id,"steps","week")],
      ["Calories burned (7 days)", this.userStat(uid,"burned","week").toLocaleString(), this.userStat(f.friend_id,"burned","week").toLocaleString(),
        this.userStat(uid,"burned","week") >= this.userStat(f.friend_id,"burned","week")],
      ["Workouts (7 days)", this.userStat(uid,"workouts","week"), this.userStat(f.friend_id,"workouts","week"),
        this.userStat(uid,"workouts","week") >= this.userStat(f.friend_id,"workouts","week")],
      ["Workouts (30 days)", this.userStat(uid,"workouts","month"), this.userStat(f.friend_id,"workouts","month"),
        this.userStat(uid,"workouts","month") >= this.userStat(f.friend_id,"workouts","month")],
      ["Step goal", (Auth.profile.daily_step_goal||10000).toLocaleString(), "—", true]
    ];
    const myWins = stats.filter(s=>s[3]).length;
    const days7 = U.lastNDays(7);

    c.innerHTML = `
      <div class="card mb16">
        <div class="card-title"><span class="t">⚔️ Head to Head</span>
          <select id="cmp-sel" style="background:var(--soft);border:1.5px solid var(--border);border-radius:10px;padding:7px 10px">
            ${friends.map(x=>`<option value="${x.friend_id}" ${x.friend_id===Social._cmpWith?"selected":""}>${U.esc(x.friend_name)}</option>`).join("")}
          </select></div>
        <div class="vs-grid">
          <div>
            <div class="post-avatar" style="width:56px;height:56px;font-size:24px;margin:0 auto 8px">${me.avatar||"🙂"}</div>
            <div class="center"><b>${U.esc(me.name)}</b></div>
          </div>
          <div class="vs-mid">VS</div>
          <div>
            <div class="post-avatar" style="width:56px;height:56px;font-size:24px;margin:0 auto 8px;background:linear-gradient(135deg,var(--yellow),#F6DC82);color:#5a4d10">${f.friend_avatar||"🙂"}</div>
            <div class="center"><b>${U.esc(f.friend_name)}</b></div>
          </div>
        </div>
        <hr class="divider">
        ${stats.map(s=>`<div class="vs-stat"><b style="${s[3]?'color:var(--green-deep)':''}">${s[1]}</b>
          <span class="muted">${s[0]}</span><b style="${!s[3]?'color:var(--green-deep)':''}">${s[2]}</b></div>`).join("")}
        <div class="ob-result mt12 center">
          ${myWins >= 3 ? `🏆 You're leading ${myWins}–${stats.length-myWins}. Keep the crown!` :
            `💪 ${U.esc(f.friend_name.split(" ")[0])} leads ${stats.length-myWins}–${myWins}. Time to grind!`}
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="t">📈 Weekly Steps Comparison</span></div>
        <div id="cmp-chart"></div>
      </div>`;

    document.getElementById("cmp-sel").onchange = e => { Social._cmpWith = e.target.value; Social.render(); };
    FX.line(document.getElementById("cmp-chart"), {
      labels: days7.map(d=>U.dayLabel(d)), height:220,
      series:[
        {name:me.name, data:days7.map(d=>Fitness.daySteps(uid,d)), color:"#87CEEB"},
        {name:f.friend_name, data:days7.map(d=>Fitness.daySteps(f.friend_id,d)), color:"#FFD97A"}
      ]});
  }
};
