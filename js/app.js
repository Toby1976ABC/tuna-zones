"use strict";
// Tuna Zones — static web app. Depends on i18n.js, geo.js, seed.js (loaded before this file).
(()=>{
const $=id=>document.getElementById(id);
const store={
  get(k,def){try{const v=localStorage.getItem(k);return v==null?def:JSON.parse(v);}catch(e){return def;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}
};

// ---------- State ----------
const prefs=store.get("tz-prefs",{});
const S={
  snap:(()=>{const s=store.get("tz-snap",null);return s&&s.days&&s.sst&&s.sst.length===GRID.length&&new Date(s.fetchedAt)>=new Date(window.TZ_SEED.fetchedAt)?s:window.TZ_SEED;})(),
  species:prefs.species||"bluefin",layer:"score",day:0,sel:null,
  sightings:store.get("tz-sightings",[]),
  w:Object.assign({front:40,structure:25,upwelling:15,sightings:20},prefs.w||{}),
  picking:false,pending:null
};
LANG=prefs.lang||((navigator.language||"en").toLowerCase().startsWith("fr")?"fr":"en");
function savePrefs(){store.set("tz-prefs",{species:S.species,w:S.w,lang:LANG});}
function saveSightings(){if(!store.set("tz-sightings",S.sightings))showMsg(t("m_storeFail"),true);}

// ---------- Helpers ----------
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function compass(b){return t("compass")[Math.round(((b%360)+360)%360/22.5)%16];}
function fromTown(lat,lon){let b=null;for(const[name,,a,o]of TOWNS){const d=km(a,o,lat,lon);if(!b||d<b.d)b={name,d,brg:bearing(a,o,lat,lon)};}
  const vars={d:Math.round(b.d),dir:compass(b.brg),town:b.name,de:""};
  if(LANG==="fr"){const[de,n]=frDe(b.name);vars.de=de;vars.town=n;}
  return t("fromTown",vars);}
function fmtNum(v,dp){return v.toLocaleString(t("locale"),{minimumFractionDigits:dp,maximumFractionDigits:dp});}
function fmtDay(iso,long){return new Date(iso+"T12:00:00").toLocaleDateString(t("locale"),long?{weekday:"short",day:"numeric",month:"short"}:{weekday:"short"});}
function fmtStamp(iso){const d=new Date(iso);return d.toLocaleDateString(t("locale"),{day:"numeric",month:"short"})+" "+d.toLocaleTimeString(t("locale"),{hour:"2-digit",minute:"2-digit"});}
const kn=kmh=>kmh/1.852;

// ---------- Model ----------
const SPECIES={
  bluefin:{lo:17,hi:21.5,lo0:14,hi0:24.5,off:()=>1},
  albacore:{lo:16,hi:19,lo0:14,hi0:21.5,off:cd=>cd<15?0.5:cd<40?0.8:1},
  marlin:{lo:22,hi:28,lo0:20.5,hi0:30,off:cd=>cd<10?0.7:1}
};
function tempFit(sp,tc){const s=SPECIES[sp];if(tc==null)return 0;if(tc>=s.lo&&tc<=s.hi)return 1;if(tc<s.lo)return Math.max(0,(tc-s.lo0)/(s.lo-s.lo0));return Math.max(0,(s.hi0-tc)/(s.hi0-s.hi));}
let GRADS=null;
function prepare(){
  const s=S.snap,n=GRID.length,NEIGH=[];
  for(let i=0;i<n;i++){const L=[];for(let j=0;j<n;j++){if(i===j)continue;const d=km(s.mlat[i],s.mlon[i],s.mlat[j],s.mlon[j]);if(d>3&&d<20)L.push([j,d]);}NEIGH.push(L);}
  GRADS=s.days.map((_,d)=>GRID.map((_,i)=>{const tc=s.sst[i][d];if(tc==null)return 0;let g=0;for(const[j,dist]of NEIGH[i]){const u=s.sst[j][d];if(u!=null)g=Math.max(g,Math.abs(tc-u)/dist);}return g;}));
}
function windAt(lat,d){const w=S.snap.wind;let best=w[0];for(const x of w)if(Math.abs(x[0]-lat)<Math.abs(best[0]-lat))best=x;return{spd:best[2][d],dir:best[3][d]};}
function upIndex(lat,d){const{spd,dir}=windAt(lat,d);if(spd==null||dir==null)return 0;const r=dir*Math.PI/180;return lat>=43.6?spd*Math.cos(r):spd*Math.sin(r);}
function sightScore(lat,lon,d){const day=new Date(S.snap.days[d]+"T12:00:00");let sum=0;for(const x of S.sightings){const age=(day-new Date(x.date+"T12:00:00"))/864e5;if(age<-1||age>10)continue;const dist=km(lat,lon,x.lat,x.lon);if(dist>40)continue;const m=x.species===S.species?1:0.5;sum+=m*Math.exp(-dist/15)*Math.exp(-Math.max(0,age)/4);}return clamp(sum);}
function compute(d){
  const s=S.snap,sp=S.species,W=S.w,tot=(W.front+W.structure+W.upwelling+W.sightings)||1;
  const upNow=x=>Math.max(0,upIndex(x,d)),upPrev=x=>d>0?Math.max(0,upIndex(x,d-1)):Math.max(0,upIndex(x,d))*0.6;
  return GRID.map(([la,lo],i)=>{
    const tc=s.sst[i][d];if(tc==null)return null;
    const g=GRADS[d][i],front=clamp(g/0.05);
    let pc=0,pn=0;for(let k=Math.max(0,d-1);k<=Math.min(s.days.length-1,d+1);k++){pn++;if(GRADS[k][i]>0.02)pc++;}
    const pers=pn?pc/pn:0;
    const st=STATIC[i],structure=clamp(Math.max(Math.exp(-st.shelf/12),Math.exp(-st.canyon/10)));
    const up=clamp(Math.min(upNow(la),upPrev(la))/25)*Math.exp(-(((st.coast-15)/12)**2));
    const sight=sightScore(la,lo,d);
    const tf=tempFit(sp,tc),off=SPECIES[sp].off(st.coast);
    const mix=(W.front*front*(0.5+0.5*pers)+W.structure*structure+W.upwelling*up+W.sightings*sight)/tot;
    const score=tf*off*(0.1+0.9*mix);
    const why=[[tf>=0.95?"w_in":tf>0?"w_marg":"w_out",{t:fmtNum(tc,1)}]];
    if(front>0.45)why.push([pers>0.6?"w_lasting":"w_front"]);
    if(st.canyon<12)why.push(["w_canyon"]);else if(st.shelf<12)why.push(["w_shelf"]);
    if(up>0.3)why.push(["w_up"]);
    if(sight>0.15)why.push(["w_sight"]);
    return{i,lat:la,lon:lo,t:tc,g,front,pers,pc,pn,structure,up,sight,tf,score,why,wave:s.wave[i][d],coast:st.coast};
  });
}
function topZones(cells,n=5){const sorted=cells.filter(Boolean).sort((a,b)=>b.score-a.score),out=[];for(const c of sorted){if(out.every(o=>km(o.lat,o.lon,c.lat,c.lon)>20))out.push(c);if(out.length>=n)break;}return out;}
const whyText=w=>t(w[0],w[1]);

// ---------- Drawing ----------
const cv=$("map"),ctx=cv.getContext("2d");
let VIEW=null,CELLS=[],TOP=[];
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}
function proj(lat,lon){const{w,h}=VIEW;return[(lon-BOUNDS.w)/(BOUNDS.e-BOUNDS.w)*w,(BOUNDS.n-lat)/(BOUNDS.n-BOUNDS.s)*h];}
function hexToRgb(h){h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255];}
function mix(a,b,f){return a.map((v,k)=>Math.round(v+(b[k]-v)*f));}
function ramp(stops,f){f=clamp(f);const k=Math.min(stops.length-2,Math.floor(f*(stops.length-1)));return mix(stops[k],stops[k+1],f*(stops.length-1)-k);}
const SCORE_STOPS=()=>["--r0","--r1","--r2","--r3","--r4","--r5"].map(v=>hexToRgb(css(v)));
const SST_STOPS=[[49,84,180],[62,160,200],[120,200,170],[240,215,110],[236,130,60],[200,50,50]];
const FRONT_STOPS=()=>[hexToRgb(css("--r0")),[170,160,220],[122,62,157],[60,10,110]];
const CW=0.135,CH=0.13;
function cellRect(c){const[x1,y1]=proj(c.lat+CH/2,c.lon-CW/2),[x2,y2]=proj(c.lat-CH/2,c.lon+CW/2);return[x1,y1,x2-x1,y2-y1];}
function selIndex(){return S.sel!=null&&CELLS[S.sel]?S.sel:(TOP[0]?TOP[0].i:null);}
function path(pts){pts.forEach(([la,lo],k)=>{const[x,y]=proj(la,lo);k?ctx.lineTo(x,y):ctx.moveTo(x,y);});}
function draw(){
  const r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  if(!r.width)return;cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);VIEW={w:r.width,h:r.height};
  ctx.fillStyle=css("--map");ctx.fillRect(0,0,r.width,r.height);
  let tmin=99,tmax=-99;CELLS.forEach(c=>{if(c){tmin=Math.min(tmin,c.t);tmax=Math.max(tmax,c.t);}});
  const sc=SCORE_STOPS(),fr=FRONT_STOPS(),cl=css("--cellline");
  ctx.lineWidth=0.5;
  for(const c of CELLS){if(!c)continue;let col;
    if(S.layer==="score")col=ramp(sc,clamp(c.score/0.75));
    else if(S.layer==="sst")col=ramp(SST_STOPS,(c.t-tmin)/Math.max(0.5,tmax-tmin));
    else col=ramp(fr,c.front);
    const[x,y,w,h]=cellRect(c);ctx.fillStyle=`rgb(${col})`;ctx.fillRect(x,y,w+0.5,h+0.5);ctx.strokeStyle=cl;ctx.strokeRect(x,y,w,h);}
  ctx.strokeStyle=css("--ink");ctx.globalAlpha=.28;ctx.lineWidth=1;
  for(const c of CELLS){if(!c||c.wave==null||c.wave<2.5)continue;const[x1,y1,w,h]=cellRect(c);ctx.save();ctx.beginPath();ctx.rect(x1,y1,w,h);ctx.clip();ctx.beginPath();for(let k=-h;k<w+h;k+=6){ctx.moveTo(x1+k,y1+h);ctx.lineTo(x1+k+h,y1);}ctx.stroke();ctx.restore();}
  ctx.globalAlpha=1;
  ctx.setLineDash([4,4]);ctx.strokeStyle=css("--ink");ctx.globalAlpha=.7;ctx.lineWidth=1.2;ctx.beginPath();path(SHELF);ctx.stroke();ctx.globalAlpha=1;
  ctx.setLineDash([2,3]);ctx.strokeStyle=css("--canyon");ctx.lineWidth=2;for(const c of CANYONS){ctx.beginPath();path(c.pts);ctx.stroke();}
  ctx.setLineDash([]);
  ctx.fillStyle=css("--land");ctx.strokeStyle=css("--landline");ctx.lineWidth=1;
  ctx.beginPath();path(LAND);ctx.closePath();ctx.fill();ctx.stroke();
  for(const isl of ISLANDS){ctx.beginPath();path(isl);ctx.closePath();ctx.fill();ctx.stroke();}
  drawTowns();
  const sans=css("--f-sans");
  ctx.font=`italic 11px ${sans}`;ctx.fillStyle=css("--muted");ctx.textAlign="left";ctx.textBaseline="middle";
  {const[x,y]=proj(44.95,-2.55);ctx.fillText("≈200 m",x,y);} {const[x,y]=proj(43.7,-2.62);ctx.fillText("Gouf de Capbreton",x-30,y-8);}
  for(const x of S.sightings){const age=(new Date(S.snap.days[S.day]+"T12:00:00")-new Date(x.date+"T12:00:00"))/864e5;if(age>14||age<-1)continue;const[px,py]=proj(x.lat,x.lon);ctx.strokeStyle=css("--ink");ctx.fillStyle=css("--bg");ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px,py-6);ctx.lineTo(px+5,py+4);ctx.lineTo(px-5,py+4);ctx.closePath();ctx.fill();ctx.stroke();}
  if(S.pending){const[px,py]=proj(S.pending[0],S.pending[1]);ctx.strokeStyle=css("--accent");ctx.fillStyle=css("--accent");ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(px,py,8,0,7);ctx.stroke();ctx.beginPath();ctx.arc(px,py,2,0,7);ctx.fill();}
  const si=selIndex();if(si!=null&&CELLS[si]){const[x,y,w,h]=cellRect(CELLS[si]);ctx.strokeStyle=css("--accent");ctx.lineWidth=2.5;ctx.strokeRect(x,y,w,h);}
  if(S.layer==="score"){TOP.forEach((c,k)=>{const[px,py]=proj(c.lat,c.lon);ctx.shadowColor="rgba(0,0,0,.35)";ctx.shadowBlur=3;ctx.shadowOffsetY=1;ctx.fillStyle=css("--accent");ctx.beginPath();ctx.arc(px,py,12,0,7);ctx.fill();ctx.shadowColor="transparent";ctx.lineWidth=2;ctx.strokeStyle="#FFFFFF";ctx.stroke();ctx.fillStyle="#FFFFFF";ctx.font=`700 12px ${sans}`;ctx.textAlign="center";ctx.fillText(String(k+1),px,py+0.5);});ctx.textAlign="left";}
  drawLegend(tmin,tmax);
}
// Town dots on the coast; labels go on the land side, placed by rank and skipped when they would overlap.
function drawTowns(){
  const sans=css("--f-sans"),port=css("--port"),boxes=[];
  const order=TOWNS.map((x,k)=>[x,k]).sort((a,b)=>a[0][4]-b[0][4]||a[1]-b[1]);
  ctx.textBaseline="middle";ctx.textAlign="left";
  for(const[[,label,a,o,rank]]of order){
    const[x,y]=proj(a,o);ctx.fillStyle=port;ctx.beginPath();ctx.arc(x,y,rank===1?2.8:2.1,0,7);ctx.fill();
    ctx.font=`${rank===1?700:600} ${rank===1?11:10}px ${sans}`;
    const w=ctx.measureText(label).width,bx=x+5;
    if(bx+w>VIEW.w-2)continue;
    // try the label level with its dot first, then nudged a little down or up
    for(const dy of [0,2,-2,4,-4,6,-6,8,-8]){const ly=y+dy,box=[bx-1,ly-5.5,w+2,11];
      if(boxes.some(b=>box[0]<b[0]+b[2]&&b[0]<box[0]+box[2]&&box[1]<b[1]+b[3]&&b[1]<box[1]+box[3]))continue;
      boxes.push(box);ctx.fillStyle=port;ctx.fillText(label,bx,ly);break;}
  }
}
function swatches(stops){return stops.map(c=>`<span style="background:rgb(${c})"></span>`).join("");}
function drawLegend(tmin,tmax){const L=$("ramp");
  if(S.layer==="score")L.innerHTML=`<span>${t("low")}</span><span class="bar">${swatches(SCORE_STOPS())}</span><span>${t("high")}</span>`;
  else if(S.layer==="sst")L.innerHTML=`<span class="mono">${fmtNum(tmin,1)} °C</span><span class="bar">${swatches(SST_STOPS)}</span><span class="mono">${fmtNum(tmax,1)} °C</span>`;
  else L.innerHTML=`<span>${t("gentle")}</span><span class="bar">${swatches(FRONT_STOPS())}</span><span>${t("sharp")}</span>`;}

