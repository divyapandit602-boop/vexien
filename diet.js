/* ============================================================
   VEXIEN — Diet Tracking (diet.js)
   Food logging · calorie counter · macros · food DB ·
   meal plans · recipe database
   ============================================================ */

const Diet = {
  tab: "today",
  dbCat: "all",
  dbQuery: "",
  rCuisine: "all",
  rDiet: "all",
  rMaxCal: 0,
  rQuery: "",
  rFavOnly: false,
  planView: null,     // index into visible plans

  /* ---------- helpers ---------- */
  foodPool(uid){
    const custom = Store.listFor("custom_foods", uid).map(f => Object.assign({custom:true, category:f.category||"custom"}, f));
    return FOOD_DB.concat(custom);
  },

  searchFoods(uid, q, limit){
    const pool = this.foodPool(uid);
    q = (q||"").trim().toLowerCase();
    if (!q) return pool.slice(0, limit||12);
    const scored = [];
    pool.forEach(f => {
      const n = f.name.toLowerCase();
      let score = -1;
      if (n === q) score = 100;
      else if (n.startsWith(q)) score = 80;
      else { const i = n.indexOf(q); if (i >= 0) score = 60 - Math.min(i,20); }
      if (score >= 0) scored.push({f, score});
    });
    scored.sort((a,b)=>b.score-a.score || a.f.name.localeCompare(b.f.name));
    return scored.slice(0, limit||25).map(x=>x.f);
  },

  dayMeals(uid, date){ return Store.listFor("meals", uid).filter(m => m.date === date); },

  dayTotals(uid, date){
    const t = {calories:0, protein:0, carbs:0, fats:0};
    this.dayMeals(uid, date).forEach(m => {
      t.calories += m.calories||0; t.protein += m.protein||0; t.carbs += m.carbs||0; t.fats += m.fats||0;
    });
    ["calories","protein","carbs","fats"].forEach(k => t[k] = Math.round(t[k]*10)/10);
    return t;
  },

  recentFoods(uid, n){
    const seen = {}, out = [];
    Store.listFor("meals", uid).sort((a,b)=>(b.created||0)-(a.created||0)).forEach(m => {
      const key = m.food_id || m.name;
      if (!seen[key]){ seen[key]=true; out.push(m); }
    });
    return out.slice(0, n||6);
  },

  favFoodIds(uid){
    return Store.listFor("favorites", uid).filter(f=>f.type==="food").map(f=>f.ref_id);
  },
  favRecipeNames(uid){
    return Store.listFor("favorites", uid).filter(f=>f.type==="recipe").map(f=>f.ref_id);
  },

  async toggleFav(type, refId, label){
    const uid = Auth.uid;
    const existing = Store.listFor("favorites", uid).find(f=>f.type===type && f.ref_id===refId);
    if (existing){ await Store.remove("favorites", existing.id); U.toast("success","Removed", (label||"Item") + " removed from favorites."); }
    else { await Store.add("favorites", {user_id:uid, type, ref_id:refId, created:Date.now()}); U.toast("success","Saved ⭐", (label||"Item") + " added to favorites."); }
    App.rerender();
  },

  /* ---------- RENDER ---------- */
  render(){
    const uid = Auth.uid, root = document.getElementById("diet-root");
    const tabs = [["today","🍽️ Today"],["add","➕ Add Food"],["db","📚 Food Database"],["plans","🗓️ Meal Plans"],["recipes","👨‍🍳 Recipes"]];
    root.innerHTML = `
      <div class="page-head">
        <div><h2>Diet Tracking</h2><p>Fuel your goals — every meal counts.</p></div>
        <button class="btn btn-primary" id="diet-quick-add">➕ Log Food</button>
      </div>
      <div class="tabs">${tabs.map(t=>`<button class="tab ${Diet.tab===t[0]?'active':''}" data-dtab="${t[0]}">${t[1]}</button>`).join("")}</div>
      <div id="diet-content"></div>`;
    root.querySelectorAll("[data-dtab]").forEach(b => b.onclick = () => { Diet.tab = b.dataset.dtab; Diet.render(); });
    document.getElementById("diet-quick-add").onclick = () => { Diet.tab="add"; Diet.render(); };
    const c = document.getElementById("diet-content");
    ({today:()=>this.renderToday(c), add:()=>this.renderAdd(c), db:()=>this.renderDb(c),
      plans:()=>this.renderPlans(c), recipes:()=>this.renderRecipes(c)})[this.tab]();
  },

  /* ================= TODAY ================= */
  renderToday(c){
    const uid = Auth.uid, prof = Auth.profile, today = U.todayStr();
    const t = this.dayTotals(uid, today);
    const goal = prof.daily_calorie_target || 2000;
    const burned = Fitness.dayBurned(uid, today);
    const remaining = goal - t.calories;
    const net = t.calories - burned;
    const pct = Math.min(100, Math.round(t.calories/goal*100));
    const state = remaining >= 0 ? (remaining < goal*0.15 ? "warn" : "good") : "over";
    const stateColor = state==="good" ? "green" : state==="warn" ? "yellow" : "red";
    const macros = prof.macro_targets || Profile.macroGrams(goal, prof.goal||"maintain");

    const last7 = U.lastNDays(7);
    const hist = last7.map(d => this.dayTotals(uid, d).calories);

    c.innerHTML = `
    <div class="grid grid-32">
      <div class="grid" style="gap:16px">
        <div class="card">
          <div class="card-title"><span class="t">🔥 Daily Calorie Counter</span>
            <span class="pill ${stateColor}">${state==="good"?"On track":state==="warn"?"Almost there":"Goal exceeded"}</span></div>
          <div class="flex-between mb8">
            <div><div class="stat-big" style="color:var(--primary-ink)">${Math.round(t.calories).toLocaleString()}</div><div class="stat-label">consumed</div></div>
            <div class="right"><div class="stat-big">${Math.abs(Math.round(remaining)).toLocaleString()}</div><div class="stat-label">${remaining>=0?"remaining":"over goal"}</div></div>
          </div>
          <div class="pbar ${stateColor}" style="height:14px"><div style="width:${Math.min(100,pct)}%"></div></div>
          <div class="flex-between mt8 small muted"><span>Goal: ${goal.toLocaleString()} kcal</span><span>${pct}%</span></div>
          <hr class="divider">
          <div class="grid grid-3">
            <div><div class="stat-big" style="font-size:20px">${Math.round(burned).toLocaleString()}</div><div class="stat-label">🏋️ burned</div></div>
            <div><div class="stat-big" style="font-size:20px;color:${net<=0?'var(--green-deep)':'inherit'}">${net>0?"+":""}${Math.round(net).toLocaleString()}</div><div class="stat-label">net balance</div></div>
            <div><div class="stat-big" style="font-size:20px">${goal - net > 0 ? Math.round(goal - net).toLocaleString() : 0}</div><div class="stat-label">still allowed</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><span class="t">🥗 Today's Meals</span>
            <span class="small muted">${t.calories>0?Math.round(t.calories)+" kcal total":""}</span></div>
          ${this.mealsHtml(uid, today)}
        </div>
      </div>

      <div class="grid" style="gap:16px">
        <div class="card">
          <div class="card-title"><span class="t">🥧 Macros</span></div>
          <div id="diet-macro-pie" style="max-width:210px;margin:0 auto"></div>
          <div class="mt12">
            ${this.macroBar("Protein", t.protein, macros.protein, "macro-p")}
            ${this.macroBar("Carbs", t.carbs, macros.carbs, "macro-c")}
            ${this.macroBar("Fats", t.fats, macros.fats, "macro-f")}
          </div>
          <div class="small muted mt8" id="macro-tip"></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="t">📅 Last 7 Days</span></div>
          <div id="diet-hist-chart"></div>
          <div class="small muted mt8">Average: <b>${Math.round(hist.reduce((a,b)=>a+b,0)/7).toLocaleString()}</b> kcal/day</div>
        </div>
      </div>
    </div>`;

    this.bindMealActions(uid, today);
    FX.doughnut(document.getElementById("diet-macro-pie"), {
      labels:["Protein","Carbs","Fats"],
      values:[t.protein*4, t.carbs*4, t.fats*9].map(v=>Math.round(v)),
      colors:["#8FD694","#87CEEB","#FFD97A"]
    });
    FX.bar(document.getElementById("diet-hist-chart"), {
      labels: last7.map(d=>U.dayLabel(d)), values: hist, color:"#87CEEB", height:170, goal
    });
    document.getElementById("macro-tip").textContent = this.macroTip(t, macros);
  },

  macroBar(label, actual, target, cls){
    const pct = target ? Math.min(100, Math.round(actual/target*100)) : 0;
    return `<div class="macro-row ${cls}">
      <div class="pbar-row"><span>${label}</span><b>${Math.round(actual)}g / ${target||0}g</b></div>
      <div class="pbar ${cls}"><div style="width:${pct}%"></div></div></div>`;
  },

  macroTip(t, m){
    if (!t.calories) return "Log a meal to see macro suggestions here.";
    const tips = [];
    if (m.protein && t.protein < m.protein*0.6) tips.push("add more protein (eggs, paneer, chicken, dal)");
    if (m.fats && t.fats > m.fats*1.1) tips.push("go easy on fats today");
    if (m.carbs && t.carbs < m.carbs*0.4) tips.push("include some complex carbs (rice, oats, roti)");
    if (!tips.length) return "✅ Great balance! Your macros look on target.";
    return "💡 Suggestion: " + U.capitalize(tips.join(" and ")) + ".";
  },

  mealsHtml(uid, date){
    const meals = this.dayMeals(uid, date);
    const types = [["breakfast","🌅 Breakfast"],["lunch","☀️ Lunch"],["dinner","🌙 Dinner"],["snacks","🍿 Snacks"]];
    return types.map(([mt,label]) => {
      const items = meals.filter(m=>m.meal_type===mt);
      const cal = items.reduce((a,m)=>a+(m.calories||0),0);
      return `<div class="meal-block">
        <div class="meal-head"><span class="mh-left">${label} <span class="meal-cal">${Math.round(cal)} kcal</span></span>
          <button class="btn btn-sm btn-ghost" data-addmeal="${mt}">+ Add</button></div>
        ${items.length ? `<div class="meal-items">${items.map(m=>`
          <div class="meal-item">
            <span class="mi-name">${m.emoji||"🍽️"} ${U.esc(m.name)}</span>
            <span class="mi-meta">${m.quantity}× ${U.esc(m.serving_size||"")} · ${Math.round(m.calories)} kcal · P${Math.round(m.protein)} C${Math.round(m.carbs)} F${Math.round(m.fats)}</span>
            <span class="mi-acts">
              <button title="Edit" data-editmeal="${m.id}">✏️</button>
              <button title="Delete" data-delmeal="${m.id}">🗑️</button>
            </span></div>`).join("")}</div>`
          : `<div class="meal-empty">Nothing logged yet.</div>`}
      </div>`;
    }).join("");
  },

  bindMealActions(uid, date){
    document.querySelectorAll("[data-addmeal]").forEach(b => b.onclick = () => Diet.openAddModal(b.dataset.addmeal, date));
    document.querySelectorAll("[data-editmeal]").forEach(b => b.onclick = () => Diet.editMeal(b.dataset.editmeal));
    document.querySelectorAll("[data-delmeal]").forEach(b => b.onclick = async () => {
      if (await Modal.confirm("Delete this item?","It will be removed from today's log.")){
        await Store.remove("meals", b.dataset.delmeal);
        U.toast("success","Deleted 🗑️","Food entry removed.");
        Achievements.check();
      }
    });
  },

  /* ================= ADD FOOD ================= */
  renderAdd(c){
    const uid = Auth.uid;
    const favs = this.favFoodIds(uid);
    const pool = this.foodPool(uid);
    const favFoods = pool.filter(f=>favs.includes(f.id));
    const recent = this.recentFoods(uid, 6);

    c.innerHTML = `
    <div class="grid grid-32">
      <div class="card">
        <div class="card-title"><span class="t">🔎 Search ${FOOD_DB.length}+ foods</span></div>
        <div class="search-wrap">
          <span class="s-ico">🔍</span>
          <input id="food-search" placeholder="Search food… e.g. paneer, oats, biryani" autocomplete="off">
          <div class="autocomplete hidden" id="food-ac"></div>
        </div>
        <div class="chips mt12" id="food-cats">
          ${["all"].concat(FOOD_CATEGORIES).map(cat=>`<button class="chip ${Diet.dbCat===cat&&cat!=='all'?'sel':cat==='all'&&Diet.dbCat==='all'?'sel':''}" data-fcat="${cat}">${cat==="all"?"All ✨":U.capitalize(cat.replace("-"," "))}</button>`).join("")}
        </div>
        <div class="mt12" id="food-cat-list"></div>
      </div>
      <div class="grid" style="gap:16px">
        <div class="card">
          <div class="card-title"><span class="t">⚡ Quick Add — Recent</span></div>
          ${recent.length ? recent.map(m=>`<div class="list-row">
              <div class="lr-ico">${m.emoji||"🍽️"}</div>
              <div class="lr-body"><b>${U.esc(m.name)}</b><span>${U.capitalize(m.meal_type)} · ${Math.round(m.calories)} kcal</span></div>
              <button class="btn btn-sm btn-primary" data-quickadd='${JSON.stringify({name:m.name,food_id:m.food_id,serving_size:m.serving_size,calories:m.calories/m.quantity,protein:m.protein/m.quantity,carbs:m.carbs/m.quantity,fats:m.fats/m.quantity}).replace(/'/g,"&#39;")}'>+ Add</button>
            </div>`).join("") : `<div class="empty"><div class="e-ico">⚡</div><span>Recent foods will appear here for one-tap logging.</span></div>`}
        </div>
        <div class="card">
          <div class="card-title"><span class="t">⭐ Favorites</span>
            <button class="btn btn-sm btn-ghost" id="add-custom-food">+ Custom Food</button></div>
          ${favFoods.length ? favFoods.slice(0,5).map(f=>`<div class="list-row">
              <div class="lr-ico">${U.catEmoji(f.category)}</div>
              <div class="lr-body"><b>${U.esc(f.name)}</b><span>${U.esc(f.serving_size)} · ${f.calories} kcal</span></div>
              <button class="btn btn-sm btn-primary" data-addfood="${f.id}">+ Add</button>
            </div>`).join("") : `<div class="empty"><div class="e-ico">⭐</div><span>Tap ☆ on any food to favorite it.</span></div>`}
        </div>
      </div>
    </div>`;

    // category list
    const renderCatList = () => {
      const list = pool.filter(f => Diet.dbCat==="all" ? true : f.category===Diet.dbCat).slice(0, 40);
      document.getElementById("food-cat-list").innerHTML = list.map(f=>`
        <div class="list-row">
          <div class="lr-ico">${U.catEmoji(f.category)}</div>
          <div class="lr-body"><b>${U.esc(f.name)}</b><span>${U.esc(f.serving_size)} · P${f.protein} C${f.carbs} F${f.fats}</span></div>
          <div class="lr-right">${f.calories}<small>kcal</small></div>
          <button class="btn btn-sm btn-ghost" title="Favorite" data-favfood="${f.id}">${favs.includes(f.id)?"⭐":"☆"}</button>
          <button class="btn btn-sm btn-primary" data-addfood="${f.id}">+ Add</button>
        </div>`).join("");
      this.bindAddButtons();
    };
    renderCatList();

    document.querySelectorAll("[data-fcat]").forEach(b => b.onclick = () => {
      Diet.dbCat = b.dataset.fcat;
      document.querySelectorAll("[data-fcat]").forEach(x=>x.classList.toggle("sel", x===b));
      renderCatList();
    });
    document.querySelectorAll("[data-favfood]").forEach(b => b.onclick = () => {
      const f = pool.find(x=>x.id===b.dataset.favfood);
      Diet.toggleFav("food", b.dataset.favfood, f ? f.name : "Food");
    });
    document.getElementById("add-custom-food").onclick = () => Diet.customFoodModal();

    // search + autocomplete
    const input = document.getElementById("food-search");
    const ac = document.getElementById("food-ac");
    let hl = -1, results = [];
    const doSearch = () => {
      const q = input.value;
      results = Diet.searchFoods(uid, q, 12);
      if (!q.trim()){ ac.classList.add("hidden"); return; }
      ac.innerHTML = results.map((f,i)=>`
        <div class="ac-item" data-i="${i}">
          <span>${U.catEmoji(f.category)} ${U.esc(U.highlight(f.name,q))} <span class="ac-cat">· ${U.esc(f.serving_size)}</span></span>
          <span class="ac-kcal">${f.calories} kcal</span>
        </div>`).join("") || `<div class="ac-item"><span>No matches — <b>add it as a custom food?</b></span></div>`;
      ac.classList.remove("hidden");
      hl = -1;
      ac.querySelectorAll("[data-i]").forEach(el => el.onclick = () => { ac.classList.add("hidden"); input.value=""; Diet.openFoodModal(results[+el.dataset.i]); });
    };
    input.oninput = doSearch;
    input.onkeydown = e => {
      if (e.key==="ArrowDown"||e.key==="ArrowUp"){
        e.preventDefault();
        const items = ac.querySelectorAll(".ac-item[data-i]");
        if (!items.length) return;
        hl = (hl + (e.key==="ArrowDown"?1:-1) + items.length) % items.length;
        items.forEach((el,i)=>el.classList.toggle("hl", i===hl));
      } else if (e.key==="Enter"){
        e.preventDefault();
        if (hl>=0 && results[hl]){ ac.classList.add("hidden"); input.value=""; Diet.openFoodModal(results[hl]); }
        else if (results[0]){ ac.classList.add("hidden"); input.value=""; Diet.openFoodModal(results[0]); }
        else if (input.value.trim()) Diet.customFoodModal(input.value.trim());
      } else if (e.key==="Escape"){ ac.classList.add("hidden"); }
    };
    document.addEventListener("click", e => { if (!e.target.closest(".search-wrap")) ac.classList.add("hidden"); }, {once:false});
  },

  bindAddButtons(){
    document.querySelectorAll("[data-addfood]").forEach(b => b.onclick = () => {
      const f = Diet.foodPool(Auth.uid).find(x=>x.id===b.dataset.addfood);
      if (f) Diet.openFoodModal(f);
    });
    document.querySelectorAll("[data-quickadd]").forEach(b => b.onclick = () => {
      let data; try{ data = JSON.parse(b.dataset.quickadd.replace(/&#39;/g,"'")); }catch(e){ return; }
      data.id = data.food_id; data.custom = false;
      Diet.openFoodModal(data);
    });
  },

  /* ---------- add-food modal ---------- */
  openFoodModal(food, prefillMeal, prefillDate){
    const meals = [["breakfast","🌅 Breakfast"],["lunch","☀️ Lunch"],["dinner","🌙 Dinner"],["snacks","🍿 Snacks"]];
    const suggested = prefillMeal || U.suggestMealType();
    Modal.open({
      title: `${U.catEmoji(food.category)} ${U.esc(food.name)}`,
      body: `
        <div class="flex-between mb12">
          <div class="small muted">Per serving: ${U.esc(food.serving_size||"—")}</div>
          <div class="pill yellow">${food.calories} kcal / serving</div>
        </div>
        <div class="field"><span class="lbl">Quantity (servings)</span>
          <div class="flex">
            <button class="btn btn-ghost btn-sm" id="qm-minus">−</button>
            <input type="number" id="qm-qty" value="1" min="0.1" step="0.1" style="text-align:center;max-width:90px">
            <button class="btn btn-ghost btn-sm" id="qm-plus">+</button>
            <span class="small muted">= <b id="qm-total">${food.calories}</b> kcal</span>
          </div>
        </div>
        <div class="field"><span class="lbl">Meal</span>
          <div class="choice-row" style="grid-template-columns:repeat(4,1fr)" id="qm-meals">
            ${meals.map(m=>`<button type="button" class="choice ${m[0]===suggested?'sel':''}" data-val="${m[0]}">${m[1]}</button>`).join("")}
          </div>
        </div>
        <div class="field"><span class="lbl">Date</span><input type="date" id="qm-date" value="${prefillDate||U.todayStr()}" max="${U.todayStr()}"></div>
        <div class="small muted" id="qm-macros"></div>`,
      actions:[
        {label:"☆ Favorite", cls:"btn-ghost", onClick:()=>{ Diet.toggleFav("food", food.id, food.name); return false; }},
        {label:"Add to log ✓", cls:"btn-primary", onClick: async ()=>{
          const qty = Math.max(0.1, parseFloat(document.getElementById("qm-qty").value)||1);
          const mt = document.querySelector("#qm-meals .sel").dataset.val;
          const date = document.getElementById("qm-date").value || U.todayStr();
          await Store.add("meals", {
            user_id: Auth.uid, date, meal_type: mt,
            food_id: food.id, name: food.name, serving_size: food.serving_size,
            quantity: qty, emoji: U.catEmoji(food.category),
            calories: +(food.calories*qty).toFixed(1), protein:+((food.protein||0)*qty).toFixed(1),
            carbs:+((food.carbs||0)*qty).toFixed(1), fats:+((food.fats||0)*qty).toFixed(1),
            created: Date.now()
          });
          U.toast("success","Food logged 🍽️",`${qty}× ${food.name} added to ${mt} (${Math.round(food.calories*qty)} kcal).`);
          Notifier.maybeRemindAfterLog("meal");
          Achievements.check();
          Social.autoSharePrompt("food");
        }}
      ]
    });
    const upd = () => {
      const q = Math.max(0.1, parseFloat(document.getElementById("qm-qty").value)||1);
      document.getElementById("qm-total").textContent = Math.round(food.calories*q);
      document.getElementById("qm-macros").textContent = `Protein ${(food.protein*q).toFixed(1)}g · Carbs ${(food.carbs*q).toFixed(1)}g · Fats ${(food.fats*q).toFixed(1)}g`;
    };
    document.getElementById("qm-qty").oninput = upd;
    document.getElementById("qm-minus").onclick = () => { const i=document.getElementById("qm-qty"); i.value=Math.max(0.1,(+i.value-0.5)).toFixed(1); upd(); };
    document.getElementById("qm-plus").onclick = () => { const i=document.getElementById("qm-qty"); i.value=(+i.value+0.5).toFixed(1); upd(); };
    document.querySelectorAll("#qm-meals .choice").forEach(b => b.onclick = () => {
      document.querySelectorAll("#qm-meals .choice").forEach(x=>x.classList.remove("sel")); b.classList.add("sel");
    });
    upd();
  },

  openAddModal(mealType, date){
    this.tab = "add";
    if (App.current === "diet"){ this.render(); } else { App.navigate("diet"); }
    setTimeout(()=>{
      const i = document.getElementById("food-search");
      if (i){ i.focus(); i.dataset.meal = mealType||""; }
      if (mealType){
        // directly show a search-first modal flow
        Modal.open({
          title:`Add to ${U.capitalize(mealType)}`,
          body:`<div class="search-wrap"><span class="s-ico">🔍</span>
            <input id="modal-food-search" placeholder="Search food…" autocomplete="off">
            <div class="autocomplete hidden" id="modal-food-ac"></div></div>
            <div id="modal-recent" class="mt12"></div>`,
          actions:[{label:"Close",cls:"btn-ghost"}]
        });
        const inp = document.getElementById("modal-food-search"), ac = document.getElementById("modal-food-ac");
        let results = [];
        inp.oninput = () => {
          results = Diet.searchFoods(Auth.uid, inp.value, 10);
          if (!inp.value.trim()){ ac.classList.add("hidden"); return; }
          ac.innerHTML = results.map((f,i)=>`<div class="ac-item" data-i="${i}"><span>${U.catEmoji(f.category)} ${U.esc(f.name)}</span><span class="ac-kcal">${f.calories} kcal</span></div>`).join("");
          ac.classList.remove("hidden");
          ac.querySelectorAll("[data-i]").forEach(el => el.onclick = () => { Modal.close(); Diet.openFoodModal(results[+el.dataset.i], mealType, date); });
        };
        const recent = Diet.recentFoods(Auth.uid, 5);
        document.getElementById("modal-recent").innerHTML = recent.length ?
          `<div class="small muted mb8">Recent:</div>` + recent.map((m,i)=>`<button class="chip" data-r="${i}">${m.emoji||"🍽️"} ${U.esc(m.name)}</button>`).join(" ") : "";
        document.querySelectorAll("#modal-recent [data-r]").forEach(b => b.onclick = () => {
          const m = recent[+b.dataset.r];
          Modal.close();
          Diet.openFoodModal({id:m.food_id, name:m.name, serving_size:m.serving_size, category:"recent",
            calories:m.calories/m.quantity, protein:m.protein/m.quantity, carbs:m.carbs/m.quantity, fats:m.fats/m.quantity}, mealType, date);
        });
        setTimeout(()=>inp.focus(), 100);
      }
    }, 60);
  },

  editMeal(id){
    const m = Store.get("meals", id);
    if (!m) return;
    Modal.open({
      title:"✏️ Edit entry",
      body:`<div class="field"><span class="lbl">Quantity (servings)</span>
          <input type="number" id="em-qty" value="${m.quantity}" min="0.1" step="0.1"></div>
        <div class="field"><span class="lbl">Meal</span>
          <select id="em-meal">${["breakfast","lunch","dinner","snacks"].map(x=>`<option value="${x}" ${m.meal_type===x?"selected":""}>${U.capitalize(x)}</option>`).join("")}</select></div>
        <div class="field"><span class="lbl">Date</span><input type="date" id="em-date" value="${m.date}"></div>
        <div class="small muted">Base: ${Math.round(m.calories/m.quantity)} kcal/serving</div>`,
      actions:[
        {label:"Delete", cls:"btn-danger", onClick:async()=>{ await Store.remove("meals", id); U.toast("success","Deleted 🗑️","Entry removed."); Achievements.check(); }},
        {label:"Save", cls:"btn-primary", onClick:async()=>{
          const q = Math.max(0.1, parseFloat(document.getElementById("em-qty").value)||1);
          const per = {cal:m.calories/m.quantity, p:m.protein/m.quantity, c:m.carbs/m.quantity, f:m.fats/m.quantity};
          await Store.update("meals", id, {
            quantity:q, meal_type:document.getElementById("em-meal").value, date:document.getElementById("em-date").value,
            calories:+(per.cal*q).toFixed(1), protein:+(per.p*q).toFixed(1), carbs:+(per.c*q).toFixed(1), fats:+(per.f*q).toFixed(1)
          });
          U.toast("success","Updated ✅","Entry saved.");
          Achievements.check();
        }}
      ]
    });
  },

  customFoodModal(prefillName){
    Modal.open({
      title:"➕ Add Custom Food",
      body:`<div class="field"><span class="lbl">Name *</span><input id="cf-name" value="${U.esc(prefillName||"")}" placeholder="e.g. Mom's dal"></div>
        <div class="form-row">
          <div class="field"><span class="lbl">Serving size</span><input id="cf-serving" placeholder="1 bowl (200g)"></div>
          <div class="field"><span class="lbl">Calories *</span><input id="cf-cal" type="number" min="0" placeholder="250"></div>
        </div>
        <div class="form-row">
          <div class="field"><span class="lbl">Protein (g)</span><input id="cf-p" type="number" min="0" step="0.1" placeholder="10"></div>
          <div class="field"><span class="lbl">Carbs (g)</span><input id="cf-c" type="number" min="0" step="0.1" placeholder="30"></div>
        </div>
        <div class="form-row">
          <div class="field"><span class="lbl">Fats (g)</span><input id="cf-f" type="number" min="0" step="0.1" placeholder="8"></div>
          <div class="field"><span class="lbl">Fiber (g)</span><input id="cf-fib" type="number" min="0" step="0.1" placeholder="3"></div>
        </div>`,
      actions:[{label:"Cancel",cls:"btn-ghost"},{label:"Save food",cls:"btn-primary",onClick:async()=>{
        const name = document.getElementById("cf-name").value.trim();
        const cal = parseFloat(document.getElementById("cf-cal").value);
        if (!name) { U.toast("warn","Name required","Give your food a name."); return false; }
        if (isNaN(cal) || cal < 0){ U.toast("warn","Calories required","Enter a valid calorie value."); return false; }
        const food = {
          user_id: Auth.uid, name, serving_size: document.getElementById("cf-serving").value.trim()||"1 serving",
          calories: cal, protein: +document.getElementById("cf-p").value||0, carbs: +document.getElementById("cf-c").value||0,
          fats: +document.getElementById("cf-f").value||0, fiber: +document.getElementById("cf-fib").value||0,
          category: "custom", custom:true, created: Date.now()
        };
        const id = await Store.add("custom_foods", food);
        U.toast("success","Custom food added 🎉", name + " is now searchable.");
        Diet.openFoodModal(Object.assign({id}, food));
      }}]
    });
  },

  /* ================= FOOD DATABASE ================= */
  renderDb(c){
    const uid = Auth.uid;
    const render = () => {
      const q = Diet.dbQuery.toLowerCase();
      let list = Diet.foodPool(uid);
      if (Diet.dbCat !== "all") list = list.filter(f=>f.category===Diet.dbCat);
      if (q) list = list.filter(f=>f.name.toLowerCase().includes(q) || f.category.includes(q));
      const shown = list.slice(0, 120);
      document.getElementById("db-list").innerHTML = `
        <div class="small muted mb8">${list.length} items${list.length>120?" (showing first 120 — refine your search)":""}</div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Food</th><th>Category</th><th>Serving</th><th class="num">kcal</th><th class="num">P</th><th class="num">C</th><th class="num">F</th><th></th></tr></thead>
          <tbody>${shown.map(f=>`<tr>
            <td><b>${U.esc(f.name)}</b>${f.custom?' <span class="pill yellow">custom</span>':''}</td>
            <td>${U.catEmoji(f.category)} ${U.capitalize(f.category.replace("-"," "))}</td>
            <td class="muted small">${U.esc(f.serving_size)}</td>
            <td class="num"><b>${f.calories}</b></td><td class="num">${f.protein}</td><td class="num">${f.carbs}</td><td class="num">${f.fats}</td>
            <td><button class="btn btn-sm btn-primary" data-dbf="${f.id}">+ Log</button></td>
          </tr>`).join("")}</tbody></table></div>`;
      document.querySelectorAll("[data-dbf]").forEach(b => b.onclick = () => {
        const f = Diet.foodPool(uid).find(x=>x.id===b.dataset.dbf);
        if (f) Diet.openFoodModal(f);
      });
    };
    c.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="t">📚 Food Database</span>
          <button class="btn btn-sm btn-primary" id="db-add-custom">+ Custom Food</button></div>
        <div class="search-wrap mb12"><span class="s-ico">🔍</span>
          <input id="db-search" placeholder="Search the database…" value="${U.esc(Diet.dbQuery)}"></div>
        <div class="chips mb12">
          ${["all"].concat(FOOD_CATEGORIES).concat(["custom"]).map(cat=>`<button class="chip ${Diet.dbCat===cat?'sel':''}" data-dcat="${cat}">${cat==="all"?"All ✨":U.capitalize(cat.replace("-"," "))}</button>`).join("")}
        </div>
        <div id="db-list"></div>
      </div>`;
    document.getElementById("db-search").oninput = e => { Diet.dbQuery = e.target.value; render(); };
    document.querySelectorAll("[data-dcat]").forEach(b => b.onclick = () => { Diet.dbCat = b.dataset.dcat; Diet.render(); });
    document.getElementById("db-add-custom").onclick = () => Diet.customFoodModal();
    render();
  },

  /* ================= MEAL PLANS ================= */
  visiblePlans(uid){
    const custom = Store.listFor("meal_plans", uid).map(p => Object.assign({custom:true}, p));
    return MEAL_PLANS.map((p,i)=>Object.assign({idx:i}, p)).concat(custom);
  },

  renderPlans(c){
    const uid = Auth.uid;
    if (this.planView !== null){ return this.renderPlanDetail(c, this.planView); }
    const plans = this.visiblePlans(uid);
    c.innerHTML = `
      <div class="card mb16">
        <div class="card-title"><span class="t">🗓️ Meal Plans</span>
          <button class="btn btn-sm btn-primary" id="save-today-plan">💾 Save today's meals as plan</button></div>
        <p class="small muted">Pre-designed plans by calorie target, or build your own. Open a plan to see the full week + shopping list.</p>
      </div>
      <div class="ch-grid">
      ${plans.map((p,i)=>{
        const avg = p.custom && p.days ? Math.round(p.days.reduce((a,d)=>a+Diet.planDayCal(d),0)/Math.max(1,p.days.length)) : p.target;
        return `<div class="ch-card" data-plan="${i}" style="cursor:pointer">
          <div class="flex-between"><div class="ch-emoji">${p.emoji||"🍱"}</div>
            <span class="pill ${Math.abs(avg-(Auth.profile.daily_calorie_target||2000))<=200?'green':'sky'}">${avg} kcal/day</span></div>
          <h4>${U.esc(p.name)}</h4>
          <p>${U.esc(p.desc||"Your custom saved plan.")}</p>
          <div class="ch-stats"><span class="pill yellow">${p.custom?"Custom":"7-day plan"}</span>${p.custom?`<button class="pill red" data-delplan="${p.id}">Delete</button>`:""}</div>
        </div>`;}).join("")}
      </div>`;
    document.querySelectorAll("[data-plan]").forEach(el => el.onclick = e => {
      if (e.target.dataset.delplan) return;
      Diet.planView = +el.dataset.plan; Diet.render();
    });
    document.querySelectorAll("[data-delplan]").forEach(b => b.onclick = async e => {
      e.stopPropagation();
      if (await Modal.confirm("Delete plan?","This custom meal plan will be removed.")){
        await Store.remove("meal_plans", b.dataset.delplan);
        U.toast("success","Plan deleted","Custom plan removed.");
      }
    });
    document.getElementById("save-today-plan").onclick = () => Diet.saveTodayAsPlan();
  },

  planDayCal(day){
    return ["breakfast","lunch","dinner","snacks"].reduce((a,k)=>a+(day[k]||[]).reduce((x,it)=>x+(it[2]||0),0),0);
  },

  renderPlanDetail(c, idx){
    const plans = this.visiblePlans(Auth.uid);
    const p = plans[idx];
    if (!p){ this.planView = null; return this.renderPlans(c); }
    const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    if (!this._planDay) this._planDay = 0;
    const day = p.days[this._planDay % p.days.length];
    const dayCal = this.planDayCal(day);
    c.innerHTML = `
      <div class="flex-between mb16 flex-wrap">
        <button class="btn btn-ghost" id="plan-back">← All plans</button>
        <div class="flex">
          <button class="btn btn-ghost btn-sm" id="plan-shopping">🛒 Shopping list</button>
          <button class="btn btn-primary btn-sm" id="plan-log-day">📥 Log this day to today</button>
        </div>
      </div>
      <div class="card mb16">
        <div class="card-title"><span class="t">${p.emoji||"🍱"} ${U.esc(p.name)}</span>
          <span class="pill sky">Target ${p.target||"—"} kcal · Today's menu ≈ ${dayCal} kcal</span></div>
        <p class="small muted">${U.esc(p.desc||"")}</p>
        <div class="tabs mt12">
          ${p.days.map((d,i)=>`<button class="tab ${i===this._planDay% p.days.length?'active':''}" data-pday="${i}">${dayNames[i%7]} · Day ${i+1}</button>`).join("")}
        </div>
        ${["breakfast","lunch","dinner","snacks"].map(mt=>`
          <div class="meal-block">
            <div class="meal-head"><span class="mh-left">${{breakfast:"🌅 Breakfast",lunch:"☀️ Lunch",dinner:"🌙 Dinner",snacks:"🍿 Snacks"}[mt]}</span>
              <span class="meal-cal">${Math.round((day[mt]||[]).reduce((a,it)=>a+(it[2]||0),0))} kcal</span></div>
            <div class="meal-items">${(day[mt]||[]).map(it=>`
              <div class="meal-item"><span class="mi-name">${U.esc(it[0])}</span>
              <span class="mi-meta">${it[1]} serving(s) · ${Math.round(it[2])} kcal</span></div>`).join("") || `<div class="meal-empty">—</div>`}</div>
          </div>`).join("")}
      </div>`;
    document.getElementById("plan-back").onclick = () => { Diet.planView=null; Diet._planDay=0; Diet.render(); };
    document.querySelectorAll("[data-pday]").forEach(b => b.onclick = () => { Diet._planDay = +b.dataset.pday; Diet.render(); });
    document.getElementById("plan-shopping").onclick = () => Diet.shoppingList(p);
    document.getElementById("plan-log-day").onclick = async () => {
      const pool = Diet.foodPool(Auth.uid);
      let added = 0;
      for (const mt of ["breakfast","lunch","dinner","snacks"]){
        for (const it of (day[mt]||[])){
          const f = pool.find(x=>x.name===it[0]);
          const per = f ? f : {calories:it[2]/Math.max(it[1],0.1), protein:0, carbs:0, fats:0, serving_size:"serving"};
          await Store.add("meals", {
            user_id:Auth.uid, date:U.todayStr(), meal_type:mt, food_id:f?f.id:null,
            name:it[0], serving_size:per.serving_size||"serving", quantity:it[1], emoji:U.catEmoji(per.category||"plan"),
            calories:+(per.calories*it[1]).toFixed(1), protein:+((per.protein||0)*it[1]).toFixed(1),
            carbs:+((per.carbs||0)*it[1]).toFixed(1), fats:+((per.fats||0)*it[1]).toFixed(1), created:Date.now()+added
          });
          added++;
        }
      }
      U.toast("success",`Logged ${added} items 📥`, `${p.name} day ${this._planDay+1} added to today's meals.`);
      Achievements.check();
      Diet.tab = "today"; Diet.render();
    };
  },

  shoppingList(plan){
    const counts = {};
    (plan.days||[]).forEach(d => ["breakfast","lunch","dinner","snacks"].forEach(mt =>
      (d[mt]||[]).forEach(it => { counts[it[0]] = (counts[it[0]]||0) + (it[1]||1); })));
    const items = Object.keys(counts).sort().map(k=>`${k} — ${counts[k]} serving(s)`);
    Modal.open({
      title:`🛒 Shopping list — ${U.esc(plan.name)}`,
      body:`<div class="tbl-wrap" style="max-height:44vh;overflow-y:auto"><ul style="padding:12px 18px;font-size:13.5px;line-height:2">
        ${items.map(i=>`<li>${U.esc(i)}</li>`).join("")}</ul></div>
        <p class="small muted mt8">${items.length} unique items for the full week.</p>`,
      actions:[{label:"Close",cls:"btn-ghost"},{label:"⬇️ Download .txt",cls:"btn-primary",onClick:()=>{
        U.download(plan.name.replace(/\s+/g,"_")+"_shopping_list.txt",
          `VEXIEN Shopping List — ${plan.name}\n\n` + items.join("\n") + "\n");
      }}]
    });
  },

  async saveTodayAsPlan(){
    const today = this.dayMeals(Auth.uid, U.todayStr());
    if (!today.length) return U.toast("warn","Nothing to save","Log some meals first, then save the day as a plan.");
    const day = {breakfast:[],lunch:[],dinner:[],snacks:[]};
    today.forEach(m => day[m.meal_type].push([m.name, m.quantity, m.calories]));
    const name = await Modal.prompt("Save meal plan","Plan name:", `My Plan — ${U.todayStr()}`);
    if (name === null) return;
    await Store.add("meal_plans", {
      user_id:Auth.uid, name: name||"My Plan", calorie_target: Math.round(this.dayTotals(Auth.uid, U.todayStr()).calories),
      emoji:"🍱", desc:"Custom plan saved from your logged day.", days:[day,day,day,day,day,day,day], created_date:U.todayStr()
    });
    U.toast("success","Plan saved 📋","Find it under Meal Plans. (The day is repeated across the week — edit anytime.)");
    Achievements.check();
  },

  /* ================= RECIPES ================= */
  renderRecipes(c){
    const uid = Auth.uid;
    const cuisines = ["all", ...Array.from(new Set(RECIPE_DB.map(r=>r.cuisine)))];
    const diets = ["all","vegetarian","vegan","high-protein","low-carb","gluten-free","low-calorie"];
    const favs = this.favRecipeNames(uid);

    const filtered = () => {
      return RECIPE_DB.filter(r => {
        if (Diet.rFavOnly && !favs.includes(r.n)) return false;
        if (Diet.rCuisine !== "all" && r.cuisine !== Diet.rCuisine) return false;
        if (Diet.rDiet !== "all" && !r.d.includes(Diet.rDiet)) return false;
        if (Diet.rMaxCal && r.cal > Diet.rMaxCal) return false;
        if (Diet.rQuery && !r.n.toLowerCase().includes(Diet.rQuery.toLowerCase()) && !r.ing.join(" ").toLowerCase().includes(Diet.rQuery.toLowerCase())) return false;
        return true;
      });
    };

    const draw = () => {
      const list = filtered();
      document.getElementById("recipe-grid").innerHTML = list.map((r,i)=>`
        <div class="recipe-card" data-recipe="${RECIPE_DB.indexOf(r)}">
          <div class="recipe-art">${r.e}</div>
          <div class="recipe-body">
            <b>${U.esc(r.n)}</b>
            <span class="small muted">${U.esc(r.c)} · ⏱ ${r.t} min · ${r.cal} kcal</span>
            <div class="recipe-meta">
              <span class="pill green">P ${r.p}g</span><span class="pill sky">C ${r.cb}g</span><span class="pill yellow">F ${r.f}g</span>
              <span class="pill">${favs.includes(r.n)?"⭐ Saved":"☆"}</span>
            </div>
          </div>
        </div>`).join("") || `<div class="empty"><div class="e-ico">👨‍🍳</div><b>No recipes match</b><span>Try clearing filters.</span></div>`;
      document.querySelectorAll("[data-recipe]").forEach(el => el.onclick = () => Diet.recipeModal(RECIPE_DB[+el.dataset.recipe]));
    };

    c.innerHTML = `
      <div class="card mb16">
        <div class="card-title"><span class="t">👨‍🍳 Recipe Database</span><span class="pill sky">${RECIPE_DB.length} recipes</span></div>
        <div class="search-wrap mb12"><span class="s-ico">🔍</span><input id="r-search" placeholder="Search recipes or ingredients…"></div>
        <div class="chips mb8">${cuisines.map(x=>`<button class="chip ${Diet.rCuisine===x?'sel':''}" data-rc="${x}">${x==="all"?"All cuisines":U.esc(x)}</button>`).join("")}</div>
        <div class="chips mb8">${diets.map(x=>`<button class="chip ${Diet.rDiet===x?'sel':''}" data-rd="${x}">${x==="all"?"All diets":U.capitalize(x.replace("-"," "))}</button>`).join("")}</div>
        <div class="chips">
          ${[0,350,500,700].map(v=>`<button class="chip ${Diet.rMaxCal===v?'sel':''}" data-rm="${v}">${v===0?"Any calories":"Under "+v+" kcal"}</button>`).join("")}
          <button class="chip ${Diet.rFavOnly?'sel':''}" data-rfav="1">⭐ Favorites only</button>
        </div>
      </div>
      <div class="recipe-grid" id="recipe-grid"></div>`;

    document.getElementById("r-search").oninput = e => { Diet.rQuery = e.target.value; draw(); };
    document.querySelectorAll("[data-rc]").forEach(b=>b.onclick=()=>{Diet.rCuisine=b.dataset.rc;Diet.render();});
    document.querySelectorAll("[data-rd]").forEach(b=>b.onclick=()=>{Diet.rDiet=b.dataset.rd;Diet.render();});
    document.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{Diet.rMaxCal=+b.dataset.rm;Diet.render();});
    document.querySelectorAll("[data-rfav]").forEach(b=>b.onclick=()=>{Diet.rFavOnly=!Diet.rFavOnly;Diet.render();});
    draw();
  },

  recipeModal(r){
    const favs = this.favRecipeNames(Auth.uid);
    Modal.open({
      wide:true,
      title:`${r.e} ${U.esc(r.n)}`,
      body:`
        <div class="flex flex-wrap mb12" style="gap:6px">
          <span class="pill sky">${U.esc(r.c)}</span><span class="pill">⏱ ${r.t} min</span>
          ${r.d.map(d=>`<span class="pill green">${U.capitalize(d.replace("-"," "))}</span>`).join("")}
        </div>
        <div class="grid grid-4 mb16" style="gap:8px">
          <div class="card center" style="padding:10px"><div class="stat-big" style="font-size:19px">${r.cal}</div><div class="stat-label">kcal</div></div>
          <div class="card center" style="padding:10px"><div class="stat-big" style="font-size:19px">${r.p}g</div><div class="stat-label">protein</div></div>
          <div class="card center" style="padding:10px"><div class="stat-big" style="font-size:19px">${r.cb}g</div><div class="stat-label">carbs</div></div>
          <div class="card center" style="padding:10px"><div class="stat-big" style="font-size:19px">${r.f}g</div><div class="stat-label">fats</div></div>
        </div>
        <div class="grid grid-2">
          <div>
            <div class="card-title"><span class="t">🧺 Ingredients</span></div>
            <ul style="padding-left:18px;font-size:13.5px;line-height:1.9">${r.ing.map(i=>`<li>${U.esc(i)}</li>`).join("")}</ul>
          </div>
          <div>
            <div class="card-title"><span class="t">👩‍🍳 Instructions</span></div>
            <ol style="padding-left:18px;font-size:13.5px;line-height:1.9">${r.st.map(s=>`<li style="margin-bottom:6px">${U.esc(s)}</li>`).join("")}</ol>
          </div>
        </div>`,
      actions:[
        {label: favs.includes(r.n) ? "⭐ Saved" : "☆ Save recipe", cls:"btn-ghost", onClick:()=>{ Diet.toggleFav("recipe", r.n, r.n); return false; }},
        {label:"🍽️ Log to today", cls:"btn-primary", onClick:()=>{
          Diet.openFoodModal({id:"recipe_"+r.n.replace(/\W/g,"").slice(0,20), name:r.n, serving_size:"1 serving", category:"recipe",
            calories:r.cal, protein:r.p, carbs:r.cb, fats:r.f, emoji:r.e});
        }}
      ]
    });
  }
};
