/* Racquet Culture community app.
   Runs on its own in each browser until config.js is filled in; then everyone shares one database. */
'use strict';
const $=id=>document.getElementById(id);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const pad=n=>String(n).padStart(2,'0');
/* The club runs on Indian Standard Time (UTC+5:30, no daylight saving), whatever time zone the phone is set to */
const IST=330*60000;
const istParts=(t=Date.now())=>{const d=new Date(+t+IST);return{y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),h:d.getUTCHours(),mi:d.getUTCMinutes()}};
const isoIST=(t=Date.now())=>{const p=istParts(t);return p.y+'-'+pad(p.m)+'-'+pad(p.d)};
const today=()=>isoIST();
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast('This device is out of storage space.')}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

/* ---------- Preferences ---------- */
const sysCalm=matchMedia('(prefers-reduced-motion: reduce)').matches;
let prefs=Object.assign({calm:sysCalm,haptics:true,sound:true,popups:true,theme:'dark'},ls.get('rc_prefs',{}));
const calm=()=>!!prefs.calm;
const sysLight=matchMedia('(prefers-color-scheme: light)');
const themeNow=()=>prefs.theme==='device'?(sysLight.matches?'light':'dark'):prefs.theme==='light'?'light':'dark';
function applyPrefs(){const r=document.documentElement;r.classList.toggle('calm',calm());r.dataset.theme=themeNow();
 const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=themeNow()==='light'?'#f6f3fd':'#0d0918'}
sysLight.addEventListener&&sysLight.addEventListener('change',()=>{if(prefs.theme==='device'){applyPrefs();if(typeof render==='function'&&S.uid&&!$('app').hidden)render()}});
function setPref(k,v){prefs[k]=v;ls.set('rc_prefs',prefs);applyPrefs()}
const tick=()=>{try{if(prefs.haptics&&navigator.vibrate)navigator.vibrate(10)}catch(e){}};
const buzz=p=>{try{if(prefs.haptics&&navigator.vibrate)navigator.vibrate(p)}catch(e){}};
/* Sounds are made on the fly (no audio files): a soft pop for confirmations, a two-note chime for new messages */
let actx=null;
function sfx(kind){
 if(!prefs.sound)return;
 try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();
  const t=actx.currentTime,notes={pop:[[660,0,.16],[990,.07,.18]],ding:[[880,0,.5],[1318,.13,.6]],tick:[[1500,0,.03]],soft:[[520,0,.14]]}[kind]||[[700,0,.15]];
  notes.forEach(([f,dt,dur])=>{const o=actx.createOscillator(),g=actx.createGain();o.type=kind==='tick'?'triangle':'sine';o.frequency.setValueAtTime(f,t+dt);
   if(kind==='pop')o.frequency.exponentialRampToValueAtTime(f*1.35,t+dt+.08);
   g.gain.setValueAtTime(.0001,t+dt);g.gain.exponentialRampToValueAtTime(kind==='tick'?.03:.16,t+dt+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dt+dur);
   o.connect(g);g.connect(actx.destination);o.start(t+dt);o.stop(t+dt+dur+.03)})}catch(e){}
}
applyPrefs();

/* Icon animations. Each is defined twice (a_ and b_) so an icon can play again on hover right after its opening animation. */
const ANIMS={
 spin:'0%{transform:rotate(0)}100%{transform:rotate(360deg)}',
 roll:'0%{transform:translateX(0) rotate(0)}45%{transform:translateX(3px) rotate(170deg)}100%{transform:translateX(0) rotate(360deg)}',
 rise:'0%,100%{transform:translateY(0)}35%{transform:translateY(4px)}70%{transform:translateY(-3px)}',
 sink:'0%,100%{transform:translateY(0)}35%{transform:translateY(-3px)}70%{transform:translateY(4px)}',
 pulse:'0%,100%{transform:scale(1)}40%{transform:scale(1.24)}70%{transform:scale(.93)}',
 rock:'0%,100%{transform:rotate(0)}25%{transform:rotate(-24deg)}55%{transform:rotate(14deg)}80%{transform:rotate(-6deg)}',
 swing:'0%,100%{transform:rotate(0)}30%{transform:rotate(-30deg)}60%{transform:rotate(12deg)}85%{transform:rotate(-4deg)}',
 ring:'0%,100%{transform:rotate(0)}15%{transform:rotate(16deg)}30%{transform:rotate(-14deg)}45%{transform:rotate(9deg)}60%{transform:rotate(-6deg)}75%{transform:rotate(3deg)}',
 shake:'0%,100%{transform:translateX(0)}15%,55%{transform:translateX(-3px) rotate(-6deg)}35%,75%{transform:translateX(3px) rotate(6deg)}',
 pop:'0%,100%{transform:scale(1)}35%{transform:translateY(-4px) scale(1.25)}65%{transform:translateY(0) scale(.92)}',
 bounce:'0%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}55%{transform:translateY(1px)}75%{transform:translateY(-2px)}',
 bars:'0%,100%{transform:scale(1)}50%{transform:scale(1.08)}',
 grow:'0%{transform:scaleY(.15)}60%{transform:scaleY(1.18)}100%{transform:scaleY(1)}'
};
(function(){
 const kids=p=>`${p} [data-a]>svg,${p} [data-a]>.ai`,run=v=>`{animation:var(${v}) .9s var(--ease) both}`;let css='';
 for(const [k,v] of Object.entries(ANIMS))css+=`@keyframes a_${k}{${v}}@keyframes b_${k}{${v}}[data-a=${k}]{--ka:a_${k};--kb:b_${k}}`;
 css+=kids('.intro')+run('--kb');
 for(let i=1;i<=6;i++)css+=`.intro .opt:nth-child(${i}) [data-a]>svg,.intro .opt:nth-child(${i}) [data-a]>.ai{animation-delay:${180+i*90}ms}`;
 css+=`@media (hover:hover){.opt:hover [data-a]>svg,.opt:hover [data-a]>.ai,#dock>button:hover>svg,.upload:hover>svg${run('--ka')}.opt:hover [data-a=bars] path,#dock>button:hover[data-a=bars] path{animation:a_grow .7s var(--ease) both}}`;
 css+=`${kids('.near')},${kids('.play')},#dock>button.play>svg${run('--ka')}`;
 css+=`.intro [data-a=bars] path{animation:b_grow .7s var(--ease) both}.near [data-a=bars] path,.play [data-a=bars] path,#dock>button.play[data-a=bars] path{animation:a_grow .7s var(--ease) both}`;
 css+=`[data-a=bars] path:nth-child(2){animation-delay:.08s!important}[data-a=bars] path:nth-child(3){animation-delay:.16s!important}`;
 const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
})();

/* ---------- Sports, levels and the level questions ---------- */
/* Padel uses the 0 to 7 scale most clubs and apps use. Pickleball uses the 1.0 to 5.5+ skill rating scale.
   scale: how many level points make a big favourite. K: how far one match can move a level. */
const SPORTS={
  padel:{name:'Padel',min:0.5,max:7,scale:1.5,K:0.10,cut:[2.5,4.5],
    bands:{beginner:[0.5,2.4],intermediate:[2.5,4.4],pro:[4.5,7.0]},setName:'Set',maxRows:3},
  pickleball:{name:'Pickleball',min:1,max:6,scale:0.8,K:0.07,cut:[3.0,4.0],
    bands:{beginner:[1.0,2.9],intermediate:[3.0,3.9],pro:[4.0,5.5]},setName:'Game',maxRows:3}
};
const SP_KEYS=Object.keys(SPORTS);
const TIERS=[['beginner','Beginner'],['intermediate','Intermediate'],['pro','Pro']];
const TIER_NAME={beginner:'Beginner',intermediate:'Intermediate',pro:'Pro'};
const tierOf=(sp,r)=>{const c=SPORTS[sp].cut;return r<c[0]?'beginner':r<c[1]?'intermediate':'pro'};
const clampL=(sp,v)=>clamp(+v,SPORTS[sp].min,SPORTS[sp].max);
const fmtL=(v,d=2)=>(+v).toFixed(d);
const fmtD=d=>(d>0?'+':d<0?'−':'±')+Math.abs(d).toFixed(2);
const dcls=d=>d>0.004?'up':d<-0.004?'down':'flat';

/* Questions follow how clubs, coaches and rating guides describe each level online.
   Each answer has a weight from 0 (bottom of the band) to 1 (top of the band). */
const QS={
 padel:{
  beginner:[
   ['How long have you been playing padel?',[['Just started, my first few games',0],['A few months',.5],['Over a year, casually',1]]],
   ['Have you played tennis, squash or another racket sport?',[['No',0],['A little',.5],['Yes, regularly',1]]],
   ['Can you keep a friendly rally going?',[['Only a few shots',0],['5 or 6 shots at an easy pace',.5],['Yes, comfortably',1]]],
   ['When the ball comes off the back glass, you…',[['Usually miss it',0],['Return the easy ones',.6],['Return most of them',1]]],
   ['Do you know the rules: scoring, the underarm serve and playing off the walls?',[['Still learning',0],['Mostly',.5],['Yes, all of it',1]]]],
  intermediate:[
   ['Balls off the back glass and side walls?',[['Back glass is fine, corners are hard',.2],['Most of them, including double walls',.6],['Comfortably, and I can counter-attack',1]]],
   ['How do you use the lob?',[['Mostly to get out of trouble',.2],['Placed deep to push them back',.6],['A weapon to take the net',1]]],
   ['At the net, when they lob you…',[['I smash everything or let it bounce',.1],['I play a bandeja to keep the net',.6],['Bandeja and víbora, with direction',1]]],
   ['Moving with your partner?',[['We sometimes get split up',.2],['We move up and back together',.6],['We control the net and the transitions as a pair',1]]],
   ['Your volleys?',[['Forehand fine, backhand less so',.2],['Both sides, with control',.6],['Both sides, placed with pace or touch',1]]],
   ['Where do you play?',[['Social games only',.2],['Club leagues or Americanos',.6],['Regular tournaments, winning some',1]]]],
  pro:[
   ['Your overheads?',[['Solid bandeja and víbora',.2],['Plus the smash over the fence (por 3)',.55],['Por 3 and por 4 out of the court, at will',1]]],
   ['Attacking from the back of the court?',[['I defend well and reset the point',.2],['Chiquitas and low balls to win the net back',.6],['I turn defence into attack against strong pairs',1]]],
   ['Highest level you compete at?',[['Regional tournaments',.2],['National ranking events',.6],['International (FIP or pro tour)',1]]],
   ['How often do you train or play?',[['1 or 2 times a week',.1],['3 or 4 times a week',.5],['Daily, with a coach',1]]],
   ['Against 4.5+ players you usually…',[['Hold your own',.2],['Win more than you lose',.6],['Dominate',1]]]]
 },
 pickleball:{
  beginner:[
   ['How long have you been playing pickleball?',[['Just started, my first few games',0],['A few months',.5],['Over a year, casually',1]]],
   ['Have you played tennis, badminton or another racket sport?',[['No',0],['A little',.5],['Yes, regularly',1]]],
   ['Can you serve and return serve consistently?',[['Not yet',0],['Most of the time',.6],['Almost always',1]]],
   ['Do you know the kitchen (non-volley zone) rule and how to call the score?',[['Still learning',0],['Mostly',.5],['Yes',1]]],
   ['Can you keep a soft dink rally going?',[['Not yet',0],['A few dinks',.5],['Yes, several in a row',1]]]],
  intermediate:[
   ['Your third shot?',[['I mostly drive it',.2],['I try drops, some land',.5],['A reliable drop or drive, my choice',1]]],
   ['After you return serve, you…',[['Stay back',.1],['Move up sometimes',.5],['Always get to the kitchen line',1]]],
   ['Dink rallies?',[['Short, then someone pops it up',.2],['I can dink patiently on both sides',.6],['I move them around and wait for the ball to attack',1]]],
   ['Fast exchanges at the net?',[['I struggle',.1],['I can block and reset',.6],['I win speed-ups and counter',1]]],
   ['Your backhand?',[['My weak side',.2],['Consistent',.6],['A weapon, drops and rolls included',1]]],
   ['Where do you play?',[['Social games only',.2],['Club ladders or leagues',.6],['Tournaments at 3.5 and above',1]]]],
  pro:[
   ['Shot variety?',[['Drops, drives and resets are solid',.2],['Plus spin serves and topspin rolls',.6],['Plus Ernes and around-the-post shots',1]]],
   ['Under pressure in transition?',[['I reset most balls',.3],['I rarely pop it up',.6],['I turn defence into attack',1]]],
   ['Highest level you compete at?',[['Local tournaments at 4.0',.2],['Regional or national at 4.5+',.6],['Pro or 5.0+ events',1]]],
   ['Stacking and strategy?',[['I know how it works',.2],['We use it every game',.6],['I plan around the opponents’ weaknesses',1]]],
   ['Against 4.0+ players you usually…',[['Hold your own',.2],['Win more than you lose',.6],['Dominate',1]]]]
 }
};
const levelFrom=(sp,band,ans)=>{const [lo,hi]=SPORTS[sp].bands[band];return Math.round((lo+(hi-lo)*avg(ans.map(x=>+x||0)))*10)/10};

/* ---------- Avatars: purple initials, or a photo the player uploads ---------- */
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const safeSrc=s=>typeof s==='string'&&(/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(s)||/^avatars\/[\w.-]+$/.test(s));
const initials=p=>{let n=(p&&(p.name||p.username)||'?').trim().split(/\s+/).filter(w=>/^[\p{L}\p{N}]/u.test(w));if(!n.length)n=['?'];return((n[0]||'?')[0]+(n.length>1?n[n.length-1][0]:'')).toUpperCase()};
function avHTML(p,size){
 const st=size?` style="width:${size}px;height:${size}px;font-size:${Math.round(size*.36)}px"`:'',a=p&&p.avatar;
 if(a&&a.kind==='img'&&safeSrc(a.src))return `<span class="av"${st}><img src="${a.src}" alt=""></span>`;
 return `<span class="av"${st}>${esc(initials(p))}</span>`;
}
/* Photos are cropped to a square and shrunk to 320 pixels so they load fast for everyone */
function readPhoto(file){return new Promise((res,rej)=>{
 if(!file||!/^image\//.test(file.type))return rej(new Error('Choose a photo file.'));
 if(file.size>15*1024*1024)return rej(new Error('That photo is too large. Choose one under 15 MB.'));
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{const S=320,c=document.createElement('canvas');c.width=c.height=S;const k=Math.min(img.width,img.height),sx=(img.width-k)/2,sy=(img.height-k)/2;
  c.getContext('2d').drawImage(img,sx,sy,k,k,0,0,S,S);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',.85))};
 img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('That photo could not be opened. Try a JPG or PNG.'))};img.src=url;
})}

/* ---------- Court times: 30-minute slots from 6:00 am to midnight ---------- */
const OPEN_H=6,CLOSE_H=24,NSLOT=(CLOSE_H-OPEN_H)*2,MAX_GAME=6/* longest player booking: 3 hours */;
const COURTS={padel:'Padel · Court 1',pickleball:'Pickleball · Court 1'};
const COURT_NOS={padel:[1],pickleball:[1]};
const rupees=n=>'\u20b9'+Number(n).toLocaleString('en-IN');
/* Club locations. Add more here as Racquet Culture grows. */
const VENUES=[{id:'chicalim',name:'Racquet Culture',area:'Chicalim, Goa, India',lat:15.3922869,lng:73.8459347,courts:'1 padel court · 1 pickleball court',
 url:'https://www.google.com/maps/place/RACQUET+CULTURE/@15.3922921,73.8433598,1195m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3bbfb9d42d24d04b:0x34283e54dbbf8ba7!8m2!3d15.3922869!4d73.8459347!16s%2Fg%2F11z5rb4hj2'}];
/* Courts are booked on Hudle. The link lives in config.js (hudle). */
const HUDLE_URL=(window.RC_LIVE&&window.RC_LIVE.hudle)||'https://hudle.in/venues/racquet-culture-chicalim/567082';
const hudleBtn=(cls='btn ball')=>`<a class="${cls} hudlebtn" href="${HUDLE_URL}" target="_blank" rel="noopener"><img src="hudle.png" alt="" width="22" height="22">Book on Hudle</a>`;
const venueOf=id=>VENUES.find(v=>v.id===id)||VENUES[0];
function mapCard(v){
 return `<div class="card mapcard rv"><div class="maptop"><span class="pinico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg></span><span class="grow"><b>${esc(v.name)}</b><span class="small muted">${esc(v.area)} · ${esc(v.courts)}</span></span></div>
  <div class="mapbox"><iframe title="Map of ${esc(v.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${v.lat},${v.lng}&t=k&z=17&output=embed"></iframe>
  <a class="mapopen" href="${esc(v.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(v.name)} in Google Maps"></a></div>
  <a class="btn brand wide" href="${esc(v.url)}" target="_blank" rel="noopener" style="margin-top:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Open in Google Maps</span></a></div>`} /* add numbers here when a second court opens */
const durLabel=n=>{const h=Math.floor(n/2),m=n%2*30;return (h?h+' h':'')+(h&&m?' ':'')+(m?m+' min':'')};
const slotLabel=i=>{const m=OPEN_H*60+i*30,h=Math.floor(m/60)%24,mm=m%60;return `${h%12||12}:${pad(mm)} ${h<12?'am':'pm'}`};
const slotRange=(s,len)=>`${slotLabel(s)} – ${slotLabel(s+len)}`;
const slotDate=(date,i)=>{const [y,m,d]=date.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)+(OPEN_H*60+i*30)*60000-IST)};
const isoDay=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return isoDay(d)};
const nowSlot=()=>{const p=istParts();return Math.floor((p.h*60+p.mi-OPEN_H*60)/30)};
const bkEnd=b=>slotDate(b.date,b.start+b.len);
const overlaps=(a,b)=>a.court===b.court&&a.date===b.date&&a.start<b.start+b.len&&b.start<a.start+a.len;
const upsert=(arr,x)=>{const i=arr.findIndex(y=>y.id===x.id);if(i>=0)arr[i]=x;else arr.push(x)};

/* ---------- Storage ----------
   Three stores with the same shape: the live database, this device only (preview), and the in-memory demo club. */
const errc=(code,msg)=>Object.assign(new Error(msg||code),{code});
async function sha(s){
 try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
 catch(e){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return 'f'+(h>>>0).toString(16)}
}
const LIVE=window.RC_LIVE||{};
let sb=null;
function memStore(mode,get,put){return{mode,
 async load(){const d=get();return{profiles:d.profiles.slice(),matches:d.matches.slice(),bookings:d.bookings.slice(),confs:d.confs.slice(),admins:d.admins.slice(),msgs:d.msgs.filter(m=>m.to===S.uid),follows:(d.follows||[]).slice(),reqs:(d.reqs||[]).filter(r=>r.from===S.uid||r.to===S.uid)}},
 async saveProfile(p){const d=get();upsert(d.profiles,p);put(d)},
 async addMatch(m){const d=get();d.matches.push(m);put(d)},
 async updateMatch(m){const d=get();upsert(d.matches,m);put(d)},
 async delMatch(id){const d=get();d.matches=d.matches.filter(m=>m.id!==id);d.confs=d.confs.filter(c=>c.match!==id);put(d)},
 async addBooking(b){const d=get();if(d.bookings.some(x=>overlaps(x,b)))throw errc('clash');d.bookings.push(b);put(d)},
 async updateBooking(b){const d=get();upsert(d.bookings,b);put(d)},
 async delBooking(id){const d=get();d.bookings=d.bookings.filter(b=>b.id!==id);put(d)},
 async addConf(c){const d=get();d.confs.push(c);put(d)},
 async send(list){const d=get(),at=new Date().toISOString();list.forEach(m=>d.msgs.push(Object.assign({id:'g_'+rid(),from:S.uid,read:false,at},m)));put(d)},
 async updateMsg(m){const d=get();upsert(d.msgs,m);put(d)},
 async follow(to){const d=get();d.follows=d.follows||[];if(!d.follows.some(f=>f.follower===S.uid&&f.followee===to))d.follows.push({follower:S.uid,followee:to,at:new Date().toISOString()});put(d)},
 async unfollow(to){const d=get();d.follows=(d.follows||[]).filter(f=>!(f.follower===S.uid&&f.followee===to));put(d)},
 async addReq(r){const d=get();d.reqs=d.reqs||[];d.reqs.push(r);put(d)},
 async updateReq(r){const d=get();upsert(d.reqs,r);put(d)},
 async delReq(id){const d=get();d.reqs=(d.reqs||[]).filter(r=>r.id!==id);put(d)}
}}
const LKEYS=['profiles','matches','bookings','confs','msgs','follows','reqs'];
const Local=Object.assign(memStore('local',()=>{const d={admins:[]};LKEYS.forEach(k=>d[k]=ls.get('rc2_'+k,[]));return d},d=>LKEYS.forEach(k=>ls.set('rc2_'+k,d[k]))),{
 async init(){},
 async session(){return ls.get('rc2_session',null)},
 async taken(u){const k=u.trim().toLowerCase();return ls.get('rc2_profiles',[]).some(p=>(p.username||'').toLowerCase()===k)},
 async signUp(name,username,email,pw){
  const acc=ls.get('rc2_accounts',{}),k=email.toLowerCase();if(acc[k])throw errc('emailtaken');if(await this.taken(username))throw errc('taken');
  const id='u_'+rid(),salt=rid()+rid();acc[k]={id,salt,hash:await sha(salt+'|'+pw)};ls.set('rc2_accounts',acc);
  const ps=ls.get('rc2_profiles',[]);ps.push({id,username,name,setup:false,created:new Date().toISOString()});ls.set('rc2_profiles',ps);
  ls.set('rc2_session',id);return id;
 },
 async signIn(email,pw){const a=ls.get('rc2_accounts',{})[email.toLowerCase()];if(!a||a.hash!==await sha(a.salt+'|'+pw))throw errc('nomatch');ls.set('rc2_session',a.id);return a.id},
 async signOut(){ls.del('rc2_session')},
 async email(){const acc=ls.get('rc2_accounts',{});return Object.keys(acc).find(k=>acc[k].id===S.uid)||''},
 async resetPassword(){throw errc('local')},
 async newPassword(pw){const acc=ls.get('rc2_accounts',{}),k=Object.keys(acc).find(x=>acc[x].id===S.uid);if(!k)throw errc('local');acc[k].salt=rid()+rid();acc[k].hash=await sha(acc[k].salt+'|'+pw);ls.set('rc2_accounts',acc)}
});
/* Live: Supabase. Players sign in with email and password. Emails stay in Supabase's account system:
   they are never stored in the profiles table, so other players only ever see names and usernames. */