// ---------- UI ----------
function applyStatic(){
  document.documentElement.lang=LANG;
  document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n);});
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{el.placeholder=t(el.dataset.i18nPh);});
  document.querySelectorAll("[data-i18n-aria]").forEach(el=>{el.setAttribute("aria-label",t(el.dataset.i18nAria));el.title=t(el.dataset.i18nAria);});
  document.querySelectorAll("#lang button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lang===LANG)));
  cv.setAttribute("aria-label",t("whereLook"));
  if(S.picking)$("pickBtn").textContent=t("cancel");
}
function avgWave(d){let hs=0,n=0;S.snap.wave.forEach(w=>{if(w[d]!=null){hs+=w[d];n++;}});return n?hs/n:0;}
function renderDays(){const box=$("days");box.innerHTML="";
  S.snap.days.forEach((iso,d)=>{const b=document.createElement("button");b.type="button";b.className="day";b.setAttribute("aria-pressed",String(d===S.day));b.setAttribute("aria-label",fmtDay(iso,true));
    b.innerHTML=`<span class="dow">${fmtDay(iso,false)}</span><span class="num">${Number(iso.slice(8))}</span>`;
    b.onclick=()=>{S.day=d;S.sel=null;update();};box.appendChild(b);});}
function renderConditions(){const d=S.day,w=windAt(44.5,d),wk=kn(w.spd||0),wh=avgWave(d);
  $("windArrow").style.transform=`rotate(${Math.round(w.dir||0)}deg)`;
  $("cWind").textContent=`${compass(w.dir||0)} ${Math.round(wk)} kn`;
  $("cWave").textContent=`${fmtNum(wh,1)} m`;
  const ts=CELLS.filter(Boolean).map(c=>c.t);$("cSst").textContent=ts.length?`${fmtNum(Math.min(...ts),1)}–${fmtNum(Math.max(...ts),1)} °C`:"–";
  const coasts=[["c_charente",45.6],["c_landes",44.3],["c_basque",43.45]].filter(([,la])=>upIndex(la,d)>8).map(([k])=>t(k));
  const up=$("cUp");up.className="pill"+(coasts.length?" up":"");up.textContent=coasts.length?t("upYes",{c:coasts.join(", ")}):t("upNo");
  const rough=wh>=1.8||wk>=22,sea=$("cSea");sea.className="pill "+(rough?"bad":"ok");sea.textContent=t(rough?"rough":"calm");
  const live=CELLS.filter(Boolean),inR=live.length?Math.round(100*live.filter(c=>c.tf>=1).length/live.length):0;
  $("spNote").textContent=`${t("note_"+S.species)} ${t("inRange",{p:inR})}`;}
