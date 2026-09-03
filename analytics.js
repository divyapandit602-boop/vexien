/* ============================================================
   VEXIEN — Analytics (analytics.js)
   FX: chart engine — uses Chart.js when available, otherwise a
   built-in SVG renderer (works fully offline).
   Analytics: daily / weekly / monthly reports.
   ============================================================ */

const FX = {
  _dark(){ return document.body.dataset.theme === "dark"; },
  _ink(){ return this._dark() ? "#c3d2db" : "#6b7f8a"; },
  _grid(){ return this._dark() ? "rgba(255,255,255,.08)" : "rgba(90,120,135,.14)"; },

  /* ---------- ring (always inline SVG) ---------- */
  ringHtml(value, max, color, bigText, subText, size){
    size = size || 130;
    const r = size/2 - 11, circ = 2*Math.PI*r;
    const pct = max > 0 ? Math.min(1, value/max) : 0;
    return `<div class="ring-wrap"><div class="ring" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}">
        <circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${r}"></circle>
        <circle class="ring-fg" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}"
          stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${(circ*(1-pct)).toFixed(1)}"></circle>
      </svg>
      <div class="ring-center"><b>${bigText}</b><span>${subText||""}</span></div>
    </div><div class="ring-label">${Math.round(pct*100)}%</div></div>`;
  },

  _prep(container, height){
    if (!container) return null;
    container.innerHTML = "";
    container.style.height = (height||200) + "px";
    return container;
  },

  /* ---------- BAR ---------- */
  bar(container, opt){
    if (!this._prep(container, opt.height)) return;
    if (window.Chart){
      try{
        const cv = document.createElement("canvas");
        container.appendChild(cv);
        new Chart(cv, {
          type:"bar",
          data:{labels:opt.labels, datasets:[{data:opt.values, backgroundColor:opt.color||"#87CEEB",
            borderRadius:8, maxBarThickness:38}]},
          options:{responsive:true, maintainAspectRatio:false,
            plugins:{legend:{display:false},
              tooltip:{callbacks:{label:c=>c.parsed.y.toLocaleString()+(opt.unit||"")}}},
            scales:{
              x:{grid:{display:false}, ticks:{color:this._ink(), font:{size:11}}},
              y:{beginAtZero:true, grid:{color:this._grid()}, ticks:{color:this._ink(), font:{size:10}, maxTicksLimit:5}}
            }}
        });
        if (opt.goal) this._chartGoalLine(cv, opt);
        return;
      }catch(e){ console.warn("Chart.js failed, using SVG fallback:", e); container.innerHTML=""; }
    }
    /* SVG fallback */
    const W = container.clientWidth || 500, H = opt.height || 200, pad = {l:38,r:8,t:12,b:22};
    const max = Math.max(opt.goal||0, ...opt.values, 1);
    const bw = (W-pad.l-pad.r)/opt.values.length;
    let s = `<svg class="fx-svg" viewBox="0 0 ${W} ${H}" height="${H}">`;
    for (let g=0; g<=4; g++){
      const y = pad.t + (H-pad.t-pad.b)*g/4, v = Math.round(max*(1-g/4));
      s += `<line x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}" stroke="${this._grid()}"/>
            <text x="${pad.l-5}" y="${y+3}" font-size="9" fill="${this._ink()}" text-anchor="end">${v>=1000?(v/1000).toFixed(1)+"k":v}</text>`;
    }
    opt.values.forEach((v,i)=>{
      const h = (H-pad.t-pad.b)*(v/max);
      const x = pad.l + i*bw + bw*0.18, y = H-pad.b-h;
      s += `<rect x="${x}" y="${y}" width="${bw*0.64}" height="${Math.max(h,1)}" rx="5" fill="${opt.color||"#87CEEB"}"><title>${opt.labels[i]}: ${v.toLocaleString()}</title></rect>
            <text x="${pad.l+i*bw+bw/2}" y="${H-7}" font-size="9.5" fill="${this._ink()}" text-anchor="middle">${opt.labels[i]}</text>`;
    });
    if (opt.goal){
      const y = H-pad.b-(H-pad.t-pad.b)*(opt.goal/max);
      s += `<line x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}" stroke="#E8A0A0" stroke-dasharray="5 4" stroke-width="1.5"/>
            <text x="${W-pad.r}" y="${y-4}" font-size="9" fill="#E8A0A0" text-anchor="end">goal</text>`;
    }
    container.innerHTML = s + "</svg>";
  },
  _chartGoalLine(){ /* Chart.js goal handled by tooltip/legend simplification */ },

  /* ---------- LINE ---------- */
  line(container, opt){
    if (!this._prep(container, opt.height)) return;
    if (window.Chart){
      try{
        const cv = document.createElement("canvas");
        container.appendChild(cv);
        new Chart(cv, {
          type:"line",
          data:{labels:opt.labels, datasets:opt.series.map(sr=>({
            label:sr.name, data:sr.data, borderColor:sr.color,
            backgroundColor: sr.color + "33", fill: opt.area !== false,
            tension:0.35, pointRadius:2.5, pointHoverRadius:5, borderWidth:2.5
          }))},
          options:{responsive:true, maintainAspectRatio:false, interaction:{mode:"index",intersect:false},
            plugins:{legend:{position:"bottom", labels:{color:this._ink(), boxWidth:12, font:{size:11}}}},
            scales:{
              x:{grid:{display:false}, ticks:{color:this._ink(), font:{size:10}, maxTicksLimit:10}},
              y:{beginAtZero:opt.zero!==false, grid:{color:this._grid()}, ticks:{color:this._ink(), font:{size:10}, maxTicksLimit:6}}
            }}
        });
        return;
      }catch(e){ console.warn("Chart.js failed, using SVG fallback:", e); container.innerHTML=""; }
    }
    const W = container.clientWidth || 500, H = opt.height || 200, pad = {l:40,r:10,t:14,b:34};
    const all = opt.series.flatMap(s=>s.data);
    const max = Math.max(...all, 1), min = opt.zero===false ? Math.min(...all) : 0;
    const range = (max-min)||1;
    const x = i => pad.l + (W-pad.l-pad.r)*(opt.labels.length===1?0.5:i/(opt.labels.length-1));
    const y = v => H-pad.b-(H-pad.t-pad.b)*((v-min)/range);
    let s = `<svg class="fx-svg" viewBox="0 0 ${W} ${H}" height="${H}">`;
    for (let g=0; g<=4; g++){
      const yy = pad.t + (H-pad.t-pad.b)*g/4, v = Math.round(max-(range)*g/4);
      s += `<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" stroke="${this._grid()}"/>
            <text x="${pad.l-5}" y="${yy+3}" font-size="9" fill="${this._ink()}" text-anchor="end">${v>=1000?(v/1000).toFixed(1)+"k":v}</text>`;
    }
    const step = Math.max(1, Math.ceil(opt.labels.length/8));
    opt.labels.forEach((l,i)=>{ if (i%step===0) s += `<text x="${x(i)}" y="${H-8}" font-size="9.5" fill="${this._ink()}" text-anchor="middle">${l}</text>`; });
    opt.series.forEach(sr=>{
      const pts = sr.data.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      if (opt.area !== false){
        s += `<polygon points="${x(0)},${y(min)} ${pts} ${x(sr.data.length-1)},${y(min)}" fill="${sr.color}" opacity="0.16"/>`;
      }
      s += `<polyline points="${pts}" fill="none" stroke="${sr.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      sr.data.forEach((v,i)=>{ s += `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${sr.color}"><title>${opt.labels[i]} · ${sr.name}: ${v.toLocaleString()}</title></circle>`; });
    });
    s += `</svg><div class="fx-legend">${opt.series.map(sr=>`<span><i style="background:${sr.color}"></i>${sr.name}</span>`).join("")}</div>`;
    container.innerHTML = s;
  },

  /* ---------- DOUGHNUT ---------- */
  doughnut(container, opt){
    if (!this._prep(container, 190)) return;
    const total = opt.values.reduce((a,b)=>a+b,0);
    if (!total){
      container.innerHTML = `<div class="empty" style="padding:20px"><span>No data yet — log a meal to see your macro split.</span></div>`;
      return;
    }
    if (window.Chart){
      try{
        const cv = document.createElement("canvas");
        container.appendChild(cv);
        new Chart(cv, {
          type:"doughnut",
          data:{labels:opt.labels, datasets:[{data:opt.values, backgroundColor:opt.colors, borderWidth:2,
            borderColor: this._dark() ? "#1E2A36" : "#fff", hoverOffset:6}]},
          options:{responsive:true, maintainAspectRatio:false, cutout:"62%",
            plugins:{legend:{position:"bottom", labels:{color:this._ink(), boxWidth:12, font:{size:11}}},
              tooltip:{callbacks:{label:c=>` ${c.label}: ${c.parsed} kcal (${Math.round(c.parsed/total*100)}%)`}}}}
        });
        return;
      }catch(e){ console.warn("Chart.js failed, using SVG fallback:", e); container.innerHTML=""; }
    }
    const size=150, r=size/2-6, cx=size/2, cy=size/2;
    let angle = -Math.PI/2, s = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;margin:0 auto">`;
    opt.values.forEach((v,i)=>{
      const frac = v/total, a2 = angle + frac*2*Math.PI;
      const large = frac > 0.5 ? 1 : 0;
      const x1=cx+r*Math.cos(angle), y1=cy+r*Math.sin(angle), x2=cx+r*Math.cos(a2), y2=cy+r*Math.sin(a2);
      if (frac > 0.999) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${opt.colors[i]}"/>`;
      else if (frac > 0) s += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${opt.colors[i]}"><title>${opt.labels[i]}: ${Math.round(frac*100)}%</title></path>`;
      angle = a2;
    });
    s += `<circle cx="${cx}" cy="${cy}" r="${r*0.62}" fill="${this._dark()?"#1E2A36":"#fff"}"/>
          <text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="15" font-weight="800" fill="${this._dark()?"#E7EEF3":"#333"}">${total.toLocaleString()}</text>
          <text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="9" fill="${this._ink()}">kcal</text></svg>`;
    s += `<div class="fx-legend" style="justify-content:center">${opt.labels.map((l,i)=>`<span><i style="background:${opt.colors[i]}"></i>${l} ${Math.round(opt.values[i]/total*100)}%</span>`).join("")}</div>`;
    container.innerHTML = s;
  }
};