const here=()=>location.origin+location.pathname;
let recovery=false,booted=false;
const flat=r=>Object.assign({},r.data||{},{id:r.id,username:r.username,name:r.name});
const bRow=r=>Object.assign({},r.data||{},{id:r.id,court:r.court,date:r.day,start:r.start_slot,len:r.len,kind:r.kind,by:r.created_by});
const cRow=r=>Object.assign({},r.data||{},{id:r.id,match:r.match_id,user:r.user_id,verdict:r.verdict,at:r.created_at});
const gRow=r=>({id:r.id,to:r.to_user,from:r.from_user,kind:r.kind,data:r.data||{},read:r.read,at:r.created_at});
const bData=b=>{const {id,court,date,start,len,kind,by,...data}=b;return data};
const missing=e=>!!e&&(e.code==='PGRST205'||e.code==='42P01');
const Live={
 mode:'live',
 async init(){
  sb=window.supabase.createClient(LIVE.url,LIVE.key);
  sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY'){recovery=true;if(booted)setTimeout(showReset,300)}});
  const ch=sb.channel('rc-live');['rc_profiles','rc_matches','rc_confirmations','rc_messages','rc_follows','rc_friend_requests'].forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t},onRemote));ch.subscribe();
 },
 async session(){const {data}=await sb.auth.getSession();return data.session?data.session.user.id:null},
 async taken(u){const {data,error}=await sb.rpc('rc_username_taken',{u});if(error)throw error;return !!data},
 async signUp(name,username,email,pw){
  const {data,error}=await sb.auth.signUp({email,password:pw,options:{data:{name,username},emailRedirectTo:here()}});
  if(error){const m=error.message||'';if(/already|registered|exists/i.test(m))throw errc('emailtaken');if(/rate|too many|security purposes/i.test(m))throw errc('rate');if(/password/i.test(m))throw errc('weak',m);if(/email/i.test(m))throw errc('bademail');throw error}
  if(data.user&&Array.isArray(data.user.identities)&&!data.user.identities.length)throw errc('emailtaken');
  if(!data.session)throw errc('confirm');
  return data.user.id; /* the profile row is made on entering, from the name and username saved with the account */
 },
 async signIn(email,pw){const {data,error}=await sb.auth.signInWithPassword({email,password:pw});
  if(error){const m=error.message||'';if(/confirm/i.test(m))throw errc('confirm');if(/invalid|credentials/i.test(m))throw errc('nomatch');throw error}return data.user.id},
 async email(){const {data}=await sb.auth.getUser();return data.user&&data.user.email||''},
 async resetPassword(email){const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:here()});if(error){if(/rate|security purposes/i.test(error.message))throw errc('rate');throw error}},
 async newPassword(pw){const {error}=await sb.auth.updateUser({password:pw});if(error)throw error},
 async signOut(){await sb.auth.signOut()},
 async load(){
  const all=async(t,cols,f0,ord='id')=>{const out=[];for(let f=0;;f+=1000){let q=sb.from(t).select(cols).order(ord).range(f,f+999);if(f0)q=f0(q);const {data,error}=await q;if(error)throw error;out.push(...data);if(data.length<1000)return out}};
  /* tables added in the bookings update: if setup.sql has not been run again yet, the rest of the app keeps working */
  const opt=p=>p.then(x=>x,e=>{if(missing(e)){S.needSql=true;return[]}throw e});
  S.needSql=false;
  const [p,m,b,c,a,g,f,q]=await Promise.all([all('rc_profiles','id,username,name,data'),all('rc_matches','id,data'),
   opt(all('rc_bookings','*',q=>q.gte('day',addDays(today(),-45)))),opt(all('rc_confirmations','*')),opt(all('rc_admins','user_id',null,'user_id')),
   opt(sb.from('rc_messages').select('*').eq('to_user',S.uid).order('created_at',{ascending:false}).limit(300).then(r=>{if(r.error)throw r.error;return r.data})),
   opt(all('rc_follows','*')),opt(all('rc_friend_requests','*'))]);
  return{profiles:p.map(flat),matches:m.map(r=>Object.assign({},r.data,{id:r.id})),bookings:b.map(bRow),confs:c.map(cRow),admins:a.map(x=>x.user_id),msgs:g.map(gRow),
   follows:f.map(x=>({follower:x.follower,followee:x.followee,at:x.created_at})),reqs:q.map(x=>({id:x.id,from:x.from_user,to:x.to_user,status:x.status,at:x.created_at,resp:x.responded_at}))};
 },
 async saveProfile(p){const {id,username,name,...data}=p;const {error}=await sb.from('rc_profiles').upsert({id,username,name,data,updated_at:new Date().toISOString()});if(error)throw error},
 async addMatch(m){const {error}=await sb.from('rc_matches').insert({id:m.id,data:m});if(error)throw error},
 async updateMatch(m){const {data,error}=await sb.from('rc_matches').update({data:m}).eq('id',m.id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async delMatch(id){const {data,error}=await sb.from('rc_matches').delete().eq('id',id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async addBooking(b){const {error}=await sb.from('rc_bookings').insert({id:b.id,court:b.court,day:b.date,start_slot:b.start,len:b.len,kind:b.kind,data:bData(b)});if(error){if(error.code==='23P01')throw errc('clash');throw error}},
 async updateBooking(b){const {data,error}=await sb.from('rc_bookings').update({data:bData(b)}).eq('id',b.id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async delBooking(id){const {data,error}=await sb.from('rc_bookings').delete().eq('id',id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async addConf(c){const {id,match,user,verdict,at,...data}=c;const {error}=await sb.from('rc_confirmations').insert({id,match_id:match,verdict,data});if(error)throw error},
 async send(list){if(!list.length)return;const {error}=await sb.from('rc_messages').insert(list.map(m=>({id:'g_'+rid(),to_user:m.to,kind:m.kind,data:m.data||{}})));if(error)throw error},
 async updateMsg(m){const {error}=await sb.from('rc_messages').update({read:!!m.read,data:m.data||{}}).eq('id',m.id);if(error)throw error},
 async follow(to){const {error}=await sb.from('rc_follows').insert({id:'f_'+rid(),followee:to});if(error&&error.code!=='23505')throw error},
 async unfollow(to){const {error}=await sb.from('rc_follows').delete().eq('follower',S.uid).eq('followee',to);if(error)throw error},
 async addReq(r){const {error}=await sb.from('rc_friend_requests').insert({id:r.id,to_user:r.to,status:r.status,responded_at:r.resp||null});if(error){if(error.code==='42501')throw errc('cooldown');throw error}},
 async updateReq(r){const {data,error}=await sb.from('rc_friend_requests').update({status:r.status,responded_at:r.resp}).eq('id',r.id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async delReq(id){const {data,error}=await sb.from('rc_friend_requests').delete().eq('id',id).select('id');if(error)throw error;if(!data.length)throw errc('denied')}
};
let Store=LIVE.url&&LIVE.key&&window.supabase?Live:Local;

/* ---------- Demo mode ----------
   A made-up club of 100 players, with games, court bookings and messages, kept in memory only.
   Nothing here is saved, and the real club database is never touched. */
const Demo=Object.assign(memStore('demo',()=>Demo.d,()=>{}),{
 d:null,async init(){},async session(){return S.uid},async signOut(){},
 async taken(u){const k=u.trim().toLowerCase();return this.d.profiles.some(p=>p.username.toLowerCase()===k)},
 async email(){return S.email||''},async newPassword(){throw errc('demo')}
});
const D_FN=['Aarav','Aditi','Akash','Alisha','Amit','Ananya','Arjun','Avinash','Bianca','Carlos','Celina','Chris','Clara','Daniel','Deepa','Dev','Diya','Elena','Eshan','Farah','Gaurav','Gina','Hrishi','Isha','Ishaan','Jason','Jaya','Karan','Kavya','Kiara','Leon','Lina','Maya','Meera','Mihir','Nikhil','Nina','Omkar','Pooja','Pranav','Priya','Rahul','Rhea','Rohan','Sahil','Sana','Sara','Shaun','Simran','Tanvi','Tara','Varun','Vikram','Zoya'];
const D_FEM=new Set(['Aditi','Alisha','Ananya','Bianca','Celina','Clara','Deepa','Diya','Elena','Farah','Gina','Isha','Jaya','Kavya','Kiara','Lina','Maya','Meera','Nina','Pooja','Priya','Rhea','Sana','Sara','Simran','Tanvi','Tara','Zoya']);
const D_LN=['Naik','Kamat','DSouza','Fernandes','Prabhu','Sawant','Shetty','Pai','Menezes','Gaonkar','Rane','Rodrigues','Dias','Pereira','Costa','Almeida','Lobo','Desai','Kerkar','Borkar','Shirodkar','Mascarenhas','Noronha','Sequeira','Gomes','Coutinho','Verma','Mehta','Kapoor','Iyer','Nair','Singh','Malhotra','Bhat','Joshi'];
function buildDemo(you){
 const r=rng(2026),pick=a=>a[Math.floor(r()*a.length)],gauss=()=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
 const now=Date.now(),DAYS=120,T=today(),ago=h=>new Date(now-h*36e5).toISOString();
 const used=new Set([you.username.toLowerCase(),'caelan','surya','arjun']),names=new Set(['Caelan DaCosta','Surya N','Arjun Kamat']),ps=[];
 const lv=(sp,v)=>({start:v,band:tierOf(sp,v),at:new Date(now-DAYS*864e5).toISOString()});
 const caelan={id:'d_caelan',username:'caelan',name:'Caelan DaCosta',gender:'male',setup:true,demo:true,avatar:null,sports:['padel','pickleball'],hand:'right',invites:true,times:['early','evening'],side:'left',levels:{padel:lv('padel',5.2),pickleball:lv('pickleball',4.1)},_skill:{padel:5.3,pickleball:4.2},_grow:{padel:.05,pickleball:.05}};
 const arjun={id:'d_arjun',username:'arjun',name:'Arjun Kamat',gender:'male',setup:true,demo:true,avatar:null,sports:['padel','pickleball'],hand:'right',invites:true,times:['evening','night'],side:'right',friends:'request',levels:{padel:lv('padel',3.4),pickleball:lv('pickleball',3.2)},_skill:{padel:3.45,pickleball:3.2},_grow:{padel:.12,pickleball:.08}};
 const surya={id:'d_surya',username:'surya',name:'Surya N',gender:'male',setup:true,demo:true,avatar:null,sports:['padel','pickleball'],hand:'left',invites:true,times:['morning','night'],side:'right',levels:{padel:lv('padel',4.7),pickleball:lv('pickleball',3.9)},_skill:{padel:4.8,pickleball:4.0},_grow:{padel:.1,pickleball:.08}};
 while(ps.length<97){
  const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;names.add(name);
  let un=(fn+'.'+ln.slice(0,4)).toLowerCase(),k=2;while(used.has(un))un=(fn+'.'+ln.slice(0,4)).toLowerCase()+(k++);used.add(un);
  const x=r(),sports=x<.5?['padel','pickleball']:x<.85?['padel']:['pickleball'],levels={},skill={},grow={};
  sports.forEach(sp=>{const v=sp==='padel'?clamp(3+gauss()*1.15,.8,6.6):clamp(3.2+gauss()*.75,1.2,5.4),st=Math.round(v*10)/10;
   levels[sp]=lv(sp,st);skill[sp]=v+gauss()*.25;grow[sp]=(.1+gauss()*.3)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.45?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  ps.push({id:'d_'+ps.length,username:un,name,gender:D_FEM.has(fn)?'female':'male',setup:true,demo:true,avatar:null,sports,
   hand:r()<.82?'right':r()<.6?'left':'none',invites:r()<.65,times,side:pick(['left','right','either','either']),levels,_skill:skill,_grow:grow});
 }
 ps.push(caelan,surya,arjun);
 if(!you.gender)you.gender='male';
 const all=[you,...ps];
 if(!you._skill){you._skill={};you._grow={};(you.sports||[]).forEach(sp=>{const L=you.levels&&you.levels[sp];if(L){you._skill[sp]=+L.start;you._grow[sp]=.1}})}
 const sk=(p,sp,t)=>p._skill[sp]+p._grow[sp]*t;
 const setsFor=(sp,aw,close)=>{const lg=()=>Math.min(4,Math.floor(r()*(2+close*4)));let sets;
  if(sp==='padel'){sets=r()<.25+close*.3?[[6,lg()],[lg(),6],[6,lg()]]:[[6,lg()],[6,lg()]];if(r()<.15)sets[0]=r()<.5?[7,5]:[7,6]}
  else{const lp=()=>Math.min(9,Math.floor(r()*(4+close*6)));sets=r()<.55?[[11,lp()]]:r()<.6?[[11,lp()],[11,lp()]]:[[11,lp()],[lp(),11],[11,lp()]]}
  return aw?sets:sets.map(x=>[x[1],x[0]])};
 /* games over the last four months */
 const ms=[],N=720,youN=Object.keys(you._skill).length?18:0,every=Math.floor(N/Math.max(1,youN));
 for(let k=0;k<N;k++){
  const t=k/N,sp=r()<.6?'padel':'pickleball',withYou=youN&&k%every===every-1&&you._skill[sp]!=null;
  const pool=all.filter(p=>p!==you&&p._skill&&p._skill[sp]!=null);
  const singles=sp==='pickleball'&&r()<.15,n=singles?2:4,anchor=withYou?you:pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t)));
  const cand=r()<.8?near.slice(0,14):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const half=n/2,A_=grp.slice(0,half),B_=grp.slice(half);
  const ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa;
  const slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const b=B_.map(slot);if(!singles&&r()<.08){const g=B_[1];b[1]={name:pick(D_FN),level:Math.round(clampL(sp,sk(g,sp,t))*10)/10}}
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5),time=clamp(Math.floor(r()*NSLOT),0,NSLOT-3);
  ms.push({id:'dm_'+k,demo:true,sport:sp,format:singles?'singles':'doubles',date:isoIST(d),time,a:A_.map(slot),b,sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 const occ={},T0=today(),ns=nowSlot();
 ms.forEach(m=>{const len=m.sport==='padel'?(r()<.6?3:2):2;
  if(m.date===T0&&ns-len<0)m.date=addDays(T0,-1);
  const hi=m.date===T0?Math.min(NSLOT-len,ns-len):NSLOT-len,used=occ[m.date+m.sport]=occ[m.date+m.sport]||[];let st=null;
  for(let k=0;k<60&&st==null;k++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!used.some(([a,b])=>c<b&&a<c+len))st=c}
  if(st==null)for(let c=0;c<=hi;c++)if(!used.some(([a,b])=>c<b&&a<c+len)){st=c;break}
  if(st==null){m.drop=1;return}m.time=st;m.len=len;m.court=1;used.push([st,st+len])});
 for(let i=ms.length-1;i>=0;i--)if(ms[i].drop)ms.splice(i,1);
 ms.sort(byWhen);
 /* Arjun is your usual partner in your recent games, so his inbox has things to do when you switch to him */
 ms.filter(m=>[...m.a,...m.b].some(x=>x.uid===you.id)&&m.format==='doubles').slice(-6).forEach(m=>{const t=m.a.some(x=>x.uid===you.id)?m.a:m.b;
  if([...m.a,...m.b].some(x=>x.uid===arjun.id))return;const i=t.findIndex(x=>x.uid!==you.id);if(i>=0)t[i]={uid:arjun.id,level:+fmtL(arjun._skill[m.sport])}});
 /* confirmations: older games are confirmed by everyone, the newest are still waiting */
 const confs=[],msgs=[],cut=addDays(T,-4),regs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 ms.forEach(m=>regs(m).filter(u=>u!==m.by&&u!==you.id).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 const recent=ms.filter(m=>m.date>=addDays(T,-6)),mineRecent=recent.filter(m=>regs(m).includes(you.id)),others=recent.filter(m=>!regs(m).includes(you.id));
 /* your latest game with Arjun: you added it, so he is asked to confirm it */
 const withA=ms.filter(m=>regs(m).includes(you.id)&&regs(m).includes(arjun.id)),aLast=withA[withA.length-1],aPrev=withA[withA.length-2];
 if(aLast){aLast.by=you.id;for(let i=confs.length-1;i>=0;i--)if(confs[i].match===aLast.id&&confs[i].user===arjun.id)confs.splice(i,1);
  msgs.push({id:'dg_ac',to:arjun.id,from:you.id,kind:'confirm',data:{match:aLast.id},read:false,at:ago(3)})}
 /* an earlier one: Arjun says the score was wrong, so it waits in your admin inbox */
 if(aPrev){const o=regs(aPrev).find(u=>u!==you.id&&u!==arjun.id);if(o)aPrev.by=o;for(let i=confs.length-1;i>=0;i--)if(confs[i].match===aPrev.id)confs.splice(i,1);
  const prop=aPrev.sets.map(x=>x.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(aPrev.sport==='padel'?(aPrev.winner==='a'?[4,6]:[6,4]):(aPrev.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(x=>x[0]>x[1]).length,c={id:'dc_arj',match:aPrev.id,user:arjun.id,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We definitely took the last set. Can an admin check?',at:ago(2)};confs.push(c);
  [you.id,caelan.id,surya.id].forEach((to,i)=>msgs.push({id:'dg_ad'+i,to,from:arjun.id,kind:'dispute',data:{match:aPrev.id,conf:c.id},read:false,at:c.at}))}
 /* games you played that someone else logged: waiting for your confirmation */
 mineRecent.filter(m=>m!==aLast&&m!==aPrev).slice(-2).forEach((m,i)=>{const o=regs(m).find(u=>u!==you.id&&u!==arjun.id)||regs(m).find(u=>u!==you.id);if(!o)return;m.by=o;
  msgs.push({id:'dg_c'+i,to:you.id,from:o,kind:'confirm',data:{match:m.id},read:false,at:ago(5+i*20)})});
 /* disputed scores waiting for an admin */
 others.filter(m=>m.format==='doubles'&&m.b.every(s=>s.uid)&&!regs(m).includes(arjun.id)).slice(-2).forEach((m,i)=>{
  const loser=(m.winner==='a'?m.b:m.a).find(s=>s.uid&&s.uid!==m.by);if(!loser)return;
  const prop=m.sets.map(s=>s.slice());const j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];
  if(prop.length===2)prop.push(m.sport==='padel'?(m.winner==='a'?[4,6]:[6,4]):(m.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length;
  const notes=['We won the last set, not them.','Wrong score for the final set, we took it 6–4.','The last game went our way. Please check.'];
  const c={id:'dc_x'+i,match:m.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:notes[i%3],at:ago(3+i*9)};confs.push(c);
  msgs.push({id:'dg_d'+i,to:you.id,from:loser.uid,kind:'dispute',data:{match:m.id,conf:c.id},read:false,at:c.at})});
 /* an older game of yours that an admin corrected */
 const fixed=ms.filter(m=>regs(m).includes(you.id)&&m.date<addDays(T,-10)).pop();
 if(fixed){const prev=fixed.sets.map(s=>s.slice());fixed.sets=fixed.sets.map(s=>s[0]>s[1]?[s[0],Math.max(0,s[1]-1)]:[Math.max(0,s[0]-1),s[1]]);
  fixed.review={by:caelan.id,at:ago(30),prev};msgs.push({id:'dg_r',to:you.id,from:caelan.id,kind:'resolved',data:{match:fixed.id,sets:fixed.sets},read:true,at:ago(30)})}
 const playersOf=c=>ps.filter(p=>p.sports.includes(c));
 const yourSport=Object.keys(you._skill)[0]||'padel',buddies=[arjun.id,...playersOf(yourSport).filter(p=>p!==arjun).slice(0,40).sort((a,b)=>Math.abs(sk(a,yourSport,1)-sk(you,yourSport,1))-Math.abs(sk(b,yourSport,1)-sk(you,yourSport,1))).slice(0,5).map(p=>p.id)];
 /* friends and followers */
 const follows=[],reqs=[],pool2=ps.slice(),shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 for(let k=0;k<420;k++){const a=pick(all),b=pick(all);if(a!==b&&a!==you&&b!==you&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*60))})}
 shuffle(pool2);const fr=[...new Set([...buddies.map(id=>ps.find(p=>p.id===id)),caelan,surya,...pool2.slice(0,8)])].filter(Boolean).slice(0,14);
 fr.forEach((p,i)=>reqs.push({id:'dq_f'+i,from:i%2?you.id:p.id,to:i%2?p.id:you.id,status:'accepted',at:ago(24*(5+i*3)),resp:ago(24*(4+i*3))}));
 pool2.slice(8,30).forEach((p,i)=>follows.push({follower:p.id,followee:you.id,at:ago(10+i*13)}));
 fr.slice(0,6).concat(pool2.slice(30,34)).forEach(p=>follows.push({follower:you.id,followee:p.id,at:ago(200)}));
 const inc=pool2.slice(34,36),out=pool2[36],rej=pool2[37];
 inc.forEach((p,i)=>{reqs.push({id:'dq_in'+i,from:p.id,to:you.id,status:'pending',at:ago(4+i*7)});msgs.push({id:'dg_fr'+i,to:you.id,from:p.id,kind:'friend_req',data:{req:'dq_in'+i},read:false,at:ago(4+i*7)})});
 if(out)reqs.push({id:'dq_out',from:you.id,to:out.id,status:'pending',at:ago(30)});
 if(rej)reqs.push({id:'dq_rej',from:you.id,to:rej.id,status:'rejected',at:ago(72),resp:ago(48)});
 msgs.push({id:'dg_fo',to:you.id,from:pool2[10].id,kind:'follow',data:{},read:true,at:ago(26)});
 if(fr[0])msgs.push({id:'dg_fok',to:you.id,from:fr[1]?fr[1].id:fr[0].id,kind:'friend_ok',data:{},read:true,at:ago(80)});
 /* kudos from people you played with */
 const yourGames=ms.filter(m=>regs(m).includes(you.id)).slice(-4);
 [['kudos',0],['gg',1],['luck',2],['fire',3]].forEach(([k,i])=>{const m=yourGames[i];if(!m)return;const from=regs(m).find(u=>u!==you.id);if(from)msgs.push({id:'dg_k'+i,to:you.id,from,kind:'kudos',data:{match:m.id,k},read:i>1,at:ago(2+i*30)})});
 /* Arjun: your friend, with a little life in his inbox */
 if(!reqs.some(q=>q.status==='accepted'&&[q.from,q.to].includes(arjun.id)&&[q.from,q.to].includes(you.id)))reqs.push({id:'dq_arj',from:arjun.id,to:you.id,status:'accepted',at:ago(400),resp:ago(390)});
 [caelan,surya].forEach((p,i)=>reqs.push({id:'dq_a'+i,from:p.id,to:arjun.id,status:'accepted',at:ago(300),resp:ago(290)}));
 const aIn=pool2.slice(40).find(x=>!['d_arjun','d_caelan','d_surya'].includes(x.id));if(aIn){reqs.push({id:'dq_ain',from:aIn.id,to:arjun.id,status:'pending',at:ago(9)});msgs.push({id:'dg_afr',to:arjun.id,from:aIn.id,kind:'friend_req',data:{req:'dq_ain'},read:false,at:ago(9)})}
 if(withA[0])msgs.push({id:'dg_ak',to:arjun.id,from:caelan.id,kind:'kudos',data:{match:withA[0].id,k:'fire'},read:false,at:ago(30)});
 follows.push({follower:you.id,followee:arjun.id,at:ago(300)},{follower:arjun.id,followee:you.id,at:ago(300)});
 const clean=p=>{const q=Object.assign({},p);delete q._skill;delete q._grow;return q};
 return{profiles:all.map(clean),matches:ms,bookings:[],confs,admins:[you.id,caelan.id,surya.id],msgs,follows,reqs,you:you.id,alt:arjun.id};
}
let demoPrev=null;
/* Demo: switch between you (admin) and Arjun (an ordinary player) to see both sides */
async function demoSwitch(to){const d=Demo.d;if(!d)return;const next=to==='player'?d.alt:to==='admin'?d.you:(S.uid===d.alt?d.you:d.alt);if(next===S.uid)return;S.uid=next;await reload();closeSheet(true);A=null;Object.assign(view,{tab:'home',rs:null,rt:null,ib:'all'});
 window.scrollTo(0,0);render();celebrate(S.uid===d.alt?'Now viewing as a player':'Now viewing as an admin')}
/* Pick how to see the demo: as an ordinary player or as an admin */
function demoChooser(){
 openSheet(`<h2>Try the demo</h2><p class="muted small">A made-up club of 100 players with games and messages. Nothing is saved and real accounts are never touched. You can switch between player and admin at any time from the bar at the top.</p>
  <div class="demopick"><button type="button" class="btn brand wide" data-act="demoGo" data-v="player"><b>View as player</b><span>Add scores, confirm games, climb the rankings</span></button>
  <button type="button" class="btn ghost wide" data-act="demoGo" data-v="admin"><b>View as admin</b><span>Everything a player sees, plus reviewing disputed scores</span></button></div>`)}
async function startDemo(role){
 const real=me(),you=real?JSON.parse(JSON.stringify(real)):{id:'d_you',username:'jamie.demo',name:'Jamie Demo',setup:true,avatar:null,sports:['padel','pickleball'],hand:'right',invites:true,times:['evening'],side:'either',levels:{padel:{start:3.2,band:'intermediate'},pickleball:{start:3.1,band:'intermediate'}}};
 demoPrev={store:Store,uid:S.uid};closeSheet(true);S.needSql=false;
 Demo.d=buildDemo(you);Store=Demo;S.uid=role==='player'?Demo.d.alt:you.id;await reload();A=null;Object.assign(view,{tab:'home',rs:null,rt:null});
 splash(role==='player'?'Demo: player view':'Demo: admin view','100 players · '+Demo.d.matches.length+' games');window.scrollTo(0,0);showApp();
}
async function exitDemo(){
 const pv=demoPrev;if(!pv)return;demoPrev=null;Store=pv.store;Demo.d=null;A=null;Object.assign(view,{tab:'home',rs:null,rt:null});closeSheet(true);
 if(pv.uid){S.uid=pv.uid;try{await reload()}catch(e){toast('Could not load the club data. Check your connection.')}window.scrollTo(0,0);showApp();toast('Back to the real club')}
 else{S.uid=null;Object.assign(S,{profiles:[],matches:[],bookings:[],confs:[],admins:[],msgs:[],follows:[],reqs:[]});rate();showAuth()}
}

/* ---------- App state ---------- */
const S={uid:null,profiles:[],matches:[],bookings:[],confs:[],admins:[],msgs:[],follows:[],reqs:[],R:{padel:{},pickleball:{}},D:{},ST:{}};
let view={tab:'home',rs:null,rt:null,pf:{q:'',sport:'',inv:false,time:''},ib:'all'};
const me=()=>S.profiles.find(p=>p.id===S.uid)||null;
const prof=id=>S.profiles.find(p=>p.id===id)||null;
const isAdmin=id=>S.admins.includes(id||S.uid);
/* Friends and following. Friends are two-way (a request the other player accepts, or instant for open accounts).
   Following is one-way and needs no approval. After a rejection, a new request can only be sent 5 days later. */
const COOLDOWN=5*864e5;
const following=id=>S.follows.some(f=>f.follower===S.uid&&f.followee===id);
const followerN=id=>new Set(S.follows.filter(f=>f.followee===id&&prof(f.follower)).map(f=>f.follower)).size;
const followingN=id=>new Set(S.follows.filter(f=>f.follower===id&&prof(f.followee)&&(prof(f.followee).setup)).map(f=>f.followee)).size;
const friendIds=()=>[...new Set(S.reqs.filter(r=>r.status==='accepted').map(r=>r.from===S.uid?r.to:r.from))].filter(id=>id!==S.uid&&prof(id));
const isFriend=id=>friendIds().includes(id);
function relWith(id){
 const rs=S.reqs.filter(r=>(r.from===S.uid&&r.to===id)||(r.from===id&&r.to===S.uid)).sort((a,b)=>(b.at||'').localeCompare(a.at||''));
 const acc=rs.find(r=>r.status==='accepted');if(acc)return{st:'friends',r:acc};
 const inc=rs.find(r=>r.from===id&&r.status==='pending');if(inc)return{st:'incoming',r:inc};
 const out=rs.find(r=>r.from===S.uid&&r.status==='pending');if(out)return{st:'outgoing',r:out};
 const rej=rs.find(r=>r.from===S.uid&&r.status==='rejected'&&Date.now()-new Date(r.resp||r.at)<COOLDOWN);
 if(rej){const until=new Date(new Date(rej.resp||rej.at).getTime()+COOLDOWN);return{st:'cooldown',r:rej,days:Math.max(1,Math.ceil((until-Date.now())/864e5))}}
 return{st:'none'}}
const incomingReqs=()=>S.reqs.filter(r=>r.to===S.uid&&r.status==='pending'&&prof(r.from));
function relButtons(id,small){
 if(id===S.uid)return'';const r=relWith(id),p=prof(id),sz=small?' sm':'';
 const fr=r.st==='friends'?`<button class="btn ghost${sz}" data-act="unfriend" data-v="${id}">✓ Friends</button>`
  :r.st==='incoming'?`<button class="btn brand${sz}" data-act="reqAccept" data-v="${r.r.id}">Accept request</button><button class="btn ghost${sz}" data-act="reqReject" data-v="${r.r.id}">Reject</button>`
  :r.st==='outgoing'?`<button class="btn ghost${sz}" data-act="reqCancel" data-v="${r.r.id}">Requested · Cancel</button>`
  :r.st==='cooldown'?`<button class="btn ghost${sz}" disabled>Ask again in ${r.days} day${r.days===1?'':'s'}</button>`
  :`<button class="btn brand${sz}" data-act="addFriend" data-v="${id}">${p&&p.friends==='open'?'Add friend':'Send friend request'}</button>`;
 return fr+(following(id)?`<button class="btn ghost${sz}" data-act="unfollow" data-v="${id}">Following</button>`:`<button class="btn ghost${sz}" data-act="follow" data-v="${id}">Follow</button>`);
}
/* Kudos: a reaction sent to the people you played with */
const REACT=[['kudos','👍','Kudos','sent you a kudos 👍'],['gg','❤️','Good game','says good game ❤️'],['luck','🍀','Better luck next time','says better luck next time 🍀'],['fire','🔥','You were on fire','says you were on fire 🔥'],['wall','🧱','Brick wall at the net','says you were a brick wall at the net 🧱'],['lob','🌈','Lob of the day','loved your lob of the day 🌈']];
const andList=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
const sentKudos=()=>ls.get('rc_kudos_'+S.uid,{});
/* Courts are booked on Hudle now: old in-app bookings and their invite messages stay in the database but are not shown */
const OLD_BOOKING_MSGS=['invite','invite_reply','cancelled'];
async function reload(){const d=await Store.load();Object.assign(S,{profiles:d.profiles||[],matches:d.matches||[],bookings:[],confs:d.confs||[],admins:d.admins||[],follows:d.follows||[],reqs:d.reqs||[],msgs:(d.msgs||[]).filter(g=>!OLD_BOOKING_MSGS.includes(g.kind)).sort((a,b)=>(b.at||'').localeCompare(a.at||''))});rate()}

/* ---------- Ratings ----------
   Every match is replayed in date order from each player's starting level, so everyone sees the same numbers.
   Each team's strength is the average of its players' levels. Beating a stronger team earns more,
   losing to a weaker one costs more, so a strong player with a newer partner is not punished for it.
   New players move faster for their first matches so their level settles quickly.
   A disputed score is left out until an admin has reviewed it. */
function totals(sets){let a=0,b=0;(sets||[]).forEach(s=>{a+=+s[0]||0;b+=+s[1]||0});return[a,b]}
function applyMatch(R,m,ensure){
 const sp=SPORTS[m.sport];if(!sp)return null;
 const lv=s=>s.uid?(R[s.uid]||ensure(s.uid,clampL(m.sport,+s.level||avg(sp.bands.intermediate)))).r:clampL(m.sport,+s.level||sp.min);
 const ta=avg(m.a.map(lv)),tb=avg(m.b.map(lv)),ea=1/(1+Math.pow(10,(tb-ta)/sp.scale)),sa=m.winner==='a'?1:m.winner==='draw'?.5:0;
 const [ga,gb]=totals(m.sets),share=ga+gb?ga/(ga+gb):.5,mult=.8+.8*Math.abs(share-.5);
 const out={};
 [[m.a,sa,ea],[m.b,1-sa,1-ea]].forEach(([team,s,e])=>team.forEach(sl=>{if(!sl.uid)return;const E=R[sl.uid],k=sp.K*(E.n<5?2:E.n<15?1.4:1),before=E.r;
  E.r=clampL(m.sport,E.r+k*mult*(s-e));const d=E.r-before;E.n++;if(s===1)E.w++;else if(s===0)E.l++;E.last=d;E.hist.push({id:m.id,d,r:E.r,date:m.date});out[sl.uid]=d}));
 return{d:out,ea,ta,tb};
}
const okMatch=m=>m&&SPORTS[m.sport]&&Array.isArray(m.a)&&Array.isArray(m.b)&&m.a.length&&m.b.length&&(m.winner==='a'||m.winner==='b'||m.winner==='draw');
const byWhen=(x,y)=>(x.date||'').localeCompare(y.date||'')||((x.time??99)-(y.time??99))||(x.at||'').localeCompare(y.at||'');
const regsOf=m=>[...m.a,...m.b].filter(s=>s&&s.uid).map(s=>s.uid);
/* pending: waiting for the other players; confirmed; disputed: someone asked for a change; reviewed: an admin set the score */
function statusMap(){
 const by={},st={};S.confs.forEach(c=>(by[c.match]=by[c.match]||[]).push(c));
 S.matches.forEach(m=>{const rv=m.review&&m.review.at||'',cs=(by[m.id]||[]).filter(c=>!rv||c.at>rv),disp=cs.filter(c=>c.verdict==='dispute');
  if(disp.length){st[m.id]={st:'disputed',disp};return}
  if(m.review){st[m.id]={st:'reviewed'};return}
  const need=regsOf(m).filter(u=>u!==m.by),ok=need.filter(u=>cs.some(c=>c.user===u&&c.verdict==='ok'));
  st[m.id]=ok.length>=need.length?{st:'confirmed'}:{st:'pending',need,ok}});
 return st;
}
function rate(){
 const R={},D={};SP_KEYS.forEach(sp=>R[sp]={});S.ST=statusMap();
 const mk=(sp,id,l)=>R[sp][id]={r:l,start:l,n:0,w:0,l:0,hist:[],last:0};
 S.profiles.forEach(p=>SP_KEYS.forEach(sp=>{const L=p.levels&&p.levels[sp];if(L&&isFinite(+L.start))mk(sp,p.id,clampL(sp,L.start))}));
 S.matches.filter(m=>okMatch(m)&&(!S.ST[m.id]||S.ST[m.id].st!=='disputed')).sort(byWhen).forEach(m=>{D[m.id]=applyMatch(R[m.sport],m,(id,l)=>mk(m.sport,id,l))});
 S.R=R;S.D=D;
}
/* What a result would do, without saving it */
function preview(m){
 const R={},mk=(id,l)=>R[id]={r:l,start:l,n:0,w:0,l:0,hist:[],last:0};
 [...m.a,...m.b].forEach(s=>{if(s.uid){const e=S.R[m.sport][s.uid];if(e)R[s.uid]=Object.assign({},e,{hist:[]})}});
 return applyMatch(R,m,mk);
}
const lvlOf=(sp,id)=>{const e=S.R[sp][id];return e?e.r:null};
function rankOf(sp,id){const e=S.R[sp][id];if(!e||!e.n)return null;const t=tierOf(sp,e.r);
 const list=Object.entries(S.R[sp]).filter(([pid,x])=>x.n&&prof(pid)&&tierOf(sp,x.r)===t).sort((a,b)=>b[1].r-a[1].r);
 return{pos:list.findIndex(([pid])=>pid===id)+1,of:list.length,tier:t}}


/* ---------- Small pieces of polish ---------- */
function toast(msg,ms=2600){const el=document.createElement('div');el.className='toast';el.textContent=msg;$('toasts').appendChild(el);
 setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),400)},ms)}
function doneTick(text){celebrate(text||'Done')}
function celebrate(text){
 sfx('pop');buzz([14,60,24]);
 if(!prefs.popups){toast(text);return}
 qsa('.cele').forEach(x=>x.remove());const el=document.createElement('div');el.className='cele';el.setAttribute('role','status');
 el.innerHTML=`<div class="cball" aria-hidden="true"><svg viewBox="0 0 80 80"><defs><radialGradient id="cbg" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#f6ffa8"/><stop offset=".55" stop-color="#d9f24c"/><stop offset="1" stop-color="#9fbd1f"/></radialGradient></defs><g class="spinb"><circle cx="40" cy="40" r="34" fill="url(#cbg)"/><path d="M13 21c11 11 11 27 0 38M67 21C56 32 56 48 67 59" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".92"/></g><circle class="cdot" cx="40" cy="40" r="17"/><path class="ctk" d="M31.5 40.5l6 6 11.5-12.5"/></svg></div><p>${esc(text)}</p>`;
 document.body.appendChild(el);setTimeout(()=>el.remove(),calm()?1300:2300);
}
const greet=()=>{const h=istParts().h;return h<5?'Late night':h<12?'Good morning':h<17?'Good afternoon':'Good evening'};
const first=p=>(p&&p.name||'').trim().split(/\s+/)[0]||p&&p.username||'';
function splash(big,small){
 qsa('.splash').forEach(x=>x.remove());const el=document.createElement('div');el.className='splash';el.setAttribute('aria-hidden','true');
 el.innerHTML=`<div><img src="logo.png" alt=""><p class="s1">${esc(small)}</p><p class="s2">${esc(big)}</p></div>`;
 document.body.appendChild(el);setTimeout(()=>el.remove(),calm()?700:2000);
}
function dateLabel(iso){if(!iso)return'';const t=today(),d=new Date(iso+'T12:00:00');
 if(iso===t)return'Today';if(iso===addDays(t,-1))return'Yesterday';
 return d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}

/* ---------- Sliding pill ("glider"): remembers where it was and glides to the new choice after each redraw ---------- */
const glideMem={};
function glide(bar,on,key){
 let t=bar.querySelector(':scope>.glider');
 if(!t){t=document.createElement('span');t.className='glider';t.setAttribute('aria-hidden','true');bar.prepend(t)}
 if(!on||!on.offsetWidth){t.style.opacity='0';return}
 const to={x:on.offsetLeft,y:on.offsetTop,w:on.offsetWidth,h:on.offsetHeight},from=glideMem[key];glideMem[key]=to;
 const put=p=>{t.style.transform=`translate(${p.x}px,${p.y}px)`;t.style.width=p.w+'px';t.style.height=p.h+'px'};
 if(!t.dataset.ready){t.style.transition='none';put(from||to);t.style.opacity='1';t.getBoundingClientRect();t.style.transition='';t.dataset.ready='1'}
 t.style.opacity='1';put(to);
}
function syncGliders(){
 qsa('.seg').forEach(g=>glide(g,g.querySelector(':scope>button[aria-checked="true"]'),'seg|'+(g.dataset.key||'')));
 const d=$('dock');if(d&&!$('app').hidden)glide(d,d.querySelector(':scope>button[aria-current="page"]'),'dock');
}
addEventListener('resize',()=>{syncGliders();if(V.el&&document.contains(V.el))vSet(V.pos||0)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{syncGliders();if(V.el&&document.contains(V.el))vDraw()});

/* ---------- Track that swells around a held handle (shared by the option bars and the verify slider) ---------- */
function warpPath(W,H,r,cx,hw,b){
 const f=n=>n.toFixed(1),L=Math.max(r,cx-hw*1.7),R=Math.min(W-r,cx+hw*1.7);
 const top=b>.05?`L${f(L)},0 C${f((L+cx)/2)},0 ${f(cx-hw*.55)},${f(-b)} ${f(cx)},${f(-b)} C${f(cx+hw*.55)},${f(-b)} ${f((R+cx)/2)},0 ${f(R)},0 `:'';
 const bot=b>.05?`L${f(R)},${H} C${f((R+cx)/2)},${H} ${f(cx+hw*.55)},${f(H+b)} ${f(cx)},${f(H+b)} C${f(cx-hw*.55)},${f(H+b)} ${f((L+cx)/2)},${H} ${f(L)},${H} `:'';
 return `M${r},0 ${top}L${W-r},0 A${r},${r} 0 0 1 ${W},${r} L${W},${H-r} A${r},${r} 0 0 1 ${W-r},${H} ${bot}L${r},${H} A${r},${r} 0 0 1 0,${H-r} L0,${r} A${r},${r} 0 0 1 ${r},0 Z`;
}

/* ---------- Hold-and-slide option bars ----------
   Tapping works as normal. Press the chosen option and slide: the pill swells, the track bulges around it,
   each option crossed gives a little bounce and a tick, and letting go snaps to the nearest option. */
let pd=null,hold=null,holdRaf=0,noClick=0;
function holdDraw(){
 const h=hold;if(!h)return;const bar=h.bar,W=bar.offsetWidth,H=bar.offsetHeight,P=12,s=h.b/7,dw=h.w*.08*s,dh=h.h*.16*s;
 if(!h.done){h.pill.style.transform=`translate(${(h.x-dw/2).toFixed(1)}px,${(h.y-dh/2).toFixed(1)}px)`;h.pill.style.width=(h.w+dw)+'px';h.pill.style.height=(h.h+dh)+'px';
  if(h.copy)h.copy.style.transform=`translate(${(-(h.x-dw/2)).toFixed(1)}px,${(-(h.y-dh/2)).toFixed(1)}px)`}
 h.svg.setAttribute('width',W);h.svg.setAttribute('height',H+2*P);h.svg.setAttribute('viewBox',`0 ${-P} ${W} ${H+2*P}`);h.svg.style.left='-1px';h.svg.style.top=(-1-P)+'px';
 h.svg.firstChild.setAttribute('d',warpPath(W,H,H/2,h.x+1+h.w/2,h.w*.55,h.b));
}
function holdTick(){holdRaf=0;const h=hold;if(!h)return;h.b+=(h.bT-h.b)*.28;if(Math.abs(h.bT-h.b)<.05)h.b=h.bT;holdDraw();
 if(h.b!==h.bT)holdRaf=requestAnimationFrame(holdTick);else if(h.done){h.svg.remove();h.bar.classList.remove('held');hold=null}}
function startHold(){
 const {bar,btns,pill}=pd,b0=btns[pd.idx];pd.on=true;try{bar.setPointerCapture(pd.id)}catch(x){}
 if(hold&&hold.svg)hold.svg.remove();cancelAnimationFrame(holdRaf);holdRaf=0;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','warp');svg.setAttribute('aria-hidden','true');svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg','path'));bar.prepend(svg);
 hold={bar,btns,pill,svg,w:b0.offsetWidth,h:b0.offsetHeight,y:b0.offsetTop,minX:btns[0].offsetLeft,maxX:btns[btns.length-1].offsetLeft,x:b0.offsetLeft,grab:pd.start-b0.offsetLeft,b:0,bT:calm()?0:7,done:false};
 const cp=document.createElement('div');cp.className='pcopy';cp.setAttribute('aria-hidden','true');
 btns.forEach(x=>{const c=x.cloneNode(true);['data-act','data-v','role','aria-checked'].forEach(a=>c.removeAttribute(a));c.tabIndex=-1;Object.assign(c.style,{left:x.offsetLeft+'px',top:x.offsetTop+'px',width:x.offsetWidth+'px',height:x.offsetHeight+'px'});cp.appendChild(c)});
 pill.appendChild(cp);hold.copy=cp;pill.style.transition='none';bar.classList.add('held');
 if(!holdRaf)holdRaf=requestAnimationFrame(holdTick);
}
function moveHold(e){
 const h=hold;if(!h)return;h.x=clamp(e.clientX-h.grab,h.minX,h.maxX);
 let best=0,bd=1e9;h.btns.forEach((b,i)=>{const d=Math.abs(b.offsetLeft-h.x);if(d<bd){bd=d;best=i}});
 if(best!==pd.cur){pd.cur=best;[h.btns[best],h.copy&&h.copy.children[best]].forEach(z=>{if(!z)return;z.classList.remove('bub');void z.offsetWidth;z.classList.add('bub')});tick()}
 holdDraw();
}
function endHold(cancel){
 const h=hold,p=pd;if(!h)return;const idx=cancel?p.idx:p.cur,nb=h.btns[idx];
 if(h.copy){h.copy.remove();h.copy=null}h.done=true;h.bT=0;if(!holdRaf)holdRaf=requestAnimationFrame(holdTick);
 noClick=Date.now();glideMem['seg|'+(h.bar.dataset.key||'')]={x:h.x,y:h.y,w:h.w,h:h.h};h.pill.style.transition='';
 if(idx!==p.idx&&ACT[nb.dataset.act])ACT[nb.dataset.act](nb.dataset.v,nb);else syncGliders();
}
document.addEventListener('pointerdown',e=>{
 if(e.button>0)return;const b=e.target.closest&&e.target.closest('.seg>button[aria-checked="true"]');if(!b)return;
 const bar=b.parentElement,btns=qsa(':scope>button',bar),pill=bar.querySelector(':scope>.glider');
 if(!pill||btns.length<2)return;pd={bar,btns,pill,start:e.clientX,id:e.pointerId,on:false,idx:btns.indexOf(b),cur:btns.indexOf(b)};
},true);
document.addEventListener('pointermove',e=>{if(!pd||e.pointerId!==pd.id)return;if(!pd.on){if(Math.abs(e.clientX-pd.start)<6)return;startHold()}e.preventDefault();moveHold(e)},true);
document.addEventListener('pointerup',e=>{if(!pd||e.pointerId!==pd.id)return;if(pd.on)endHold(false);pd=null},true);
document.addEventListener('pointercancel',()=>{if(!pd)return;if(pd.on)endHold(true);pd=null},true);
document.addEventListener('click',e=>{if(noClick&&Date.now()-noClick<450&&e.target.closest&&e.target.closest('.seg')){noClick=0;e.stopPropagation();e.preventDefault()}},true);
/* arrow keys move between options in a bar */
document.addEventListener('keydown',e=>{
 const b=e.target.closest&&e.target.closest('.seg>button');if(!b||!/Arrow(Left|Right)/.test(e.key))return;
 const bs=qsa(':scope>button',b.parentElement),i=bs.indexOf(b),n=bs[(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length];
 e.preventDefault();n.click();setTimeout(()=>{const f=qsa(':scope>button',b.parentElement.isConnected?b.parentElement:document.body).find(x=>x.dataset.v===n.dataset.v);if(f)f.focus()},30);
});

/* ---------- Scrolling: progress line, cards that rise in, and on phones the card nearest a moving line glows ---------- */
let io=null;
function reveal(root=document){
 const els=qsa('.rv:not(.in)',root);
 if(calm()||!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
 io=io||new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -5% 0px'});
 let k=0;els.forEach(e=>{const r=e.getBoundingClientRect();e.style.setProperty('--d',(r.top<innerHeight?Math.min(k++,9)*60:0)+'ms');io.observe(e)});
}
const NEAR_SEL='#main .setrow,#main .card:not(:has(.setrow)),#main .rrow,#main .mrow,#main .pod,#main .slot',WIZ_SEL='#wiz .opt,#wiz .avpick button';
let scRaf=0,nearEl=null,nearT=0;
function onScroll(){
 scRaf=0;if(!calm())qsa('.gearbtn .g svg,.sethead .bgear svg').forEach(x=>x.style.transform=`rotate(${Math.round(scrollY*.6)}deg)`);const maxS=document.documentElement.scrollHeight-innerHeight,prog=maxS>0?clamp(scrollY/maxS,0,1):0;
 $('sprog').style.transform=`scaleX(${$('app').hidden&&$('wiz').hidden?0:prog})`;
 const sel=!$('app').hidden?NEAR_SEL:!$('wiz').hidden?WIZ_SEL:null;
 if(matchMedia('(hover:hover)').matches||calm()||!sel)return;
 const top=80,bot=innerHeight-110,mid=top+(bot-top)*(maxS>0?prog:.5);let best=null,bd=1e9;
 qsa(sel).forEach(el=>{if(el.querySelector('.seg,input'))return;const r=el.getBoundingClientRect();if(!r.height||r.bottom<40||r.top>innerHeight-40)return;const d=Math.abs((r.top+r.bottom)/2-mid);if(d<bd){bd=d;best=el}});
 if(nearEl&&!document.contains(nearEl))nearEl=null;
 if(best!==nearEl){if(nearEl)nearEl.classList.remove('near');if(best)best.classList.add('near');nearEl=best}
 clearTimeout(nearT);nearT=setTimeout(()=>{if(nearEl){nearEl.classList.remove('near');nearEl=null}},1100);
}
addEventListener('scroll',()=>{if(!scRaf)scRaf=requestAnimationFrame(onScroll)},{passive:true});

/* ================= Sign in and create account ================= */
let authMode='in',fails=0,lockUntil=0,tkT=0,tkSeq=0;
const UN_RE=/^[A-Za-z0-9._-]+$/;
function showAuth(){
 $('app').hidden=true;$('wiz').hidden=true;$('auth').hidden=false;closeSheet(true);
 $('modeNote').textContent=Store.mode==='live'?'':'Preview mode: accounts and scores are saved on this device only.';
 paintAuth(0);
}
function paintAuth(dir){
 qsa('#authSeg>button').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.v===authMode)));
 const up=authMode==='up';
 $('authPane').innerHTML=`<div class="pane" style="--from:${dir*18}px">
  <h1>${up?'Join the club':'Welcome back'}</h1>
  <p class="muted">${up?'Create your account, then set up your player profile.':'Sign in to see the rankings and log your scores.'}</p>
  <form id="aForm" novalidate autocomplete="on">
   ${up?`<label for="aName">Your name</label><input id="aName" name="name" autocomplete="name" maxlength="60" placeholder="e.g. Rhea Fernandes">`:''}
   <label for="aEmail">Email</label>
   <input id="aEmail" name="email" type="email" inputmode="email" autocomplete="${up?'email':'username'}" autocapitalize="none" spellcheck="false" maxlength="254" placeholder="you@example.com">
   ${up?`<label for="aUser">Username</label>
   <input id="aUser" name="nickname" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="100" placeholder="How other players will see you">
   <div class="fieldnote"><span id="uNote"></span><span id="uCount" class="num">0/100</span></div>`:''}
   <label for="aPass">${up?'Create a password':'Password'}</label>
   <div class="pw"><input id="aPass" name="password" type="password" autocomplete="${up?'new-password':'current-password'}" ${up?'minlength="6"':''}><button type="button" class="pwtoggle" id="pwT" aria-controls="aPass" aria-pressed="false">Show</button></div>
   ${up?`<div class="strength" aria-hidden="true"><i id="pwS"></i></div><div class="fieldnote"><span id="pwN">At least 6 characters.</span></div>`:''}
   <input id="aWeb" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
   <span class="sr" id="hvLabel">Verify you are human</span>
   <div class="slider" id="hv" role="slider" tabindex="0" aria-labelledby="hvLabel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Not verified"><svg class="strack" aria-hidden="true"><defs><clipPath id="hvClip"><path class="tp"/></clipPath></defs><path class="tp tbg"/><rect class="tlit" x="0" y="-12" height="80" clip-path="url(#hvClip)"/><path class="tp tline"/></svg><span class="stclip" aria-hidden="true"><span class="stext s1">Slide to verify</span><span class="stext s2">I'm not a robot</span></span><div class="knob" aria-hidden="true"><span class="kface">›</span></div></div>
   <p class="aerr" id="aErr" role="alert"></p>
   <button class="btn brand wide" id="aBtn" type="submit">${up?'Create account':'Sign in'}</button>
   ${up?'':`<p class="small muted" style="text-align:center;margin-top:14px">Forgot your password? <button type="button" class="btn link small" data-act="forgot">Get help</button></p>`}
  </form>
  <p class="small muted" style="text-align:center;margin-top:18px">Just looking? <button type="button" class="btn link small" data-act="demo">Try the demo</button></p></div>`;
 vInit();syncGliders();
 $('pwT').onclick=()=>{const p=$('aPass'),s=p.type==='password';p.type=s?'text':'password';$('pwT').textContent=s?'Hide':'Show';$('pwT').setAttribute('aria-pressed',String(s))};
 $('aForm').onsubmit=e=>{e.preventDefault();up?doSignUp():doSignIn()};
 if(up){$('aUser').oninput=checkUser;$('aPass').oninput=paintStrength}
 setTimeout(()=>{const f=$(up?'aName':'aEmail');if(f&&matchMedia('(hover:hover)').matches)f.focus()},80);
}
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const aerr=(m,info)=>{const el=$('aErr');if(!el)return;el.textContent=m||'';el.classList.toggle('info',!!info)};
function userProblem(u){if(!u)return'Choose a username.';if(u.length<3)return'Use at least 3 characters.';if(u.length>100)return'Use 100 characters or fewer.';if(!UN_RE.test(u))return'Use letters, numbers, dots, dashes or underscores. No spaces.';return''}
function checkUser(){
 const u=$('aUser').value.trim(),n=$('uNote');$('uCount').textContent=$('aUser').value.length+'/100';clearTimeout(tkT);
 const bad=u?userProblem(u):'';n.className=bad?'bad':'';n.textContent=bad;if(bad||!u)return;
 n.textContent='Checking…';const seq=++tkSeq;
 tkT=setTimeout(async()=>{try{const t=await Store.taken(u);if(seq!==tkSeq)return;n.className=t?'bad':'ok';n.textContent=t?'This username is already taken. Try another one.':'✓ Available'}catch(e){if(seq===tkSeq)n.textContent=''}},350);
}
function paintStrength(){
 const p=$('aPass').value;let s=0;if(p.length>=6)s++;if(p.length>=10)s++;if(/[A-Z]/.test(p)&&/[a-z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;
 const i=$('pwS');i.style.width=(p?Math.max(12,s*20):0)+'%';i.style.background=s<2?'var(--bad)':s<4?'#ffc76b':'var(--good)';
 $('pwN').textContent=p.length<6?'At least 6 characters.':['Weak','Weak','Okay','Good','Strong','Very strong'][s]+' password.';
}
async function doSignIn(){
 if(Date.now()<lockUntil)return aerr(`Too many attempts. Try again in ${Math.ceil((lockUntil-Date.now())/1000)} seconds.`);
 const u=$('aEmail').value.trim(),p=$('aPass').value;
 if(!u||!p)return aerr('Enter your email and password.');
 if(!EMAIL_RE.test(u))return aerr('That email address does not look right.');
 if(!V.ok)return aerr('Slide the handle to verify you are human first.');
 if($('aWeb').value)return aerr('Sign in failed. Refresh the page and try again.');
 busy(true,'Signing in…');
 try{S.uid=await Store.signIn(u,p)}
 catch(e){busy(false);$('aPass').value='';fails++;
  if(e.code==='confirm')return aerr('Confirm your email first: open the link we sent you, then sign in.');
  if(e.code!=='nomatch')return aerr('Could not reach the club database. Check your connection and try again.');
  if(fails>=5){fails=0;lockUntil=Date.now()+30000;vReset();return aerr('Too many attempts. Try again in 30 seconds.')}
  if(fails%3===0)vReset();return aerr("That email and password don't match. Check them and try again.")}
 fails=0;await enter(true);
}
async function doSignUp(){
 const n=$('aName').value.trim(),em=$('aEmail').value.trim(),u=$('aUser').value.trim(),p=$('aPass').value;
 if(!n)return aerr('Enter your name.');
 if(!EMAIL_RE.test(em))return aerr('Enter a valid email address.');
 const bad=userProblem(u);if(bad)return aerr(bad);
 if(p.length<6)return aerr('Your password needs at least 6 characters.');
 if(!V.ok)return aerr('Slide the handle to verify you are human first.');
 if($('aWeb').value)return aerr('Something went wrong. Refresh the page and try again.');
 busy(true,'Creating your account…');
 try{if(await Store.taken(u))throw errc('taken');S.uid=await Store.signUp(n,u,em,p)}
 catch(e){busy(false);
  if(e.code==='taken'){const el=$('uNote');if(el){el.className='bad';el.textContent='This username is already taken. Try another one.'}$('aUser').focus();return aerr('This username is already taken. Try another one.')}
  if(e.code==='emailtaken')return aerr('There is already an account with this email. Sign in instead.');
  if(e.code==='bademail')return aerr('That email address was not accepted. Check it and try again.');
  if(e.code==='weak')return aerr('Choose a stronger password.');
  if(e.code==='rate')return aerr('Too many attempts right now. Wait a few minutes and try again.');
  if(e.code==='confirm'){authMode='in';paintAuth(-1);$('aEmail').value=em;return aerr('Nearly there. We sent a link to '+em+'. Open it to confirm your account, then sign in.',true)}
  return aerr('Could not create your account. Check your connection and try again.')}
 await enter(true);
}
function busy(on,txt){const b=$('aBtn');if(!b)return;b.disabled=on;if(on){b.dataset.t=b.textContent;b.textContent=txt}else if(b.dataset.t)b.textContent=b.dataset.t}

/* Verify slider: drag the handle to the end. A person takes time and moves in many small steps;
   a script tends to jump straight there, fill the hidden field, or act the instant the page loads. */
const V={};
const vMax=()=>Math.max(1,V.el.clientWidth-V.knob.offsetWidth-10);
function vInit(){
 V.el=$('hv');V.knob=V.el.querySelector('.knob');V.shown=Date.now();vReset();
 V.el.addEventListener('pointerdown',e=>{if(V.ok||!e.target.closest('.knob'))return;e.preventDefault();cancelAnimationFrame(V.anim);
  V.drag=true;V.start=Date.now();V.moves=0;V.grab=e.clientX-V.pos*vMax();V.el.classList.add('drag');vBulge(7);try{V.el.setPointerCapture(e.pointerId)}catch(x){}});
 V.el.addEventListener('pointermove',e=>{if(!V.drag)return;const before=V.pos;vSet((e.clientX-V.grab)/vMax());V.moves++;if(Math.floor(before*6)!==Math.floor(V.pos*6))tick()});
 ['pointerup','pointercancel'].forEach(t=>V.el.addEventListener(t,()=>{if(!V.drag)return;V.drag=false;V.el.classList.remove('drag');vBulge(0);vFinish()}));
 V.el.addEventListener('keydown',e=>{if(V.ok)return;const k=e.key;
  if(k==='ArrowRight'||k==='ArrowUp'){e.preventDefault();if(!V.start)V.start=Date.now();V.moves++;vSet(V.pos+.1);if(V.pos>=1)vFinish()}
  else if(k==='ArrowLeft'||k==='ArrowDown'){e.preventDefault();vSet(V.pos-.1)}});
}
function vDraw(){
 const el=V.el,svg=el.querySelector('.strack');if(!svg||!el.clientWidth)return;
 const W=el.clientWidth,H=el.clientHeight,P=12,kw=V.knob.offsetWidth,px=V.pos*vMax(),kL=5+px,kR=kL+kw,cx=kL+kw/2,hw=kw*.85,f=n=>n.toFixed(1);
 svg.setAttribute('width',W);svg.setAttribute('height',H+2*P);svg.setAttribute('viewBox',`0 ${-P} ${W} ${H+2*P}`);
 qsa('.tp',svg).forEach(p=>p.setAttribute('d',warpPath(W,H,14,cx,hw,V.b||0)));
 svg.querySelector('.tlit').setAttribute('width',f(Math.max(0,V.ok?W:cx)));
 /* "Slide to verify" waits in the middle and is pushed out by the handle; "I'm not a robot" follows it in from the left */
 const s1=el.querySelector('.s1'),s2=el.querySelector('.s2'),gap=14,t1=s1.offsetWidth,t2=s2.offsetWidth;
 s1.style.transform=`translateX(${f(Math.max(kw+5+(W-kw-5-t1)/2,kR+gap))}px)`;
 const endKL=5+vMax();s2.style.transform=`translateX(${f(Math.min(Math.max(12,(endKL-t2)/2),kL-gap-t2))}px)`;
}
function vTick(){V.raf=0;const t=V.bT||0,c=V.b||0;V.b=c+(t-c)*.28;if(Math.abs(t-V.b)<.05)V.b=t;vDraw();if(V.b!==t)V.raf=requestAnimationFrame(vTick)}
function vBulge(t){V.bT=calm()?0:t;if(!V.raf)V.raf=requestAnimationFrame(vTick)}
function vSet(p){V.pos=clamp(p,0,1);V.knob.style.transform=`translateX(${V.pos*vMax()}px)`;V.el.setAttribute('aria-valuenow',Math.round(V.pos*100));vDraw()}
function vReset(){cancelAnimationFrame(V.anim);Object.assign(V,{ok:false,start:0,moves:0,pos:0,drag:false,b:0,bT:0});
 V.el.classList.remove('ok','drag');V.el.querySelector('.s2').textContent="I'm not a robot";V.el.setAttribute('aria-valuetext','Not verified');vSet(0)}
function vBack(){cancelAnimationFrame(V.anim);const from=V.pos,t0=performance.now(),D=calm()?1:Math.max(180,from*420);V.start=0;V.moves=0;
 const step=now=>{const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,3);vSet(from*(1-e));if(k<1)V.anim=requestAnimationFrame(step)};V.anim=requestAnimationFrame(step)}
function vFinish(){
 if(V.ok)return;if(V.pos<.96)return vBack();
 const human=Date.now()-V.start>350&&V.moves>=4&&Date.now()-V.shown>1200&&!$('aWeb').value;
 if(!human){vReset();return aerr('We could not verify you. Slide again, a little more slowly.')}
 V.ok=true;V.el.classList.add('ok');V.el.querySelector('.s2').textContent="I'm not a robot ✓";vSet(1);tick();
 V.el.setAttribute('aria-valuetext','Verified');if(/verify|Slide/.test($('aErr').textContent))aerr('');
}

/* ================= Entering the app ================= */
async function enter(fresh){
 try{await reload()}catch(e){toast('Could not load the club data. Check your connection.')}
 let p=me();
 if(!p&&Store.mode==='live'){try{const {data}=await sb.auth.getUser();const md=data.user&&data.user.user_metadata||{};
  if(md.username){p={id:S.uid,username:md.username,name:md.name||md.username,setup:false,created:new Date().toISOString()};
   try{await Store.saveProfile(p);S.profiles.push(p)}catch(e){if(e.code==='23505')return pickUsername(p);throw e}}}catch(e){p=null}}
 if(!p){await Store.signOut();S.uid=null;return showAuth()}
 try{S.email=await Store.email()}catch(e){}
 if(!p.setup){if(fresh)splash('Let’s build your player profile',`Welcome, ${first(p)}`);return startWiz('setup')}
 /* players who joined before the Men and Women rankings: ask once for gender */
 if(!p.gender&&!ls.get('rc_g_skip_'+p.id,0)){ls.set('rc_g_skip_'+p.id,1);return startWiz('gender')}
 if(fresh)splash(first(p),greet());
 showApp();maybeAskNotif();
}
/* Someone else took the username between sign-up and the first sign-in: choose another */
function pickUsername(p){
 showAuth();
 openSheet(`<h2 data-noback>Choose a new username</h2><p class="muted small">Someone took <b>${esc(p.username)}</b> while your account was being set up.</p>
  <label for="nUser">Username</label><input id="nUser" maxlength="100" autocapitalize="none" spellcheck="false" value="">
  <p class="ferr" id="nErr"></p><button class="btn brand wide" id="nSave">Continue</button>`,bg=>{
  bg.querySelector('#nSave').onclick=async()=>{const u=$('nUser').value.trim(),bad=userProblem(u);if(bad){$('nErr').textContent=bad;return}
   try{if(await Store.taken(u)){$('nErr').textContent='This username is already taken. Try another one.';return}
    p.username=u;await Store.saveProfile(p);closeSheet(true);await enter(true)}catch(e){$('nErr').textContent=e.code==='23505'?'This username is already taken. Try another one.':'Could not save. Check your connection.'}}});
}
/* Arrived from a password reset email, or changing the password from Profile */
function showReset(){
 openSheet(`<h2 data-noback>Set a new password</h2><p class="muted small">At least 6 characters.</p>
  <label for="rPass">New password</label><div class="pw"><input id="rPass" type="password" autocomplete="new-password" minlength="6"><button type="button" class="pwtoggle" id="rT">Show</button></div>
  <p class="ferr" id="rErr"></p><button class="btn brand wide" id="rSave">Save password</button>`,bg=>{
  bg.querySelector('#rT').onclick=()=>{const i=$('rPass'),sh=i.type==='password';i.type=sh?'text':'password';$('rT').textContent=sh?'Hide':'Show'};
  bg.querySelector('#rSave').onclick=async()=>{const pw=$('rPass').value;if(pw.length<6){$('rErr').textContent='Use at least 6 characters.';return}
   try{await Store.newPassword(pw);recovery=false;closeSheet();doneTick('Password updated');if($('app').hidden&&S.uid&&$('wiz').hidden)enter(false)}
   catch(e){$('rErr').textContent='Could not update the password. Open the reset link again, or try once more.'}}});
}
function showApp(){$('auth').hidden=true;$('wiz').hidden=true;$('app').hidden=false;render();}

/* ================= Profile set-up ================= */
let W=null,wLock=false;
const ICON={
 padel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="14.5" cy="9.5" rx="6" ry="6.8" transform="rotate(40 14.5 9.5)"/><path d="M10.2 14.2 4 20.4"/><path d="M5.3 17.7l1.2 1.2"/><circle cx="13" cy="8" r=".6" fill="currentColor"/><circle cx="16" cy="9" r=".6" fill="currentColor"/><circle cx="14" cy="11.4" r=".6" fill="currentColor"/></svg>',
 pickleball:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.5"/><g fill="currentColor" stroke="none"><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="7" r="1"/><circle cx="12" cy="17" r="1"/><circle cx="7" cy="12" r="1"/><circle cx="17" cy="12" r="1"/><circle cx="8.5" cy="8.5" r=".9"/><circle cx="15.5" cy="8.5" r=".9"/><circle cx="8.5" cy="15.5" r=".9"/><circle cx="15.5" cy="15.5" r=".9"/></g></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
 mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
 nomail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 4l16 16"/></svg>',
 sunrise:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 17a5 5 0 0 1 10 0M3 17h18M12 4v4M5.6 9.6l1.4 1.4M18.4 9.6 17 11M3 21h18"/></svg>',
 sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 noon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="9" r="4.5"/><path d="M12 1.5v1.5M4 9H2.5M21.5 9H20M5.6 3.6l1 1M18.4 3.6l-1 1M5 18h14M8 21.5h8"/></svg>',
 sunset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 16a5 5 0 0 1 10 0M3 16h18M12 9V5M9.5 7.5 12 5l2.5 2.5M5 20h14"/></svg>',
 moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
 any:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
 gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
 logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
 bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
 speaker:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
 phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2M3 9v6M21 9v6"/></svg>',
 spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
 wave:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/></svg>',
 key:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M17 6l3 3M15 8l2 2"/></svg>',
 device:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
 refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
 back2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
 search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
 bars:n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 19v-3" ${n<1?'opacity=".3"':''}/><path d="M12 19v-8" ${n<2?'opacity=".3"':''}/><path d="M18 19V5" ${n<3?'opacity=".3"':''}/></svg>`
};
const letter=t=>`<span class="ai" style="font:500 17px var(--display)">${t}</span>`;
const GENDERS=[['male','Male','',letter('M')],['female','Female','',letter('F')]];
const HANDS=[['right','Right-handed','',letter('R')],['left','Left-handed','',letter('L')],['none','No preference','Comfortable with either hand',letter('R/L')]];
const TIMES=[['early','Early morning','6 to 9 am',ICON.sunrise],['morning','Morning','9 am to 12',ICON.sun],['afternoon','Afternoon','12 to 4 pm',ICON.noon],['evening','Evening','4 to 8 pm',ICON.sunset],['night','Night','8 to 11 pm',ICON.moon]];
const SIDES=[['left','Left side','The backhand side (revés)'],['right','Right side','The forehand side (drive)'],['either','Either side','Happy on both']];
const lbl=(arr,v)=>(arr.find(x=>x[0]===v)||[])[1]||'';

function startWiz(mode,only){
 const p=me();
 W={mode,only:only||null,i:0,dir:1,d:{gender:p.gender||'',avatar:p.avatar||null,sports:[...(p.sports||[])],hand:p.hand||'',invites:p.invites===undefined?null:p.invites,times:[...(p.times||[])],side:p.side||'',levels:JSON.parse(JSON.stringify(p.levels||{})),q:{}}};
 if(mode==='level')W.only.forEach(sp=>W.d.q[sp]={band:'',ans:[]});
 $('auth').hidden=true;$('app').hidden=true;$('wiz').hidden=false;window.scrollTo(0,0);closeSheet(true);paintWiz();
}
function wSteps(){
 const d=W.d,st=[];
 if(W.mode==='gender')return['gender','save'];
 if(W.mode!=='level')st.push('avatar','gender','sports','hand','invites','times','side');
 const lv=W.mode==='level'?W.only:W.mode==='setup'?(d.sports.length?d.sports:SP_KEYS):d.sports.filter(sp=>!(d.levels[sp]&&isFinite(+d.levels[sp].start)));
 lv.forEach(sp=>{d.q[sp]=d.q[sp]||{band:'',ans:[]};const b=d.q[sp].band;st.push('band:'+sp);
  const n=b?QS[sp][b].length:5;for(let i=0;i<n;i++)st.push('q:'+sp+':'+i);st.push('result:'+sp)});
 st.push(W.mode==='setup'?'done':'save');return st;
}
const ANIM_OF=new Map([[ICON.padel,'swing'],[ICON.pickleball,'roll'],[ICON.mail,'ring'],[ICON.nomail,'shake'],[ICON.sunrise,'rise'],[ICON.sun,'spin'],[ICON.noon,'pulse'],[ICON.sunset,'sink'],[ICON.moon,'rock'],[ICON.any,'spin']]);
function opt(o){const role=o.multi?'aria-pressed':'aria-checked',a=o.icon?ANIM_OF.get(o.icon)||(/M6 19v-3/.test(o.icon)?'bars':'pop'):'';
 return `<button type="button" class="opt${o.big?' big':''}${W&&W.jp===o.act+'|'+o.v?' play':''}" ${o.multi?'':'role="radio"'} ${role}="${!!o.on}" data-act="${o.act}" data-v="${esc(o.v)}">${o.icon?`<span class="oi" data-a="${a}">${o.icon}</span>`:''}<span class="ot"><b>${esc(o.title)}</b>${o.sub?`<span>${esc(o.sub)}</span>`:''}</span><span class="ock">${ICON.check}</span></button>`}
function courtSVG(side){
 const on=s=>side===s||side==='either'?' on':'';
 return `<svg class="cdiag" viewBox="0 0 220 150" aria-hidden="true">
  <rect class="half${on('left')}" x="10" y="20" width="100" height="120"/><rect class="half${on('right')}" x="110" y="20" width="100" height="120"/>
  <rect class="ln" x="10" y="20" width="200" height="120" rx="3"/><line class="ln" x1="110" y1="20" x2="110" y2="100"/><line class="ln" x1="10" y1="100" x2="210" y2="100"/>
  <line class="ln net" x1="4" y1="20" x2="216" y2="20"/>
  <text x="60" y="126" text-anchor="middle" fill="#fff" font-size="10" font-family="Manrope" opacity=".85">LEFT</text><text x="160" y="126" text-anchor="middle" fill="#fff" font-size="10" font-family="Manrope" opacity=".85">RIGHT</text>
  <g class="pl" style="transform:translate(${side==='right'?160:side==='left'?60:110}px,70px)"><circle r="9" fill="#dcf55a"/><circle r="3.5" fill="#1a1430"/></g>
  <text x="110" y="13" text-anchor="middle" fill="#dcf55a" font-size="8" font-family="Manrope" letter-spacing="2">NET</text></svg>`}
function wStep(key){
 const d=W.d,[kind,sp,qi]=key.split(':'),S_=sp&&SPORTS[sp];
 if(kind==='avatar'){
  const p=me(),pv=Object.assign({},p,{avatar:d.avatar});
  return{eyebrow:'Your profile',title:'Add a profile picture',sub:'Upload a photo, or keep the club initials badge. You can change it any time.',valid:true,next:'Continue',
   body:`<div class="avbig">${avHTML(pv,132)}</div>
   <label class="upload">${ICON.upload}<span>${d.avatar?'Choose a different photo':'Upload a photo'}</span><input type="file" accept="image/*" id="wPhoto"></label>
   ${d.avatar?`<p style="text-align:center;margin-top:10px"><button type="button" class="btn link small" data-act="wNoPhoto">Remove photo and use my initials</button></p>`:`<p class="small muted" style="text-align:center;margin-top:12px">No photo? Your initials on club purple look great too.</p>`}`}}
 if(kind==='sports')return{eyebrow:'Your game',title:'Which sports do you play?',sub:'Choose one or both. Each sport has its own level and its own rankings.',valid:d.sports.length>0,
  body:`<div class="opts two">${SP_KEYS.map(k=>opt({multi:1,big:1,act:'wSport',v:k,on:d.sports.includes(k),title:SPORTS[k].name,sub:k==='padel'?'Our purple court':'Our pickleball court',icon:ICON[k]})).join('')}</div>`};
 if(kind==='gender')return{eyebrow:'About you',title:'Are you male or female?',sub:'This puts you in the Men or Women rankings. Everyone is always in All.',valid:!!d.gender,single:1,
  body:`<div class="opts" role="radiogroup">${GENDERS.map(g=>opt({act:'wGender',v:g[0],on:d.gender===g[0],title:g[1],sub:g[2],icon:g[3]})).join('')}</div>`};
 if(kind==='hand')return{eyebrow:'Your game',title:'Which hand do you play with?',sub:'Helps partners plan who covers the middle.',valid:!!d.hand,single:1,
  body:`<div class="opts" role="radiogroup">${HANDS.map(h=>opt({act:'wHand',v:h[0],on:d.hand===h[0],title:h[1],sub:h[2],icon:h[3]})).join('')}</div>`};
 if(kind==='invites')return{eyebrow:'Playing with others',title:'Accept game invites from other players?',sub:'Players looking for a fourth can find you and invite you to a game.',valid:d.invites!==null,single:1,
  body:`<div class="opts" role="radiogroup">${opt({act:'wInv',v:'yes',on:d.invites===true,title:'Yes, invite me',sub:'Show me as open to games',icon:ICON.mail})}${opt({act:'wInv',v:'no',on:d.invites===false,title:'Not right now',sub:'I’ll organise my own games',icon:ICON.nomail})}</div>`};
 if(kind==='times')return{eyebrow:'When you play',title:'What time of day do you like to play?',sub:'Choose all that suit you.',valid:d.times.length>0,
  body:`<div class="opts">${TIMES.map(t=>opt({multi:1,act:'wTime',v:t[0],on:d.times.includes(t[0]),title:t[1],sub:t[2],icon:t[3]})).join('')}</div>`};
 if(kind==='side')return{eyebrow:'On court',title:'Which side of the court do you prefer?',sub:'In doubles, each player covers one side. Facing the net, which is yours?',valid:!!d.side,single:1,
  body:`<div class="courtpick">${courtSVG(d.side)}<div class="opts" role="radiogroup">${SIDES.map(s=>opt({act:'wSide',v:s[0],on:d.side===s[0],title:s[1],sub:s[2]})).join('')}</div></div>`};
 if(kind==='band'){const q=d.q[sp],B=S_.bands;
  return{eyebrow:S_.name+' level',title:`What's your ${S_.name.toLowerCase()} level?`,sub:'Start with a rough idea. A few quick questions will pin down your number.',valid:!!q.band,single:1,
   body:`<div class="opts" role="radiogroup">${[['beginner','Beginner','Learning the shots and the rules'],['intermediate','Intermediate','Regular rallies, starting to play tactically'],['pro','Expert','Strong, competitive, tournament player']].map((b,i)=>opt({act:'wBand',v:sp+'|'+b[0],on:q.band===b[0],title:b[1],sub:`${b[2]} · ${fmtL(B[b[0]][0],1)} to ${fmtL(B[b[0]][1],1)}`,icon:ICON.bars(i+1)})).join('')}</div>`}}
 if(kind==='q'){const q=d.q[sp],list=QS[sp][q.band],it=list[+qi],cur=q.ans[+qi];
  return{eyebrow:`${S_.name} level · Question ${+qi+1} of ${list.length}`,title:it[0],sub:'',valid:cur!==undefined,single:1,
   body:`<div class="opts" role="radiogroup">${it[1].map((a,j)=>opt({act:'wAns',v:sp+'|'+qi+'|'+j,on:cur!==undefined&&q.pick&&q.pick[+qi]===j,title:a[0]})).join('')}</div><p class="qhint">Answer for how you play most of the time.</p>`}}
 if(kind==='result'){const q=d.q[sp],v=levelFrom(sp,q.band,q.ans),t=tierOf(sp,v),had=S.R[sp][S.uid]&&S.R[sp][S.uid].n;
  const segs=TIERS.map(([k,n])=>{const lo=k==='beginner'?S_.min:S_.cut[k==='intermediate'?0:1],hi=k==='pro'?S_.max:S_.cut[k==='beginner'?0:1];return`<span class="${k===t?'on':''}" style="flex:${hi-lo}"><em>${n}</em></span>`}).join('');
  return{eyebrow:`${S_.name} level`,title:'Your starting level',sub:'',valid:true,result:{sp,v},
   body:`<div class="lvl"><div class="big num" id="lvlNum">0.0</div><div class="tierchip"><span class="chip t-${t}">${TIER_NAME[t]} rankings</span></div>
   <div class="gauge">${segs}<i class="mark" id="lvlMark"></i></div>
   <p class="muted small" style="margin-top:34px">${S_.name} is rated from ${fmtL(S_.min,1)} to ${fmtL(S_.max,1)}. Your level now moves with every result you log: beat stronger players to climb faster.</p>
   ${had?'<p class="small" style="margin-top:10px;color:var(--ball)">Your matches will be recalculated from this new starting level.</p>':''}</div>`}}
 if(kind==='done'){const p=me();
  return{eyebrow:'All set',title:`You're on court, ${first(p)}.`,sub:'Your profile is ready. Log your first score to enter the rankings.',valid:true,next:'Enter the club',
   body:`<div class="avbig">${avHTML(Object.assign({},p,{avatar:d.avatar}),132)}</div>
   <div class="chips" style="justify-content:center;margin-top:16px">${d.sports.map(sp=>{const v=levelFrom(sp,d.q[sp].band,d.q[sp].ans);return`<span class="chip t-${tierOf(sp,v)}">${SPORTS[sp].name} ${fmtL(v,1)}</span>`}).join('')}
   <span class="chip">${esc(lbl(HANDS,d.hand))}</span><span class="chip">${esc(lbl(SIDES,d.side))}</span><span class="chip">${d.invites?'Open to invites':'Invites off'}</span></div>`}}
 if(kind==='save')return{eyebrow:'Nearly done',title:'Save your changes?',sub:'Your profile updates for everyone straight away.',valid:true,next:'Save',body:''};
 return{title:'',body:'',valid:true};
}
function paintWiz(anim=true){
 const st=wSteps();W.i=clamp(W.i,0,st.length-1);const key=st[W.i],s=wStep(key);
 const pct=Math.round((W.i+1)/st.length*100);
 $('wiz').innerHTML=`<div class="wtop"><button class="wback" data-act="wBack" aria-label="Back" ${W.i===0&&W.mode==='setup'?'disabled':''}>${ICON.back}</button>
  <div class="wprog"><div class="wbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Profile set-up progress"><i style="width:${W.prevPct||0}%"></i></div><div class="wcount"><span>${esc(s.eyebrow||'')}</span><span class="num">${W.i+1} of ${st.length}</span></div></div></div>
  <div class="wbody"><div class="wstep${anim?' intro':' still'}${W.dir<0?' back':''}" ${anim?'':'style="animation:none"'}>
   <h1>${esc(s.title)}</h1>${s.sub?`<p class="muted">${esc(s.sub)}</p>`:''}${s.body}</div></div>
  <div class="wfoot">${W.mode!=='setup'&&W.i===0?`<button class="btn ghost" data-act="wCancel">Cancel</button>`:''}<button class="btn brand wide" data-act="wNext" ${s.valid?'':'disabled'}>${esc(s.next||'Continue')}</button></div>`;
 W.jp=null;clearTimeout(W.it);if(anim)W.it=setTimeout(()=>{const st=$('wiz').querySelector('.wstep.intro');if(st)st.classList.remove('intro')},1600);
 requestAnimationFrame(()=>{const b=$('wiz').querySelector('.wbar i');if(b)b.style.width=pct+'%';W.prevPct=pct});
 const up=$('wiz').querySelector('.upload');if(up)up.dataset.a='bounce';const ph=$('wPhoto');if(ph)ph.onchange=async()=>{try{W.d.avatar={kind:'img',src:await readPhoto(ph.files[0])};paintWiz(false);toast('Looking good.')}catch(e){toast(e.message)}};
 if(s.result&&anim)countUp(s.result.sp,s.result.v);else if(s.result){$('lvlNum').textContent=fmtL(s.result.v,1);markAt(s.result.sp,s.result.v)}
}
function markAt(sp,v){const S_=SPORTS[sp],m=$('lvlMark');if(m)m.style.left=`calc(${((v-S_.min)/(S_.max-S_.min)*100).toFixed(1)}% - 2px)`}
function countUp(sp,v){
 const el=$('lvlNum');if(!el)return;if(calm()){el.textContent=fmtL(v,1);markAt(sp,v);return}
 const t0=performance.now(),D=1300,from=SPORTS[sp].min;setTimeout(()=>markAt(sp,v),80);
 const step=now=>{const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,4);if(!document.contains(el))return;el.textContent=fmtL(from+(v-from)*e,1);if(k<1)requestAnimationFrame(step);else tick()};requestAnimationFrame(step);
}
function wGo(delta){W.dir=delta;W.i+=delta;window.scrollTo({top:0,behavior:calm()?'auto':'smooth'});paintWiz()}
function wPickThenNext(){if(wLock)return;wLock=true;tick();setTimeout(()=>{wLock=false;const s=wStep(wSteps()[W.i]);if(s.valid)wGo(1)},380)}
async function wFinish(){
 const d=W.d,p=me(),levels=Object.assign({},d.levels);
 Object.entries(d.q).forEach(([sp,q])=>{if(q.band&&q.ans.length===QS[sp][q.band].length)levels[sp]={start:levelFrom(sp,q.band,q.ans),band:q.band,at:new Date().toISOString()}});
 const np=Object.assign({},p,{avatar:d.avatar,sports:W.mode==='level'?[...new Set([...d.sports,...W.only])]:d.sports,hand:d.hand,invites:!!d.invites,times:d.times,side:d.side,levels,setup:true,gender:d.gender||p.gender||''});
 const btn=$('wiz').querySelector('[data-act="wNext"]');if(btn){btn.disabled=true;btn.textContent='Saving…'}
 try{await Store.saveProfile(np)}catch(e){if(btn){btn.disabled=false;btn.textContent='Try again'}return toast('Could not save. Check your connection and try again.')}
 const i=S.profiles.findIndex(x=>x.id===np.id);S.profiles[i]=np;rate();
 const wasSetup=W.mode==='setup';W=null;
 if(wasSetup){splash(first(np),'Welcome to Racquet Culture');view.tab='home'}else{doneTick('Profile updated')}
 showApp();
}

/* ================= App views ================= */
const VIEWS={settings:()=>vSettings(),home:()=>vHome(),book:()=>vBook(),add:()=>vAdd(),rank:()=>vRank(),players:()=>vPlayers(),me:()=>vMe(),inbox:()=>vInbox()};
function render(){
 if(!me())return showAuth();
 after=()=>{};const t=view.tab,html=(VIEWS[t]||VIEWS.home)();
 $('main').innerHTML=`<div class="view">${html}</div>`;
 $('meBtn').innerHTML=avHTML(me());paintBadge();
 paintDock(t);
 $('banner').innerHTML=Store.mode==='demo'?(()=>{const pl=!!(Demo.d&&S.uid===Demo.d.alt);return`<div class="demobar"><span><b>Demo mode.</b> ${pl?'You are <b>Arjun</b>, a player.':'You are an <b>admin</b>.'} Nothing is saved.</span><span class="dbtns"><span class="seg dseg" role="radiogroup" aria-label="View the demo as"><button type="button" role="radio" aria-checked="${pl}" data-act="demoSwitch" data-v="player">Player</button><button type="button" role="radio" aria-checked="${!pl}" data-act="demoSwitch" data-v="admin">Admin</button></span><button class="btn ball sm" data-act="exitDemo">Exit</button></span></div>`})()
  :S.needSql?`<div class="banner"><b>Almost ready.</b> The inbox and score confirmations switch on once a club admin runs the latest <b>setup.sql</b> in Supabase.</div>`
  :Store.mode==='local'&&t==='home'?`<div class="banner"><b>Preview mode.</b> Accounts and scores stay on this device until the live database is connected (see SETUP.md).</div>`:'';
 syncGliders();reveal($('main'));after();onScroll();
}
let after=()=>{};
function paintDock(t){qsa('#dock>button').forEach(b=>{if(b.dataset.v===t){if(b.getAttribute('aria-current')!=='page'){b.classList.remove('play');void b.offsetWidth;b.classList.add('play');setTimeout(()=>b.classList.remove('play'),1000)}b.setAttribute('aria-current','page')}else b.removeAttribute('aria-current')});syncGliders()}
function openHudle(){const w=window.open(HUDLE_URL,'_blank');if(w){try{w.opener=null}catch(e){}}else location.href=HUDLE_URL}
function go(t){if(t===view.tab&&t!=='add'){window.scrollTo({top:0,behavior:calm()?'auto':'smooth'});return}
 if(t==='rank'&&S.uid){after=()=>{};return loadRank(false)}
 if(t==='add'&&view.tab!=='add')A=null;view.tab=t;after=()=>{};window.scrollTo(0,0);render()}
const mySports=()=>{const p=me();return(p.sports&&p.sports.length?p.sports:SP_KEYS)};
const adminChip=id=>isAdmin(id)?' <span class="chip admin">Admin</span>':'';
const unread=()=>S.msgs.filter(m=>!m.read).length;
function paintBadge(){const b=$('ibadge');if(b){const n=unread();b.textContent=n?String(n>99?'99+':n):''}}
function timeAgo(iso){const s=(Date.now()-new Date(iso))/1e3;if(s<60)return'Just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' h ago';return dateLabel(isoIST(new Date(iso)))}
const setsStr=sets=>(sets||[]).map(s=>s[0]+'–'+s[1]).join(', ');
function teamNames(slots){const xs=(slots||[]).filter(Boolean);if(!xs.length)return'';return xs.map(s=>s.uid===S.uid?'You':slotName(s)).join(' & ')}
const matchLine=m=>`${esc(teamNames(m.a))} <span class="muted">vs</span> ${esc(teamNames(m.b))}`;
const whenOf=m=>dateLabel(m.date)+(m.time!=null?', '+(m.len?slotRange(m.time,m.len):slotLabel(m.time)):'');
async function notify(list){list=list.filter(m=>m.to&&m.to!==S.uid);if(!list.length)return;try{await Store.send(list)}catch(e){console.warn(e)}}

function spark(hist,sp){
 if(!hist||hist.length<1)return'';const pts=[hist[0].r-hist[0].d,...hist.map(h=>h.r)].slice(-16);if(pts.length<2)return'';
 const lo=Math.min(...pts),hi=Math.max(...pts),rng_=Math.max(.05,hi-lo),W_=300,H_=46;
 const xy=pts.map((v,i)=>[i/(pts.length-1)*W_,H_-4-((v-lo)/rng_)*(H_-10)]);
 const l=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
 return `<svg class="spark" viewBox="0 0 ${W_} ${H_}" preserveAspectRatio="none" aria-hidden="true"><path class="a" d="${l} L${W_},${H_} L0,${H_} Z"/><path class="l" pathLength="1" d="${l}"/></svg>`;
}
function levelCard(sp,id){
 const e=S.R[sp][id],S_=SPORTS[sp];
 if(!e)return `<div class="card lcard rv"><div class="lhead"><span class="eyebrow">${S_.name}</span></div><p class="muted" style="margin-top:12px">No level yet.</p><button class="btn ghost sm" style="margin-top:12px" data-act="retake" data-v="${sp}">Find my level</button></div>`;
 const t=tierOf(sp,e.r),rk=rankOf(sp,id);
 return `<div class="card lcard hov rv" role="button" tabindex="0" data-act="rankAt" data-v="${sp}"><div class="lhead"><span class="eyebrow">${S_.name}</span><span class="chip t-${t}">${TIER_NAME[t]}</span></div>
  <div class="lv num">${fmtL(e.r)}${e.n?`<small class="delta ${dcls(e.last)}">${fmtD(e.last)}</small>`:''}</div>
  <p class="small muted">${rk?`#${rk.pos} of ${rk.of} in ${TIER_NAME[t]} · `:''}${e.n?`${e.w} won, ${e.l} lost`:'Play a match to get ranked'}</p>${spark(e.hist,sp)}</div>`;
}
function slotName(s){if(!s)return'';if(s.uid){const p=prof(s.uid);if(!p)return'Former member';const w=(p.name||'').trim().split(/\s+/).filter(x=>/^[\p{L}]/u.test(x));return first(p)+(w.length>1?' '+w[w.length-1][0]+'.':'')}return(s.name||'Guest')+' (guest)'}
function slotAv(s){if(s&&s.uid){const p=prof(s.uid);if(p)return avHTML(p)}return avHTML({name:s&&s.name||'G'})}
const ST_LABEL={pending:'Awaiting confirmation',disputed:'Under review',reviewed:'Score set by an admin',confirmed:'Confirmed'};
function matchRow(m,opts={}){
 const D=S.D[m.id],sets=m.sets||[],aw=m.winner==='a',bw=m.winner==='b',mineD=D&&D.d&&D.d[opts.for||S.uid],st=(S.ST[m.id]||{}).st;
 const team=(t,w)=>`<div class="tm${w?' win':''}"><span class="avs">${m[t].map(slotAv).join('')}</span><span>${m[t].map(s=>esc(slotName(s))).join(' & ')}</span></div>`;
 const acts=[];if(isAdmin())acts.push(`<button class="btn link small" data-act="review" data-v="${esc(m.id)}">${st==='disputed'?'Review score':'Edit score'}</button>`);
 if(regsOf(m).includes(S.uid)&&regsOf(m).length>1)acts.unshift(`<button class="btn link small" data-act="kudos" data-v="${esc(m.id)}">Send kudos 👍</button>`);
 if(opts.del&&(m.by===S.uid||isAdmin()))acts.push(`<button class="btn link small" data-act="delMatch" data-v="${esc(m.id)}">Delete</button>`);
 return `<div class="mrow rv${st==='disputed'?' disp':''}"><div class="side">${team('a',aw)}${team('b',bw)}
  <div class="mmeta"><span>${SPORTS[m.sport].name} · ${esc(whenOf(m))}${st&&st!=='confirmed'?` · <span class="stx st-${st}">${ST_LABEL[st]}</span>`:''}</span>${mineD!==undefined?`<span class="delta ${dcls(mineD)}">${fmtD(mineD)}</span>`:''}</div>
  ${acts.length?`<div class="macts">${acts.join('')}</div>`:''}</div>
  <div class="sets num">${sets.map(s=>`<div><span class="${+s[0]>+s[1]?'w':'l'}">${+s[0]}</span><span class="${+s[1]>+s[0]?'w':'l'}">${+s[1]}</span></div>`).join('')}${Array.isArray(m.extra)?`<div class="xset" title="Extra set, played for fun after the match was decided"><span>${+m.extra[0]}</span><span>${+m.extra[1]}</span></div>`:''}</div></div>`;
}
function vHome(){
 const p=me(),ms=S.matches.filter(okMatch).sort(byWhen).reverse(),mine=ms.filter(m=>regsOf(m).includes(S.uid));
 const players=S.profiles.filter(x=>x.setup).length,open=S.profiles.filter(x=>x.setup&&x.invites&&x.id!==S.uid).length;
 const todo=S.msgs.filter(needsAction),disputes=S.matches.filter(m=>(S.ST[m.id]||{}).st==='disputed').length;
 return `<div class="card hero rv"><p class="eyebrow">${esc(greet())}</p><h1>${esc(first(p))}, ready to play?</h1>
  <p class="muted" style="margin-top:6px">${players} player${players===1?'':'s'} in the club · ${open} open to invites right now.</p>
  <div class="cta">${hudleBtn()}<button class="btn ghost" data-act="go" data-v="add">Add score</button></div></div>
  ${isAdmin()?`<div class="card admincard rv"><div class="lhead"><span class="eyebrow">Admin</span><span class="chip admin">Admin</span></div>
   <div class="astats"><button data-act="ibTodo"><b class="num">${disputes}</b><span>score${disputes===1?'':'s'} to review</span></button></div></div>`:''}
  ${todo.length?`<button class="card todo hov rv" data-act="ibTodo"><span class="mi">${ICON.mail}</span><span><b>${todo.length} thing${todo.length===1?'':'s'} need${todo.length===1?'s':''} you</b><span class="small muted">Scores to confirm and reviews in your inbox</span></span><span class="go">›</span></button>`:''}
  <div class="sec"><h2>Your levels</h2><button class="btn link small" data-act="go" data-v="rank">Rankings</button></div>
  <div class="grid2">${mySports().map(sp=>levelCard(sp,S.uid)).join('')}</div>
  <div class="sec"><h2>Your recent games</h2></div>
  <div class="list">${mine.slice(0,4).map(m=>matchRow(m)).join('')||`<div class="card empty rv"><b>No games yet</b>Played today? Add the score and your level starts to move.</div>`}</div>
  <div class="sec"><h2>Our locations</h2><span class="small muted">${VENUES.length}</span></div>
  ${VENUES.map(mapCard).join('')}
  <div class="card hudlecard rv"><div><b>Book a court on Hudle</b><p class="small muted">Courts are booked and paid for on Hudle. Pick a time there, then add your score here after the game.</p></div>${hudleBtn('btn ball wide')}</div>
  <div class="sec"><h2>Around the club</h2></div>
  <div class="list">${ms.filter(m=>!mine.includes(m)).slice(0,6).map(m=>matchRow(m,{for:'-'})).join('')||`<div class="card empty rv"><b>Quiet on court</b>Scores from everyone in the club will appear here.</div>`}</div>`;
}
function seg(key,label,items,cur,act){return `<div class="seg full" data-key="${key}" role="radiogroup" aria-label="${esc(label)}">${items.map(([v,n])=>`<button type="button" role="radio" aria-checked="${v===cur}" data-act="${act}" data-v="${v}">${esc(n)}</button>`).join('')}</div>`}
function vRank(){
 const ms=mySports();if(!view.rs)view.rs=ms[0];const sp=view.rs;
 if(!view.rt){const e=S.R[sp][S.uid];view.rt=e?tierOf(sp,e.r):'intermediate'}
 const g=view.rg||'all',t=view.rt,all=Object.entries(S.R[sp]).filter(([id])=>{const p=prof(id);return p&&p.setup&&(g==='all'||p.gender===g)}).map(([id,e])=>({id,e,p:prof(id)}));
 const inT=all.filter(x=>tierOf(sp,x.e.r)===t),ranked=inT.filter(x=>x.e.n).sort((a,b)=>b.e.r-a.e.r),wait=inT.filter(x=>!x.e.n).sort((a,b)=>b.e.r-a.e.r);
 const counts=Object.fromEntries(TIERS.map(([k])=>[k,all.filter(x=>x.e.n&&tierOf(sp,x.e.r)===k).length]));
 const row=(x,i)=>`<button class="rrow rv${x.id===S.uid?' mine':''}" data-act="player" data-v="${x.id}"><span class="rk">${i+1}</span>${avHTML(x.p)}<span class="nm"><b>${esc(x.p.name)}</b><span>@${esc(x.p.username)} · ${x.e.w}–${x.e.l}</span></span><span class="sc"><b class="num">${fmtL(x.e.r)}</b><span class="delta ${dcls(x.e.last)}">${fmtD(x.e.last)}</span></span></button>`;
 const pod=ranked.slice(0,3),order=[1,0,2].filter(i=>pod[i]);
 const MET=['gold','silver','bronze'],myPos=ranked.findIndex(x=>x.id===S.uid);
 const goal=myPos<0?'':myPos<3?`<p class="goal">You're on the ${['gold','silver','bronze'][myPos]} step. Hold on to it.</p>`:`<p class="goal">You're #${myPos+1}. <b>${fmtL(Math.max(.01,pod[2].e.r-ranked[myPos].e.r))}</b> more to reach the podium.</p>`;
 const podium=pod.length>=3?`<div class="podium">${order.map(i=>{const x=pod[i];return`<button class="pod p${i+1} ${MET[i]} rv" data-act="player" data-v="${x.id}"><span class="shine" aria-hidden="true"></span>${i===0?'<span class="crown" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 8.5l4.6 3.8L12 5l4.4 7.3L21 8.5 19.2 19H4.8z"/><circle cx="3" cy="8" r="1.6"/><circle cx="12" cy="4.4" r="1.6"/><circle cx="21" cy="8" r="1.6"/></svg></span>':''}<span class="medal">${i+1}</span><span class="ring">${avHTML(x.p)}</span><span class="pn">${esc(first(x.p))}</span><span class="pl num">${fmtL(x.e.r)}</span><span class="ptag">${['Gold','Silver','Bronze'][i]}</span></button>`}).join('')}</div>${goal}`:'';
 return `<div class="hd"><div><p class="eyebrow">Community</p><h1>Rankings</h1></div><button class="refresh" data-act="rankRefresh" aria-label="Refresh rankings" title="Refresh">${ICON.refresh}</button></div>
  <div class="ctrls">${seg('rs','Sport',SP_KEYS.map(k=>[k,SPORTS[k].name]),sp,'rankSport')}
  ${seg('rt','Ranking',TIERS.map(([k,n])=>[k,`${n}${counts[k]?' · '+counts[k]:''}`]),t,'rankTier')}
  ${seg('rg','Players',[['all','All'],['male','Men'],['female','Women']],g,'rankGender')}</div>
  <p class="small muted" style="margin:-4px 0 14px">${TIER_NAME[t]} ${SPORTS[sp].name.toLowerCase()}: levels ${t==='beginner'?'below '+fmtL(SPORTS[sp].cut[0],1):t==='intermediate'?fmtL(SPORTS[sp].cut[0],1)+' to '+fmtL(SPORTS[sp].cut[1]-.01):fmtL(SPORTS[sp].cut[1],1)+' and up'}. Players move up a ranking as their level rises. Scores under review are left out until an admin checks them.</p>
  ${podium}<div class="list">${(pod.length>=3?ranked.slice(3).map((x,i)=>row(x,i+3)):ranked.map(row)).join('')}</div>
  ${!ranked.length?`<div class="card empty rv"><b>No one ranked here yet</b>Add a score and the ranking fills up.</div>`:''}
  ${wait.length?`<div class="sec"><h3>Yet to play</h3><span class="small muted">${wait.length}</span></div><div class="list">${wait.map(x=>`<button class="rrow rv" data-act="player" data-v="${x.id}"><span class="rk">–</span>${avHTML(x.p)}<span class="nm"><b>${esc(x.p.name)}</b><span>@${esc(x.p.username)}</span></span><span class="sc"><b class="num">${fmtL(x.e.r,1)}</b></span></button>`).join('')}</div>`:''}`;
}

/* ---------- Book (courts are booked on Hudle) ---------- */
/* General, well-established benefits of playing. Keep these accurate: no made-up numbers. */
const FACTS=[
 ['💪','A full-body workout','Padel works your legs, core, arms and shoulders in every rally.'],
 ['❤️','Good for your heart','Rallies mix quick bursts with short rests, a kind of interval training that keeps your heart fit.'],
 ['🧠','Sharper mind','Reading the ball off the glass and planning your next shot keeps your brain busy and your reactions quick.'],
 ['🤝','Made for friends','Padel is usually played in doubles, so every game is social. Playing with others lifts your mood and keeps you coming back.'],
 ['🎯','Better coordination','Racquet sports train hand-eye coordination, balance and footwork.'],
 ['😌','Less stress, better sleep','Regular exercise like padel helps you unwind, lowers stress and helps you sleep better.'],
 ['🌱','Easy to start','The serve is underhand and the court is small, so beginners can enjoy long rallies from their first game.'],
 ['🔥','Warm up first','A 5–10 minute warm-up before you play gets your body ready and helps prevent injuries.']
];
const myGames=()=>S.matches.filter(okMatch).filter(m=>regsOf(m).includes(S.uid)).sort(byWhen);
const iWon=m=>m.winner!=='draw'&&m[m.winner].some(x=>x&&x.uid===S.uid);
const iLost=m=>m.winner!=='draw'&&!iWon(m);
/* Short personal nudges, built only from the player's real games and levels */
function nudges(){
 const out=[],gs=myGames(),last=gs[gs.length-1],fr=friendIds();
 if(!gs.length)out.push(['🎾','Your first game is waiting','Book a court, play, and add the score here to get your level moving.']);
 else{
  let w=0,l=0;for(let i=gs.length-1;i>=0&&iWon(gs[i]);i--)w++;for(let i=gs.length-1;i>=0&&iLost(gs[i]);i--)l++;
  if(w>=2)out.push(['🏆',`You've won your last ${w} games`,'You’re on a roll. Ready for another win?']);
  else if(w===1)out.push(['🏆','You won your last game','Keep the momentum going. Book your next one.']);
  else if(l>=2)out.push(['💥',`${l} tough results in a row`,'Every great player has them. The best way to bounce back is your next game.']);
  const days=Math.round((new Date(today()+'T12:00:00')-new Date(last.date+'T12:00:00'))/864e5);
  if(days>=7)out.push(['⏰',`${days} days since your last game`,'Your level is waiting for you. Time to get back on court?']);
 }
 mySports().forEach(sp=>{const e=S.R[sp][S.uid];if(!e||!e.n)return;const name=SPORTS[sp].name.toLowerCase(),r=e.r;
  if(e.last>0)out.push(['📈',`Your ${name} level is climbing`,`Up ${fmtD(e.last)} after your last game, now ${fmtL(r)}.`]);
  const rk=rankOf(sp,S.uid);if(rk&&rk.pos&&rk.pos<=10)out.push(['🥇',`#${rk.pos} in ${lbl(TIERS,rk.tier)} ${name}`,rk.pos===1?'You’re top of the table. Can you stay there?':'A few more wins could take you higher.']);
  const close=fr.map(id=>({id,e:S.R[sp][id]})).filter(x=>x.e&&x.e.n);
  const chase=close.filter(x=>x.e.r<r&&r-x.e.r<=0.3&&x.e.last>0).sort((a,b)=>b.e.r-a.e.r)[0];
  if(chase)out.push(['👀',`${first(prof(chase.id))} is catching up`,`Your friend is only ${fmtL(r-chase.e.r)} behind your ${name} level and climbing. Stay ahead!`]);
  const ahead=close.filter(x=>x.e.r>r&&x.e.r-r<=0.3).sort((a,b)=>a.e.r-b.e.r)[0];
  if(ahead)out.push(['🎯',`${first(prof(ahead.id))} is just ahead of you`,`Only ${fmtL(ahead.e.r-r)} above you in ${name}. One good win could close the gap.`]);
 });
 return out.slice(0,4);
}
let factT=null;
function vBook(){
 const v=VENUES[0];
 after=()=>{clearInterval(factT);let i=0;const n=FACTS.length;
  const show=k=>{const el=$('factCar');if(!el){clearInterval(factT);return}i=(k+n)%n;qsa('#factCar .fact').forEach((f,j)=>f.classList.toggle('on',j===i));qsa('#factDots button').forEach((d,j)=>d.setAttribute('aria-current',String(j===i)))};
  show(0);if(!calm())factT=setInterval(()=>show(i+1),5500);
  const car=$('factCar');if(car){let x0=null;car.ontouchstart=e=>{x0=e.touches[0].clientX};car.ontouchend=e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40){show(i+(dx<0?1:-1));clearInterval(factT);if(!calm())factT=setInterval(()=>show(i+1),5500)}x0=null}}
  vBook.show=k=>{show(k);clearInterval(factT);if(!calm())factT=setInterval(()=>show(i+1),5500)};
 };
 const ns=nudges();
 return `<div class="hd"><div><p class="eyebrow">Courts</p><h1>Book a court</h1></div></div>
  <div class="card bookhero rv"><img class="bh-ico" src="hudle.png" alt="" width="56" height="56"><div><b>Book with us through Hudle</b><p class="small muted">Pick your time and pay on Hudle, the app we use for court bookings. ${esc(v.courts)} at ${esc(v.name)}, ${esc(v.area)}.</p></div>
   ${hudleBtn('btn ball wide')}</div>
  ${ns.length?`<div class="sec"><h2>For you</h2></div><div class="list">${ns.map(([i,t,p])=>`<div class="card nudge rv"><span class="ng-i" aria-hidden="true">${i}</span><div><b>${esc(t)}</b><p class="small muted">${esc(p)}</p></div></div>`).join('')}</div>`:''}
  <div class="sec"><h2>Why play padel?</h2></div>
  <div class="card factcar rv" id="factCar" aria-live="polite">${FACTS.map(([i,t,p],k)=>`<div class="fact${k===0?' on':''}"><span class="fc-i" aria-hidden="true">${i}</span><b>${esc(t)}</b><p class="muted">${esc(p)}</p></div>`).join('')}
   <div class="fdots" id="factDots">${FACTS.map((_,k)=>`<button type="button" data-act="factGo" data-v="${k}" aria-label="Fact ${k+1}" aria-current="${k===0}"></button>`).join('')}</div></div>
  <div class="sec"><h2>Where to find us</h2></div>
  ${mapCard(v)}`;
}
/* ---------- Add a score ---------- */
let A=null;
const addSports=()=>SP_KEYS.filter(k=>S.R[k][S.uid]);
function newA(){const sp=addSports()[0]||mySports()[0];return{sport:sp,format:'doubles',date:today(),time:null,len:0,courtNo:1,a:[{uid:S.uid},null],b:[null,null],sets:[['',''],['',''],['','']],err:''}}
function fitFormat(){const n=A.format==='singles'?1:2;['a','b'].forEach(t=>{A[t]=A[t].slice(0,n);while(A[t].length<n)A[t].push(null)});if(!A.a[0])A.a[0]={uid:S.uid}}
function slotLevel(s){if(!s)return null;if(s.uid){const r=lvlOf(A.sport,s.uid);return r!=null?r:(s.level!=null?+s.level:null)}return s.level!=null?+s.level:null}
function slotHTML(t,i){
 const s=A[t][i],fixed=t==='a'&&i===0,lv=slotLevel(s);
 if(!s)return `<button type="button" class="slot" data-act="pick" data-v="${t}${i}"><span class="plus">+</span><span class="sn"><b>${t==='a'?'Add your partner':'Add opponent'}</b><span>Member or guest</span></span></button>`;
 return `<${fixed?'div':'button type="button"'} class="slot filled${fixed?' fixed':''}" ${fixed?'':`data-act="pick" data-v="${t}${i}"`}>${slotAv(s)}<span class="sn"><b>${esc(fixed?'You':slotName(s))}</b><span>${lv!=null?'Level '+fmtL(lv,s.uid?2:1):'Level needed'}${s.uid?'':' · entered'}</span></span></${fixed?'div':'button'}>`;
}
/* The score grid: a clear column for each team, with who is in it, so no one types a score on the wrong side */
function teamHead(label,slots,mine){return `<div class="sh${mine?' mine':''}"><em>${esc(label)}</em><span class="avs">${(slots||[]).filter(Boolean).map(slotAv).join('')}</span><b>${esc(teamNames(slots)||'–')}</b></div>`}
function scoreGrid(sport,rows,key,heads,mineCol){const S_=SPORTS[sport];
 return `<div class="scorehead"><span></span>${heads[0]}<i></i>${heads[1]}</div><div class="sets">${rows.map((s,r)=>`<div class="setrow"><span class="eyebrow">${S_.setName} ${r+1}</span>${[0,1].map(c=>`<input class="${c===mineCol?'mine':''}" inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="${S_.setName} ${r+1}, ${c?'right':'left'} team" data-${key}="${r},${c}" value="${esc(s[c])}" placeholder="–">`).join('<i>–</i>')}</div>`).join('')}</div>`}
function bindGrid(key,rows,onChange,sport){const mx=MAX_GAMES[sport]||99;qsa(`[data-${key}]`).forEach(el=>el.oninput=()=>{const [r,c]=el.dataset[key].split(',');let v=el.value.replace(/\D/g,'').slice(0,2);if(v!==''&&+v>mx){v=rows[+r][+c]||'';toast(sport==='padel'?'A padel set has at most 7 games.':`A pickleball game goes to 11. Scores above ${mx} aren't allowed.`)}rows[+r][+c]=v;if(el.value!==rows[+r][+c])el.value=rows[+r][+c];onChange&&onChange()})}
function vAdd(){
 if(!A)A=newA();fitFormat();const S_=SPORTS[A.sport],days=Array.from({length:30},(_,k)=>addDays(today(),-k));
 after=()=>{bindGrid('set',A.sets,paintFair,A.sport);paintFair();const d=document.querySelector('.dstrip .dchip[aria-pressed="true"]');if(d&&d.scrollIntoView)d.parentElement.scrollLeft=d.offsetLeft-d.parentElement.clientWidth/2+d.offsetWidth/2};
 return `<div class="hd"><div><p class="eyebrow">After the game</p><h1>Add score</h1></div></div>
 <div class="card rv">
  ${addSports().length>1?seg('as','Sport',addSports().map(k=>[k,SPORTS[k].name]),A.sport,'aSport'):`<p class="eyebrow">${S_.name}</p>`}
  ${SP_KEYS.filter(k=>!S.R[k][S.uid]).map(k=>`<p class="small muted" style="margin-top:10px">To add ${SPORTS[k].name.toLowerCase()} games, <button class="btn link small" data-act="retake" data-v="${k}">set your ${SPORTS[k].name.toLowerCase()} level</button> first.</p>`).join('')}
  ${A.sport==='pickleball'?`<div style="margin-top:10px">${seg('af','Format',[['doubles','Doubles'],['singles','Singles']],A.format,'aFormat')}</div>`:''}
  <label>Date played</label>
  <div class="dstrip" role="group" aria-label="Date played">${days.map(d=>{const dt=new Date(d+'T12:00:00'),k=d===today()?'Today':d===addDays(today(),-1)?'Yesterday':dt.toLocaleDateString('en-IN',{weekday:'short'});return`<button type="button" class="dchip" aria-pressed="${d===A.date}" data-act="aDate" data-v="${d}"><span>${k}</span><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('en-IN',{month:'short'})}</span></button>`}).join('')}</div>
  <label>Court</label>
  <div class="chips">${COURT_NOS[A.sport].map(n=>`<button type="button" class="fchip${n===A.courtNo?' on':''}" aria-pressed="${n===A.courtNo}" data-act="aCourt" data-v="${n}">${S_.name} · Court ${n}</button>`).join('')}</div>
  <label>Time played</label>
  <button type="button" class="timepick${A.time==null?' empty':''}" data-act="aTime"><span class="tp-i">${MI.clock}</span><span class="tp-t">${A.time==null?'<b>Choose start and end time</b><span>Tap the slots you were on court</span>':`<b>${slotRange(A.time,A.len)}</b><span>${durLabel(A.len)} · ${esc(dateLabel(A.date))}</span>`}</span><span class="tp-c">›</span></button>
 </div>
 <div class="card rv"><div class="teams">
  <div class="team"><p class="eyebrow">${A.format==='singles'?'You':'Your team'}</p>${A.a.map((_,i)=>slotHTML('a',i)).join('')}</div>
  <span class="vs">VS</span>
  <div class="team"><p class="eyebrow">${A.format==='singles'?'Opponent':'Opponents'}</p>${A.b.map((_,i)=>slotHTML('b',i)).join('')}</div>
 </div><p class="small muted" style="margin-top:12px">Members' levels fill in on their own. For anyone without an account, you enter their level so the points stay fair.</p></div>
 <div class="card rv"><h3>Score</h3><p class="small muted" style="margin:-4px 0 14px">Games won by each team. ${A.sport==='padel'?'Best of 3 sets. Leave the third set empty if you played two.':'Games to 11, win by 2. Best of 3 games.'}</p>
  ${scoreGrid(A.sport,A.sets,'set',[teamHead(A.format==='singles'?'You':'Your team',A.a,1),teamHead(A.format==='singles'?'Opponent':'Opponents',A.b,0)],0)}
  <div id="s3note"></div>
  <p class="ssum" id="ssum"></p></div>
 <div class="card fair rv" id="fair"></div>
 <p class="ferr" id="aErr2" role="alert"></p>
 <button class="btn brand wide" data-act="submitMatch" style="margin-top:6px">Save score</button>
 <p class="tiny muted" style="text-align:center;margin-top:10px">The other players are asked to confirm it. If someone disagrees, an admin checks it.</p>`;
}
/* Which court slots are already used on this day by another logged game */
function usedSlot(i){
 const g=S.matches.find(m=>m.sport===A.sport&&(m.court||1)===A.courtNo&&m.date===A.date&&m.time!=null&&i>=m.time&&i<m.time+(m.len||2));
 if(g)return'Taken';
 return'';
}
function timeSheet(){
 const sel=A.time!=null?[A.time,A.time+A.len-1]:null,st={sel},ns=A.date===today()?nowSlot():NSLOT+1;
 const cell=i=>{const u=usedSlot(i),fut=i>=ns,on=st.sel&&i>=st.sel[0]&&i<=st.sel[1];
  return `<button type="button" class="sl ${u?'booked':fut?'free past':on?'sel':'free'}" data-ts="${i}" ${u||fut?'aria-disabled="true"':''}><b>${slotLabel(i)}</b><span>${u?esc(u):fut?'Later today':on?'Played':'Free'}</span></button>`};
 const paint=()=>{const parts=[['Morning',0,12],['Afternoon',12,22],['Evening',22,NSLOT]];
  $('tsGrid').innerHTML=parts.map(([n,a,z])=>`<p class="eyebrow period">${n}</p><div class="slots">${Array.from({length:z-a},(_,k)=>cell(a+k)).join('')}</div>`).join('');
  $('tsSum').innerHTML=st.sel?`<b>${slotRange(st.sel[0],st.sel[1]-st.sel[0]+1)}</b> · ${durLabel(st.sel[1]-st.sel[0]+1)}`:'Tap when you started, then when you finished';
  $('tsDone').disabled=!st.sel;
  qsa('[data-ts]').forEach(el=>el.onclick=()=>{const i=+el.dataset.ts;if(el.getAttribute('aria-disabled'))return toast(usedSlot(i)?'Another game is already on this court at that time.':'That time has not happened yet.');
   const free=(a,z)=>{for(let k=a;k<=z;k++)if(usedSlot(k)||k>=ns)return false;return true};
   if(!st.sel)st.sel=[i,i];else{const [a,z]=st.sel;
    if(i>=a&&i<=z){if(a===z)st.sel=null;else if(i===a)st.sel=[a+1,z];else if(i===z)st.sel=[a,z-1];else st.sel=[i,i]}
    else{const na=Math.min(a,i),nz=Math.max(z,i);st.sel=nz-na+1<=8&&free(na,nz)?[na,nz]:[i,i]}}
   tick();paint()})};
 openSheet(`<h2>When did you play?</h2><p class="muted small">${SPORTS[A.sport].name} · Court ${A.courtNo} · ${esc(dateLabel(A.date))}. Tap the first and last half hour you were on court. Two games can't share the same court and time.</p>
  <div id="tsGrid" style="margin-top:6px"></div><div class="tsbar"><span id="tsSum"></span><button class="btn brand sm" id="tsDone">Done</button></div>`,bg=>{
  paint();bg.querySelector('#tsDone').onclick=()=>{if(!st.sel)return;A.time=st.sel[0];A.len=st.sel[1]-st.sel[0]+1;closeSheet();tick();render()}});
}
/* Real set rules.
   Padel: a set ends 6–0 to 6–4, 7–5 or 7–6 (tiebreak). Nothing higher.
   Pickleball: a game goes to 11 (or 15 or 21), win by 2; past the target it ends exactly 2 ahead (12–10, 13–11).
   Best of 3: once one side has won the first two, the match is over. A third set played after that is kept as a
   friendly "extra" set: it is saved and shown, but it does not change the winner or anyone's level. */
const MAX_GAMES={padel:7,pickleball:25};
/* Pickleball: a game that reaches the 25-point cap without a 2-point lead (25–24 or 25–25) is a drawn game */
const PB_CAP=25,isDrawGame=(sport,a,b)=>sport==='pickleball'&&Math.max(a,b)===PB_CAP&&Math.abs(a-b)<=1;
function setError(sport,a,b,name){
 const w=Math.max(a,b),l=Math.min(a,b);
 if(sport==='padel'){if((w===6&&l<=4)||(w===7&&(l===5||l===6)))return'';return`${name} ${a}–${b} isn't a padel score. A set ends 6–0 to 6–4, 7–5 or 7–6.`}
 for(const T of [11,15,21]){if((w===T&&l<=T-2)||(w>T&&w-l===2&&l>=T-1))return''}
 if(isDrawGame(sport,a,b))return'';
 return`${name} ${a}–${b} isn't a pickleball score. A game goes to 11 and you must win by 2 (for example 11–7 or 12–10).`;
}
const decidedAfter2=rows=>{const f=r=>rows[r]&&rows[r][0]!==''&&rows[r][1]!==''&&Math.abs(+rows[r][0]-+rows[r][1])>(Math.max(+rows[r][0],+rows[r][1])===PB_CAP?1:0)?(+rows[r][0]>+rows[r][1]?'a':'b'):null;const x=f(0),y=f(1);return x&&x===y?x:null};
function readSetsOf(sport,rows){
 const S_=SPORTS[sport],out=[];let extra=null;
 const dec=decidedAfter2(rows);
 for(let r=0;r<rows.length;r++){const [x,y]=rows[r];if(x===''&&y==='')continue;const nm=`${S_.setName} ${r+1}`;
  if(x===''||y==='')return{err:`Fill in both scores for ${S_.setName.toLowerCase()} ${r+1}.`};
  const a=+x,b=+y;if(a===b&&!isDrawGame(sport,a,b))return{err:`${nm} can't be a draw.`+(sport==='pickleball'?` A game only ends level if it reaches ${PB_CAP}–${PB_CAP}.`:'')};
  if(a>MAX_GAMES[sport]||b>MAX_GAMES[sport])return{err:sport==='padel'?`${nm}: the most games anyone can win in a padel set is 7 (7–5 or 7–6).`:`${nm} has too many points.`};
  const e=setError(sport,a,b,nm);if(e)return{err:e};
  if(r===2&&dec){extra=[a,b];continue}
  out.push([a,b])}
 if(!out.length)return{err:'Enter the score.'};
 const dr=out.filter(s=>isDrawGame(sport,s[0],s[1])).length,wa=out.filter(s=>s[0]>s[1]&&!isDrawGame(sport,s[0],s[1])).length,wb=out.length-wa-dr;
 if(wa===wb){if(!dr)return{err:`${S_.setName}s are level at ${wa}–${wb}. Add the deciding ${S_.setName.toLowerCase()}.`};return{sets:out,winner:'draw',wa,wb,dr,extra}}
 return{sets:out,winner:wa>wb?'a':'b',wa,wb,dr,extra};
}
const readSets=()=>readSetsOf(A.sport,A.sets);
function draft(){
 const sl=[...A.a,...A.b];if(sl.some(s=>!s||slotLevel(s)==null))return null;
 const c=s=>s.uid?{uid:s.uid,level:+fmtL(slotLevel(s))}:{name:s.name,level:+fmtL(s.level,1)};
 return{sport:A.sport,format:A.format,date:A.date,time:A.time,len:A.len,court:A.courtNo,a:A.a.map(c),b:A.b.map(c)};
}
function paintSet3(){
 const nt=$('s3note');if(!nt)return;const dec=decidedAfter2(A.sets),sn=SPORTS[A.sport].setName.toLowerCase(),ins=qsa('[data-set^="2,"]');
 if(!dec){A.extra3=false;ins.forEach(el=>el.disabled=false);nt.innerHTML='';return}
 if(!A.extra3){A.sets[2]=['',''];ins.forEach(el=>{el.value='';el.disabled=true});
  nt.innerHTML=`<div class="s3ask"><p class="small">Looks like ${dec==='a'?'you won':'you lost'} the first 2 ${sn}s, so the match is decided. Did you carry on and play another ${sn}?</p><button type="button" class="btn ghost sm" data-act="aExtra3" data-v="1">Yes, add ${sn} 3</button></div>`;return}
 ins.forEach(el=>el.disabled=false);
 nt.innerHTML=`<div class="s3ask on"><p class="small">${SPORTS[A.sport].setName} 3 is saved as an extra ${sn} for fun. It doesn't change who won or anyone's level.</p><button type="button" class="btn link small" data-act="aExtra3" data-v="0">Remove ${sn} 3</button></div>`;
}
function paintFair(){
 paintSet3();
 const rs=readSets(),sum=$('ssum');
 if(sum){const filled=A.sets.some(s=>s[0]!==''||s[1]!=='');sum.className='ssum'+(rs.sets?rs.winner==='a'?' win':rs.winner==='draw'?'':' lose':'');
  sum.textContent=rs.sets?(rs.winner==='draw'?`It's a draw, ${rs.wa}–${rs.wb} in games won (${rs.dr} drawn at the ${PB_CAP}-point cap)`:(rs.winner==='a'?`Your team wins ${rs.wa}–${rs.wb}`:`Your opponents win ${rs.wb}–${rs.wa}`)+(SPORTS[A.sport].setName==='Set'?' in sets':' in games')):filled?rs.err:''}
 const el=$('fair');if(!el)return;const m=draft();
 if(!m){el.innerHTML=`<h3>Fair points</h3><p class="small muted">Add all the players to see how many points this game is worth for each of you.</p>`;return}
 const ta=avg(m.a.map(s=>s.level)),tb=avg(m.b.map(s=>s.level)),ea=1/(1+Math.pow(10,(tb-ta)/SPORTS[m.sport].scale));
 let rows;
 if(rs.sets){const pv=preview(Object.assign({},m,{sets:rs.sets,winner:rs.winner}));
  rows=[...m.a,...m.b].filter(s=>s.uid).map(s=>`<div class="prow"><span>${s.uid===S.uid?'You':esc(slotName(s))}</span><span class="delta ${dcls(pv.d[s.uid])}">${fmtD(pv.d[s.uid])}</span></div>`).join('');
  rows=`<p class="small" style="margin:10px 0 4px"><b>${rs.winner==='a'?'Your team wins.':rs.winner==='draw'?'A draw.':'Your opponents win.'}</b> Points from this result:</p>${rows}`}
 else{const w=preview(Object.assign({},m,{sets:[[1,0]],winner:'a'})),l=preview(Object.assign({},m,{sets:[[0,1]],winner:'b'}));
  rows=`<div class="prow"><span>If you win</span><span class="delta up">${fmtD(w.d[S.uid])}</span></div><div class="prow"><span>If you lose</span><span class="delta down">${fmtD(l.d[S.uid])}</span></div><p class="tiny muted" style="margin-top:6px">Bigger wins move the number a little more.</p>`}
 el.innerHTML=`<h3>Fair points</h3><p class="small muted">Your team averages <b class="num">${fmtL(ta)}</b>, your opponents <b class="num">${fmtL(tb)}</b>. ${Math.abs(ta-tb)<.15?'An even match.':ta>tb?'You are the favourites, so a win earns less and a loss costs more.':'You are the underdogs, so a win earns more and a loss costs less.'}</p>
  <div class="bar" aria-hidden="true"><i style="width:${(ea*100).toFixed(0)}%"></i><b></b></div><p class="tiny muted">Expected chance your team wins: <b class="num">${Math.round(ea*100)}%</b></p>${rows}`;
}
async function submitMatch(){
 const err=m=>{$('aErr2').textContent=m;toast(m)};$('aErr2').textContent='';
 if(!A.date||A.date>today())return err('Choose the date you played.');
 if(A.time==null||!A.len)return err('Choose the time you played: tap Time played.');
 if(slotDate(A.date,A.time)>new Date())return err('That start time has not happened yet. Check the date and time.');
 for(let i=A.time;i<A.time+A.len;i++){const u=usedSlot(i);if(u)return err(`Court ${A.courtNo} is ${u==='Taken'?'already taken by another game':u.toLowerCase()} at ${slotLabel(i)}. Two games can't share a court at the same time.`)}
 const m=draft();if(!m)return err('Add every player, with a level for anyone who does not have one yet.');
 const ids=regsOf(m);if(new Set(ids).size!==ids.length)return err('The same player is in the game twice.');
 const rs=readSets();if(rs.err)return err(rs.err);
 const rec=Object.assign(m,{id:'m_'+rid(),sets:rs.sets,winner:rs.winner,by:S.uid,at:new Date().toISOString()});if(rs.extra)rec.extra=rs.extra;if(A.booking)rec.booking=A.booking;
 const btn=document.querySelector('[data-act="submitMatch"]');btn.disabled=true;btn.textContent='Saving…';
 try{await Store.addMatch(rec)}catch(e){btn.disabled=false;btn.textContent='Save score';return err('Could not save the score. Check your connection and try again.')}
 S.matches.push(rec);rate();const d=S.D[rec.id]&&S.D[rec.id].d[S.uid];doneTick('Score added');
 notify(ids.filter(u=>u!==S.uid).map(to=>({to,kind:'confirm',data:{match:rec.id}})));
 toast(`Score saved. Your ${SPORTS[rec.sport].name.toLowerCase()} level ${d>0?'rises':'drops'} ${Math.abs(d||0).toFixed(2)} to ${fmtL(lvlOf(rec.sport,S.uid))}. The other players are asked to confirm.`,4200);
 view.rs=rec.sport;view.rt=tierOf(rec.sport,lvlOf(rec.sport,S.uid));A=null;view.tab='rank';setTimeout(()=>{window.scrollTo(0,0);render();if(regsOf(rec).some(u=>u!==S.uid))setTimeout(()=>kudosSheet(rec.id,true),900)},500);
}

/* ---------- Inbox ---------- */
const myConf=mid=>{const m=S.matches.find(x=>x.id===mid),rv=m&&m.review&&m.review.at||'';return S.confs.filter(c=>c.match===mid&&c.user===S.uid&&(!rv||c.at>rv)).pop()};
function needsAction(g){const d=g.data||{};
 if(g.kind==='confirm'){const m=S.matches.find(x=>x.id===d.match);return !!m&&!myConf(m.id)&&!m.review}
 if(g.kind==='dispute')return isAdmin()&&(S.ST[d.match]||{}).st==='disputed';
 if(g.kind==='friend_req'){const r=S.reqs.find(x=>x.id===d.req);return !!r&&r.status==='pending'}
 return false}
const MI={check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
 flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
 user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M19 8v6M16 11h6"/></svg>',
 clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'};
function msgView(g){
 const d=g.data||{},from=prof(g.from),fn=from?first(from):'Someone',m=d.match&&S.matches.find(x=>x.id===d.match);
 const score=m?`<span class="scoreline">${matchLine(m)} · ${setsStr(m.sets)}</span>`:'';
 const gone={i:MI.flag,t:'No longer available',p:'This game has since been removed.'};
 switch(g.kind){
  case 'confirm':{if(!m)return gone;const c=myConf(m.id);
   return{i:MI.check,t:'Is this score right?',p:`${esc(fn)} added your ${SPORTS[m.sport].name.toLowerCase()} game on ${esc(whenOf(m))}.${score}`,
    a:m.review?'<span class="chip st-reviewed">An admin has set this score</span>':c?`<span class="chip ${c.verdict==='ok'?'st-confirmed':'st-disputed'}">${c.verdict==='ok'?'You confirmed it':'You asked for a change'}</span>`
     :`<button class="btn brand sm" data-act="cfOk" data-v="${g.id}">Yes, confirm</button><button class="btn ghost sm" data-act="cfChange" data-v="${g.id}">Change score</button>`}}
  case 'dispute':{if(!m)return gone;const c=S.confs.find(x=>x.id===d.conf),st=(S.ST[m.id]||{}).st;
   return{i:MI.flag,warn:1,t:'Score disputed',p:`${esc(fn)} says ${esc(prof(m.by)?first(prof(m.by))+'\u2019s':'the')} score for this ${SPORTS[m.sport].name.toLowerCase()} game on ${esc(whenOf(m))} is wrong.${score}${c?`<span class="scoreline prop">Their score: ${setsStr(c.sets)}</span>${c.note?`<span class="quote">“${esc(c.note)}”</span>`:''}`:''}`,
    a:st==='disputed'?(isAdmin()?`<button class="btn brand sm" data-act="review" data-v="${esc(m.id)}">Review score</button>`:''):'<span class="chip st-reviewed">Reviewed</span>'}}
  case 'disputed':{if(!m)return gone;return{i:MI.flag,t:'A score is being checked',p:`${esc(fn)} asked for the score of your game on ${esc(whenOf(m))} to be changed. An admin will review it. Until then it is left out of the rankings.${score}`}}
  case 'resolved':{if(!m)return gone;return{i:MI.shield,t:`${esc(fn)} (admin) ${d.kept?'confirmed':'set'} a score`,p:`The score of your ${SPORTS[m.sport].name.toLowerCase()} game on ${esc(whenOf(m))} is now final${d.kept?' as it was added':''}. Rankings are updated.${score}`}}
  case 'friend_req':{const r=S.reqs.find(x=>x.id===d.req);const st=r?r.status:'gone';
   return{i:MI.user,t:`${esc(fn)} wants to be friends`,p:from?`@${esc(from.username)} sent you a friend request.`:'',
    a:st==='pending'?`<button class="btn brand sm" data-act="reqAccept" data-v="${esc(r.id)}">Accept</button><button class="btn ghost sm" data-act="reqReject" data-v="${esc(r.id)}">Reject</button><button class="btn link small" data-act="player" data-v="${esc(g.from)}">View profile</button>`
     :`<span class="chip ${st==='accepted'?'st-confirmed':'st-disputed'}">${st==='accepted'?'You are friends':st==='rejected'?'Rejected':'Request withdrawn'}</span>`}}
  case 'friend_ok':return{i:MI.user,t:`${esc(fn)} accepted your friend request`,p:'You’re now friends.',a:`<button class="btn link small" data-act="player" data-v="${esc(g.from)}">View profile</button>`};
  case 'friend_new':return{i:MI.user,t:`${esc(fn)} added you as a friend`,p:'Your account is open, so no request was needed.',a:`<button class="btn link small" data-act="player" data-v="${esc(g.from)}">View profile</button>`};
  case 'follow':return{i:MI.user,t:`${esc(fn)} started following you`,p:from?`@${esc(from.username)}`:'',a:following(g.from)?'<span class="chip st-confirmed">You follow them too</span>':`<button class="btn ghost sm" data-act="follow" data-v="${esc(g.from)}">Follow back</button>`};
  case 'kudos':{const x=REACT.find(y=>y[0]===d.k)||REACT[0];
   return{i:`<span class="kemoji">${x[1]}</span>`,t:`${esc(from?'@'+from.username:fn)} ${x[3]}`,p:m?`For your ${SPORTS[m.sport].name.toLowerCase()} game with them on ${esc(whenOf(m))}.${score}`:'For your game with them.',
    a:m&&regsOf(m).includes(S.uid)?`<button class="btn ghost sm" data-act="kudos" data-v="${esc(m.id)}">Send one back</button>`:''}}
 }
 return{i:MI.check,t:'Message',p:''};
}
function vInbox(){
 const all=S.msgs,todo=all.filter(needsAction),f=view.ib==='todo'?'todo':'all',list=f==='todo'?todo:all;
 after=()=>{const un=S.msgs.filter(g=>!g.read);if(!un.length)return;setTimeout(()=>{un.forEach(g=>{g.read=true;Store.updateMsg(g).catch(()=>{})});paintBadge()},1500)};
 return `<div class="hd"><div><p class="eyebrow">Messages</p><h1>Inbox</h1></div></div>
  ${seg('ib','Show',[['all','All'],['todo',`To do${todo.length?' · '+todo.length:''}`]],f,'ibTab')}
  ${homeCard()}
  ${`<div class="list" style="margin-top:14px">${list.map(g=>{const v=msgView(g);return`<div class="card msg rv${g.read?'':' unread'}${v.warn?' warn':''}"><span class="mi">${v.i}</span><div class="mb"><b class="mt">${v.t}</b><p>${v.p}</p><span class="tiny muted">${esc(timeAgo(g.at))}</span>${v.a?`<div class="cta">${v.a}</div>`:''}</div></div>`}).join('')
   ||`<div class="card empty rv"><b>${f==='todo'?'All done':'No messages yet'}</b>${f==='todo'?'Nothing needs you right now.':'Scores to confirm, friend requests and updates from admins arrive here.'}</div>`}</div>`}`;
}
/* A player says the score is wrong: they enter what they think it was, and admins and the other players hear about it */
function disputeSheet(mid,msgId){
 const m=S.matches.find(x=>x.id===mid);if(!m)return;const rows=[0,1,2].map(i=>m.sets[i]?m.sets[i].map(String):['','']),mc=m.a.some(s=>s.uid===S.uid)?0:1;
 openSheet(`<h2>What was the score?</h2><p class="muted small">${SPORTS[m.sport].name} · ${esc(whenOf(m))}. Enter the score you think is right. Admins and the other players will see it, and an admin will decide.</p>
  <div style="margin-top:14px">${scoreGrid(m.sport,rows,'ds',[teamHead('Team 1',m.a,mc===0),teamHead('Team 2',m.b,mc===1)],mc)}</div>
  <label for="dNote">What happened? <span class="muted">(optional)</span></label><input id="dNote" maxlength="140" placeholder="e.g. We won the third set 6–4">
  <p class="ferr" id="dErr"></p><button class="btn brand wide" id="dSave">Send to the admins</button>`,bg=>{
  bindGrid('ds',rows,null,m.sport);
  bg.querySelector('#dSave').onclick=async()=>{const rs=readSetsOf(m.sport,rows);if(rs.err){$('dErr').textContent=rs.err;return}
   if(setsStr(rs.sets)===setsStr(m.sets)){$('dErr').textContent='That is the same as the score already added. Change it, or confirm it instead.';return}
   const c={id:'c_'+rid(),match:m.id,user:S.uid,verdict:'dispute',sets:rs.sets,winner:rs.winner,note:$('dNote').value.trim(),at:new Date().toISOString()};
   try{await Store.addConf(c)}catch(e){$('dErr').textContent='Could not send. Check your connection.';return}
   S.confs.push(c);rate();closeSheet();doneTick('Sent to the admins');
   const admins=S.admins.filter(a=>a!==S.uid);
   notify([...admins.map(to=>({to,kind:'dispute',data:{match:m.id,conf:c.id}})),...regsOf(m).filter(u=>!admins.includes(u)).map(to=>({to,kind:'disputed',data:{match:m.id}}))]);
   toast(admins.length?'Sent. An admin will check the score. Until then it is left out of the rankings.':'Sent. No admins are set up yet, so ask the club to check it.',4200);render()}});
}
/* Admins: set the final score. Everyone in the game and the other admins are told who changed it */
function reviewSheet(mid){
 const m=S.matches.find(x=>x.id===mid);if(!m||!isAdmin())return;const st=S.ST[m.id]||{},disp=st.disp||[];
 const rows=[0,1,2].map(i=>m.sets[i]?m.sets[i].map(String):['','']);
 openSheet(`<h2>${disp.length?'Review score':'Edit score'}</h2><p class="muted small">${SPORTS[m.sport].name} · ${esc(whenOf(m))} · added by ${esc(prof(m.by)?prof(m.by).name:'a member')}</p>
  <div class="cmp"><div><span class="eyebrow">Added</span><span class="scoreline">${setsStr(m.sets)}</span></div>${disp.map(c=>`<div><span class="eyebrow">${esc(first(prof(c.user))||'A player')} says</span><span class="scoreline prop">${setsStr(c.sets)}</span>${c.note?`<span class="quote">“${esc(c.note)}”</span>`:''}<button class="btn link small" data-use="${esc(c.id)}">Use this score</button></div>`).join('')}</div>
  <div style="margin-top:14px">${scoreGrid(m.sport,rows,'rv',[teamHead('Team 1',m.a,false),teamHead('Team 2',m.b,false)],-1)}</div>
  <p class="ferr" id="rvErr"></p>
  <div class="cta">${disp.length?'<button class="btn ghost" id="rvKeep" style="flex:1">Keep the added score</button>':''}<button class="btn brand" id="rvSave" style="flex:1">Save final score</button></div>`,bg=>{
  bindGrid('rv',rows,null,m.sport);
  qsa('[data-use]',bg).forEach(x=>x.onclick=()=>{const c=disp.find(y=>y.id===x.dataset.use);[0,1,2].forEach(i=>{rows[i]=c.sets[i]?c.sets[i].map(String):['',''];[0,1].forEach(k=>{const el=bg.querySelector(`[data-rv="${i},${k}"]`);if(el)el.value=rows[i][k]})});tick()});
  const done=async keep=>{const rs=keep?{sets:m.sets,winner:m.winner}:readSetsOf(m.sport,rows);if(rs.err){$('rvErr').textContent=rs.err;return}
   const nm=Object.assign({},m,{sets:rs.sets,winner:rs.winner,review:{by:S.uid,at:new Date().toISOString(),prev:m.sets,kept:!!keep||setsStr(rs.sets)===setsStr(m.sets)}});
   try{await Store.updateMatch(nm)}catch(e){$('rvErr').textContent=e.code==='denied'?'Only admins can change scores. Check that your account is an admin in Supabase.':'Could not save. Check your connection.';return}
   upsert(S.matches,nm);rate();closeSheet();doneTick('Score updated');
   notify([...regsOf(nm),...S.admins].filter((x,i,a)=>a.indexOf(x)===i).map(to=>({to,kind:'resolved',data:{match:nm.id,sets:nm.sets,kept:nm.review.kept}})));
   toast('Score saved. Rankings updated and everyone in the game has been told.',3600);render()};
  bg.querySelector('#rvSave').onclick=()=>done(false);const k=bg.querySelector('#rvKeep');if(k)k.onclick=()=>done(true)});
}

/* ---------- Players ---------- */
function vPlayers(){
 after=()=>{const q=$('pQ');if(q)q.oninput=()=>{view.pf.q=q.value;paintPlayers()};paintPlayers()};
 const f=view.pf,pv=view.pv||'all',chip=(k,v,t)=>`<button type="button" class="fchip" aria-pressed="${f[k]===v}" data-act="pf" data-v="${k}|${v}">${t}</button>`,inc=incomingReqs();
 return `<div class="hd"><div><p class="eyebrow">Community</p><h1>Players</h1></div></div>
  ${inc.length?`<div class="card reqcard rv" style="margin:14px 0"><b>Friend requests · ${inc.length}</b>${inc.map(r=>{const p=prof(r.from);return`<div class="prow2"><span class="who" role="button" tabindex="0" data-act="player" data-v="${p.id}" aria-label="View ${esc(p.name)}'s profile">${avHTML(p)}<span class="nm"><b>${esc(p.name)}</b><span class="small muted">@${esc(p.username)}</span></span></span><button class="btn brand sm" data-act="reqAccept" data-v="${r.id}">Accept</button><button class="btn ghost sm" data-act="reqReject" data-v="${r.id}">Reject</button></div>`}).join('')}</div>`:''}
  ${seg('pv','Show',[['all','Everyone'],['friends',`Friends · ${friendIds().length}`],['following',`Following · ${followingN(S.uid)}`]],pv,'pvTab')}
  <div class="search" style="margin-top:14px">${ICON.search}<input id="pQ" type="search" placeholder="Search by name or username" value="${esc(f.q)}" aria-label="Search players"></div>
  <div class="chips" style="margin:12px 0 18px">${chip('inv',true,'Open to invites')}${SP_KEYS.map(k=>chip('sport',k,SPORTS[k].name)).join('')}${TIMES.map(t=>chip('time',t[0],t[1])).join('')}</div>
  <div class="list" id="pList"></div>`;
}
function paintPlayers(){
 const f=view.pf,pv=view.pv||'all',q=f.q.trim().toLowerCase(),el=$('pList');if(!el)return;const fr=friendIds();
 const list=S.profiles.filter(p=>p.setup&&(pv==='all'||(pv==='friends'?fr.includes(p.id):following(p.id)))&&(!q||(p.name+' '+p.username).toLowerCase().includes(q))&&(!f.inv||p.invites)&&(!f.sport||(p.sports||[]).includes(f.sport))&&(!f.time||(p.times||[]).includes(f.time)))
  .sort((a,b)=>(a.id===S.uid)-(b.id===S.uid)||(fr.includes(b.id)-fr.includes(a.id))||a.name.localeCompare(b.name));
 el.innerHTML=list.map(p=>{const r=p.id===S.uid?null:relWith(p.id).st;return`<div class="card pcard hov rv" role="button" tabindex="0" data-act="player" data-v="${p.id}">${avHTML(p)}<div class="pi"><b>${esc(p.name)}${p.id===S.uid?' <span class="muted small">(you)</span>':''}${adminChip(p.id)}</b><span class="small muted">@${esc(p.username)}${r==='friends'?' · <span class="frtag">Friend</span>':''}${following(p.id)?' · Following':''}${r==='incoming'?' · <span class="invt">Wants to be friends</span>':''}</span>
  <div class="tags">${(p.sports||[]).map(sp=>{const lv=lvlOf(sp,p.id);return lv!=null?`<span class="chip t-${tierOf(sp,lv)}">${SPORTS[sp].name} ${fmtL(lv,1)}</span>`:''}).join('')}${p.invites?'<span class="chip ball">Open to invites</span>':''}<span class="chip">${esc(lbl(SIDES,p.side))}</span></div></div></div>`}).join('')
  ||`<div class="card empty rv"><b>${pv==='friends'?'No friends yet':pv==='following'?'Not following anyone yet':'No players match'}</b>${pv==='all'?'Try fewer filters.':'Open a player’s profile to add them as a friend or follow them.'}</div>`;
 reveal(el);
}
/* ---------- My profile ---------- */
function vMe(){
 const p=me(),mine=S.matches.filter(okMatch).filter(m=>regsOf(m).includes(S.uid)).sort(byWhen).reverse();
 const sw=(k,t,s)=>`<div class="setline"><div><b>${t}</b><p class="small muted">${s}</p></div><button class="switch" role="switch" aria-checked="${!!prefs[k]}" data-act="pref" data-v="${k}" aria-label="${t}"></button></div>`;
 return `<div class="card phead rv"><div class="phtools"><button class="gearbtn" data-act="go" data-v="settings" aria-label="Settings" title="Settings"><span class="g">${ICON.gear}</span></button>${Store.mode==='demo'?'':`<button class="gearbtn out" data-act="signOut" aria-label="Sign out" title="Sign out">${ICON.logout}</button>`}</div><div class="avbig" style="width:112px;height:112px">${avHTML(p,112)}</div><h1 style="margin-top:12px">${esc(p.name)}</h1><p class="muted">@${esc(p.username)}${adminChip(S.uid)}</p>
  <div class="fstats"><button data-act="pvGo" data-v="friends"><b class="num">${friendIds().length}</b>friends</button><span><b class="num">${followerN(S.uid)}</b>followers</span><button data-act="pvGo" data-v="following"><b class="num">${followingN(S.uid)}</b>following</button></div>
  <div class="cta" style="justify-content:center"><button class="btn ghost sm" data-act="editProfile">Edit profile</button><button class="btn ghost sm" data-act="go" data-v="inbox">Inbox${unread()?' · '+unread():''}</button></div></div>
  ${isAdmin()?`<div class="card admincard rv" style="margin-top:12px"><b>Admin tools</b><p class="small muted" style="margin:4px 0 12px">You can review, edit or delete any score, including the date and time it was played.</p><div class="cta" style="margin-top:0"><button class="btn ghost sm" data-act="ibTodo">Scores to review</button></div></div>`:''}
  <div class="sec"><h2>Levels</h2></div><div class="grid2">${mySports().map(sp=>levelCard(sp,S.uid)).join('')}</div>
  <div class="cta">${mySports().map(sp=>`<button class="btn ghost sm" data-act="retake" data-v="${sp}">Retake ${SPORTS[sp].name.toLowerCase()} questions</button>`).join('')}</div>
  <div class="sec"><h2>How you play</h2></div>
  <div class="card rv"><dl class="prefs"><dt>Sports</dt><dd>${(p.sports||[]).map(s=>SPORTS[s].name).join(' and ')||'–'}</dd><dt>Gender</dt><dd>${esc(lbl(GENDERS,p.gender))||'Not set yet. Tap Edit profile.'}</dd><dt>Hand</dt><dd>${esc(lbl(HANDS,p.hand))||'–'}</dd><dt>Court side</dt><dd>${esc(lbl(SIDES,p.side))||'–'}</dd><dt>Plays</dt><dd>${(p.times||[]).map(t=>lbl(TIMES,t)).join(', ')||'–'}</dd><dt>Invites</dt><dd>${p.invites?'Open to invites':'Not right now'}</dd></dl></div>
  <div class="sec"><h2>Your games</h2><span class="small muted">${mine.length}</span></div>
  <div class="list">${mine.map(m=>matchRow(m,{del:1})).join('')||`<div class="card empty rv"><b>No games yet</b>Your scores and points will show here.</div>`}</div>
  <button class="card setlink hov rv" data-act="go" data-v="settings"><span class="sico" data-a="spin">${ICON.gear}</span><span><b>Settings</b><span class="small muted">Theme, notifications, sounds, pop-ups, friend requests and your account</span></span><span class="go">›</span></button>
  ${Store.mode==='demo'?'':`<button class="btn danger wide" style="margin-top:14px" data-act="signOut">Sign out</button>`}`;
}

/* ---------- Settings ---------- */
const NOTIF_OK=()=>'Notification' in window;
function vSettings(){
 const row=(icon,a,t,sub,ctl,id)=>`<div class="setrow" ${id?`id="${id}"`:''}><span class="sico" data-a="${a}">${icon}</span><div class="grow"><b>${t}</b><span class="small muted">${sub}</span></div>${ctl||''}</div>`;
 const sw=(k)=>`<button class="switch" role="switch" aria-checked="${!!prefs[k]}" data-act="pref" data-v="${k}" aria-label="${k}"></button>`;
 const np=NOTIF_OK()?Notification.permission:'unsupported';
 const nctl=np==='granted'?'<span class="chip st-confirmed">On</span>':np==='denied'?'<span class="chip st-disputed">Blocked</span>':np==='unsupported'?'<span class="chip">Not available</span>':'<button class="btn brand sm" data-act="notifAsk">Turn on</button>';
 const nsub=np==='granted'?'You’ll be told about scores to confirm, friend requests and kudos.':np==='denied'?'Blocked in your browser. Allow them in your browser’s site settings.':np==='unsupported'?'This browser can’t show notifications. On iPhone, add the app to your home screen first.':'Get told about invites, scores to confirm and kudos.';
 const th=prefs.theme||'dark';
 return `<div class="hd"><div><button class="btn link small" data-act="go" data-v="me" style="padding-left:0">‹ Profile</button><h1 class="sethead"><span class="bgear">${ICON.gear}</span>Settings</h1></div></div>
 <p class="eyebrow period">Appearance</p>
 <div class="card rv">${row(themeNow()==='light'?ICON.sun:ICON.moon,themeNow()==='light'?'spin':'rock','Theme',th==='device'?'Follows your phone or computer':th==='light'?'Light':'Dark, the club look')}
  <div class="seg full themeseg" data-key="theme" role="radiogroup" aria-label="Theme" style="margin-top:12px">${[['device','Device',ICON.device,'pop'],['light','Light',ICON.sun,'spin'],['dark','Dark',ICON.moon,'rock']].map(([v,n,ic,a])=>`<button type="button" role="radio" aria-checked="${th===v}" data-act="theme" data-v="${v}"><span class="ti" data-a="${a}">${ic}</span>${n}</button>`).join('')}</div></div>
 <p class="eyebrow period">App</p>
 <div class="card rv">${row(ICON.phone,'shake','Add to Home Screen',isInstalled()?'Done. You’re using Racquet Culture from your Home Screen.':'Put the app icon on your phone so it opens full screen, like a normal app.',isInstalled()?'<span class="chip st-confirmed">Added</span>':`<button class="btn brand sm" data-act="${installEvt?'hsInstall':'hsHow'}">${installEvt?'Add':'Show me'}</button>`)}</div>
 <p class="eyebrow period">Notifications and feedback</p>
 <div class="card rv">${row(ICON.bell,'ring','Notifications',nsub,nctl)}${row(ICON.speaker,'pulse','Sounds','A soft chime for new messages and a pop when something is done.',sw('sound'),'r-sound')}${row(ICON.phone,'shake','Vibration','A light tap when you slide, choose or confirm (phones that support it).',sw('haptics'),'r-haptics')}${row(ICON.spark,'pop','Pop-ups','The padel ball tick when a score is added, an invite is sent and more. <button class="btn link small" data-act="popPreview">Preview</button>',sw('popups'),'r-popups')}${row(ICON.wave,'rock','Reduce motion','Fewer animations and no sliding effects.',sw('calm'),'r-calm')}</div>
 <p class="eyebrow period">Friends</p>
 <div class="card rv">${row(MI.user,'pop','Friend requests',me().friends==='open'?'Open account: anyone can add you as a friend straight away.':'Ask me first: you accept or reject each request.')}
  <div style="margin-top:12px">${seg('fr','Friend requests',[['request','Ask me first'],['open','Open account']],me().friends==='open'?'open':'request','frMode')}</div></div>
 <p class="eyebrow period">Account</p>
 <div class="card rv">${row(ICON.key,'shake','Email and password',`${esc(S.email||'Demo account')} · only you can see this`,Store.mode==='demo'?'':'<button class="btn ghost sm" data-act="changePw">Change</button>')}</div>
 <div class="card rv" style="margin-top:12px">${Store.mode==='demo'?`<b>You're in demo mode</b><p class="small muted" style="margin:4px 0 12px">Add scores, review disputes and explore. None of it is saved.</p><button class="btn ball sm" data-act="exitDemo">Exit demo</button>`:`<b>Demo mode</b><p class="small muted" style="margin:4px 0 12px">See the app full of life: 100 made-up players, games and an admin inbox, with you in it. Nothing is saved and the real club is not touched.</p><button class="btn ghost sm" data-act="demo">Start demo mode</button>`}</div>
 ${Store.mode==='demo'?'':`<button class="btn danger wide" style="margin-top:18px" data-act="signOut">${ICON.logout}<span>Sign out</span></button>`}`;
}
/* Ask once per device, a few seconds after signing in */
function maybeAskNotif(){
 if(!NOTIF_OK()||Notification.permission!=='default'||ls.get('rc_nask_'+S.uid,0))return;
 setTimeout(()=>{if($('sheetBg')||$('app').hidden)return;ls.set('rc_nask_'+S.uid,1);
  openSheet(`<div style="text-align:center"><span class="askbell">${ICON.bell}</span><h2 style="margin-top:14px">Turn on notifications?</h2><p class="muted" style="margin:8px 0 18px">Know straight away when someone invites you to play, asks you to confirm a score or sends you kudos.</p></div>
   <button class="btn brand wide" data-act="notifAsk">Allow notifications</button><button class="btn ghost wide" style="margin-top:10px" data-act="closeSheet">Not now</button>`)},2600);
}
function sysNotify(title,body){try{if(NOTIF_OK()&&Notification.permission==='granted'&&document.hidden)new Notification(title,{body,icon:'icon-192.png',badge:'icon-192.png',tag:'rc'})}catch(e){}}

/* ---------- Loading screen (rankings) ---------- */
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const loaderHTML=t=>`<div class="loader"><span class="lball" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="30" fill="#d9f24c"/><path d="M17 22c10 10 10 26 0 36M63 22C53 32 53 48 63 58" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg></span><span class="lshadow" aria-hidden="true"></span><p>${esc(t)}</p>
 <div class="skel">${'<i></i>'.repeat(5)}</div></div>`;
async function loadRank(force){
 view.tab='rank';paintDock('rank');window.scrollTo(0,0);$('main').innerHTML=loaderHTML(force?'Refreshing rankings…':'Loading rankings…');
 const t0=Date.now();if(force||Store.mode==='live'){try{await reload()}catch(e){toast('Could not refresh. Check your connection.')}}
 await wait(Math.max(0,(calm()?250:850)-(Date.now()-t0)));if(view.tab==='rank'){render();if(force)doneTick('Rankings up to date')}
}

/* ---------- Sheets ---------- */
/* Every pop-up gets a Back button at the top (except the two that must be finished: new username and new password) */
const SHEET_BACK=`<div class="sheetback"><button type="button" class="backbtn" data-act="closeSheet" aria-label="Back"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Back</button></div>`;
function openSheet(html,onReady){
 closeSheet(true);const bg=document.createElement('div');bg.className='sheetbg';bg.id='sheetBg';
 bg.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><div class="grab" aria-hidden="true"></div>${html.includes('data-noback')?'':SHEET_BACK}${html}</div>`;
 bg.addEventListener('click',e=>{if(e.target===bg)closeSheet()});$('sheetRoot').appendChild(bg);if(onReady)onReady(bg);
 const f=bg.querySelector('input,button:not(.grab):not(.backbtn)');if(f&&matchMedia('(hover:hover)').matches)setTimeout(()=>f.focus(),60);
}
function closeSheet(now){const bg=$('sheetBg');if(!bg)return;if(now||calm()){bg.remove();return}bg.classList.add('out');setTimeout(()=>bg.remove(),300)}
function lvlInput(sp,val){const S_=SPORTS[sp];
 return `<div class="lvlin"><button type="button" class="step" data-act="lstep" data-v="-0.1" aria-label="Lower">−</button><input id="gLvl" type="number" inputmode="decimal" step="0.1" min="${S_.min}" max="${S_.max}" value="${val!=null?fmtL(val,1):''}" placeholder="${fmtL(avg(S_.bands.intermediate),1)}" aria-label="Level"><button type="button" class="step" data-act="lstep" data-v="0.1" aria-label="Higher">+</button></div>
  <div class="bandq">${TIERS.map(([k,n])=>`<button type="button" class="fchip" data-act="lband" data-v="${k}">${n} · ${fmtL(S_.bands[k][0],1)}–${fmtL(S_.bands[k][1],1)}</button>`).join('')}</div>
  <p class="tiny muted" style="margin-top:8px">${S_.name} levels run from ${fmtL(S_.min,1)} to ${fmtL(S_.max,1)}. Tap a band for its middle, then fine-tune.</p>`}
let pickT=null;
function openPicker(key){
 pickT={t:key[0],i:+key[1]};const sp=SPORTS[A.sport];
 openSheet(`<h2>Choose a player</h2><p class="muted small">${sp.name} · ${pickT.t==='a'?'Your team':'Opponents'}</p>
  <div class="search" style="margin-top:14px">${ICON.search}<input id="pkQ" type="search" placeholder="Search members" aria-label="Search members"></div>
  <div class="pickl" id="pkL"></div>
  <div class="divider">Playing with someone without an account?</div>
  <label for="gName">Their name</label><input id="gName" maxlength="40" placeholder="e.g. Sam" autocomplete="off">
  <label for="gLvl">Their ${sp.name.toLowerCase()} level</label>${lvlInput(A.sport,null)}
  <p class="ferr" id="gErr"></p><button class="btn brand wide" data-act="addGuest">Add guest</button>
  ${A[pickT.t][pickT.i]&&!(pickT.t==='a'&&pickT.i===0)?`<button class="btn link small" style="display:block;margin:12px auto 0" data-act="clearSlot">Remove this player</button>`:''}`,
 bg=>{const q=bg.querySelector('#pkQ');q.oninput=paintPick;paintPick()});
}
function paintPick(){
 const q=($('pkQ').value||'').trim().toLowerCase(),used=[...A.a,...A.b].filter(Boolean).map(s=>s.uid);
 const list=S.profiles.filter(p=>p.setup&&!used.includes(p.id)&&(!q||(p.name+' '+p.username).toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,40);
 $('pkL').innerHTML=list.map(p=>{const r=lvlOf(A.sport,p.id);return`<button type="button" data-act="pickMember" data-v="${p.id}">${avHTML(p)}<span class="nm"><b>${esc(p.name)}</b><span>@${esc(p.username)}</span></span>${r!=null?`<span class="chip t-${tierOf(A.sport,r)} num">${fmtL(r)}</span>`:'<span class="chip">No level</span>'}</button>`}).join('')||`<p class="small muted" style="padding:8px 4px">No members found. Add them as a guest below.</p>`;
}
function readLvl(){const v=parseFloat(($('gLvl').value||'').replace(',','.'));const S_=SPORTS[A.sport];return isFinite(v)&&v>=S_.min&&v<=S_.max?Math.round(v*10)/10:null}
function askMemberLevel(id){
 const p=prof(id),sp=SPORTS[A.sport];
 openSheet(`<h2>${esc(first(p))}'s ${sp.name.toLowerCase()} level</h2><p class="muted small">${esc(p.name)} has not set a ${sp.name.toLowerCase()} level yet. Enter your best guess. It is only used for this game until they set their own.</p>
  <label for="gLvl">Level</label>${lvlInput(A.sport,null)}<p class="ferr" id="gErr"></p><button class="btn brand wide" data-act="memberLevel" data-v="${id}">Add ${esc(first(p))}</button>`);
}
function playerSheet(id){
 const p=prof(id);if(!p)return;const ms=S.matches.filter(okMatch).filter(m=>regsOf(m).includes(id)).sort(byWhen).reverse().slice(0,5);
 openSheet(`<div style="text-align:center"><div class="avbig" style="width:96px;height:96px;margin-top:6px">${avHTML(p,96)}</div><h2 style="margin-top:12px">${esc(p.name)}</h2><p class="muted small">@${esc(p.username)}${adminChip(id)}</p>
  <div class="fstats"><span><b class="num">${followerN(id)}</b>followers</span><span><b class="num">${followingN(id)}</b>following</span>${id===S.uid?`<span><b class="num">${friendIds().length}</b>friends</span>`:''}</div></div>
  ${id===S.uid?'':`<div class="cta relbtns">${relButtons(id)}</div>`}
  <div class="grid2" style="margin-top:16px">${(p.sports||[]).map(sp=>{const e=S.R[sp][id];if(!e)return'';const t=tierOf(sp,e.r),rk=rankOf(sp,id);
   return`<div class="card"><span class="eyebrow">${SPORTS[sp].name}</span><div style="font:500 30px var(--display);margin:6px 0 2px" class="num">${fmtL(e.r)}</div><span class="chip t-${t}">${TIER_NAME[t]}${rk?' · #'+rk.pos:''}</span><p class="tiny muted" style="margin-top:8px">${e.w} won · ${e.l} lost</p></div>`}).join('')}</div>
  <div class="card" style="margin-top:12px"><dl class="prefs"><dt>Hand</dt><dd>${esc(lbl(HANDS,p.hand))||'–'}</dd><dt>Court side</dt><dd>${esc(lbl(SIDES,p.side))||'–'}</dd><dt>Plays</dt><dd>${(p.times||[]).map(t=>lbl(TIMES,t)).join(', ')||'–'}</dd><dt>Invites</dt><dd>${p.invites?'Open to invites':'Not right now'}</dd><dt>Friends</dt><dd>${p.friends==='open'?'Open: anyone can add them':'Requests need approval'}</dd></dl></div>
  ${ms.length?`<div class="sec"><h3>Recent games</h3></div><div class="list">${ms.map(m=>matchRow(m,{for:id})).join('')}</div>`:''}
  <button class="btn ghost wide" style="margin-top:16px" data-act="closeSheet">Close</button>`,bg=>qsa('.rv',bg).forEach(e=>e.classList.add('in')));
 playerSheet.open=id;
}
function refreshSocial(id){if($('sheetBg')&&playerSheet.open===id&&document.querySelector('#sheetBg .relbtns')){playerSheet(id)}else if(!$('sheetBg'))render();else if(view.tab==='inbox'||view.tab==='players')render()}
/* Send kudos to the other players in a game */
function kudosSheet(mid,justSaved){
 const m=S.matches.find(x=>x.id===mid);if(!m)return;const others=regsOf(m).filter(u=>u!==S.uid&&prof(u));if(!others.length)return;
 const to=new Set(others),sent=sentKudos();
 openSheet(`<h2>${justSaved?'Score saved! Send some love?':'Send kudos'}</h2><p class="muted small">${SPORTS[m.sport].name} · ${esc(whenOf(m))}<span class="scoreline">${matchLine(m)} · ${setsStr(m.sets)}</span></p>
  <label>To</label><div class="chips" id="kTo">${others.map(u=>`<button type="button" class="fchip on" aria-pressed="true" data-kto="${u}">${esc(first(prof(u)))}</button>`).join('')}</div>
  <div class="kgrid">${REACT.map(([k,e,l])=>`<button type="button" class="kbtn" data-k="${k}"><span class="ke">${e}</span><span>${l}</span></button>`).join('')}</div>
  <p class="tiny muted" style="margin-top:10px">They get it in their inbox, with your name.</p>
  <button class="btn ghost wide" style="margin-top:12px" data-act="closeSheet">${justSaved?'Maybe later':'Close'}</button>`,bg=>{
  qsa('[data-kto]',bg).forEach(b=>b.onclick=()=>{const u=b.dataset.kto;if(to.has(u))to.delete(u);else to.add(u);b.classList.toggle('on',to.has(u));b.setAttribute('aria-pressed',String(to.has(u)));tick()});
  qsa('[data-k]',bg).forEach(b=>b.onclick=async()=>{const k=b.dataset.k,list=[...to].filter(u=>!sent[mid+'|'+u+'|'+k]);
   if(!to.size)return toast('Pick at least one player.');if(!list.length)return toast('Already sent.');
   await notify(list.map(u=>({to:u,kind:'kudos',data:{match:mid,k}})));list.forEach(u=>sent[mid+'|'+u+'|'+k]=1);ls.set('rc_kudos_'+S.uid,sent);
   burst(b,REACT.find(x=>x[0]===k)[1]);b.classList.add('sent');doneTick(`Kudos sent ${REACT.find(x=>x[0]===k)[1]}`);toast(`Sent to ${andList(list.map(u=>first(prof(u))))}`)})});
}
/* A little shower of the chosen emoji */
function burst(el,e){if(calm())return;const r=el.getBoundingClientRect();for(let i=0;i<9;i++){const x=document.createElement('span');x.className='floatE';x.textContent=e;
 x.style.left=(r.left+r.width/2)+'px';x.style.top=(r.top+r.height/2)+'px';x.style.setProperty('--dx',(Math.random()*160-80)+'px');x.style.setProperty('--dy',(-90-Math.random()*120)+'px');x.style.animationDelay=(i*40)+'ms';
 document.body.appendChild(x);setTimeout(()=>x.remove(),1500)}}
function confirmSheet(title,text,okLabel,act,v){
 openSheet(`<h2>${esc(title)}</h2><p class="muted" style="margin:6px 0 18px">${esc(text)}</p><div class="cta"><button class="btn ghost" data-act="closeSheet" style="flex:1">Go back</button><button class="btn danger" data-act="${act}" data-v="${esc(v||'')}" style="flex:1">${esc(okLabel)}</button></div>`);
}

/* ================= Actions ================= */
/* ---------- Full screen ---------- */
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
const fsCan=()=>{const d=document.documentElement;return !!(d.requestFullscreen||d.webkitRequestFullscreen)};
function fsPaint(){const b=$('fsBtn');if(!b)return;const on=!!fsEl();b.classList.toggle('on',on);b.setAttribute('aria-label',on?'Exit full screen':'Full screen');b.title=on?'Exit full screen':'Full screen'}
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,fsPaint));
async function fsToggle(){
 if(fsEl()){try{await(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch(e){}return}
 if(fsCan()){const d=document.documentElement;try{await(d.requestFullscreen||d.webkitRequestFullscreen).call(d,{navigationUI:'hide'})}catch(e){toast('Full screen is not available here')}return}
 homeSheet(true);
}
/* ---------- Add to Home Screen ---------- */
const UA=navigator.userAgent||'';
const isIOS=/iPad|iPhone|iPod/.test(UA)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isAndroid=/Android/i.test(UA);
const isInstalled=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e});
window.addEventListener('appinstalled',()=>{installEvt=null;ls.set('rc_installed',1);closeSheet();toast('Racquet Culture is on your Home Screen')});
/* Always shown at the top of the inbox */
function homeCard(){
 return`<div class="card msg hscard rv" style="margin-top:14px"><span class="mi">${ICON.phone}</span><div class="mb"><b class="mt">Add Racquet Culture to your Home Screen</b><p>Get the app icon on your phone. It opens full screen like a normal app, and you'll never need to find the link again.</p><div class="cta"><button class="btn ball sm" data-act="hsHow">Show me how</button></div></div></div>`;
}
const HS_IOS=`<ol class="hsteps"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (the square with an arrow pointing up).</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. The Racquet Culture icon appears on your Home Screen.</li></ol>`;
const HS_AND=`<ol class="hsteps"><li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>⋮</b> menu at the top right.</li><li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li><li>Tap <b>Install</b> or <b>Add</b>. The Racquet Culture icon appears on your Home Screen.</li></ol>`;
function homeSheet(fromFs){
 const head=fromFs?`<h2>Full screen on iPhone</h2><p class="muted" style="margin:6px 0 4px">iPhone doesn't let websites go full screen on their own. Add the app to your Home Screen instead. It then opens full screen every time, like a normal app.</p>`
  :`<h2>Add to your Home Screen</h2><p class="muted" style="margin:6px 0 4px">You get the Racquet Culture icon on your phone. It opens full screen, like an app from the App Store or Google Play, and you'll always have it even if you lose the link.</p>`;
 const ios=`<p class="hsplat">iPhone and iPad</p>${HS_IOS}`,and=`<p class="hsplat">Android</p>${installEvt?'<button class="btn ball wide" style="margin-bottom:14px" data-act="hsInstall">Add to Home Screen</button><p class="small muted" style="margin:-6px 0 10px">Or do it yourself:</p>':''}${HS_AND}`;
 openSheet(`${head}${fromFs?HS_IOS:isAndroid?and+ios:ios+and}<button class="btn ghost wide" data-act="closeSheet">Got it</button>`);
}
async function hsInstall(){
 if(!installEvt)return homeSheet();const e=installEvt;
 try{await e.prompt();const r=await e.userChoice;if(r&&r.outcome==='accepted'){installEvt=null;ls.set('rc_installed',1)}}catch(err){homeSheet()}
 render();
}
const ACT={
 fullscreen(){fsToggle()},
 hudle(){openHudle()},
 factGo(v){vBook.show&&vBook.show(+v)},
 hsHow(){homeSheet()},
 hsInstall(){hsInstall()},
 authMode(v){if(v===authMode)return;authMode=v;paintAuth(v==='up'?1:-1)},
 async forgot(){
  if(Store.mode!=='live')return aerr('In preview mode, accounts live on this device only, so there is no reset email. Create a new account instead.',true);
  const em=$('aEmail').value.trim();if(!EMAIL_RE.test(em)){aerr('Type your email above, then tap Get help again.',true);$('aEmail').focus();return}
  try{await Store.resetPassword(em);aerr('If there is an account for '+em+', a reset link is on its way. Check your inbox and spam folder.',true)}
  catch(e){aerr(e.code==='rate'?'A reset email was sent recently. Wait a few minutes and try again.':'Could not send the reset email. Try again later.')}},
 changePw(){showReset()},
 wBack(){if(W.i===0){if(W.mode!=='setup'){W=null;showApp()}return}wGo(-1)},
 wCancel(){W=null;showApp()},
 wNext(){const st=wSteps(),s=wStep(st[W.i]);if(!s.valid)return;if(W.i>=st.length-1)return wFinish();wGo(1)},
 wNoPhoto(){W.d.avatar=null;tick();paintWiz(false)},
 wSport(v){W.jp='wSport|'+v;const a=W.d.sports;W.d.sports=a.includes(v)?a.filter(x=>x!==v):[...a,v];tick();paintWiz(false)},
 wGender(v){W.jp='wGender|'+v;W.d.gender=v;paintWiz(false);wPickThenNext()},
 wHand(v){W.jp='wHand|'+v;W.d.hand=v;paintWiz(false);wPickThenNext()},
 wInv(v){W.jp='wInv|'+v;W.d.invites=v==='yes';paintWiz(false);wPickThenNext()},
 wTime(v){W.jp='wTime|'+v;const a=W.d.times;W.d.times=a.includes(v)?a.filter(x=>x!==v):[...a,v];tick();paintWiz(false)},
 wSide(v){W.jp='wSide|'+v;W.d.side=v;paintWiz(false);wPickThenNext()},
 wBand(v){W.jp='wBand|'+v;const [sp,b]=v.split('|'),q=W.d.q[sp];if(q.band!==b){q.band=b;q.ans=[];q.pick=[]}paintWiz(false);wPickThenNext()},
 wAns(v){W.jp='wAns|'+v;const [sp,qi,j]=v.split('|'),q=W.d.q[sp];q.pick=q.pick||[];q.pick[+qi]=+j;q.ans[+qi]=QS[sp][q.band][+qi][1][+j][1];paintWiz(false);wPickThenNext()},
 go(v){go(v)},
 rankSport(v){view.rs=v;const e=S.R[v][S.uid];view.rt=e?tierOf(v,e.r):view.rt;render()},
 rankTier(v){view.rt=v;render()},
 rankGender(v){view.rg=v;render()},
 rankAt(v){view.rs=v;const e=S.R[v][S.uid];if(e)view.rt=tierOf(v,e.r);go('rank')},
 player(v){playerSheet(v)},
 closeSheet(){closeSheet()},
 pf(v){const [k,x]=v.split('|'),val=k==='inv'?true:x;view.pf[k]=view.pf[k]===val?(k==='inv'?false:''):val;qsa('.fchip[data-act="pf"]').forEach(b=>{const [kk,xx]=b.dataset.v.split('|');b.setAttribute('aria-pressed',String(view.pf[kk]===(kk==='inv'?true:xx)))});tick();paintPlayers()},
 aExtra3(v){A.extra3=v==='1';if(!A.extra3)A.sets[2]=['',''];paintFair();if(A.extra3){const el=document.querySelector('[data-set="2,0"]');if(el)el.focus()}},
 aSport(v){A.sport=v;A.extra3=false;if(v==='padel')A.format='doubles';A.sets=[['',''],['',''],['','']];['a','b'].forEach(t=>A[t]=A[t].map(s=>s&&s.uid?{uid:s.uid}:null));render()},
 aFormat(v){A.format=v;render()},
 pick(v){openPicker(v)},
 pickMember(id){if(lvlOf(A.sport,id)==null)return askMemberLevel(id);A[pickT.t][pickT.i]={uid:id};closeSheet();render()},
 memberLevel(id){const l=readLvl();if(l==null){$('gErr').textContent=`Enter a level between ${SPORTS[A.sport].min} and ${SPORTS[A.sport].max}.`;return}A[pickT.t][pickT.i]={uid:id,level:l};closeSheet();render()},
 addGuest(){const n=$('gName').value.trim(),l=readLvl();if(!n){$('gErr').textContent='Enter their name.';$('gName').focus();return}
  if(l==null){$('gErr').textContent=`Enter their level, between ${SPORTS[A.sport].min} and ${SPORTS[A.sport].max}.`;return}A[pickT.t][pickT.i]={name:n,level:l};closeSheet();render()},
 clearSlot(){A[pickT.t][pickT.i]=null;closeSheet();render()},
 lstep(v){const i=$('gLvl'),S_=SPORTS[A.sport],cur=parseFloat(i.value);i.value=fmtL(clamp((isFinite(cur)?cur:avg(S_.bands.intermediate))+ +v,S_.min,S_.max),1);tick()},
 lband(v){const b=SPORTS[A.sport].bands[v];$('gLvl').value=fmtL((b[0]+b[1])/2,1);tick()},
 submitMatch(){submitMatch()},
 delMatch(v){confirmSheet('Delete this score?','Everyone’s levels from this game are recalculated without it.','Delete','delMatchYes',v)},
 async delMatchYes(v){try{await Store.delMatch(v)}catch(e){return toast(e.code==='denied'?'Only the player who added it, or an admin, can delete this score.':'Could not delete. Check your connection.')}S.matches=S.matches.filter(m=>m.id!==v);S.confs=S.confs.filter(c=>c.match!==v);rate();closeSheet();render();toast('Score deleted')},
 editProfile(){startWiz('edit')},
 retake(v){startWiz('level',[v])},
 pref(v){setPref(v,!prefs[v]);render();if(v==='haptics'&&prefs.haptics)buzz([12,40,12]);if(v==='sound'&&prefs.sound)sfx('pop');if(v==='popups'&&prefs.popups)celebrate('Pop-ups on');
  const r=$('r-'+v);if(r){r.classList.add('play');setTimeout(()=>r.classList.remove('play'),1000)}},
 demo(){demoChooser()},demoGo(v){startDemo(v==='player'?'player':'admin')},exitDemo(){exitDemo()},
 signOut(){confirmSheet('Sign out?','You can sign back in with your email and password.','Sign out','signOutYes')},
 async signOutYes(){if(Store.mode==='demo')return exitDemo();closeSheet(true);await Store.signOut();S.uid=null;A=null;view.tab='home';authMode='in';showAuth()},
 /* inbox */
 ibTab(v){view.ib=v;render()},
 ibTodo(){view.ib='todo';go('inbox')},
 async cfOk(id){const g=S.msgs.find(x=>x.id===id),m=g&&S.matches.find(x=>x.id===g.data.match);if(!m)return;
  const c={id:'c_'+rid(),match:m.id,user:S.uid,verdict:'ok',at:new Date().toISOString()};
  try{await Store.addConf(c)}catch(e){return toast('Could not confirm. Check your connection.')}S.confs.push(c);rate();doneTick('Score confirmed');render()},
 cfChange(id){const g=S.msgs.find(x=>x.id===id);if(g)disputeSheet(g.data.match,id)},
 review(v){reviewSheet(v)},
 pvTab(v){view.pv=v;render()},
 theme(v){setPref('theme',v);sfx('soft');tick();render()},
 popPreview(){celebrate('This is a pop-up')},
 async notifAsk(){if(!NOTIF_OK())return toast('This browser can’t show notifications.');closeSheet(true);
  try{const r=await Notification.requestPermission();if(r==='granted'){doneTick('Notifications on');try{new Notification('Racquet Culture',{body:'You’ll hear about invites, scores and kudos here.',icon:'icon-192.png',badge:'icon-192.png'})}catch(e){}}else toast('Notifications stay off. You can turn them on in Settings.')}catch(e){}
  if(view.tab==='settings')render()},
 rankRefresh(v,el){if(el)el.classList.add('spinning');loadRank(true)},
 demoSwitch(v){demoSwitch(v)},
 pvGo(v){view.pv=v;go('players')},

 aDate(v){A.date=v;if(A.time!=null&&(slotDate(v,A.time)>new Date()))A.time=null,A.len=0;tick();render()},
 aCourt(v){A.courtNo=+v;render()},
 aTime(){timeSheet()},
 kudos(v){kudosSheet(v)},
 async addFriend(id){const p=prof(id),r=relWith(id);if(r.st==='incoming')return ACT.reqAccept(r.r.id);if(r.st!=='none')return;
  const open=p.friends==='open',now=new Date().toISOString(),q={id:'q_'+rid(),from:S.uid,to:id,status:open?'accepted':'pending',at:now,resp:open?now:null};
  try{await Store.addReq(q)}catch(e){return toast(e.code==='cooldown'?'You can send a new request 5 days after a rejection.':'Could not send the request. Check your connection.')}
  S.reqs.push(q);notify([{to:id,kind:open?'friend_new':'friend_req',data:{req:q.id}}]);doneTick(open?'Friend added':'Friend request sent');refreshSocial(id)},
 async reqAccept(rid_){const r=S.reqs.find(x=>x.id===rid_);if(!r)return;const n=Object.assign({},r,{status:'accepted',resp:new Date().toISOString()});
  try{await Store.updateReq(n)}catch(e){return toast('Could not accept. Check your connection.')}upsert(S.reqs,n);notify([{to:r.from,kind:'friend_ok',data:{req:r.id}}]);doneTick('You’re now friends');refreshSocial(r.from)},
 async reqReject(rid_){const r=S.reqs.find(x=>x.id===rid_);if(!r)return;const n=Object.assign({},r,{status:'rejected',resp:new Date().toISOString()});
  try{await Store.updateReq(n)}catch(e){return toast('Could not update. Check your connection.')}upsert(S.reqs,n);toast('Request rejected. They can ask again in 5 days.');refreshSocial(r.from)},
 async reqCancel(rid_){const r=S.reqs.find(x=>x.id===rid_);if(!r)return;try{await Store.delReq(r.id)}catch(e){return toast('Could not cancel. Check your connection.')}S.reqs=S.reqs.filter(x=>x.id!==r.id);toast('Request cancelled');refreshSocial(r.to)},
 unfriend(id){confirmSheet('Remove friend?',`You and ${first(prof(id))} will no longer be friends. You can add each other again later.`,'Remove friend','unfriendYes',id)},
 async unfriendYes(id){const rs=S.reqs.filter(r=>r.status==='accepted'&&((r.from===S.uid&&r.to===id)||(r.from===id&&r.to===S.uid)));
  try{for(const r of rs)await Store.delReq(r.id)}catch(e){return toast('Could not update. Check your connection.')}S.reqs=S.reqs.filter(r=>!rs.includes(r));closeSheet(true);toast('Friend removed');refreshSocial(id)},
 async follow(id){if(following(id))return;try{await Store.follow(id)}catch(e){return toast('Could not follow. Check your connection.')}S.follows.push({follower:S.uid,followee:id,at:new Date().toISOString()});notify([{to:id,kind:'follow',data:{}}]);doneTick(`Following ${first(prof(id))}`);refreshSocial(id)},
 async unfollow(id){try{await Store.unfollow(id)}catch(e){return toast('Could not unfollow. Check your connection.')}S.follows=S.follows.filter(f=>!(f.follower===S.uid&&f.followee===id));toast(`Unfollowed ${first(prof(id))}`);refreshSocial(id)},
 async frMode(v){const p=Object.assign({},me(),{friends:v});try{await Store.saveProfile(p)}catch(e){return toast('Could not save. Check your connection.')}upsert(S.profiles,p);tick();toast(v==='open'?'Open account: anyone can add you as a friend':'Friend requests now need your approval');render()},
};
document.addEventListener('click',e=>{
 const el=e.target.closest&&e.target.closest('[data-act]');if(!el||el.disabled)return;const f=ACT[el.dataset.act];if(!f)return;
 if(el.tagName==='A')e.preventDefault();f(el.dataset.v,el,e);
});
document.addEventListener('keydown',e=>{
 if((e.key==='Enter'||e.key===' ')&&e.target.getAttribute&&e.target.getAttribute('role')==='button'&&e.target.dataset.act){e.preventDefault();e.target.click()}
 if(e.key==='Escape'&&$('sheetBg'))closeSheet();
 if(e.key==='Enter'&&(e.target.id==='gName'||e.target.id==='gLvl')){e.preventDefault();const b=document.querySelector('#sheetBg [data-act="addGuest"],#sheetBg [data-act="memberLevel"]');if(b)b.click()}
});

/* Changes from other players arrive live; never redraw while someone is typing or has a sheet open */
let rmT=0,rmPending=false;
function onRemote(){if(Store.mode==='demo')return;clearTimeout(rmT);rmT=setTimeout(async()=>{if(!S.uid||Store.mode==='demo')return;const before=unread();try{await reload()}catch(e){return}
 paintBadge();if(unread()>before){const g=S.msgs.find(x=>!x.read);if(g){const t=document.createElement('div');t.innerHTML=msgView(g).t;sfx('ding');buzz([20,80,20]);toast('New message: '+t.textContent,3600);sysNotify('Racquet Culture',t.textContent)}}
 const a=document.activeElement,typing=a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName);
 if($('app').hidden||typing||$('sheetBg')||view.tab==='add'){rmPending=true;return}render()},400)}
document.addEventListener('focusout',()=>setTimeout(()=>{if(rmPending&&!$('app').hidden&&!$('sheetBg')&&view.tab!=='add'){rmPending=false;render()}},60));

/* ================= Start ================= */
(async function boot(){
 try{await Store.init()}catch(e){console.warn(e)}
 let id=null;try{id=await Store.session()}catch(e){}
 if(id){S.uid=id;await enter(false)}else showAuth();
 booted=true;if(recovery)setTimeout(showReset,300);
})();