function upLabel(u){return t(u>0.6?"up_strong":u>0.3?"up_moderate":u>0.1?"up_weak":"up_none");}
function renderDetail(){const i=selIndex(),c=i!=null?CELLS[i]:null;$("selCard").hidden=!c;if(!c)return;const st=STATIC[c.i];
  $("selPos").textContent=fmtPos(c.lat,c.lon);$("selPort").textContent=fromTown(c.lat,c.lon);
  $("selScore").textContent=Math.round(c.score*100);
  $("fSst").textContent=`${fmtNum(c.t,1)} °C`;
  $("fFront").textContent=`${fmtNum(c.g*10,2)} ${t("perTen")}`;
  $("fPers").textContent=t("ofN",{a:c.pc,b:c.pn});
  $("fStruct").textContent=`${Math.round(st.shelf)} km / ${Math.round(st.canyon)} km`;
  $("fUp").textContent=upLabel(c.up);
  $("fWave").textContent=c.wave!=null?`${fmtNum(c.wave,1)} m`:"–";
  const box=$("selWhy");box.innerHTML="";
  c.why.forEach((w,j)=>{const s=document.createElement("span");s.className="pill"+(j===0?(c.tf>=0.95?" ok":c.tf>0?"":" bad"):" up");s.textContent=whyText(w);box.appendChild(s);});}