/* ============================================================
   Analytics View
   ============================================================ */
const Analytics = {
  range: "week", // week | month

  render(){
    const uid = Auth.uid, root = document.getElementById("analytics-root");
    const days = this.range==="week" ? U.lastNDays(7) : U.lastNDays(30);
    const data = days.map(d => {
      const diet = Diet.dayTotals(uid, d);
      const burned = Math.round(Fitness.dayBurned(uid, d));
      const steps = Fitness.daySteps(uid, d);
      const wos = Fitness.dayWorkouts(uid, d);
      return {date:d, in:diet.calories, p:diet.protein, c:diet.carbs, f:diet.fats, burned, steps, wCount:wos.length, wMin:wos.reduce((a,w)=>a+(w.duration||0),0)};
    });
    const n = data.length;
    const sums = data.reduce((a,x)=>({in:a.in+x.in, p:a.p+x.p, c:a.c+x.c, f:a.f+x.f, burned:a.burned+x.burned, steps:a.steps+x.steps, w:a.w+x.wCount}),{in:0,p:0,c:0,f:0,burned:0,steps:0,w:0});
    const loggedDays = data.filter(x=>x.in>0).length || 1;
    const target = Auth.profile.daily_calorie_target || 2000;
    const weights = days.map(d => Weight.entryFor(uid, d)).filter(Boolean);
    const weightChange = weights.length >= 2 ? +(weights[weights.length-1].weight - weights[0].weight).toFixed(1) : 0;
    const mostActive = data.slice().sort((a,b)=>b.burned-a.burned)[0];

    root.innerHTML = `
      <div class="page-head">
        <div><h2>Analytics &amp; Reports</h2><p>${this.range==="week"?"Weekly":"Monthly"} progress overview</p></div>
        <div class="tabs" style="margin:0">
          <button class="tab ${this.range==='week'?'active':''}" data-range="week">Week</button>
          <button class="tab ${this.range==='month'?'active':''}" data-range="month">Month</button>
        </div>
      </div>

      <div class="grid grid-4 mb16">
        <div class="card"><div class="stat-big">${Math.round(sums.in/loggedDays).toLocaleString()}</div><div class="stat-label">avg kcal consumed/day</div>
          <div class="stat-sub">vs ${target.toLocaleString()} target</div></div>
        <div class="card"><div class="stat-big" style="color:#E8A55C">${Math.round(sums.burned/loggedDays).toLocaleString()}</div><div class="stat-label">avg kcal burned/day</div>
          <div class="stat-sub">${sums.burned.toLocaleString()} total</div></div>
        <div class="card"><div class="stat-big">${Math.round(sums.steps/n).toLocaleString()}</div><div class="stat-label">avg steps/day</div>
          <div class="stat-sub">${sums.steps.toLocaleString()} total steps</div></div>
        <div class="card"><div class="stat-big">${sums.w}</div><div class="stat-label">workouts logged</div>
          <div class="stat-sub">weight ${weightChange>0?"+":""}${weightChange} kg</div></div>
      </div>

      <div class="grid grid-32 mb16">
        <div class="card">
          <div class="card-title"><span class="t">📈 Calories In vs Out</span>
            <span class="pill ${sums.in-sums.burned<target*n?'green':'yellow'}">${sums.in-sums.burned<0?"Deficit 🎉":(sums.in-sums.burned<target*n?"On target":"Surplus")}</span></div>
          <div id="an-line"></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="t">🥧 Macro Distribution</span></div>
          <div id="an-macro"></div>
          <div class="small muted mt8 center">Avg/day — P ${Math.round(sums.p/loggedDays)}g · C ${Math.round(sums.c/loggedDays)}g · F ${Math.round(sums.f/loggedDays)}g</div>
        </div>
      </div>

      <div class="grid grid-23 mb16">
        <div class="card">
          <div class="card-title"><span class="t">👟 Daily Steps</span></div>
          <div id="an-steps"></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="t">⚖️ Weight Goal</span></div>
          <div id="an-ring" class="center" style="padding:6px 0"></div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-title"><span class="t">📋 ${this.range==="week"?"Weekly":"Monthly"} Report</span></div>
          <div class="vs-stat"><span>Total intake</span><b>${Math.round(sums.in).toLocaleString()} kcal</b></div>
          <div class="vs-stat"><span>Total burned (exercise)</span><b>${Math.round(sums.burned).toLocaleString()} kcal</b></div>
          <div class="vs-stat"><span>Net balance</span><b>${(sums.in-sums.burned>0?"+":"")+(sums.in-sums.burned).toLocaleString()} kcal</b></div>
          <div class="vs-stat"><span>Days within calorie goal</span><b>${data.filter(x=>x.in>0&&x.in<=target).length} / ${n}</b></div>
          <div class="vs-stat"><span>Total steps</span><b>${sums.steps.toLocaleString()}</b></div>
          <div class="vs-stat"><span>Workouts (sessions/min)</span><b>${sums.w} · ${data.reduce((a,x)=>a+x.wMin,0)} min</b></div>
          <div class="vs-stat"><span>Weight change</span><b>${weightChange>0?"+":""}${weightChange} kg</b></div>
          <div class="vs-stat"><span>Most active day</span><b>${mostActive&&mostActive.burned>0?U.prettyDate(mostActive.date)+" ("+mostActive.burned+" kcal)":"—"}</b></div>
          <div class="vs-stat"><span>Achievements unlocked (${this.range==="week"?"this week":"this month"})</span><b>${Achievements.unlockedInRange(this.range==="week"?7:30).length}</b></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="t">🔥 Calorie Deficit / Surplus per Day</span></div>
          <div id="an-deficit"></div>
          <p class="small muted mt8">Bars above the line = surplus; below = deficit (intake − burned − target).</p>
        </div>
      </div>`;

    root.querySelectorAll("[data-range]").forEach(b=>b.onclick=()=>{Analytics.range=b.dataset.range;Analytics.render();});

    const labels = days.map(d=>U.dayLabel(d));
    FX.line(document.getElementById("an-line"), {labels, height:240, series:[
      {name:"Consumed", data:data.map(x=>Math.round(x.in)), color:"#87CEEB"},
      {name:"Burned", data:data.map(x=>x.burned), color:"#FFD97A"}
    ]});
    FX.doughnut(document.getElementById("an-macro"), {
      labels:["Protein","Carbs","Fats"],
      values:[Math.round(sums.p*4), Math.round(sums.c*4), Math.round(sums.f*9)],
      colors:["#8FD694","#87CEEB","#FFD97A"]});
    FX.bar(document.getElementById("an-steps"), {labels, values:data.map(x=>x.steps), color:"#8FD694", height:190, goal:Auth.profile.daily_step_goal||10000});

    // weight goal ring
    const prof = Auth.profile;
    const cur = Weight.current(uid), start = Weight.start(uid), goalW = prof.goal_weight || prof.weight || 70;
    let pctW = 100;
    if (start && cur && Math.abs(start-goalW) > 0.05){
      pctW = Math.max(0, Math.min(100, Math.round((start-cur)/(start-goalW)*100)));
      if ((cur-goalW)*(start-goalW) < 0) pctW = 100; // passed the goal
    }
    document.getElementById("an-ring").innerHTML =
      FX.ringHtml(pctW, 100, "#87CEEB", pctW+"%", "of weight goal", 150) +
      `<div class="small muted mt8">${cur?cur+" kg now · goal "+goalW+" kg":"Log weight to track progress"}</div>`;

    // deficit/surplus bars (can be negative → custom colors)
    const diffs = data.map(x=>Math.round(x.in - x.burned - target));
    this._divergeBar(document.getElementById("an-deficit"), labels, diffs);
  },

  _divergeBar(container, labels, values){
    if (!container) return;
    container.innerHTML = "";
    const H = 210, W = container.clientWidth || 500, pad={l:40,r:8,t:12,b:24};
    const max = Math.max(...values.map(Math.abs), 100);
    const zeroY = pad.t + (H-pad.t-pad.b)/2;
    const bw = (W-pad.l-pad.r)/values.length;
    let s = `<svg class="fx-svg" viewBox="0 0 ${W} ${H}" height="${H}">`;
    [-1,-0.5,0,0.5,1].forEach(f=>{
      const y = zeroY - (H-pad.t-pad.b)/2*f;
      s += `<line x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}" stroke="${f===0?FX._ink():FX._grid()}" ${f===0?'stroke-width="1.4"':''} opacity="${f===0?0.6:1}"/>
            <text x="${pad.l-5}" y="${y+3}" font-size="9" fill="${FX._ink()}" text-anchor="end">${f===0?"0":(f*max>=1000||f*max<=-1000)?(f*max/1000).toFixed(1)+"k":Math.round(f*max)}</text>`;
    });
    values.forEach((v,i)=>{
      const h = Math.abs(v)/max*(H-pad.t-pad.b)/2;
      const x = pad.l + i*bw + bw*0.18;
      const y = v>=0 ? zeroY-h : zeroY;
      s += `<rect x="${x}" y="${y}" width="${bw*0.64}" height="${Math.max(h,1)}" rx="4" fill="${v>0?"#F2A6A6":"#8FD694"}"><title>${labels[i]}: ${v>0?"+":""}${v} kcal</title></rect>`;
      const step = Math.max(1, Math.ceil(labels.length/8));
      if (i%step===0) s += `<text x="${pad.l+i*bw+bw/2}" y="${H-8}" font-size="9" fill="${FX._ink()}" text-anchor="middle">${labels[i]}</text>`;
    });
    container.innerHTML = s + "</svg>";
  }
};
