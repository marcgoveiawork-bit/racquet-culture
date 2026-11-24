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
let prefs=Object.assign({calm:sysCalm,haptics:true,sound:true,popups:true,theme:'light'},ls.get('rc_prefs',{}));
const calm=()=>!!prefs.calm;
const sysLight=matchMedia('(prefers-color-scheme: light)');
const themeNow=()=>prefs.theme==='device'?(sysLight.matches?'light':'dark'):prefs.theme==='light'?'light':'dark';
function applyPrefs(){const r=document.documentElement;r.classList.toggle('calm',calm());r.dataset.theme=themeNow();
 const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=(getComputedStyle(r).getPropertyValue('--bg')||'').trim()||(themeNow()==='light'?'#f6f3fd':'#0d0918')}
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
/* Everyone new in a level starts at the same spot: the bottom of the level they pick (no level questions any more) */
const S_BANDS=['beginner','intermediate'];
const levelFrom=(sp,band)=>SPORTS[sp].bands[band][0];

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
/* ---------- Venues ----------
   The app holds several clubs. Each one has its own courts, colours, booking and rankings; accounts are shared.
   To add a club: add an entry here, a logo in venues/, and a [data-venue="id"] colour block in index.html.
   book.kind 'slots' uses the in-app booking; 'link' sends players to the club's own booking site. */
const HUDLE_URL=(window.RC_LIVE&&window.RC_LIVE.hudle)||'https://hudle.in/venues/racquet-culture-chicalim/567082';
const VENUES=[
 {id:'rc',pin:{g:'0x3bbfb9d42d24d04b:0x34283e54dbbf8ba7',lat:15.3922869,lng:73.8459347,n:'RACQUET CULTURE'},name:'Racquet Culture',short:'Racquet Culture',place:'Chicalim, Goa, India',area:'Chicalim, Goa, India',lat:15.3922869,lng:73.8459347,courts:'1 padel court · 1 pickleball court',
  courtNos:{padel:[1],pickleball:[1]},logo:'logo-sm.png?v=60',splash:'logo.png',mark:'wide',color:'#6045a7',book:{kind:'slots'},
  insta:'https://www.instagram.com/racquetculture.goa/',
  url:'https://www.google.com/maps/place/RACQUET+CULTURE/@15.3922921,73.8433598,1195m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3bbfb9d42d24d04b:0x34283e54dbbf8ba7!8m2!3d15.3922869!4d73.8459347!16s%2Fg%2F11z5rb4hj2'},
 {id:'sunday',pin:{g:'0x3bbfeb2d7cb99359:0x26da1bb433ed73b8',lat:15.6220728,lng:73.7844174,n:'Sunday Racquet & Social Club'},name:'Sunday Racquet & Social Club',short:'Sunday Racquet & Social Club',place:'Siolim, Goa, India',area:'Sodiem, Siolim, Goa, India',map:'Sunday Racquet & Social Club, Siolim, Goa',courts:'3 padel courts · 1 pickleball court',
  courtNos:{padel:[1,2,3],pickleball:[1]},logo:'venues/sunday.png',splash:'venues/sunday-big.png',mark:'wide',color:'#2e2bc7',
  book:{kind:'link',name:'District',icon:'venues/district.png',url:'https://www.district.in/play/sunday-racquet-and-social-club-siolim-sunday-racquet-social-club-sodiem-siolim-slots-booking'},
  insta:'https://www.instagram.com/sunday.goa/',
  url:'https://maps.app.goo.gl/87vEdTuqTjpxxMCA7'},
 {id:'floresta',pin:{g:'0x3bbfeb122364565b:0x9839eddb3c8e4b57',lat:15.5912088,lng:73.7730173,n:'Clube de Floresta'},name:'Clube De Floresta',short:'Clube De Floresta',place:'Assagao, Goa, India',area:'Mapusa–Anjuna Road, Goa, India',map:'Clube de Floresta, Mapusa Anjuna Road, Goa',courts:'1 padel court · 1 pickleball court · 1 badminton court · 1 table tennis table',
  courtNos:{padel:[1],pickleball:[1]},also:'1 badminton court and 1 table tennis table',logo:'venues/floresta.png',splash:'venues/floresta-big.png',mark:'wide',color:'#005e36',
  book:{kind:'link',name:'Hudle',url:'https://hudle.in/venues/clube-de-floresta-forest-club/522426'},
  insta:'https://www.instagram.com/clubedefloresta/',
  url:'https://maps.app.goo.gl/whN98FML3ZCfxGKq5'},
 {id:'aer',embed:'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1269.9236849310637!2d73.81313685513642!3d15.458309561027987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbfc1004336e4f9%3A0xfc92639f35aa43e8!2sAER!5e1!3m2!1sen!2suk!4v1795486402363!5m2!1sen!2suk',name:'AER',short:'AER',place:'Dona Paula, Goa, India',area:'Dr E Borges Road, Dona Paula, Goa, India',map:'AER, Dr E Borges Rd, Dona Paula, Goa',courts:'1 padel court · 1 pickleball court',
  courtNos:{padel:[1],pickleball:[1]},logo:'venues/aer.png',splash:'venues/aer-big.png',mark:'wide',color:'#111111',
  book:{kind:'link',name:'Hudle',url:'https://hudle.in/venues/aer-dona-paula/202490'},
  insta:'https://www.instagram.com/theaerclub/',
  url:'https://maps.app.goo.gl/3ion8ZqyoQwQKBwJ9'},
 {id:'coplay',pin:{g:'0x3bbfc1abb8f08fa7:0x66b44debec025676',lat:15.4911823,lng:73.815232,n:'CoPlay | Panjim Gymkhana'},brand:'CoPlay',name:'CoPlay Panjim Gymkhana',short:'CoPlay Panjim Gymkhana',place:'Panjim, Goa, India',area:'Panjim Gymkhana, Campal, Panaji, Goa, India',map:'CoPlay Panjim Gymkhana, Campal, Panaji, Goa',courts:'1 padel court',
  courtNos:{padel:[1]},logo:'venues/coplay.png',splash:'venues/coplay-big.png',mark:'wide',color:'#0237a7',
  book:{kind:'link',name:'Hudle',url:'https://hudle.in/venues/coplay-panjim-gymkhana/808217'},
  insta:'https://www.instagram.com/coplayofficial',
  url:'https://maps.app.goo.gl/iK9pbexqrnp6snUV7'},
 {id:'assagao',pin:{g:'0x3bbfebdf0a28cbf9:0xe47c5471620eab3b',lat:15.5994157,lng:73.7953435,n:'Assagao House'},brand:'CoPlay',name:'CoPlay @ Assagao House',short:'CoPlay @ Assagao House',place:'Assagao, Goa, India',area:'Assagao House, Bardez, Assagao, Goa, India',lat:15.5994157,lng:73.7953435,courts:'1 padel court · 2 pickleball courts',
  courtNos:{padel:[1],pickleball:[1,2]},logo:'venues/coplay.png',splash:'venues/coplay-big.png',mark:'wide',color:'#0237a7',
  book:{kind:'link',name:'Hudle',url:'https://hudle.in/venues/coplay-at-assagao-house/268830'},
  insta:'https://www.instagram.com/coplayofficial',
  url:'https://maps.app.goo.gl/53dKkFMViwWTXHrY9'},
 {id:'roundtwo',pin:{g:'0x3bbfe988a35bc055:0x6c74438fdffc4eac',lat:15.5964697,lng:73.7417307,n:'Round two'},name:'Round Two',short:'Round Two',place:'Vagator, Goa, India',area:'Behind Swim Up, Coutinho Vaddo, Vagator, Goa, India',map:'Round Two, Coutinho Vaddo, Vagator, Goa',courts:'1 padel court',
  courtNos:{padel:[1]},logo:'venues/roundtwo.png',splash:'venues/roundtwo-big.png',mark:'wide',color:'#000000',
  book:{kind:'link',name:'Hudle',url:'https://hudle.in/venues/round-two-vagator/897288'},
  insta:'https://www.instagram.com/roundtwo_goa/',
  url:'https://maps.app.goo.gl/toHVrauMFbvUxaU59'},
 {id:'coco',pin:{g:'0x3bbfeb5990434feb:0xd5c755a402317054',lat:15.5936254,lng:73.7759457,n:'Coco Padel - Assagao'},brand:'Coco Padel',name:'Coco Padel Assagao',short:'Coco Padel Assagao',place:'Assagao, Goa, India',area:'Bouta Waddo, Assagao, Goa, India',map:'Coco Padel, Bouta Waddo, Assagao, Goa',courts:'1 padel court',
  courtNos:{padel:[1]},logo:'venues/coco.png',splash:'venues/coco-big.png',mark:'wide',color:'#7fa52f',
  book:{kind:'link',name:'Hudle',url:'https://hudle.in/venues/coco-padel-assagao/585376'},
  insta:'https://www.instagram.com/cocopadel_goa/',
  url:'https://maps.app.goo.gl/TbGqGZ2eZE9B4nRV8'},
 {id:'cocoanjuna',pin:{g:'0x3bbfebb837a80fb9:0xfe7da017f2ee2557',lat:15.5904234,lng:73.7482902,n:'Coco Padel'},brand:'Coco Padel',name:'Coco Padel Dot in the Park, Anjuna',short:'Coco Padel Dot in the Park, Anjuna',place:'Anjuna, Goa, India',area:'House No. 1688, Anjuna Panchayat Road, Anjuna, Goa, India',map:'Coco Padel Dot in the Park, Anjuna, Goa',courts:'1 padel court',
  courtNos:{padel:[1]},logo:'venues/coco.png',splash:'venues/coco-big.png',mark:'wide',color:'#7fa52f',
  book:{kind:'link',name:'Hudle',url:'https://hudle.in/venues/coco-padel-circle-anjuna/615130'},
  insta:'https://www.instagram.com/cocopadel_goa/',
  url:'https://maps.app.goo.gl/KtDvVb7fBq9CnV5U7'},
 {id:'padelinho',pin:{g:'0x3bbfe992afde15ab:0x3ba839805bcc5310',lat:15.5890452,lng:73.7456702,n:'Padelinho'},name:'Padelinho',short:'Padelinho',place:'Anjuna, Goa, India',area:'Near Castelinho’s Guesthouse, Gumal Vaddo, Anjuna, Goa 403509, India',lat:15.5890452,lng:73.7456702,courts:'1 padel court',
  courtNos:{padel:[1]},logo:'venues/padelinho.jpg',splash:'venues/padelinho-big.jpg',mark:'wide',color:'#1049f0',
  book:{kind:'link',name:'Hudle',url:'https://hudle.in/venues/padelinho-anjuna/348451'},
  insta:'https://www.instagram.com/padelinhogoa/',
  url:'https://maps.app.goo.gl/NzyqXrTAZhVFvc7i9'}
];
/* Clubs joining soon: shown in the club lists as "Coming soon", but can't be entered yet. Add details only once the club shares them. */
const SOON=[
 {id:'padelpeople',name:'Padel People',logo:'venues/padelpeople.png',mark:'wide',color:'#1d648e'},
];
const soonFind=v=>esc((v.name+' coming soon').toLowerCase());
const venueOf=id=>VENUES.find(v=>v.id===id)||VENUES[0];
/* Old records have no venue (or the first id, 'chicalim'): they belong to Racquet Culture */
const vidOf=x=>{const v=x&&(x.venue||(x.data&&x.data.venue));return!v||v==='chicalim'?'rc':v};
let VID=(()=>{const q=new URLSearchParams(location.search).get('venue'),s=ls.get('rc_venue','rc');return VENUES.some(v=>v.id===q)?q:VENUES.some(v=>v.id===s)?s:'rc'})();
const VEN=()=>venueOf(VID);
const hasSlots=()=>VEN().book.kind==='slots';
function applyVenue(){const r=document.documentElement;r.dataset.venue=VID;applyPrefs()}
/* Sign-in, the first-time questions and the court picker are OneCourt's own pages, in the OneCourt blue */
function applyMP(){document.documentElement.dataset.venue='mp';applyPrefs()}
const COURTS={padel:'Padel · Court 1',pickleball:'Pickleball · Court 1'};
const courtNos=sp=>VEN().courtNos[sp]||[1];
const rupees=n=>'₹'+Number(n).toLocaleString('en-IN');
const hudleBtn=(cls='btn ball')=>`<a class="${cls} hudlebtn" href="${HUDLE_URL}" target="_blank" rel="noopener"><img src="hudle.png" alt="" width="22" height="22">Book on Hudle</a>`;
const bookLinkBtn=(v=VEN(),cls='btn ball wide')=>`<a class="${cls} linkbook" href="${esc(v.book.url)}" target="_blank" rel="noopener"><span class="lbico">${v.book.icon?`<img src="${esc(v.book.icon)}" alt="">`:`<i class="lbtxt">${esc(v.book.name)}</i>`}</span>Book on ${esc(v.book.name)}</a>`;
const vMark=(v,cls='')=>`<span class="vmark ${v.mark} v-${v.id} ${cls}"><img src="${esc(v.logo)}" alt=""></span>`;
/* Google's own place embed (as from Maps > Share > Embed a map): it always drops the red pin on the club itself */
const mapSrc=v=>v.embed||(v.pin?`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1270!2d${v.pin.lng}!3d${v.pin.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s${encodeURIComponent(v.pin.g)}!2s${encodeURIComponent(v.pin.n)}!5e1!3m2!1sen!2sin!4v1795486402363!5m2!1sen!2sin`
 :`https://maps.google.com/maps?q=${v.map?encodeURIComponent(v.map):v.lat+','+v.lng}&t=k&z=17&output=embed`);
function mapCard(v){
 return `<div class="card mapcard rv"><div class="maptop"><span class="pinico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg></span><span class="grow"><b>${esc(v.name)}</b><span class="small muted">${esc(v.area)} · ${esc(v.courts)}</span></span></div>
  <div class="mapbox"><iframe title="Map of ${esc(v.name)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen src="${esc(mapSrc(v))}"></iframe>
  <a class="mapopen" href="${esc(v.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(v.name)} in Google Maps"></a></div>
  <a class="btn brand wide" href="${esc(v.url)}" target="_blank" rel="noopener" style="margin-top:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Open in Google Maps</span></a>
  ${v.insta?`<a class="btn ghost wide instabtn" href="${esc(v.insta)}" target="_blank" rel="noopener" style="margin-top:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg><span>${esc(v.short)} on Instagram</span></a>`:''}</div>`}
const durLabel=n=>{const h=Math.floor(n/2),m=n%2*30;return (h?h+' h':'')+(h&&m?' ':'')+(m?m+' min':'')};
const slotLabel=i=>{const m=OPEN_H*60+i*30,h=Math.floor(m/60)%24,mm=m%60;return `${h%12||12}:${pad(mm)} ${h<12?'am':'pm'}`};
const slotRange=(s,len)=>{const a=slotLabel(s),b=slotLabel(s+len),[ta,pa]=a.split(' '),[tb,pb]=b.split(' ');return pa===pb?`${ta}–${tb} ${pb}`:`${a} – ${b}`};
/* For sentences: "today from 8:30 to 10:00 am", "yesterday at 6:00 pm", "on Sat, 14 Nov from 7:00 to 8:30 pm" */
function playedWhen(m){const t=today(),day=m.date===t?'today':m.date===addDays(t,-1)?'yesterday':'on '+dateLabel(m.date);if(m.time==null)return day;
 if(!m.len)return `${day} at ${slotLabel(m.time)}`;const a=slotLabel(m.time),b=slotLabel(m.time+m.len),[ta,pa]=a.split(' '),[tb,pb]=b.split(' ');
 return pa===pb?`${day} from ${ta} to ${tb} ${pb}`:`${day} from ${a} to ${b}`}
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
const APP_VER=window.RC_VER||'1',PREVIEW=!!window.RC_PREVIEW;
let sb=null;
function memStore(mode,get,put){return{mode,
 async load(){const d=get();return{profiles:d.profiles.slice(),matches:d.matches.slice(),bookings:d.bookings.slice(),confs:d.confs.slice(),admins:d.admins.slice(),msgs:d.msgs.filter(m=>m.to===S.uid),follows:(d.follows||[]).slice(),reqs:(d.reqs||[]).filter(r=>r.from===S.uid||r.to===S.uid),votes:(d.votes||[]).slice(),conduct:(d.conduct||[]).slice(),phones:Object.assign({},d.phones||{}),coaches:Object.assign({},d.coaches||{}),devs:(d.devs||[]).slice(),owners:(d.owners||[]).slice(),demoAcc:(d.demoAcc||[]).slice(),cfg:Object.assign({},d.cfg||{})}},
 async saveProfile(p){const d=get();upsert(d.profiles,p);put(d)},
 async addMatch(m){const d=get();d.matches.push(m);put(d)},
 async updateMatch(m){const d=get();upsert(d.matches,m);put(d)},
 async delMatch(id){const d=get();d.matches=d.matches.filter(m=>m.id!==id);d.confs=d.confs.filter(c=>c.match!==id);put(d)},
 async addBooking(b){const d=get();if(d.bookings.some(x=>overlaps(x,b)))throw errc('clash');d.bookings.push(b);put(d)},
 async updateBooking(b){const d=get();upsert(d.bookings,b);put(d)},
 async delBooking(id){const d=get();d.bookings=d.bookings.filter(b=>b.id!==id);put(d)},
 async addConf(c){const d=get();d.confs.push(c);put(d)},
 async send(list){const d=get(),at=new Date().toISOString();list.map(tagV).forEach(m=>d.msgs.push(Object.assign({id:'g_'+rid(),from:S.uid,read:false,at},m)));put(d)},
 async updateMsg(m){const d=get();upsert(d.msgs,m);put(d)},
 async follow(to){const d=get();d.follows=d.follows||[];if(!d.follows.some(f=>f.follower===S.uid&&f.followee===to))d.follows.push({follower:S.uid,followee:to,at:new Date().toISOString()});put(d)},
 async unfollow(to){const d=get();d.follows=(d.follows||[]).filter(f=>!(f.follower===S.uid&&f.followee===to));put(d)},
 async addReq(r){const d=get();d.reqs=d.reqs||[];d.reqs.push(r);put(d)},
 async updateReq(r){const d=get();upsert(d.reqs,r);put(d)},
 async delReq(id){const d=get();d.reqs=(d.reqs||[]).filter(r=>r.id!==id);put(d)},
 async addVote(v){const d=get();d.votes=d.votes||[];d.votes.push(v);put(d)},
 async saveCfg(k,v){const d=get();d.cfg=d.cfg||{};d.cfg[k]=v;put(d)},
 async setRole(id,role,coach,v=VID){const d=get(),k=id+'@'+v;d.coaches=d.coaches||{};delete d.coaches[k];d.admins=d.admins.filter(x=>x!==k);d.owners=(d.owners||[]).filter(x=>x!==k);if(role==='admin'||role==='owner')d.admins.push(k);if(role==='owner')d.owners.push(k);if(role==='coach')d.coaches[k]=coach;put(d)},
 async savePhone(r){const d=get();d.phones=d.phones||{};d.phones[S.uid]=r;put(d)},
 async setDemoAcc(id,on){const d=get();d.demoAcc=(d.demoAcc||[]).filter(x=>x!==id);if(on)d.demoAcc.push(id);put(d)},
 async addConduct(c){const d=get();d.conduct=d.conduct||[];if(d.conduct.some(x=>x.report&&x.report===c.report))throw errc('done');d.conduct.push(c);put(d)}
}}
const LKEYS=['profiles','matches','bookings','confs','msgs','follows','reqs','votes','cfg','conduct','phones','coaches','devs','owners','demoAcc'];
const Local=Object.assign(memStore('local',()=>{const d={admins:[]};LKEYS.forEach(k=>d[k]=ls.get('rc2_'+k,k==='cfg'||k==='phones'||k==='coaches'?{}:[]));return d},d=>LKEYS.forEach(k=>ls.set('rc2_'+k,d[k]))),{
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
  const ch=sb.channel('rc-live');['rc_profiles','rc_matches','rc_bookings','rc_confirmations','rc_messages','rc_follows','rc_friend_requests','rc_settings','rc_conduct','rc_private','rc_coaches','rc_admins','rc_developers','rc_owners','rc_demo_access'].forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t},onRemote));ch.subscribe();
 },
 async session(){const {data}=await sb.auth.getSession();return data.session?data.session.user.id:null},
 async taken(u){const {data,error}=await sb.rpc('rc_username_taken',{u});if(error)throw error;return !!data},
 async signUp(name,username,email,pw,phone){
  const {data,error}=await sb.auth.signUp({email,password:pw,options:{data:{name,username,phone:phone||undefined},emailRedirectTo:here()}});
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
  /* level feedback is newer still: if its table is missing, feedback is simply not shown */
  const quiet=p=>p.then(x=>x,e=>{if(missing(e))return[];throw e});
  const [p,m,b,c,a,g,f,q,v,cf,cd,ph,co,dv,da,ow]=await Promise.all([all('rc_profiles','id,username,name,data'),all('rc_matches','id,data'),
   opt(all('rc_bookings','*',q=>q.gte('day',addDays(today(),-45)))),opt(all('rc_confirmations','*')),opt(all('rc_admins','user_id,venue',null,'user_id')),
   opt(sb.from('rc_messages').select('*').eq('to_user',S.uid).order('created_at',{ascending:false}).limit(300).then(r=>{if(r.error)throw r.error;return r.data})),
   opt(all('rc_follows','*')),opt(all('rc_friend_requests','*')),quiet(all('rc_level_votes','*')),quiet(all('rc_settings','key,data',null,'key')),quiet(all('rc_conduct','*')),quiet(all('rc_private','user_id,phone,vis',null,'user_id')),quiet(all('rc_coaches','user_id,venue,sports,auto',null,'user_id')),quiet(all('rc_developers','user_id',null,'user_id')),quiet(all('rc_demo_access','user_id',null,'user_id')),quiet(all('rc_owners','user_id,venue',null,'user_id'))]);
  return{profiles:p.map(flat),matches:m.map(r=>Object.assign({},r.data,{id:r.id})),bookings:b.map(bRow),confs:c.map(cRow),admins:a.map(x=>x.user_id+'@'+(x.venue||'rc')),msgs:g.map(gRow),
   follows:f.map(x=>({follower:x.follower,followee:x.followee,at:x.created_at})),reqs:q.map(x=>({id:x.id,from:x.from_user,to:x.to_user,status:x.status,at:x.created_at,resp:x.responded_at})),
   votes:v.map(x=>({id:x.id,voter:x.voter,target:x.target,sport:x.sport,match:x.match_id,vote:x.vote,at:x.created_at})),cfg:Object.fromEntries(cf.map(x=>[x.key,x.data])),
   devs:dv.map(x=>x.user_id),owners:ow.map(x=>x.user_id+'@'+(x.venue||'rc')),demoAcc:da.map(x=>x.user_id),
   coaches:Object.fromEntries(co.map(x=>[x.user_id+'@'+(x.venue||'rc'),{sports:x.sports||[],auto:!!x.auto}])),
   phones:Object.fromEntries(ph.map(x=>[x.user_id,{phone:x.phone,vis:x.vis||'admins'}])),
   conduct:cd.map(x=>Object.assign({},x.data||{},{id:x.id,user:x.user_id,kind:x.kind,sport:x.sport,report:x.report,by:x.created_by,at:x.created_at}))};
 },
 async saveProfile(p){const {id,username,name,...data}=p;const {error}=await sb.from('rc_profiles').upsert({id,username,name,data,updated_at:new Date().toISOString()});if(error)throw error},
 async addMatch(m){const {error}=await sb.from('rc_matches').insert({id:m.id,data:m});if(error)throw error},
 async updateMatch(m){const {data,error}=await sb.from('rc_matches').update({data:m}).eq('id',m.id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async delMatch(id){const {data,error}=await sb.from('rc_matches').delete().eq('id',id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async addBooking(b){const {error}=await sb.from('rc_bookings').insert({id:b.id,court:b.court,day:b.date,start_slot:b.start,len:b.len,kind:b.kind,data:bData(b)});if(error){if(error.code==='23P01')throw errc('clash');throw error}},
 async updateBooking(b){const {data,error}=await sb.from('rc_bookings').update({data:bData(b)}).eq('id',b.id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async delBooking(id){const {data,error}=await sb.from('rc_bookings').delete().eq('id',id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async addConf(c){const {id,match,user,verdict,at,...data}=c;const {error}=await sb.from('rc_confirmations').insert({id,match_id:match,verdict,data});if(error)throw error},
 async send(list){if(!list.length)return;const {error}=await sb.from('rc_messages').insert(list.map(tagV).map(m=>({id:'g_'+rid(),to_user:m.to,kind:m.kind,data:m.data||{}})));if(error)throw error},
 async updateMsg(m){const {error}=await sb.from('rc_messages').update({read:!!m.read,data:m.data||{}}).eq('id',m.id);if(error)throw error},
 async follow(to){const {error}=await sb.from('rc_follows').insert({id:'f_'+rid(),followee:to});if(error&&error.code!=='23505')throw error},
 async unfollow(to){const {error}=await sb.from('rc_follows').delete().eq('follower',S.uid).eq('followee',to);if(error)throw error},
 async addReq(r){const {error}=await sb.from('rc_friend_requests').insert({id:r.id,to_user:r.to,status:r.status,responded_at:r.resp||null});if(error){if(error.code==='42501')throw errc('cooldown');throw error}},
 async updateReq(r){const {data,error}=await sb.from('rc_friend_requests').update({status:r.status,responded_at:r.resp}).eq('id',r.id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async delReq(id){const {data,error}=await sb.from('rc_friend_requests').delete().eq('id',id).select('id');if(error)throw error;if(!data.length)throw errc('denied')},
 async saveCfg(k,v){const {data,error}=await sb.from('rc_settings').upsert({key:k,data:v,updated_at:new Date().toISOString()}).select('key');if(error){if(missing(error))throw errc('nosql');if(error.code==='42501')throw errc('denied');throw error}if(!data||!data.length)throw errc('denied')},
 async setRole(id,role,coach,v=VID){const chk=r=>{if(r.error){if(missing(r.error))throw errc('nosql');if(r.error.code==='42501')throw errc('denied');throw r.error}return r};
  const del=t=>sb.from(t).delete().eq('user_id',id).eq('venue',v).select('user_id');
  if(role==='admin'||role==='owner'){if(!S.admins.includes(rk(id,v)))chk(await sb.from('rc_admins').insert({user_id:id,venue:v}));chk(await del('rc_coaches'));
   if(role==='owner'&&!isOwner(id,v))chk(await sb.from('rc_owners').insert({user_id:id,venue:v}));if(role==='admin'&&isOwner(id,v))chk(await del('rc_owners'));return}
  if(isOwner(id,v))chk(await del('rc_owners'));
  if(S.admins.includes(rk(id,v))){const r=chk(await del('rc_admins'));if(!r.data||!r.data.length)throw errc('denied')}
  if(role==='coach')chk(await sb.from('rc_coaches').upsert({user_id:id,venue:v,sports:coach.sports,auto:!!coach.auto,updated_at:new Date().toISOString()}));else chk(await del('rc_coaches'))},
 async setDemoAcc(id,on){const r=on?await sb.from('rc_demo_access').insert({user_id:id}):await sb.from('rc_demo_access').delete().eq('user_id',id);if(r.error&&r.error.code!=='23505'){if(missing(r.error))throw errc('nosql');if(r.error.code==='42501')throw errc('denied');throw r.error}},
 async savePhone(r){const {error}=await sb.from('rc_private').upsert({user_id:S.uid,phone:r.phone,vis:r.vis,updated_at:new Date().toISOString()});if(error){if(missing(error))throw errc('nosql');throw error}},
 async addConduct(c){const {id,user,kind,sport,report,by,at,...data}=c;const {error}=await sb.from('rc_conduct').insert({id,user_id:user,kind,sport,report,data});if(error){if(missing(error))throw errc('nosql');if(error.code==='23505')throw errc('done');if(error.code==='42501')throw errc('denied');throw error}},
 async addVote(v){const {error}=await sb.from('rc_level_votes').insert({id:v.id,target:v.target,sport:v.sport,match_id:v.match,vote:v.vote});if(error){if(missing(error))throw errc('nosql');throw error}}
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
function buildDemo(you,rank='dev'){
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
 ps.forEach(p=>{if(!p.created)p.created=new Date(now-(DAYS+1+Math.floor(r()*330))*864e5).toISOString()});
 if(!you.gender)you.gender='male';
 you.home=you.home||'rc';you.venues=[you.home];delete you.vstart;
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
 /* court bookings: a few days back and a week ahead, busier in the evenings. A few new requests wait for an admin to confirm */
 const bks=[],addB=b=>{if(!bks.some(x=>overlaps(x,b))){bks.push(b);return true}return false};
 for(let dd=-3;dd<=7;dd++){const date=addDays(T,dd);
  if(dd%3===0)addB({id:'db_c'+dd,court:'padel',date,start:0,len:3,kind:'block',by:caelan.id,reason:'Coaching',note:'Morning coaching clinic'});
  if(dd===2)addB({id:'db_m',court:'pickleball',date,start:16,len:4,kind:'block',by:surya.id,reason:'Maintenance',note:'Repainting the court lines'});
  for(const court of Object.keys(COURTS))for(let i=0;i<14;i++){
   const len=r()<.6?2:3,start=r()<.6?clamp(22+Math.floor(r()*12),0,NSLOT-len):Math.floor(r()*(NSLOT-len));
   const pool=playersOf(court),host=pick(pool),inv=[];while(inv.length<3){const p=pick(pool);if(p!==host&&!inv.includes(p.id))inv.push(p.id)}
   const going=inv.filter(()=>r()<.8);
   addB({id:'db_'+court[0]+dd+'_'+i,court,date,start,len,kind:'game',status:dd>=0&&r()<.12?'pending':'confirmed',by:host.id,invited:inv,going,declined:inv.filter(x=>!going.includes(x)&&r()<.5),note:r()<.3?pick(['Friendly doubles','Practice match','Ladder game','Mixed doubles']):'',at:ago(48)});
  }
 }
 const yourSport=Object.keys(you._skill)[0]||'padel',buddies=[arjun.id,...playersOf(yourSport).filter(p=>p!==arjun).slice(0,40).sort((a,b)=>Math.abs(sk(a,yourSport,1)-sk(you,yourSport,1))-Math.abs(sk(b,yourSport,1)-sk(you,yourSport,1))).slice(0,5).map(p=>p.id)];
 /* two coaches: one whose coaching blocks go straight through, one who needs an admin to confirm */
 const coach1=ps.find(p=>p.sports.includes('padel')&&p.levels.padel.start>4.6&&!['d_caelan','d_surya','d_arjun'].includes(p.id))||ps[0],coach2=ps.find(p=>p.sports.includes('pickleball')&&p!==coach1&&!['d_caelan','d_surya','d_arjun'].includes(p.id))||ps[1];
 const coaches={[coach1.id]:{sports:coach1.sports.includes('pickleball')?['padel','pickleball']:['padel'],auto:true},[coach2.id]:{sports:['pickleball'],auto:false}};
 bks.forEach(b=>{if(b.reason==='Coaching')b.by=coach1.id});
 let cpb=null;for(const st of [4,6,8,10,12]){const x={id:'db_cp',court:'pickleball',date:addDays(T,1),start:st,len:3,kind:'block',status:'pending',by:coach2.id,reason:'Coaching',note:'Beginner pickleball lesson',at:ago(2)};if(addB(x)){cpb=x;break}}
 /* your own games: one you host tomorrow evening (confirmed), one you are invited to, and one you played yesterday */
 const place=(b)=>{for(let s=b.start;s<NSLOT-b.len;s++){const x=Object.assign({},b,{start:s});const i=bks.findIndex(y=>overlaps(y,x)&&y.kind==='game'&&!y.mine);if(i>=0)bks.splice(i,1);if(addB(x))return x}return null};
 const host=place({id:'db_you1',mine:1,court:yourSport,date:addDays(T,1),start:26,len:3,kind:'game',status:'confirmed',by:you.id,invited:buddies.slice(0,3),going:buddies.slice(1,3),declined:[],note:'Evening doubles',at:ago(20)});
 const invB=place({id:'db_you2',mine:1,court:yourSport,date:addDays(T,2),start:25,len:2,kind:'game',status:'pending',by:buddies[3],invited:[you.id,buddies[4],buddies[5]],going:[buddies[4]],declined:[],note:'Need a fourth!',at:ago(6)});
 place({id:'db_you3',mine:1,court:yourSport,date:addDays(T,-1),start:24,len:3,kind:'game',status:'confirmed',by:you.id,invited:buddies.slice(0,3),going:buddies.slice(0,3),declined:[],note:'',at:ago(70)});
 if(host){msgs.push({id:'dg_ai',to:arjun.id,from:you.id,kind:'invite',data:{booking:host.id},read:false,at:ago(20)},{id:'dg_ic',to:you.id,from:caelan.id,kind:'bk_confirmed',data:{booking:host.id},read:false,at:ago(18)});
  msgs.push({id:'dg_ir',to:you.id,from:buddies[2],kind:'invite_reply',data:{booking:host.id,ok:true},read:true,at:ago(14)})}
 if(invB)msgs.push({id:'dg_i',to:you.id,from:invB.by,kind:'invite',data:{booking:invB.id},read:false,at:ago(6)},{id:'dg_br',to:you.id,from:invB.by,kind:'bk_request',data:{booking:invB.id},read:false,at:ago(6)});
 bks.filter(b=>b.status==='pending'&&!b.mine).slice(0,3).forEach((b,k)=>msgs.push({id:'dg_bq'+k,to:you.id,from:b.by,kind:'bk_request',data:{booking:b.id},read:k>0,at:ago(3+k*5)}));
 bks.forEach(b=>delete b.mine);
 if(cpb)msgs.push({id:'dg_cpb',to:you.id,from:coach2.id,kind:'bk_request',data:{booking:cpb.id},read:false,at:ago(2)});
 const cfg={prices:{base:1000,rules:[{id:'pr_we',from:22,to:34,days:'weekends',court:'all',price:1200}]}};
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
 /* Sunday Racquet & Social Club: a second club with its own players, staff and games (3 padel courts, 1 pickleball court).
    Some Racquet Culture players play there too. You and Arjun haven't joined it yet, so you see its sign-in the first time. */
 const sunP=[],mkSun=(name,gender,sports,lv0)=>{let un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,14),k=2;while(used.has(un))un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,12)+(k++);used.add(un);names.add(name);
  const levels={},skill={},grow={};sports.forEach(sp=>{const v=lv0&&lv0[sp]!=null?lv0[sp]:sp==='padel'?clamp(3.1+gauss()*1.1,.8,6.6):clamp(3.3+gauss()*.7,1.2,5.4);levels[sp]=lv(sp,Math.round(v*10)/10);skill[sp]=v+gauss()*.2;grow[sp]=(.08+gauss()*.25)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.4?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  const p={id:'ds_'+sunP.length,username:un,name,gender,setup:true,demo:true,avatar:null,sports,hand:r()<.85?'right':'left',invites:r()<.7,times,side:pick(['left','right','either']),levels,_skill:skill,_grow:grow,home:'sunday',venues:['sunday'],created:new Date(now-(DAYS+1+Math.floor(r()*200))*864e5).toISOString()};sunP.push(p);return p};
 const sOwner=mkSun('Vikram Alvares','male',['padel','pickleball'],{padel:5.4,pickleball:4.2}),sAdmin=mkSun('Tara Saldanha','female',['padel','pickleball'],{padel:4.6,pickleball:3.9}),
  sCoach=mkSun('Leon Fonseca','male',['padel'],{padel:5.9}),sPlayer=mkSun('Kabir Lobo','male',['padel','pickleball'],{padel:3.3,pickleball:3.4});
 sPlayer.friends='request';
 while(sunP.length<60){const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;const x=r();mkSun(name,D_FEM.has(fn)?'female':'male',x<.55?['padel','pickleball']:x<.9?['padel']:['pickleball'])}
 /* Racquet Culture regulars who also play at Sunday: their Sunday level starts from their Racquet Culture level when they joined */
 const both=ps.filter(p=>![caelan.id,surya.id,arjun.id].includes(p.id)).slice(5,25);
 both.forEach(p=>{p.venues=['rc','sunday'];p.vstart={sunday:{}};p.sports.forEach(sp=>p.vstart.sunday[sp]=Math.round(clampL(sp,sk(p,sp,.6))*100)/100)});
 const sunAll=[...sunP,...both],sms=[],socc={};
 for(let k=0;k<420;k++){
  const t=k/420,sp=r()<.65?'padel':'pickleball',pool=sunAll.filter(p=>p._skill[sp]!=null),singles=sp==='pickleball'&&r()<.15,n=singles?2:4,anchor=pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t))),cand=r()<.8?near.slice(0,12):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const A_=grp.slice(0,n/2),B_=grp.slice(n/2),ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa,slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5);let date=isoIST(d);const len=sp==='padel'?(r()<.6?3:2):2,court=sp==='padel'?1+Math.floor(r()*3):1;
  if(date===T&&nowSlot()-len<0)date=addDays(T,-1);const hi=date===T?Math.min(NSLOT-len,nowSlot()-len):NSLOT-len,u=socc[date+sp+court]=socc[date+sp+court]||[];let st=null;
  for(let q=0;q<40&&st==null;q++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!u.some(([a,b])=>c<b&&a<c+len))st=c}if(st==null)continue;u.push([st,st+len]);
  sms.push({id:'sm_'+k,demo:true,venue:'sunday',sport:sp,format:singles?'singles':'doubles',date,time:st,len,court,a:A_.map(slot),b:B_.map(slot),sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 sms.sort(byWhen);const sregs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 sms.forEach(m=>sregs(m).filter(u=>u!==m.by).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 /* Kabir has a game to confirm; Sunday's admins have a disputed score and a question waiting */
 const kG=sms.filter(m=>m.date>=addDays(T,-5)&&m.format==='doubles'&&!sregs(m).includes(sPlayer.id)).pop();
 if(kG){const i=kG.b.findIndex(x=>x.uid!==kG.by);kG.b[i]={uid:sPlayer.id,level:+fmtL(sPlayer._skill[kG.sport])};confs.splice(0,confs.length,...confs.filter(c=>!(c.match===kG.id&&c.user===sPlayer.id)));msgs.push({id:'ds_c',to:sPlayer.id,from:kG.by,kind:'confirm',data:{match:kG.id,venue:'sunday'},read:false,at:ago(4)})}
 const sD=sms.filter(m=>m!==kG&&m.date>=addDays(T,-4)&&m.format==='doubles').pop();
 if(sD){const loser=(sD.winner==='a'?sD.b:sD.a).find(s=>s.uid!==sD.by);if(loser){for(let i=confs.length-1;i>=0;i--)if(confs[i].match===sD.id)confs.splice(i,1);
  const prop=sD.sets.map(s=>s.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(sD.sport==='padel'?(sD.winner==='a'?[4,6]:[6,4]):(sD.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length,c={id:'dc_sun',match:sD.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We won the last set on court '+sD.court+'. Please check.',at:ago(6)};confs.push(c);
  [sOwner.id,sAdmin.id,you.id].forEach((to,i)=>msgs.push({id:'ds_d'+i,to,from:loser.uid,kind:'dispute',data:{match:sD.id,conf:c.id,venue:'sunday'},read:false,at:c.at}))}}
 const sAsk=sunP[12];if(sAsk){const data={thread:'dth_s1',topic:'court',text:'One of the lights over padel court 3 keeps flickering in the evenings.',player:sAsk.id,venue:'sunday'};[sOwner.id,sAdmin.id,you.id,sAsk.id].forEach(t=>msgs.push({id:'ds_am'+t,to:t,from:sAsk.id,kind:'admin_msg',data,read:false,at:ago(7)}))}
 const sNews=[{text:'Welcome to Sunday Racquet & Social Club on the app! Book your court on District as usual, then log your score here to climb the Sunday rankings.',link:'',lt:''},{text:'Sunday social mixed doubles this weekend from 4 pm on all three padel courts. All levels welcome.',link:'',lt:''}];
 sNews.forEach((nw,k)=>[...sunP,...both].forEach(p=>msgs.push({id:'ds_cm'+k+p.id,to:p.id,from:k?sAdmin.id:sOwner.id,kind:'community',data:Object.assign({venue:'sunday'},nw),read:k===0,at:ago(40-k*30)})));
 for(let k=0;k<160;k++){const a=pick(sunAll),b=pick(sunAll);if(a!==b&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*40))})}
 sunAll.slice(4,12).forEach((p,i)=>reqs.push({id:'ds_f'+i,from:sPlayer.id,to:p.id,status:'accepted',at:ago(24*(6+i)),resp:ago(24*(5+i))}));
 ms.push(...sms);ms.sort(byWhen);all.push(...sunP);
 /* Clube De Floresta: a third club built the same way. Padel and pickleball are ranked; badminton and table tennis are booked on Hudle.
    Some Racquet Culture and Sunday players play here too. */
 const floP=[],mkFlo=(name,gender,sports,lv0)=>{let un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,14),k=2;while(used.has(un))un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,12)+(k++);used.add(un);names.add(name);
  const levels={},skill={},grow={};sports.forEach(sp=>{const v=lv0&&lv0[sp]!=null?lv0[sp]:sp==='padel'?clamp(3.1+gauss()*1.1,.8,6.6):clamp(3.3+gauss()*.7,1.2,5.4);levels[sp]=lv(sp,Math.round(v*10)/10);skill[sp]=v+gauss()*.2;grow[sp]=(.08+gauss()*.25)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.4?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  const p={id:'df_'+floP.length,username:un,name,gender,setup:true,demo:true,avatar:null,sports,hand:r()<.85?'right':'left',invites:r()<.7,times,side:pick(['left','right','either']),levels,_skill:skill,_grow:grow,home:'floresta',venues:['floresta'],created:new Date(now-(DAYS+1+Math.floor(r()*200))*864e5).toISOString()};floP.push(p);return p};
 const fOwner=mkFlo('Rohan Menezes','male',['padel','pickleball'],{padel:5.2,pickleball:4.4}),fAdmin=mkFlo('Inês Correia','female',['padel','pickleball'],{padel:4.3,pickleball:4.1}),
  fCoach=mkFlo('Diego Furtado','male',['padel'],{padel:5.7}),fPlayer=mkFlo('Aditi Naik','female',['padel','pickleball'],{padel:3.2,pickleball:3.5});
 fPlayer.friends='request';
 while(floP.length<50){const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;const x=r();mkFlo(name,D_FEM.has(fn)?'female':'male',x<.55?['padel','pickleball']:x<.9?['padel']:['pickleball'])}
 
 const both2=[...ps.filter(p=>![caelan.id,surya.id,arjun.id].includes(p.id)).slice(18,34),...sunP.slice(20,28)];
 both2.forEach(p=>{p.venues=[...new Set([...(p.venues||[p.home||'rc']),'floresta'])];p.vstart=Object.assign(p.vstart||{},{floresta:{}});p.sports.forEach(sp=>p.vstart.floresta[sp]=Math.round(clampL(sp,sk(p,sp,.6))*100)/100)});
 const floAll=[...floP,...both2],fms=[],focc={};
 for(let k=0;k<330;k++){
  const t=k/330,sp=r()<.65?'padel':'pickleball',pool=floAll.filter(p=>p._skill[sp]!=null),singles=sp==='pickleball'&&r()<.15,n=singles?2:4,anchor=pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t))),cand=r()<.8?near.slice(0,12):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const A_=grp.slice(0,n/2),B_=grp.slice(n/2),ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa,slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5);let date=isoIST(d);const len=sp==='padel'?(r()<.6?3:2):2,court=1,lane=0;
  if(date===T&&nowSlot()-len<0)date=addDays(T,-1);const hi=date===T?Math.min(NSLOT-len,nowSlot()-len):NSLOT-len,u=focc[date+sp+lane]=focc[date+sp+lane]||[];let st=null;
  for(let q=0;q<40&&st==null;q++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!u.some(([a,b])=>c<b&&a<c+len))st=c}if(st==null)continue;u.push([st,st+len]);
  fms.push({id:'fm_'+k,demo:true,venue:'floresta',sport:sp,format:singles?'singles':'doubles',date,time:st,len,court,a:A_.map(slot),b:B_.map(slot),sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 fms.sort(byWhen);const fregs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 fms.forEach(m=>fregs(m).filter(u=>u!==m.by).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 
 const fkG=fms.filter(m=>m.date>=addDays(T,-5)&&m.format==='doubles'&&!fregs(m).includes(fPlayer.id)).pop();
 if(fkG){const i=fkG.b.findIndex(x=>x.uid!==fkG.by);fkG.b[i]={uid:fPlayer.id,level:+fmtL(fPlayer._skill[fkG.sport])};confs.splice(0,confs.length,...confs.filter(c=>!(c.match===fkG.id&&c.user===fPlayer.id)));msgs.push({id:'df_c',to:fPlayer.id,from:fkG.by,kind:'confirm',data:{match:fkG.id,venue:'floresta'},read:false,at:ago(4)})}
 const fD=fms.filter(m=>m!==fkG&&m.date>=addDays(T,-4)&&m.format==='doubles').pop();
 if(fD){const loser=(fD.winner==='a'?fD.b:fD.a).find(s=>s.uid!==fD.by);if(loser){for(let i=confs.length-1;i>=0;i--)if(confs[i].match===fD.id)confs.splice(i,1);
  const prop=fD.sets.map(s=>s.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(fD.sport==='padel'?(fD.winner==='a'?[4,6]:[6,4]):(fD.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length,c={id:'dc_flo',match:fD.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We won the last set. Please check.',at:ago(6)};confs.push(c);
  [fOwner.id,fAdmin.id,you.id].forEach((to,i)=>msgs.push({id:'df_d'+i,to,from:loser.uid,kind:'dispute',data:{match:fD.id,conf:c.id,venue:'floresta'},read:false,at:c.at}))}}
 const fAsk=floP[12];if(fAsk){const data={thread:'dth_f1',topic:'court',text:'Could we get a few more pickleball paddles at the front desk for people trying it out?',player:fAsk.id,venue:'floresta'};[fOwner.id,fAdmin.id,you.id,fAsk.id].forEach(t=>msgs.push({id:'df_am'+t,to:t,from:fAsk.id,kind:'admin_msg',data,read:false,at:ago(7)}))}
 const fNews=[{text:'Welcome to Clube De Floresta on OneCourt! Book your court on Hudle as usual, then log your padel and pickleball scores here to climb the Floresta rankings.',link:'',lt:''},{text:'Padel and pickle social under the trees this Saturday from 5 pm. All levels welcome.',link:'',lt:''}];
 fNews.forEach((nw,k)=>[...floP,...both2].forEach(p=>msgs.push({id:'df_cm'+k+p.id,to:p.id,from:k?fAdmin.id:fOwner.id,kind:'community',data:Object.assign({venue:'floresta'},nw),read:k===0,at:ago(40-k*30)})));
 for(let k=0;k<160;k++){const a=pick(floAll),b=pick(floAll);if(a!==b&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*40))})}
 floAll.slice(4,12).forEach((p,i)=>reqs.push({id:'df_f'+i,from:fPlayer.id,to:p.id,status:'accepted',at:ago(24*(6+i)),resp:ago(24*(5+i))}));
 ms.push(...fms);ms.sort(byWhen);all.push(...floP);
 /* AER (Dona Paula): a fourth club built the same way, booked on Hudle. 1 padel and 1 pickleball court, both ranked.
    Some players from the other clubs play here too. */
 const aerP=[],mkAer=(name,gender,sports,lv0)=>{let un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,14),k=2;while(used.has(un))un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,12)+(k++);used.add(un);names.add(name);
  const levels={},skill={},grow={};sports.forEach(sp=>{const v=lv0&&lv0[sp]!=null?lv0[sp]:sp==='padel'?clamp(3.1+gauss()*1.1,.8,6.6):clamp(3.3+gauss()*.7,1.2,5.4);levels[sp]=lv(sp,Math.round(v*10)/10);skill[sp]=v+gauss()*.2;grow[sp]=(.08+gauss()*.25)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.4?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  const p={id:'da_'+aerP.length,username:un,name,gender,setup:true,demo:true,avatar:null,sports,hand:r()<.85?'right':'left',invites:r()<.7,times,side:pick(['left','right','either']),levels,_skill:skill,_grow:grow,home:'aer',venues:['aer'],created:new Date(now-(DAYS+1+Math.floor(r()*200))*864e5).toISOString()};aerP.push(p);return p};
 const aOwner=mkAer('Kunal Sardesai','male',['padel','pickleball'],{padel:5.0,pickleball:4.6}),aAdmin=mkAer('Sara Pinto','female',['padel','pickleball'],{padel:4.2,pickleball:4.3}),
  aCoach=mkAer('Mateo Alvares','male',['padel'],{padel:5.6}),aPlayer=mkAer('Riya Kamat','female',['padel','pickleball'],{padel:3.3,pickleball:3.6});
 aPlayer.friends='request';
 while(aerP.length<40){const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;const x=r();mkAer(name,D_FEM.has(fn)?'female':'male',x<.55?['padel','pickleball']:x<.9?['padel']:['pickleball'])}
 
 const both3=[...ps.filter(p=>![caelan.id,surya.id,arjun.id].includes(p.id)).slice(36,48),...sunP.slice(30,36),...aerP.slice(20,26)];
 both3.forEach(p=>{p.venues=[...new Set([...(p.venues||[p.home||'rc']),'aer'])];p.vstart=Object.assign(p.vstart||{},{aer:{}});p.sports.forEach(sp=>p.vstart.aer[sp]=Math.round(clampL(sp,sk(p,sp,.6))*100)/100)});
 const aerAll=[...aerP,...both3],ams=[],aocc={};
 for(let k=0;k<260;k++){
  const t=k/260,sp=r()<.65?'padel':'pickleball',pool=aerAll.filter(p=>p._skill[sp]!=null),singles=sp==='pickleball'&&r()<.15,n=singles?2:4,anchor=pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t))),cand=r()<.8?near.slice(0,12):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const A_=grp.slice(0,n/2),B_=grp.slice(n/2),ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa,slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5);let date=isoIST(d);const len=sp==='padel'?(r()<.6?3:2):2,court=1,lane=0;
  if(date===T&&nowSlot()-len<0)date=addDays(T,-1);const hi=date===T?Math.min(NSLOT-len,nowSlot()-len):NSLOT-len,u=aocc[date+sp+lane]=aocc[date+sp+lane]||[];let st=null;
  for(let q=0;q<40&&st==null;q++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!u.some(([a,b])=>c<b&&a<c+len))st=c}if(st==null)continue;u.push([st,st+len]);
  ams.push({id:'am_'+k,demo:true,venue:'aer',sport:sp,format:singles?'singles':'doubles',date,time:st,len,court,a:A_.map(slot),b:B_.map(slot),sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 ams.sort(byWhen);const aregs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 ams.forEach(m=>aregs(m).filter(u=>u!==m.by).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 
 const akG=ams.filter(m=>m.date>=addDays(T,-5)&&m.format==='doubles'&&!aregs(m).includes(aPlayer.id)).pop();
 if(akG){const i=akG.b.findIndex(x=>x.uid!==akG.by);akG.b[i]={uid:aPlayer.id,level:+fmtL(aPlayer._skill[akG.sport])};confs.splice(0,confs.length,...confs.filter(c=>!(c.match===akG.id&&c.user===aPlayer.id)));msgs.push({id:'da_c',to:aPlayer.id,from:akG.by,kind:'confirm',data:{match:akG.id,venue:'aer'},read:false,at:ago(4)})}
 const aD=ams.filter(m=>m!==akG&&m.date>=addDays(T,-4)&&m.format==='doubles').pop();
 if(aD){const loser=(aD.winner==='a'?aD.b:aD.a).find(s=>s.uid!==aD.by);if(loser){for(let i=confs.length-1;i>=0;i--)if(confs[i].match===aD.id)confs.splice(i,1);
  const prop=aD.sets.map(s=>s.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(aD.sport==='padel'?(aD.winner==='a'?[4,6]:[6,4]):(aD.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length,c={id:'dc_aer',match:aD.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We won the last set. Please check.',at:ago(6)};confs.push(c);
  [aOwner.id,aAdmin.id,you.id].forEach((to,i)=>msgs.push({id:'da_d'+i,to,from:loser.uid,kind:'dispute',data:{match:aD.id,conf:c.id,venue:'aer'},read:false,at:c.at}))}}
 const aAsk=aerP[12];if(aAsk){const data={thread:'dth_a1',topic:'court',text:'Could we keep a few evening slots for open play on the padel court?',player:aAsk.id,venue:'aer'};[aOwner.id,aAdmin.id,you.id,aAsk.id].forEach(t=>msgs.push({id:'da_am'+t,to:t,from:aAsk.id,kind:'admin_msg',data,read:false,at:ago(7)}))}
 const aNews=[{text:'Welcome to AER on OneCourt! Book your court on Hudle as usual, then log your padel and pickleball scores here to climb the AER rankings.',link:'',lt:''},{text:'Sunset padel and pickleball mixer this Friday from 6 pm. All levels welcome.',link:'',lt:''}];
 aNews.forEach((nw,k)=>[...aerP,...both3].forEach(p=>msgs.push({id:'da_cm'+k+p.id,to:p.id,from:k?aAdmin.id:aOwner.id,kind:'community',data:Object.assign({venue:'aer'},nw),read:k===0,at:ago(40-k*30)})));
 for(let k=0;k<160;k++){const a=pick(aerAll),b=pick(aerAll);if(a!==b&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*40))})}
 aerAll.slice(4,12).forEach((p,i)=>reqs.push({id:'da_f'+i,from:aPlayer.id,to:p.id,status:'accepted',at:ago(24*(6+i)),resp:ago(24*(5+i))}));
 ms.push(...ams);ms.sort(byWhen);all.push(...aerP);
 /* CoPlay Panjim Gymkhana: a fifth club built the same way, booked on Hudle. 1 padel court, ranked (no pickleball here yet).
    Some players from the other clubs play here too. */
 const cpP=[],mkCp=(name,gender,sports,lv0)=>{let un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,14),k=2;while(used.has(un))un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,12)+(k++);used.add(un);names.add(name);
  const levels={},skill={},grow={};sports.forEach(sp=>{const v=lv0&&lv0[sp]!=null?lv0[sp]:sp==='padel'?clamp(3.1+gauss()*1.1,.8,6.6):clamp(3.3+gauss()*.7,1.2,5.4);levels[sp]=lv(sp,Math.round(v*10)/10);skill[sp]=v+gauss()*.2;grow[sp]=(.08+gauss()*.25)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.4?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  const p={id:'dk_'+cpP.length,username:un,name,gender,setup:true,demo:true,avatar:null,sports,hand:r()<.85?'right':'left',invites:r()<.7,times,side:pick(['left','right','either']),levels,_skill:skill,_grow:grow,home:'coplay',venues:['coplay'],created:new Date(now-(DAYS+1+Math.floor(r()*200))*864e5).toISOString()};cpP.push(p);return p};
 const cOwner=mkCp('Rohan Naik','male',['padel'],{padel:4.9}),cAdmin=mkCp('Nisha Dessai','female',['padel'],{padel:4.2}),
  cCoach=mkCp('Diego Fernandes','male',['padel'],{padel:5.5}),cPlayer=mkCp('Tanvi Shetye','female',['padel'],{padel:3.4});
 cPlayer.friends='request';
 while(cpP.length<40){const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;const x=r();mkCp(name,D_FEM.has(fn)?'female':'male',x<.4?['padel','pickleball']:['padel'])}
 
 const both4=[...ps.filter(p=>![caelan.id,surya.id,arjun.id].includes(p.id)).slice(48,58),...floP.slice(24,30),...aerP.slice(28,34),...cpP.slice(20,26)];
 both4.forEach(p=>{p.venues=[...new Set([...(p.venues||[p.home||'rc']),'coplay'])];p.vstart=Object.assign(p.vstart||{},{coplay:{}});p.sports.filter(sp=>sp==='padel').forEach(sp=>p.vstart.coplay[sp]=Math.round(clampL(sp,sk(p,sp,.6))*100)/100)});
 const cpAll=[...cpP,...both4],cms=[],cocc={};
 for(let k=0;k<260;k++){
  const t=k/260,sp='padel',pool=cpAll.filter(p=>p._skill[sp]!=null),singles=false,n=singles?2:4,anchor=pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t))),cand=r()<.8?near.slice(0,12):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const A_=grp.slice(0,n/2),B_=grp.slice(n/2),ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa,slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5);let date=isoIST(d);const len=sp==='padel'?(r()<.6?3:2):2,court=1,lane=0;
  if(date===T&&nowSlot()-len<0)date=addDays(T,-1);const hi=date===T?Math.min(NSLOT-len,nowSlot()-len):NSLOT-len,u=cocc[date+sp+lane]=cocc[date+sp+lane]||[];let st=null;
  for(let q=0;q<40&&st==null;q++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!u.some(([a,b])=>c<b&&a<c+len))st=c}if(st==null)continue;u.push([st,st+len]);
  cms.push({id:'km_'+k,demo:true,venue:'coplay',sport:sp,format:singles?'singles':'doubles',date,time:st,len,court,a:A_.map(slot),b:B_.map(slot),sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 cms.sort(byWhen);const cregs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 cms.forEach(m=>cregs(m).filter(u=>u!==m.by).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 
 const ckG=cms.filter(m=>m.date>=addDays(T,-5)&&m.format==='doubles'&&!cregs(m).includes(cPlayer.id)).pop();
 if(ckG){const i=ckG.b.findIndex(x=>x.uid!==ckG.by);ckG.b[i]={uid:cPlayer.id,level:+fmtL(cPlayer._skill[ckG.sport])};confs.splice(0,confs.length,...confs.filter(c=>!(c.match===ckG.id&&c.user===cPlayer.id)));msgs.push({id:'dk_c',to:cPlayer.id,from:ckG.by,kind:'confirm',data:{match:ckG.id,venue:'coplay'},read:false,at:ago(4)})}
 const cD=cms.filter(m=>m!==ckG&&m.date>=addDays(T,-4)&&m.format==='doubles').pop();
 if(cD){const loser=(cD.winner==='a'?cD.b:cD.a).find(s=>s.uid!==cD.by);if(loser){for(let i=confs.length-1;i>=0;i--)if(confs[i].match===cD.id)confs.splice(i,1);
  const prop=cD.sets.map(s=>s.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(cD.sport==='padel'?(cD.winner==='a'?[4,6]:[6,4]):(cD.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length,c={id:'dc_cop',match:cD.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We won the last set. Please check.',at:ago(6)};confs.push(c);
  [cOwner.id,cAdmin.id,you.id].forEach((to,i)=>msgs.push({id:'dk_d'+i,to,from:loser.uid,kind:'dispute',data:{match:cD.id,conf:c.id,venue:'coplay'},read:false,at:c.at}))}}
 const cAsk=cpP[12];if(cAsk){const data={thread:'dth_k1',topic:'court',text:'Could we have a padel ladder night on weekdays?',player:cAsk.id,venue:'coplay'};[cOwner.id,cAdmin.id,you.id,cAsk.id].forEach(t=>msgs.push({id:'dk_am'+t,to:t,from:cAsk.id,kind:'admin_msg',data,read:false,at:ago(7)}))}
 const cNews=[{text:'Welcome to CoPlay on OneCourt! Book your court on Hudle as usual, then log your padel scores here to climb the CoPlay rankings.',link:'',lt:''},{text:'Riverside padel social at Campal this Saturday from 5 pm. All levels welcome.',link:'',lt:''}];
 cNews.forEach((nw,k)=>[...cpP,...both4].forEach(p=>msgs.push({id:'dk_cm'+k+p.id,to:p.id,from:k?cAdmin.id:cOwner.id,kind:'community',data:Object.assign({venue:'coplay'},nw),read:k===0,at:ago(40-k*30)})));
 for(let k=0;k<160;k++){const a=pick(cpAll),b=pick(cpAll);if(a!==b&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*40))})}
 cpAll.slice(4,12).forEach((p,i)=>reqs.push({id:'dk_f'+i,from:cPlayer.id,to:p.id,status:'accepted',at:ago(24*(6+i)),resp:ago(24*(5+i))}));
 ms.push(...cms);ms.sort(byWhen);all.push(...cpP);
 /* Round Two (Vagator): built the same way, booked on Hudle. 1 padel court, ranked.
    Some players from the other clubs play here too. */
 const rtP=[],mkRt=(name,gender,sports,lv0)=>{let un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,14),k=2;while(used.has(un))un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,12)+(k++);used.add(un);names.add(name);
  const levels={},skill={},grow={};sports.forEach(sp=>{const v=lv0&&lv0[sp]!=null?lv0[sp]:sp==='padel'?clamp(3.1+gauss()*1.1,.8,6.6):clamp(3.3+gauss()*.7,1.2,5.4);levels[sp]=lv(sp,Math.round(v*10)/10);skill[sp]=v+gauss()*.2;grow[sp]=(.08+gauss()*.25)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.4?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  const p={id:'dr_'+rtP.length,username:un,name,gender,setup:true,demo:true,avatar:null,sports,hand:r()<.85?'right':'left',invites:r()<.7,times,side:pick(['left','right','either']),levels,_skill:skill,_grow:grow,home:'roundtwo',venues:['roundtwo'],created:new Date(now-(DAYS+1+Math.floor(r()*200))*864e5).toISOString()};rtP.push(p);return p};
 const rOwner=mkRt('Neil Dias','male',['padel'],{padel:5.1}),rAdmin=mkRt('Zoe Fernandes','female',['padel'],{padel:4.1}),
  rCoach=mkRt('Lucas Moreno','male',['padel'],{padel:5.7}),rPlayer=mkRt('Ishita Naik','female',['padel'],{padel:3.2});
 rPlayer.friends='request';
 while(rtP.length<40){const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;const x=r();mkRt(name,D_FEM.has(fn)?'female':'male',x<.4?['padel','pickleball']:['padel'])}
 
 const both6=[...ps.filter(p=>![caelan.id,surya.id,arjun.id].includes(p.id)).slice(66,72),...sunP.slice(42,50),...floP.slice(30,36),...rtP.slice(20,26)];
 both6.forEach(p=>{p.venues=[...new Set([...(p.venues||[p.home||'rc']),'roundtwo'])];p.vstart=Object.assign(p.vstart||{},{roundtwo:{}});p.sports.filter(sp=>sp==='padel').forEach(sp=>p.vstart.roundtwo[sp]=Math.round(clampL(sp,sk(p,sp,.6))*100)/100)});
 const rtAll=[...rtP,...both6],rms=[],rocc={};
 for(let k=0;k<260;k++){
  const t=k/260,sp='padel',pool=rtAll.filter(p=>p._skill[sp]!=null),singles=false,n=singles?2:4,anchor=pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t))),cand=r()<.8?near.slice(0,12):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const A_=grp.slice(0,n/2),B_=grp.slice(n/2),ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa,slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5);let date=isoIST(d);const len=sp==='padel'?(r()<.6?3:2):2,court=1,lane=0;
  if(date===T&&nowSlot()-len<0)date=addDays(T,-1);const hi=date===T?Math.min(NSLOT-len,nowSlot()-len):NSLOT-len,u=rocc[date+sp+lane]=rocc[date+sp+lane]||[];let st=null;
  for(let q=0;q<40&&st==null;q++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!u.some(([a,b])=>c<b&&a<c+len))st=c}if(st==null)continue;u.push([st,st+len]);
  rms.push({id:'rm_'+k,demo:true,venue:'roundtwo',sport:sp,format:singles?'singles':'doubles',date,time:st,len,court,a:A_.map(slot),b:B_.map(slot),sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 rms.sort(byWhen);const rregs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 rms.forEach(m=>rregs(m).filter(u=>u!==m.by).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 
 const rkG=rms.filter(m=>m.date>=addDays(T,-5)&&m.format==='doubles'&&!rregs(m).includes(rPlayer.id)).pop();
 if(rkG){const i=rkG.b.findIndex(x=>x.uid!==rkG.by);rkG.b[i]={uid:rPlayer.id,level:+fmtL(rPlayer._skill[rkG.sport])};confs.splice(0,confs.length,...confs.filter(c=>!(c.match===rkG.id&&c.user===rPlayer.id)));msgs.push({id:'dr_c',to:rPlayer.id,from:rkG.by,kind:'confirm',data:{match:rkG.id,venue:'roundtwo'},read:false,at:ago(4)})}
 const rD=rms.filter(m=>m!==rkG&&m.date>=addDays(T,-4)&&m.format==='doubles').pop();
 if(rD){const loser=(rD.winner==='a'?rD.b:rD.a).find(s=>s.uid!==rD.by);if(loser){for(let i=confs.length-1;i>=0;i--)if(confs[i].match===rD.id)confs.splice(i,1);
  const prop=rD.sets.map(s=>s.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(rD.sport==='padel'?(rD.winner==='a'?[4,6]:[6,4]):(rD.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length,c={id:'dc_rt',match:rD.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We won the last set. Please check.',at:ago(6)};confs.push(c);
  [rOwner.id,rAdmin.id,you.id].forEach((to,i)=>msgs.push({id:'dr_d'+i,to,from:loser.uid,kind:'dispute',data:{match:rD.id,conf:c.id,venue:'roundtwo'},read:false,at:c.at}))}}
 const rAsk=rtP[12];if(rAsk){const data={thread:'dth_r1',topic:'court',text:'Any chance of a late-night padel slot after 10 pm on weekends?',player:rAsk.id,venue:'roundtwo'};[rOwner.id,rAdmin.id,you.id,rAsk.id].forEach(t=>msgs.push({id:'dr_am'+t,to:t,from:rAsk.id,kind:'admin_msg',data,read:false,at:ago(7)}))}
 const rNews=[{text:'Welcome to Round Two on OneCourt! Book the court on Hudle as usual, then log your padel scores here to climb the Round Two rankings.',link:'',lt:''},{text:'Sundowner padel social in Vagator this Saturday from 5 pm. All levels welcome.',link:'',lt:''}];
 rNews.forEach((nw,k)=>[...rtP,...both6].forEach(p=>msgs.push({id:'dr_cm'+k+p.id,to:p.id,from:k?rAdmin.id:rOwner.id,kind:'community',data:Object.assign({venue:'roundtwo'},nw),read:k===0,at:ago(40-k*30)})));
 for(let k=0;k<160;k++){const a=pick(rtAll),b=pick(rtAll);if(a!==b&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*40))})}
 rtAll.slice(4,12).forEach((p,i)=>reqs.push({id:'dr_f'+i,from:rPlayer.id,to:p.id,status:'accepted',at:ago(24*(6+i)),resp:ago(24*(5+i))}));
 ms.push(...rms);ms.sort(byWhen);all.push(...rtP);
 /* Coco Padel Assagao: built the same way, booked on Hudle. 1 padel court, ranked.
    Some players from the other clubs play here too. */
 const coP=[],mkCo=(name,gender,sports,lv0)=>{let un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,14),k=2;while(used.has(un))un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,12)+(k++);used.add(un);names.add(name);
  const levels={},skill={},grow={};sports.forEach(sp=>{const v=lv0&&lv0[sp]!=null?lv0[sp]:sp==='padel'?clamp(3.1+gauss()*1.1,.8,6.6):clamp(3.3+gauss()*.7,1.2,5.4);levels[sp]=lv(sp,Math.round(v*10)/10);skill[sp]=v+gauss()*.2;grow[sp]=(.08+gauss()*.25)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.4?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  const p={id:'dz_'+coP.length,username:un,name,gender,setup:true,demo:true,avatar:null,sports,hand:r()<.85?'right':'left',invites:r()<.7,times,side:pick(['left','right','either']),levels,_skill:skill,_grow:grow,home:'coco',venues:['coco'],created:new Date(now-(DAYS+1+Math.floor(r()*200))*864e5).toISOString()};coP.push(p);return p};
 const zOwner=mkCo('Rahul Mandrekar','male',['padel'],{padel:4.8}),zAdmin=mkCo('Alisha Coutinho','female',['padel'],{padel:4.0}),
  zCoach=mkCo('Pablo Ruiz','male',['padel'],{padel:5.6}),zPlayer=mkCo('Sneha Harmalkar','female',['padel'],{padel:3.3});
 zPlayer.friends='request';
 while(coP.length<40){const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;const x=r();mkCo(name,D_FEM.has(fn)?'female':'male',x<.4?['padel','pickleball']:['padel'])}
 
 const both7=[...ps.filter(p=>![caelan.id,surya.id,arjun.id].includes(p.id)).slice(72,78),...floP.slice(36,40),...sunP.slice(50,56),...coP.slice(20,26)];
 both7.forEach(p=>{p.venues=[...new Set([...(p.venues||[p.home||'rc']),'coco'])];p.vstart=Object.assign(p.vstart||{},{coco:{}});p.sports.filter(sp=>sp==='padel').forEach(sp=>p.vstart.coco[sp]=Math.round(clampL(sp,sk(p,sp,.6))*100)/100)});
 const coAll=[...coP,...both7],zms=[],zocc={};
 for(let k=0;k<260;k++){
  const t=k/260,sp='padel',pool=coAll.filter(p=>p._skill[sp]!=null),singles=false,n=singles?2:4,anchor=pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t))),cand=r()<.8?near.slice(0,12):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const A_=grp.slice(0,n/2),B_=grp.slice(n/2),ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa,slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5);let date=isoIST(d);const len=sp==='padel'?(r()<.6?3:2):2,court=1,lane=0;
  if(date===T&&nowSlot()-len<0)date=addDays(T,-1);const hi=date===T?Math.min(NSLOT-len,nowSlot()-len):NSLOT-len,u=zocc[date+sp+lane]=zocc[date+sp+lane]||[];let st=null;
  for(let q=0;q<40&&st==null;q++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!u.some(([a,b])=>c<b&&a<c+len))st=c}if(st==null)continue;u.push([st,st+len]);
  zms.push({id:'zm_'+k,demo:true,venue:'coco',sport:sp,format:singles?'singles':'doubles',date,time:st,len,court,a:A_.map(slot),b:B_.map(slot),sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 zms.sort(byWhen);const zregs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 zms.forEach(m=>zregs(m).filter(u=>u!==m.by).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 
 const zkG=zms.filter(m=>m.date>=addDays(T,-5)&&m.format==='doubles'&&!zregs(m).includes(zPlayer.id)).pop();
 if(zkG){const i=zkG.b.findIndex(x=>x.uid!==zkG.by);zkG.b[i]={uid:zPlayer.id,level:+fmtL(zPlayer._skill[zkG.sport])};confs.splice(0,confs.length,...confs.filter(c=>!(c.match===zkG.id&&c.user===zPlayer.id)));msgs.push({id:'dz_c',to:zPlayer.id,from:zkG.by,kind:'confirm',data:{match:zkG.id,venue:'coco'},read:false,at:ago(4)})}
 const zD=zms.filter(m=>m!==zkG&&m.date>=addDays(T,-4)&&m.format==='doubles').pop();
 if(zD){const loser=(zD.winner==='a'?zD.b:zD.a).find(s=>s.uid!==zD.by);if(loser){for(let i=confs.length-1;i>=0;i--)if(confs[i].match===zD.id)confs.splice(i,1);
  const prop=zD.sets.map(s=>s.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(zD.sport==='padel'?(zD.winner==='a'?[4,6]:[6,4]):(zD.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length,c={id:'dc_coco',match:zD.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We won the last set. Please check.',at:ago(6)};confs.push(c);
  [zOwner.id,zAdmin.id,you.id].forEach((to,i)=>msgs.push({id:'dz_d'+i,to,from:loser.uid,kind:'dispute',data:{match:zD.id,conf:c.id,venue:'coco'},read:false,at:c.at}))}}
 const zAsk=coP[12];if(zAsk){const data={thread:'dth_z1',topic:'court',text:'Could we get a beginners’ padel clinic on weekday mornings?',player:zAsk.id,venue:'coco'};[zOwner.id,zAdmin.id,you.id,zAsk.id].forEach(t=>msgs.push({id:'dz_am'+t,to:t,from:zAsk.id,kind:'admin_msg',data,read:false,at:ago(7)}))}
 const zNews=[{text:'Welcome to Coco Padel on OneCourt! Book the court on Hudle as usual, then log your padel scores here to climb the Coco Padel rankings.',link:'',lt:''},{text:'Coconut water and padel morning this Sunday from 7 am. All levels welcome.',link:'',lt:''}];
 zNews.forEach((nw,k)=>[...coP,...both7].forEach(p=>msgs.push({id:'dz_cm'+k+p.id,to:p.id,from:k?zAdmin.id:zOwner.id,kind:'community',data:Object.assign({venue:'coco'},nw),read:k===0,at:ago(40-k*30)})));
 for(let k=0;k<160;k++){const a=pick(coAll),b=pick(coAll);if(a!==b&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*40))})}
 coAll.slice(4,12).forEach((p,i)=>reqs.push({id:'dz_f'+i,from:zPlayer.id,to:p.id,status:'accepted',at:ago(24*(6+i)),resp:ago(24*(5+i))}));
 ms.push(...zms);ms.sort(byWhen);all.push(...coP);
 /* Coco Padel Dot in the Park, Anjuna: Coco Padel's second club, newly opened, booked on Hudle. 1 padel court, ranked.
    Some players from the other clubs play here too. */
 const caP=[],mkCa=(name,gender,sports,lv0)=>{let un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,14),k=2;while(used.has(un))un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,12)+(k++);used.add(un);names.add(name);
  const levels={},skill={},grow={};sports.forEach(sp=>{const v=lv0&&lv0[sp]!=null?lv0[sp]:sp==='padel'?clamp(3.1+gauss()*1.1,.8,6.6):clamp(3.3+gauss()*.7,1.2,5.4);levels[sp]=lv(sp,Math.round(v*10)/10);skill[sp]=v+gauss()*.2;grow[sp]=(.08+gauss()*.25)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.4?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  const p={id:'dy_'+caP.length,username:un,name,gender,setup:true,demo:true,avatar:null,sports,hand:r()<.85?'right':'left',invites:r()<.7,times,side:pick(['left','right','either']),levels,_skill:skill,_grow:grow,home:'cocoanjuna',venues:['cocoanjuna'],created:new Date(now-(DAYS+1+Math.floor(r()*200))*864e5).toISOString()};caP.push(p);return p};
 const yOwner=mkCa('Karan Bhonsle','male',['padel'],{padel:4.6}),yAdmin=mkCa('Tara Menezes','female',['padel'],{padel:3.8}),
  yCoach=mkCa('Javier Ortega','male',['padel'],{padel:5.4}),yPlayer=mkCa('Rhea Velip','female',['padel'],{padel:3.0});
 yPlayer.friends='request';
 while(caP.length<28){const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;const x=r();mkCa(name,D_FEM.has(fn)?'female':'male',x<.4?['padel','pickleball']:['padel'])}
 
 const both8=[...ps.filter(p=>![caelan.id,surya.id,arjun.id].includes(p.id)).slice(78,82),...floP.slice(40,44),...rtP.slice(26,32),...coP.slice(26,36),...caP.slice(20,26)];
 both8.forEach(p=>{p.venues=[...new Set([...(p.venues||[p.home||'rc']),'cocoanjuna'])];p.vstart=Object.assign(p.vstart||{},{cocoanjuna:{}});p.sports.filter(sp=>sp==='padel').forEach(sp=>p.vstart.cocoanjuna[sp]=Math.round(clampL(sp,sk(p,sp,.6))*100)/100)});
 const caAll=[...caP,...both8],yms=[],yocc={};
 for(let k=0;k<120;k++){
  const t=k/120,sp='padel',pool=caAll.filter(p=>p._skill[sp]!=null),singles=false,n=singles?2:4,anchor=pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t))),cand=r()<.8?near.slice(0,12):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const A_=grp.slice(0,n/2),B_=grp.slice(n/2),ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa,slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5);let date=isoIST(d);const len=sp==='padel'?(r()<.6?3:2):2,court=1,lane=0;
  if(date===T&&nowSlot()-len<0)date=addDays(T,-1);const hi=date===T?Math.min(NSLOT-len,nowSlot()-len):NSLOT-len,u=yocc[date+sp+lane]=yocc[date+sp+lane]||[];let st=null;
  for(let q=0;q<40&&st==null;q++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!u.some(([a,b])=>c<b&&a<c+len))st=c}if(st==null)continue;u.push([st,st+len]);
  yms.push({id:'ym_'+k,demo:true,venue:'cocoanjuna',sport:sp,format:singles?'singles':'doubles',date,time:st,len,court,a:A_.map(slot),b:B_.map(slot),sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 yms.sort(byWhen);const yregs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 yms.forEach(m=>yregs(m).filter(u=>u!==m.by).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 
 const ykG=yms.filter(m=>m.date>=addDays(T,-5)&&m.format==='doubles'&&!yregs(m).includes(yPlayer.id)).pop();
 if(ykG){const i=ykG.b.findIndex(x=>x.uid!==ykG.by);ykG.b[i]={uid:yPlayer.id,level:+fmtL(yPlayer._skill[ykG.sport])};confs.splice(0,confs.length,...confs.filter(c=>!(c.match===ykG.id&&c.user===yPlayer.id)));msgs.push({id:'dy_c',to:yPlayer.id,from:ykG.by,kind:'confirm',data:{match:ykG.id,venue:'cocoanjuna'},read:false,at:ago(4)})}
 const yD=yms.filter(m=>m!==ykG&&m.date>=addDays(T,-4)&&m.format==='doubles').pop();
 if(yD){const loser=(yD.winner==='a'?yD.b:yD.a).find(s=>s.uid!==yD.by);if(loser){for(let i=confs.length-1;i>=0;i--)if(confs[i].match===yD.id)confs.splice(i,1);
  const prop=yD.sets.map(s=>s.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(yD.sport==='padel'?(yD.winner==='a'?[4,6]:[6,4]):(yD.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length,c={id:'dc_cocoa',match:yD.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We won the last set. Please check.',at:ago(6)};confs.push(c);
  [yOwner.id,yAdmin.id,you.id].forEach((to,i)=>msgs.push({id:'dy_d'+i,to,from:loser.uid,kind:'dispute',data:{match:yD.id,conf:c.id,venue:'cocoanjuna'},read:false,at:c.at}))}}
 const yAsk=caP[12];if(yAsk){const data={thread:'dth_y1',topic:'court',text:'Will there be lights for evening games once the park opens fully?',player:yAsk.id,venue:'cocoanjuna'};[yOwner.id,yAdmin.id,you.id,yAsk.id].forEach(t=>msgs.push({id:'dy_am'+t,to:t,from:yAsk.id,kind:'admin_msg',data,read:false,at:ago(7)}))}
 const yNews=[{text:'Welcome to Coco Padel at Dot in the Park, our new Anjuna court! Book on Hudle as usual, then log your padel scores here to climb the Anjuna rankings.',link:'',lt:''},{text:'Opening week: free coaching taster on Saturday from 8 am. All levels welcome.',link:'',lt:''}];
 yNews.forEach((nw,k)=>[...caP,...both8].forEach(p=>msgs.push({id:'dy_cm'+k+p.id,to:p.id,from:k?yAdmin.id:yOwner.id,kind:'community',data:Object.assign({venue:'cocoanjuna'},nw),read:k===0,at:ago(40-k*30)})));
 for(let k=0;k<160;k++){const a=pick(caAll),b=pick(caAll);if(a!==b&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*40))})}
 caAll.slice(4,12).forEach((p,i)=>reqs.push({id:'dy_f'+i,from:yPlayer.id,to:p.id,status:'accepted',at:ago(24*(6+i)),resp:ago(24*(5+i))}));
 ms.push(...yms);ms.sort(byWhen);all.push(...caP);
 /* Padelinho (Anjuna), by Castelinho: newly opened, booked on Hudle. 1 padel court, ranked.
    Some players from the other clubs play here too. */
 const pdP=[],mkPd=(name,gender,sports,lv0)=>{let un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,14),k=2;while(used.has(un))un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,12)+(k++);used.add(un);names.add(name);
  const levels={},skill={},grow={};sports.forEach(sp=>{const v=lv0&&lv0[sp]!=null?lv0[sp]:sp==='padel'?clamp(3.1+gauss()*1.1,.8,6.6):clamp(3.3+gauss()*.7,1.2,5.4);levels[sp]=lv(sp,Math.round(v*10)/10);skill[sp]=v+gauss()*.2;grow[sp]=(.08+gauss()*.25)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.4?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  const p={id:'dp_'+pdP.length,username:un,name,gender,setup:true,demo:true,avatar:null,sports,hand:r()<.85?'right':'left',invites:r()<.7,times,side:pick(['left','right','either']),levels,_skill:skill,_grow:grow,home:'padelinho',venues:['padelinho'],created:new Date(now-(DAYS+1+Math.floor(r()*200))*864e5).toISOString()};pdP.push(p);return p};
 const pOwner=mkPd('Andre Castelino','male',['padel'],{padel:4.7}),pAdmin=mkPd('Nadia Pereira','female',['padel'],{padel:3.9}),
  pCoach=mkPd('Marco Silva','male',['padel'],{padel:5.5}),pPlayer=mkPd('Aisha Shaikh','female',['padel'],{padel:3.1});
 pPlayer.friends='request';
 while(pdP.length<28){const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;const x=r();mkPd(name,D_FEM.has(fn)?'female':'male',x<.4?['padel','pickleball']:['padel'])}
 
 const both9=[...ps.filter(p=>![caelan.id,surya.id,arjun.id].includes(p.id)).slice(82,86),...floP.slice(44,48),...rtP.slice(32,38),...caP.slice(10,16),...pdP.slice(16,22)];
 both9.forEach(p=>{p.venues=[...new Set([...(p.venues||[p.home||'rc']),'padelinho'])];p.vstart=Object.assign(p.vstart||{},{padelinho:{}});p.sports.filter(sp=>sp==='padel').forEach(sp=>p.vstart.padelinho[sp]=Math.round(clampL(sp,sk(p,sp,.6))*100)/100)});
 const pdAll=[...pdP,...both9],pms=[],pocc={};
 for(let k=0;k<120;k++){
  const t=k/120,sp='padel',pool=pdAll.filter(p=>p._skill[sp]!=null),singles=false,n=singles?2:4,anchor=pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t))),cand=r()<.8?near.slice(0,12):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const A_=grp.slice(0,n/2),B_=grp.slice(n/2),ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa,slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5);let date=isoIST(d);const len=sp==='padel'?(r()<.6?3:2):2,court=1,lane=0;
  if(date===T&&nowSlot()-len<0)date=addDays(T,-1);const hi=date===T?Math.min(NSLOT-len,nowSlot()-len):NSLOT-len,u=pocc[date+sp+lane]=pocc[date+sp+lane]||[];let st=null;
  for(let q=0;q<40&&st==null;q++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!u.some(([a,b])=>c<b&&a<c+len))st=c}if(st==null)continue;u.push([st,st+len]);
  pms.push({id:'pm_'+k,demo:true,venue:'padelinho',sport:sp,format:singles?'singles':'doubles',date,time:st,len,court,a:A_.map(slot),b:B_.map(slot),sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 pms.sort(byWhen);const pregs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 pms.forEach(m=>pregs(m).filter(u=>u!==m.by).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 
 const pkG=pms.filter(m=>m.date>=addDays(T,-5)&&m.format==='doubles'&&!pregs(m).includes(pPlayer.id)).pop();
 if(pkG){const i=pkG.b.findIndex(x=>x.uid!==pkG.by);pkG.b[i]={uid:pPlayer.id,level:+fmtL(pPlayer._skill[pkG.sport])};confs.splice(0,confs.length,...confs.filter(c=>!(c.match===pkG.id&&c.user===pPlayer.id)));msgs.push({id:'dp_c',to:pPlayer.id,from:pkG.by,kind:'confirm',data:{match:pkG.id,venue:'padelinho'},read:false,at:ago(4)})}
 const pD=pms.filter(m=>m!==pkG&&m.date>=addDays(T,-4)&&m.format==='doubles').pop();
 if(pD){const loser=(pD.winner==='a'?pD.b:pD.a).find(s=>s.uid!==pD.by);if(loser){for(let i=confs.length-1;i>=0;i--)if(confs[i].match===pD.id)confs.splice(i,1);
  const prop=pD.sets.map(s=>s.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(pD.sport==='padel'?(pD.winner==='a'?[4,6]:[6,4]):(pD.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length,c={id:'dc_pdl',match:pD.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We won the last set. Please check.',at:ago(6)};confs.push(c);
  [pOwner.id,pAdmin.id,you.id].forEach((to,i)=>msgs.push({id:'dp_d'+i,to,from:loser.uid,kind:'dispute',data:{match:pD.id,conf:c.id,venue:'padelinho'},read:false,at:c.at}))}}
 const pAsk=pdP[12];if(pAsk){const data={thread:'dth_p1',topic:'court',text:'Could guests at Castelinho’s get early morning court slots?',player:pAsk.id,venue:'padelinho'};[pOwner.id,pAdmin.id,you.id,pAsk.id].forEach(t=>msgs.push({id:'dp_am'+t,to:t,from:pAsk.id,kind:'admin_msg',data,read:false,at:ago(7)}))}
 const pNews=[{text:'Welcome to Padelinho by Castelinho on OneCourt! Book the court on Hudle as usual, then log your padel scores here to climb the Padelinho rankings.',link:'',lt:''},{text:'Opening mixer this Friday from 5 pm, rackets and balls on us. All levels welcome.',link:'',lt:''}];
 pNews.forEach((nw,k)=>[...pdP,...both9].forEach(p=>msgs.push({id:'dp_cm'+k+p.id,to:p.id,from:k?pAdmin.id:pOwner.id,kind:'community',data:Object.assign({venue:'padelinho'},nw),read:k===0,at:ago(40-k*30)})));
 for(let k=0;k<160;k++){const a=pick(pdAll),b=pick(pdAll);if(a!==b&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*40))})}
 pdAll.slice(4,12).forEach((p,i)=>reqs.push({id:'dp_f'+i,from:pPlayer.id,to:p.id,status:'accepted',at:ago(24*(6+i)),resp:ago(24*(5+i))}));
 ms.push(...pms);ms.sort(byWhen);all.push(...pdP);
 /* CoPlay @ Assagao House: CoPlay's second club, booked on Hudle. 1 padel and 2 pickleball courts, both sports ranked.
    Some players from the other clubs (CoPlay Panjim most of all) play here too. */
 const asP=[],mkAs=(name,gender,sports,lv0)=>{let un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,14),k=2;while(used.has(un))un=name.toLowerCase().replace(/[^a-z]+/g,'.').slice(0,12)+(k++);used.add(un);names.add(name);
  const levels={},skill={},grow={};sports.forEach(sp=>{const v=lv0&&lv0[sp]!=null?lv0[sp]:sp==='padel'?clamp(3.1+gauss()*1.1,.8,6.6):clamp(3.3+gauss()*.7,1.2,5.4);levels[sp]=lv(sp,Math.round(v*10)/10);skill[sp]=v+gauss()*.2;grow[sp]=(.08+gauss()*.25)*(sp==='padel'?1:.6)});
  const nt=1+Math.floor(r()*3),times=[];while(times.length<nt){const t=r()<.4?'evening':pick(TIMES)[0];if(!times.includes(t))times.push(t)}
  const p={id:'dh_'+asP.length,username:un,name,gender,setup:true,demo:true,avatar:null,sports,hand:r()<.85?'right':'left',invites:r()<.7,times,side:pick(['left','right','either']),levels,_skill:skill,_grow:grow,home:'assagao',venues:['assagao'],created:new Date(now-(DAYS+1+Math.floor(r()*200))*864e5).toISOString()};asP.push(p);return p};
 const hOwner=mkAs('Vikram Sawant','male',['padel','pickleball'],{padel:4.6,pickleball:5.0}),hAdmin=mkAs('Leah DSouza','female',['padel','pickleball'],{padel:3.9,pickleball:4.6}),
  hCoach=mkAs('Aditya Gaonkar','male',['pickleball','padel'],{pickleball:5.2,padel:4.4}),hPlayer=mkAs('Meghna Parab','female',['padel','pickleball'],{padel:3.1,pickleball:3.7});
 hPlayer.friends='request';
 while(asP.length<40){const fn=pick(D_FN),ln=pick(D_LN),name=fn+' '+ln;if(names.has(name))continue;const x=r();mkAs(name,D_FEM.has(fn)?'female':'male',x<.55?['padel','pickleball']:x<.75?['padel']:['pickleball'])}
 
 const both5=[...ps.filter(p=>![caelan.id,surya.id,arjun.id].includes(p.id)).slice(58,66),...sunP.slice(36,42),...cpP.slice(26,36),...asP.slice(20,26)];
 both5.forEach(p=>{p.venues=[...new Set([...(p.venues||[p.home||'rc']),'assagao'])];p.vstart=Object.assign(p.vstart||{},{assagao:{}});p.sports.forEach(sp=>p.vstart.assagao[sp]=Math.round(clampL(sp,sk(p,sp,.6))*100)/100)});
 const asAll=[...asP,...both5],hms=[],hocc={};
 for(let k=0;k<260;k++){
  const t=k/260,sp=r()<.45?'padel':'pickleball',pool=asAll.filter(p=>p._skill[sp]!=null),singles=sp==='pickleball'&&r()<.15,n=singles?2:4,anchor=pick(pool);
  const near=pool.filter(p=>p!==anchor).sort((a,b)=>Math.abs(sk(a,sp,t)-sk(anchor,sp,t))-Math.abs(sk(b,sp,t)-sk(anchor,sp,t))),cand=r()<.8?near.slice(0,12):near;if(cand.length<n-1)continue;
  const grp=[anchor];while(grp.length<n){const c=pick(cand);if(!grp.includes(c))grp.push(c)}
  const A_=grp.slice(0,n/2),B_=grp.slice(n/2),ta=avg(A_.map(p=>sk(p,sp,t))),tb=avg(B_.map(p=>sk(p,sp,t))),pa=1/(1+Math.pow(10,(tb-ta)/SPORTS[sp].scale)),aw=r()<pa,slot=p=>({uid:p.id,level:+fmtL(sk(p,sp,t))});
  const d=new Date(now-(1-t)*DAYS*864e5-(2+Math.floor(r()*8))*36e5);let date=isoIST(d);const len=sp==='padel'?(r()<.6?3:2):2,court=sp==='pickleball'?1+Math.floor(r()*2):1,lane=court;
  if(date===T&&nowSlot()-len<0)date=addDays(T,-1);const hi=date===T?Math.min(NSLOT-len,nowSlot()-len):NSLOT-len,u=hocc[date+sp+lane]=hocc[date+sp+lane]||[];let st=null;
  for(let q=0;q<40&&st==null;q++){const c=clamp(r()<.6?20+Math.floor(r()*14):Math.floor(r()*(hi+1)),0,hi);if(!u.some(([a,b])=>c<b&&a<c+len))st=c}if(st==null)continue;u.push([st,st+len]);
  hms.push({id:'hm_'+k,demo:true,venue:'assagao',sport:sp,format:singles?'singles':'doubles',date,time:st,len,court,a:A_.map(slot),b:B_.map(slot),sets:setsFor(sp,aw,1-Math.abs(pa-.5)*2),winner:aw?'a':'b',by:anchor.id,at:d.toISOString()});
 }
 hms.sort(byWhen);const hregs=m=>[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);
 hms.forEach(m=>hregs(m).filter(u=>u!==m.by).forEach(u=>{if(m.date<cut||r()<.5)confs.push({id:'dc_'+m.id+u,match:m.id,user:u,verdict:'ok',at:m.at})}));
 
 const hkG=hms.filter(m=>m.date>=addDays(T,-5)&&m.format==='doubles'&&!hregs(m).includes(hPlayer.id)).pop();
 if(hkG){const i=hkG.b.findIndex(x=>x.uid!==hkG.by);hkG.b[i]={uid:hPlayer.id,level:+fmtL(hPlayer._skill[hkG.sport])};confs.splice(0,confs.length,...confs.filter(c=>!(c.match===hkG.id&&c.user===hPlayer.id)));msgs.push({id:'dh_c',to:hPlayer.id,from:hkG.by,kind:'confirm',data:{match:hkG.id,venue:'assagao'},read:false,at:ago(4)})}
 const hD=hms.filter(m=>m!==hkG&&m.date>=addDays(T,-4)&&m.format==='doubles').pop();
 if(hD){const loser=(hD.winner==='a'?hD.b:hD.a).find(s=>s.uid!==hD.by);if(loser){for(let i=confs.length-1;i>=0;i--)if(confs[i].match===hD.id)confs.splice(i,1);
  const prop=hD.sets.map(s=>s.slice()),j=prop.length-1;prop[j]=[prop[j][1],prop[j][0]];if(prop.length===2)prop.push(hD.sport==='padel'?(hD.winner==='a'?[4,6]:[6,4]):(hD.winner==='a'?[7,11]:[11,7]));
  const wa=prop.filter(s=>s[0]>s[1]).length,c={id:'dc_ass',match:hD.id,user:loser.uid,verdict:'dispute',sets:prop,winner:wa*2>prop.length?'a':'b',note:'We won the last set. Please check.',at:ago(6)};confs.push(c);
  [hOwner.id,hAdmin.id,you.id].forEach((to,i)=>msgs.push({id:'dh_d'+i,to,from:loser.uid,kind:'dispute',data:{match:hD.id,conf:c.id,venue:'assagao'},read:false,at:c.at}))}}
 const hAsk=asP[12];if(hAsk){const data={thread:'dth_h1',topic:'court',text:'Could one of the pickleball courts be kept for open play on Sunday mornings?',player:hAsk.id,venue:'assagao'};[hOwner.id,hAdmin.id,you.id,hAsk.id].forEach(t=>msgs.push({id:'dh_am'+t,to:t,from:hAsk.id,kind:'admin_msg',data,read:false,at:ago(7)}))}
 const hNews=[{text:'Welcome to CoPlay @ Assagao House on OneCourt! Book your court on Hudle as usual, then log your padel and pickleball scores here to climb the Assagao rankings.',link:'',lt:''},{text:'Pickleball round robin on both courts this Sunday from 8 am, with padel open play after. All levels welcome.',link:'',lt:''}];
 hNews.forEach((nw,k)=>[...asP,...both5].forEach(p=>msgs.push({id:'dh_cm'+k+p.id,to:p.id,from:k?hAdmin.id:hOwner.id,kind:'community',data:Object.assign({venue:'assagao'},nw),read:k===0,at:ago(40-k*30)})));
 for(let k=0;k<160;k++){const a=pick(asAll),b=pick(asAll);if(a!==b&&!follows.some(f=>f.follower===a.id&&f.followee===b.id))follows.push({follower:a.id,followee:b.id,at:ago(24*Math.floor(r()*40))})}
 asAll.slice(4,12).forEach((p,i)=>reqs.push({id:'dh_f'+i,from:hPlayer.id,to:p.id,status:'accepted',at:ago(24*(6+i)),resp:ago(24*(5+i))}));
 ms.push(...hms);ms.sort(byWhen);all.push(...asP);
 const clean=p=>{const q=Object.assign({},p);delete q._skill;delete q._grow;return q};
 /* level feedback from people who played them: leans the way their real skill differs from their level */
 const votes=[];ms.slice(-260).forEach((m,k)=>{const rg=regs(m);if(rg.length<2||r()<.45)return;const voter=rg[0];rg.slice(1).forEach(t=>{const P=all.find(x=>x.id===t);if(!P||!P._skill)return;
  const gap=P._skill[m.sport]-P.levels[m.sport].start,x=r()+gap*.8,vote=x>.85?'higher':x<.2?'lower':'right';votes.push({id:'dv_'+k+'_'+t,voter,target:t,sport:m.sport,match:m.id,vote,at:m.at})})});
 /* club news, and messages with the admins */
 const news=[{text:'Floodlights on court 1 are fixed, so evening padel is back on. See you on court!',link:'',lt:''},{text:'Club social and mixed doubles Americano this Saturday from 5 pm. Bring a friend, all levels welcome.',link:'https://www.instagram.com/racquetculture.goa/',lt:'See the photos from last time'}];
 news.forEach((n,k)=>[you.id,arjun.id].forEach(t=>msgs.push({id:'dg_cm'+k+t,to:t,from:k?caelan.id:surya.id,kind:'community',data:n,read:k===0,at:ago(30+k*-22)})));
 const asker=pool2[20];if(asker){const data={thread:'dth_1',topic:'court',text:'The net on pickleball court 1 looks a bit low on one side.',player:asker.id};[you.id,caelan.id,surya.id].forEach(t=>msgs.push({id:'dg_am'+t,to:t,from:asker.id,kind:'admin_msg',data,read:false,at:ago(3)}))}
 {const q={thread:'dth_2',topic:'booking',text:'Can I pay by UPI at the court?',player:arjun.id},r2={thread:'dth_2',topic:'booking',text:'Yes, UPI and cash are both fine at the desk. See you there!',player:arjun.id};
  msgs.push({id:'dg_aq',to:arjun.id,from:arjun.id,kind:'admin_msg',data:q,read:true,at:ago(28)},{id:'dg_aqy',to:you.id,from:arjun.id,kind:'admin_msg',data:q,read:true,at:ago(28)},
   {id:'dg_ar',to:arjun.id,from:caelan.id,kind:'admin_reply',data:r2,read:false,at:ago(26)},{id:'dg_ary',to:you.id,from:caelan.id,kind:'admin_reply',data:r2,read:true,at:ago(26)})}
 /* phone numbers: most only for admins, some for friends or everyone */
 const phones={};all.forEach((p,k)=>{let n='9';for(let i=0;i<9;i++)n+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+n,vis:k%5===0?'all':k%3===0?'friends':'admins'}});
 /* reliability: a few confirmed late and no-show reports, and one new report waiting for an admin */
 const conduct=[];pool2.slice(12,17).forEach((p,k)=>{const sp=p.sports[0];conduct.push({id:'dc_'+k,user:p.id,kind:k%3===2?'noshow':'late',sport:sp,report:'drp_'+k,by:caelan.id,at:ago(24*(3+k*4))})});
 const lateOne=pool2[12];if(lateOne)conduct.push({id:'dc_x',user:lateOne.id,kind:'late',sport:lateOne.sports[0],report:'drp_x',by:surya.id,at:ago(24*9)});
 const rg=yourGames.length?yourGames[yourGames.length-1]:null,rt=rg&&regs(rg).find(u=>u!==you.id&&u!==arjun.id&&u!==caelan.id&&u!==surya.id);
 if(rg&&rt){const rp=regs(rg).find(u=>u!==you.id&&u!==rt)||caelan.id;msgs.push({id:'dg_rep',to:you.id,from:rp,kind:'report',data:{rep:'drp_new',target:rt,k:'late',sport:rg.sport,match:rg.id,date:rg.date,note:'Turned up 20 minutes after the start'},read:false,at:ago(5)})}
 sunP.forEach((p,k)=>{let nn='9';for(let i=0;i<9;i++)nn+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+nn,vis:k%4===0?'all':'admins'}});
 Object.keys(coaches).forEach(k=>{if(!k.includes('@')){coaches[k+'@rc']=coaches[k];delete coaches[k]}});coaches[sCoach.id+'@sunday']={sports:['padel'],auto:true};coaches[fCoach.id+'@floresta']={sports:['padel'],auto:true};coaches[aCoach.id+'@aer']={sports:['padel'],auto:true};coaches[cCoach.id+'@coplay']={sports:['padel'],auto:true};coaches[hCoach.id+'@assagao']={sports:['pickleball','padel'],auto:true};coaches[rCoach.id+'@roundtwo']={sports:['padel'],auto:true};coaches[zCoach.id+'@coco']={sports:['padel'],auto:true};coaches[yCoach.id+'@cocoanjuna']={sports:['padel'],auto:true};coaches[pCoach.id+'@padelinho']={sports:['padel'],auto:true};pdP.forEach((p,k)=>{let nn='9';for(let i=0;i<9;i++)nn+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+nn,vis:k%4===0?'all':'admins'}});caP.forEach((p,k)=>{let nn='7';for(let i=0;i<9;i++)nn+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+nn,vis:k%4===0?'all':'admins'}});coP.forEach((p,k)=>{let nn='7';for(let i=0;i<9;i++)nn+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+nn,vis:k%4===0?'all':'admins'}});rtP.forEach((p,k)=>{let nn='8';for(let i=0;i<9;i++)nn+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+nn,vis:k%4===0?'all':'admins'}});asP.forEach((p,k)=>{let nn='9';for(let i=0;i<9;i++)nn+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+nn,vis:k%4===0?'all':'admins'}});cpP.forEach((p,k)=>{let nn='6';for(let i=0;i<9;i++)nn+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+nn,vis:k%4===0?'all':'admins'}});aerP.forEach((p,k)=>{let nn='7';for(let i=0;i<9;i++)nn+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+nn,vis:k%4===0?'all':'admins'}});floP.forEach((p,k)=>{let nn='8';for(let i=0;i<9;i++)nn+=Math.floor(r()*10);phones[p.id]={phone:'+91 '+nn,vis:k%4===0?'all':'admins'}});
 /* Pro is invite only: the strong demo players were invited into Pro by each club's owner when the demo starts */
 const proBy={rc:surya.id,sunday:sOwner.id,floresta:fOwner.id,aer:aOwner.id,coplay:cOwner.id,assagao:hOwner.id,roundtwo:rOwner.id,coco:zOwner.id,cocoanjuna:yOwner.id,padelinho:pOwner.id},proAt=new Date(now-DAYS*864e5).toISOString();
 all.forEach(p=>SP_KEYS.forEach(sp=>{const L=p.levels&&p.levels[sp];if(!L||p.id===you.id)return;const k=Math.max(+L.start||0,(p._skill&&p._skill[sp])||0);if(k<SPORTS[sp].cut[1])return;p.pro=p.pro||{};VENUES.forEach(v=>{p.pro[v.id]=p.pro[v.id]||{};p.pro[v.id][sp]={by:proBy[v.id]||surya.id,at:proAt}})}));
 return{profiles:all.map(clean),matches:ms,bookings:bks,cfg,conduct,phones,coaches,confs,admins:[...(['dev','owner','admin'].includes(rank)?[you.id+'@rc']:[]),caelan.id+'@rc',surya.id+'@rc',sOwner.id+'@sunday',sAdmin.id+'@sunday',fOwner.id+'@floresta',fAdmin.id+'@floresta',aOwner.id+'@aer',aAdmin.id+'@aer',cOwner.id+'@coplay',cAdmin.id+'@coplay',hOwner.id+'@assagao',hAdmin.id+'@assagao',rOwner.id+'@roundtwo',rAdmin.id+'@roundtwo',zOwner.id+'@coco',zAdmin.id+'@coco',yOwner.id+'@cocoanjuna',yAdmin.id+'@cocoanjuna',pOwner.id+'@padelinho',pAdmin.id+'@padelinho'],devs:rank==='dev'?[you.id]:[],owners:[...(rank==='owner'?[you.id+'@rc']:[]),surya.id+'@rc',sOwner.id+'@sunday',fOwner.id+'@floresta',aOwner.id+'@aer',cOwner.id+'@coplay',hOwner.id+'@assagao',rOwner.id+'@roundtwo',zOwner.id+'@coco',yOwner.id+'@cocoanjuna',pOwner.id+'@padelinho'],demoAcc:[caelan.id],msgs,follows,reqs,votes,you:you.id,staff:{rc:{player:arjun.id,admin:caelan.id,owner:surya.id,coach:coach1.id},sunday:{player:sPlayer.id,admin:sAdmin.id,owner:sOwner.id,coach:sCoach.id},floresta:{player:fPlayer.id,admin:fAdmin.id,owner:fOwner.id,coach:fCoach.id},aer:{player:aPlayer.id,admin:aAdmin.id,owner:aOwner.id,coach:aCoach.id},coplay:{player:cPlayer.id,admin:cAdmin.id,owner:cOwner.id,coach:cCoach.id},assagao:{player:hPlayer.id,admin:hAdmin.id,owner:hOwner.id,coach:hCoach.id},roundtwo:{player:rPlayer.id,admin:rAdmin.id,owner:rOwner.id,coach:rCoach.id},coco:{player:zPlayer.id,admin:zAdmin.id,owner:zOwner.id,coach:zCoach.id},cocoanjuna:{player:yPlayer.id,admin:yAdmin.id,owner:yOwner.id,coach:yCoach.id},padelinho:{player:pPlayer.id,admin:pAdmin.id,owner:pOwner.id,coach:pCoach.id}}};
}
let demoPrev=null;
/* Demo: switch between you (admin) and Arjun (an ordinary player) to see both sides */
const DEMO_AS=[['dev','Developer'],['owner','Owner'],['admin','Admin'],['coach','Coach'],['player','Player']];
/* Demo accounts go up to the person's real role: players see the player view, coaches up to coach, admins up to admin, the developer all four */
const DEMO_RANK={player:0,coach:1,admin:2,owner:3,dev:4};
const demoRank=()=>demoPrev&&demoPrev.rank||'player',demoOk=r=>DEMO_RANK[r]<=DEMO_RANK[demoRank()],demoAs=()=>DEMO_AS.filter(([k])=>demoOk(k));
const demoId=r=>{const d=Demo.d;return r==='dev'?d.you:(d.staff[VID]||d.staff.rc)[r]||d.staff.rc[r]};
const demoRole=()=>{const d=Demo.d;if(!d)return'dev';if(S.uid==='d_new')return'new';for(const o of Object.values(d.staff))for(const [k,id] of Object.entries(o))if(id===S.uid)return k;return'dev'};
async function demoSwitch(to){const d=Demo.d;if(!d||!demoOk(to))return;const next=demoId(to);if(next===S.uid)return;S.uid=next;await reload();const moved=await ensureVenue();closeSheet(true);A=null;Object.assign(view,{tab:'home',rs:null,rt:null,ib:'all'});
 window.scrollTo(0,0);render();celebrate('Now viewing as '+(to==='admin'?'an admin':to==='owner'?'an owner':to==='dev'?'the developer':'a '+to));if(moved)toast(`${first(me())} hasn’t joined that club yet, so you’re back at ${VEN().name}.`,3600)}
/* Pick how to see the demo: as an ordinary player or as an admin */
function demoChooser(){
 const info={player:'Book courts, add scores, confirm games, climb the rankings',coach:'Everything a player does, plus blocking court time for coaching',admin:'Confirms bookings, reviews scores and reports, posts club news, switches players and coaches',owner:'Everything an admin does, plus giving or removing admin access',dev:'Everything an owner does, plus making owners and giving or removing admin access'};
 const rank=topRole(S.uid),ok=k=>DEMO_RANK[k]<=DEMO_RANK[rank],list=['player','coach','admin','owner','dev'].filter(ok);
 openSheet(`<h2>Try the demo</h2><p class="muted small">A made-up club of 100 players with games and messages. Nothing is saved and real accounts are never touched.${list.length>1?' You can switch between the demo accounts at any time in Settings, under Demo mode.':''}</p>
  <div class="demopick">${list.map((k,i)=>`<button type="button" class="btn ${i?'ghost':'brand'} wide" data-act="demoGo" data-v="${k}"><b>${lbl(DEMO_AS,k)}</b><span>${info[k]}</span></button>`).join('')}</div>`)}
async function startDemo(role){
 const rank=me()?topRole(S.uid):'player';if(DEMO_RANK[role]>DEMO_RANK[rank])role=rank;
 const real=me(),you=real?JSON.parse(JSON.stringify(real)):{id:'d_you',username:'marc.dev',name:'Marc',setup:true,created:new Date(Date.now()-260*864e5).toISOString(),avatar:null,sports:['padel','pickleball'],hand:'right',invites:true,times:['evening'],side:'either',levels:{padel:{start:3.2,band:'intermediate'},pickleball:{start:3.1,band:'intermediate'}}};
 demoPrev={store:Store,uid:S.uid,you:JSON.stringify(you),rank};closeSheet(true);S.needSql=false;
 Demo.d=buildDemo(you,rank);Store=Demo;S.uid=demoId(role);await reload();await ensureVenue();A=null;Object.assign(view,{tab:'home',rs:null,rt:null});
 window.scrollTo(0,0);
 /* signed in once: now pick a court to begin */
 showPicker();
}
/* Demo: walk through the first-time sign-in as a brand-new player (made up, nothing saved) */
async function demoNewPlayer(){const d=Demo.d;if(!d)return;tick();
 d.profiles=d.profiles.filter(p=>p.id!=='d_new');S.uid=null;S.email='';
 $('welcome').hidden=true;showAuth('up')}
async function demoAuthDone(name,user,email){const d=Demo.d,base=(email||'').split('@')[0].replace(/[^A-Za-z0-9._-]/g,'')||'new.player';
 let un=user||base,k=2;while(d.profiles.some(p=>p.username.toLowerCase()===un.toLowerCase()))un=(user||base)+(k++);
 d.profiles=d.profiles.filter(p=>p.id!=='d_new');
 d.profiles.push({id:'d_new',username:un,name:name||base.replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),setup:false,demo:true,avatar:null,created:new Date().toISOString(),venues:[],nohome:true});
 S.uid='d_new';S.email=email||'';busy(false);await reload();applyMP();startWiz('setup')}
function demoResetAsk(){openSheet(`<h2>Reset the demo?</h2><p class="muted">Every score, booking, message and change you made in the demo goes back to how it started, for every demo account. Your real account is not touched.</p>
 <button class="btn danger wide" style="margin-top:16px" data-act="demoResetYes">Yes, reset the demo</button><button class="btn ghost wide" style="margin-top:10px" data-act="closeSheet">Cancel</button>`)}
async function demoReset(){if(!demoPrev||!Demo.d)return;const role=demoRole();Demo.d=buildDemo(JSON.parse(demoPrev.you),demoPrev.rank);S.uid=demoId(role);closeSheet(true);await reload();await ensureVenue();A=null;Object.assign(view,{tab:'home',rs:null,rt:null,ib:'all',mg:'all'});window.scrollTo(0,0);render();celebrate('Demo reset')}
async function exitDemo(){
 if(PREVIEW){location.href='../';return}
 const pv=demoPrev;if(!pv)return;demoPrev=null;Store=pv.store;Demo.d=null;A=null;Object.assign(view,{tab:'home',rs:null,rt:null});closeSheet(true);
 if(pv.uid){S.uid=pv.uid;try{await reload()}catch(e){toast('Could not load the club data. Check your connection.')}window.scrollTo(0,0);showApp();toast('Back to the real club')}
 else{S.uid=null;Object.assign(S,{profiles:[],matches:[],bookings:[],confs:[],admins:[],msgs:[],follows:[],reqs:[],votes:[],conduct:[],phones:{},coaches:{},devs:[],owners:[],demoAcc:[]});rate();showAuth()}
}

/* ---------- Switching clubs ----------
   One account works at every club. Players sign in once to OneCourt; opening any club after that goes straight
   to its loading screen and in, with no more sign-ins. At a club they're new to, they're yet to play. */
async function ensureVenue(){const p=me();if(p&&p.setup&&!inVenue(p)){VID=firstClub();ls.set('rc_venue',VID);applyVenue();await reload();return true}return false}
async function setVenue(vid,tab){
 VID=vid;ls.set('rc_venue',vid);applyVenue();closeSheet(true);A=null;view.bk=null;Object.assign(view,{tab:VIEWS[tab]?tab:'home',rs:null,rt:null,ib:'all',mg:'all'});
 await reload();window.scrollTo(0,0);splash(VEN().name,'Welcome to',VEN());render();
}
function switchVenue(vid){if(!VENUES.some(v=>v.id===vid))return;if(vid===VID)return go('home');tick();
 if(!isMember(S.uid,vid))return venueSignIn(vid);setVenue(vid,view.tab)}
/* Join a club: their level there starts at the bottom of the level (band) they're in now, per sport. Pro is invite only per club,
   so a Pro player without an invite at the new club starts at the bottom of Intermediate there. */
async function joinVenue(vid,quiet){const p=me();if(!p)return false;const vs={};(p.sports||[]).forEach(sp=>{const e=S.R[sp]&&S.R[sp][S.uid];if(e){const t=tierOf(sp,e.r),b=t==='pro'&&!proOf(S.uid,sp,vid)?'intermediate':t;vs[sp]=SPORTS[sp].bands[b][0]}});
 const fresh=p.nohome&&!p.home,np=Object.assign({},p,{venues:fresh?[vid]:[...new Set([...venuesOf(p),vid])],home:fresh?vid:p.home,vstart:Object.assign({},p.vstart||{},{[vid]:Object.assign(vs,(p.vstart||{})[vid]||{})})});
 if(fresh)delete np.nohome;try{await Store.saveProfile(np)}catch(e){if(!quiet)toast('Could not join. Check your connection and try again.');return false}
 upsert(S.profiles,np);return true}
/* Opening a club for the first time: no sign-in. Join it, show its loading screen and go straight in, yet to play there */
async function venueSignIn(vid){closeSheet(true);if(!await joinVenue(vid))return;await setVenue(vid,view.tab);newHere()}
function newHere(){toast(`Welcome to ${VEN().name}! You’re yet to play here. Log your first game to get ranked.`,4200)}

/* ---------- App state ---------- */
const S={uid:null,cfg:{},conduct:[],phones:{},coaches:{},devs:[],owners:[],profiles:[],matches:[],bookings:[],confs:[],admins:[],msgs:[],follows:[],reqs:[],votes:[],R:{padel:{},pickleball:{}},D:{},ST:{}};
let view={tab:'home',rs:null,rt:null,pf:{q:'',sport:'',inv:false,time:''},ib:'all'};
const me=()=>S.profiles.find(p=>p.id===S.uid)||null;
const prof=id=>S.profiles.find(p=>p.id===id)||null;
/* Clubs: one account works at every club. Everyone starts as a player; roles are given per club.
   Someone can be owner, admin or coach at one club and a normal player at another, until someone with power there promotes them.
   Roles are stored as "userId@club" keys. The developer keeps every power at every club. */
const firstClub=id=>{const p=prof(id||S.uid);return p&&p.home||'rc'};
const venuesOf=p=>p?[...new Set([...(p.nohome&&!p.home?[]:[p.home||'rc']),...(p.venues||[])])].filter(v=>VENUES.some(x=>x.id===v)):[];
const inVenue=(p,vid=VID)=>venuesOf(p).includes(vid);
const isMember=(id,vid=VID)=>inVenue(prof(id||S.uid),vid);
const rk=(id,v=VID)=>(id||S.uid)+'@'+v;
const isDev=id=>(S.devs||[]).includes(id||S.uid);
const isAdmin=(id,v=VID)=>isDev(id)||S.admins.includes(rk(id,v));
const isOwner=(id,v=VID)=>!isDev(id)&&(S.owners||[]).includes(rk(id,v));
const coachOf=(id,v=VID)=>S.coaches[rk(id,v)]||null,isCoach=(id,v)=>!!coachOf(id,v),canBlock=()=>isAdmin()||isCoach();
const canAdminRole=()=>isDev()||isOwner(),canDemo=id=>isDev(id)||(S.demoAcc||[]).includes(id||S.uid);
const roleAt=(id,v=VID)=>isDev(id)?'dev':isOwner(id,v)?'owner':S.admins.includes(rk(id,v))?'admin':coachOf(id,v)?'coach':'player';
const roleOf=id=>roleAt(id,VID);
/* their highest role at any club (decides which demo accounts they can try) */
const topRole=id=>isDev(id)?'dev':VENUES.map(v=>roleAt(id,v.id)).sort((a,b)=>ROLE_RANK[b]-ROLE_RANK[a])[0]||'player';
/* this club's admins (and the developer), who get admin messages */
const vAdmins=()=>[...new Set([...S.admins.filter(k=>k.endsWith('@'+VID)).map(k=>k.slice(0,-VID.length-1)),...(S.devs||[])])].filter(a=>prof(a));
const coachTitle=(id,v=VID)=>{const c=coachOf(id,v);if(!c)return'';const sp=(c.sports&&c.sports.length?c.sports:['padel']).filter(x=>SPORTS[x]).map(x=>SPORTS[x].name);return(sp.length>1?sp[0]+' and '+sp[1].toLowerCase():sp[0])+' coach at '+venueOf(v).name};
/* Every club they play at, with their role at each: "Admin at Racquet Culture", "Player at Sunday" */
const clubsOf=id=>VENUES.map(v=>v.id).filter(v=>isMember(id,v)||roleAt(id,v)!=='player');
const ROLE_ICON={owner:'👑',admin:'🛡️',coach:'🎾',player:'🏓'};
/* A player's best place in the rankings at a club (padel first), worked out from that club's matches only */
let rankCache={};
function rankedAt(v){const key=v+'|'+(S.allMatches||[]).length+'|'+(S.allConduct||[]).length+'|'+S.profiles.length;
 if(!rankCache[key]){const sv={VID,matches:S.matches,conduct:S.conduct,R:S.R,D:S.D,ST:S.ST};
  if(v!==VID){VID=v;S.matches=(S.allMatches||[]).filter(m=>vidOf(m)===v);S.conduct=(S.allConduct||[]).filter(c=>vidOf(c)===v);rate()}
  const out={};S.profiles.forEach(p=>{for(const sp of ['padel','pickleball']){const r=S.R[sp]&&S.R[sp][p.id]&&rankOf(sp,p.id);if(r&&r.pos){out[p.id]={pos:r.pos,sp,tier:r.tier};break}}});
  Object.assign(S,{matches:sv.matches,conduct:sv.conduct,R:sv.R,D:sv.D,ST:sv.ST});VID=sv.VID;rankCache[key]=out}
 return rankCache[key]}
function rankAt(id,v){return rankedAt(v)[id]||null}
/* Switch club order: clubs you're ranked at first, then the rest; each part by most ranked players (any sport, any level) */
function venueOrder(list){const n=v=>Object.keys(rankedAt(v.id)).length,me_=v=>rankAt(S.uid,v.id)?1:0;
 return list.map((v,i)=>({v,i,m:me_(v),n:n(v)})).sort((a,b)=>b.m-a.m||b.n-a.n||a.i-b.i).map(x=>x.v)}
/* One small chip per club: the club's logo, the player's rank there, and their role there if they have one */
function clubLines(id){if(isDev(id))return'';const cs=clubsOf(id);if(!cs.length)return'';
 return`<div class="clubchips">${cs.map(v=>{const r=roleAt(id,v),V=venueOf(v),k=rankAt(id,v),sp=k&&SPORTS[k.sp];
  const tip=V.name+(k?` · #${k.pos} in ${lbl(TIERS,k.tier)} ${sp?sp.name:''}`:' · not ranked yet')+(r!=='player'?' · '+(r==='coach'?coachTitle(id,v):ROLE_NAME[r]):'');
  return`<button class="clubchip" data-act="clubRank" data-v="${v}" data-p="${esc(id)}" title="${esc(tip)}" aria-label="${esc(tip)}"><span class="vmark sm v-${v}"><img src="${esc(V.logo)}" alt=""></span><b>${k?'#'+k.pos:'–'}</b>${k?`<span class="ctier t-${k.tier}">${esc(lbl(TIERS,k.tier))}</span>`:''}${k&&k.sp==='pickleball'?'<i>PB</i>':''}${r!=='player'?`<span class="crole">${ROLE_ICON[r]} ${r==='coach'?'Coach':ROLE_NAME[r]}</span>`:''}</button>`}).join('')}</div>`}
/* Friends and following. Friends are two-way (a request the other player accepts, or instant for open accounts).
   Following is one-way and needs no approval. After a rejection, a new request can only be sent 5 days later. */
const COOLDOWN=5*864e5;
const following=id=>S.follows.some(f=>f.follower===S.uid&&f.followee===id);
const followerN=id=>new Set(S.follows.filter(f=>f.followee===id&&prof(f.follower)).map(f=>f.follower)).size;
const followingN=id=>new Set(S.follows.filter(f=>f.follower===id&&prof(f.followee)&&(prof(f.followee).setup)).map(f=>f.followee)).size;
const friendIds=()=>[...new Set(S.reqs.filter(r=>r.status==='accepted').map(r=>r.from===S.uid?r.to:r.from))].filter(id=>id!==S.uid&&prof(id));
const isFriend=id=>friendIds().includes(id);
/* Phone numbers: private by default (only admins), or friends, or everyone in the club */
const CCS=[['+91','India'],['+971','UAE'],['+44','UK'],['+1','USA / Canada'],['+61','Australia'],['+65','Singapore'],['+974','Qatar'],['+966','Saudi Arabia'],['+968','Oman'],['+965','Kuwait'],['+973','Bahrain'],['+351','Portugal'],['+49','Germany'],['+33','France'],['+353','Ireland'],['+31','Netherlands'],['+27','South Africa'],['+64','New Zealand']];
const PH_VIS=[['admins','Only admins'],['friends','Friends too'],['all','Everyone']],PH_WHO=[['admins','Only admins'],['friends','Admins and your friends'],['all','Everyone in the club']];
const ccSelect=(id,cur)=>`<select id="${id}" class="ccsel" aria-label="Country code">${CCS.map(([c,n])=>`<option value="${c}"${c===cur?' selected':''}>${c} ${n}</option>`).join('')}</select>`;
const phoneOf=(cc,raw)=>{const d=String(raw||'').replace(/\D/g,'').replace(/^0+/,'');return d.length>=6&&d.length<=14?cc+' '+d:null};
const myPhone=()=>S.phones[S.uid]||null;
const canSeePhone=id=>{const r=S.phones[id];if(!r||!r.phone)return false;return id===S.uid||isAdmin()||r.vis==='all'||(r.vis==='friends'&&isFriend(id))};
const phoneLink=id=>canSeePhone(id)?`<a class="phlink" data-act="tel" href="tel:${esc(S.phones[id].phone.replace(/\s/g,''))}">${esc(S.phones[id].phone)}</a>`:'';
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
/* Messages about friends and follows belong to the person; the rest belong to the club they came from */
const GLOBAL_KINDS=['friend_req','friend_ok','follow','demo_access'];
const tagV=m=>GLOBAL_KINDS.includes(m.kind)||(m.data&&m.data.venue)?m:Object.assign({},m,{data:Object.assign({},m.data||{},{venue:VID})});
const msgVenue=g=>GLOBAL_KINDS.includes(g.kind)?null:vidOf(g);
async function reload(){const d=await Store.load(),inV=x=>vidOf(x)===VID,allM=d.matches||[],mids=new Set(allM.filter(inV).map(m=>m.id));
 S.allMsgs=(d.msgs||[]).sort((a,b)=>(b.at||'').localeCompare(a.at||''));S.allMatches=allM;S.allConduct=d.conduct||[];rankCache={};
 Object.assign(S,{cfg:d.cfg||{},profiles:d.profiles||[],matches:allM.filter(inV),bookings:(d.bookings||[]).filter(inV),confs:d.confs||[],admins:d.admins||[],follows:d.follows||[],reqs:d.reqs||[],votes:(d.votes||[]).filter(v=>!v.match||mids.has(v.match)),conduct:(d.conduct||[]).filter(inV),phones:d.phones||{},coaches:d.coaches||{},devs:d.devs||[],owners:d.owners||[],demoAcc:d.demoAcc||[],msgs:S.allMsgs.filter(g=>{const v=msgVenue(g);return!v||v===VID})});rate()}
/* Unread messages waiting at another club, for the dot on the club switcher */
const unreadAt=vid=>(S.allMsgs||[]).filter(g=>!g.read&&msgVenue(g)===vid).length;

/* ---------- Ratings ----------
   Every match is replayed in date order from each player's starting level, so everyone sees the same numbers.
   Each team's strength is the average of its players' levels. Beating a stronger team earns more,
   losing to a weaker one costs more, so a strong player with a newer partner is not punished for it.
   New players move faster for their first matches so their level settles quickly.
   Every score counts in the rankings as soon as it is logged, without waiting for the other players to confirm.
   A disputed score keeps counting as it was added; only an admin's change moves the rankings. After a week
   (HIST_DAYS) a game is final: it can no longer be disputed or edited, and the score stands for good. */
const HIST_DAYS=7;
/* A game older than a week is final */
const lockedGame=m=>!!m&&(m.date||'')<addDays(today(),-(HIST_DAYS-1));
function totals(sets){let a=0,b=0;(sets||[]).forEach(s=>{a+=+s[0]||0;b+=+s[1]||0});return[a,b]}
function applyMatch(R,m,ensure){
 const sp=SPORTS[m.sport];if(!sp)return null;
 const lv=s=>s.uid?(R[s.uid]||ensure(s.uid,clampL(m.sport,+s.level||avg(sp.bands.intermediate)))).r:clampL(m.sport,+s.level||sp.min);
 const ta=avg(m.a.map(lv)),tb=avg(m.b.map(lv)),ea=1/(1+Math.pow(10,(tb-ta)/sp.scale)),sa=m.winner==='a'?1:m.winner==='draw'?.5:0;
 const [ga,gb]=totals(m.sets),share=ga+gb?ga/(ga+gb):.5,mult=.8+.8*Math.abs(share-.5);
 const out={};
 [[m.a,sa,ea],[m.b,1-sa,1-ea]].forEach(([team,s,e])=>team.forEach(sl=>{if(!sl.uid)return;const E=R[sl.uid],k=sp.K*(E.n<5?2:E.n<15?1.4:1),before=E.r;
  E.r=clampL(m.sport,E.r+k*mult*(s-e));if(E.cap!=null&&E.r>E.cap)E.r=E.cap;if(E.pcap!=null&&E.r>E.pcap)E.r=E.pcap;const d=E.r-before;E.n++;if(s===1)E.w++;else if(s===0)E.l++;E.last=d;E.hist.push({id:m.id,d,r:E.r,date:m.date});out[sl.uid]=d}));
 return{d:out,ea,ta,tb};
}
const okMatch=m=>m&&SPORTS[m.sport]&&Array.isArray(m.a)&&Array.isArray(m.b)&&m.a.length&&m.b.length&&(m.winner==='a'||m.winner==='b'||m.winner==='draw');
const byWhen=(x,y)=>(x.date||'').localeCompare(y.date||'')||((x.time??99)-(y.time??99))||(x.at||'').localeCompare(y.at||'');
const regsOf=m=>[...m.a,...m.b].filter(s=>s&&s.uid).map(s=>s.uid);
/* pending: waiting for the other players; confirmed; disputed: someone asked for a change; reviewed: an admin set the score */
function statusMap(){
 const by={},st={};S.confs.forEach(c=>(by[c.match]=by[c.match]||[]).push(c));
 S.matches.forEach(m=>{const rv=m.review&&m.review.at||'',cs=(by[m.id]||[]).filter(c=>!rv||c.at>rv),disp=cs.filter(c=>c.verdict==='dispute');
  if(lockedGame(m)){st[m.id]={st:m.review?'reviewed':'confirmed',locked:true};return}
  if(disp.length){st[m.id]={st:'disputed',disp};return}
  if(m.review){st[m.id]={st:'reviewed'};return}
  const need=regsOf(m).filter(u=>u!==m.by),ok=need.filter(u=>cs.some(c=>c.user===u&&c.verdict==='ok'));
  st[m.id]=ok.length>=need.length?{st:'confirmed'}:{st:'pending',need,ok}});
 return st;
}
/* Manual level changes: a player can drop to a lower tier. They are saved on the player's profile and replayed in order
   with the games. After a drop the level is capped just below the next tier, so they never move back up on their own:
   when they get within LV_CLOSE of the next tier they are offered the choice to move up, to the bottom of that tier. */
const TIER_KEYS=['beginner','intermediate','pro'],LV_CLOSE=0.1;
const r2=x=>Math.round(x*100)/100;
const capFor=(sp,t)=>{const i=TIER_KEYS.indexOf(t);return i<2?r2(SPORTS[sp].cut[i]-.01):null};
const dropTo=(sp,t)=>r2(SPORTS[sp].bands[t][1]-.2);
/* Pro is invite only. Everyone starts no higher than Intermediate and can climb to the top of it, but no further on their own.
   Only an owner (at their own club) or the developer can invite a player into the Pro ranking at a club. The invite is saved
   on the player's profile as pro[club][sport] = {by, at} and replayed with the games: from then on their level is free and starts
   from at least the bottom of Pro. Removing it replays them capped at the top of Intermediate again. */
const proOf=(id,sp,v=VID)=>{const p=prof(id);return p&&p.pro&&p.pro[v]&&p.pro[v][sp]||null};
const canPro=(v=VID)=>isDev()||isOwner(S.uid,v);
const proCap=sp=>capFor(sp,'intermediate');
function proLockSheet(sp){const n=sp?SPORTS[sp].name.toLowerCase()+' ':'';
 openSheet(`<div style="text-align:center"><div class="lockbig" aria-hidden="true">${ICON.lock}</div><h2 style="margin-top:10px">Pro is invite only</h2>
  <p class="muted" style="margin-top:8px">You need to start at Intermediate and work your way up to Pro.</p>
  <p class="small muted" style="margin-top:10px">Win games to climb the ${n}Intermediate ranking. The club owner picks players from the top and invites them to join the Pro ranking.</p></div>
  <button class="btn brand wide" style="margin-top:18px" data-act="closeSheet">Got it</button>`)}
function levelEvents(){const ev=[];S.profiles.forEach(p=>SP_KEYS.forEach(sp=>{const L=p.levels&&p.levels[sp];((L&&Array.isArray(L.adj))?L.adj:[]).forEach(a=>{if(a&&isFinite(+a.r)&&a.at)ev.push({sp,id:p.id,r:+a.r,cap:a.cap==null?null:+a.cap,at:a.at,kind:a.kind,date:isoIST(Date.parse(a.at))})})}));(S.conduct||[]).forEach(c=>{const pn=penOf(c);if(pn&&c.at)ev.push({sp:c.sport,id:c.user,delta:-pn,at:c.at,kind:c.kind,date:isoIST(Date.parse(c.at))})});S.profiles.forEach(p=>{const pv=p.pro&&p.pro[VID];if(pv)SP_KEYS.forEach(sp=>{const x=pv[sp];if(x&&x.at)ev.push({sp,id:p.id,pro:true,at:x.at,kind:'pro',date:isoIST(Date.parse(x.at))})})});return ev.sort((x,y)=>x.at.localeCompare(y.at))}
/* Admin-confirmed reports knock a little off the player's level in that sport */
const PEN={noshow:{padel:.15,pickleball:.1},late:{padel:.05,pickleball:.03}};
const penOf=c=>c&&PEN[c.kind]&&PEN[c.kind][c.sport]||0;
/* The tier a player was in before their latest drop (they can never be capped below a tier they never left) */
function dropFrom(sp,id){const p=prof(id),L=p&&p.levels&&p.levels[sp];const d=((L&&L.adj)||[]).filter(a=>a.kind==='drop').pop();return d?d.from:null}
/* Offer to move up: only for a capped player who is within LV_CLOSE of the next tier and hasn't just said stay */
function moveUpOffer(sp){const E=S.R[sp]&&S.R[sp][S.uid];if(!E||E.cap==null)return null;const t=tierOf(sp,E.r),i=TIER_KEYS.indexOf(t);if(i>1||(i===1&&E.pcap!=null))return null;
 const next=SPORTS[sp].cut[i];if(E.r<next-LV_CLOSE-1e-9)return null;if(ls.get('rc_lvstay_'+S.uid+'_'+sp,-1)===E.n)return null;return{sp,t,nt:TIER_KEYS[i+1],next,r:E.r}}
function rate(){
 const R={},D={};SP_KEYS.forEach(sp=>R[sp]={});S.ST=statusMap();
 const mk=(sp,id,l)=>{const pc=proCap(sp);l=Math.min(l,pc);return R[sp][id]={r:l,start:l,n:0,w:0,l:0,hist:[],last:0,pcap:pc}};
 S.profiles.filter(p=>inVenue(p)).forEach(p=>SP_KEYS.forEach(sp=>{const L=p.levels&&p.levels[sp],vs=p.vstart&&p.vstart[VID]&&p.vstart[VID][sp];if(L&&isFinite(+L.start))mk(sp,p.id,clampL(sp,vs!=null&&isFinite(+vs)?vs:L.start))}));
 const ev=levelEvents();let ei=0;
 const evFirst=(e,m)=>e.date<(m.date||'')||(e.date===m.date&&e.at<=(m.at||''));
 const applyEv=e=>{const E=R[e.sp]&&R[e.sp][e.id];if(!E)return;const before=E.r;if(e.pro){E.pcap=null;E.cap=null;E.r=Math.max(E.r,SPORTS[e.sp].cut[1])}else if(e.delta!=null){E.r=clampL(e.sp,E.r+e.delta)}else{E.r=clampL(e.sp,e.r);E.cap=e.cap}if(E.pcap!=null&&E.r>E.pcap)E.r=E.pcap;E.last=E.r-before;E.hist.push({id:'adj',d:E.r-before,r:E.r,date:e.date,adj:e.kind})};
 S.matches.filter(okMatch).sort(byWhen).forEach(m=>{while(ei<ev.length&&evFirst(ev[ei],m))applyEv(ev[ei++]);D[m.id]=applyMatch(R[m.sport],m,(id,l)=>mk(m.sport,id,l))});
 while(ei<ev.length)applyEv(ev[ei++]);
 S.R=R;S.D=D;
}
/* What a result would do, without saving it */
function preview(m){
 const R={},mk=(id,l)=>R[id]={r:l,start:l,n:0,w:0,l:0,hist:[],last:0};
 [...m.a,...m.b].forEach(s=>{if(s.uid){const e=S.R[m.sport][s.uid];if(e)R[s.uid]=Object.assign({},e,{hist:[]})}});
 return applyMatch(R,m,mk);
}
const lvlOf=(sp,id)=>{const e=S.R[sp][id];return e?e.r:null};
/* A player's place in their tier, the same as the Rankings table; g limits it to 'male' or 'female' players */
function rankOf(sp,id,g){const e=S.R[sp][id];if(!e||!e.n)return null;const t=tierOf(sp,e.r);
 const list=Object.entries(S.R[sp]).filter(([pid,x])=>{const p=prof(pid);return x.n&&p&&p.setup&&tierOf(sp,x.r)===t&&(!g||g==='all'||p.gender===g)}).sort((a,b)=>b[1].r-a[1].r);
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
function splash(big,small,v){v=v||VEN();
 qsa('.splash').forEach(x=>x.remove());const el=document.createElement('div');el.className='splash';el.setAttribute('aria-hidden','true');
 el.innerHTML=`<div class="v-${esc(v.id)}"><img src="${esc(v.splash)}" alt=""><p class="s1">${esc(small)}</p><p class="s2">${esc(big)}</p>${v.place?`<p class="s3">${esc(v.place)}</p>`:''}</div>`;
 document.body.appendChild(el);setTimeout(()=>el.remove(),calm()?700:2000);
}
/* When a player joined: saved when the account is made; for older accounts, the earliest level or game we know of */
function joinedOf(p){if(!p)return null;if(p.created)return isoIST(Date.parse(p.created));
 const c=[...Object.values(p.levels||{}).map(l=>l&&l.at&&isoIST(Date.parse(l.at))),...S.matches.filter(m=>regsOf(m).includes(p.id)).map(m=>m.date)].filter(Boolean).sort();return c[0]||null}
function joinedLine(p){const j=joinedOf(p);return j?`<p class="joined small muted">Joined the community on ${new Date(j+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>`:''}
/* Reliability: built only from reports an admin has confirmed */
function reliability(id){const now=Date.now(),D=864e5,c=(S.conduct||[]).filter(x=>x.user===id&&x.at),played=S.matches.some(m=>regsOf(m).includes(id))||S.bookings.some(b=>isGame(b)&&goingOf(b).includes(id)&&bkEnd(b)<new Date());
 const late=c.filter(x=>x.kind==='late'&&now-Date.parse(x.at)<30*D).length,miss=c.filter(x=>x.kind==='noshow'&&now-Date.parse(x.at)<90*D).length;
 if(!played&&!late&&!miss)return null;
 return{late,miss,html:`<div class="relia">${miss?`<span class="chip st-disputed">Missed ${miss} game${miss===1?'':'s'} in the past 3 months</span>`:'<span class="chip st-confirmed">Never missed a game</span>'}${late?`<span class="chip st-pending">Showed up late for ${late} game${late===1?'':'s'} in the past month</span>`:'<span class="chip st-confirmed">Always arrived on time</span>'}</div>`}}
const reliaHTML=id=>(reliability(id)||{}).html||'';
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
/* The demo version is only open to the developer and the players they give demo access to */
function previewLocked(){$('welcome').hidden=true;applyMP();$('app').hidden=true;$('wiz').hidden=true;$('auth').hidden=false;closeSheet(true);
 $('auth').innerHTML=`<div class="acard card" style="max-width:440px;margin:12vh auto 0;text-align:center;padding:28px 22px"><img class="alogo" src="brand/icon-192.png" alt="OneCourt" style="max-width:120px;border-radius:26px"><h1 style="margin-top:18px">Demo mode is invite only</h1><p class="muted" style="margin-top:8px">This is where new updates are tried out before they go live. Your account doesn't have demo access yet.</p><a class="btn brand wide" style="margin-top:18px" href="../">Go to the app</a><button class="btn ghost wide" style="margin-top:10px" data-act="signOut">Sign out</button><p class="small muted vline">V${esc(APP_VER)}</p></div>`}
function showAuth(mode){if(mode)authMode=mode;
 applyMP();$('welcome').hidden=true;$('app').hidden=true;$('wiz').hidden=true;$('auth').hidden=false;closeSheet(true);mountBar();window.scrollTo(0,0);
 $('modeNote').textContent=Store.mode==='demo'?'Demo: you’re trying the first-time sign-in as a new player. Any email and password work, and nothing is saved.':Store.mode==='live'?'':'Preview mode: accounts and scores are saved on this device only.';
 paintAuthVenue();paintAuth(0);
}
/* Sign-in page: OneCourt's own, one account for every club. Sign in once, then jump between clubs */
function paintAuthVenue(){const el=$('aVenue');
 if(el)el.innerHTML=`<img class="mpmini" src="brand/icon-192.png" alt=""><span class="small"><b>OneCourt</b><span class="muted" style="display:block">One sign-in for every club</span></span>`;
 const lg=document.querySelector('#auth .alogo');if(lg){lg.src='brand/icon-512.png';lg.alt='OneCourt';lg.classList.add('mp')}
 const tg=document.querySelector('#auth .atag');if(tg)tg.innerHTML=`<b>Every court. One app.</b>Sign in once to OneCourt and play at ${VENUES.map(v=>esc(v.name)).join(', ').replace(/, ([^,]*)$/,' and $1')}.`;
 const fl=document.querySelector('#auth .afeat');if(fl)fl.innerHTML='<li>Sign in once, then switch courts any time</li><li>Your level and play style come with you</li><li>Each club has its own rankings</li>';
 const ft=document.querySelector('#auth .afoot');if(ft)ft.textContent='OneCourt · V'+APP_VER}
function paintAuth(dir){
 qsa('#authSeg>button').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.v===authMode)));
 const up=authMode==='up';
 $('authPane').innerHTML=`<div class="pane" style="--from:${dir*18}px">
  <h1>${up?'Join OneCourt':'Welcome back'}</h1>
  <p class="muted">${up?'One account for every club. Next, a few quick questions about your game.':'Sign in once and you can jump between clubs without signing in again.'}</p>
  <form id="aForm" novalidate autocomplete="on">
   ${up?`<label for="aName">Your name</label><input id="aName" name="name" autocomplete="name" maxlength="60" placeholder="e.g. Rhea Fernandes">`:''}
   <label for="aEmail">Email</label>
   <input id="aEmail" name="email" type="email" inputmode="email" autocomplete="${up?'email':'username'}" autocapitalize="none" spellcheck="false" maxlength="254" placeholder="you@example.com">
   ${up?`<label for="aPhone">Phone number</label>
   <div class="phrow">${ccSelect('aCC','+91')}<input id="aPhone" name="tel" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="18" placeholder="98765 43210"></div>
   <div class="fieldnote"><span>🔒 Only club admins can see your phone number. You can change this in Settings.</span></div>
   <label for="aUser">Username</label>
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
</div>`;
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
 if(Store.mode==='demo')return demoAuthDone('','',u);
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
 const ph=phoneOf($('aCC').value,$('aPhone').value);if(!ph)return aerr('Enter your phone number, so the club can reach you about bookings.');
 const bad=userProblem(u);if(bad)return aerr(bad);
 if(p.length<6)return aerr('Your password needs at least 6 characters.');
 if(!V.ok)return aerr('Slide the handle to verify you are human first.');
 if($('aWeb').value)return aerr('Something went wrong. Refresh the page and try again.');
 busy(true,'Creating your account…');
 if(Store.mode==='demo')return demoAuthDone(n,u,em);
 try{if(await Store.taken(u))throw errc('taken');ls.set('rc_phone_new',{phone:ph,email:em.toLowerCase()});S.uid=await Store.signUp(n,u,em,p,ph)}
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
/* A phone number given at sign-up is saved once the account is ready (after email confirmation too) */
async function syncPhone(){if(Store.mode==='demo'||myPhone())return;let ph=null;const pend=ls.get('rc_phone_new',null);
 if(Store.mode==='live'){try{const {data}=await sb.auth.getUser();const u=data.user;ph=u&&u.user_metadata&&u.user_metadata.phone||null;if(!ph&&pend&&u&&pend.email===(u.email||'').toLowerCase())ph=pend.phone}catch(e){}}
 else if(pend)ph=pend.phone;
 if(!ph)return;const r={phone:ph,vis:'admins'};try{await Store.savePhone(r);S.phones[S.uid]=r;ls.set('rc_phone_new',null)}catch(e){}}
async function enter(fresh){
 try{await reload()}catch(e){toast('Could not load the club data. Check your connection.')}
 let p=me();
 if(!p&&Store.mode==='live'){try{const {data}=await sb.auth.getUser();const md=data.user&&data.user.user_metadata||{};
  if(md.username){p={id:S.uid,username:md.username,name:md.name||md.username,setup:false,created:new Date().toISOString()};
   try{await Store.saveProfile(p);S.profiles.push(p)}catch(e){if(e.code==='23505')return pickUsername(p);throw e}}}catch(e){p=null}}
 if(!p){await Store.signOut();S.uid=null;return showAuth()}
 await syncPhone();
 /* the theme a player last chose follows them to every device; new players start in light */
 if(p.theme&&p.theme!==prefs.theme)setPref('theme',p.theme);else if(!p.theme&&!p.setup&&prefs.theme!=='light')setPref('theme','light');
 try{S.email=await Store.email()}catch(e){}
 if(PREVIEW&&Store.mode!=='demo'){if(canDemo())return startDemo(topRole(S.uid));return previewLocked()}
 if(!p.setup){applyMP();return startWiz('setup')}
 /* players who joined before the Men and Women rankings: ask once for gender */
 if(!p.gender&&!ls.get('rc_g_skip_'+p.id,0)){ls.set('rc_g_skip_'+p.id,1);startWiz('gender');W.after='pick';return}
 showPicker();
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
function showApp(){$('welcome').hidden=true;$('auth').hidden=true;$('wiz').hidden=true;applyVenue();$('app').hidden=false;render();}

/* ================= Profile set-up ================= */
let W=null,wLock=false;
const ICON={
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9.5" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.7" r="1.1" fill="currentColor" stroke="none"/></svg>',
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
 if(mode==='setup'||$('app').hidden){applyMP();$('welcome').hidden=true}
 $('auth').hidden=true;$('app').hidden=true;$('wiz').hidden=false;window.scrollTo(0,0);closeSheet(true);mountBar();paintWiz();
}
function wSteps(){
 const d=W.d,st=[];
 if(W.mode==='gender')return['gender','save'];
 if(W.mode!=='level')st.push('avatar','gender','sports','hand','invites','times','side');
 const lv=W.mode==='level'?W.only:W.mode==='setup'?(d.sports.length?d.sports:SP_KEYS):d.sports.filter(sp=>!(d.levels[sp]&&isFinite(+d.levels[sp].start)));
 lv.forEach(sp=>{d.q[sp]=d.q[sp]||{band:'',ans:[]};st.push('band:'+sp,'result:'+sp)});
 st.push(W.mode==='setup'?'done':'save');return st;
}
const ANIM_OF=new Map([[ICON.padel,'swing'],[ICON.pickleball,'roll'],[ICON.mail,'ring'],[ICON.nomail,'shake'],[ICON.sunrise,'rise'],[ICON.sun,'spin'],[ICON.noon,'pulse'],[ICON.sunset,'sink'],[ICON.moon,'rock'],[ICON.any,'spin']]);
function opt(o){const role=o.multi?'aria-pressed':'aria-checked',a=o.icon?ANIM_OF.get(o.icon)||(/M6 19v-3/.test(o.icon)?'bars':'pop'):'';
 return `<button type="button" class="opt${o.big?' big':''}${o.locked?' locked':''}${W&&W.jp===o.act+'|'+o.v?' play':''}" ${o.multi?'':'role="radio"'} ${role}="${!!o.on}" data-act="${o.act}" data-v="${esc(o.v)}">${o.icon?`<span class="oi" data-a="${a}">${o.icon}</span>`:''}<span class="ot"><b>${esc(o.title)}</b>${o.sub?`<span>${esc(o.sub)}</span>`:''}</span><span class="ock">${ICON.check}</span></button>`}
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
  return{eyebrow:'Your profile',title:'Add a profile picture',sub:'Upload a photo, or keep your initials badge. You can change it any time.',valid:true,next:'Continue',
   body:`<div class="avbig">${avHTML(pv,132)}</div>
   <label class="upload">${ICON.upload}<span>${d.avatar?'Choose a different photo':'Upload a photo'}</span><input type="file" accept="image/*" id="wPhoto"></label>
   ${d.avatar?`<p style="text-align:center;margin-top:10px"><button type="button" class="btn link small" data-act="wNoPhoto">Remove photo and use my initials</button></p>`:`<p class="small muted" style="text-align:center;margin-top:12px">No photo? Your initials look great too.</p>`}`}}
 if(kind==='sports')return{eyebrow:'Your game',title:'Which sports do you play?',sub:'Choose one or both. Each sport has its own level and its own rankings.',valid:d.sports.length>0,
  body:`<div class="opts two">${SP_KEYS.map(k=>opt({multi:1,big:1,act:'wSport',v:k,on:d.sports.includes(k),title:SPORTS[k].name,sub:`Levels ${fmtL(SPORTS[k].min,1)} to ${fmtL(SPORTS[k].max,1)}`,icon:ICON[k]})).join('')}</div>`};
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
  return{eyebrow:S_.name+' level',title:`What's your ${S_.name.toLowerCase()} level?`,sub:'Pick the level that fits you best. Everyone new in a level starts at the same spot, at the bottom of it, and your results move you from there.',valid:!!q.band,single:1,
   body:`<div class="opts" role="radiogroup">${[['beginner','Beginner','Learning the shots and the rules'],['intermediate','Intermediate','Regular rallies, starting to play tactically'],['pro','Pro','Invite only · start at Intermediate and work your way up']].map((b,i)=>opt({act:'wBand',v:sp+'|'+b[0],on:q.band===b[0],title:b[1],locked:b[0]==='pro',sub:b[0]==='pro'?b[2]:`${b[2]} · starts at ${fmtL(B[b[0]][0],1)}`,icon:b[0]==='pro'?ICON.lock:ICON.bars(i+1)})).join('')}</div>`}}
 if(kind==='q'){const q=d.q[sp],list=QS[sp][q.band],it=list[+qi],cur=q.ans[+qi];
  return{eyebrow:`${S_.name} level · Question ${+qi+1} of ${list.length}`,title:it[0],sub:'',valid:cur!==undefined,single:1,
   body:`<div class="opts" role="radiogroup">${it[1].map((a,j)=>opt({act:'wAns',v:sp+'|'+qi+'|'+j,on:cur!==undefined&&q.pick&&q.pick[+qi]===j,title:a[0]})).join('')}</div><p class="qhint">Answer for how you play most of the time.</p>`}}
 if(kind==='result'){const q=d.q[sp],v=levelFrom(sp,q.band,q.ans),t=tierOf(sp,v),had=S.R[sp][S.uid]&&S.R[sp][S.uid].n;
  const segs=TIERS.map(([k,n])=>{const lo=k==='beginner'?S_.min:S_.cut[k==='intermediate'?0:1],hi=k==='pro'?S_.max:S_.cut[k==='beginner'?0:1];return`<span class="${k===t?'on':''}" style="flex:${hi-lo}"><em>${n}</em></span>`}).join('');
  return{eyebrow:`${S_.name} level`,title:'Your starting level',sub:'',valid:true,result:{sp,v},next:'Confirm this level',alt:`<button class="btn ghost" data-act="wRetake" data-v="${sp}">Change</button>`,
   body:`<div class="lvl"><div class="big num" id="lvlNum">0.0</div><div class="tierchip"><span class="chip t-${t}">${TIER_NAME[t]} rankings</span></div>
   <div class="gauge">${segs}<i class="mark" id="lvlMark"></i></div>
   <p class="muted small" style="margin-top:34px">${S_.name} is rated from ${fmtL(S_.min,1)} to ${fmtL(S_.max,1)}. Your level now moves with every result you log: beat stronger players to climb faster.</p>
   <p class="small lockn">Everyone new in ${TIER_NAME[t]} starts here. Picked the wrong level? Tap <b>Change</b>. Once you confirm, your starting level is locked and only your results move it. You can still drop to a lower tier later from your level card.</p>
</div>`}}
 if(kind==='done'){const p=me();
  return{eyebrow:'All set',title:`You're all set, ${first(p)}.`,sub:'Your profile is ready and it works at every club. Next, pick a court to begin.',valid:true,next:'Pick a court',
   body:`<div class="avbig">${avHTML(Object.assign({},p,{avatar:d.avatar}),132)}</div>
   <div class="chips" style="justify-content:center;margin-top:16px">${d.sports.map(sp=>{const v=levelFrom(sp,d.q[sp].band,d.q[sp].ans);return`<span class="chip t-${tierOf(sp,v)}">${SPORTS[sp].name} ${fmtL(v,1)}</span>`}).join('')}
   <span class="chip">${esc(lbl(HANDS,d.hand))}</span><span class="chip">${esc(lbl(SIDES,d.side))}</span><span class="chip">${d.invites?'Open to game invites':'Game invites off'}</span></div>`}}
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
  <div class="wfoot">${W.mode!=='setup'&&W.i===0?`<button class="btn ghost" data-act="wCancel">Cancel</button>`:''}${s.alt||''}<button class="btn brand wide" data-act="wNext" ${s.valid?'':'disabled'}>${esc(s.next||'Continue')}</button></div>`;
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
 Object.entries(d.q).forEach(([sp,q])=>{if(q.band==='pro'){q.band='';q.ans=[]}if(q.band&&S_BANDS.includes(q.band))levels[sp]=Object.assign({start:levelFrom(sp,q.band),band:q.band,at:new Date().toISOString()},p.levels&&p.levels[sp]&&p.levels[sp].adj?{adj:p.levels[sp].adj}:{})});
 const np=Object.assign({},p,{avatar:d.avatar,sports:W.mode==='level'?[...new Set([...d.sports,...W.only])]:d.sports,hand:d.hand,invites:!!d.invites,times:d.times,side:d.side,levels,setup:true,gender:d.gender||p.gender||''});
 if(W.mode==='setup'&&!p.setup&&!np.home&&!(np.venues||[]).length)np.nohome=true;
 if(np.vstart)Object.keys(d.q).forEach(sp=>{Object.values(np.vstart).forEach(o=>{if(o)delete o[sp]})});
 const btn=$('wiz').querySelector('[data-act="wNext"]');if(btn){btn.disabled=true;btn.textContent='Saving…'}
 try{await Store.saveProfile(np)}catch(e){if(btn){btn.disabled=false;btn.textContent='Try again'}return toast('Could not save. Check your connection and try again.')}
 const i=S.profiles.findIndex(x=>x.id===np.id);S.profiles[i]=np;rate();
 const wasSetup=W.mode==='setup',after=W.after;W=null;
 if(wasSetup||after==='pick')return showPicker();
 doneTick('Profile updated');showApp();
}

/* ================= App views ================= */
const VIEWS={settings:()=>vSettings(),home:()=>vHome(),book:()=>vBook(),add:()=>vAdd(),rank:()=>vRank(),players:()=>vPlayers(),me:()=>vMe(),inbox:()=>vInbox()};
/* Clubs that run more than one venue show once in the strip; tapping them asks which venue */
const groupOf=v=>v.brand||v.id;
function paintVenues(){const el=$('vswitch');if(!el)return;
 /* the club you're in stays put on the left (tap it for every club); the other clubs glide past beside it */
 const cur=VEN(),rest=VENUES.filter(v=>v.id!==VID),groups=[];
 rest.forEach(v=>{const g=groups.find(x=>x.k===groupOf(v));g?g.vs.push(v):groups.push({k:groupOf(v),vs:[v]})});
 const one=(g,dup)=>{const v=g.vs[0],many=g.vs.length>1,n=g.vs.some(x=>unreadAt(x.id)),nm=many?`${g.k} (${g.vs.length} venues)`:v.name;
  return`<button type="button" class="vbtn${many?' vmany':''}" data-act="${many?'venueGroup':'venue'}" data-v="${esc(many?g.k:v.id)}"${dup?' aria-hidden="true" tabindex="-1"':` aria-label="${esc(nm)}${n?', new messages':''}"`} title="${esc(nm)}">${vMark(v)}${many?`<span class="vcount" aria-hidden="true">${g.vs.length}</span>`:''}${n?'<span class="vdot" aria-hidden="true"></span>':''}</button>`};
 el.innerHTML=`<button type="button" class="vbtn on vcur" data-act="venueAll" aria-label="${esc(cur.name)}, you are here. Switch club" aria-haspopup="dialog" title="Switch club">${vMark(cur)}<span class="vcaret" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></button>`
  +(groups.length?`<div class="vrun"><div class="vtrack" style="--n:${groups.length}"><div class="vset">${groups.map(g=>one(g)).join('')}</div><div class="vset" aria-hidden="true">${groups.map(g=>one(g,1)).join('')}</div></div></div>`:'');
 const run=el.querySelector('.vrun');if(run){let t=0;const hold=()=>{run.classList.add('hold');clearTimeout(t);t=setTimeout(()=>run.classList.remove('hold'),2600)};run.addEventListener('touchstart',hold,{passive:true});run.addEventListener('focusin',hold);fitRun()}
}
/* When every club already fits beside yours, they sit still (no loop, no repeats); otherwise they glide */
function fitRun(){const run=document.querySelector('#vswitch .vrun');if(!run)return;const set=run.querySelector('.vset');run.classList.remove('still');run.classList.toggle('still',set.scrollWidth<=run.clientWidth+1)}
addEventListener('resize',()=>{clearTimeout(fitRun.t);fitRun.t=setTimeout(fitRun,120)});
/* Every club in one pop-up: search, then tap to switch */
function openVenues(grp){tick();const list=venueOrder(grp?VENUES.filter(v=>groupOf(v)===grp):VENUES);
 openSheet(`<h2>${grp?esc(grp):'Switch club'}</h2><p class="muted small">${grp?`${list.length} venues. Pick one.`:'Every court. One app.'}</p>
  <div class="search vssearch"${grp?' hidden':''}>${ICON.search}<input id="vsQ" type="search" placeholder="Find a venue or area" aria-label="Find a venue" autocomplete="off" enterkeyhint="search"></div>
  <div class="vslist" id="vsL">${list.map((v,i)=>{const on=v.id===VID,mine=isMember(S.uid,v.id),n=on?0:unreadAt(v.id);
   return`<button type="button" class="vsrow rv${on?' on':''}" style="--vc:${esc(v.color)};--d:${i*60}ms" data-act="venueGo" data-v="${v.id}" data-find="${esc([v.name,v.place||'',v.area,v.courts,v.also||''].join(' ').toLowerCase())}"${on?' aria-current="true"':''}>${vMark(v)}<span class="grow"><b>${esc(v.name)}</b><small>${esc(v.place||v.area)}</small>${on?'<em class="vstag here">You’re here</em>':mine?'':'<em class="vstag">New to you · yet to play</em>'}</span>${n?'<span class="vdot" aria-hidden="true"></span>':''}<span class="go" aria-hidden="true">›</span></button>`}).join('')}${grp?'':SOON.map((v,i)=>`<button type="button" class="vsrow rv soon" style="--vc:${esc(v.color)};--d:${(list.length+i)*60}ms" data-act="venueSoon" data-v="${esc(v.id)}" data-find="${soonFind(v)}">${vMark(v)}<span class="grow"><b>${esc(v.name)}</b><small>Joining OneCourt soon</small><em class="vstag soon">Coming soon</em></span></button>`).join('')}<p class="muted small vsnone" id="vsNone" hidden></p></div>
  <button class="btn ghost wide" style="margin-top:14px" data-act="closeSheet">Close</button>`,bg=>{
  requestAnimationFrame(()=>qsa('.rv',bg).forEach(e=>e.classList.add('in')));
  const q=bg.querySelector('#vsQ');
  /* keep the search at the top of the pop-up when the keyboard opens, so results show right under it */
  const toTop=()=>{const s=bg.querySelector('.sheet'),box=q.closest('.vssearch');if(s&&box)s.scrollTop=Math.max(0,box.offsetTop-50)};
  q.addEventListener('focus',()=>{const s=bg.querySelector('.sheet');if(s&&!bg.classList.contains('kb'))s.style.minHeight=s.offsetHeight+'px';setTimeout(toTop,60);setTimeout(toTop,350)});
  q.oninput=()=>{toTop();const w=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);let k=0;
   qsa('.vsrow',bg).forEach(r=>{const ok=w.every(x=>r.dataset.find.includes(x));r.hidden=!ok;if(ok)k++});
   const no=bg.querySelector('#vsNone');no.hidden=!!k;no.textContent=k?'':'No venues match “'+q.value.trim()+'” yet.';vsNear()};
  /* phones: the club nearest the middle of the list glows as you scroll, like the rest of the app */
  const sh=bg.querySelector('.sheet');let raf=0;const vsNear=()=>{raf=0;if(matchMedia('(hover:hover)').matches||calm())return;
   const sr=sh.getBoundingClientRect(),max=sh.scrollHeight-sh.clientHeight,pr=max>0?sh.scrollTop/max:.5,mid=sr.top+80+(sr.height-160)*pr;let best=null,bd=1e9;
   qsa('.vsrow:not([hidden])',bg).forEach(r=>{const b=r.getBoundingClientRect(),d=Math.abs((b.top+b.bottom)/2-mid);if(d<bd){bd=d;best=r}});
   qsa('.vsrow.near',bg).forEach(r=>{if(r!==best)r.classList.remove('near')});if(best)best.classList.add('near')};
  sh.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(vsNear)},{passive:true});setTimeout(vsNear,400);
 });
}
/* "an admin at Racquet Culture", or "an admin at Racquet Culture, a player here" when they are at another club */
/* "an admin at Sunday", "a player at Racquet Culture": their role at the club they are looking at */
function roleWords(){const r=roleOf(S.uid),w=k=>k==='dev'?'the developer':k==='owner'?'an owner':k==='admin'?'an admin':'a '+k;
 return r==='dev'?w(r)+' (every power at every club)':w(r)+' at '+VEN().short}
/* ---------- Ads ----------
   The advert window at the top of every page. Each venue can have its own set; venues without their own use 'default'.
   Quick change in code: add a venue here, e.g. sunday:[{src:'ads/a.png',bg:'#ffffff'},{src:'ads/b.mp4'}]. An empty list means no ads there.
   bg is the colour behind the picture (it shows round logos and transparent images). Videos are picked up by their file type, or type:'video'.
   The Developer can also change them in the app (pencil on the ad): those are saved in rc_ads and win over this list. */
const ADS={
 default:[
  {src:'ads/project23-1.png',bg:'#370a42',alt:'Project 23'},
  {src:'ads/project23-2.png',bg:'#f2eee9',alt:'Project 23'},
  {src:'ads/project23-3.png',bg:'#f2eee9',alt:'Project 23'}]
};
const AD_SECS=5,AD_BGS=[['#370a42','Purple'],['#f2eee9','Cream'],['#000000','Black'],['#ffffff','White']];
let adRows=null,adLoading=false,adNode=null,adKey='',adIdx=0,adT=0,adFull=null,adEd=null;
const adType=a=>a.type||(/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(a.src||'')?'video':'image');
const adOwn=v=>!!adRows&&Object.prototype.hasOwnProperty.call(adRows,v);
function adList(v=VID){const r=adRows||{};return adOwn(v)?r[v]:v!=='default'&&ADS[v]?ADS[v]:adOwn('default')?r.default:ADS.default||[]}
/* Only the Developer can change ads. In demo mode that means your real role is Developer and you are viewing as the Developer */
const adDev=()=>!!sb&&(Store.mode==='demo'?demoRank()==='dev'&&demoRole()==='dev':isDev());
async function loadAds(){if(!sb||adLoading)return;adLoading=true;
 try{const {data,error}=await sb.from('rc_ads').select('venue,items');if(!error){const m={};(data||[]).forEach(x=>{m[x.venue]=Array.isArray(x.items)?x.items:[]});adRows=m;if(me()&&!$('app').hidden)paintAds()}}catch(e){}
 adLoading=false}
function adMedia(a,full){const s=esc(a.src);
 if(adType(a)==='video')return full?`<video src="${s}" controls autoplay playsinline></video>`:`<video src="${s}" muted playsinline preload="metadata"></video>`;
 return `<img src="${s}" alt="${esc(a.alt||'Advert')}" draggable="false"${full?'':' loading="lazy"'}>`}
/* Called on every redraw: keeps the same window (and where it is in the rotation) unless the ads changed */
function paintAds(){const host=$('banner');if(!host)return;if(adRows===null&&sb)loadAds();
 const list=adList(),dev=adDev(),key=VID+'|'+dev+'|'+JSON.stringify(list);
 if(!list.length&&!dev){clearTimeout(adT);adT=0;host.querySelectorAll('.adbar').forEach(n=>n.remove());adNode=null;adKey=key;return}
 if(key!==adKey||!adNode){host.querySelectorAll('.adbar').forEach(n=>n.remove());adKey=key;adIdx=0;clearTimeout(adT);adT=0;adNode=document.createElement('div');adNode.className='adbar';adNode.setAttribute('role','region');adNode.setAttribute('aria-label','Advert');
  adNode.innerHTML=(list.length?`<div class="adtrack">${list.map((a,i)=>`<button type="button" class="adslide" data-act="adOpen" data-v="${i}" style="background:${esc(a.bg||'#000')}" aria-label="Open advert ${i+1} of ${list.length} full screen">${adMedia(a)}</button>`).join('')}</div>`:`<div class="adnone">No ads at ${esc(VEN().short)}. Only you can see this.</div>`)
   +(list.length?'<span class="adtag">Ad</span>':'')
   +(list.length>1?`<div class="addots" aria-hidden="true">${list.map(()=>'<i></i>').join('')}</div>`:'')
   +(dev?`<button type="button" class="adedit" data-act="adEdit" aria-label="Change the ads" title="Change the ads (only you can see this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>`:'');
  adSwipe(adNode,d=>adShow(adIdx+d));host.prepend(adNode);adShow(0)}
 else{host.prepend(adNode);const v=adNode.querySelector('.adslide.on video');if(v&&!adFull)v.play().catch(()=>{})}}
function adShow(i){const s=adNode&&adNode.querySelectorAll('.adslide');clearTimeout(adT);adT=0;if(!s||!s.length)return;adIdx=((i%s.length)+s.length)%s.length;
 s.forEach((el,k)=>{const on=k===adIdx;el.classList.toggle('on',on);el.tabIndex=on?0:-1;el.setAttribute('aria-hidden',on?'false':'true');
  const v=el.querySelector('video');if(v){v.loop=s.length<2;if(on&&!adFull){try{v.currentTime=0}catch(e){}v.play().catch(()=>{})}else v.pause()}});
 adNode.querySelectorAll('.addots i').forEach((d,k)=>d.classList.toggle('on',k===adIdx));
 if(s.length<2||adFull)return;const v=s[adIdx].querySelector('video');
 if(v)v.onended=()=>{if(!adFull)adShow(adIdx+1)};
 adT=setTimeout(()=>{adT=0;if(!adFull)adShow(adIdx+1)},v?90000:AD_SECS*1000)}
/* Swipe left or right to move between ads (and don't open the one under your finger) */
function adSwipe(el,go){let x0=null,y0=0;
 el.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
 el.addEventListener('touchend',e=>{if(x0===null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
  if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3){el.dataset.swiped=Date.now();go(dx<0?1:-1)}},{passive:true});
 el.addEventListener('click',e=>{if(el.dataset.swiped&&Date.now()-el.dataset.swiped<400){e.stopPropagation();e.preventDefault()}},true)}
/* Full screen: the ad fills the screen with a Minimise button to go back */
function adOpen(i){const list=adList();if(!list.length)return;tick();adClose(true);
 const cur=adNode&&adNode.querySelector('.adslide.on video');if(cur)cur.pause();
 const el=document.createElement('div');el.className='adfull';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Advert, full screen');
 el.innerHTML=`<div class="adftop"><span class="adtag">Ad</span><span class="adfcount"></span><button type="button" class="adfmin" data-act="adClose" aria-label="Minimise"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg><span>Minimise</span></button></div>
  <div class="adfstage"></div>
  ${list.length>1?`<button type="button" class="adfnav prev" data-act="adStep" data-v="-1" aria-label="Previous ad"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="adfnav next" data-act="adStep" data-v="1" aria-label="Next ad"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>`:''}`;
 el.addEventListener('click',e=>{if(e.target===el||e.target.classList.contains('adfstage'))adClose()});
 adSwipe(el,d=>adFullShow(adFull.i+d));
 document.body.appendChild(el);adFull={el,i:0};pageLock(true);clearTimeout(adT);adT=0;adFullShow(+i||0);
 requestAnimationFrame(()=>el.classList.add('in'));setTimeout(()=>{const b=el.querySelector('.adfmin');if(b)b.focus({preventScroll:true})},60)}
function adFullShow(i){if(!adFull)return;const list=adList();if(!list.length)return adClose();const n=list.length;adFull.i=((i%n)+n)%n;const a=list[adFull.i];
 adFull.el.querySelector('.adfcount').textContent=n>1?`${adFull.i+1} of ${n}`:'';
 adFull.el.querySelector('.adfstage').innerHTML=`<div class="adfbox ${adType(a)}" style="background:${esc(a.bg||'#000')}">${adMedia(a,true)}</div>`}
function adClose(now){if(!adFull)return;const {el,i}=adFull;adFull=null;el.querySelectorAll('video').forEach(v=>v.pause());
 const gone=()=>{el.remove();if(!$('sheetBg')&&!adFull)pageLock(false)};if(now||calm())gone();else{el.classList.remove('in');setTimeout(gone,220)}
 if(adNode)adShow(i)}
/* Developer only: choose the ads for each venue (or the default set), upload pictures or videos, then save */
function adEdit(){if(!adDev())return toast('Only the developer can change the ads.');tick();
 openSheet(`<h2>Ads</h2><p class="muted small">The window at the top of every page. Tap an ad to see it full screen. Only you can change them, and they are saved for real (also in demo mode).</p><div id="adEdBody"></div>`);adEdStart(adOwn(VID)||ADS[VID]?VID:'default')}
function adEdStart(v){adEd={v,items:JSON.parse(JSON.stringify(adList(v)))};adEdPaint()}
function adEdPaint(){const b=$('adEdBody');if(!b||!adEd)return;const v=adEd.v,it=adEd.items,
  own=x=>x==='default'||adOwn(x)||!!ADS[x];
 b.innerHTML=`<p class="small muted" style="margin:14px 0 6px">Which ads to change</p>
  <div class="seg adwhich" role="radiogroup" aria-label="Which ads to change"><button type="button" role="radio" aria-checked="${v==='default'}" data-act="adWhich" data-v="default">Default ads</button><button type="button" role="radio" aria-checked="${v!=='default'}" data-act="adWhich" data-v="${esc(VID)}">${esc(VEN().short)} only</button></div>
  <p class="tiny muted" style="margin-top:8px">${v==='default'?'Shown at every venue that doesn’t have its own ads.':own(v)?`${esc(VEN().name)} has its own ads. Other venues aren’t affected.`:`${esc(VEN().name)} shows the default ads now. Change them below and save to give it its own. Other venues aren’t affected.`}</p>
  <div class="adlist">${it.length?it.map((a,i)=>`<div class="adrow"><div class="adthumb" style="background:${esc(a.bg||'#000')}">${adMedia(a)}</div>
   <div class="admeta"><b>${adType(a)==='video'?'Video':'Picture'} ${i+1}</b><div class="adbgs" role="radiogroup" aria-label="Background colour">${AD_BGS.map(([c,n])=>`<button type="button" role="radio" aria-checked="${(a.bg||'').toLowerCase()===c}" data-act="adBg" data-v="${i}|${c}" title="${n} background" aria-label="${n} background" style="background:${c}"></button>`).join('')}</div></div>
   <div class="adbtns"><button type="button" class="btn ghost sm" data-act="adMove" data-v="${i}|-1"${i?'':' disabled'} aria-label="Move up">↑</button><button type="button" class="btn ghost sm" data-act="adMove" data-v="${i}|1"${i<it.length-1?'':' disabled'} aria-label="Move down">↓</button><button type="button" class="btn ghost sm" data-act="adDel" data-v="${i}" aria-label="Remove">✕</button></div></div>`).join(''):`<p class="small muted" style="margin:14px 0 0">No ads. Save like this to hide the ad window at ${v==='default'?'every venue without its own ads':esc(venueOf(v).name)}.</p>`}</div>
  <label class="upload" id="adUp">${ICON.upload}<span>Add a picture or video</span><input type="file" accept="image/*,video/*" id="adFile" multiple></label>
  <div class="adurl"><input id="adUrl" type="url" placeholder="Or paste a link to a picture or video" aria-label="Link to a picture or video"><button type="button" class="btn ghost sm" data-act="adAddUrl">Add</button></div>
  <button type="button" class="btn brand wide" style="margin-top:16px" data-act="adSave">Save ads for ${esc(v==='default'?'the default set':venueOf(v).name)}</button>
  ${v!=='default'&&adOwn(v)&&!ADS[v]?`<button type="button" class="btn ghost wide" style="margin-top:10px" data-act="adUseDefault">Use the default ads at ${esc(venueOf(v).name)}</button>`:''}`;syncGliders()}
async function adUpload(files){if(!adEd||!files||!files.length)return;const up=$('adUp');
 for(const f of files){const t=(f.type||'').split('/')[0];if(t!=='image'&&t!=='video'){toast('Pick a picture or a video.');continue}
  if(f.size>50*1024*1024){toast(`${f.name} is over 50 MB. Try a shorter or smaller video.`,3600);continue}
  if(up){up.classList.add('busy');up.querySelector('span').textContent='Uploading…'}
  try{const ext=(f.name.split('.').pop()||t).toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'bin',path=`${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
   const {error}=await sb.storage.from('rc-ads').upload(path,f,{contentType:f.type,cacheControl:'31536000',upsert:false});if(error)throw error;
   const {data}=sb.storage.from('rc-ads').getPublicUrl(path);adEd.items.push({src:data.publicUrl,type:t,bg:t==='video'?'#000000':'#f2eee9'})}
  catch(e){toast(/row-level|403|Unauthorized/i.test(String(e&&(e.message||e.statusCode)))?'Only the developer can upload ads.':'Could not upload. Check your connection.',3600)}}
 adEdPaint()}
async function adSave(){if(!adEd||!adDev())return;const {v,items}=adEd;
 try{const {data,error}=await sb.from('rc_ads').upsert({venue:v,items,updated_at:new Date().toISOString()}).select('venue');if(error)throw error;if(!data||!data.length)throw errc('denied')}
 catch(e){return toast(e&&(e.code==='42501'||e.code==='denied')?'Only the developer can change the ads.':'Could not save. Check your connection.',3600)}
 adRows=Object.assign({},adRows,{[v]:items});adKey='';closeSheet();paintAds();doneTick(v==='default'?'Default ads saved':`Ads saved for ${venueOf(v).name}`)}
async function adUseDefault(){if(!adEd||adEd.v==='default')return;const v=adEd.v;
 try{const {error}=await sb.from('rc_ads').delete().eq('venue',v);if(error)throw error}catch(e){return toast('Could not save. Check your connection.')}
 const r=Object.assign({},adRows);delete r[v];adRows=r;adKey='';adEdStart(v);paintAds();toast(`${venueOf(v).name} now shows the default ads`)}
document.addEventListener('change',e=>{if(e.target.id==='adFile'){adUpload([...e.target.files]);e.target.value=''}});
document.addEventListener('keydown',e=>{if(!adFull)return;if(e.key==='Escape'){e.stopPropagation();adClose()}else if(e.key==='ArrowLeft')adFullShow(adFull.i-1);else if(e.key==='ArrowRight')adFullShow(adFull.i+1)},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&sb&&adRows!==null)loadAds()});

function render(){
 if(!me())return showAuth();
 after=()=>{};const t=view.tab,html=(VIEWS[t]||VIEWS.home)();
 $('main').innerHTML=`<div class="view">${html}</div>`;mountBar();
 $('meBtn').innerHTML=avHTML(me());paintBadge();paintVenues();
 paintDock(t);
 $('banner').innerHTML=Store.mode==='demo'?''
  :S.needSql?`<div class="banner"><b>Almost ready.</b> The inbox and score confirmations switch on once a club admin runs the latest <b>setup.sql</b> in Supabase.</div>`
  :Store.mode==='local'&&t==='home'?`<div class="banner"><b>Preview mode.</b> Accounts and scores stay on this device until the live database is connected (see SETUP.md).</div>`:'';
 paintAds();
 syncGliders();reveal($('main'));after();onScroll();
}
let after=()=>{};
function paintDock(t){qsa('#dock>button').forEach(b=>{if(b.dataset.v===t){if(b.getAttribute('aria-current')!=='page'){b.classList.remove('play');void b.offsetWidth;b.classList.add('play');setTimeout(()=>b.classList.remove('play'),1000)}b.setAttribute('aria-current','page')}else b.removeAttribute('aria-current')});syncGliders()}
function openHudle(){const w=window.open(HUDLE_URL,'_blank');if(w){try{w.opener=null}catch(e){}}else location.href=HUDLE_URL}
function go(t){if(t===view.tab&&t!=='add'){window.scrollTo({top:0,behavior:calm()?'auto':'smooth'});return}
 if(t==='rank'&&S.uid){after=()=>{};return loadRank(false)}
 if(t==='add'&&view.tab!=='add')A=null;view.tab=t;after=()=>{};window.scrollTo(0,0);render()}
const mySports=()=>{const p=me();return(p.sports&&p.sports.length?p.sports:SP_KEYS)};
const adminChip=(id,v=VID)=>isDev(id)?' <span class="chip dev">Developer</span>':isOwner(id,v)?' <span class="chip owner">Owner</span>':isAdmin(id,v)?' <span class="chip admin">Admin</span>':isCoach(id,v)?' <span class="chip coach">Coach</span>':'';
const unread=()=>S.msgs.filter(m=>!m.read).length;
function paintBadge(){const b=$('ibadge');if(b){const n=unread();b.textContent=n?String(n>99?'99+':n):''}}
function timeAgo(iso){const s=(Date.now()-new Date(iso))/1e3;if(s<60)return'Just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' h ago';return dateLabel(isoIST(new Date(iso)))}
const setsStr=sets=>(sets||[]).map(s=>s[0]+'–'+s[1]).join(', ');
/* The score as the viewer sees it: their team's score first, and whether they won, lost or drew */
function myResult(m,uid=S.uid){const inA=m.a.some(s=>s&&s.uid===uid),inB=m.b.some(s=>s&&s.uid===uid);if(!inA&&!inB)return null;
 const sets=(m.sets||[]).map(x=>inA?x:[x[1],x[0]]),res=m.winner==='draw'?'drew':(m.winner==='a')===inA?'won':'lost';
 return{res,sets,html:`<b class="res-${res}">Your team ${res}</b> <span class="num">${setsStr(sets)}</span>`}}
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
  <p class="small muted">${rk?`#${rk.pos} of ${rk.of} in ${TIER_NAME[t]} · `:''}${e.n?`${e.w} won, ${e.l} lost`:'Play a match to get ranked'}</p>${spark(e.hist,sp)}${(levelVotes(sp,id)||{}).html||''}</div>`;
}
function slotName(s){if(!s)return'';if(s.uid){const p=prof(s.uid);if(!p)return'Former member';const w=(p.name||'').trim().split(/\s+/).filter(x=>/^[\p{L}]/u.test(x));return first(p)+(w.length>1?' '+w[w.length-1][0]+'.':'')}return(s.name||'Guest')+' (guest)'}
function slotAv(s){if(s&&s.uid){const p=prof(s.uid);if(p)return avHTML(p)}return avHTML({name:s&&s.name||'G'})}
const ST_LABEL={pending:'Awaiting confirmation',disputed:'Under review',reviewed:'Score set by an admin',confirmed:'Confirmed'};
function matchRow(m,opts={}){
 const D=S.D[m.id],sets=m.sets||[],aw=m.winner==='a',bw=m.winner==='b',mineD=D&&D.d&&D.d[opts.for||S.uid],st=(S.ST[m.id]||{}).st;
 const team=(t,w)=>`<div class="tm${w?' win':''}"><span class="avs">${m[t].map(slotAv).join('')}</span><span>${m[t].map(s=>esc(slotName(s))).join(' & ')}</span></div>`;
 const acts=[];if(opts.hist)acts.push(st==='disputed'?`<button class="btn revbtn" data-act="review" data-v="${esc(m.id)}">${ICON.search}<span>Review score</span></button>`:'',`<button class="btn link small" data-act="gameEdit" data-v="${esc(m.id)}">Edit game</button>`,`<button class="btn link small dangerl" data-act="gameCancel" data-v="${esc(m.id)}">Cancel game</button>`);
 else if(isAdmin()&&!lockedGame(m))acts.push(st==='disputed'?`<button class="btn revbtn" data-act="review" data-v="${esc(m.id)}">${ICON.search}<span>Review score</span></button>`:`<button class="btn link small" data-act="gameEdit" data-v="${esc(m.id)}">Edit game</button>`);
 if(!opts.hist&&regsOf(m).includes(S.uid)&&regsOf(m).length>1)acts.unshift(`<button class="btn link small" data-act="kudos" data-v="${esc(m.id)}">Send kudos 👍</button>`);
 if(opts.del&&!lockedGame(m)&&(m.by===S.uid||isAdmin()))acts.push(`<button class="btn link small" data-act="delMatch" data-v="${esc(m.id)}">Delete</button>`);
 return `<div class="mrow rv${st==='disputed'?' disp':''}"><div class="side">${team('a',aw)}${team('b',bw)}
  <div class="mmeta"><span>${SPORTS[m.sport].name} · ${esc(whenOf(m))}${st==='disputed'?` · <span class="stx st-${st}">${ST_LABEL[st]}</span>`:''}</span>${mineD!==undefined?`<span class="delta ${dcls(mineD)}">${fmtD(mineD)}</span>`:''}</div>
  ${opts.hist?histBy(m):''}${acts.length?`<div class="macts">${acts.join('')}</div>`:''}</div>
  <div class="sets num">${sets.map(s=>`<div><span class="${+s[0]>+s[1]?'w':'l'}">${+s[0]}</span><span class="${+s[1]>+s[0]?'w':'l'}">${+s[1]}</span></div>`).join('')}${Array.isArray(m.extra)?`<div class="xset" title="Extra set, played for fun after the match was decided"><span>${+m.extra[0]}</span><span>${+m.extra[1]}</span></div>`:''}</div></div>`;
}
/* ---------- Game history (admins and above) ----------
   Every game logged at the club in the last 7 days, newest first. Older games drop off this list on their own,
   but they stay in everyone's level and the rankings. Admins can edit a game's score or players, or cancel it. */
const histGames=()=>S.matches.filter(okMatch).filter(m=>m.date>=addDays(today(),-(HIST_DAYS-1))).sort(byWhen).reverse();
/* "Caelan DaCosta (Owner)": the staff member's full name and role at the club, for notices */
const staffName=(id,v=VID)=>{const p=prof(id);return (p?p.name:'An admin')+' ('+ROLE_NAME[roleAt(id,v)]+')'};
function histBy(m){const by=prof(m.by),ed=(m.edits||[]).slice(-1)[0],ep=ed&&prof(ed.by);
 return `<p class="tiny muted hby">Logged by ${esc(by?by.name:'a member')}${m.logged?' for the players':''}${ed?` · edited by ${esc(ep?ep.name:'an admin')}`:''}</p>`}
function histSection(){
 const gs=histGames(),n=view.histAll?gs.length:5;
 return `<div class="sec"><h2>Game history</h2><span class="small muted">Last ${HIST_DAYS} days · ${gs.length}</span></div>
  <p class="small muted histnote">Every score logged at ${esc(VEN().name)} this week. Edit the score or players, or cancel a game, and the players are told. Games leave this list after ${HIST_DAYS} days; their points stay in the rankings.</p>
  <div class="list">${gs.slice(0,n).map(m=>matchRow(m,{for:'-',hist:1})).join('')||`<div class="card empty rv"><b>No games this week</b>Scores logged at this club in the last ${HIST_DAYS} days appear here.</div>`}</div>
  ${gs.length>n?`<button class="btn ghost wide" style="margin-top:10px" data-act="histMore">Show all ${gs.length} games</button>`:''}`}
/* The edit pop-up keeps its changes in G while a player is being picked */
let G=null;
function gameSheet(mid){
 const m=S.matches.find(x=>x.id===mid);if(!m||!isAdmin())return;if(lockedGame(m))return toast('This game is over a week old, so its score is final.');
 if(!G||G.mid!==mid)G={mid,a:m.a.map(x=>Object.assign({},x)),b:m.b.map(x=>Object.assign({},x)),rows:[0,1,2].map(i=>m.sets[i]?m.sets[i].map(String):i===2&&Array.isArray(m.extra)?m.extra.map(String):['',''])};
 const sl=(t,i)=>{const x=G[t][i],lv=x&&x.uid?lvlOf(m.sport,x.uid):x&&x.level;return`<button type="button" class="slot filled" data-act="egPick" data-v="${t}${i}">${slotAv(x)}<span class="sn"><b>${esc(slotName(x))}</b><span>${lv!=null?'Level '+fmtL(lv,x.uid?2:1):''} · Change</span></span></button>`};
 openSheet(`<h2>Edit game</h2><p class="muted small">${SPORTS[m.sport].name} · ${esc(whenOf(m))} · logged by ${esc(prof(m.by)?prof(m.by).name:'a member')}</p>
  <div class="teams eteams" style="margin-top:12px"><div class="team"><p class="eyebrow">Team 1</p>${G.a.map((_,i)=>sl('a',i)).join('')}</div><span class="vs">VS</span><div class="team"><p class="eyebrow">Team 2</p>${G.b.map((_,i)=>sl('b',i)).join('')}</div></div>
  <h3 style="margin-top:16px">Score</h3>
  <div>${scoreGrid(m.sport,G.rows,'eg',[teamHead('Team 1',G.a,false),teamHead('Team 2',G.b,false)],-1)}</div>
  <p class="ferr" id="egErr"></p>
  <p class="small muted">Levels and rankings are worked out again with the new result. Everyone in the game, and anyone you take out of it, gets a message saying you made the change.</p>
  <button class="btn brand wide" id="egSave" style="margin-top:12px">Save changes</button>
  <button class="btn danger wide" style="margin-top:10px" data-act="gameCancel" data-v="${esc(m.id)}">Cancel this game</button>`,bg=>{
  bindGrid('eg',G.rows,null,m.sport);
  bg.querySelector('#egSave').onclick=()=>saveGameEdit(m.id)});
}
function egPicker(key){
 const m=S.matches.find(x=>x.id===G.mid);if(!m)return;const t=key[0],i=+key[1],cur=G[t][i];
 openSheet(`<h2>Change player</h2><p class="muted small">${SPORTS[m.sport].name} · Team ${t==='a'?1:2} · replacing ${esc(slotName(cur))}</p>
  <div class="search" style="margin-top:14px">${ICON.search}<input id="egQ" type="search" placeholder="Search members" aria-label="Search members"></div>
  <div class="pickl" id="egL"></div><p class="tiny muted" style="margin-top:8px">Members of this club with a ${SPORTS[m.sport].name.toLowerCase()} level.</p>
  <button class="btn ghost wide" style="margin-top:12px" data-act="egBack">Back to the game</button>`,bg=>{
  const paint=()=>{const q=(bg.querySelector('#egQ').value||'').trim().toLowerCase(),used=[...G.a,...G.b].filter(Boolean).map(x=>x.uid);
   const list=S.profiles.filter(p=>p.setup&&inVenue(p)&&lvlOf(m.sport,p.id)!=null&&!used.includes(p.id)&&(!q||(p.name+' '+p.username).toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,40);
   bg.querySelector('#egL').innerHTML=list.map(p=>{const r=lvlOf(m.sport,p.id);return`<button type="button" data-eg="${p.id}">${avHTML(p)}<span class="nm"><b>${esc(p.name)}</b><span>@${esc(p.username)}</span></span><span class="chip t-${tierOf(m.sport,r)} num">${fmtL(r)}</span></button>`}).join('')||'<p class="small muted" style="padding:8px 4px">No members found.</p>';
   qsa('[data-eg]',bg).forEach(el=>el.onclick=()=>{const id=el.dataset.eg;G[t][i]={uid:id,level:+fmtL(lvlOf(m.sport,id))};tick();gameSheet(G.mid)})};
  bg.querySelector('#egQ').oninput=paint;paint()});
}
const slotKey=x=>x?(x.uid||'g:'+x.name):'';
const teamsKey=m=>[m.a,m.b].map(t=>t.map(slotKey).sort().join('+')).join('|');
async function saveGameEdit(mid){
 const m=S.matches.find(x=>x.id===mid),err=t=>{const e=$('egErr');if(e)e.textContent=t;toast(t)};if(!m||!G)return;
 const rs=readSetsOf(m.sport,G.rows);if(rs.err)return err(rs.err);
 const nm0={a:G.a,b:G.b},ids=regsOf(nm0);if(new Set(ids).size!==ids.length)return err('The same player is in the game twice.');
 const what=[];if(setsStr(rs.sets)!==setsStr(m.sets)||setsStr(rs.extra?[rs.extra]:[])!==setsStr(Array.isArray(m.extra)?[m.extra]:[]))what.push('score');if(teamsKey(nm0)!==teamsKey(m))what.push('players');
 if(!what.length)return err('Nothing has changed yet.');
 const at=new Date().toISOString(),nm=Object.assign({},m,{a:G.a,b:G.b,sets:rs.sets,winner:rs.winner,review:{by:S.uid,at,prev:m.sets,kept:false},edits:[...(m.edits||[]),{by:S.uid,at,what,prevSets:m.sets,prevA:m.a,prevB:m.b}]});
 if(rs.extra)nm.extra=rs.extra;else delete nm.extra;
 const btn=$('egSave');if(btn){btn.disabled=true;btn.textContent='Saving…'}
 try{await Store.updateMatch(nm)}catch(e){if(btn){btn.disabled=false;btn.textContent='Save changes'}return err(e.code==='denied'?'Only admins at this club can change games.':'Could not save. Check your connection.')}
 upsert(S.matches,nm);rate();G=null;closeSheet();doneTick('Game updated');
 const before=regsOf(m),after=regsOf(nm);
 notify([...new Set([...before,...after])].map(to=>({to,kind:'game_edit',data:{match:nm.id,what,prev:setsStr(m.sets),removed:!after.includes(to),added:!before.includes(to),snap:gameSnap(m)}})));
 toast('Game saved. Rankings updated and the players have been told.',3600);render();
}
const gameSnap=m=>({sport:m.sport,date:m.date,time:m.time,len:m.len,sets:m.sets,a:m.a.map(slotName),b:m.b.map(slotName)});
const snapLine=s=>`<span class="scoreline">${esc((s.a||[]).join(' & '))} <span class="muted">vs</span> ${esc((s.b||[]).join(' & '))} · ${setsStr(s.sets)}</span>`;
/* New at this club: no games here yet, so not ranked here yet */
function yetCard(){if(S.uid&&mySports().some(sp=>S.R[sp][S.uid]&&S.R[sp][S.uid].n))return'';
 return`<button class="card todo hov rv yetcard" data-act="go" data-v="add"><span class="mi">${ICON.bars(1)}</span><span><b>Yet to play at ${esc(VEN().name)}</b><span class="small muted">You’re not ranked here yet. Log your first game at this club and you’ll join its rankings.</span></span><span class="go">›</span></button>`}
function vHome(){
 const p=me(),ms=S.matches.filter(okMatch).sort(byWhen).reverse(),mine=ms.filter(m=>regsOf(m).includes(S.uid));
 const players=S.profiles.filter(x=>x.setup&&inVenue(x)).length,wk=S.matches.filter(okMatch).filter(m=>m.date>=addDays(today(),-6)).length;
 const todo=S.msgs.filter(needsAction),disputes=S.matches.filter(m=>(S.ST[m.id]||{}).st==='disputed').length;
 const up=myBookings(),toConfirm=pendingBookings().length,todayB=S.bookings.filter(b=>b.date===today()&&isGame(b)&&bkStatus(b)==='confirmed').length;
 return `<div class="card hero rv"><p class="eyebrow">${esc(greet())}</p><h1>${esc(first(p))}, ready to play?</h1>
  <p class="muted" style="margin-top:6px">${esc(VEN().name)} · ${players} player${players===1?'':'s'} · ${wk} game${wk===1?'':'s'} played this week.</p>
  <div class="cta">${hasSlots()?'<button class="btn ball" data-act="go" data-v="book">Book a court</button>':bookLinkBtn(VEN(),'btn ball')}<button class="btn ghost" data-act="go" data-v="add">Add score</button></div></div>${yetCard()}${moveUpCard()}
  ${isAdmin()?`<div class="card admincard rv"><div class="lhead"><span class="eyebrow">Admin</span><span class="chip admin">Admin</span></div>
   <div class="astats">${hasSlots()?`<button data-act="go" data-v="book"><b class="num">${toConfirm}</b><span>booking${toConfirm===1?'':'s'} to confirm</span></button><button data-act="go" data-v="book"><b class="num">${todayB}</b><span>game${todayB===1?'':'s'} today</span></button>`:''}<button data-act="ibTodo"><b class="num">${disputes}</b><span>score${disputes===1?'':'s'} to review</span></button></div></div>`:''}
  ${isAdmin()?histSection():''}
  ${todo.length?`<button class="card todo hov rv" data-act="ibTodo"><span class="mi">${ICON.mail}</span><span><b>${todo.length} thing${todo.length===1?'':'s'} need${todo.length===1?'s':''} you</b><span class="small muted">Scores to confirm, invites and bookings in your inbox</span></span><span class="go">›</span></button>`:''}
  ${hasSlots()?`<div class="sec"><h2>Your next games</h2><button class="btn link small" data-act="go" data-v="book">Book</button></div>
  <div class="list">${up.slice(0,3).map(bookingRow).join('')||`<div class="card empty rv"><b>Nothing booked</b>Find a free slot, invite players and pay at the court when you arrive.</div>`}</div>`:`<div class="sec"><h2>Play next</h2><button class="btn link small" data-act="go" data-v="book">Courts</button></div>${bookCard(true)}`}
  <div class="sec"><h2>Your levels</h2><button class="btn link small" data-act="go" data-v="rank">Rankings</button></div>
  <div class="grid2">${mySports().map(sp=>levelCard(sp,S.uid)).join('')}</div>
  <div class="sec"><h2>Your recent games</h2></div>
  <div class="list">${mine.slice(0,4).map(m=>matchRow(m)).join('')||`<div class="card empty rv"><b>No games yet</b>Played today? Add the score and your level starts to move.</div>`}</div>
  <div class="sec"><h2>Where to find us</h2></div>
  ${mapCard(VEN())}
  ${otherClubs()}
  <div class="sec"><h2>Around the club</h2></div>
  <div class="list">${ms.filter(m=>!mine.includes(m)).slice(0,6).map(m=>matchRow(m,{for:'-'})).join('')||`<div class="card empty rv"><b>Quiet on court</b>Scores from everyone in the club will appear here.</div>`}</div>`;
}
function seg(key,label,items,cur,act){return `<div class="seg full" data-key="${key}" role="radiogroup" aria-label="${esc(label)}">${items.map(([v,n])=>`<button type="button" role="radio" aria-checked="${v===cur}" data-act="${act}" data-v="${v}">${esc(n)}</button>`).join('')}</div>`}
function vRank(){
 const ms=mySports(),vs=vSports();if(!view.rs||!vs.includes(view.rs)){view.rs=ms.find(k=>vs.includes(k))||vs[0];view.rt=null}const sp=view.rs;
 if(!view.rt){const e=S.R[sp][S.uid];view.rt=e?tierOf(sp,e.r):'intermediate'}
 const g=view.rg||'all',t=view.rt,all=Object.entries(S.R[sp]).filter(([id])=>{const p=prof(id);return p&&p.setup&&(g==='all'||p.gender===g)}).map(([id,e])=>({id,e,p:prof(id)}));
 const inT=all.filter(x=>tierOf(sp,x.e.r)===t),ranked=inT.filter(x=>x.e.n).sort((a,b)=>b.e.r-a.e.r),wait=inT.filter(x=>!x.e.n).sort((a,b)=>b.e.r-a.e.r);
 const counts=Object.fromEntries(TIERS.map(([k])=>[k,all.filter(x=>x.e.n&&tierOf(sp,x.e.r)===k).length]));
 const tag=id=>{const c=coachOf(id);return isDev(id)||isAdmin(id)?adminChip(id):c&&(c.sports||[]).includes(sp)?' <span class="chip coach">Coach</span>':''};
 const row=(x,i)=>`<button class="rrow rv${x.id===S.uid?' mine':''}"${x.id===S.uid?' id="rkMe"':''} data-act="player" data-v="${x.id}"><span class="rk">${i+1}</span>${avHTML(x.p)}<span class="nm"><b><span class="nmt">${esc(x.p.name)}</span>${tag(x.id)}</b><span>@${esc(x.p.username)} · ${x.e.w}W · ${x.e.l}L</span></span><span class="sc"><b class="num">${fmtL(x.e.r)}</b><span class="delta ${dcls(x.e.last)}">${fmtD(x.e.last)}</span></span></button>`;
 const pod=ranked.slice(0,3),order=[1,0,2].filter(i=>pod[i]);
 const MET=['gold','silver','bronze'],myPos=ranked.findIndex(x=>x.id===S.uid);
 const goal=myPos<0?'':myPos<3?`<p class="goal">You're on the ${['gold','silver','bronze'][myPos]} step. Hold on to it.</p>`:`<p class="goal">You're #${myPos+1}. <b>${fmtL(Math.max(.01,pod[2].e.r-ranked[myPos].e.r))}</b> more to reach the podium.</p>`;
 const podium=pod.length>=3?`<div class="podium">${order.map(i=>{const x=pod[i];return`<button class="pod p${i+1} ${MET[i]} rv${x.id===S.uid?' mine':''}"${x.id===S.uid?' id="rkMe"':''} data-act="player" data-v="${x.id}"><span class="shine" aria-hidden="true"></span>${i===0?'<span class="crown" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 8.5l4.6 3.8L12 5l4.4 7.3L21 8.5 19.2 19H4.8z"/><circle cx="3" cy="8" r="1.6"/><circle cx="12" cy="4.4" r="1.6"/><circle cx="21" cy="8" r="1.6"/></svg></span>':''}<span class="medal">${i+1}</span><span class="ring">${avHTML(x.p)}</span><span class="pn">${esc(first(x.p))}</span>${tag(x.id)?`<span class="ptags">${tag(x.id)}</span>`:''}<span class="pl num">${fmtL(x.e.r)}</span><span class="ptag">${['Gold','Silver','Bronze'][i]}</span></button>`}).join('')}</div>${goal}`:'';
 return `<div class="hd"><div><p class="eyebrow">${esc(VEN().name)}</p><h1>Rankings</h1></div>${S.R[sp][S.uid]&&S.R[sp][S.uid].n?`<button class="btn ball sm findme" data-act="rankMe">${ICON.search}<span>Find me</span></button>`:''}<button class="refresh" data-act="rankRefresh" aria-label="Refresh rankings" title="Refresh">${ICON.refresh}</button></div>
  <div class="ctrls">${seg('rs','Sport',vSports().map(k=>[k,SPORTS[k].name]),sp,'rankSport')}
  ${seg('rt','Ranking',TIERS.map(([k,n])=>[k,`${n}${counts[k]?' · '+counts[k]:''}`]),t,'rankTier')}
  ${seg('rg','Players',[['all','All'],['male','Men'],['female','Women']],g,'rankGender')}</div>
  <p class="small muted" style="margin:-4px 0 14px">${TIER_NAME[t]} ${SPORTS[sp].name.toLowerCase()}: levels ${t==='beginner'?'below '+fmtL(SPORTS[sp].cut[0],1):t==='intermediate'?fmtL(SPORTS[sp].cut[0],1)+' to '+fmtL(SPORTS[sp].cut[1]-.01):fmtL(SPORTS[sp].cut[1],1)+' and up'}. ${t==='pro'?'Pro is invite only: the club owner picks players and invites them in.':'Players move up a ranking as their level rises.'} Every score counts as soon as it’s logged. If a score is disputed it still counts until an admin changes it.</p>
  ${podium}<div class="list">${(pod.length>=3?ranked.slice(3).map((x,i)=>row(x,i+3)):ranked.map(row)).join('')}</div>
  ${!ranked.length?`<div class="card empty rv"><b>No one ranked here yet</b>Add a score and the ranking fills up.</div>`:''}
  ${wait.length?`<div class="sec"><h3>Yet to play</h3><span class="small muted">${wait.length}</span></div><div class="list">${wait.map(x=>`<button class="rrow rv${x.id===S.uid?' mine':''}" data-act="player" data-v="${x.id}"><span class="rk">–</span>${avHTML(x.p)}<span class="nm"><b><span class="nmt">${esc(x.p.name)}</span>${tag(x.id)}</b><span>@${esc(x.p.username)}</span></span><span class="sc"><b class="num">${fmtL(x.e.r,1)}</b></span></button>`).join('')}</div>`:''}`;
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
/* ---------- Court bookings ----------
   Players book here and pay at the court. An admin confirms each booking (and blocks the same time on Hudle by hand
   while Hudle is still in use), then everyone in the game is told. Prices are per 30-minute slot and admins set them. */
const DEF_PRICE=1000;
const priceCfg=()=>Object.assign({base:DEF_PRICE,rules:[]},(S.cfg&&S.cfg.prices)||{});
const DOW_WEEKEND=[0,6];
function ruleHits(r,court,date,i){
 if(r.court&&r.court!=='all'&&r.court!==court)return false;if(i<r.from||i>=r.to)return false;
 const dow=new Date(date+'T12:00:00').getDay();
 if(r.days==='weekdays')return !DOW_WEEKEND.includes(dow);if(r.days==='weekends')return DOW_WEEKEND.includes(dow);
 if(r.days==='date')return r.date===date;if(r.days==='dow')return (r.dow||[]).includes(dow);return true}
function slotPrice(court,date,i){const c=priceCfg();let p=+c.base||DEF_PRICE;(c.rules||[]).forEach(r=>{if(ruleHits(r,court,date,i))p=+r.price});return p}
const rangePrice=(court,date,s,len)=>{let t=0;for(let i=s;i<s+len;i++)t+=slotPrice(court,date,i);return t};
const DAYS_TXT={all:'Every day',weekdays:'Weekdays (Mon–Fri)',weekends:'Weekends (Sat–Sun)'};
const DOW_N=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ruleText=r=>`${r.days==='date'?dateLabel(r.date):r.days==='dow'?(r.dow||[]).map(d=>DOW_N[d]).join(', '):DAYS_TXT[r.days]||'Every day'} · ${slotRange(r.from,r.to-r.from)} · ${r.court&&r.court!=='all'?SPORTS[r.court].name:'Both courts'}`;
const bkStatus=b=>b.status||'confirmed';
const isGame=b=>b.kind==='game';
const goingOf=b=>[b.by,...(b.going||[])];
const myBookings=()=>S.bookings.filter(b=>isGame(b)&&bkEnd(b)>new Date()&&(b.by===S.uid||(b.invited||[]).includes(S.uid))&&!(b.declined||[]).includes(S.uid)).sort((x,y)=>(x.date+pad(x.start)).localeCompare(y.date+pad(y.start)));
const pendingBookings=()=>S.bookings.filter(b=>(isGame(b)||b.kind==='block')&&bkStatus(b)==='pending'&&bkEnd(b)>new Date());
const stChip=b=>bkStatus(b)==='pending'?'<span class="chip st-pending">Waiting for the club to confirm</span>':'<span class="chip st-confirmed">Confirmed</span>';
function bookingRow(b){
 if(b.kind==='block'){const c=prof(b.by);return `<button class="mrow brow rv" data-act="bkOpen" data-v="${esc(b.id)}"><span class="bdate"><b>${new Date(b.date+'T12:00:00').getDate()}</b>${new Date(b.date+'T12:00:00').toLocaleDateString('en-IN',{month:'short'})}</span>
  <span class="side"><b>${COURTS[b.court]} · ${esc(b.reason||'Coaching')}</b><span class="small muted">${esc(dateLabel(b.date))} · ${slotRange(b.start,b.len)}</span><span class="tiny muted">Blocked by ${b.by===S.uid?'you':esc(c?c.name:'a coach')}${isCoach(b.by)?' (coach)':''}</span>${bkStatus(b)==='pending'?'<span class="chip st-pending">Waiting for an admin to confirm</span>':'<span class="chip st-confirmed">Confirmed</span>'}</span>
  <span class="avs">${avHTML(c||{name:'?'})}</span></button>`}
 const host=prof(b.by),you=b.by===S.uid,inv=(b.invited||[]).includes(S.uid)&&!(b.going||[]).includes(S.uid)&&!you,g=goingOf(b);
 return `<button class="mrow brow rv" data-act="bkOpen" data-v="${esc(b.id)}"><span class="bdate"><b>${new Date(b.date+'T12:00:00').getDate()}</b>${new Date(b.date+'T12:00:00').toLocaleDateString('en-IN',{month:'short'})}</span>
  <span class="side"><b>${COURTS[b.court]}</b><span class="small muted">${esc(dateLabel(b.date))} · ${slotRange(b.start,b.len)}</span>
  <span class="tiny ${inv?'invt':'muted'}">${inv?'You are invited by '+esc(first(host)):(you?'You are hosting':'Hosted by '+esc(host?first(host):'a member'))+' · '+g.map(id=>id===S.uid?'You':esc(first(prof(id))||'?')).join(', ')}</span>${stChip(b)}</span>
  <span class="avs">${g.slice(0,4).map(id=>avHTML(prof(id)||{name:'?'})).join('')}</span></button>`;
}
function bkState(){if(!view.bk)view.bk={court:mySports()[0]||'padel',day:today(),sel:null,block:false,invite:[]};return view.bk}
const dayBookings=(court,day)=>S.bookings.filter(b=>b.court===court&&b.date===day);
function cellOf(i){const bk=bkState(),b=dayBookings(bk.court,bk.day).find(x=>i>=x.start&&i<x.start+x.len),past=slotDate(bk.day,i)<=new Date();
 const sel=bk.sel&&i>=bk.sel[0]&&i<=bk.sel[1];return{b,past,sel}}
const inGame=b=>b.by===S.uid||(b.invited||[]).includes(S.uid);
function cellHTML(i){
 const bk=bkState(),{b,past,sel}=cellOf(i);let cls='free',sub='Open';
 if(b){if(b.kind==='block'){cls='blocked';sub=b.reason||'Closed';if(bkStatus(b)==='pending'){cls+=' pend';if(isAdmin()||b.by===S.uid)sub+=' · to confirm'}}
  else if(inGame(b)&&!(b.declined||[]).includes(S.uid)){cls='mine';sub=b.by===S.uid?'Your game':'Invited'}
  else{cls='booked';sub=isAdmin()?goingOf(b).map(id=>first(prof(id))||'?').join(', '):'Booked'}
  if(isGame(b)&&bkStatus(b)==='pending'){cls+=' pend';if(isAdmin())sub='To confirm · '+sub}
  if(i!==b.start)cls+=' cont'}
 else if(sel){cls='sel';sub=bk.block?'Block':'Selected'}
 if(past&&!b)cls+=' past';
 return `<button type="button" class="sl ${cls}" data-act="slot" data-v="${i}" ${past&&!b?'aria-disabled="true"':''}><b>${slotLabel(i)}</b><span>${esc(sub)}</span>${b?'':`<em>${rupees(slotPrice(bk.court,bk.day,i))}</em>`}</button>`;
}
function slotsHTML(){
 const parts=[['Morning',0,12],['Afternoon',12,22],['Evening',22,NSLOT]];
 return parts.map(([n,a,z])=>`<p class="eyebrow period">${n}</p><div class="slots">${Array.from({length:z-a},(_,k)=>cellHTML(a+k)).join('')}</div>`).join('');
}
function bkBarHTML(){const bk=bkState();if(!bk.sel)return'';const [s,e]=bk.sel,len=e-s+1;
 return `<div class="bkbar"><div class="grow"><b class="price">${bk.block?'Close '+durLabel(len):rupees(rangePrice(bk.court,bk.day,s,len))+' · '+durLabel(len)}</b><br><span class="muted">${esc(dateLabel(bk.day))} · ${slotRange(s,len)}</span></div><button class="btn ghost sm" data-act="slotClear">Clear</button><button class="btn ${bk.block?'danger':'brand'} sm" data-act="${bk.block?'blockGo':'bookGo'}">${bk.block?'Block':isAdmin()?'Book':'Request booking'}</button></div>`}
/* The Book bar floats above the dock. It lives outside the page (the page animates with a transform, which would pin it to the page instead of the screen) */
function mountBar(){let h=$('bkFloat');if(!h){h=document.createElement('div');h.id='bkFloat';document.body.appendChild(h)}
 const on=view.tab==='book'&&!$('app').hidden,html=on?bkBarHTML():'';if(h.dataset.h!==html){h.innerHTML=html;h.dataset.h=html}const sp=$('bkBar');if(sp)sp.innerHTML=html?'<div style="height:96px" aria-hidden="true"></div>':''}
function paintSlots(){const g=$('slotGrid');if(g)g.innerHTML=slotsHTML();mountBar()}
/* Clubs that book on their own site: the Book page links there and lists the courts */
function bookCard(small){const v=VEN(),n=sp=>(v.courtNos[sp]||[]).length;
 return `<div class="card bookcard rv"><b>${small?'Book your court on '+esc(v.book.name):esc(v.short)+' books courts on '+esc(v.book.name)}</b><p class="small muted" style="margin-top:4px">${small?'Then come back and add the score to climb the '+esc(v.short)+' rankings.':'Pick a time and pay on '+esc(v.book.name)+', the way you always have. After your game, add the score here to climb the '+esc(v.short)+' rankings.'}</p>
  ${small?'':`<div class="bc-courts">${SP_KEYS.filter(sp=>n(sp)).map(sp=>`<span><b class="num">${n(sp)}</b>${SPORTS[sp].name} court${n(sp)===1?'':'s'}</span>`).join('')}</div>`}
  ${!small&&v.also?`<p class="small muted" style="margin:${SP_KEYS.some(sp=>n(sp))?0:10}px 0 14px">${esc(v.also)} are on ${esc(v.book.name)} too. Rankings here are for padel and pickleball.</p>`:''}
  <div style="margin-top:${small?12:0}px">${bookLinkBtn(v)}</div></div>`}
function otherClubs(){const o=VENUES.filter(v=>v.id!==VID);if(!o.length)return'';
 return `<div class="sec"><h2>More clubs on OneCourt</h2><span class="small muted">${o.length}</span></div><div class="vlist">${o.map(v=>`<button class="card vrow hov rv" data-act="venue" data-v="${v.id}">${vMark(v)}<span class="grow"><b>${esc(v.name)}</b><span class="small muted">${esc(v.place||v.area)} · ${esc(v.courts)}</span></span><span class="small muted">${isMember(S.uid,v.id)?'Switch':'Sign in'} ›</span></button>`).join('')}</div>`}
function vLinkBook(){const ns=nudges();
 return `<div class="hd"><div><p class="eyebrow">Courts</p><h1>Book a court</h1></div></div>${bookCard()}
  ${ns.length?`<div class="sec"><h2>For you</h2></div><div class="list">${ns.map(([i,t,p])=>`<div class="card nudge rv"><span class="ng-i" aria-hidden="true">${i}</span><div><b>${esc(t)}</b><p class="small muted">${esc(p)}</p></div></div>`).join('')}</div>`:''}
  <div class="sec"><h2>Where to find us</h2></div>${mapCard(VEN())}`}
function vBook(){
 if(!hasSlots())return vLinkBook();
 const bk=bkState(),days=Array.from({length:14},(_,k)=>addDays(today(),k)),v=VEN(),up=myBookings(),adm=isAdmin(),pend=pendingBookings();
 after=()=>{clearInterval(factT);let i=0;const n=FACTS.length;
  const show=k=>{const el=$('factCar');if(!el){clearInterval(factT);return}i=(k+n)%n;qsa('#factCar .fact').forEach((f,j)=>f.classList.toggle('on',j===i));qsa('#factDots button').forEach((d,j)=>d.setAttribute('aria-current',String(j===i)))};
  show(0);if(!calm())factT=setInterval(()=>show(i+1),5500);
  vBook.show=k=>{show(k);clearInterval(factT);if(!calm())factT=setInterval(()=>show(i+1),5500)};
 };
 if(S.needSql)return `<div class="hd"><div><p class="eyebrow">Courts</p><h1>Book a court</h1></div></div><div class="card empty rv"><b>Bookings are almost ready</b>A club admin needs to run the latest setup.sql in Supabase to switch them on.</div>`;
 const n=dayBookings(bk.court,bk.day).filter(isGame).length,ns=nudges();
 return `<div class="hd"><div><p class="eyebrow">Courts</p><h1>${adm?'Court schedule':'Book a court'}</h1></div>${adm?`<button class="btn ghost sm" data-act="priceOpen">₹ Slot prices</button>`:''}</div>
  ${adm&&pend.length?`<div class="card admincard rv"><b>${pend.length} booking${pend.length===1?'':'s'} to confirm</b><p class="small muted" style="margin:4px 0 10px">Confirm each one here, then block the same time on Hudle so it can't be booked twice.</p><div class="list">${pend.slice(0,6).map(bookingRow).join('')}</div></div>`:''}
  ${up.length?`<div class="sec"><h2>My games</h2><span class="small muted">${up.length}</span></div><div class="list">${up.map(bookingRow).join('')}</div>`:''}
  <p class="eyebrow period">Court</p>
  ${seg('bc','Court',Object.keys(COURTS).map(k=>[k,COURTS[k]]),bk.court,'bkCourt')}
  <div class="dstrip" role="group" aria-label="Day">${days.map(d=>{const dt=new Date(d+'T12:00:00');return`<button type="button" class="dchip" aria-pressed="${d===bk.day}" data-act="bkDay" data-v="${d}"><span>${d===today()?'Today':dt.toLocaleDateString('en-IN',{weekday:'short'})}</span><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('en-IN',{month:'short'})}</span></button>`}).join('')}</div>
  ${bk.invite.length?`<div class="card invnote rv"><span>Inviting ${bk.invite.map(id=>esc(first(prof(id)))).join(', ')}. Pick a free time, then tap Book.</span><button class="btn link small" data-act="bkInvClear">Clear</button></div>`:''}
  ${adm||isCoach()?`<div class="card rv"><div class="setline"><div><b>${adm?'Block slots':'Block slots for coaching'}</b><p class="small muted">${adm?'Close the court for coaching, maintenance or events. Players see it as closed.':coachOf().auto?'Pick the times you’re coaching. They’re blocked straight away.':'Pick the times you’re coaching. An admin confirms each block, and you get a message when it’s done.'}</p></div><button class="switch" role="switch" aria-checked="${!!bk.block}" data-act="bkBlock" aria-label="Block slots"></button></div></div>`:''}
  <div class="legend"><span><i class="lg-free"></i>Free</span><span><i class="lg-mine"></i>Your games</span><span><i class="lg-booked"></i>Booked</span><span><i class="lg-block"></i>Closed</span><span class="muted">${n} game${n===1?'':'s'} this day</span></div>
  <p class="small muted" style="margin:-4px 0 4px">Tap an open time, then the next ones to make it longer (up to ${MAX_GAME/2} hours). Prices are per 30 minutes and you <b>pay at the court when you arrive</b>. The club confirms each booking and you get a message when it's done. All times are Indian Standard Time.${adm?' As an admin you see who is playing in each slot. Tap a booking to confirm it, see the players or cancel it.':''}</p>
  <div id="slotGrid">${slotsHTML()}</div><div id="bkBar"></div>
  ${ns.length?`<div class="sec"><h2>For you</h2></div><div class="list">${ns.map(([i,t,p])=>`<div class="card nudge rv"><span class="ng-i" aria-hidden="true">${i}</span><div><b>${esc(t)}</b><p class="small muted">${esc(p)}</p></div></div>`).join('')}</div>`:''}
  <div class="sec"><h2>Why play padel?</h2></div>
  <div class="card factcar rv" id="factCar" aria-live="polite">${FACTS.map(([i,t,p],k)=>`<div class="fact${k===0?' on':''}"><span class="fc-i" aria-hidden="true">${i}</span><b>${esc(t)}</b><p class="muted">${esc(p)}</p></div>`).join('')}
   <div class="fdots" id="factDots">${FACTS.map((_,k)=>`<button type="button" data-act="factGo" data-v="${k}" aria-label="Fact ${k+1}" aria-current="${k===0}"></button>`).join('')}</div></div>
  <div class="sec"><h2>Where to find us</h2></div>
  ${mapCard(v)}`;
}
function rangeFree(a,z){for(let i=a;i<=z;i++){const c=cellOf(i);if(c.b||c.past)return false}return true}
function bookSheet(){
 const bk=bkState(),[s,e]=bk.sel,len=e-s+1,sp=bk.court,fr=friendIds();
 openSheet(`<h2>Book ${COURTS[bk.court]}</h2><p class="muted small">${esc(VEN().name)}, ${esc(VEN().area)} · ${esc(dateLabel(bk.day))} · ${slotRange(s,len)} · ${durLabel(len)}</p>
  <div class="pricebox"><span>Court price<br><span class="tiny muted">Pay at the court when you arrive</span></span><b>${rupees(rangePrice(bk.court,bk.day,s,len))}</b></div>
  <label>Invite players <span class="muted">(optional)</span></label>
  <div class="invmode">${fr.length?`<button type="button" class="fchip${bk.allFriends?' on':''}" aria-pressed="${!!bk.allFriends}" data-act="invAll">Invite all my friends · ${fr.length}</button>`:'<span class="small muted">Add friends on the Players page to invite them all at once.</span>'}</div>
  <p class="tiny muted" style="margin:8px 0 0">${bk.allFriends?'All your friends get the invite. The first 3 to say yes get the spots.':'Or pick up to 3 players: your friends or anyone open to game invites.'}</p>
  <div class="chips" id="invChips" style="margin-top:10px"></div>
  <div class="search" style="margin-top:10px">${ICON.search}<input id="invQ" type="search" placeholder="Search friends and players" aria-label="Search players"></div>
  <div class="pickl" id="invR" style="max-height:30vh"></div>
  <label for="bNote">Note <span class="muted">(optional)</span></label><input id="bNote" maxlength="80" placeholder="e.g. Friendly doubles, all levels welcome">
  <p class="tiny muted" style="margin-top:10px">The club confirms your booking. You and everyone who joins get a message once it's confirmed.</p>
  <p class="ferr" id="bErr"></p><button class="btn brand wide" data-act="bookSave">Request booking</button>`,bg=>{bg.querySelector('#invQ').oninput=paintInv;paintInv()});
 function paintInv(){
  const q=($('invQ').value||'').trim().toLowerCase(),my=lvlOf(sp,S.uid)??3;
  $('invChips').innerHTML=bk.invite.map(id=>`<button type="button" class="fchip on" data-act="invDel" data-v="${id}">${esc(first(prof(id)))} ✕</button>`).join('')||'<span class="small muted">No one picked yet. You can also just book the court.</span>';
  const list=S.profiles.filter(p=>p.setup&&p.id!==S.uid&&(p.invites||isFriend(p.id))&&!bk.invite.includes(p.id)&&(!q||(p.name+' '+p.username).toLowerCase().includes(q)))
   .sort((a,b)=>(isFriend(b.id)-isFriend(a.id))||Math.abs((lvlOf(sp,a.id)??9)-my)-Math.abs((lvlOf(sp,b.id)??9)-my)).slice(0,25);
  $('invR').innerHTML=list.map(p=>{const r=lvlOf(sp,p.id);return`<button type="button" data-act="invAdd" data-v="${p.id}">${avHTML(p)}<span class="nm"><b>${esc(p.name)}${isFriend(p.id)?' <span class="chip st-confirmed" style="font-size:10px;padding:1px 7px">Friend</span>':''}</b><span>@${esc(p.username)}${(p.times||[]).length?' · '+(p.times||[]).map(t=>lbl(TIMES,t)).join(', '):''}</span></span>${r!=null?`<span class="chip t-${tierOf(sp,r)} num">${fmtL(r,1)}</span>`:''}</button>`}).join('')||'<p class="small muted" style="padding:8px 4px">No players found. Only friends and players open to game invites show here.</p>';
 }
 bookSheet.paint=paintInv;
}
function blockSheet(){
 const bk=bkState(),[s,e]=bk.sel,len=e-s+1;
 openSheet(`<h2>${isAdmin()?'Close '+COURTS[bk.court]:'Block '+COURTS[bk.court]+' for coaching'}</h2><p class="muted small">${esc(dateLabel(bk.day))} · ${slotRange(s,len)}</p>
  ${isAdmin()?'':`<p class="small" style="margin-top:12px">Reason: <b>Coaching</b>${coachOf().auto?'':' · an admin confirms it'}</p>`}
  ${!isAdmin()?'':`<label>Reason</label><div class="chips" id="rsn">${['Coaching','Maintenance','Private event','Tournament','Booked on Hudle','Closed'].map((x,i)=>`<button type="button" class="fchip${i?'':' on'}" aria-pressed="${!i}" data-act="rsn" data-v="${x}">${x}</button>`).join('')}</div>`}
  <label for="bNote">Note for players <span class="muted">(optional)</span></label><input id="bNote" maxlength="80" placeholder="e.g. Junior coaching clinic">
  <p class="ferr" id="bErr"></p><button class="btn danger wide" data-act="blockSave">${isAdmin()||coachOf().auto?'Block these slots':'Ask to block these slots'}</button>`);
}
function bookingSheet(id){
 const b=S.bookings.find(x=>x.id===id);if(!b)return toast('That booking was cancelled.');
 const when=`${esc(dateLabel(b.date))} · ${slotRange(b.start,b.len)}`,future=slotDate(b.date,b.start)>new Date(),started=!future,adm=isAdmin();
 if(b.kind==='block')return openSheet(`<h2>${esc(b.reason||'Closed')}</h2><p class="muted small">${COURTS[b.court]} · ${when}</p>${b.note?`<p style="margin-top:10px">${esc(b.note)}</p>`:''}
  ${bkStatus(b)==='pending'?'<div style="margin-top:10px"><span class="chip st-pending">Waiting for an admin to confirm</span></div>':''}
  ${adm||b.by===S.uid?`<p class="small muted" style="margin-top:10px">Blocked by ${b.by===S.uid?'you':esc(prof(b.by)?prof(b.by).name:'an admin')}${isCoach(b.by)?' (coach)':''}</p>`:''}
  ${adm&&bkStatus(b)==='pending'&&future?`<div class="cta"><button class="btn brand" data-act="bkConfirm" data-v="${esc(b.id)}">Confirm block</button><button class="btn ghost" data-act="bkReject" data-v="${esc(b.id)}">Decline</button></div>`:''}
  ${adm||b.by===S.uid?`<button class="btn danger wide" style="margin-top:16px" data-act="bkCancel" data-v="${esc(b.id)}">Unblock</button>`:''}
  <button class="btn ghost wide" style="margin-top:10px" data-act="closeSheet">Close</button>`);
 const host=prof(b.by),seeAll=adm||inGame(b),going=b.going||[],declined=b.declined||[],pend=bkStatus(b)==='pending';
 const status=id=>id===b.by?'<span class="chip ball">Host</span>':going.includes(id)?'<span class="chip st-confirmed">Going</span>':declined.includes(id)?'<span class="chip st-disputed">Can’t make it</span>':'<span class="chip st-pending">Invited</span>';
 const pending=(b.invited||[]).includes(S.uid)&&!going.includes(S.uid)&&!declined.includes(S.uid);
 const acts=[];
 if(adm&&pend&&future)acts.push(`<button class="btn brand" data-act="bkConfirm" data-v="${esc(b.id)}">Confirm booking</button><button class="btn ghost" data-act="bkReject" data-v="${esc(b.id)}">Decline</button>`);
 if(pending&&future)acts.push(`<button class="btn brand" data-act="bkAccept" data-v="${esc(b.id)}">I’m in</button><button class="btn ghost" data-act="bkDecline" data-v="${esc(b.id)}">Can’t make it</button>`);
 if(going.includes(S.uid)&&future)acts.push(`<button class="btn ghost" data-act="bkDecline" data-v="${esc(b.id)}">Can’t make it any more</button>`);
 if(started&&(b.by===S.uid||going.includes(S.uid)))acts.push(`<button class="btn ball" data-act="bkScore" data-v="${esc(b.id)}">Add the score</button>`);
 if(started&&(b.by===S.uid||going.includes(S.uid))&&goingOf(b).some(u=>u!==S.uid))acts.push(`<button class="btn ghost" data-act="reportOpen" data-v="b|${esc(b.id)}">Report late or no-show</button>`);
 if(future&&(b.by===S.uid||adm))acts.push(`<button class="btn danger" data-act="bkCancel" data-v="${esc(b.id)}">Cancel booking</button>`);
 openSheet(`<h2>${COURTS[b.court]}</h2><p class="muted small">${esc(VEN().name)} · ${when} · ${rupees(b.price||rangePrice(b.court,b.date,b.start,b.len))}, paid at the court</p>
  <div style="margin-top:10px">${stChip(b)}${!pend&&b.confirmedBy&&adm?` <span class="tiny muted">by ${esc(first(prof(b.confirmedBy))||'an admin')}</span>`:''}</div>
  ${adm&&pend?`<p class="small muted" style="margin-top:8px">After confirming, block ${slotRange(b.start,b.len)} ${(dl=>dl==='Today'||dl==='Tomorrow'?dl.toLowerCase():'on '+esc(dl))(dateLabel(b.date))} on Hudle so no one else books it there.</p>`:''}
  ${b.note?`<p style="margin-top:10px">${esc(b.note)}</p>`:''}
  ${seeAll?`<div class="pickl" style="margin-top:14px">${[b.by,...(b.invited||[])].map(id=>{const p=prof(id);return`<div class="prow2${p?' tap':''}"${p?` role="button" tabindex="0" data-act="player" data-v="${esc(id)}" aria-label="Open ${esc(p.name)}’s profile"`:''}>${avHTML(p||{name:'?'})}<span class="nm"><b>${esc(p?p.name:'Former member')}${id===S.uid?' (you)':''}</b>${adm&&id!==S.uid&&canSeePhone(id)?`<span>${phoneLink(id)}</span>`:''}</span>${status(id)}${p?'<span class="go" aria-hidden="true">›</span>':''}</div>`}).join('')}</div>`
   :`<p class="small muted" style="margin-top:12px">This time is booked by ${esc(host?first(host):'a member')}.</p>`}
  ${acts.length?`<div class="cta">${acts.join('')}</div>`:''}<button class="btn ghost wide" style="margin-top:12px" data-act="closeSheet">Close</button>`);
}
async function saveBooking(b,okMsg){
 const btn=document.querySelector('#sheetBg .btn.wide:not(.ghost)');if(btn){btn.disabled=true;btn.textContent='Saving…'}
 const live=slotDate(b.date,b.start)>new Date();if(!live){if(btn){btn.disabled=false}return $('bErr').textContent='That time has already started. Pick a later one.'}
 try{await Store.addBooking(b)}catch(e){if(btn){btn.disabled=false;btn.textContent='Try again'}
  if(e.code==='clash'){try{await reload()}catch(x){}paintSlots();return $('bErr').textContent='Someone has just booked part of this time. Pick another slot.'}
  return $('bErr').textContent='Could not book. Check your connection and try again.'}
 S.bookings.push(b);const bk=bkState();bk.sel=null;bk.invite=[];bk.allFriends=false;closeSheet();doneTick(okMsg);paintSlots();
 if(b.kind==='block'&&bkStatus(b)==='pending')notify(vAdmins().filter(a=>a!==S.uid).map(to=>({to,kind:'bk_request',data:{booking:b.id}})));
 if(isGame(b)){notify((b.invited||[]).map(to=>({to,kind:'invite',data:{booking:b.id}})));
  if(bkStatus(b)==='pending')notify(vAdmins().filter(a=>a!==S.uid).map(to=>({to,kind:'bk_request',data:{booking:b.id}})))}
 if(view.tab==='book')render();
}
async function patchBooking(b,msg=null){try{await Store.updateBooking(b)}catch(e){toast('Could not update the booking. Check your connection.');return false}upsert(S.bookings,b);if(msg)toast(msg);return true}
const bkSummary=b=>`${COURTS[b.court]}, ${playedWhen({date:b.date,time:b.start,len:b.len})}`;
/* ---------- Slot prices (admins) ---------- */
function priceSheet(){
 const c=priceCfg(),opt=(sel,end)=>Array.from({length:NSLOT},(_,k)=>end?k+1:k).map(k=>`<option value="${k}"${k===sel?' selected':''}>${slotLabel(k)}</option>`).join('');
 const P=priceSheet.d=priceSheet.d||{price:1200,from:22,to:34,days:'all',date:today(),dow:[],court:'all'};
 openSheet(`<h2>Slot prices</h2><p class="muted small">Prices are per 30-minute slot. The base price is used unless a rule below matches. When rules overlap, the one lower down wins.</p>
  <label for="pBase">Base price (₹ per slot)</label><div class="prline"><input id="pBase" type="number" inputmode="numeric" min="0" step="50" value="${+c.base||DEF_PRICE}"><button class="btn brand sm" data-act="priceBase">Save</button></div>
  <div class="sec"><h3>Price rules</h3><span class="small muted">${(c.rules||[]).length}</span></div>
  <div class="list">${(c.rules||[]).map(r=>`<div class="card prule"><div><b>${rupees(r.price)}</b><p class="small muted">${esc(ruleText(r))}</p></div><button class="btn link small" data-act="priceDel" data-v="${esc(r.id)}">Remove</button></div>`).join('')||'<p class="small muted">No rules yet. Every slot costs the base price.</p>'}</div>
  <div class="card padd"><b>Add a price</b>
   <label>Quick times</label><div class="chips">${[['Mornings',0,6,'6–9 am'],['Evenings',22,34,'5–11 pm'],['Late night',32,NSLOT,'10 pm–12 am'],['All day',0,NSLOT,'6 am–12 am']].map(([n,a,z,t])=>`<button type="button" class="fchip" data-act="priceQuick" data-v="${a}|${z}">${n} · ${t}</button>`).join('')}</div>
   <div class="grid2" style="gap:10px;margin-top:8px"><div><label for="pFrom">From</label><select id="pFrom">${opt(P.from)}</select></div><div><label for="pTo">To</label><select id="pTo">${opt(P.to,1)}</select></div></div>
   <label>Days</label><div class="chips" id="pDays">${[['all','Every day'],['weekdays','Weekdays'],['weekends','Weekends'],['today','Today only'],['date','Pick a date'],['dow','Pick days']].map(([k,n])=>`<button type="button" class="fchip${P.days===k?' on':''}" aria-pressed="${P.days===k}" data-act="priceDays" data-v="${k}">${n}</button>`).join('')}</div>
   <div id="pDate" ${P.days==='date'?'':'hidden'}><input type="date" id="pDateIn" value="${P.date}" min="${today()}" style="margin-top:8px"></div>
   <div id="pDow" class="chips" style="margin-top:8px" ${P.days==='dow'?'':'hidden'}>${DOW_N.map((n,k)=>`<button type="button" class="fchip${P.dow.includes(k)?' on':''}" aria-pressed="${P.dow.includes(k)}" data-act="priceDow" data-v="${k}">${n}</button>`).join('')}</div>
   <label>Court</label><div class="chips">${[['all','Both courts'],...SP_KEYS.map(k=>[k,SPORTS[k].name])].map(([k,n])=>`<button type="button" class="fchip${P.court===k?' on':''}" aria-pressed="${P.court===k}" data-act="priceCourt" data-v="${k}">${n}</button>`).join('')}</div>
   <label for="pPrice">Price (₹ per slot)</label><input id="pPrice" type="number" inputmode="numeric" min="0" step="50" value="${P.price}">
   <p class="ferr" id="pErr"></p><button class="btn brand wide" data-act="priceAdd">Add this price</button></div>`,bg=>{
   const sync=()=>{P.from=+$('pFrom').value;P.to=+$('pTo').value;P.price=+$('pPrice').value;const di=$('pDateIn');if(di)P.date=di.value};
   ['pFrom','pTo','pPrice','pDateIn'].forEach(k=>{const el=$(k);if(el)el.onchange=el.oninput=sync});priceSheet.sync=sync});
}
async function savePrices(c,msg){
 const cfg=Object.assign({},S.cfg||{},{prices:c});
 try{await Store.saveCfg('prices',c)}catch(e){toast(e.code==='nosql'?'Run the latest setup.sql in Supabase to save prices.':e.code==='denied'?'Only admins can change prices.':'Could not save. Check your connection.');return false}
 S.cfg=cfg;if(msg)doneTick(msg);return true;
}
/* ---------- Add a score ---------- */
let A=null;
/* the ranked sports at this club: the ones it has courts for */
const vSports=()=>{const s=SP_KEYS.filter(k=>VEN().courtNos[k]);return s.length?s:SP_KEYS};
const addSports=()=>vSports().filter(k=>S.R[k][S.uid]);
/* Admins logging a game for others can pick any sport the club has */
const aSports=()=>A&&A.others?vSports():addSports();
function newA(){const sp=addSports()[0]||mySports().find(k=>vSports().includes(k))||vSports()[0];return{sport:sp,format:'doubles',date:today(),time:null,len:0,courtNo:1,a:[{uid:S.uid},null],b:[null,null],sets:[['',''],['',''],['','']],err:''}}
function fitFormat(){const n=A.format==='singles'?1:2;['a','b'].forEach(t=>{A[t]=A[t].slice(0,n);while(A[t].length<n)A[t].push(null)});if(!A.a[0]&&!A.others)A.a[0]={uid:S.uid}}
function slotLevel(s){if(!s)return null;if(s.uid){const r=lvlOf(A.sport,s.uid);return r!=null?r:(s.level!=null?+s.level:null)}return s.level!=null?+s.level:null}
function slotHTML(t,i){
 const s=A[t][i],fixed=t==='a'&&i===0&&!A.others,lv=slotLevel(s);
 if(!s)return `<button type="button" class="slot" data-act="pick" data-v="${t}${i}"><span class="plus">+</span><span class="sn"><b>${A.others?'Add player':t==='a'?'Add your partner':'Add opponent'}</b><span>Member or guest</span></span></button>`;
 return `<${fixed?'div':'button type="button"'} class="slot filled${fixed?' fixed':''}" ${fixed?'':`data-act="pick" data-v="${t}${i}"`}>${slotAv(s)}<span class="sn"><b>${esc(fixed?'You':slotName(s))}</b><span>${lv!=null?'Level '+fmtL(lv,s.uid?2:1):'Level needed'}${s.uid?'':' · entered'}</span></span></${fixed?'div':'button'}>`;
}
/* The score grid: a clear column for each team, with who is in it, so no one types a score on the wrong side */
function teamHead(label,slots,mine){return `<div class="sh${mine?' mine':''}"><em>${esc(label)}</em><span class="avs">${(slots||[]).filter(Boolean).map(slotAv).join('')}</span><b>${esc(teamNames(slots)||'–')}</b></div>`}
function scoreGrid(sport,rows,key,heads,mineCol){const S_=SPORTS[sport];
 return `<div class="scorehead"><span></span>${heads[0]}<i></i>${heads[1]}</div><div class="sets">${rows.map((s,r)=>`<div class="setrow"><span class="eyebrow">${S_.setName} ${r+1}</span>${[0,1].map(c=>`<input class="${c===mineCol?'mine':''}" inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="${S_.setName} ${r+1}, ${c?'right':'left'} team" data-${key}="${r},${c}" value="${esc(s[c])}" placeholder="–">`).join('<i>–</i>')}</div>`).join('')}</div>`}
function bindGrid(key,rows,onChange,sport){const mx=MAX_GAMES[sport]||99;qsa(`[data-${key}]`).forEach(el=>el.oninput=()=>{const [r,c]=el.dataset[key].split(',');let v=el.value.replace(/\D/g,'').slice(0,2);if(v!==''&&+v>mx){v=rows[+r][+c]||'';toast(sport==='padel'?'A padel set has at most 7 games.':`A pickleball game goes to 11. Scores above ${mx} aren't allowed.`)}rows[+r][+c]=v;if(el.value!==rows[+r][+c])el.value=rows[+r][+c];onChange&&onChange()})}
function vAdd(){
 if(A&&A.others&&!isAdmin())A=null;
 if(!A)A=newA();fitFormat();const O=!!A.others;const S_=SPORTS[A.sport],days=Array.from({length:30},(_,k)=>addDays(today(),-k));
 after=()=>{bindGrid('set',A.sets,paintFair,A.sport);paintFair();const d=document.querySelector('.dstrip .dchip[aria-pressed="true"]');if(d&&d.scrollIntoView)d.parentElement.scrollLeft=d.offsetLeft-d.parentElement.clientWidth/2+d.offsetWidth/2};
 return `<div class="hd"><div><p class="eyebrow">After the game</p><h1>Add score</h1></div></div>
 <div class="card rv">
  ${isAdmin()?`<div class="awho">${seg('aw','Who played',[['me','I played'],['others','Log for others']],O?'others':'me','aWho')}<p class="small muted" style="margin:8px 0 12px">${O?`As ${esc(ROLE_NAME[roleOf(S.uid)].toLowerCase())}, you can log any game at ${esc(VEN().name)}. Pick all the players. The score is final and they’re told you logged it.`:'Playing in this game? Log it as normal. To log a game you weren’t in, tap Log for others.'}</p></div>`:''}
  ${aSports().length>1?seg('as','Sport',aSports().map(k=>[k,SPORTS[k].name]),A.sport,'aSport'):`<p class="eyebrow">${S_.name}</p>`}
  ${O?'':vSports().filter(k=>!S.R[k][S.uid]).map(k=>`<p class="small muted" style="margin-top:10px">To add ${SPORTS[k].name.toLowerCase()} games, <button class="btn link small" data-act="retake" data-v="${k}">set your ${SPORTS[k].name.toLowerCase()} level</button> first.</p>`).join('')}
  ${A.sport==='pickleball'?`<div style="margin-top:10px">${seg('af','Format',[['doubles','Doubles'],['singles','Singles']],A.format,'aFormat')}</div>`:''}
  <label>Date played</label>
  <div class="dstrip" role="group" aria-label="Date played">${days.map(d=>{const dt=new Date(d+'T12:00:00'),k=d===today()?'Today':d===addDays(today(),-1)?'Yesterday':dt.toLocaleDateString('en-IN',{weekday:'short'});return`<button type="button" class="dchip" aria-pressed="${d===A.date}" data-act="aDate" data-v="${d}"><span>${k}</span><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('en-IN',{month:'short'})}</span></button>`}).join('')}</div>
  ${VEN().courtNos[A.sport]?`<label>Court</label>
  <div class="chips">${courtNos(A.sport).map(n=>`<button type="button" class="fchip${n===A.courtNo?' on':''}" aria-pressed="${n===A.courtNo}" data-act="aCourt" data-v="${n}">${S_.name} · Court ${n}</button>`).join('')}</div>`:''}
  <label>Time played</label>
  <button type="button" class="timepick${A.time==null?' empty':''}" data-act="aTime"><span class="tp-i">${MI.clock}</span><span class="tp-t">${A.time==null?'<b>Choose start and end time</b><span>Tap the slots you were on court</span>':`<b>${slotRange(A.time,A.len)}</b><span>${durLabel(A.len)} · ${esc(dateLabel(A.date))}</span>`}</span><span class="tp-c">›</span></button>
 </div>
 <div class="card rv"><div class="teams">
  <div class="team"><p class="eyebrow">${O?(A.format==='singles'?'Player 1':'Team 1'):A.format==='singles'?'You':'Your team'}</p>${A.a.map((_,i)=>slotHTML('a',i)).join('')}</div>
  <span class="vs">VS</span>
  <div class="team"><p class="eyebrow">${O?(A.format==='singles'?'Player 2':'Team 2'):A.format==='singles'?'Opponent':'Opponents'}</p>${A.b.map((_,i)=>slotHTML('b',i)).join('')}</div>
 </div><p class="small muted" style="margin-top:12px">Members' levels fill in on their own. For anyone without an account, you enter their level so the points stay fair.</p></div>
 <div class="card rv"><h3>Score</h3><p class="small muted" style="margin:-4px 0 14px">Games won by each team. ${A.sport==='padel'?'Best of 3 sets. Leave the third set empty if you played two.':'Games to 11, win by 2. Best of 3 games.'}</p>
  ${scoreGrid(A.sport,A.sets,'set',O?[teamHead('Team 1',A.a,0),teamHead('Team 2',A.b,0)]:[teamHead(A.format==='singles'?'You':'Your team',A.a,1),teamHead(A.format==='singles'?'Opponent':'Opponents',A.b,0)],O?-1:0)}
  <div id="s3note"></div>
  <p class="ssum" id="ssum"></p></div>
 <div class="card fair rv" id="fair"></div>
 <p class="ferr" id="aErr2" role="alert"></p>
 <button class="btn brand wide" data-act="submitMatch" style="margin-top:6px">Save score</button>
 <p class="tiny muted" style="text-align:center;margin-top:10px">${O?'Every player gets a message that you logged it. Rankings update straight away.':'The other players are asked to confirm it. If someone disagrees, an admin checks it.'}</p>`;
}
/* Which court slots are already used on this day by another logged game */
function usedSlot(i){
 /* A club that hasn't listed its courts can run games side by side, so nothing is marked taken */
 if(!VEN().courtNos[A.sport])return'';
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
 openSheet(`<h2>When did you play?</h2><p class="muted small">${SPORTS[A.sport].name}${VEN().courtNos[A.sport]?' · Court '+A.courtNo:''} · ${esc(dateLabel(A.date))}. Tap the first and last half hour you were on court. Two games can't share the same court and time.</p>
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
 return{venue:VID,sport:A.sport,format:A.format,date:A.date,time:A.time,len:A.len,court:A.courtNo,a:A.a.map(c),b:A.b.map(c)};
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
  sum.textContent=rs.sets?(rs.winner==='draw'?`It's a draw, ${rs.wa}–${rs.wb} in games won (${rs.dr} drawn at the ${PB_CAP}-point cap)`:(rs.winner==='a'?`${A.others?'Team 1':'Your team'} wins ${rs.wa}–${rs.wb}`:`${A.others?'Team 2':'Your opponents'} win${A.others?'s':''} ${rs.wb}–${rs.wa}`)+(SPORTS[A.sport].setName==='Set'?' in sets':' in games')):filled?rs.err:''}
 const el=$('fair');if(!el)return;const m=draft();
 if(!m){el.innerHTML=`<h3>Fair points</h3><p class="small muted">Add all the players to see how many points this game is worth for each of you.</p>`;return}
 const ta=avg(m.a.map(s=>s.level)),tb=avg(m.b.map(s=>s.level)),ea=1/(1+Math.pow(10,(tb-ta)/SPORTS[m.sport].scale));
 let rows;
 if(rs.sets){const pv=preview(Object.assign({},m,{sets:rs.sets,winner:rs.winner}));
  rows=[...m.a,...m.b].filter(s=>s.uid).map(s=>`<div class="prow"><span>${s.uid===S.uid?'You':esc(slotName(s))}</span><span class="delta ${dcls(pv.d[s.uid])}">${fmtD(pv.d[s.uid])}</span></div>`).join('');
  rows=`<p class="small" style="margin:10px 0 4px"><b>${rs.winner==='a'?(A.others?'Team 1 wins.':'Your team wins.'):rs.winner==='draw'?'A draw.':(A.others?'Team 2 wins.':'Your opponents win.')}</b> Points from this result:</p>${rows}`}
 else if(A.others)rows=`<p class="tiny muted" style="margin-top:6px">Enter the score to see each player’s points.</p>`;
 else{const w=preview(Object.assign({},m,{sets:[[1,0]],winner:'a'})),l=preview(Object.assign({},m,{sets:[[0,1]],winner:'b'}));
  rows=`<div class="prow"><span>If you win</span><span class="delta up">${fmtD(w.d[S.uid])}</span></div><div class="prow"><span>If you lose</span><span class="delta down">${fmtD(l.d[S.uid])}</span></div><p class="tiny muted" style="margin-top:6px">Bigger wins move the number a little more.</p>`}
 el.innerHTML=A.others?`<h3>Fair points</h3><p class="small muted">Team 1 averages <b class="num">${fmtL(ta)}</b>, Team 2 <b class="num">${fmtL(tb)}</b>. ${Math.abs(ta-tb)<.15?'An even match.':ta>tb?'Team 1 are the favourites.':'Team 2 are the favourites.'}</p>
  <div class="bar" aria-hidden="true"><i style="width:${(ea*100).toFixed(0)}%"></i><b></b></div><p class="tiny muted">Expected chance Team 1 wins: <b class="num">${Math.round(ea*100)}%</b></p>${rows}`:`<h3>Fair points</h3><p class="small muted">Your team averages <b class="num">${fmtL(ta)}</b>, your opponents <b class="num">${fmtL(tb)}</b>. ${Math.abs(ta-tb)<.15?'An even match.':ta>tb?'You are the favourites, so a win earns less and a loss costs more.':'You are the underdogs, so a win earns more and a loss costs less.'}</p>
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
 const O=!!A.others;if(O&&!isAdmin())return err('Only admins can log a game for other players.');if(O&&ids.includes(S.uid))return err('You’re in this game, so tap I played and log it as normal.');
 const rec=Object.assign(m,{id:'m_'+rid(),sets:rs.sets,winner:rs.winner,by:S.uid,at:new Date().toISOString()});if(rs.extra)rec.extra=rs.extra;if(A.booking)rec.booking=A.booking;
 if(O){rec.logged=true;rec.review={by:S.uid,at:rec.at,prev:null,kept:true}}
 const btn=document.querySelector('[data-act="submitMatch"]');btn.disabled=true;btn.textContent='Saving…';
 try{await Store.addMatch(rec)}catch(e){btn.disabled=false;btn.textContent='Save score';return err('Could not save the score. Check your connection and try again.')}
 S.matches.push(rec);rate();
 if(O){doneTick('Game logged');notify(ids.map(to=>({to,kind:'game_logged',data:{match:rec.id}})));toast(`Game logged. Rankings are updated and the ${ids.length} players have been told.`,4200);
  A=null;view.tab='home';setTimeout(()=>{window.scrollTo(0,0);render()},500);return}
 const d=S.D[rec.id]&&S.D[rec.id].d[S.uid];doneTick('Score added');
 notify(ids.filter(u=>u!==S.uid).map(to=>({to,kind:'confirm',data:{match:rec.id}})));
 toast(`Score saved. Your ${SPORTS[rec.sport].name.toLowerCase()} level ${d>0?'rises':'drops'} ${Math.abs(d||0).toFixed(2)} to ${fmtL(lvlOf(rec.sport,S.uid))}. The other players are asked to confirm.`,4200);
 view.rs=rec.sport;view.rt=tierOf(rec.sport,lvlOf(rec.sport,S.uid));A=null;view.tab='rank';setTimeout(()=>{window.scrollTo(0,0);render();if(regsOf(rec).some(u=>u!==S.uid))setTimeout(()=>postGame(rec.id),900)},500);
}

/* ---------- Inbox ---------- */
const myConf=mid=>{const m=S.matches.find(x=>x.id===mid),rv=m&&m.review&&m.review.at||'';return S.confs.filter(c=>c.match===mid&&c.user===S.uid&&(!rv||c.at>rv)).pop()};
function needsAction(g){const d=g.data||{};
 if(g.kind==='confirm'){const m=S.matches.find(x=>x.id===d.match);return !!m&&!myConf(m.id)&&!m.review&&!lockedGame(m)}
 if(g.kind==='dispute')return isAdmin()&&(S.ST[d.match]||{}).st==='disputed';
 if(g.kind==='friend_req'){const r=S.reqs.find(x=>x.id===d.req);return !!r&&r.status==='pending'}
 if(g.kind==='invite'){const b=S.bookings.find(x=>x.id===d.booking);return !!b&&slotDate(b.date,b.start)>new Date()&&!(b.going||[]).includes(S.uid)&&!(b.declined||[]).includes(S.uid)}
 if(g.kind==='admin_msg'){const th=d.thread;return isAdmin()&&g.from!==S.uid&&!S.msgs.some(x=>x.kind==='admin_reply'&&(x.data||{}).thread===th&&x.at>g.at)}
 if(g.kind==='report')return isAdmin()&&!S.conduct.some(c=>c.report===d.rep);
 if(g.kind==='bk_request'){const b=S.bookings.find(x=>x.id===d.booking);return isAdmin()&&!!b&&bkStatus(b)==='pending'&&bkEnd(b)>new Date()}
 return false}
const MI={check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
 flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
 user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M19 8v6M16 11h6"/></svg>',
 clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
 mega:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
 chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'};
function msgView(g){
 const d=g.data||{},from=prof(g.from),fn=from?first(from):'Someone',m=d.match&&S.matches.find(x=>x.id===d.match),b=d.booking&&S.bookings.find(x=>x.id===d.booking);
 const bkLine=x=>`${COURTS[x.court]} · ${esc(dateLabel(x.date))} · ${slotRange(x.start,x.len)}`,names=x=>andList(goingOf(x).filter((u,i,a)=>u!==S.uid&&a.indexOf(u)===i).map(u=>esc(first(prof(u))||'a member')));
 const score=m?(()=>{const r=myResult(m);return r?`<span class="scoreline">${r.html}<span class="teamsline">${matchLine(m)}</span></span>`:`<span class="scoreline">${matchLine(m)} · ${setsStr(m.sets)}</span>`})():'';
 const gone={i:MI.flag,t:'No longer available',p:'This game has since been removed.'};
 switch(g.kind){
  case 'confirm':{if(!m)return gone;const c=myConf(m.id);
   return{i:MI.check,t:'Is this score right?',p:`${esc(fn)} added the score of your ${SPORTS[m.sport].name.toLowerCase()} game, played ${esc(playedWhen(m))}.${score}`,
    a:m.review?'<span class="chip st-reviewed">An admin has set this score</span>':c&&c.verdict==='ok'||(!c&&lockedGame(m))?'<span class="chip st-confirmed">'+(c?'You confirmed it':'Final: this game is over a week old')+'</span>':c?`<span class="chip ${c.verdict==='ok'?'st-confirmed':'st-disputed'}">${c.verdict==='ok'?'You confirmed it':'You asked for a change'}</span>`
     :`<button class="btn brand sm" data-act="cfOk" data-v="${g.id}">Yes, confirm</button><button class="btn ghost sm" data-act="cfChange" data-v="${g.id}">Change score</button>`}}
  case 'dispute':{if(!m)return gone;const c=S.confs.find(x=>x.id===d.conf),st=(S.ST[m.id]||{}).st;
   return{i:MI.flag,warn:1,t:'Score disputed',p:`${esc(fn)} says ${esc(prof(m.by)?first(prof(m.by))+'\u2019s':'the')} score for this ${SPORTS[m.sport].name.toLowerCase()} game, played ${esc(playedWhen(m))}, is wrong.${score}${c?`<span class="scoreline prop">Their score: ${setsStr(c.sets)}</span>${c.note?`<span class="quote">“${esc(c.note)}”</span>`:''}`:''}`,
    a:st==='disputed'?(isAdmin()?`<button class="btn brand sm" data-act="review" data-v="${esc(m.id)}">Review score</button>`:''):'<span class="chip st-reviewed">Reviewed</span>'}}
  case 'disputed':{if(!m)return gone;return{i:MI.flag,t:'A score is being checked',p:`${esc(fn)} asked for the score of your game played ${esc(playedWhen(m))} to be changed. An admin will review it. Until then the score counts as it was added. If no admin changes it within a week of the game, it stays as it is.${score}`}}
  case 'game_edit':{const sn=esc(staffName(g.from,vidOf(g))),s=d.snap||{},spn=SPORTS[s.sport]?SPORTS[s.sport].name.toLowerCase():'';
   if(d.removed)return{i:MI.shield,warn:1,t:`${sn} took you out of a game`,p:`You’re no longer in this ${spn} game, played ${esc(playedWhen(s))}, so it doesn’t count for your level any more. Rankings are updated.${snapLine(s)}`};
   if(!m)return gone;const w=(d.what||[]);
   return{i:MI.shield,t:d.added?`${sn} added you to a game`:`${sn} changed ${w.includes('score')&&w.includes('players')?'the score and players of':w.includes('players')?'the players in':'the score of'} your game`,
    p:`Your ${SPORTS[m.sport].name.toLowerCase()} game played ${esc(playedWhen(m))}${d.added?' now includes you':' was edited'}. Rankings are updated.${score}${w.includes('score')&&d.prev&&!d.added?`<span class="tiny muted">Was ${esc(d.prev)}</span>`:''}`}}
  case 'game_cancel':{const sn=esc(staffName(g.from,vidOf(g))),s=d.snap||{},spn=SPORTS[s.sport]?SPORTS[s.sport].name.toLowerCase():'';
   return{i:MI.flag,warn:1,t:`${sn} cancelled a game`,p:`Your ${spn} game played ${esc(playedWhen(s))} has been removed. Levels and rankings are worked out again without it.${snapLine(s)}`}}
  case 'game_logged':{if(!m)return gone;return{i:MI.shield,t:`${esc(staffName(g.from,vidOf(g)))} logged your game`,p:`The score of your ${SPORTS[m.sport].name.toLowerCase()} game played ${esc(playedWhen(m))} was added by the club. Rankings are updated.${score}`}}
  case 'resolved':{if(!m)return gone;return{i:MI.shield,t:`${esc(staffName(g.from,vidOf(g)))} ${d.kept?'confirmed':'set'} a score`,p:`The score of your ${SPORTS[m.sport].name.toLowerCase()} game played ${esc(playedWhen(m))} is now final${d.kept?' as it was added':''}. Rankings are updated.${score}`}}
  case 'invite':{if(!b)return gone;const st=(b.going||[]).includes(S.uid)?'in':(b.declined||[]).includes(S.uid)?'out':'',past=slotDate(b.date,b.start)<=new Date();
   return{i:MI.cal,t:`${esc(fn)} invited you to play`,p:`${bkLine(b)}${bkStatus(b)==='pending'?' · waiting for the club to confirm':''}${b.note?`<span class="quote">“${esc(b.note)}”</span>`:''}`,
    a:st==='in'?'<span class="chip st-confirmed">You’re in</span>':st==='out'?'<span class="chip st-disputed">You said no</span>':past?'<span class="chip">This game has passed</span>'
     :`<button class="btn brand sm" data-act="bkAccept" data-v="${esc(b.id)}">I’m in</button><button class="btn ghost sm" data-act="bkDecline" data-v="${esc(b.id)}">Can’t make it</button><button class="btn link small" data-act="bkOpen" data-v="${esc(b.id)}">Details</button>`}}
  case 'invite_reply':return{i:MI.cal,t:`${esc(fn)} ${d.ok?'is in':'can’t make it'}`,p:b?bkLine(b):'Your booking'};
  case 'cancelled':{const s=d.snap||{};return{i:MI.cal,warn:1,t:`${esc(fn)} cancelled a game`,p:(s.court?`${COURTS[s.court]} · ${esc(dateLabel(s.date))} · ${slotRange(s.start,s.len)}`:'A game you were in was cancelled.')+(d.note?`<span class="quote">“${esc(d.note)}”</span>`:'')}}
  case 'bk_request':{if(!b)return{i:MI.cal,t:'Booking request',p:'This booking has since been cancelled or declined.'};const pend=bkStatus(b)==='pending';
   if(b.kind==='block')return{i:MI.cal,t:`${esc(fn)} (coach) wants to block ${COURTS[b.court]}`,p:`For coaching: ${esc(dateLabel(b.date))} · ${slotRange(b.start,b.len)}.${b.note?`<span class="quote">“${esc(b.note)}”</span>`:''}`,
    a:pend&&isAdmin()?`<button class="btn brand sm" data-act="bkConfirm" data-v="${esc(b.id)}">Confirm</button><button class="btn ghost sm" data-act="bkReject" data-v="${esc(b.id)}">Decline</button>`:'<span class="chip st-confirmed">Confirmed</span>'};
   return{i:MI.cal,t:`${esc(fn)} wants to book ${COURTS[b.court]}`,p:`${esc(dateLabel(b.date))} · ${slotRange(b.start,b.len)} · ${rupees(rangePrice(b.court,b.date,b.start,b.len))}, paid at the court.${goingOf(b).length>1?` Playing: ${andList(goingOf(b).map(u=>esc(first(prof(u))||'a member')))}.`:''}`,
    a:pend&&isAdmin()?`<button class="btn brand sm" data-act="bkConfirm" data-v="${esc(b.id)}">Confirm</button><button class="btn ghost sm" data-act="bkReject" data-v="${esc(b.id)}">Decline</button><button class="btn link small" data-act="bkOpen" data-v="${esc(b.id)}">Details</button>`:'<span class="chip st-confirmed">Confirmed</span>'}}
  case 'bk_confirmed':{if(!b)return gone;if(b.kind==='block')return{i:MI.shield,t:'Your coaching block is confirmed',p:`${COURTS[b.court]} on ${esc(dateLabel(b.date))}, ${slotRange(b.start,b.len)}. Players see it as closed for coaching.`};const w=names(b);
   return{i:MI.shield,t:`Your ${SPORTS[b.court].name.toLowerCase()} game is confirmed`,p:`${COURTS[b.court]} on ${esc(dateLabel(b.date))}, ${slotRange(b.start,b.len)}${w?`, with ${w}`:''}. Pay ${rupees(rangePrice(b.court,b.date,b.start,b.len))} at the court when you arrive.`,a:`<button class="btn link small" data-act="bkOpen" data-v="${esc(b.id)}">See who’s going</button>`}}
  case 'bk_declined':{const s=d.snap||{};return{i:MI.flag,warn:1,t:'Your booking couldn’t be confirmed',p:`${s.court?`${COURTS[s.court]} · ${esc(dateLabel(s.date))} · ${slotRange(s.start,s.len)}. `:''}An admin couldn’t confirm that time. Please pick another slot.`,a:'<button class="btn ghost sm" data-act="go" data-v="book">Book another time</button>'}}
  case 'community':{const au=AUD_ALL.every(k=>!d.aud||d.aud.includes(k))?'':andList(AUD.filter(x=>d.aud.includes(x[0])).map(x=>x[1].toLowerCase()));
   return{i:MI.mega,t:`${esc(fn)}${adminChip(g.from,vidOf(g))} · Club news`,p:`${esc(d.text||'').replace(/\n/g,'<br>')}${au?`<span class="tiny muted" style="display:block;margin-top:6px">Sent to ${esc(au)}</span>`:''}`,
    a:(d.link?`<a class="btn ghost sm" href="${esc(d.link)}" target="_blank" rel="noopener noreferrer">${esc(d.lt||'Open link')} ↗</a>`:'')+(from?`<button class="btn link small" data-act="player" data-v="${esc(g.from)}">View profile</button>`:'')}}
  case 'admin_msg':{const tp=(ADM_TOPICS.find(x=>x[0]===d.topic)||ADM_TOPICS[3])[1],mine=g.from===S.uid,pl=prof(d.player);
   return{i:MI.chat,t:mine?`You messaged the admins · ${tp}`:`${esc(fn)} messaged the admins · ${tp}`,p:`<span class="quote">“${esc(d.text||'')}”</span>`,
    a:isAdmin()&&!mine?`<button class="btn brand sm" data-act="admReply" data-v="${g.id}">Reply</button>${pl?`<button class="btn link small" data-act="player" data-v="${esc(d.player)}">Profile</button>`:''}`:''}}
  case 'admin_reply':{const toMe=d.player===S.uid,pl=prof(d.player);
   return{i:MI.shield,t:toMe?`${esc(fn)} (${(ROLE_RANK[roleAt(g.from,vidOf(g))]>=2?ROLE_NAME[roleAt(g.from,vidOf(g))]:'Admin').toLowerCase()}) replied`:`${g.from===S.uid?'You':esc(fn)} replied to ${esc(pl?first(pl):'a player')}`,p:`<span class="quote">“${esc(d.text||'')}”</span>`,
    a:toMe?`<button class="btn ghost sm" data-act="admReply" data-v="${g.id}">Reply</button>${prof(g.from)?`<button class="btn link small" data-act="player" data-v="${esc(g.from)}">View profile</button>`:''}`:isAdmin()&&g.from!==S.uid?`<button class="btn link small" data-act="admReply" data-v="${g.id}">Reply too</button>`:''}}
  case 'demo_access':return{i:MI.shield,t:d.on?'You have demo access':'Demo access removed',p:d.on?'You’ve been given access to demo mode. You can switch to it in Settings to see new updates before they go live.':`${esc(fn)} removed your demo access.`,a:d.on?'<button class="btn ghost sm" data-act="go" data-v="settings">Open Settings</button>':''};
  case 'pro':{const sn=SPORTS[d.sport]?SPORTS[d.sport].name:'',cl=esc(venueOf(vidOf(g)).short);return d.on?{i:MI.shield,t:`You’re invited into the ${sn} Pro ranking`,p:`${esc(fn)} picked you for the ${sn.toLowerCase()} Pro ranking at ${cl}. Your level there now starts from ${fmtL(SPORTS[d.sport].cut[1],1)} and can keep rising.`,a:'<button class="btn ghost sm" data-act="go" data-v="rank">See the rankings</button>'}:{i:MI.shield,t:`You’re back in ${sn} Intermediate`,p:`${esc(fn)} moved you out of the ${sn.toLowerCase()} Pro ranking at ${cl}. Keep winning and you can be invited back.`}}
  case 'role':return{i:MI.shield,t:(d.role==='coach'?'You’re now a coach':d.role==='owner'?'You’re now an owner':d.role==='admin'?'You’re now an admin':'You’re now a player')+' at '+esc(venueOf(vidOf(g)).short),p:d.role==='coach'?`${esc(fn)} made you a ${esc(d.title||'coach')}. You can now block slots for coaching on the Book page${d.auto?'.':'; an admin confirms each block.'}`:d.role==='owner'?`${esc(fn)} made you an owner. You can do everything an admin does, and give or remove admin access.`:d.role==='admin'?`${esc(fn)} made you an admin. You can confirm bookings, set prices, block slots and review scores.`:`${esc(fn)} changed your account back to a player account.`,a:d.role==='player'?'':'<button class="btn ghost sm" data-act="go" data-v="book">Open the Book page</button>'};
  case 'report':{const tp=prof(d.target),tn=tp?esc(tp.name):'a player',done=S.conduct.find(c=>c.report===d.rep),pn=penOf({kind:d.k,sport:d.sport});
   const what=d.k==='noshow'?'didn’t show up':'showed up late',src=d.match?S.matches.find(x=>x.id===d.match):null,bb=d.booking?S.bookings.find(x=>x.id===d.booking):null;
   const whenTxt=src?`played ${esc(playedWhen(src))}`:bb?`on ${esc(dateLabel(bb.date))}, ${slotRange(bb.start,bb.len)}`:d.date?`on ${esc(dateLabel(d.date))}`:'';
   return{i:MI.flag,warn:!done,t:`${g.from===S.uid?'You':esc(fn)} reported ${tn}`,p:`Says ${tp?esc(first(tp)):'they'} ${what} for a ${SPORTS[d.sport].name.toLowerCase()} game ${whenTxt}.${d.note?`<span class="quote">“${esc(d.note)}”</span>`:''}`,
    a:done?`<span class="chip ${done.kind==='dismissed'?'':'st-confirmed'}">${done.kind==='dismissed'?'Dismissed':'Confirmed'} by ${done.by===S.uid?'you':esc(first(prof(done.by))||'an admin')}</span>`
     :isAdmin()?`<button class="btn brand sm" data-act="repOk" data-v="${g.id}">Confirm · level −${pn.toFixed(2)}</button><button class="btn ghost sm" data-act="repNo" data-v="${g.id}">Dismiss</button>${tp?`<button class="btn link small" data-act="player" data-v="${esc(d.target)}">Profile</button>`:''}`:''}}
  case 'conduct':return{i:MI.flag,warn:1,t:d.k==='noshow'?'Marked as a no-show':'Marked as late',p:`An admin confirmed you ${d.k==='noshow'?'didn’t show up':'showed up late'} for a ${SPORTS[d.sport].name.toLowerCase()} game${d.date?` on ${esc(dateLabel(d.date))}`:''}. Your ${SPORTS[d.sport].name.toLowerCase()} level drops ${(+d.pen||0).toFixed(2)}, and it shows on your profile${d.k==='noshow'?' for 3 months':' for a month'}. If this is wrong, talk to the club.`};
  case 'report_done':return{i:MI.shield,t:'Thanks for your report',p:`An admin ${d.ok?'confirmed':'looked at'} your report${d.ok?'. The player’s profile and level are updated.':' and decided to leave it.'}`};
  case 'friend_req':{const r=S.reqs.find(x=>x.id===d.req);const st=r?r.status:'gone';
   return{i:MI.user,t:`${esc(fn)} wants to be friends`,p:from?`@${esc(from.username)} sent you a friend request.`:'',
    a:st==='pending'?`<button class="btn brand sm" data-act="reqAccept" data-v="${esc(r.id)}">Accept</button><button class="btn ghost sm" data-act="reqReject" data-v="${esc(r.id)}">Reject</button><button class="btn link small" data-act="player" data-v="${esc(g.from)}">View profile</button>`
     :`<span class="chip ${st==='accepted'?'st-confirmed':'st-disputed'}">${st==='accepted'?'You are friends':st==='rejected'?'Rejected':'Request withdrawn'}</span>`}}
  case 'friend_ok':return{i:MI.user,t:`${esc(fn)} accepted your friend request`,p:'You’re now friends.',a:`<button class="btn link small" data-act="player" data-v="${esc(g.from)}">View profile</button>`};
  case 'friend_new':return{i:MI.user,t:`${esc(fn)} added you as a friend`,p:'Your account is open, so no request was needed.',a:`<button class="btn link small" data-act="player" data-v="${esc(g.from)}">View profile</button>`};
  case 'follow':return{i:MI.user,t:`${esc(fn)} started following you`,p:from?`@${esc(from.username)}`:'',a:following(g.from)?'<span class="chip st-confirmed">You follow them too</span>':`<button class="btn ghost sm" data-act="follow" data-v="${esc(g.from)}">Follow back</button>`};
  case 'kudos':{const x=REACT.find(y=>y[0]===d.k)||REACT[0];
   return{i:`<span class="kemoji">${x[1]}</span>`,t:`${esc(from?'@'+from.username:fn)} ${x[3]}`,p:m?`For your ${SPORTS[m.sport].name.toLowerCase()} game with them, played ${esc(playedWhen(m))}.${score}`:'For your game with them.',
    a:m&&regsOf(m).includes(S.uid)?`<button class="btn ghost sm" data-act="kudos" data-v="${esc(m.id)}">Send one back</button>`:''}}
 }
 return{i:MI.check,t:'Message',p:''};
}
const ADMIN_KINDS=['admin_msg','admin_reply','dispute','disputed','resolved','report','report_done','conduct','game_edit','game_cancel','game_logged'];
const ibCat=g=>g.kind==='community'?'community':ADMIN_KINDS.includes(g.kind)?'admin':'other';
const ADM_TOPICS=[['court','Court or facilities problem'],['player','Report a player'],['booking','Booking or payment'],['other','Something else']];
const P_MAX=160,A_MAX=600,C_MAX=500;
function vInbox(){
 const all=S.msgs,todo=all.filter(needsAction),f=['todo','community','admin'].includes(view.ib)?view.ib:'all';
 const list=f==='todo'?todo:f==='all'?all:all.filter(g=>ibCat(g)===f),cnt=k=>all.filter(g=>ibCat(g)===k&&!g.read).length;
 after=()=>{const un=S.msgs.filter(g=>!g.read);if(!un.length)return;setTimeout(()=>{un.forEach(g=>{g.read=true;Store.updateMsg(g).catch(()=>{})});paintBadge()},1500)};
 const top=f==='community'?(isAdmin()?`<div class="card ibtool rv"><div><b>Post to the community</b><p class="small muted">Send it to everyone, or just the players, coaches, admins or owners. Add a link if you like.</p></div><button class="btn brand sm" data-act="commOpen">Write a post</button></div>`:'')
  :f==='admin'?(isAdmin()?'':`<div class="card ibtool rv"><div><b>Message the club admins</b><p class="small muted">A court problem, a player, a booking question. They reply here.</p></div><button class="btn brand sm" data-act="admMsgOpen">New message</button></div>`):'';
 const empty={todo:['All done','Nothing needs you right now.'],community:['No posts yet','News and updates from the club appear here.'],admin:['No messages yet',isAdmin()?'Messages from players, score disputes and reports appear here.':'Your messages with the club admins, and score reviews, appear here.'],all:['No messages yet','Scores to confirm, invites, bookings and club news arrive here.']}[f];
 return `<div class="hd"><div><p class="eyebrow">Messages</p><h1>Inbox</h1></div></div>
  ${seg('ib','Show',[['all','All'],['community',`Community${cnt('community')?' · '+cnt('community'):''}`],['admin',`Admin${cnt('admin')?' · '+cnt('admin'):''}`],['todo',`To do${todo.length?' · '+todo.length:''}`]],f,'ibTab')}
  ${f==='all'?homeCard():''}${top}
  ${`<div class="list" style="margin-top:14px">${list.map(g=>{const v=msgView(g);return`<div class="card msg rv${g.read?'':' unread'}${v.warn?' warn':''}"><span class="mi">${v.i}</span><div class="mb"><b class="mt">${v.t}</b><p>${v.p}</p><span class="tiny muted">${esc(timeAgo(g.at))}</span>${v.a?`<div class="cta">${v.a}</div>`:''}</div></div>`}).join('')
   ||`<div class="card empty rv"><b>${empty[0]}</b>${empty[1]}</div>`}</div>`}`;
}
/* A text box with a live character count */
const countBox=(id,max,ph,val='')=>`<div class="tbox"><textarea id="${id}" maxlength="${max}" rows="${max>200?5:3}" placeholder="${esc(ph)}">${esc(val)}</textarea><span class="tiny muted tcount" id="${id}N">${val.length}/${max}</span></div>`;
const bindCount=(bg,id,max)=>{const t=bg.querySelector('#'+id),n=bg.querySelector('#'+id+'N');t.oninput=()=>{n.textContent=t.value.length+'/'+max;n.classList.toggle('near',t.value.length>max*.9)}};
const safeLink=u=>{u=(u||'').trim();if(!u)return'';if(!/^https?:\/\//i.test(u))u='https://'+u;try{const x=new URL(u);return /^https?:$/.test(x.protocol)&&x.hostname.includes('.')?x.href:null}catch(e){return null}};
/* Who a community post goes to. Developers count with the owners. "Everyone" means all of them */
const AUD=[['player','Players'],['coach','Coaches'],['admin','Admins'],['owner','Owners']],AUD_ALL=AUD.map(x=>x[0]);
const audOf=id=>{const r=roleAt(id);return r==='dev'?'owner':r};
/* A link example for this club: its own Instagram if we know it, otherwise a neutral one */
const linkEg=()=>{const u=(VEN().insta||'').replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'');return u||'instagram.com/yourclub'};
/* Admins: a post every player (or just some of the club's people) gets */
function commSheet(){if(!isAdmin())return;const st={aud:[...AUD_ALL]};
 const who=()=>st.aud.length===AUD_ALL.length?`Everyone at ${esc(VEN().name)} gets`:`The ${andList(AUD.filter(x=>st.aud.includes(x[0])).map(x=>x[1].toLowerCase()))} at ${esc(VEN().name)} get`;
 openSheet(`<h2>Post to the community</h2><p class="muted small" id="cWho">${who()} this in their inbox, from you.</p>
  <label>Send to</label><div class="chips" id="cAud"><button type="button" class="fchip" data-aud="all">Everyone</button>${AUD.map(([k,n])=>`<button type="button" class="fchip" data-aud="${k}">${n}</button>`).join('')}</div>
  <label for="cText">Message</label>${countBox('cText',C_MAX,'e.g. Courts close at 9 pm on Friday for the club social. Come along!')}
  <label for="cLink">Link <span class="muted">(optional)</span></label><input id="cLink" type="url" inputmode="url" autocapitalize="none" spellcheck="false" placeholder="e.g. ${esc(linkEg())}">
  <label for="cLinkT">Link text <span class="muted">(optional)</span></label><input id="cLinkT" maxlength="40" placeholder="e.g. See the photos">
  <p class="ferr" id="cErr"></p><button class="btn brand wide" id="cSend">Send to everyone</button>`,bg=>{bindCount(bg,'cText',C_MAX);
  const paint=()=>{const all=st.aud.length===AUD_ALL.length;qsa('[data-aud]',bg).forEach(b=>{const on=b.dataset.aud==='all'?all:!all&&st.aud.includes(b.dataset.aud);b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
   $('cWho').innerHTML=`${who()} this in their inbox, from you.`;bg.querySelector('#cSend').textContent=all?'Send to everyone':'Send to '+andList(AUD.filter(x=>st.aud.includes(x[0])).map(x=>x[1].toLowerCase()))};
  /* Everyone picks every group. Picking a group while it's Everyone narrows it to just that group */
  qsa('[data-aud]',bg).forEach(b=>b.onclick=()=>{const k=b.dataset.aud,all=st.aud.length===AUD_ALL.length;
   if(k==='all')st.aud=[...AUD_ALL];else if(all)st.aud=[k];else if(st.aud.includes(k)){if(st.aud.length>1)st.aud=st.aud.filter(x=>x!==k)}else st.aud=AUD_ALL.filter(x=>x===k||st.aud.includes(x));
   $('cErr').textContent='';paint()});paint();
  bg.querySelector('#cSend').onclick=async()=>{const text=$('cText').value.trim(),link=safeLink($('cLink').value);if(!text)return $('cErr').textContent='Write a message first.';if(link===null)return $('cErr').textContent='That link doesn’t look right. Check it and try again.';
   const all=st.aud.length===AUD_ALL.length,data={text,link:link||'',lt:$('cLinkT').value.trim(),...(all?{}:{aud:[...st.aud]})};
   const to=[...new Set([...S.profiles.filter(p=>p.setup&&inVenue(p)&&(all||st.aud.includes(audOf(p.id)))).map(p=>p.id),S.uid])];
   const btn=bg.querySelector('#cSend');btn.disabled=true;btn.textContent='Sending…';
   try{for(let i=0;i<to.length;i+=200)await Store.send(to.slice(i,i+200).map(t=>({to:t,kind:'community',data})))}catch(e){btn.disabled=false;btn.textContent='Try again';return $('cErr').textContent='Could not send. Check your connection.'}
   await reload();closeSheet();doneTick('Posted');toast(`Sent to ${to.length} ${to.length===1?'person':'people'}.`);view.ib='community';render()}});
}
/* Players: a short message to the admins. Admins: a longer reply to a player */
function admMsgSheet(reply){const adm=isAdmin()&&reply&&reply.player,max=adm?A_MAX:P_MAX;const st={topic:reply?reply.topic:null};
 openSheet(`<h2>${adm?`Reply to ${esc(first(prof(reply.player))||'the player')}`:reply?'Reply to the admins':'Message the club admins'}</h2>
  <p class="muted small">${adm?'They get your reply in their inbox. The other admins see it too.':'All the club admins get this. Keep it to a sentence or two.'}</p>
  ${reply&&reply.quote?`<span class="quote">“${esc(reply.quote)}”</span>`:''}
  ${reply?'':`<label>What’s it about?</label><div class="chips" id="amT">${ADM_TOPICS.map(([k,n])=>`<button type="button" class="fchip" aria-pressed="false" data-amt="${k}">${n}</button>`).join('')}</div>`}
  <label for="amText">Message</label>${countBox('amText',max,adm?'Write your reply':'e.g. The net on court 1 is sagging on one side.')}
  <p class="ferr" id="amErr"></p><button class="btn brand wide" id="amSend">${adm?'Send reply':'Send to the admins'}</button>`,bg=>{bindCount(bg,'amText',max);
  qsa('[data-amt]',bg).forEach(b=>b.onclick=()=>{st.topic=b.dataset.amt;qsa('[data-amt]',bg).forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on))});tick();
   if(st.topic==='player'){const m=S.matches.filter(x=>regsOf(x).includes(S.uid)).sort(byWhen).pop();if(m&&regsOf(m).length>1)$('amErr').innerHTML=`Late or a no-show? <button class="btn link small" data-act="reportOpen" data-v="m|${esc(m.id)}">Report it from your last game</button>`}else $('amErr').textContent=''});
  bg.querySelector('#amSend').onclick=async()=>{const text=$('amText').value.trim();if(!text)return $('amErr').textContent='Write a message first.';if(!reply&&!st.topic)return $('amErr').textContent='Pick what it’s about.';
   const thread=reply?reply.thread:'th_'+rid(),topic=st.topic||'other',now=[];
   if(adm){const data={thread,topic,text,player:reply.player};vAdmins().forEach(a=>now.push({to:a,kind:'admin_reply',data}));now.push({to:reply.player,kind:'admin_reply',data})}
   else{const data={thread,topic,text,player:S.uid};vAdmins().filter(a=>a!==S.uid).forEach(a=>now.push({to:a,kind:'admin_msg',data}));now.push({to:S.uid,kind:'admin_msg',data})}
   if(!vAdmins().length)return $('amErr').textContent='No admins are set up yet.';
   const btn=bg.querySelector('#amSend');btn.disabled=true;
   try{await Store.send(now)}catch(e){btn.disabled=false;return $('amErr').textContent='Could not send. Check your connection.'}
   await reload();closeSheet();doneTick(adm?'Reply sent':'Sent to the admins');view.ib='admin';render()}});
}
/* A player says the score is wrong: they enter what they think it was, and admins and the other players hear about it */
function disputeSheet(mid,msgId){
 const m=S.matches.find(x=>x.id===mid);if(!m)return;const rows=[0,1,2].map(i=>m.sets[i]?m.sets[i].map(String):['','']),mc=m.a.some(s=>s.uid===S.uid)?0:1;
 openSheet(`<h2>What was the score?</h2><p class="muted small">${SPORTS[m.sport].name} · ${esc(whenOf(m))}. Enter the score you think is right. Admins and the other players will see it, and an admin will decide.</p>
  <div style="margin-top:14px">${scoreGrid(m.sport,rows,'ds',[teamHead(mc===0?'Your team':'Opponents',m.a,mc===0),teamHead(mc===1?'Your team':'Opponents',m.b,mc===1)],mc)}</div>
  <label for="dNote">What happened? <span class="muted">(optional)</span></label><input id="dNote" maxlength="140" placeholder="e.g. We won the third set 6–4">
  <p class="ferr" id="dErr"></p><button class="btn brand wide" id="dSave">Send to the admins</button>`,bg=>{
  bindGrid('ds',rows,null,m.sport);
  bg.querySelector('#dSave').onclick=async()=>{const rs=readSetsOf(m.sport,rows);if(rs.err){$('dErr').textContent=rs.err;return}
   if(setsStr(rs.sets)===setsStr(m.sets)){$('dErr').textContent='That is the same as the score already added. Change it, or confirm it instead.';return}
   const c={id:'c_'+rid(),match:m.id,user:S.uid,verdict:'dispute',sets:rs.sets,winner:rs.winner,note:$('dNote').value.trim(),at:new Date().toISOString()};
   try{await Store.addConf(c)}catch(e){$('dErr').textContent='Could not send. Check your connection.';return}
   S.confs.push(c);rate();closeSheet();doneTick('Sent to the admins');
   const admins=vAdmins().filter(a=>a!==S.uid);
   notify([...admins.map(to=>({to,kind:'dispute',data:{match:m.id,conf:c.id}})),...regsOf(m).filter(u=>!admins.includes(u)).map(to=>({to,kind:'disputed',data:{match:m.id}}))]);
   toast(admins.length?'Sent. An admin will check the score. It keeps counting as added unless an admin changes it within a week of the game.':'Sent. No admins are set up yet, so ask the club to check it.',4200);render()}});
}
/* Admins: set the final score. Everyone in the game and the other admins are told who changed it */
function reviewSheet(mid){
 const m=S.matches.find(x=>x.id===mid);if(!m||!isAdmin())return;if(lockedGame(m))return toast('This game is over a week old, so its score is final.');const st=S.ST[m.id]||{},disp=st.disp||[];
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
   notify([...regsOf(nm),...vAdmins()].filter((x,i,a)=>a.indexOf(x)===i).map(to=>({to,kind:'resolved',data:{match:nm.id,sets:nm.sets,kept:nm.review.kept}})));
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
  <div class="chips" style="margin:12px 0 18px">${chip('inv',true,'Open to game invites')}${SP_KEYS.map(k=>chip('sport',k,SPORTS[k].name)).join('')}${TIMES.map(t=>chip('time',t[0],t[1])).join('')}</div>
  <div class="list" id="pList"></div>`;
}
function paintPlayers(){
 const f=view.pf,pv=view.pv||'all',q=f.q.trim().toLowerCase(),el=$('pList');if(!el)return;const fr=friendIds();
 const match=p=>p.setup&&(pv==='all'||(pv==='friends'?fr.includes(p.id):following(p.id)))&&(!q||(p.name+' '+p.username).toLowerCase().includes(q))&&(!f.inv||p.invites)&&(!f.sport||(p.sports||[]).includes(f.sport))&&(!f.time||(p.times||[]).includes(f.time));
 const ord=(a,b)=>(a.id===S.uid)-(b.id===S.uid)||(fr.includes(b.id)-fr.includes(a.id))||a.name.localeCompare(b.name);
 const list=S.profiles.filter(p=>inVenue(p)&&match(p)).sort(ord);
 /* Friends and Following belong to the account, so the ones who play elsewhere show under "At other clubs" */
 const away=pv==='all'?[]:S.profiles.filter(p=>p.id!==S.uid&&!inVenue(p)&&match(p)).sort(ord);
 const cardOf=p=>{const r=p.id===S.uid?null:relWith(p.id).st;return`<div class="card pcard hov rv" role="button" tabindex="0" data-act="player" data-v="${p.id}">${avHTML(p)}<div class="pi"><b>${esc(p.name)}${p.id===S.uid?' <span class="muted small">(you)</span>':''}${adminChip(p.id)}</b><span class="small muted">@${esc(p.username)}${r==='friends'?' · <span class="frtag">Friend</span>':''}${following(p.id)?' · Following':''}${r==='incoming'?' · <span class="invt">Wants to be friends</span>':''}</span>
  <div class="tags">${(p.sports||[]).map(sp=>{const lv=lvlOf(sp,p.id);return lv!=null?`<span class="chip t-${tierOf(sp,lv)}">${SPORTS[sp].name} ${fmtL(lv,1)}</span>`:''}).join('')}${p.invites?'<span class="chip ball">Open to game invites</span>':''}<span class="chip">${esc(lbl(SIDES,p.side))}</span></div></div></div>`};
 const awayHTML=away.length?`<div class="pgh rv"><b>At other clubs · ${away.length}</b><span class="small muted">${pv==='friends'?'Your friends':'People you follow'} who don’t play at ${esc(VEN().name)} yet</span></div>`+away.map(p=>cardOf(p).replace('<div class="tags">',`<div class="tags">${clubsOf(p.id).map(v=>`<span class="chip">${esc(venueOf(v).name)}</span>`).join('')}`)).join(''):'';
 el.innerHTML=(list.length?list.map(cardOf).join(''):away.length?`<div class="card empty rv"><b>${pv==='friends'?'No friends here yet':'No one you follow plays here yet'}</b>They play at other clubs. See them below.</div>`:'')+awayHTML
  ||`<div class="card empty rv"><b>${pv==='friends'?'No friends yet':pv==='following'?'Not following anyone yet':'No players match'}</b>${pv==='all'?'Try fewer filters.':'Open a player’s profile to add them as a friend or follow them.'}</div>`;
 reveal(el);
}
/* ---------- My profile ---------- */
function vMe(){
 const p=me(),mg=view.mg||'all',all_=S.matches.filter(okMatch).filter(m=>regsOf(m).includes(S.uid)).sort(byWhen).reverse(),mine=mg==='all'?all_:all_.filter(m=>m.sport===mg);
 const sw=(k,t,s)=>`<div class="setline"><div><b>${t}</b><p class="small muted">${s}</p></div><button class="switch" role="switch" aria-checked="${!!prefs[k]}" data-act="pref" data-v="${k}" aria-label="${t}"></button></div>`;
 return `<div class="card phead rv"><div class="phtools"><button class="gearbtn hot" data-act="go" data-v="settings" aria-label="Settings" title="Settings"><span class="g">${ICON.gear}</span></button>${Store.mode==='demo'?'':`<button class="gearbtn out" data-act="signOut" aria-label="Sign out" title="Sign out">${ICON.logout}</button>`}</div><div class="avbig" style="width:112px;height:112px">${avHTML(p,112)}</div><h1 style="margin-top:12px">${esc(p.name)}</h1><p class="muted">@${esc(p.username)}${adminChip(S.uid)}</p>${clubLines(p.id)}${joinedLine(p)}${reliaHTML(p.id)}
  <div class="fstats"><button data-act="pvGo" data-v="friends"><b class="num">${friendIds().length}</b>friends</button><span><b class="num">${followerN(S.uid)}</b>followers</span><button data-act="pvGo" data-v="following"><b class="num">${followingN(S.uid)}</b>following</button></div>
  <div class="cta" style="justify-content:center"><button class="btn ghost sm" data-act="editProfile">Edit profile</button><button class="btn ghost sm" data-act="go" data-v="inbox">Inbox${unread()?' · '+unread():''}</button></div></div>
  ${isAdmin()?`<div class="card admincard rv" style="margin-top:12px"><b>Admin tools</b><p class="small muted" style="margin:4px 0 12px">You can review, edit or delete any score, including the date and time it was played.</p><div class="cta" style="margin-top:0"><button class="btn ghost sm" data-act="ibTodo">Scores to review</button></div></div>`:''}
  <div class="sec"><h2>Levels</h2></div><div class="grid2">${mySports().map(sp=>levelCard(sp,S.uid)).join('')}</div>
  <div class="sec"><h2>How you play</h2><button class="btn link small" data-act="editProfile">Edit</button></div>
  <div class="card rv"><dl class="prefs"><dt>Sports</dt><dd>${(p.sports||[]).map(s=>SPORTS[s].name).join(' and ')||'–'}</dd><dt>Gender</dt><dd>${esc(lbl(GENDERS,p.gender))||'Not set yet. Tap Edit profile.'}</dd><dt>Hand</dt><dd>${esc(lbl(HANDS,p.hand))||'–'}</dd><dt>Court side</dt><dd>${esc(lbl(SIDES,p.side))||'–'}</dd><dt>Plays</dt><dd>${(p.times||[]).map(t=>lbl(TIMES,t)).join(', ')||'–'}</dd><dt>Invites</dt><dd>${p.invites?'Open to game invites':'Not right now'}</dd><dt>Phone</dt><dd>${myPhone()?`${esc(myPhone().phone)} <span class="muted small">· ${esc(lbl(PH_WHO,myPhone().vis||'admins'))} can see it</span>`:'Not added.'} <button class="btn link small" data-act="phEdit">${myPhone()?'Change':'Add'}</button></dd></dl>
  <p class="tiny muted" style="margin-top:10px">Change any of this with Edit. Your starting level questions are only asked once; after that your level moves with your games.</p></div>
  <div class="sec"><h2>Your games</h2><span class="small muted">${mine.length}</span></div>
  <div style="margin-bottom:12px">${seg('mg','Show games',[['all',`All · ${all_.length}`],...SP_KEYS.map(k=>[k,`${SPORTS[k].name} · ${all_.filter(m=>m.sport===k).length}`])],mg,'mgTab')}</div>
  <div class="list">${mine.map(m=>matchRow(m,{del:1})).join('')||`<div class="card empty rv"><b>${mg==='all'?'No games yet':'No '+SPORTS[mg].name.toLowerCase()+' games yet'}</b>Your scores and points will show here.</div>`}</div>
  <button class="card setlink hov rv" data-act="go" data-v="settings"><span class="sico" data-a="spin">${ICON.gear}</span><span><b>Settings</b><span class="small muted">Theme, notifications, sounds, pop-ups, friend requests and your account</span></span><span class="go">›</span></button>
  ${Store.mode==='demo'?'':`<button class="btn danger wide" style="margin-top:14px" data-act="signOut">Sign out</button>`}`;
}

/* ---------- Level: drop a tier, or move back up when close ---------- */
function lvSettingRow(sp){
 const E=S.R[sp][S.uid],S_=SPORTS[sp];if(!E)return'';const t=tierOf(sp,E.r),i=TIER_KEYS.indexOf(t),off=moveUpOffer(sp);
 const lower=TIER_KEYS.slice(0,i);
 return `<div class="lvset"><div class="lvtop"><b>${S_.name}</b><span class="chip t-${t}">${TIER_NAME[t]} · <span class="num">${fmtL(E.r)}</span></span></div>
  ${i===1&&E.pcap!=null?`<p class="small muted">Pro is invite only. Win games to climb Intermediate${E.r>=E.pcap-1e-9?' (you’re at the top)':''}; the club owner invites players into the Pro ranking.</p><div class="cta" style="margin-top:8px"><button class="btn ghost sm" data-act="proLock" data-v="${sp}">${ICON.lock}<span>Move up to Pro</span></button></div>`:''}
  ${E.cap!=null&&!(i===1&&E.pcap!=null)?`<p class="small muted">You chose a lower level. You won't move up to ${TIER_NAME[TIER_KEYS[i+1]]} on your own: win games to get within ${LV_CLOSE.toFixed(1)} of ${fmtL(S_.cut[i],1)} and you can choose to move up.</p>`:''}
  ${off?`<div class="cta" style="margin-top:8px"><button class="btn brand sm" data-act="lvUp" data-v="${sp}">Move up to ${TIER_NAME[off.nt]}</button></div>`:''}
  ${lower.length?`<div class="cta" style="margin-top:8px">${lower.reverse().map(k=>`<button class="btn ghost sm" data-act="lvDrop" data-v="${sp}|${k}">Drop to ${TIER_NAME[k]}</button>`).join('')}</div>`:(E.cap==null?`<p class="small muted">You're in the first tier, so there's no lower level to drop to.</p>`:'')}</div>`;
}
function lvDropSheet(sp,k){
 const E=S.R[sp][S.uid],S_=SPORTS[sp],t=tierOf(sp,E.r),to=dropTo(sp,k);
 openSheet(`<h2>Drop to ${TIER_NAME[k]}?</h2><p class="muted">Your ${S_.name.toLowerCase()} level goes from <b class="num">${fmtL(E.r)}</b> (${TIER_NAME[t]}) to <b class="num">${fmtL(to)}</b> (${TIER_NAME[k]}).</p>
  <div class="warnbox"><b>Are you sure?</b><p class="small" style="margin:6px 0 0">You can't switch back yourself, and you won't move back up automatically. You'll have to win games to earn it. When you get within ${LV_CLOSE.toFixed(1)} of ${TIER_NAME[TIER_KEYS[TIER_KEYS.indexOf(k)+1]]} (${fmtL(capFor(sp,k)+.01,1)}), you'll be asked if you want to move up.</p></div>
  <button class="btn danger wide" style="margin-top:16px" data-act="lvDropYes" data-v="${sp}|${k}">Yes, drop to ${TIER_NAME[k]}</button>
  <button class="btn ghost wide" style="margin-top:10px" data-act="closeSheet">Cancel</button>`);
}
async function addLevelAdj(sp,a){
 const p=JSON.parse(JSON.stringify(me()));p.levels=p.levels||{};const L=p.levels[sp]=p.levels[sp]||{};L.adj=(L.adj||[]).concat([a]);
 await Store.saveProfile(p);upsert(S.profiles,p);rate();
}
async function lvDropYes(sp,k){
 const E=S.R[sp][S.uid],from=TIER_KEYS[Math.max(TIER_KEYS.indexOf(tierOf(sp,E.r)),TIER_KEYS.indexOf(dropFrom(sp,S.uid)||'beginner'))];
 try{await addLevelAdj(sp,{kind:'drop',at:new Date().toISOString(),r:dropTo(sp,k),cap:capFor(sp,k),from})}catch(e){return toast('Could not save. Check your connection and try again.')}
 closeSheet();doneTick(`You're now ${TIER_NAME[k]}`);render();
}
function lvUpSheet(sp){
 const off=moveUpOffer(sp);if(!off)return;const S_=SPORTS[sp];
 openSheet(`<h2>You're close to ${TIER_NAME[off.nt]}</h2><p class="muted">Your ${S_.name.toLowerCase()} level is <b class="num">${fmtL(off.r)}</b>, right at the top of ${TIER_NAME[off.t]}. Do you want to stay, or move up to the bottom of ${TIER_NAME[off.nt]} (<b class="num">${fmtL(off.next,1)}</b>)?</p>
  <button class="btn brand wide" style="margin-top:16px" data-act="lvUpYes" data-v="${sp}">Move up to ${TIER_NAME[off.nt]}</button>
  <button class="btn ghost wide" style="margin-top:10px" data-act="lvStay" data-v="${sp}">Stay in ${TIER_NAME[off.t]} for now</button>`);
}
async function lvUpYes(sp){
 const off=moveUpOffer(sp);if(!off)return;const from=dropFrom(sp,S.uid),ni=TIER_KEYS.indexOf(off.nt);
 const cap=from&&ni<TIER_KEYS.indexOf(from)?capFor(sp,off.nt):null;
 try{await addLevelAdj(sp,{kind:'up',at:new Date().toISOString(),r:off.next,cap,from})}catch(e){return toast('Could not save. Check your connection and try again.')}
 closeSheet();doneTick(`Welcome to ${TIER_NAME[off.nt]}`);render();
}
const moveUpCard=()=>mySports().map(moveUpOffer).filter(Boolean).map(o=>`<button class="card upcard hov rv" data-act="lvUpAsk" data-v="${o.sp}"><span class="sico" data-a="pop">⬆️</span><span><b>You're close to ${TIER_NAME[o.nt]} in ${SPORTS[o.sp].name.toLowerCase()}</b><span class="small muted">Stay in ${TIER_NAME[o.t]} or move up. Tap to choose.</span></span><span class="go">›</span></button>`).join('');

/* ---------- Level feedback: after adding a score, say whether each other player's level looks right ---------- */
const VOTE_TXT={higher:'should be higher',lower:'should be lower',right:'is about right'};
function levelVotes(sp,id){const them=id===S.uid?'you':'them';
 const since=new Date(Date.now()-120*864e5).toISOString(),last={};
 (S.votes||[]).filter(v=>v.target===id&&v.sport===sp&&v.voter!==id&&(v.at||'')>=since).sort((a,b)=>(a.at||'').localeCompare(b.at||'')).forEach(v=>last[v.voter]=v.vote);
 const vs=Object.values(last).filter(v=>VOTE_TXT[v]),n=vs.length;if(n<3)return null;
 const c={higher:0,right:0,lower:0};vs.forEach(v=>c[v]++);const ord=['right','higher','lower'].sort((a,b)=>c[b]-c[a]),top=ord[0],share=c[top]/n;
 if(c[ord[1]]===c[top])return{top:'split',n,k:c[top],html:`<p class="lvvote v-split"><span class="lvi" aria-hidden="true">${LV_IC.split}</span><span>Players who played ${them} are split on this level <span class="muted">· ${n} said</span></span></p>`};
 const who=share>=.75?'Most':share>=.5?'Lots of':'A few';
 return{top,n,k:c[top],html:`<p class="lvvote v-${top}"><span class="lvi" aria-hidden="true">${LV_IC[top]}</span><span>${who} players who played ${them} say this level ${VOTE_TXT[top]} <span class="muted">· ${c[top]} of ${n}</span></span></p>`};
}
/* Clean line icons for the level question and the level summary (no emoji) */
const LV_SVG=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const LV_IC={higher:LV_SVG('<path d="M12 19V5M6 11l6-6 6 6"/>'),right:LV_SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),lower:LV_SVG('<path d="M12 5v14M6 13l6 6 6-6"/>'),split:LV_SVG('<path d="M8 7l-4 5 4 5M16 7l4 5-4 5"/>')};
/* After a score is saved: one player at a time, first "is their level right?", then "send them some love?".
   Anyone reported as late or a no-show is skipped; the rest still get both questions. */
function postGame(mid){
 const m=S.matches.find(x=>x.id===mid);if(!m)return;
 const list=[...new Set(regsOf(m))].filter(u=>u!==S.uid&&prof(u));if(!list.length)return;
 const F={m,list,i:0,phase:'level',rep:new Set()},sent=sentKudos();
 const left=()=>list.filter(u=>!F.rep.has(u));
 const next=()=>{F.i++;while(F.i<list.length&&F.rep.has(list[F.i]))F.i++;F.phase='level';show()};
 const head=u=>{const L=left(),n=L.indexOf(u)+1;return`<p class="eyebrow">Player ${n} of ${L.length} · ${SPORTS[m.sport].name}</p>`};
 const repLink=`<button type="button" class="btn link small wide pgrep" data-pg="report">Someone was late or didn’t show up? Report it</button>`;
 const wire=bg=>{const r=bg.querySelector('[data-pg="report"]');if(r)r.onclick=()=>report()};
 function show(){
  if(F.i>=list.length){closeSheet();return}
  const u=list[F.i],p=prof(u),lv=lvlOf(m.sport,u);
  if(F.phase==='level'&&lv==null)F.phase='love';
  if(F.phase==='level'){const t=tierOf(m.sport,lv);
   openSheet(`${head(u)}<div style="text-align:center"><div class="avbig" style="width:80px;height:80px;margin-top:8px">${avHTML(p,80)}</div>
    <h2 style="margin-top:10px">Is ${esc(first(p))}'s level right?</h2><p style="margin:6px 0"><b class="num" style="font-size:22px">${fmtL(lv)}</b> <span class="chip t-${t}">${TIER_NAME[t]}</span></p>
    <p class="small muted">From the game you just played. Only a summary is shown, never who said what.</p></div>
    <div class="lvask">${[['higher','ghost','Should be higher'],['right','brand','About right'],['lower','ghost','Should be lower']].map(([k,c,l])=>`<button type="button" class="btn ${c} lvb lv-${k}" data-lv="${k}"><span class="lvi" aria-hidden="true">${LV_IC[k]}</span><span>${l}</span></button>`).join('')}</div>
    <button type="button" class="btn link small wide" style="margin-top:8px" data-lv="skip">Skip</button>${repLink}`,bg=>{wire(bg);qsa('[data-lv]',bg).forEach(b=>b.onclick=async()=>{
     const v=b.dataset.lv;qsa('[data-lv]',bg).forEach(x=>x.disabled=true);
     if(v!=='skip'){const rec={id:'lv_'+rid(),voter:S.uid,target:u,sport:m.sport,match:m.id,vote:v,at:new Date().toISOString()};try{await Store.addVote(rec);S.votes.push(rec);tick()}catch(e){}}
     F.phase='love';show()})});
   return}
  const last=!left().some((x,k,a)=>a.indexOf(u)<k),name=esc(first(p));
  openSheet(`${head(u)}<div class="pglove"><div class="avbig" style="width:52px;height:52px">${avHTML(p,52)}</div><div><h2>${F.i===list.findIndex(x=>!F.rep.has(x))?'Score saved! ':''}Send ${name} some love?</h2><p class="muted small">${SPORTS[m.sport].name} · ${esc(whenOf(m))}</p></div></div>
   <span class="scoreline">${matchLine(m)} · ${setsStr(m.sets)}</span>
   <div class="kgrid">${REACT.map(([k,e,l])=>`<button type="button" class="kbtn${sent[mid+'|'+u+'|'+k]?' sent':''}" data-k="${k}"><span class="ke">${e}</span><span>${l}</span></button>`).join('')}</div>
   <p class="tiny muted" style="margin-top:10px">Only ${name} gets it, in their inbox, with your name. Pick as many as you like.</p>
   ${repLink}
   <button type="button" class="btn ${last?'ghost':'brand'} wide" style="margin-top:12px" data-pg="next">${last?'Done':`Next: ${esc(first(prof(left()[left().indexOf(u)+1])))}`}</button>`,bg=>{wire(bg);
   bg.querySelector('[data-pg="next"]').onclick=()=>next();
   qsa('[data-k]',bg).forEach(b=>b.onclick=async()=>{const k=b.dataset.k,e=REACT.find(x=>x[0]===k)[1];
    if(sent[mid+'|'+u+'|'+k])return toast('Already sent.');
    await notify([{to:u,kind:'kudos',data:{match:mid,k}}]);sent[mid+'|'+u+'|'+k]=1;ls.set('rc_kudos_'+S.uid,sent);
    burst(b,e);b.classList.add('sent');doneTick(`Sent to ${first(p)} ${e}`)})});
 }
 function report(){const u=list[F.i];
  reportSheet('m|'+mid,{only:left(),pre:u,back:()=>show(),sent:who=>{F.rep.add(who);if(who===u)next();else show()}});
 }
 show();
}

/* ---------- Settings ---------- */
const NOTIF_OK=()=>'Notification' in window;
function vSettings(){
 const row=(icon,a,t,sub,ctl,id)=>`<div class="setrow" ${id?`id="${id}"`:''}><span class="sico" data-a="${a}">${icon}</span><div class="grow"><b>${t}</b><span class="small muted">${sub}</span></div>${ctl||''}</div>`;
 const sw=(k)=>`<button class="switch" role="switch" aria-checked="${!!prefs[k]}" data-act="pref" data-v="${k}" aria-label="${k}"></button>`;
 const np=NOTIF_OK()?Notification.permission:'unsupported';
 const nctl=np==='granted'?'<span class="chip st-confirmed">On</span>':np==='denied'?'<span class="chip st-disputed">Blocked</span>':np==='unsupported'?'<span class="chip">Not available</span>':'<button class="btn brand sm" data-act="notifAsk">Turn on</button>';
 const nsub=np==='granted'?'You’ll be told about game invites, booking confirmations, scores to confirm and kudos.':np==='denied'?'Blocked in your browser. Allow them in your browser’s site settings.':np==='unsupported'?'This browser can’t show notifications. On iPhone, add the app to your home screen first.':'Get told about scores to confirm, friend requests and kudos.';
 const th=prefs.theme||'dark';
 return `<div class="hd"><div><button class="btn link small" data-act="go" data-v="me" style="padding-left:0">‹ Profile</button><h1 class="sethead"><span class="bgear">${ICON.gear}</span>Settings</h1></div></div>
 ${Store.mode==='demo'?(()=>{const r=demoRole(),who=me()?esc(first(me())):'';return`<p class="eyebrow period">Demo mode</p>
 <div class="card rv demoset"><b>Demo mode · V${esc(APP_VER)}</b><p class="small muted" style="margin:4px 0 12px">You are <b>${who}</b>, ${esc(roleWords())}. You're trying the next version of the app with made-up players and games. Nothing is saved and the real club is not touched.</p>
  <p class="small muted" style="margin:0 0 8px">View the demo as</p>
  <div class="seg full dseg" role="radiogroup" aria-label="View the demo as">${demoAs().map(([k,t])=>`<button type="button" role="radio" aria-checked="${r===k}" data-act="demoSwitch" data-v="${k}">${t}</button>`).join('')}<button type="button" role="radio" aria-checked="${r==='new'}" data-act="demoNew" title="Start again as a brand-new player: sign-up, questions, then pick a court">New player</button></div>
  <div class="dbtns"><button class="btn ghost sm" data-act="demoResetAsk">Reset demo</button><button class="btn ball sm" data-act="exitDemo">Exit demo</button></div></div>`})():''}
 <p class="eyebrow period">Appearance</p>
 <div class="card rv">${row(themeNow()==='light'?ICON.sun:ICON.moon,themeNow()==='light'?'spin':'rock','Theme',th==='device'?'Follows your phone or computer':th==='light'?'Light':'Dark, the club look')}
  <div class="seg full themeseg" data-key="theme" role="radiogroup" aria-label="Theme" style="margin-top:12px">${[['device','Device',ICON.device,'pop'],['light','Light',ICON.sun,'spin'],['dark','Dark',ICON.moon,'rock']].map(([v,n,ic,a])=>`<button type="button" role="radio" aria-checked="${th===v}" data-act="theme" data-v="${v}"><span class="ti" data-a="${a}">${ic}</span>${n}</button>`).join('')}</div></div>
 <p class="eyebrow period">App</p>
 <div class="card rv">${row(ICON.phone,'shake','Add to Home Screen',isInstalled()?'Done. You’re using OneCourt from your Home Screen.':'Put the app icon on your phone so it opens full screen, like a normal app.',isInstalled()?'<span class="chip st-confirmed">Added</span>':`<button class="btn brand sm" data-act="${installEvt?'hsInstall':'hsHow'}">${installEvt?'Add':'Show me'}</button>`)}</div>
 <p class="eyebrow period">Notifications and feedback</p>
 <div class="card rv">${row(ICON.bell,'ring','Notifications',nsub,nctl)}${row(ICON.speaker,'pulse','Sounds','A soft chime for new messages and a pop when something is done.',sw('sound'),'r-sound')}${row(ICON.phone,'shake','Vibration','A light tap when you slide, choose or confirm (phones that support it).',sw('haptics'),'r-haptics')}${row(ICON.spark,'pop','Pop-ups','The padel ball tick when a score is added, a friend is added and more. <button class="btn link small" data-act="popPreview">Preview</button>',sw('popups'),'r-popups')}${row(ICON.wave,'rock','Reduce motion','Fewer animations and no sliding effects.',sw('calm'),'r-calm')}</div>
 <p class="eyebrow period">Your level</p>
 <div class="card rv">${mySports().map(sp=>lvSettingRow(sp)).join('')||'<p class="small muted">Set your level from your profile first.</p>'}</div>
 <p class="eyebrow period">Games and friends</p>
 <div class="card rv">${row(ICON.mail,'pop','Open to game invites',me().invites?'Players booking a court can find you and invite you to their game.':'Off: you won’t show up when players look for someone to invite.',`<button class="switch" role="switch" aria-checked="${!!me().invites}" data-act="invPref" aria-label="Open to game invites"></button>`,'r-inv')}</div>
 <div class="card rv" style="margin-top:12px">${row(MI.user,'pop','Friend requests',me().friends==='open'?'Open account: anyone can add you as a friend straight away.':'Ask me first: you accept or reject each request.')}
  <div style="margin-top:12px">${seg('fr','Friend requests',[['request','Ask me first'],['open','Open account']],me().friends==='open'?'open':'request','frMode')}</div></div>
 <p class="eyebrow period">Account</p>
 <div class="card rv">${row(ICON.phone,'shake','Phone number',myPhone()?esc(myPhone().phone):'Not added yet. Admins use it to reach you about bookings.',`<button class="btn ghost sm" data-act="phEdit">${myPhone()?'Change':'Add'}</button>`,'r-phone')}
  ${myPhone()?`<p class="small muted" style="margin:12px 0 8px">Who can see your number?</p>${seg('phv','Who can see your number',PH_VIS,myPhone().vis||'admins','phVis')}`:''}</div>
 <div class="card rv" style="margin-top:12px">${row(ICON.key,'shake','Email and password',`${esc(S.email||'Demo account')} · only you can see this`,Store.mode==='demo'?'':'<button class="btn ghost sm" data-act="changePw">Change</button>')}</div>
 ${Store.mode==='demo'?'':canDemo()?`<div class="card rv" style="margin-top:12px"><b>Demo mode</b><p class="small muted" style="margin:4px 0 12px">See new updates before they go live, with 100 made-up players and games. Nothing you do there touches the real club.</p>${PREVIEW?`<button class="btn ghost sm" data-act="demo">Start demo mode</button>`:`<a class="btn ghost sm" href="preview/">Open demo mode</a>`}</div>`:''}
 ${Store.mode==='demo'?'':`<button class="btn danger wide" style="margin-top:18px" data-act="signOut">${ICON.logout}<span>Sign out</span></button>`}
 <p class="small muted vline">OneCourt · V${esc(APP_VER)}</p>`;
}
/* Ask once per device, a few seconds after signing in */
function maybeAskNotif(){
 if(!NOTIF_OK()||Notification.permission!=='default'||ls.get('rc_nask_'+S.uid,0))return;
 setTimeout(()=>{if($('sheetBg')||$('app').hidden)return;ls.set('rc_nask_'+S.uid,1);
  openSheet(`<div style="text-align:center"><span class="askbell">${ICON.bell}</span><h2 style="margin-top:14px">Turn on notifications?</h2><p class="muted" style="margin:8px 0 18px">Know straight away when someone asks you to confirm a score, adds you as a friend or sends you kudos.</p></div>
   <button class="btn brand wide" data-act="notifAsk">Allow notifications</button><button class="btn ghost wide" style="margin-top:10px" data-act="closeSheet">Not now</button>`)},2600);
}
function sysNotify(title,body){try{if(NOTIF_OK()&&Notification.permission==='granted'&&document.hidden)new Notification(title,{body,icon:'brand/icon-192.png',badge:'brand/icon-192.png',tag:'rc'})}catch(e){}}

/* ---------- Loading screen (rankings) ---------- */
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const loaderHTML=t=>`<div class="loader"><span class="lball" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="30" fill="#d9f24c"/><path d="M17 22c10 10 10 26 0 36M63 22C53 32 53 48 63 58" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg></span><span class="lshadow" aria-hidden="true"></span><p>${esc(t)}</p>
 <div class="skel">${'<i></i>'.repeat(5)}</div></div>`;
async function loadRank(force){
 view.tab='rank';paintDock('rank');mountBar();window.scrollTo(0,0);$('main').innerHTML=loaderHTML(force?'Refreshing rankings…':'Loading rankings…');
 const t0=Date.now();if(force||Store.mode==='live'){try{await reload()}catch(e){toast('Could not refresh. Check your connection.')}}
 await wait(Math.max(0,(calm()?250:850)-(Date.now()-t0)));if(view.tab==='rank'){render();if(force)doneTick('Rankings up to date')}
}

/* ---------- Sheets ---------- */
/* Every pop-up gets a Back button at the top (except the two that must be finished: new username and new password) */
const SHEET_BACK=`<div class="sheetback"><button type="button" class="backbtn" data-act="closeSheet" aria-label="Back"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Back</button></div>`;
function openSheet(html,onReady){
 closeSheet(true);const bg=document.createElement('div');bg.className='sheetbg';bg.id='sheetBg';
 bg.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><div class="grab" aria-hidden="true"></div>${html.includes('data-noback')?'':SHEET_BACK}${html}</div>`;
 bg.addEventListener('click',e=>{if(e.target===bg)closeSheet()});$('sheetRoot').appendChild(bg);pageLock(true);sheetKb(bg);if(onReady)onReady(bg);
 const f=bg.querySelector('input,button:not(.grab):not(.backbtn)');if(f&&matchMedia('(hover:hover)').matches)setTimeout(()=>f.focus(),60);
}
/* Phones: when the keyboard opens, pin the pop-up to the visible area above it (iOS otherwise slides it down behind the keyboard) */
/* While a pop-up is open the page behind it is frozen, so on phones it can't scroll underneath or get pushed around by the keyboard */
let lockY=null;
function pageLock(on){const b=document.body;
 if(on&&lockY===null){lockY=window.scrollY;Object.assign(b.style,{position:'fixed',top:-lockY+'px',left:'0',right:'0',width:'100%'})}
 else if(!on&&lockY!==null){const y=lockY;lockY=null;Object.assign(b.style,{position:'',top:'',left:'',right:'',width:''});window.scrollTo(0,y)}}
function sheetKb(bg){const vv=window.visualViewport;if(!vv)return;let base=Math.max(window.innerHeight,vv.height),raf=0;
 const run=()=>{raf=0;if(!bg.isConnected){vv.removeEventListener('resize',fit);vv.removeEventListener('scroll',fit);return}
  base=Math.max(base,vv.height);const kb=base-vv.height>120;bg.classList.toggle('kb',kb);
  if(kb){bg.style.setProperty('--vvh',vv.height+'px');bg.style.setProperty('--vvt',vv.offsetTop+'px')}else{bg.style.removeProperty('--vvh');bg.style.removeProperty('--vvt')}};
 const fit=()=>{if(!raf)raf=requestAnimationFrame(run)};
 vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit);run()}
function closeSheet(now){const bg=$('sheetBg');if(!bg)return;const gone=()=>{bg.remove();if(!$('sheetBg'))pageLock(false)};
 if(document.activeElement&&bg.contains(document.activeElement))document.activeElement.blur();
 if(now||calm()){gone();return}bg.classList.add('out');setTimeout(gone,300)}
function lvlInput(sp,val){const S_=SPORTS[sp];
 return `<div class="lvlin"><button type="button" class="step" data-act="lstep" data-v="-0.1" aria-label="Lower">−</button><input id="gLvl" type="number" inputmode="decimal" step="0.1" min="${S_.min}" max="${S_.max}" value="${val!=null?fmtL(val,1):''}" placeholder="${fmtL(avg(S_.bands.intermediate),1)}" aria-label="Level"><button type="button" class="step" data-act="lstep" data-v="0.1" aria-label="Higher">+</button></div>
  <div class="bandq">${TIERS.map(([k,n])=>`<button type="button" class="fchip" data-act="lband" data-v="${k}">${n} · ${fmtL(S_.bands[k][0],1)}–${fmtL(S_.bands[k][1],1)}</button>`).join('')}</div>
  <p class="tiny muted" style="margin-top:8px">${S_.name} levels run from ${fmtL(S_.min,1)} to ${fmtL(S_.max,1)}. Tap a band for its middle, then fine-tune.</p>`}
let pickT=null;
function openPicker(key){
 pickT={t:key[0],i:+key[1]};const sp=SPORTS[A.sport];
 openSheet(`<h2>Choose a player</h2><p class="muted small">${sp.name} · ${A.others?'Team '+(pickT.t==='a'?1:2):pickT.t==='a'?'Your team':'Opponents'}</p>
  <div class="search" style="margin-top:14px">${ICON.search}<input id="pkQ" type="search" placeholder="Search members" aria-label="Search members"></div>
  <div class="pickl" id="pkL"></div>
  <div class="divider">Playing with someone without an account?</div>
  <label for="gName">Their name</label><input id="gName" maxlength="40" placeholder="e.g. Sam" autocomplete="off">
  <label for="gLvl">Their ${sp.name.toLowerCase()} level</label>${lvlInput(A.sport,null)}
  <p class="ferr" id="gErr"></p><button class="btn brand wide" data-act="addGuest">Add guest</button>
  ${A[pickT.t][pickT.i]&&!(pickT.t==='a'&&pickT.i===0&&!A.others)?`<button class="btn link small" style="display:block;margin:12px auto 0" data-act="clearSlot">Remove this player</button>`:''}`,
 bg=>{const q=bg.querySelector('#pkQ');q.oninput=paintPick;paintPick()});
}
function paintPick(){
 const q=($('pkQ').value||'').trim().toLowerCase(),used=[...A.a,...A.b].filter(Boolean).map(s=>s.uid);if(A.others)used.push(S.uid);
 const list=S.profiles.filter(p=>p.setup&&inVenue(p)&&!used.includes(p.id)&&(!q||(p.name+' '+p.username).toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,40);
 $('pkL').innerHTML=list.map(p=>{const r=lvlOf(A.sport,p.id);return`<button type="button" data-act="pickMember" data-v="${p.id}">${avHTML(p)}<span class="nm"><b>${esc(p.name)}</b><span>@${esc(p.username)}</span></span>${r!=null?`<span class="chip t-${tierOf(A.sport,r)} num">${fmtL(r)}</span>`:'<span class="chip">No level</span>'}</button>`}).join('')||`<p class="small muted" style="padding:8px 4px">No members found. Add them as a guest below.</p>`;
}
function readLvl(){const v=parseFloat(($('gLvl').value||'').replace(',','.'));const S_=SPORTS[A.sport];return isFinite(v)&&v>=S_.min&&v<=S_.max?Math.round(v*10)/10:null}
function askMemberLevel(id){
 const p=prof(id),sp=SPORTS[A.sport];
 openSheet(`<h2>${esc(first(p))}'s ${sp.name.toLowerCase()} level</h2><p class="muted small">${esc(p.name)} has not set a ${sp.name.toLowerCase()} level yet. Enter your best guess. It is only used for this game until they set their own.</p>
  <label for="gLvl">Level</label>${lvlInput(A.sport,null)}<p class="ferr" id="gErr"></p><button class="btn brand wide" data-act="memberLevel" data-v="${id}">Add ${esc(first(p))}</button>`);
}
const GWORD={male:'men',female:'women'};
function rankText(sp,id,g){const rk=rankOf(sp,id,g);if(!rk)return'<span class="muted">Not ranked yet: no games played</span>';
 return `<b class="num">#${rk.pos}</b> <span class="muted">of ${rk.of}${g&&g!=='all'?' '+GWORD[g]:''} in ${TIER_NAME[rk.tier]} ${SPORTS[sp].name.toLowerCase()}</span>`}
/* Admins only: change what an account can do */
const ROLE_NAME={dev:'Developer',owner:'Owner',admin:'Admin',coach:'Coach',player:'Player'},ROLE_RANK={player:0,coach:1,admin:2,owner:3,dev:4};
/* who can set which account types: the developer up to owner, owners up to admin, admins between player and coach */
const roleChoices=(v=VID)=>isDev()?['player','coach','admin','owner']:isOwner(S.uid,v)?['player','coach','admin']:isAdmin(S.uid,v)?['player','coach']:[];
/* One row per club. The developer sees every club; an owner or admin only the club they run */
function roleCard(id){const p=prof(id),clubs=isDev()?VENUES.map(v=>v.id):[VID];
 const row=v=>{const r=roleAt(id,v),c=coachOf(id,v)||{sports:[],auto:false},opts=roleChoices(v),me_=roleAt(S.uid,v),vn=venueOf(v);
  const head=`<div class="rchead">${vMark(vn,'sm')}<b>${esc(vn.name)}</b></div>`;
  if(!opts.includes(r)||ROLE_RANK[r]>=ROLE_RANK[me_])return`<div class="rcclub">${head}<p class="small" style="margin-top:6px">${r==='dev'?`${esc(first(p))} is the Developer`:`${esc(first(p))} is ${ROLE_NAME[r]} here`}</p></div>`;
  const what={owner:'Everything an admin can do here, plus giving or removing admin access.',admin:'Confirms bookings, reviews scores and reports, posts club news and makes players coaches here.',coach:'Plays as normal and can block court time for coaching here.',player:isMember(id,v)?'Plays here as a normal player.':'Hasn’t played here yet. Any role you give applies only here.'};
  return`<div class="rcclub">${head}<div style="margin-top:10px">${seg('role_'+v,'Account type at '+vn.name,opts.map(k=>[k+'|'+v,ROLE_NAME[k]]),r+'|'+v,'roleSet')}</div>
   <p class="small muted" style="margin-top:8px">${what[r]}</p>
   ${r==='coach'?`<label>Coaches</label><div class="chips">${SP_KEYS.map(sp=>`<button type="button" class="fchip${(c.sports||[]).includes(sp)?' on':''}" aria-pressed="${(c.sports||[]).includes(sp)}" data-act="coachSport" data-v="${sp}|${v}">${SPORTS[sp].name}</button>`).join('')}</div>
    ${vn.book.kind==='slots'?`<label>Their coaching blocks</label>${seg('cauto_'+v,'Coaching blocks',[['1|'+v,'Go straight through'],['0|'+v,'Need admin OK']],(c.auto?'1':'0')+'|'+v,'coachAuto')}`:''}`:''}</div>`};
 return `<div class="card rolecard" style="margin-top:12px"><span class="eyebrow">${ROLE_NAME[roleOf(S.uid)]} · account type</span>
  <p class="small muted" style="margin-top:6px">Everyone starts as a player. A role only counts at the club it's given for.</p>${clubs.map(row).join('')}</div>`}
/* Owners (at their club) and the developer: invite a player into the Pro ranking here, one switch per sport */
function proCard(id){const p=prof(id);if(!canPro()||!p||!p.setup||!inVenue(p))return'';const sps=(p.sports||[]).filter(sp=>S.R[sp][id]);if(!sps.length)return'';
 return `<div class="card rolecard procard" style="margin-top:12px"><span class="eyebrow">${ROLE_NAME[roleOf(S.uid)]} · Pro ranking</span>
  <p class="small muted" style="margin-top:6px">Pro is invite only. Players climb to the top of Intermediate on their own; you pick who joins Pro at ${esc(VEN().name)}.</p>
  ${sps.map(sp=>{const on=!!proOf(id,sp),x=proOf(id,sp),by=x&&prof(x.by);return`<div class="setline" style="margin-top:10px"><div><b>${SPORTS[sp].name} Pro</b><p class="small muted">${on?`In the Pro ranking${by?` · invited by ${esc(x.by===S.uid?'you':first(by))}`:''}`:`${esc(first(p))} is at ${fmtL(S.R[sp][id].r)}. Inviting them starts them at ${fmtL(SPORTS[sp].cut[1],1)} or higher.`}</p></div><button class="switch" role="switch" aria-checked="${on}" data-act="proSet" data-v="${id}|${sp}" aria-label="${SPORTS[sp].name} Pro ranking"></button></div>`}).join('')}</div>`}
async function setPro(v){const [id,sp]=v.split('|'),p=prof(id);if(!p||!SPORTS[sp]||!canPro())return;const on=!proOf(id,sp);
 const np=JSON.parse(JSON.stringify(p));np.pro=np.pro||{};np.pro[VID]=np.pro[VID]||{};
 if(on)np.pro[VID][sp]={by:S.uid,at:new Date().toISOString()};else{delete np.pro[VID][sp];if(!Object.keys(np.pro[VID]).length)delete np.pro[VID]}
 try{await Store.saveProfile(np)}catch(e){return toast('Could not save. Check your connection and try again.')}
 upsert(S.profiles,np);rate();notify([{to:id,kind:'pro',data:{on,sport:sp,venue:VID}}]);playerSheet(id);
 toast(on?`${first(p)} is now in the ${SPORTS[sp].name.toLowerCase()} Pro ranking`:`${first(p)} is back in Intermediate ${SPORTS[sp].name.toLowerCase()}`)}
function demoRow(id){if(!isDev()||isDev(id))return'';const on=canDemo(id);
 return `<div class="card rolecard democard" style="margin-top:12px"><span class="eyebrow">Developer · demo mode</span><div class="setline" style="margin-top:10px"><div><b>Demo access</b><p class="small muted">${on?`${esc(first(prof(id)))} can open demo mode from Settings to try new updates before they go live.`:'Let them try new updates in demo mode before they go live.'}</p></div><button class="switch" role="switch" aria-checked="${on}" data-act="demoAcc" data-v="${id}" aria-label="Demo access"></button></div></div>`}
async function setDemoAcc(id){const on=!canDemo(id);
 try{await Store.setDemoAcc(id,on)}catch(e){return toast(e.code==='nosql'?'Demo access needs the latest SQL in Supabase first (demo-access.sql).':e.code==='denied'?'Only the developer can change demo access.':'Could not save. Check your connection and try again.')}
 S.demoAcc=(S.demoAcc||[]).filter(x=>x!==id);if(on)S.demoAcc.push(id);
 notify([{to:id,kind:'demo_access',data:{on}}]);playerSheet(id);toast(on?`${first(prof(id))} now has demo access`:`Demo access removed for ${first(prof(id))}`)}
async function applyRole(id,role,coach,quiet,v=VID){
 try{await Store.setRole(id,role,coach,v)}catch(e){toast(e.code==='nosql'?'Club roles need the latest SQL in Supabase first (club-roles.sql).':e.code==='denied'?(role==='owner'||isOwner(id,v)?'Only the developer can change owner access.':role==='admin'||isAdmin(id,v)?'Only the developer or this club’s owner can change admin access.':'Only this club’s admins can change accounts.'):'Could not save. Check your connection.');return false}
 const k=rk(id,v);delete S.coaches[k];S.admins=S.admins.filter(x=>x!==k);S.owners=(S.owners||[]).filter(x=>x!==k);if(role==='admin'||role==='owner')S.admins.push(k);if(role==='owner')S.owners.push(k);if(role==='coach')S.coaches[k]=coach;
 if(!quiet)notify([{to:id,kind:'role',data:{role,venue:v,title:role==='coach'?coachTitle(id,v):'',auto:!!(coach&&coach.auto)}}]);
 playerSheet(id);return true}
function playerSheet(id){
 const p=prof(id);if(!p)return;const ms=S.matches.filter(okMatch).filter(m=>regsOf(m).includes(id)).sort(byWhen).reverse().slice(0,5);
 openSheet(`<div style="text-align:center"><div class="avbig" style="width:96px;height:96px;margin-top:6px">${avHTML(p,96)}</div><h2 style="margin-top:12px">${esc(p.name)}</h2><p class="muted small">@${esc(p.username)}${adminChip(id)}</p>${clubLines(p.id)}${joinedLine(p)}${reliaHTML(p.id)}
  <div class="fstats"><span><b class="num">${followerN(id)}</b>followers</span><span><b class="num">${followingN(id)}</b>following</span>${id===S.uid?`<span><b class="num">${friendIds().length}</b>friends</span>`:''}</div></div>
  ${id===S.uid?'':`<div class="cta relbtns">${relButtons(id)}</div>${!hasSlots()||!inVenue(p)?'':(p.invites||isFriend(id))?`<button class="btn ball wide" style="margin-top:10px" data-act="invitePlayer" data-v="${id}">Invite ${esc(first(p))} to a game</button>`:`<p class="small muted" style="text-align:center;margin-top:12px">${esc(first(p))} is not taking game invites right now.</p>`}`}
  ${GWORD[p.gender]&&(p.sports||[]).some(sp=>S.R[sp][id]&&S.R[sp][id].n)?`<div class="rkg" role="radiogroup" aria-label="Rank among"><span class="small muted">Rank among</span><button type="button" role="radio" aria-checked="true" data-rkg="all">All</button><button type="button" role="radio" aria-checked="false" data-rkg="${p.gender}">${p.gender==='male'?'Men':'Women'}</button></div>`:''}
  <div class="grid2" style="margin-top:16px">${(p.sports||[]).map(sp=>{const e=S.R[sp][id];if(!e)return'';const t=tierOf(sp,e.r),rk=rankOf(sp,id);
   return`<div class="card"><span class="eyebrow">${SPORTS[sp].name}</span><div style="font:500 30px var(--display);margin:6px 0 2px" class="num">${fmtL(e.r)}</div><span class="chip t-${t}">${TIER_NAME[t]}</span><p class="rkline" data-sp="${sp}">${rankText(sp,id,'all')}</p><p class="tiny muted" style="margin-top:8px">${e.w} won · ${e.l} lost</p>${(levelVotes(sp,id)||{}).html||''}</div>`}).join('')}</div>
  <div class="card" style="margin-top:12px"><dl class="prefs"><dt>Hand</dt><dd>${esc(lbl(HANDS,p.hand))||'–'}</dd><dt>Court side</dt><dd>${esc(lbl(SIDES,p.side))||'–'}</dd><dt>Plays</dt><dd>${(p.times||[]).map(t=>lbl(TIMES,t)).join(', ')||'–'}</dd><dt>Invites</dt><dd>${p.invites?'Open to game invites':'Not right now'}</dd>${id!==S.uid&&canSeePhone(id)?`<dt>Phone</dt><dd>${phoneLink(id)}</dd>`:''}<dt>Friends</dt><dd>${p.friends==='open'?'Open: anyone can add them':'Requests need approval'}</dd></dl></div>
  ${isAdmin()&&id!==S.uid&&p.setup?roleCard(id):''}${id!==S.uid?proCard(id):''}${id!==S.uid?demoRow(id):''}
  ${ms.length?`<div class="sec"><h3>Recent games</h3></div><div class="list">${ms.map(m=>matchRow(m,{for:id})).join('')}</div>`:''}
  <button class="btn ghost wide" style="margin-top:16px" data-act="closeSheet">Close</button>`,bg=>{qsa('.rv',bg).forEach(e=>e.classList.add('in'));syncGliders();
  qsa('[data-rkg]',bg).forEach(b=>b.onclick=()=>{const g=b.dataset.rkg;qsa('[data-rkg]',bg).forEach(x=>x.setAttribute('aria-checked',x===b));qsa('.rkline',bg).forEach(l=>l.innerHTML=rankText(l.dataset.sp,id,g));tick()})});
 playerSheet.open=id;
}
function refreshSocial(id){if($('sheetBg')&&playerSheet.open===id&&document.querySelector('#sheetBg .relbtns')){playerSheet(id)}else if(!$('sheetBg'))render();else if(view.tab==='inbox'||view.tab==='players')render()}
/* Send kudos to the other players in a game */
/* Report a player who was late or didn't show up. It goes to the admins, who decide; nothing changes until one confirms it */
function reportSheet(v,o){o=o||{};const [t,id]=v.split('|');let sport,when,others,src={};
 if(t==='m'){const m=S.matches.find(x=>x.id===id);if(!m)return;sport=m.sport;when=whenOf(m);others=regsOf(m);src={match:m.id,date:m.date}}
 else{const b=S.bookings.find(x=>x.id===id);if(!b)return;sport=b.court;when=`${dateLabel(b.date)} · ${slotRange(b.start,b.len)}`;others=goingOf(b);src={booking:b.id,date:b.date}}
 others=[...new Set(others)].filter(u=>u!==S.uid&&prof(u)&&(!o.only||o.only.includes(u)));if(!others.length)return toast('There is no one else in this game to report.');
 const st={who:others.length===1?others[0]:o.pre&&others.includes(o.pre)?o.pre:null,k:null};
 openSheet(`<h2>Report a player</h2><p class="muted small">${SPORTS[sport].name} · ${esc(when)}. The club admins see this and decide. Only admins see who reported it.</p>
  <label>Who?</label><div class="chips" id="rpWho">${others.map(u=>`<button type="button" class="fchip${st.who===u?' on':''}" aria-pressed="${st.who===u}" data-rw="${u}">${esc(first(prof(u)))}</button>`).join('')}</div>
  <label>What happened?</label><div class="chips" id="rpK"><button type="button" class="fchip" aria-pressed="false" data-rk="late">Showed up late</button><button type="button" class="fchip" aria-pressed="false" data-rk="noshow">Didn’t show up</button></div>
  <label for="rpNote">Anything to add? <span class="muted">(optional)</span></label><input id="rpNote" maxlength="140" placeholder="e.g. Arrived 25 minutes after the start">
  <p class="ferr" id="rpErr"></p><button class="btn brand wide" id="rpSend">Send to the admins</button>
  <button class="btn ghost wide" style="margin-top:10px" data-act="closeSheet">Cancel</button>`,bg=>{
  if(o.back)qsa('[data-act="closeSheet"]',bg).forEach(b=>{b.removeAttribute('data-act');b.onclick=()=>o.back()});
  const pick=(sel,attr,key)=>qsa(sel,bg).forEach(b=>b.onclick=()=>{st[key]=b.dataset[attr];qsa(sel,bg).forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on))});tick()});
  pick('[data-rw]','rw','who');pick('[data-rk]','rk','k');
  bg.querySelector('#rpSend').onclick=async()=>{if(!st.who)return $('rpErr').textContent='Pick the player.';if(!st.k)return $('rpErr').textContent='Pick what happened.';
   const admins=S.admins.filter(a=>a!==S.uid&&a!==st.who);if(!admins.length&&!isAdmin())return $('rpErr').textContent='No admins are set up yet.';
   const data=Object.assign({rep:'rp_'+rid(),target:st.who,k:st.k,sport,note:$('rpNote').value.trim()},src);
   await notify(admins.map(to=>({to,kind:'report',data})));
   if(isAdmin()){try{await Store.send([{to:S.uid,kind:'report',data}])}catch(e){}await reload()}
   if(o.sent){doneTick('Sent to the admins');toast(isAdmin()?'Sent. It’s in your inbox too, so you can confirm it yourself.':'Thanks. An admin will look at it.',3200);return o.sent(st.who)}
   closeSheet();doneTick('Sent to the admins');
   toast(isAdmin()?'Sent. It’s in your inbox too, so you can confirm it yourself.':'Thanks. An admin will look at it. Nothing changes unless they confirm it.',4200);render()}});
}
async function repDecide(msgId,ok){const g=S.msgs.find(x=>x.id===msgId);if(!g||!isAdmin())return;const d=g.data||{};
 if(S.conduct.some(c=>c.report===d.rep))return toast('Another admin already dealt with this.');
 const c={id:'cd_'+rid(),user:d.target,kind:ok?d.k:'dismissed',sport:d.sport,report:d.rep,by:S.uid,at:new Date().toISOString(),match:d.match||null,booking:d.booking||null,date:d.date||null};
 try{await Store.addConduct(c)}catch(e){toast(e.code==='nosql'?'Reports need the latest SQL in Supabase first (conduct.sql).':e.code==='done'?'Another admin already dealt with this.':e.code==='denied'?'Only admins can do this.':'Could not save. Check your connection.');return}
 S.conduct.push(c);rate();const pn=penOf(c);
 const out=[];if(g.from!==S.uid)out.push({to:g.from,kind:'report_done',data:{ok}});if(ok)out.push({to:d.target,kind:'conduct',data:{k:d.k,sport:d.sport,pen:pn,date:d.date||null}});
 notify(out);doneTick(ok?'Report confirmed':'Report dismissed');if(ok)toast(`${first(prof(d.target))||'The player'}’s ${SPORTS[d.sport].name.toLowerCase()} level drops ${pn.toFixed(2)}. Their profile now shows it.`,3800);render()}
function kudosSheet(mid,justSaved){
 const m=S.matches.find(x=>x.id===mid);if(!m)return;const others=regsOf(m).filter(u=>u!==S.uid&&prof(u));if(!others.length)return;
 const to=new Set(others),sent=sentKudos();
 openSheet(`<h2>${justSaved?'Score saved! Send some love?':'Send kudos'}</h2><p class="muted small">${SPORTS[m.sport].name} · ${esc(whenOf(m))}<span class="scoreline">${matchLine(m)} · ${setsStr(m.sets)}</span></p>
  <label>To</label><div class="chips" id="kTo">${others.map(u=>`<button type="button" class="fchip on" aria-pressed="true" data-kto="${u}">${esc(first(prof(u)))}</button>`).join('')}</div>
  <div class="kgrid">${REACT.map(([k,e,l])=>`<button type="button" class="kbtn" data-k="${k}"><span class="ke">${e}</span><span>${l}</span></button>`).join('')}</div>
  <p class="tiny muted" style="margin-top:10px">They get it in their inbox, with your name.</p>
  <button class="btn link small" style="margin-top:6px" data-act="reportOpen" data-v="m|${esc(mid)}">Someone was late or didn’t show up? Report it</button>
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
window.addEventListener('appinstalled',()=>{installEvt=null;ls.set('rc_installed',1);closeSheet();toast('OneCourt is on your Home Screen')});
/* Always shown at the top of the inbox */
function homeCard(){
 return`<div class="card msg hscard rv" style="margin-top:14px"><span class="mi">${ICON.phone}</span><div class="mb"><b class="mt">Add OneCourt to your Home Screen</b><p>Get the app icon on your phone. It opens full screen like a normal app, and you'll never need to find the link again.</p><div class="cta"><button class="btn ball sm" data-act="hsHow">Show me how</button></div></div></div>`;
}
const HS_IOS=`<ol class="hsteps"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (the square with an arrow pointing up).</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. The OneCourt icon appears on your Home Screen.</li></ol>`;
const HS_AND=`<ol class="hsteps"><li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>⋮</b> menu at the top right.</li><li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li><li>Tap <b>Install</b> or <b>Add</b>. The OneCourt icon appears on your Home Screen.</li></ol>`;
function homeSheet(fromFs){
 const head=fromFs?`<h2>Full screen on iPhone</h2><p class="muted" style="margin:6px 0 4px">iPhone doesn't let websites go full screen on their own. Add the app to your Home Screen instead. It then opens full screen every time, like a normal app.</p>`
  :`<h2>Add to your Home Screen</h2><p class="muted" style="margin:6px 0 4px">You get the OneCourt icon on your phone. It opens full screen, like an app from the App Store or Google Play, and you'll always have it even if you lose the link.</p>`;
 const ios=`<p class="hsplat">iPhone and iPad</p>${HS_IOS}`,and=`<p class="hsplat">Android</p>${installEvt?'<button class="btn ball wide" style="margin-bottom:14px" data-act="hsInstall">Add to Home Screen</button><p class="small muted" style="margin:-6px 0 10px">Or do it yourself:</p>':''}${HS_AND}`;
 openSheet(`${head}${fromFs?HS_IOS:isAndroid?and+ios:ios+and}<button class="btn ghost wide" data-act="closeSheet">Got it</button>`);
}
async function hsInstall(){
 if(!installEvt)return homeSheet();const e=installEvt;
 try{await e.prompt();const r=await e.userChoice;if(r&&r.outcome==='accepted'){installEvt=null;ls.set('rc_installed',1)}}catch(err){homeSheet()}
 render();
}
/* Jump to a player's row in the rankings and keep it lit until the screen is touched */
function spotRow(id){setTimeout(()=>{const el=document.querySelector(`#main [data-act="player"][data-v="${CSS.escape(id)}"]`);if(!el)return;
 qsa('.spot').forEach(e=>e.classList.remove('spot'));el.scrollIntoView({block:'center',behavior:calm()?'auto':'smooth'});el.classList.add('spot');
 setTimeout(()=>{const off=()=>{el.classList.remove('spot');['pointerdown','touchstart','wheel','keydown'].forEach(t=>window.removeEventListener(t,off,true))};
  ['pointerdown','touchstart','wheel','keydown'].forEach(t=>window.addEventListener(t,off,{capture:true,passive:true}))},400)},120)}
const ACT={
 async clubRank(v,el){const id=el&&el.dataset.p,k=id?rankAt(id,v):null;closeSheet(true);tick();
  const show=()=>{if(k){view.rs=k.sp;view.rt=k.tier;view.rg='all'}view.tab='rank';render();if(k)spotRow(id)};
  if(v===VID)return show();
  if(!isMember(S.uid,v)){view.tab='rank';await venueSignIn(v)}else await setVenue(v,'rank');
  if(VID===v)setTimeout(show,calm()?0:500)},
 /* clubs */
 venue(v){switchVenue(v)},
 venueAll(){openVenues()},
 venueGroup(v){openVenues(v)},
 venueSoon(v){soonToast(v)},
 venueGo(v){closeSheet();if(v!==VID)setTimeout(()=>switchVenue(v),calm()?0:220)},
 authVenue(v){if(!VENUES.some(x=>x.id===v)||v===VID)return;VID=v;ls.set('rc_venue',v);applyVenue();tick();paintAuthVenue()},
 /* bookings */
 bkCourt(v){const bk=bkState();bk.court=v;bk.sel=null;render()},
 bkDay(v){const bk=bkState();bk.day=v;bk.sel=null;tick();render()},
 bkBlock(){if(!canBlock())return;const bk=bkState();bk.block=!bk.block;bk.sel=null;render()},
 bkInvClear(){bkState().invite=[];render()},
 slot(v){const i=+v,bk=bkState(),c=cellOf(i);
  if(c.b)return bookingSheet(c.b.id);
  if(c.past)return toast('That time has passed.');
  const max=bk.block?NSLOT:MAX_GAME;
  if(!bk.sel)bk.sel=[i,i];
  else{const [s,e]=bk.sel;
   if(i>=s&&i<=e){if(s===e)bk.sel=null;else if(i===s)bk.sel=[s+1,e];else if(i===e)bk.sel=[s,e-1];else bk.sel=[i,i]}
   else{const ns=Math.min(s,i),ne=Math.max(e,i);bk.sel=ne-ns+1<=max&&rangeFree(ns,ne)?[ns,ne]:[i,i];if(ne-ns+1>max)toast(`Games can be up to ${MAX_GAME/2} hours.`)}}
  tick();paintSlots()},
 slotClear(){bkState().sel=null;paintSlots()},
 bookGo(){bookSheet()},
 blockGo(){blockSheet()},
 invAdd(id){const bk=bkState();if(bk.invite.length>=3)return toast('You can invite up to 3 players.');bk.invite.push(id);tick();bookSheet.paint&&bookSheet.paint()},
 invDel(id){const bk=bkState();bk.invite=bk.invite.filter(x=>x!==id);bookSheet.paint&&bookSheet.paint()},
 invAll(){const bk=bkState();bk.allFriends=!bk.allFriends;tick();const b=document.querySelector('[data-act="invAll"]');if(b){b.classList.toggle('on',bk.allFriends);b.setAttribute('aria-pressed',String(bk.allFriends))}const n=b&&b.parentElement.nextElementSibling;if(n)n.textContent=bk.allFriends?'All your friends get the invite. The first 3 to say yes get the spots.':'Or pick up to 3 players: your friends or anyone open to game invites.'},
 rsn(v){qsa('#rsn .fchip').forEach(b=>{const on=b.dataset.v===v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});tick()},
 bookSave(){const bk=bkState(),[s,e]=bk.sel,inv=[...new Set([...bk.invite,...(bk.allFriends?friendIds():[])])];
  saveBooking({id:'b_'+rid(),court:bk.court,date:bk.day,start:s,len:e-s+1,kind:'game',by:S.uid,venue:VID,price:rangePrice(bk.court,bk.day,s,e-s+1),status:isAdmin()?'confirmed':'pending',confirmedBy:isAdmin()?S.uid:undefined,invited:inv,going:[],declined:[],cap:3,note:$('bNote').value.trim(),at:new Date().toISOString()},
  isAdmin()?'Court booked':(inv.length?'Requested · invites sent':'Booking requested'))},
 blockSave(){const bk=bkState(),[s,e]=bk.sel,on=document.querySelector('#rsn .fchip.on');saveBooking({id:'b_'+rid(),court:bk.court,date:bk.day,start:s,len:e-s+1,kind:'block',by:S.uid,reason:isAdmin()?(on?on.dataset.v:'Closed'):'Coaching',status:isAdmin()||(coachOf()||{}).auto?'confirmed':'pending',note:$('bNote').value.trim(),at:new Date().toISOString()},isAdmin()||(coachOf()||{}).auto?'Slots blocked':'Sent to the admins')},
 bkOpen(v){bookingSheet(v)},
 async bkConfirm(v){const b=S.bookings.find(x=>x.id===v);if(!b)return;const nb=Object.assign({},b,{status:'confirmed',confirmedBy:S.uid,confirmedAt:new Date().toISOString()});
  if(await patchBooking(nb)){notify(goingOf(nb).map(to=>({to,kind:'bk_confirmed',data:{booking:b.id}})));closeSheet();doneTick(b.kind==='block'?'Block confirmed':'Booking confirmed');toast('Now block this time on Hudle so it can’t be booked twice.',4200);render()}},
 bkReject(v){confirmSheet('Decline this booking?','The slot opens up again and the host is told it couldn’t be confirmed.','Decline booking','bkRejectYes',v)},
 async bkRejectYes(v){const b=S.bookings.find(x=>x.id===v);if(!b)return;try{await Store.delBooking(v)}catch(e){return toast('Could not decline. Check your connection.')}
  S.bookings=S.bookings.filter(x=>x.id!==v);closeSheet();toast('Booking declined');
  notify(goingOf(b).map(to=>({to,kind:'bk_declined',data:{snap:{court:b.court,date:b.date,start:b.start,len:b.len}}})));render()},
 async bkAccept(v){const b=S.bookings.find(x=>x.id===v);if(!b)return;if((b.going||[]).length>=(b.cap||3)&&!(b.going||[]).includes(S.uid))return toast('This game is already full. The first 3 players said yes.');const nb=Object.assign({},b,{going:[...new Set([...(b.going||[]),S.uid])],declined:(b.declined||[]).filter(x=>x!==S.uid)});
  if(await patchBooking(nb)){notify([{to:b.by,kind:'invite_reply',data:{booking:b.id,ok:true}}]);closeSheet();doneTick('You’re in!');if(bkStatus(b)==='pending')toast('The club still needs to confirm this booking. You’ll get a message when it’s done.',4200);render()}},
 async bkDecline(v){const b=S.bookings.find(x=>x.id===v);if(!b)return;const nb=Object.assign({},b,{going:(b.going||[]).filter(x=>x!==S.uid),declined:[...new Set([...(b.declined||[]),S.uid])]});
  if(await patchBooking(nb,'Got it. The host has been told.')){notify([{to:b.by,kind:'invite_reply',data:{booking:b.id,ok:false}}]);closeSheet();render()}},
 bkCancel(v){const b=S.bookings.find(x=>x.id===v);if(!b)return;
  /* Staff (admin, owner, developer) cancelling a game can add a message for the players */
  if(b.kind!=='block'&&isGame(b)&&isAdmin())return openSheet(`<h2>Cancel this booking?</h2><p class="muted" style="margin:6px 0 14px">Everyone in the game and the club admins will be told.</p>
   <label for="bkCnText">Message to the players <span class="muted">(optional)</span></label>${countBox('bkCnText',300,'e.g. Sorry, court 2 is closed for repairs. We’ll find you another slot.')}
   <div class="cta" style="margin-top:16px"><button class="btn ghost" data-act="closeSheet" style="flex:1">Go back</button><button class="btn danger" data-act="bkCancelYes" data-v="${esc(v)}" style="flex:1">Cancel booking</button></div>`,bg=>bindCount(bg,'bkCnText',300));
  confirmSheet(b.kind==='block'?'Unblock these slots?':'Cancel this booking?',b.kind==='block'?'Players will be able to book this time again.':'Everyone in the game and the club admins will be told.',b.kind==='block'?'Unblock':'Cancel booking','bkCancelYes',v)},
 async bkCancelYes(v){const b=S.bookings.find(x=>x.id===v);if(!b)return;const nt=$('bkCnText'),note=nt&&isAdmin()?nt.value.trim().slice(0,300):'';try{await Store.delBooking(v)}catch(e){return toast(e.code==='denied'?'Only the host or an admin can cancel this.':'Could not cancel. Check your connection.')}
  S.bookings=S.bookings.filter(x=>x.id!==v);closeSheet();toast(b.kind==='block'?'Slots unblocked':'Booking cancelled');
  if(isGame(b))notify([...new Set([b.by,...(b.invited||[]),...vAdmins()])].map(to=>({to,kind:'cancelled',data:{snap:{court:b.court,date:b.date,start:b.start,len:b.len,confirmed:bkStatus(b)==='confirmed'},...(note?{note}:{})}})));render()},
 bkScore(v){const b=S.bookings.find(x=>x.id===v);if(!b)return;closeSheet(true);A=newA();
  if(S.R[b.court][S.uid])A.sport=b.court;A.date=b.date;A.time=b.start;A.len=b.len;A.booking=b.id;
  const others=goingOf(b).filter((x,i,a)=>x!==S.uid&&a.indexOf(x)===i);A.a=[{uid:S.uid},others[0]?{uid:others[0]}:null];A.b=[others[1]?{uid:others[1]}:null,others[2]?{uid:others[2]}:null];
  view.tab='add';window.scrollTo(0,0);render()},
 priceOpen(){priceSheet()},
 async priceBase(){const v=Math.round(+$('pBase').value);if(!(v>=0))return toast('Enter a price in rupees.');const c=Object.assign({},priceCfg(),{base:v});if(await savePrices(c,'Base price saved')){priceSheet();if(view.tab==='book')paintSlots()}},
 priceQuick(v){const [a,z]=v.split('|').map(Number);$('pFrom').value=a;$('pTo').value=z;priceSheet.sync&&priceSheet.sync();tick()},
 priceDays(v){const P=priceSheet.d;P.days=v;qsa('#pDays .fchip').forEach(b=>{const on=b.dataset.v===v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});$('pDate').hidden=v!=='date';$('pDow').hidden=v!=='dow';tick()},
 priceDow(v,el){const P=priceSheet.d,k=+v;P.dow=P.dow.includes(k)?P.dow.filter(x=>x!==k):[...P.dow,k];el.classList.toggle('on');el.setAttribute('aria-pressed',String(P.dow.includes(k)));tick()},
 priceCourt(v,el){priceSheet.d.court=v;qsa('[data-act="priceCourt"]').forEach(b=>{const on=b.dataset.v===v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});tick()},
 async priceAdd(){priceSheet.sync&&priceSheet.sync();const P=priceSheet.d,err=m=>{$('pErr').textContent=m};
  if(!(P.price>=0)||!isFinite(P.price))return err('Enter a price in rupees.');if(P.to<=P.from)return err('The end time must be after the start time.');
  if(P.days==='dow'&&!P.dow.length)return err('Pick at least one day.');if(P.days==='date'&&!P.date)return err('Pick a date.');
  const r={id:'pr_'+rid(),price:Math.round(P.price),from:P.from,to:P.to,days:P.days==='today'?'date':P.days,court:P.court};
  if(r.days==='date')r.date=P.days==='today'?today():P.date;if(r.days==='dow')r.dow=P.dow.slice().sort();
  const c=Object.assign({},priceCfg());c.rules=[...(c.rules||[]),r];if(await savePrices(c,'Price added')){priceSheet();if(view.tab==='book')paintSlots()}},
 async priceDel(v){const c=Object.assign({},priceCfg());c.rules=(c.rules||[]).filter(r=>r.id!==v);if(await savePrices(c,'Price removed')){priceSheet();if(view.tab==='book')paintSlots()}},
 commOpen(){commSheet()},
 async roleSet(x){const [v,club]=x.split('|'),id=playerSheet.open;if(!id||id===S.uid||isDev(id)||!VENUES.some(c=>c.id===club)||v===roleAt(id,club))return;const opts=roleChoices(club);if(!opts.includes(v)||!opts.includes(roleAt(id,club)))return;const p=prof(id);
  const coach=v==='coach'?{sports:(p.sports&&p.sports.length?p.sports:['padel']).slice(0,2),auto:false}:null,cn=venueOf(club).short;
  if(await applyRole(id,v,coach,false,club)){doneTick(v==='player'?'Now a player at '+cn:'Now '+(v==='admin'||v==='owner'?'an ':'a ')+v+' at '+cn);toast(`${first(p)} has been told.`)}},
 async coachSport(x){const [v,club]=x.split('|'),id=playerSheet.open,c=coachOf(id,club);if(!c)return;let sp=(c.sports||[]).includes(v)?c.sports.filter(y=>y!==v):[...(c.sports||[]),v];if(!sp.length)return toast('A coach needs at least one sport.');
  if(await applyRole(id,'coach',Object.assign({},c,{sports:SP_KEYS.filter(k=>sp.includes(k))}),true,club))tick()},
 async coachAuto(x){const [v,club]=x.split('|'),id=playerSheet.open,c=coachOf(id,club);if(!c)return;if(await applyRole(id,'coach',Object.assign({},c,{auto:v==='1'}),true,club))toast(v==='1'?`${first(prof(id))}’s coaching blocks now go straight through.`:`An admin now confirms ${first(prof(id))}’s coaching blocks.`)},
 phEdit(){const r=myPhone(),cc=r?r.phone.split(' ')[0]:'+91',num=r?r.phone.split(' ').slice(1).join(''):'';
  openSheet(`<h2>${r?'Change your phone number':'Add your phone number'}</h2><label for="phN">Phone number</label><div class="phrow">${ccSelect('phCC',CCS.some(x=>x[0]===cc)?cc:'+91')}<input id="phN" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="18" value="${esc(num)}" placeholder="98765 43210"></div>
   <label>Who can see it</label><div class="chips" id="phV">${PH_WHO.map(([k,n])=>`<button type="button" class="fchip${(r?r.vis:'admins')===k?' on':''}" aria-pressed="${(r?r.vis:'admins')===k}" data-phv="${k}">${n}</button>`).join('')}</div>
   <p class="ferr" id="phErr"></p><button class="btn brand wide" id="phSave">Save</button>`,bg=>{const st={vis:r?r.vis:'admins'};
    qsa('[data-phv]',bg).forEach(b=>b.onclick=()=>{st.vis=b.dataset.phv;qsa('[data-phv]',bg).forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on))});tick()});
    bg.querySelector('#phSave').onclick=async()=>{const ph=phoneOf($('phCC').value,$('phN').value);if(!ph)return $('phErr').textContent='That number doesn’t look right. Check it and try again.';
    const nr={phone:ph,vis:st.vis};try{await Store.savePhone(nr)}catch(e){return $('phErr').textContent=e.code==='nosql'?'Phone numbers need the latest SQL in Supabase first. Ask a club admin.':'Could not save. Check your connection.'}
    S.phones[S.uid]=nr;closeSheet();doneTick('Phone number saved');render()}})},
 async phVis(v){const r=myPhone();if(!r)return;const nr=Object.assign({},r,{vis:v});try{await Store.savePhone(nr)}catch(e){return toast('Could not save. Check your connection.')}S.phones[S.uid]=nr;tick();toast(v==='admins'?'Only admins can see your number now.':v==='friends'?'Admins and your friends can see your number now.':'Everyone in the club can see your number now.');render()},
 admMsgOpen(){admMsgSheet(null)},
 admReply(v){const g=S.msgs.find(x=>x.id===v);if(!g)return;const d=g.data||{};admMsgSheet({thread:d.thread,topic:d.topic,player:isAdmin()?d.player:null,quote:d.text})},
 reportOpen(v){closeSheet(true);setTimeout(()=>reportSheet(v),60)},
 async repOk(v){await repDecide(v,true)},
 async repNo(v){await repDecide(v,false)},
 invitePlayer(id){const p=prof(id),bk=bkState();if(!bk.invite.includes(id))bk.invite=[...bk.invite,id].slice(-3);
  const shared=(p.sports||[]).find(s=>mySports().includes(s));if(shared)bk.court=shared;bk.sel=null;closeSheet(true);go('book');toast(`Pick a free time and tap Request booking. ${first(p)} will get your invite.`,3600)},
 invPref(){const p=Object.assign({},me(),{invites:!me().invites});Store.saveProfile(p).then(()=>{upsert(S.profiles,p);tick();toast(p.invites?'Players can now invite you to games':'You won’t show up in game invites');render()},()=>toast('Could not save. Check your connection.'))},

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
 wBand(v){const [sp,b]=v.split('|'),q=W.d.q[sp];if(b==='pro'){tick();return proLockSheet(sp)}W.jp='wBand|'+v;if(q.band!==b){q.band=b;q.ans=[];q.pick=[]}paintWiz(false);wPickThenNext()},
 wAns(v){W.jp='wAns|'+v;const [sp,qi,j]=v.split('|'),q=W.d.q[sp];q.pick=q.pick||[];q.pick[+qi]=+j;q.ans[+qi]=QS[sp][q.band][+qi][1][+j][1];paintWiz(false);wPickThenNext()},
 go(v){go(v)},
 rankSport(v){view.rs=v;const e=S.R[v][S.uid];view.rt=e?tierOf(v,e.r):view.rt;render()},
 rankTier(v){view.rt=v;render()},
 rankGender(v){view.rg=v;render()},
 rankMe(){const sp=view.rs,e=S.R[sp][S.uid];if(!e)return;const p=me(),t=tierOf(sp,e.r);let moved=false;
  if(view.rt!==t){view.rt=t;moved=true}if(view.rg&&view.rg!=='all'&&p.gender!==view.rg){view.rg='all';moved=true}
  if(moved)render();setTimeout(()=>{const el=$('rkMe');if(!el)return;el.scrollIntoView({block:'center',behavior:calm()?'auto':'smooth'});el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');tick()},moved?350:0)},
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
 gameEdit(v){G=null;gameSheet(v)},
 egPick(v){egPicker(v)},
 egBack(){if(G)gameSheet(G.mid)},
 histMore(){view.histAll=true;render()},
 gameCancel(v){G=null;
  openSheet(`<h2>Cancel this game?</h2><p class="muted" style="margin:6px 0 14px">It’s removed from the club’s games and everyone’s levels are worked out again without it. The players get a message saying you cancelled it.</p>
   <label for="gcType">Type <b>CANCEL GAME</b> to confirm</label><input id="gcType" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CANCEL GAME">
   <div class="cta" style="margin-top:16px"><button class="btn ghost" data-act="closeSheet" style="flex:1">Go back</button><button class="btn danger" id="gcYes" data-act="gameCancelYes" data-v="${esc(v)}" style="flex:1" disabled>Cancel game</button></div>`,bg=>{
   const inp=bg.querySelector('#gcType'),btn=bg.querySelector('#gcYes');inp.oninput=()=>{btn.disabled=inp.value.trim().replace(/\s+/g,' ').toUpperCase()!=='CANCEL GAME'}})},
 async gameCancelYes(v){const t=$('gcType');if(!t||t.value.trim().replace(/\s+/g,' ').toUpperCase()!=='CANCEL GAME')return;const m=S.matches.find(x=>x.id===v);if(!m)return closeSheet();
  try{await Store.delMatch(v)}catch(e){return toast(e.code==='denied'?'Only admins at this club can cancel games.':'Could not cancel. Check your connection.')}
  S.matches=S.matches.filter(x=>x.id!==v);S.confs=S.confs.filter(c=>c.match!==v);rate();closeSheet();render();doneTick('Game cancelled');
  notify(regsOf(m).map(to=>({to,kind:'game_cancel',data:{snap:gameSnap(m)}})))},
 aWho(v){const o=v==='others';if(!!A.others===o)return;A.others=o;A.extra3=false;const n=A.format==='singles'?1:2;A.a=Array(n).fill(null);A.b=Array(n).fill(null);
  if(!o){A.a[0]={uid:S.uid};if(!addSports().includes(A.sport)&&addSports().length)A.sport=addSports()[0]}render()},
 delMatch(v){confirmSheet('Delete this score?','Everyone’s levels from this game are recalculated without it.','Delete','delMatchYes',v)},
 async delMatchYes(v){try{await Store.delMatch(v)}catch(e){return toast(e.code==='denied'?'Only the player who added it, or an admin, can delete this score.':'Could not delete. Check your connection.')}const gm=S.matches.find(m=>m.id===v);S.matches=S.matches.filter(m=>m.id!==v);S.confs=S.confs.filter(c=>c.match!==v);rate();closeSheet();render();toast('Score deleted');
  if(gm&&isAdmin()&&gm.by!==S.uid)notify(regsOf(gm).map(to=>({to,kind:'game_cancel',data:{snap:gameSnap(gm)}})))},
 editProfile(){startWiz('edit')},
 retake(v){const L=me().levels||{};if(L[v]&&isFinite(+L[v].start))return toast('Your starting level is set. Play games to move it.');startWiz('level',[v])},
 wRetake(sp){const d=W.d;d.q[sp]={band:'',ans:[]};W.i=wSteps().indexOf('band:'+sp);W.dir=-1;window.scrollTo(0,0);paintWiz()},
 pref(v){setPref(v,!prefs[v]);render();if(v==='haptics'&&prefs.haptics)buzz([12,40,12]);if(v==='sound'&&prefs.sound)sfx('pop');if(v==='popups'&&prefs.popups)celebrate('Pop-ups on');
  const r=$('r-'+v);if(r){r.classList.add('play');setTimeout(()=>r.classList.remove('play'),1000)}},
 demo(){demoChooser()},demoNew(){closeSheet(true);demoNewPlayer()},demoGo(v){startDemo(DEMO_AS.some(x=>x[0]===v)?v:'player')},exitDemo(){exitDemo()},
 signOut(){confirmSheet('Sign out?','You can sign back in with your email and password.','Sign out','signOutYes')},
 async signOutYes(){if(Store.mode==='demo')return exitDemo();closeSheet(true);await Store.signOut();S.uid=null;A=null;view.tab='home';authMode='in';showWelcome('start')},
 /* inbox */
 ibTab(v){view.ib=v;render()},
 ibTodo(){view.ib='todo';go('inbox')},
 async cfOk(id){const g=S.msgs.find(x=>x.id===id),m=g&&S.matches.find(x=>x.id===g.data.match);if(!m)return;
  const c={id:'c_'+rid(),match:m.id,user:S.uid,verdict:'ok',at:new Date().toISOString()};
  try{await Store.addConf(c)}catch(e){return toast('Could not confirm. Check your connection.')}S.confs.push(c);rate();doneTick('Score confirmed');render()},
 cfChange(id){const g=S.msgs.find(x=>x.id===id);if(!g)return;if(lockedGame(S.matches.find(x=>x.id===g.data.match)))return toast('This game is over a week old, so its score is final.');disputeSheet(g.data.match,id)},
 review(v){reviewSheet(v)},
 pvTab(v){view.pv=v;render()},
 theme(v){setPref('theme',v);sfx('soft');tick();render();const p=me();if(p&&S.uid&&Store.mode!=='demo'&&p.theme!==v){const np=Object.assign({},p,{theme:v});Store.saveProfile(np).then(()=>upsert(S.profiles,np),()=>{})}},
 popPreview(){celebrate('This is a pop-up')},
 async notifAsk(){if(!NOTIF_OK())return toast('This browser can’t show notifications.');closeSheet(true);
  try{const r=await Notification.requestPermission();if(r==='granted'){doneTick('Notifications on');try{new Notification('OneCourt',{body:'You’ll hear about scores, friend requests and kudos here.',icon:'brand/icon-192.png',badge:'brand/icon-192.png'})}catch(e){}}else toast('Notifications stay off. You can turn them on in Settings.')}catch(e){}
  if(view.tab==='settings')render()},
 rankRefresh(v,el){if(el)el.classList.add('spinning');loadRank(true)},
 demoSwitch(v){demoSwitch(v)},demoAcc(v){setDemoAcc(v)},demoResetAsk(){demoResetAsk()},demoResetYes(){demoReset()},
 pvGo(v){view.pv=v;go('players')},

 aDate(v){A.date=v;if(A.time!=null&&(slotDate(v,A.time)>new Date()))A.time=null,A.len=0;tick();render()},
 aCourt(v){A.courtNo=+v;render()},
 aTime(){timeSheet()},
 kudos(v){kudosSheet(v)},
 mgTab(v){view.mg=v;render()},lvDrop(v){const [sp,k]=v.split('|');lvDropSheet(sp,k)},lvDropYes(v){const [sp,k]=v.split('|');lvDropYes(sp,k)},
 proLock(v){tick();proLockSheet(v)},proSet(v){setPro(v)},lvUpAsk(v){lvUpSheet(v)},lvUp(v){lvUpSheet(v)},lvUpYes(v){lvUpYes(v)},lvStay(v){const E=S.R[v][S.uid];ls.set('rc_lvstay_'+S.uid+'_'+v,E?E.n:0);closeSheet();toast('Staying put. We’ll ask again after your next game.');render()},
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
 adOpen(v){adOpen(v)},adClose(){adClose()},adStep(v){if(adFull)adFullShow(adFull.i+(+v||0))},adEdit(){adEdit()},
 adBg(v){if(!adEd)return;const [i,c]=v.split('|'),a=adEd.items[+i];if(a){a.bg=c;tick();adEdPaint()}},
 adMove(v){if(!adEd)return;const [i,d]=v.split('|').map(Number),it=adEd.items,j=i+d;if(j<0||j>=it.length)return;[it[i],it[j]]=[it[j],it[i]];tick();adEdPaint()},
 adDel(v){if(!adEd)return;adEd.items.splice(+v,1);tick();adEdPaint()},
 adAddUrl(){if(!adEd)return;const u=($('adUrl').value||'').trim();if(!/^https:\/\/\S+$/i.test(u))return toast('Paste a full link starting with https://');adEd.items.push({src:u,bg:adType({src:u})==='video'?'#000000':'#f2eee9'});tick();adEdPaint()},
 adSave(){adSave()},adWhich(v){if(!adEd||!adDev())return;tick();adEdStart(v==='default'?'default':VID)},adUseDefault(){adUseDefault()},
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
 paintBadge();if(unread()>before){const g=S.msgs.find(x=>!x.read);if(g){const t=document.createElement('div');t.innerHTML=msgView(g).t;sfx('ding');buzz([20,80,20]);toast('New message: '+t.textContent,3600);sysNotify('OneCourt',t.textContent)}}
 const a=document.activeElement,typing=a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName);
 if($('app').hidden||typing||$('sheetBg')||view.tab==='add'){rmPending=true;return}render()},400)}
document.addEventListener('focusout',()=>setTimeout(()=>{if(rmPending&&!$('app').hidden&&!$('sheetBg')&&view.tab!=='add'){rmPending=false;render()}},60));

/* ================= Start ================= */
/* OneCourt's opening screen. Sign in once at the start; after that, pick a court and go straight in.
   Picking a club you haven't played at joins it on the spot (no second sign-in) and you start there as yet to play. */
function showWelcome(mode){const el=$('welcome');if(!el)return;applyMP();
 const pick=mode==='pick',p=pick&&me();
 $('wPick').textContent=pick?'Pick a court to begin':'';$('wPick').hidden=!pick;
 $('wHi').innerHTML=p?`${p.setup&&venuesOf(p).length?'Welcome back':'You’re all set'}, <b>${esc(first(p))}</b>`:'';$('wHi').hidden=!p;
 $('wCourts').innerHTML=mode==='start'?`<p class="wnote">Sign in once, then play at every club without signing in again.</p><button type="button" class="btn ball wide wbig" id="wIn">Sign in</button><button type="button" class="btn wghost wide" id="wUp">Create an account</button>`
  :pick?`<label class="wfind"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="wFind" type="search" placeholder="Find a venue or area" aria-label="Find a venue" autocomplete="off" enterkeyhint="search"></label>`+VENUES.map(v=>{const mine=isMember(S.uid,v.id);return`<button type="button" class="wcourt" data-court="${esc(v.id)}" data-find="${esc([v.name,v.place||'',v.area,v.courts,v.also||''].join(' ').toLowerCase())}"><span class="wmark w-${esc(v.id)}"><img src="${esc(v.logo)}" alt=""></span><span><b>${esc(v.name)}</b><small>${esc(v.place||v.area)}</small>${mine?'':'<em class="wnew">New to you · yet to play</em>'}</span><span class="go" aria-hidden="true">›</span></button>`}).join('')
   +SOON.map(v=>`<button type="button" class="wcourt soon" data-soon="${esc(v.id)}" data-find="${soonFind(v)}"><span class="wmark w-${esc(v.id)}"><img src="${esc(v.logo)}" alt=""></span><span><b>${esc(v.name)}</b><small>Joining OneCourt soon</small><em class="wnew soon">Coming soon</em></span></button>`).join('')
   +(Store.mode==='demo'&&S.uid!=='d_new'?`<button type="button" class="wlink" id="wDemoNew">Demo: try the first-time sign-in as a new player</button>`:'')
  :`<div class="wwait" aria-label="Loading"><i></i><i></i><i></i></div>`;
 $('wFoot').textContent='OneCourt · V'+APP_VER;
 qsa('#wCourts [data-court]').forEach(b=>b.onclick=()=>enterCourt(b.dataset.court));
 qsa('#wCourts [data-soon]').forEach(b=>b.onclick=()=>soonToast(b.dataset.soon));
 if($('wIn'))$('wIn').onclick=()=>{tick();showAuth('in')};
 if($('wUp'))$('wUp').onclick=()=>{tick();showAuth('up')};
 if($('wDemoNew'))$('wDemoNew').onclick=demoNewPlayer;
 if($('wFind')){const f=$('wFind');f.oninput=()=>{const q=f.value.trim().toLowerCase().split(/\s+/).filter(Boolean);let n=0;
  qsa('#wCourts [data-find]').forEach(b=>{const ok=q.every(w=>b.dataset.find.includes(w));b.hidden=!ok;if(ok)n++});
  let no=$('wNone');if(!n&&!no){no=document.createElement('p');no.id='wNone';no.className='wnone';f.closest('.wfind').after(no)}
  if(no){no.hidden=!!n;no.textContent=n?'':'No venues match “'+f.value.trim()+'” yet.'}}}
 $('auth').hidden=true;$('wiz').hidden=true;$('app').hidden=true;closeSheet(true);el.hidden=false;el.scrollTop=0;
}
function soonToast(id){const v=SOON.find(x=>x.id===id);if(!v)return;tick();toast(v.name+' is coming soon to OneCourt. Check back for courts and booking.')}
function showPicker(){showWelcome('pick')}
/* Into a court: its loading screen, then straight into the club */
async function enterCourt(vid){if(!VENUES.some(x=>x.id===vid))return;tick();
 const isNew=!isMember(S.uid,vid);
 if(isNew&&!await joinVenue(vid))return;
 VID=vid;ls.set('rc_venue',vid);applyVenue();$('welcome').hidden=true;
 try{await reload()}catch(e){toast('Could not load the club data. Check your connection.')}
 A=null;view.bk=null;Object.assign(view,{tab:'home',rs:null,rt:null,ib:'all',mg:'all'});window.scrollTo(0,0);
 splash(VEN().name,'Welcome to',VEN());showApp();maybeAskNotif();
 if(isNew)setTimeout(newHere,calm()?700:2000);
}
(async function boot(){
 applyMP();
 try{await Store.init()}catch(e){console.warn(e)}
 let id=null;try{id=await Store.session()}catch(e){}
 if(recovery){applyVenue();if(id){S.uid=id;await enter(false)}else showAuth();booted=true;return setTimeout(showReset,300)}
 if(id){showWelcome('wait');S.uid=id;await enter(false)}else showWelcome('start');
 booted=true;
})();