function renderZones(){const box=$("zones");box.innerHTML="";
  $("zonesTitle").textContent=t("topTitle",{day:fmtDay(S.snap.days[S.day],true)});
  if(!TOP.length||TOP[0].score<0.08){const p=document.createElement("p");p.className="empty";p.textContent=t("noZone",{sp:t("spl_"+S.species)});box.appendChild(p);return;}
  const si=selIndex();
  TOP.forEach((c,k)=>{const b=document.createElement("button");b.type="button";b.className="zone";b.setAttribute("aria-current",String(si===c.i));
    const extra=c.why.slice(1).map(whyText).join(" · ");
    b.innerHTML=`<span class="n">${k+1}</span><span class="mid"><span class="pos">${fmtPos(c.lat,c.lon)}</span><span class="sub">${fromTown(c.lat,c.lon)} · ${fmtNum(c.t,1)} °C</span>${extra?`<span class="sub">${extra}</span>`:""}</span><span class="sc">${Math.round(c.score*100)}</span>`;
    b.onclick=()=>{S.sel=c.i;update(false);$("selCard").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"nearest"});};box.appendChild(b);});}
const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
function renderSliders(){const box=$("sliders");box.innerHTML="";
  for(const k of ["front","structure","upwelling","sightings"]){const l=document.createElement("label");l.htmlFor="w-"+k;
    l.innerHTML=`<span>${t("s_"+k)}</span><input type="range" id="w-${k}" min="0" max="100" step="5" value="${S.w[k]}"><output>${S.w[k]}</output>`;
    l.querySelector("input").oninput=e=>{S.w[k]=+e.target.value;l.querySelector("output").textContent=e.target.value;savePrefs();update(false);};box.appendChild(l);}}
function renderFooter(){const W=S.w,tot=(W.front+W.structure+W.upwelling+W.sightings)||1,p=v=>Math.round(100*v/tot)+(LANG==="fr"?" %":"%");
  $("scoreNote").textContent=t("scoreNote",{f:p(W.front),s:p(W.structure),u:p(W.upwelling),k:p(W.sightings)});
  $("dataNote").textContent=t("dataNote",{t:fmtStamp(S.snap.fetchedAt),n:GRID.length});}
function renderSightings(){const ul=$("slist");ul.innerHTML="";const list=[...S.sightings].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,30);
  $("exportBtn").disabled=!S.sightings.length;
  if(!list.length){const li=document.createElement("li");li.className="small";li.textContent=t("noLogs");ul.appendChild(li);return;}
  for(const x of list){const li=document.createElement("li");li.className="entry";const div=document.createElement("div");
    const b=document.createElement("b");b.textContent=`${t("sp_"+x.species)||x.species} · ${new Date(x.date+"T12:00:00").toLocaleDateString(t("locale"),{weekday:"short",day:"numeric",month:"short"})}`;
    const pos=document.createElement("span");pos.className="muted mono";pos.textContent=`${fmtPos(x.lat,x.lon)} · ${fromTown(x.lat,x.lon)}`;
    div.append(b,pos);
    if(x.note){const n=document.createElement("span");n.className="muted";n.textContent=x.note;div.appendChild(n);}
    const rm=document.createElement("button");rm.type="button";rm.textContent=t("remove");
    rm.onclick=()=>{S.sightings=S.sightings.filter(y=>y.id!==x.id);saveSightings();renderSightings();update(false);};
    li.append(div,rm);ul.appendChild(li);}}
function freshness(){const tt=new Date(S.snap.fetchedAt),age=(Date.now()-tt)/36e5,el=$("fresh");
  el.className="run "+(age<12?"fresh":"stale");$("freshTxt").textContent=`${t("run")} ${fmtStamp(S.snap.fetchedAt)}`;renderFooter();}
let msgTimer=null;
function showMsg(text,err,autoHide){const m=$("msg");clearTimeout(msgTimer);m.hidden=!text;m.textContent=text||"";m.className="banner"+(err?" err":"");if(autoHide)msgTimer=setTimeout(()=>{m.hidden=true;},3500);}
function update(full=true){if(S.day>=S.snap.days.length)S.day=0;CELLS=compute(S.day);TOP=topZones(CELLS);if(full)renderDays();renderConditions();renderZones();renderDetail();renderFooter();draw();}
function setSeg(id,attr,val){document.querySelectorAll(`#${id} button`).forEach(b=>b.setAttribute("aria-pressed",String(b.dataset[attr]===val)));}
function setLang(l){LANG=l;savePrefs();applyStatic();renderSliders();freshness();update();renderSightings();}

document.querySelectorAll("#lang button").forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
document.querySelectorAll("#species button").forEach(b=>b.onclick=()=>{S.species=b.dataset.sp;S.sel=null;setSeg("species","sp",S.species);$("sSp").value=S.species;savePrefs();update(false);});
document.querySelectorAll("#layer button").forEach(b=>b.onclick=()=>{S.layer=b.dataset.ly;setSeg("layer","ly",S.layer);draw();});
cv.addEventListener("click",e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  const lon=BOUNDS.w+x/r.width*(BOUNDS.e-BOUNDS.w),lat=BOUNDS.n-y/r.height*(BOUNDS.n-BOUNDS.s);
  if(S.picking){S.pending=[+lat.toFixed(4),+lon.toFixed(4)];$("sPos").value=fmtPos(S.pending[0],S.pending[1]);setPicking(false);draw();$("sPos").focus({preventScroll:true});$("sightForm").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"center"});return;}
  if(S.layer==="score")for(const c of TOP){const[px,py]=proj(c.lat,c.lon);if(Math.hypot(px-x,py-y)<14){S.sel=c.i;update(false);return;}}
  let best=null,bd=1e9;CELLS.forEach(c=>{if(!c)return;const d=km(lat,lon,c.lat,c.lon);if(d<bd){bd=d;best=c;}});
  if(best&&bd<12){S.sel=best.i;update(false);}});
let rz=null;window.addEventListener("resize",()=>{cancelAnimationFrame(rz);rz=requestAnimationFrame(draw);});
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>draw());

// ---------- Sightings ----------
function setPicking(on){S.picking=on;$("hint").hidden=!on;$("pickBtn").setAttribute("aria-pressed",String(on));$("pickBtn").textContent=t(on?"cancel":"pickMap");
  if(on)$("chart").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"center"});}
$("pickBtn").onclick=()=>setPicking(!S.picking);
$("gpsBtn").onclick=()=>{if(!navigator.geolocation){showMsg(t("m_geoFail"),true);return;}const b=$("gpsBtn");b.disabled=true;
  navigator.geolocation.getCurrentPosition(p=>{b.disabled=false;const la=p.coords.latitude,lo=p.coords.longitude;S.pending=[la,lo];$("sPos").value=fmtPos(la,lo);draw();},
    ()=>{b.disabled=false;showMsg(t("m_geoFail"),true);},{enableHighAccuracy:true,timeout:15000,maximumAge:60000});};
function parsePos(s){
  s=String(s).trim().replace(/[′’´]/g,"'").replace(/[″”]/g,'"').replace(/\bO\b/gi,"W");
  const dmRe=/(\d+(?:[.,]\d+)?)\s*°?\s*(?:(\d+(?:[.,]\d+)?)\s*'?)?\s*(?:(\d+(?:[.,]\d+)?)\s*"?)?\s*([NS])[\s,;/]*(\d+(?:[.,]\d+)?)\s*°?\s*(?:(\d+(?:[.,]\d+)?)\s*'?)?\s*(?:(\d+(?:[.,]\d+)?)\s*"?)?\s*([EWO])/i;
  const m=dmRe.exec(s);const num=v=>v?+String(v).replace(",","."):0;
  if(m){let la=num(m[1])+num(m[2])/60+num(m[3])/3600,lo=num(m[5])+num(m[6])/60+num(m[7])/3600;if(/S/i.test(m[4]))la=-la;if(/[WO]/i.test(m[8]))lo=-lo;return[la,lo];}
  const dec=/(-?\d+\.\d+|-?\d+)\s*[,;\s]\s*(-?\d+\.\d+|-?\d+)/.exec(s);
  if(dec){const la=+dec[1];let lo=+dec[2];if(lo>0)lo=-lo;return[la,lo];}
  return null;}
$("sightForm").addEventListener("submit",e=>{e.preventDefault();
  const p=parsePos($("sPos").value);
  if(!p){showMsg(t("m_badPos"),true);return;}
  const[lat,lon]=p;
  if(!(lat>43&&lat<46.6&&lon>-3.5&&lon<-0.8)){showMsg(t("m_outside"),true);return;}
  const rec={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),lat:+lat.toFixed(4),lon:+lon.toFixed(4),species:$("sSp").value,date:$("sDate").value,note:$("sNote").value.slice(0,140),createdAt:new Date().toISOString()};
  S.sightings.push(rec);saveSightings();$("sNote").value="";$("sPos").value="";S.pending=null;renderSightings();update(false);showMsg(t("m_added"),false,true);
});
$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify({app:"tuna-zones",version:1,exportedAt:new Date().toISOString(),sightings:S.sightings},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`tuna-zones-sightings-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
  try{const data=JSON.parse(await f.text());const arr=Array.isArray(data)?data:data.sightings;if(!Array.isArray(arr))throw 0;
    const have=new Set(S.sightings.map(x=>x.id));let n=0;
    for(const x of arr){if(typeof x.lat!=="number"||typeof x.lon!=="number"||!/^\d{4}-\d{2}-\d{2}$/.test(x.date||""))continue;
      const rec={id:String(x.id||Date.now().toString(36)+Math.random().toString(36).slice(2,7)),lat:x.lat,lon:x.lon,species:["bluefin","albacore","marlin","other"].includes(x.species)?x.species:"other",date:x.date,note:String(x.note||"").slice(0,140),createdAt:x.createdAt||new Date().toISOString()};
      if(have.has(rec.id))continue;have.add(rec.id);S.sightings.push(rec);n++;}
    saveSightings();renderSightings();update(false);showMsg(n?t("m_imported",{n}):t("m_importNone"),false,true);
  }catch(err){showMsg(t("m_importBad"),true);}};

// ---------- Live forecast (Open-Meteo, called straight from the browser) ----------
const MARINE_URL="https://marine-api.open-meteo.com/v1/marine?latitude="+GRID.map(p=>p[0]).join(",")+"&longitude="+GRID.map(p=>p[1]).join(",")+"&daily=sea_surface_temperature_max,sea_surface_temperature_min,wave_height_max&forecast_days=6&timezone=Europe%2FParis&cell_selection=sea";
const WIND_URL="https://api.open-meteo.com/v1/forecast?latitude=46.0,45.0,44.0,43.5&longitude=-1.6,-1.4,-1.5,-1.8&daily=wind_speed_10m_max,wind_direction_10m_dominant&forecast_days=6&timezone=Europe%2FParis";
async function getJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}
let refreshing=false;
async function refresh(manual){
  if(refreshing)return;
  if(!navigator.onLine){if(manual)showMsg(t("m_offline",{t:fmtStamp(S.snap.fetchedAt)}),true);return;}
  refreshing=true;const btn=$("refresh");btn.disabled=true;if(manual)showMsg(t("m_fetching"));
  try{
    const[m,w]=await Promise.all([getJson(MARINE_URL),getJson(WIND_URL)]);
    const arr=Array.isArray(m)?m:[m];if(arr.length!==GRID.length)throw new Error("grid");
    const ww=Array.isArray(w)?w:[w];
    const snap={fetchedAt:new Date().toISOString(),days:arr[0].daily.time,mlat:arr.map(x=>+x.latitude.toFixed(3)),mlon:arr.map(x=>+x.longitude.toFixed(3)),
      sst:arr.map(x=>x.daily.sea_surface_temperature_max.map((v,i)=>{const lo=x.daily.sea_surface_temperature_min[i];return v==null||lo==null?null:+((v+lo)/2).toFixed(2);})),
      wave:arr.map(x=>x.daily.wave_height_max),wind:ww.map(x=>[x.latitude,x.longitude,x.daily.wind_speed_10m_max,x.daily.wind_direction_10m_dominant]),source:"Open-Meteo Marine + Forecast API"};
    S.snap=snap;store.set("tz-snap",snap);prepare();freshness();update();
    if(!$("sDate").value)$("sDate").value=snap.days[0];
    showMsg(manual?t("m_updated"):"",false,true);
  }catch(e){showMsg(t("m_fetchFail",{t:fmtStamp(S.snap.fetchedAt)}),true);}
  finally{refreshing=false;btn.disabled=false;}
}
$("refresh").onclick=()=>refresh(true);
window.addEventListener("online",()=>{if((Date.now()-new Date(S.snap.fetchedAt))/36e5>3)refresh(false);});

// ---------- Boot ----------
applyStatic();
setSeg("species","sp",S.species);setSeg("layer","ly",S.layer);$("sSp").value=S.species;
$("sDate").value=new Date().toISOString().slice(0,10);
renderSliders();prepare();freshness();update();renderSightings();
requestAnimationFrame(draw);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(draw);
if((Date.now()-new Date(S.snap.fetchedAt))/36e5>3)refresh(false);
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
