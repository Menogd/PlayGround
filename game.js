/* PAPER TOWN: School RP v2 — fan-made original code+art. No show assets. */
"use strict";
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=960,H=540;
const $=id=>document.getElementById(id);
const toastEl=$('toast'),dlgEl=$('dlg'),dlgName=$('dlg-name'),dlgText=$('dlg-text'),dlgOpts=$('dlg-opts'),portrait=$('portrait').getContext('2d');
const previewC=$('preview').getContext('2d');

/* ---------- utils ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const rectsOverlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function toast(msg,ms=2800){toastEl.textContent=msg;toastEl.classList.remove('hidden');clearTimeout(toastEl._t);toastEl._t=setTimeout(()=>toastEl.classList.add('hidden'),ms);}

/* ---------- input ---------- */
const keys={};
addEventListener('keydown',e=>{
  const tgt=e.target;
  if(tgt&&(tgt.tagName==='INPUT'||tgt.tagName==='TEXTAREA')){
    if(e.key==='Enter'){e.preventDefault();sendCustom();}
    else if(e.key==='Escape'){tgt.blur();endDialogue();}
    e.stopPropagation();
    return;
  }
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(k==='escape'){
    if(GAME.inDialogue){endDialogue();toast('You walked away.');}
    else $('mapmodal').classList.add('hidden');
    return;
  }
  if(GAME.started&&!GAME.inDialogue){
    if(k==='e'||k===' '||k==='enter')tryInteract();
    if(k==='m')toggleMap();
    if(k==='h')tryHoldHands();
    if(k==='j')tryHug();
    if(k==='t'){player.x=480;player.y=380;player.vx=player.vy=0;toast('Unstuck! (T) Poof — center of map.');}
    if(k==='l')toast(GAME.hasTray?'🍱 You have your lunch tray. Sit at a table (E)!':'No tray yet — Cafeteria at Lunch, press E at the counter.');
  } else if(GAME.inDialogue){
    if(k==='e'||k===' '||k==='enter')advanceDialogue();
    if(k==='1')pickOpt(0);
    if(k==='2')pickOpt(1);
    if(k==='3')pickOpt(2);
    if(k==='4')pickOpt(3);
    if(k==='5')pickOpt(4);
    if(k==='h')tryHoldHands();
    if(k==='j')tryHug();
  }
});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
canvas.addEventListener('click',e=>{
  if(!GAME.started)return;
  if(GAME.inDialogue){
    // clicking portrait/text advances unless they clicked X (X is HTML, not canvas)
    advanceDialogue();return;
  }
  const r=canvas.getBoundingClientRect();
  const mx=(e.clientX-r.left)*(W/r.width),my=(e.clientY-r.top)*(H/r.height);
  const t=nearestInteractable(mx,my);
  if(t)startDialogue(t.prop?t:(t.o||t));
});
$('dlg-x').onclick=(ev)=>{ev.stopPropagation();endDialogue();toast('You ended the chat.');};

/* ---------- skins ---------- */
const SKINS=[
  {id:'light', label:'Light', color:'#f4c99b'},
  {id:'tan', label:'Tan (Latino)', color:'#d9a066'},
  {id:'brown', label:'Brown', color:'#a06a3b'},
  {id:'dark', label:'Dark (Black)', color:'#6e4423'},
  {id:'deep', label:'Deep', color:'#4a2c15'},
];
const skinById=id=>(SKINS.find(s=>s.id===id)||SKINS[0]).color;

/* ---------- dating map (canon couples) ---------- */
const DATING={stan:'wendy',wendy:'stan',craig:'tweek',tweek:'craig',token:'nichole',nichole:'token'};
const isDating=(pid,nid)=>DATING[pid]===nid;
const MAIN4=['stan','kyle','cartman','kenny']; // the core crew: can recruit each other & visit homes
/* ---------- trouble system: detention for all, grounding for non-Cartmans ---------- */
function isCartmanPlayer(){return !GAME.isCustom&&GAME.player&&GAME.player.id==='cartman';}
function addTrouble(reason){
  GAME.trouble.detentions++;
  if(isCartmanPlayer()){toast(`⛔ DETENTION #${GAME.trouble.detentions}! (${reason}) Liane won't care. Lucky piggy.`);}
  else{GAME.trouble.grounded=true;GAME.trouble.reason=reason;toast(`⛔ DETENTION #${GAME.trouble.detentions} + GROUNDED! (${reason}) Face your parents at home!`);}
}
function groundPlayer(reason){
  if(isCartmanPlayer()){toast(`Liane doesn't care what you do. Lucky piggy.`);return;}
  GAME.trouble.grounded=true;GAME.trouble.reason=reason;
  toast(`⛔ GROUNDED! (${reason}) Face your parents at home!`);
}

/* ---------- ALL PARENTS (everyone gets family!) ---------- */
const PARENTS={
  stan:[['Randy','dad'],['Sharon','mom']], kyle:[['Gerald','dad'],['Sheila','mom']],
  cartman:[['Liane','mom']], kenny:[['Stuart','dad'],['Carol','mom'],['Karen (sister)','sis']],
  butters:[['Stephen','dad'],['Linda','mom']], craig:[['Thomas','dad'],['Laura','mom'],['Tricia (sis)','sis']],
  tweek:[['Richard','dad'],['Mrs. Tweak','mom']], clyde:[['Roger','dad']],
  token:[['Steve Black','dad'],['Linda Black','mom']], wendy:[['Mr. Testaburger','dad'],['Mrs. Testaburger','mom']],
  bebe:[["Bebe's Mom",'mom']], jimmy:[['Mr. Valmer','dad'],['Mrs. Valmer','mom']],
  nichole:[["Nichole's Mom",'mom']], henrietta:[["Henrietta's Mom",'mom']],
  teacher:[], lunchlady:[],
};
function parentSpec(kind){
  if(kind==='mom'||kind==='gran')return{hair:'long',hairc:'#5b3a1e',jacket:'#e84393',pants:'#444'};
  if(kind==='sis')return{hair:'pigtails',hairc:'#6b4a2f',jacket:'#7fb3d5',pants:'#444'};
  return{hair:'flat',hairc:'#3a3a3a',jacket:'#2e86c1',pants:'#333'};
}

/* ---------- CANON ROSTER — show-accurate colors, original paper art ---------- */
const CANON=[
 {id:'stan',name:'Stan',desc:'Stan♥Wendy (on/off) · BFF: Kyle',skin:'light',hair:'flat',hairc:'#2b2b55',hat:'#38618f',hatStyle:'flap-pom',pom:'#c0392b',jacket:'#7a5230',pants:'#2f4d7a',twitch:'none',partner:'Wendy',bestie:'Kyle',
  fact:'Dog Sparky. Plays guitar. On/off with Wendy since kindergarten.',
  lunch:'Chicken nuggets + chocolate milk.',
  openers:["Dude! There you are. Normal day, right? ...Right?","Kyle's gonna kill Cartman again. Wanna watch?","Sparky did the funniest thing this morning, dude.","Ugh, Wendy's mad at me and I don't even know WHY this time."],
  bark:['Dude!','Sweet!','Huh?']},
 {id:'kyle',name:'Kyle',desc:"Stan's BFF · hot-headed",skin:'light',hair:'afro',hairc:'#c96a1e',hat:'#3fa34d',hatStyle:'ushanka',jacket:'#e67e22',pants:'#2c5f2d',twitch:'none',partner:null,bestie:'Stan',
  fact:'Cousin Kyle from Connecticut. Basketball + Fleetwood Mac.',
  lunch:'Salad (mom packs it) + apple.',
  openers:["Dude, Cartman is PLANNING something. I can feel it.","My mom packed me salad. AGAIN. Trade me?","Stan! Tell them they're wrong. You always take my side, right?","You ever notice Kenny knows WAY too much about stuff?"],
  bark:['No way!','Dude!','Ugh!']},
 {id:'cartman',name:'Cartman',desc:'Big-boned · authoritah!',skin:'light',hair:'flat',hairc:'#6b4a2f',hat:'#4aa3df',hatStyle:'beanie',pom:'#f7dc6f',jacket:'#c0392b',pants:'#6b4a2f',twitch:'none',fat:true,partner:null,bestie:null,
  fact:'Cat Mr. Kitty. Mom Liane. Secret chili recipes. Do NOT ask.',
  lunch:'Double cheeseburger + ALL the fries.',
  openers:["Oh GREAT, it's you. You bring snacks? No? Then screw you guys— ...I'm kidding. Mostly.","I'm NOT fat, I'm big-boned! ...Okay, and a little big-jacketed.","Kyle's a jerk, Stan's confused, Kenny's poor, Butters is grounded. Business as usual.","I have a plan. It involves you doing everything and me eating."],
  bark:['Sweet!','Lame!','Meh!']},
 {id:'kenny',name:'Kenny',desc:'Mmmph! · poor & sweet',skin:'light',hair:'flat',hairc:'#c98d4b',hat:'#e67e22',hatStyle:'parka',jacket:'#e67e22',pants:'#5d4037',twitch:'none',partner:null,bestie:'Stan & Kyle',
  fact:'Little sis Karen. Knows stuff. Dies a lot in old episodes, fine now.',
  lunch:"Free lunch. Whatever's left.",
  openers:["(muffled) Mmmph mmph! (that means 'hey!')","(muffled) Mmmph mmmph mmmph! (that was a whole story about his sister)","(muffled) Mmmph! (he offers you half his sandwich. What a guy.)","(muffled) Mmmph mmmph?! (he wants to know if you saw the new Terrance & Phillip)"],
  bark:['Mmmph!','Mmph!','...Mmmph.']},
 {id:'butters',name:'Butters',desc:'Oh hamburgers! · sweetest',skin:'light',hair:'flat',hairc:'#f2d06b',hat:null,hatStyle:null,jacket:'#7fb3d5',pants:'#2e7d32',twitch:'none',partner:null,bestie:'Everyone',
  fact:'Alter-ego Professor Chaos! Loves anime. Grounded: always.',
  lunch:'PB&J cut in triangles.',
  openers:["Oh hamburgers, hi! You wanna be friends? Please say yes!","Do you think I'm grounded right now? I feel grounded.","Professor Chaos may strike at recess! ...Don't tell my parents.","Have you seen my ninja star? Kidding! ...Unless?"],
  bark:['Oh boy!','Gee!','Ouch!']},
 {id:'craig',name:'Craig',desc:'Craig ♥ Tweek',skin:'light',hair:'flat',hairc:'#191919',hat:'#3b83c4',hatStyle:'chullo',pom:'#f7dc6f',jacket:'#3b83c4',pants:'#232323',twitch:'none',partner:'Tweek',bestie:'Tweek',
  fact:"Boyfriends with Tweek (canon). Guinea pig Stripe. Flips you off = love.",
  lunch:'Just... food. Whatever.',
  openers:["...Hey. Tweek's pacing again. Walk with me to calm him down?","People stare at us. Let them. ...Whatever.","Stripe learned a new trick. Tweek cried. It was nice.","School sucks. You don't. ...Don't quote me."],
  bark:['...Hey.','Whatever.','Huh.']},
 {id:'tweek',name:'Tweek',desc:'Tweek ♥ Craig · GAH!',skin:'light',hair:'messy',hairc:'#d9c07a',hat:null,hatStyle:null,jacket:'#6f6390',pants:'#3a3a5e',twitch:'alot',partner:'Craig',bestie:'Craig',
  fact:"Tweak Bros coffee. Boyfriends with Craig. Heart beats SO fast. GAH!",
  lunch:'Chocolate milk. NOT coffee. Dad said NO.',
  openers:["GAH! Hi! Sorry— too loud?! *twitch* Hi. Hi hi hi.","Craig doodled our initials. OUR INITIALS. *vibrates*","Dad says no more coffee. Dad doesn't understand PRESSURE.","Is the bell too loud for you too?! No?! Lucky!!"],
  bark:['GAH!','Eep!','*twitch*']},
 {id:'clyde',name:'Clyde',desc:'Pizza enjoyer · ex of Bebe',skin:'light',hair:'flat',hairc:'#5b3a1e',hat:null,hatStyle:null,jacket:'#a93226',pants:'#5b5b5b',twitch:'none',partner:null,bestie:'Token',
  fact:'Dated Bebe briefly. Loves pizza. Cries at sad dog movies.',
  lunch:'Pizza. Obviously.',
  openers:["Dude, pizza day is the best day. FIGHT ME.","Me and Bebe? Old news. We're cool. ...Are we cool?","Token's place has an arcade. AN ARCADE.","You think my hair looks okay? Be honest. ...No, lie."],
  bark:['Sweet!','Aww!','Huh?']},
 {id:'token',name:'Token',desc:'Token ♥ Nichole',skin:'dark',hair:'flat',hairc:'#101010',hat:null,hatStyle:null,jacket:'#7d3c98',pants:'#5d6d7e',twitch:'none',partner:'Nichole',bestie:'Clyde',
  fact:'Dating Nichole (canon). Bassist + singer. Has everything, shares everything.',
  lunch:'Gourmet lunchbox. Obviously.',
  openers:["Yo. Nichole say hi yet? She talks about you. Good stuff.","Studio session later. You play anything? Air guitar counts.","People think money = happy. Nah. Friends = happy. ...Money helps though.","Clyde ate my dessert. I'm handling it maturely. (I'm not.)"],
  bark:['Yo.','Heh.','Nice.']},
 {id:'wendy',name:'Wendy',desc:'President · Stan♥Wendy',skin:'light',hair:'long',hairc:'#161616',hat:'#e8a0bf',hatStyle:'beret',jacket:'#a93256',pants:'#6c3483',twitch:'none',partner:'Stan',bestie:'Bebe',
  fact:'Student president. Feminist icon. On/off with Stan forever.',
  lunch:'Veggie wrap + water.',
  openers:["Stan did something stupid. I don't know what yet. Preemptive sigh.","Student council Thursday. You SHOULD join. No boys-club nonsense.","Bebe and I are starting a petition. Sign it. Trust me.","Sea life fundraiser! ...Don't ask Stan to help. He'll cry. Again."],
  bark:['Hmph.','Hey!','Ugh.']},
 {id:'bebe',name:'Bebe',desc:"Wendy's BFF · fashion",skin:'light',hair:'curly',hairc:'#f0b429',hat:null,hatStyle:null,jacket:'#e67e22',pants:'#2e7d32',twitch:'none',partner:null,bestie:'Wendy',
  fact:'Dated Clyde for an episode. Shopping > everything.',
  lunch:'Fries + gossip.',
  openers:["Oh! My! God! Did you SEE Wendy's hair today? Flawless.","Clyde keeps staring. UGH. ...Is my hair okay though?","Fashion emergency meeting at lunch. Be there.","Wendy! Tell them! ...Sorry, reflex."],
  bark:['OMG!','Hee!','Ew!']},
 {id:'jimmy',name:'Jimmy',desc:'C-c-comedian!',skin:'light',hair:'flat',hairc:'#6b4a2f',hat:null,hatStyle:null,jacket:'#c9a227',pants:'#6b4a2f',twitch:'none',partner:null,bestie:'Timmy',
  fact:'Best friends with Timmy. "Terrific audience!" Fish sticks? CLASSIC.',
  lunch:'Hot dog + a joke.',
  openers:["W-w-wow, what a t-t-terrific hallway!","Got a new bit about lunch meat. It's KILLER. Like, literally? No. Comedy killer.","Timmy said 'Timmy!' today. Hilarious guy.","You wanna hear a joke? Too bad— you're gonna!"],
  bark:['W-wow!','Ha!','Timmy!']},
 {id:'nichole',name:'Nichole',desc:'Token ♥ Nichole · cheer',skin:'dark',hair:'pigtails',hairc:'#101010',hat:null,hatStyle:null,jacket:'#e84393',pants:'#6c3483',twitch:'none',partner:'Token',bestie:'Wendy',
  fact:'Cheer captain. Dating Token (canon). Here comes the cheer!',
  lunch:'Smoothie bowl.',
  openers:["Heyyy! Cheer tryouts Friday! You're coming, right? RIGHT?","Token wrote me a SONG. A whole one! With chords!","Wendy's petition? Signed it twice. Don't tell.","Hair flip practice at recess. Join us!"],
  bark:['Heyyy!','Yay!','Woo!']},
 {id:'henrietta',name:'Henrietta',desc:'Goth · death, darkness',skin:'light',hair:'long',hairc:'#0d0d0d',hat:null,hatStyle:null,jacket:'#26262e',pants:'#26262e',twitch:'none',partner:null,bestie:'Goths',
  fact:'Goth kid. Poe fan. Sad poetry. Secretly likes fries.',
  lunch:'Black coffee. Pain.',
  openers:["Go away, conformist. ...That bench is free though. Whatever."," Wrote a poem about this hallway. It's called 'Fluorescent Hell'.","Hot Topic is a conformist trap. ...I still go.","Your aura is... beige. Fascinating. Stay."],
  bark:['...Tch.','Ugh.','...Whatever.']},
];
const canonById=id=>CANON.find(c=>c.id===id);

/* Custom-kid extra lines when talking to canon kids */
const CUSTOM_OPENERS=[
 "Oh hey, you're the NEW kid! {name}, right? South Park is weird. You'll fit in.",
 "Whoa — new kid! I'm {n}. You just moved here? Which house? The old... haunted one?",
 "Hey {name}! Love the {hair} — I'm {n}. Sit with us at lunch, okay?",
 "New kid!! What's your story? Tragic backstory? Secret powers? ...Just a new house? Still cool.",
 "Yo {name}, I'm {n}. Rule 1: don't eat Cartman's fries. Rule 2: there are no other rules.",
 "Hi! Are your parents nice? Mine are... present. That's what counts.",
];
const ROMANTIC={
 'craig->tweek':["Babe. Come here. *opens arms* Stupid day's better when you're vibrating next to me.","Hey. Breathe with me. In... out... Good. Wanna split fries at lunch? My fries are your fries.","Everyone's staring. Let them. *holds your hand* ...Whatever. (I love you.)"],
 'tweek->craig':["CRAIG!! GAH! You came!! My heart— *twitch* —okay it's beating for YOU now!","Hold my hand?! The hallway is spinning and you're the only still thing! GAH— thank you—","I saved you the good chocolate milk! The COLD one! That's love, right?!"],
 'stan->wendy':["Wendy! Hey. I didn't trip this time. Growth. ...Are we good today? Please say yes.","I wrote you a song. It's bad. But it's YOUR bad song.","Super best friends AND... super best... boyfriend? Is that okay to say?"],
 'wendy->stan':["Stan. Hi. You look nervous. It's cute. Don't be nervous. ...Okay, be a little nervous.","I told Bebe we're good today. Don't make me a liar, Marsh.","Walk me to class? As my... you know. Person."],
 'token->nichole':["Heyyy, there's my guy. Saved you a seat. Obviously. Always.","Cheer was amazing today. I recorded it. Don't be mad. Be flattered.","Share my smoothie? ...That was smooth, right? Tell me that was smooth."],
 'nichole->token':["Yo Token — Nichole's been asking about you. Don't blow it, man.","She saved you a seat AND a fry. That's true love, dude.","You two are disgustingly cute. Keep it up."],
};
const TEASE_ABOUT_PARTNER={
 craig:["Go cuddle your boyfriend, lovebirds. ...Respect, though.","Tweek's pacing by the swings. Go fix him. Couple stuff."],
 tweek:["Craig's pretending not to watch you. He's watching. Trust me.","You two are literally the school's love story. Gross. Adorable."],
 stan:["Wendy's looking for you, loverboy. Run.","Stan Marsh, boyfriend duties call. GO."],
 wendy:["Stan's doing something dumb near the slide. Your boyfriend. Your problem.","You two break up every week and I'm TIRED. Stay together this time!"],
 token:["Nichole saved you a seat, Romeo. Move.","Couple of the year over here. Go sit with her!"],
 nichole:["Token's bragging about you again. It's cute. Go find him.","Cheer captain's boyfriend — that's YOU-adjacent. Go say hi!"],
};

/* ---------- EXTRA dialogue pack (v3: more variety, tease fix support) ---------- */
const EXTRA_OPENERS={
 stan:["Wendy smiled at me today. TODAY IS THE BEST DAY.","If Cartman says 'screw you guys' again I'm counting it. That's 12 this week."],
 kyle:["My cousin Kyle writes the WEIRDEST letters. Connecticut is broken.","I brought an extra apple. It's for Stan. ...Okay, it's for whoever's nicest. It's for Stan."],
 cartman:["I'm starting a band. I'm singer, manager, and food. You can be... audience.","My mom says I'm handsome. My mom is always right. Respect that."],
 kenny:["(muffled) Mmmph mmmph! (he's telling you about Karen's new drawing — it's on the fridge)","(muffled) Mmmph?! (he wants to trade desserts. His dessert is better. Take the deal.)"],
 butters:["I found a cool stick! It's my adventure stick now. Wanna see? It's... just a stick. But it's COOL.","My grandma says I have 'moxie'. Don't know what that is but I said thank you!"],
 craig:["Tricia stole my fries. FAMILY. Can't trust anyone.","Mr. Harris gave homework. Homework. On a day like this. Criminal."],
 tweek:["The bell rang and I jumped SO high! Did you see?! Everyone saw. GAH!","Craig told me to breathe. I'm breathing! Are YOU breathing?! Keep breathing!"],
 clyde:["I learned a magic trick! It went wrong. The card is... gone. Don't tell Token.","My dog jumps really high. Higher than Kenny. Don't tell Kenny."],
 token:["New bass line. It's funky. Everything I do is funky. It's a burden.","My dad says hi, by the way. He says that about everyone. He's nice like that."],
 wendy:["Bebe dared me to run for president AGAIN. I already AM president. That's how good I am.","The library got new books. I touched them all. With gloves. Respect the books."],
 bebe:["New lip gloss. Tastes like strawberries. Don't eat it though. I did. Don't.","I saw Clyde trip and I laughed AND felt bad. Growth!"],
 jimmy:["Knock knock! ...You gotta say 'who's there'. That's how doors work in comedy.","Timmy beat me at basketball. TIMMY. The man's a machine. A 'Timmy' machine!"],
 nichole:["New cheer! It has a flip! I do the flip! SOMEONE has to catch me though. Volunteers?","My mom packed extra snacks. Sharing is caring. Caring is sharing. Snacks are snacks."],
 henrietta:["The cafeteria lights hum in B flat. Everything here suffers in B flat.","A raven looked at me today. We understood each other. You wouldn't get it."],
};
const EXTRA_TEASE={
 craig:["Tweek's got your hoodie string. He's braiding it. Couple behavior.","If Tweek offers you his cold chocolate milk, that's basically a wedding ring."],
 tweek:["Craig saved you a seat. He PRETENDS he didn't. He did.","Craig flipped off Harris for you. That's love in Craig language."],
 stan:["Wendy mentioned you in council. Official minutes. You're in the MINUTES, dude.","Wendy kept your doodle. The ugly one. She LIKES the ugly one."],
 wendy:["Stan's practicing smiling in the hallway mirror. For you. It's working.","Stan told Sparky about you. The DOG knows. It's serious."],
 token:["Nichole's teaching the squad a dance named after you. A DANCE.","Nichole drew a heart with your initials. In PEN. Permanent."],
 nichole:["Token's bass line is literally your name in notes. Nerd. Cute nerd.","Token asked what snacks you like. He's TAKING NOTES."],
};
const EXTRA_CUSTOM=[
 "New kid!! What's your house like? Mine has... walls. Classic.",
 "Yo {name}, I'm {n}. Lunch trade chart: pizza > nuggets > salad. Sorry, Kyle.",
 "Hey! You play anything? Basketball? Video games? Breathing? We're flexible.",
 "Welcome to South Park! Don't drink the— water's fine. Don't ASK about the water.",
 "I'm {n}! Fun fact about me: I know fun facts. That's the whole fact.",
 "New kid smell! Kidding. Mostly. I'm {n} — let's be friends before Cartman scams you.",
];
const ROMANTIC_EXTRA={
 'craig->tweek':["Storm's coming. You hate storms. Couch. Blanket. Me. Sorted."],
 'tweek->craig':["I counted my breaths today! Only panicked FOUR times! Growth! ...Hold me."],
 'stan->wendy':["Sparky likes you best. I asked him. He barked twice. That's yes."],
 'wendy->stan':["I put your name on my council notes. Under 'important'. Because you are."],
 'token->nichole':["Wrote a bridge for your song. It goes UP. Like my feelings. ...Smooth."],
 'nichole->token':["Saved you the last fry. THE LAST ONE. That's marriage."],
};
for(const c of CANON){if(EXTRA_OPENERS[c.id])c.openers.push(...EXTRA_OPENERS[c.id]);}
for(const k of Object.keys(EXTRA_TEASE)){TEASE_ABOUT_PARTNER[k].push(...EXTRA_TEASE[k]);}
CUSTOM_OPENERS.push(...EXTRA_CUSTOM);
for(const k of Object.keys(ROMANTIC_EXTRA)){ROMANTIC[k].push(...ROMANTIC_EXTRA[k]);}

/* Player voices — 2 normal options each (3rd ♥ appears for partners) */
const VOICES={
 stan:[["Dude, calm down!","Dude, calm down, this is getting weird."],["Oh! My! God!","Oh my God dude, seriously?!"]],
 kyle:[["That's messed up!","That's messed up, dude, you know it!"],["NO way!","No way, I am NOT doing that!"]],
 cartman:[["Respect my authoritah!","Respect my AUTHORITAH, you guys!"],["Screw you guys!","Screw you guys, I'm going home!"]],
 kenny:[["Mmmph mmmph!","Mmmph mmmph mmmph! (you nod wisely)"],["Mmmph!!","Mmmph!! (excited wiggle)"]],
 butters:[["Oh hamburgers!","Oh hamburgers, fellas, I'm in trouble!"],["Gee, okay!","Gee whiz, okay, I'll try my best!"]],
 craig:[["...Whatever.","...Whatever. (you flip them off affectionately)"],["Huh.","Huh."]],
 tweek:[["GAH! Pressure!","GAH! Too much pressure! *twitch twitch*"],["No no no!","N-no! I can't! GAH! *spazzes*"]],
 clyde:[["Aww, sweet!","Aww sweet, that sounds awesome!"],["Huh? What?","Huh? Sorry, what were we talking about?"]],
 token:[["Nah, that's cool.","Nah man, that's actually pretty cool."],["Wanna come over?","Wanna come over after? My place has everything."]],
 wendy:[["As president—","As student president, I officially disagree."],["Stan?!","Stan?! Are you being immature again?"]],
 bebe:[["Oh! My! God!","Oh! My! God! Are you serious?!"],["Wendy, help!","Wendy! Tell them they're wrong!"]],
 jimmy:[["W-wow!","W-w-wow, that's terrific!"],["Got a joke—","Got a joke about that! Wanna hear it?"]],
 nichole:[["Heyyy!","Heyyy! That's amazing!"],["Cheer!","Save it for the cheer routine, okay?"]],
 henrietta:[["Whatever.","Ugh. Whatever, conformist."],["Darkness.","Death. Darkness. ...Kidding. Mostly."]],
 custom:[["Hey, I'm new!","Hey! I'm new here — be nice, okay?"],["My mom says—","My mom always says to be nice, so... hi!"],["My dad says—","My dad says this town is weird. He was right!"]],
};
const ROMANTIC_YOU={
 craig:"*You hold Tweek's hand.* ...Hey. Got you. (your heart does a thing.)",
 tweek:"GAH— *You grab Craig's sleeve.* Don't go anywhere!! Please!! Okay?!",
 stan:"Wendy... will you... walk to class with me? As my girlfriend? (you said it!)",
 wendy:"Stan... we're good, right? *You fix his collar.* There. Perfect.",
 token:"*You offer Nichole half your dessert.* For you. Obviously.",
 nichole:"*You spin Token once.* My boyfriend gets a twirl. Rules are rules.",
 custom:"*You smile shyly.* I'm new, but... I like hanging out with you. A lot.",
};

/* ---------- insults, anger & fights (v4) ---------- */
// insult text depends on BOTH speaker and target. (Kept slur-free: Cartman's
// worst line stays oblique — "you know what you are" — and Kyle reacts to THAT.)
function insultFor(sid,tid){
  const T=(canonById(tid)||{name:'you'}).name;
  if(sid==='cartman'&&tid==='kyle')return `You know what you are, Kyle! You— ...YOU KNOW!!`;
  if(sid==='kyle'&&tid==='cartman')return `You're FAT, Cartman! F-A-T! Everybody knows it!`;
  if(sid==='tweek')return `G-gah! You're... you're MEAN, ${T}! ...Sorry!!`;
  if(sid==='butters')return `Oh hamburgers... I mean... you're a meanie, ${T}! ...Sorry!`;
  switch(tid){
    case 'cartman':return `You're FAT, Cartman! Admit it!`;
    case 'kenny':return `God, you're so POOR, Kenny!`;
    case 'butters':return `Go get grounded, Butters!`;
    case 'tweek':return `Calm DOWN, you twitchy freak!`;
    case 'kyle':return `Shut UP, Kyle! Nobody asked you!`;
    case 'stan':return `You're USELESS, Stan! Even Wendy thinks so!`;
    case 'wendy':return `Nobody cares, Wendy! God!`;
    case 'bebe':return `Nobody cares about your SHOES, Bebe!`;
    case 'clyde':return `You're DUMB, Clyde! Dumb!`;
    case 'token':return `Rich kid! Go buy a PERSONALITY!`;
    case 'nichole':return `Your cheers SUCK, Nichole!`;
    case 'jimmy':return `Your jokes SUCK, Jimmy! ...Sorry. No. They do!`;
    case 'craig':return `Flip THIS, Craig! *you flip right back*`;
    case 'henrietta':return `You're not even a REAL goth, Henrietta!`;
    default:return `You're LAME, ${T}!`;
  }
}
const MAD={
 stan:`Dude?! ...Okay, that was messed up. You wanna GO?! SAY IT AGAIN!`,
 kyle:`WHAT?! ...Oh, it's ON! You wanna go?! I'LL TAKE YOU DOWN!`,
 cartman:`OHHH! You did NOT just say that! NOBODY talks to ME like that! ...FIGHT ME! RIGHT NOW!`,
 kenny:`(muffled) MMMMPH!!! (That means: FIGHT ME RIGHT NOW!)`,
 craig:`...Oh. You wanna die? Because that's how you die. ...Let's go.`,
 clyde:`HEY! ...Okay. Okay, let's fight. ...Wait, really? ...Okay. FINE.`,
 token:`...Say that again. I DARE you. ...Actually don't. Fists. NOW.`,
 wendy:`EXCUSE me?! ...Oh, you're DONE. Playground corner. NOW.`,
 nichole:`...Did you just— OH NO. Cheer stance: FIGHT MODE. Let's GO!`,
 jimmy:`W-w-wow! F-f-fighting words! ...L-l-let's do this! *raises crutch*`,
 butters:`WAAAH!! I'm telling my mom! AND your mom! ...Sorry for telling!!`,
 tweek:`GAH!! NO FIGHTING!! *hides behind the nearest thing* CRAIG?! CRAIG?!`,
 bebe:`*SLAP!!* ...WENDY!! HE started it!!`,
 henrietta:`Violence? How CONFORMIST of you. ...Do it again. Kidding. ...Unless?`,
};
const KYLE_SLUR_MAD=`...WHAT did you just say?! WHAT?! ...YOU'RE DEAD! FIGHT ME! RIGHT NOW!`;
const MAD_TYPE={stan:'fight',kyle:'fight',cartman:'fight',kenny:'fight',craig:'fight',clyde:'fight',token:'fight',wendy:'fight',nichole:'fight',jimmy:'fight',butters:'cry',tweek:'panic',bebe:'slap',henrietta:'mock'};
const POW_ALL={stan:7,kyle:9,cartman:5,kenny:6,butters:1,craig:8,tweek:1,clyde:4,token:7,wendy:8,bebe:2,jimmy:3,nichole:5,henrietta:2,custom:5};
const YOU_HIT=[`You swing WILD — it CONNECTS!`,`Direct hit! WHAM!`,`You BONK them!`,`Haymaker! The crowd (nobody) goes wild!`,`You slip and STILL land it!`,`POW! Right in the kisser!`];
const NPC_HIT=[`They clock you!`,`OOF! Right in the face!`,`They shove you back!`,`SMACK! You see stars!`,`They sweep your legs! You eat dirt!`];
const NPC_HIT_SPECIAL={
 kyle:[`Kyle screams and spin-kicks!`,`"That's for EVERYTHING!" — WHAM!`],
 cartman:[`Cartman belly-bumps you! It hurts. HOW?!`,`"My mom hits harder!" (She doesn't.)`],
 wendy:[`Wendy slaps you like it's 2008 all over again!`,`A flurry of president-approved punches!`],
 token:[`Token's got REACH. Ouch.`],
 craig:[`Craig doesn't even look. It still lands.`],
 stan:[`Stan throws a surprisingly decent punch!`],
 kenny:[`(muffled war cry) — Kenny tackles LOW!`],
 nichole:[`Cheer-kick! HIGH kick! OW!`],
 clyde:[`Clyde windmills! One actually connects!`],
 jimmy:[`Jimmy swings a crutch! *BONK*`],
};
const LOSE_Q={
 cartman:`WAAAH!! MOMMMYYY!! HE CHEATED!! *snot everywhere*`,
 kyle:`...Okay. Fair. REMATCH. Tomorrow. BE THERE.`,
 wendy:`...Fine. You win. THIS time. Council will hear of this.`,
 craig:`...Ow. ...Respect. Don't tell Tweek.`,
 stan:`Dude... nice one... ow...`,
 kenny:`(muffled) ...Mmmph. (That means: good fight.)`,
 token:`...Okay. You got hands. Respect.`,
 nichole:`...OW. Okay! You win! ...Rematch at cheer practice!`,
 clyde:`Ow... my everything... good game?...`,
 jimmy:`I-I yield! Haha! Great f-f-fight!`,
};
const WIN_Q={
 kyle:`Stay DOWN. ...Obvious. 😎`,
 cartman:`HA! Who's fat NOW?! ...Me. But I WON!`,
 wendy:`And don't you forget it.`,
 stan:`Sorry dude. ...Not really.`,
 craig:`...Told you.`,
 kenny:`(muffled) Mmmph! (That means: poverty punch!)`,
 token:`Shoulda stayed in your lane.`,
 nichole:`And STICK the landing! That's a win!`,
 clyde:`I... I won?! No way!`,
 jimmy:`The crutch NEVER misses!`,
};
const GIVEUP_MOCK={cartman:`HA! Walk away! ...Smart. (I still win.)`,kyle:`Yeah, walk away. Smart.`,craig:`...Smart choice.`,wendy:`That's what I thought.`,tweek:`O-okay! No fight! GOOD! NOBODY move!`};
const FORGIVE={
 craig:`...Fine. Whatever. (That means forgiven. Probably.)`,
 cartman:`Apology ACCEPTED. Tribute: your dessert. Forever.`,
 tweek:`O-OKAY! FORGIVEN!! GAH— thank you for apologizing!!`,
 butters:`Oh! Okay! Friends again! ...Please don't do it again!`,
 kyle:`Fine. But WATCH it.`,
 bebe:`Ugh, FINE. ...Anyway.`,
 henrietta:`Apology noted. Filed. ...Burned. It's fine.`,
};
/* typed-input reactions */
const HAPPY={
 stan:`Heh, thanks dude!`,kyle:`...Thanks! Okay, you're cool.`,cartman:`Damn right. ...Wait, are you mocking me? ...Taking it anyway.`,
 kenny:`(muffled) Mmmph! (happy!)`,butters:`Oh boy, thank you!!`,craig:`...Heh. Thanks. (Don't tell Tweek. ...Tell Tweek.)`,
 tweek:`R-really?! GAH— thank you!! *happy twitch*`,clyde:`Sweet! I like you!`,token:`Haha, respect right back.`,
 wendy:`Thank you! See? Manners! Stan, take notes.`,bebe:`Aww! Okay, we're best friends now.`,jimmy:`W-w-wow! A compliment! Terrific!`,
 nichole:`Yay!! Compliment accepted! *hair flip*`,henrietta:`...Thanks. That hurt me more than it hurt you.`,
};
const CONFUSED={
 stan:`...What? Dude, use words.`,kyle:`What does that even MEAN?!`,cartman:`What? Speak American!`,
 kenny:`(muffled) Mmmph? (confused)`,butters:`Huh? ...Okay!`,craig:`...What.`,
 tweek:`H-huh?! GAH— too many words!!`,clyde:`Huh? ...Cool?`,token:`...Say that again? Slower?`,
 wendy:`I'm sorry, WHAT?`,bebe:`...Anyway—`,jimmy:`H-huh? Great delivery though!`,
 nichole:`Haha... what?`,henrietta:`Fascinating. Anyway.`,
};
const ADULT_HAPPY={teacher:`...Was that a compliment? +2 participation points.`,lunch:`Aww, sweet kid! Extra cookie for you!`,mom:`Oh, sweetie! Come here!`,dad:`Ha! That's my kid!`,sis:`Yay!! You're my favorite!`};
const ADULT_CONFUSED={teacher:`...What? Spit it out, kid.`,lunch:`Huh, sugar?`,mom:`...What was that, sweetie?`,dad:`...Huh. Okay.`,sis:`Huh? ...Okay!`};
const BYE_LINE=`Huh? Oh — bye! ...See you at lunch!`;

/* ---------- BETTER paper models: big head, tiny body, fat Cartman ---------- */
function drawPaper(g,spec,x,y,o={}){
  const s=o.scale||1;
  g.save();g.translate(x,y);g.scale(s*(o.facing||1),s);
  const tw=(o.twitch==='sometimes'&&Math.random()<0.06)||(o.twitch==='alot'&&Math.random()<0.22);
  const jx=tw?(Math.random()*6-3):0;
  g.translate(jx, o.walk?Math.abs(Math.sin(o.walk))*-3:0);
  const bob=o.walk?Math.sin(o.walk)*0.05:0;
  g.rotate(bob+(tw?((Math.random()-0.5)*0.18):0));
  const fat=spec.fat?1:0;
  const bw=fat?36:24; // body half-width
  // shadow
  g.fillStyle='rgba(0,0,0,.20)';g.beginPath();g.ellipse(0,36,bw+4,7,0,0,7);g.fill();
  // legs (tiny stubs, spread if fat)
  const legSwing=o.walk?Math.sin(o.walk)*6:0;
  g.fillStyle=spec.pants||'#333';
  const lx=fat?17:12;
  g.fillRect(-lx-5,-2,11,30);g.fillRect(lx-6,-2,11,30);
  g.fillStyle='#1c1c22';g.fillRect(-lx-6,24,13,6);g.fillRect(lx-7,24,13,6);
  // body — rounded rect / oval jacket with paper edge
  g.fillStyle=spec.jacket||'#888';
  g.strokeStyle='#1c1c22';g.lineWidth=2.5;
  g.beginPath();
  if(g.roundRect)g.roundRect(-bw,-18,bw*2,44,12);
  else g.rect(-bw,-18,bw*2,44);
  g.fill();g.stroke();
  // white paper highlight
  g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.2;
  g.beginPath();
  if(g.roundRect)g.roundRect(-bw+3,-15,bw*2-6,38,9);
  else g.rect(-bw+3,-15,bw*2-6,38);
  g.stroke();
  // buttons/zipper
  g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=2;g.beginPath();g.moveTo(0,-14);g.lineTo(0,22);g.stroke();
  g.fillStyle='rgba(0,0,0,.5)';for(let bi=-6;bi<=18;bi+=12){g.beginPath();g.arc(0,bi,1.8,0,7);g.fill();}
  // arms
  const wave=o.talking?Math.sin((o.t||0)*14)*4:0;
  const hold=o.holding? -10:0;
  g.fillStyle=spec.jacket||'#888';g.strokeStyle='#1c1c22';g.lineWidth=2;
  g.beginPath();g.ellipse(-bw-4,2+(o.walk?legSwing*0.25:0),6.5,11,0.35,0,7);g.fill();g.stroke();
  g.beginPath();g.ellipse(bw+4,2-(o.walk?legSwing*0.25:0)+wave*0.3+hold,6.5,11,-0.35,0,7);g.fill();g.stroke();
  g.fillStyle=spec.gloves||'#e74c3c';
  g.beginPath();g.arc(-bw-8,12,5,0,7);g.fill();g.strokeStyle='#1c1c22';g.lineWidth=1.5;g.stroke();
  g.beginPath();g.arc(bw+8,12+wave*0.3+hold,5,0,7);g.fill();g.stroke();
  // ---- HEAD: huge circle (show proportion ~ head is 60% of height) ----
  const skin=spec.skinColor||skinById(spec.skin||'light');
  const HR=fat?30:28;
  const HY=-42;
  // hair back layer
  g.fillStyle=spec.hairc||'#333';
  const hs=spec.hair||spec.hairStyle||'flat';
  if(hs==='long'){g.fillRect(-HR-2,HY-22,HR*2+4,52);}
  else if(hs==='afro'){g.beginPath();g.arc(0,HY-6,HR+8,0,7);g.fill();}
  else if(hs==='pigtails'){g.beginPath();g.arc(-HR-2,HY+6,10,0,7);g.fill();g.beginPath();g.arc(HR+2,HY+6,10,0,7);g.fill();}
  // face
  g.fillStyle=skin;g.strokeStyle='#1c1c22';g.lineWidth=2.5;
  g.beginPath();g.arc(0,HY,HR,0,7);g.fill();g.stroke();
  // fat double chin
  if(fat){g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=2;g.beginPath();g.arc(0,HY+12,16,Math.PI*0.15,Math.PI*0.85);g.stroke();}
  // hair front
  g.fillStyle=spec.hairc||'#333';
  if(hs==='flat'){g.beginPath();g.arc(0,HY-4,HR-2,Math.PI*1.04,Math.PI*1.96);g.fill();g.fillRect(-HR+2,HY-12,HR*2-4,7);}
  else if(hs==='messy'){for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(i*8-5,HY-20);g.lineTo(i*8+1,HY-38-Math.abs(i)*2);g.lineTo(i*8+7,HY-20);g.fill();}g.beginPath();g.arc(0,HY-6,HR-2,Math.PI,2*Math.PI);g.fill();}
  else if(hs==='afro'){g.fillStyle=skin;g.beginPath();g.arc(0,HY+2,HR-3,0,7);g.fill();g.fillStyle=spec.hairc;g.beginPath();g.arc(0,HY-4,HR,Math.PI*0.95,Math.PI*2.05);g.fill();for(let a=0;a<10;a++){const an=Math.PI+(a/9)*Math.PI;g.beginPath();g.arc(Math.cos(an)*(HR+4),HY-4+Math.sin(an)*12,6,0,7);g.fill();}}
  else if(hs==='buzz'){g.beginPath();g.arc(0,HY-5,HR-3,Math.PI*1.08,Math.PI*1.92);g.fill();}
  else if(hs==='curly'){for(let a=0;a<9;a++){const an=Math.PI+(a/8)*Math.PI;g.beginPath();g.arc(Math.cos(an)*(HR-2),HY-6+Math.sin(an)*11,7.5,0,7);g.fill();}}
  else if(hs==='long'){g.fillStyle=skin;g.beginPath();g.arc(0,HY+2,HR-4,0,7);g.fill();g.fillStyle=spec.hairc;g.beginPath();g.arc(0,HY-6,HR-1,Math.PI*0.98,Math.PI*2.02);g.fill();g.fillRect(-HR-2,HY-6,8,46);g.fillRect(HR-6,HY-6,8,46);}
  else if(hs==='pigtails'){g.beginPath();g.arc(0,HY-7,HR-4,Math.PI,0);g.fill();}
  // hats (show-accurate-ish)
  if(spec.hatStyle==='beanie'){
    g.fillStyle=spec.hat||'#4aa3df';g.strokeStyle='#1c1c22';g.lineWidth=2;
    g.beginPath();g.arc(0,HY-8,HR-1,Math.PI,0);g.fill();g.stroke();
    g.fillStyle='rgba(0,0,0,.18)';g.fillRect(-HR+1,HY-13,HR*2-2,5);
    if(spec.pom){g.fillStyle=spec.pom;g.beginPath();g.arc(0,HY-HR-6,7,0,7);g.fill();g.stroke();}
  } else if(spec.hatStyle==='flap-pom'){
    g.fillStyle=spec.hat||'#38618f';g.strokeStyle='#1c1c22';g.lineWidth=2;
    g.beginPath();g.arc(0,HY-8,HR,Math.PI,0);g.fill();g.stroke();
    g.fillRect(-HR,HY-12,10,22);g.fillRect(HR-10,HY-12,10,22);
    if(spec.pom){g.fillStyle=spec.pom;g.beginPath();g.arc(0,HY-HR-8,8,0,7);g.fill();g.stroke();}
  } else if(spec.hatStyle==='ushanka'){
    g.fillStyle=spec.hat||'#3fa34d';g.strokeStyle='#1c1c22';g.lineWidth=2;
    g.beginPath();g.arc(0,HY-8,HR,Math.PI,0);g.fill();g.stroke();
    g.fillRect(-HR-1,HY-10,10,24);g.fillRect(HR-9,HY-10,10,24);
    g.fillStyle='rgba(255,255,255,.25)';g.fillRect(-HR+8,HY-24,HR*2-16,6);
  } else if(spec.hatStyle==='chullo'){
    g.fillStyle=spec.hat||'#3b83c4';g.strokeStyle='#1c1c22';g.lineWidth=2;
    g.beginPath();g.arc(0,HY-8,HR-1,Math.PI,0);g.fill();g.stroke();
    g.fillRect(-HR+3,HY-10,9,20);g.fillRect(HR-12,HY-10,9,20);
    g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1.5;
    for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(i*8,HY-HR+2);g.lineTo(i*8,HY-10);g.stroke();}
    if(spec.pom){g.fillStyle=spec.pom;g.beginPath();g.arc(0,HY-HR-5,6,0,7);g.fill();g.strokeStyle='#1c1c22';g.stroke();}
  } else if(spec.hatStyle==='parka'){
    g.fillStyle=spec.hat||'#e67e22';g.strokeStyle='#1c1c22';g.lineWidth=2.5;
    g.beginPath();g.arc(0,HY,HR+6,0,7);g.fill();g.stroke();
    g.strokeStyle='#7d3c14';g.lineWidth=3;g.beginPath();g.arc(0,HY,HR+6,Math.PI*0.1,Math.PI*0.9);g.stroke();
    g.fillStyle=skin;g.beginPath();g.ellipse(0,HY+1,17,15,0,0,7);g.fill();
  } else if(spec.hatStyle==='beret'){
    g.fillStyle=spec.hat||'#e8a0bf';g.strokeStyle='#1c1c22';g.lineWidth=2;
    g.beginPath();g.ellipse(4,HY-HR+2,20,8,-0.12,0,7);g.fill();g.stroke();
  } else if(spec.hat&&spec.hat!=='none'&&hs==='bald'){
    g.fillStyle=spec.hat;g.strokeStyle='#1c1c22';g.lineWidth=2;
    g.beginPath();g.arc(0,HY-9,HR-6,Math.PI,0);g.fill();g.stroke();
  }
  // eyes — big white ovals close together (show style)
  const blink=o.blink?0.12:1;
  g.save();g.translate(0,HY-2);g.scale(1,blink);
  g.fillStyle='#fff';g.strokeStyle='#1c1c22';g.lineWidth=1.6;
  g.beginPath();g.ellipse(-8,0,9.5,12,0,0,7);g.fill();g.stroke();
  g.beginPath();g.ellipse(8,0,9.5,12,0,0,7);g.fill();g.stroke();
  g.fillStyle='#111';
  const look=(o.facing||1)*2;
  g.beginPath();g.arc(-6+look,2,2.6,0,7);g.fill();
  g.beginPath();g.arc(10+look,2,2.6,0,7);g.fill();
  g.restore();
  // mouth — chin flap, opens when talking
  const open=o.talking?(3+Math.abs(Math.sin((o.t||0)*16))*7):2.2;
  g.fillStyle='#5b1f12';g.strokeStyle='#1c1c22';g.lineWidth=1.6;
  g.beginPath();g.ellipse(0,HY+17,7.5,open,0,0,7);g.fill();g.stroke();
  if(fat){g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(0,HY+17,10.5,open+2.5,0,0,7);g.stroke();}
  g.restore();
}

/* ---------- game state ---------- */
const GAME={started:false,player:null,isCustom:false,map:'yard',phase:0,hasTray:false,ate:false,friends:new Set(),inDialogue:false,talkTarget:null,holding:null,followers:[],talkCounts:{},hugCD:0,trouble:{detentions:0,grounded:false,reason:''},room:null,enteredHouse:null,exitSpot:[480,400]};
const PHASES=['☀ Morning','📚 Class','🍔 Lunch','⚽ Recess','🌇 After School'];
const player={x:480,y:380,vx:0,vy:0,face:1,walk:0,moving:false};
let hearts=[]; // particles {x,y,vy,life}

/* ---------- maps (fixed safe spawns!) ---------- */
function R(x,y,w,h){return{x,y,w,h};}
const MAPS={
 yard:{label:'Schoolyard',bg:['#87ceeb','#7ec850'],
   walls:[R(0,0,960,24),R(0,0,24,540),R(936,0,24,540),R(0,516,960,24),R(240,40,480,112)],
   props:[
     {x:60,y:250,w:130,h:55,c:'#8d6e63',label:'Bus stop',solid:true},
     {x:770,y:250,w:130,h:55,c:'#90a4ae',label:'Tetherball',solid:true},
     {x:120,y:420,w:150,h:40,c:'#a1887f',label:'Bench',solid:true},
     {x:690,y:420,w:150,h:40,c:'#a1887f',label:'Bench',solid:true}],
   doors:[{x:455,y:140,w:50,h:26,to:'hall',sx:480,sy:410,label:'Enter school →'}],
   npcs:[['butters',200,340],['clyde',700,340],['jimmy',560,450],['henrietta',830,440],['kenny',330,450]]},
 hall:{label:'Hallway',bg:['#d7ccc8','#bcaaa4'],
   walls:[R(0,0,960,40),R(0,0,24,540),R(936,0,24,540),R(0,500,960,40),R(60,48,840,30)],
   props:[{x:60,y:400,w:130,h:46,c:'#8d6e63',label:'Fountain',solid:true}],
   doors:[
     {x:120,y:472,w:110,h:22,to:'class',sx:480,sy:420,label:'Classroom →'},
     {x:425,y:472,w:110,h:22,to:'cafe',sx:480,sy:420,label:'Cafeteria →'},
     {x:730,y:472,w:110,h:22,to:'yard',sx:480,sy:230,label:'Yard →'},
     {x:425,y:44,w:110,h:22,to:'play',sx:480,sy:430,label:'Playground →'}],
   npcs:[['wendy',380,260],['bebe',570,260],['craig',700,330],['token',250,330]]},
 class:{label:'Classroom',bg:['#f5e6c8','#e0cfa8'],
   walls:[R(0,0,960,44),R(0,0,24,540),R(936,0,24,540),R(0,492,960,48),R(300,50,360,44)],
   props:[
     {x:170,y:170,w:120,h:55,c:'#8d6e63',label:'Desk',solid:true},{x:420,y:170,w:120,h:55,c:'#8d6e63',label:'Desk',solid:true},{x:670,y:170,w:120,h:55,c:'#8d6e63',label:'Desk',solid:true},
     {x:170,y:300,w:120,h:55,c:'#8d6e63',label:'Desk',solid:true},{x:420,y:300,w:120,h:55,c:'#8d6e63',label:'Desk',solid:true}],
   doors:[{x:425,y:470,w:110,h:22,to:'hall',sx:175,sy:400,label:'Hallway →'}],
   npcs:[['stan',230,262],['kyle',480,262],['cartman',730,262],['kenny',300,400],['tweek',660,400]]},
 cafe:{label:'Cafeteria',bg:['#ffe0b2','#ffcc80'],
   walls:[R(0,0,960,44),R(0,0,24,540),R(936,0,24,540),R(0,492,960,48),R(60,50,840,55)],
   props:[
     {x:60,y:50,w:840,h:55,c:'#a1887f',label:'🍔 LUNCH LINE (E at lunch!)',solid:true,id:'lunchline'},
     {x:150,y:220,w:200,h:65,c:'#8d6e63',label:'Cool table',solid:true,id:'table-cool'},
     {x:420,y:220,w:200,h:65,c:'#8d6e63',label:'Main table',solid:true,id:'table-main'},
     {x:680,y:220,w:150,h:65,c:'#8d6e63',label:'Loner table ♥',solid:true,id:'table-loner'},
     {x:150,y:360,w:200,h:60,c:'#8d6e63',label:'Goth table',solid:true,id:'table-goth'}],
   doors:[{x:425,y:470,w:110,h:22,to:'hall',sx:480,sy:400,label:'Hallway →'}],
   npcs:[['token',250,322],['nichole',520,322],['cartman',520,180],['butters',250,180]]},
 play:{label:'Playground',bg:['#87ceeb','#7ec850'],
   walls:[R(0,0,960,24),R(0,0,24,540),R(936,0,24,540),R(0,516,960,24)],
   props:[{x:150,y:120,w:180,h:42,c:'#e74c3c',label:'Slide!',solid:true},{x:600,y:120,w:180,h:42,c:'#f39c12',label:'Swings',solid:true},{x:380,y:330,w:200,h:60,c:'#95a5a6',label:'Basketball',solid:false}],
   doors:[{x:425,y:486,w:110,h:22,to:'hall',sx:480,sy:120,label:'School →'}],
   npcs:[['tweek',440,250],['craig',520,250],['kenny',700,380],['stan',200,380],['wendy',330,420]]},
 street:{label:'Neighborhood',bg:['#87ceeb','#9ccc65'],
   walls:[R(0,0,960,24),R(0,0,24,540),R(936,0,24,540),R(0,516,960,24)],
   props:[
     {x:40,y:70,w:150,h:110,c:'#90caf9',roof:'#b3392f',label:'Marsh house',solid:true,id:'house-stan'},
     {x:225,y:70,w:150,h:110,c:'#ffcc80',roof:'#5d4037',label:'Broflovski hs',solid:true,id:'house-kyle'},
     {x:410,y:70,w:150,h:110,c:'#ef9a9a',roof:'#6d4c41',label:'Cartman hs',solid:true,id:'house-cartman'},
     {x:595,y:70,w:150,h:110,c:'#b0bec5',roof:'#37474f',label:'McCormick hs',solid:true,id:'house-kenny'},
     {x:775,y:70,w:150,h:110,c:'#ce93d8',roof:'#4a148c',label:'Tweak Bros ☕',solid:true,id:'house-tweek',style:'shop'},
     {x:40,y:420,w:150,h:60,c:'#d7ccc8',roof:'#455a64',label:'Black mansion',solid:true,id:'house-token',style:'mansion'},
     {x:700,y:420,w:150,h:60,c:'#ffe0b2',roof:'#f9a825',label:'YOUR HOUSE',solid:true,id:'home',style:'yours'}],
   doors:[{x:425,y:486,w:110,h:22,to:'yard',sx:480,sy:430,label:'School →'}],
   npcs:[['stan',300,335],['kyle',395,345],['clyde',640,335]]},
 interior:{label:'🏠 House Interior',bg:['#f3e2c2','#8d5e3c'],
   walls:[R(0,0,960,44),R(0,0,24,540),R(936,0,24,540),R(0,492,960,48)],
   props:[
     {x:80,y:70,w:230,h:60,c:'#5c6bc0',label:'📺 TV + stand',solid:true},
     {x:650,y:70,w:230,h:60,c:'#8d6e63',label:'Bookshelf',solid:true},
     {x:330,y:130,w:300,h:80,c:'#a1887f',label:'Couch',solid:true,id:'couch'},
     {x:380,y:300,w:200,h:64,c:'#8d6e63',label:'Coffee table',solid:true},
     {x:90,y:360,w:100,h:64,c:'#66bb6a',label:'Plant',solid:true},
     {x:770,y:360,w:100,h:64,c:'#ffb74d',label:'Floor lamp',solid:true}],
   doors:[],
   npcs:[]},
};
let npcs=[];
function spawnMap(mapId){
  npcs=[];
  const m=MAPS[mapId];
  for(const [id,dx,dy] of (m.npcs||[])){
    if(GAME.player&&GAME.player.id===id)continue;
    if(GAME.followers.includes(id))continue; // followers travel with you instead
    const c=canonById(id);if(!c)continue;
    npcs.push({kind:'canon',id:c.id,spec:c,x:dx,y:dy,walkP:Math.random()*6,face:Math.random()<.5?-1:1,blinkT:Math.random()*3,sayT:3+Math.random()*5,say:''});
  }
 if(mapId==='class')npcs.push({kind:'teacher',id:'harris',name:'Mr. Harris',spec:{skin:'tan',hair:'flat',hairc:'#555',jacket:'#4a6741',pants:'#333',skinColor:skinById('tan')},x:480,y:130,walkP:0,face:1,blinkT:2,sayT:5,say:''});
 if(mapId==='hall'){
   npcs.push({kind:'teacher',id:'ellen',name:'Ms. Ellen',spec:{skin:'tan',hair:'curly',hairc:'#777',jacket:'#7b1fa2',pants:'#333',skinColor:skinById('tan')},x:300,y:180,walkP:0,face:1,blinkT:2,sayT:5,say:''});
   npcs.push({kind:'teacher',id:'peters',name:'Principal Peters',spec:{skin:'light',hair:'flat',hairc:'#999',jacket:'#37474f',pants:'#222',skinColor:skinById('light')},x:660,y:180,walkP:0,face:1,blinkT:2,sayT:5,say:''});
 }
 if(mapId==='play')npcs.push({kind:'teacher',id:'miller',name:'Coach Miller',spec:{skin:'brown',hair:'buzz',hairc:'#222',hat:'#d32f2f',hatStyle:'beanie',jacket:'#388e3c',pants:'#222',skinColor:skinById('brown')},x:560,y:350,walkP:0,face:1,blinkT:2,sayT:5,say:''});
 if(mapId==='cafe')npcs.push({kind:'lunch',id:'lunchlady',name:'Lunch Lady',spec:{skin:'tan',hair:'curly',hairc:'#999',jacket:'#fafafa',pants:'#777',skinColor:skinById('tan')},x:480,y:140,walkP:0,face:1,blinkT:2,sayT:5,say:''});
 if(mapId==='street')spawnNeighborhood();
 if(mapId==='interior')buildInterior();
 // crew follows you everywhere (including inside houses)
 GAME.followers.forEach((fid,i)=>{
   if(GAME.player&&fid===GAME.player.id)return;
   const c=canonById(fid);if(!c)return;
   if(npcs.find(n=>n.id===fid))return;
   npcs.push({kind:'canon',id:fid,spec:c,follower:true,x:player.x-44-i*36,y:player.y+12+(i%2)*10,walkP:i,face:1,blinkT:2,sayT:8,say:''});
 });
 if(GAME.holding){const h=npcs.find(n=>n.kind==='canon'&&n.id===GAME.holding);if(h){h.x=player.x-40;h.y=player.y;}}
}
/* ---------- houses: every family lives INSIDE — knock (E) to visit ---------- */
const HOUSE_TITLES={'house-stan':'Marsh House','house-kyle':'Broflovski House','house-cartman':'Cartman House','house-kenny':'McCormick House','house-tweek':'Tweak Bros Coffee','house-token':'Black Mansion'};
function familyMembers(houseId){
  const P=GAME.player;
  if(houseId==='home'){
    if(!P)return{members:[],title:'Your House',fam:'custom'};
    if(GAME.isCustom){
      const sk=P.skin||'light',m=[];
      if(P.parents==='momdad'||P.parents==='mom')m.push([P.mom||'Mom','mom',sk]);
      if(P.parents==='momdad'||P.parents==='dad')m.push([P.dad||'Dad','dad',sk]);
      if(P.parents==='guardian')m.push(['Grandma','mom',sk]);
      return{members:m,title:P.name+"'s House",fam:'custom'};
    }
    const c=canonById(P.id);
    return{members:PARENTS[P.id]||[],title:c.name+"'s House",fam:P.id};
  }
  const kidId=houseId.replace('house-','');
  const c=canonById(kidId);
  return{members:PARENTS[kidId]||[],title:HOUSE_TITLES[houseId]||(c?c.name+"'s House":'House'),fam:kidId};
}
/* ---------- multi-room houses: living <-> kitchen <-> bedroom ---------- */
const BEDROOM_STYLE={
 stan:{c:'#7ea8d8',posters:['SPARKY!!','GUITAR!']},
 kyle:{c:'#8fd08f',posters:['B-BALL','BOOKS!']},
 cartman:{c:'#d88f8f',posters:['AUTHORITAH','MR. KITTY']},
 kenny:{c:'#b3a58e',posters:['KAREN ♥','...']},
 token:{c:'#c9a8e0',posters:['BASS','ARCADE KING']},
 tweek:{c:'#b8a8d0',posters:['NO COFFEE','BREATHE']},
};
function bedroomOwnerId(){
  const h=GAME.enteredHouse;
  if(!h)return null;
  if(h==='home')return GAME.isCustom?null:(GAME.player?GAME.player.id:null);
  const kid=h.replace('house-','');
  return MAIN4.includes(kid)?kid:null;
}
function bedroomOwnerName(){
  const o=bedroomOwnerId();
  if(o)return canonById(o).name;
  if(GAME.enteredHouse==='house-token')return 'Token';
  if(GAME.enteredHouse==='house-tweek')return 'Tweek';
  if(GAME.isCustom)return 'Your';
  return canonById(GAME.player?GAME.player.id:'stan').name;
}
function bedroomStyle(){
  const o=bedroomOwnerId();
  if(o&&BEDROOM_STYLE[o])return BEDROOM_STYLE[o];
  if(GAME.enteredHouse==='house-token')return BEDROOM_STYLE.token;
  if(GAME.enteredHouse==='house-tweek')return BEDROOM_STYLE.tweek;
  if(GAME.isCustom&&GAME.player)return{c:GAME.player.jacket||'#9fb8d8',posters:['NEW KID','HOME!']};
  return{c:'#9fb8d8',posters:['zzz','...']};
}
const ROOM_PROPS={
 living:[
  {x:80,y:70,w:230,h:60,c:'#5c6bc0',label:'📺 TV + stand',solid:true},
  {x:650,y:70,w:230,h:60,c:'#8d6e63',label:'Bookshelf',solid:true},
  {x:330,y:130,w:300,h:80,c:'#a1887f',label:'Couch',solid:true,id:'couch'},
  {x:380,y:300,w:200,h:64,c:'#8d6e63',label:'Coffee table',solid:true},
  {x:90,y:360,w:100,h:64,c:'#66bb6a',label:'Plant',solid:true},
  {x:770,y:360,w:100,h:64,c:'#ffb74d',label:'Floor lamp',solid:true}],
 kitchen:[
  {x:80,y:70,w:300,h:60,c:'#90a4ae',label:'Counter',solid:true},
  {x:600,y:70,w:110,h:110,c:'#eceff1',label:'Fridge (E!)',solid:true,id:'fridge'},
  {x:730,y:70,w:150,h:60,c:'#78909c',label:'Stove',solid:true},
  {x:380,y:300,w:200,h:64,c:'#a1887f',label:'Kitchen table',solid:true},
  {x:90,y:360,w:100,h:64,c:'#66bb6a',label:'Plant',solid:true},
  {x:770,y:360,w:100,h:64,c:'#ffb74d',label:'Trash can',solid:true}],
 bedroom:[
  {x:80,y:90,w:200,h:120,c:'#7c9fd0',label:'Bed (E!)',solid:true,id:'bed'},
  {x:650,y:90,w:180,h:70,c:'#8d6e63',label:'Desk',solid:true},
  {x:400,y:320,w:160,h:60,c:'#5c6bc0',label:'🎮 Console (E!)',solid:true,id:'console'},
  {x:90,y:360,w:100,h:64,c:'#66bb6a',label:'Plant',solid:true},
  {x:770,y:360,w:100,h:64,c:'#ffb74d',label:'Lamp',solid:true}],
};
function roomTitle(){
  const f=familyMembers(GAME.enteredHouse);
  const r=GAME.room||'living';
  if(r==='kitchen')return '🍳 '+f.title+' — Kitchen';
  if(r==='bedroom')return '🛏️ '+bedroomOwnerName()+'\'s Room';
  return '🏠 '+f.title;
}
function buildInterior(){
  const r=GAME.room||'living';
  MAPS.interior.label=roomTitle();
  MAPS.interior.props=ROOM_PROPS[r]||ROOM_PROPS.living;
  const exit=GAME.exitSpot||[480,400];
  if(r==='living'){
    MAPS.interior.doors=[
      {x:425,y:470,w:110,h:22,to:'street',sx:exit[0],sy:exit[1],label:'Outside →'},
      {x:908,y:240,w:26,h:100,to:'interior',room:'kitchen',sx:150,sy:300,label:'Kitchen →'},
      {x:26,y:240,w:26,h:100,to:'interior',room:'bedroom',sx:810,sy:300,label:bedroomOwnerName()+'\'s Room →'},
    ];
  } else if(r==='kitchen'){
    MAPS.interior.doors=[{x:26,y:240,w:26,h:100,to:'interior',room:'living',sx:810,sy:300,label:'Living Room →'}];
  } else {
    MAPS.interior.doors=[{x:908,y:240,w:26,h:100,to:'interior',room:'living',sx:150,sy:300,label:'Living Room →'}];
  }
  // family hangs out in fixed rooms: moms cook, everyone else lounges, kid in bedroom
  const f=familyMembers(GAME.enteredHouse);
  const spotsL=[[330,258],[630,258],[480,252]];
  const spotsK=[[480,250],[350,250],[610,250]];
  let li=0,ki=0;
  f.members.forEach(([nm,k,sk],i)=>{
    const skinId=sk||'light';
    const kind=(k==='mom'||k==='dad')?k:'sis';
    const home=(r==='kitchen'&&kind==='mom')||(r==='living'&&kind!=='mom');
    if(!home)return;
    const s=(r==='kitchen'?spotsK:spotsL)[(r==='kitchen'?ki++:li++)%3];
    npcs.push({kind:kind,id:'p-'+nm+i,name:nm,fam:f.fam,sis:kind==='sis',
      spec:{skin:skinId,skinColor:skinById(skinId),...parentSpec(k)},x:s[0],y:s[1],walkP:i,face:1,blinkT:2,sayT:4,say:''});
  });
  // the resident main-4 kid hangs out in their bedroom (unless they're you or your follower)
  const owner=bedroomOwnerId();
  if(r==='bedroom'&&owner&&GAME.player&&owner!==GAME.player.id&&!GAME.followers.includes(owner)){
    const c=canonById(owner);
    npcs.push({kind:'canon',id:c.id,spec:c,x:480,y:250,walkP:0,face:1,blinkT:2,sayT:5,say:''});
  }
}
/* ---------- main-4 crew: recruit, follow, dismiss, hang out ---------- */
const CREW_OPENERS=[`Still with you, dude! Where to?`,`Crew sticks together! Your house or mine?`,`Lead the way! ...Wait, snacks first?`,`Best. Crew. Ever.`];
const HANGOUT_LINES={
 stan:[`I call player one!`,`Dude, pause it! Sparky needs out!`],
 kyle:[`No screen-cheating, Cartman!`,`I brought snacks. HEALTHY snacks. ...Fine, chips.`],
 cartman:[`I'M player one! ...Wait, whose house is this?`,`Stop hogging the good controller! ...That's MY controller.`],
 kenny:[`(muffled) Mmmph! (He's already winning.)`,`(muffled) Mmmph mmmph! (Rematch!)`],
};
const HANGOUT_FLAVOR={stan:`Sparky snores in the corner.`,kyle:`A basketball hits the lamp. Again.`,cartman:`Snack crumbs EVERYWHERE.`,kenny:`The floor mattress is... cozy?`};
function hangoutToggle(npc,mode){
  if(mode==='recruit'){
    if(GAME.followers.length>=3){toast('Crew is FULL! (You + 3 = the whole gang.)');return;}
    if(!GAME.followers.includes(npc.id))GAME.followers.push(npc.id);
    npcs=npcs.filter(n=>n!==npc);
    for(let k=0;k<8;k++)hearts.push({x:player.x+(Math.random()-0.5)*80,y:player.y-110,vy:-30,life:1.2});
    endDialogue();
    toast(`${npcDisplayName(npc)} joined your crew! Bring them to a bedroom + E the 🎮!`);
  } else {
    GAME.followers=GAME.followers.filter(id=>id!==npc.id);
    endDialogue();
    if(GAME.map==='interior'&&GAME.room==='bedroom'&&bedroomOwnerId()===npc.id){
      const c=canonById(npc.id);
      npcs.push({kind:'canon',id:c.id,spec:c,x:480,y:250,walkP:0,face:1,blinkT:2,sayT:5,say:''});
    }
    toast(`${npcDisplayName(npc)} headed home. (They'll be around town.)`);
  }
  $('hud-who').textContent=playerLabel()+` · ❤${GAME.friends.size}`+(GAME.holding?' · holding ♥':'')+(GAME.followers.length?` · crew:${GAME.followers.length}`:'');
}
function hangoutScene(){
  const owner=bedroomOwnerId();
  const crewIds=[...GAME.followers];
  if(owner&&GAME.player&&owner!==GAME.player.id&&!crewIds.includes(owner)&&npcs.find(n=>n.kind==='canon'&&n.id===owner))crewIds.push(owner);
  if(!crewIds.length){toast('No crew here! Recruit the main 4 with 🤝 Hang out, or visit their bedrooms!');return;}
  const ownerNm=bedroomOwnerName();
  let txt=`🎮 ${ownerNm}'s room! ${HANGOUT_FLAVOR[owner]||'Posters. Snacks. Vibes.'} `;
  for(const id of crewIds){const c=canonById(id);if(!c)continue;txt+=`${c.name}: "${rnd(HANGOUT_LINES[id]||['Woo!'])}" `;GAME.friends.add(id);}
  GAME.inDialogue=true;dlgEl.classList.remove('hidden');
  DLG={npc:{kind:'canon',id:crewIds[0]},c:canonById(crewIds[0]),queue:[],stage:'endnow'};
  dlgName.textContent='🎮 Hangout!';drawPortrait(DLG.npc);typeText(txt+'(Best. Sleepover prep. EVER.)');
  dlgOpts.innerHTML='';const b=document.createElement('button');b.textContent='▸ Best day (E)';b.onclick=(e)=>{e.stopPropagation();endDialogue();};dlgOpts.appendChild(b);leaveButton();
  for(let k=0;k<10;k++)hearts.push({x:player.x+(Math.random()-0.5)*120,y:player.y-120,vy:-35,life:1.3});
  $('hud-who').textContent=playerLabel()+` · ❤${GAME.friends.size}`+(GAME.holding?' · holding ♥':'')+(GAME.followers.length?` · crew:${GAME.followers.length}`:'');
}
function enterHouse(p){
  const cx=clamp(p.x+p.w/2,60,W-60);
  GAME.enteredHouse=p.id;
  // front door faces the street: top-row houses exit below, bottom-row exit above (onto the road)
  GAME.exitSpot=p.y>300?[cx,p.y-60]:[cx,p.y+p.h+52];
  goMap('interior',480,440,'living');
  const f=familyMembers(p.id);
  toast('🏠 '+f.title+' — 3 rooms! Living, kitchen + bedroom. Parents + crew inside!');
}
function spawnNeighborhood(){
  // house families are INSIDE now — these neighbors are out for a stroll
  const stroll=[["Bebe's Mom",'mom','bebe','light'],['Mr. Valmer','dad','jimmy','light'],['Mrs. Valmer','mom','jimmy','light'],["Nichole's Mom",'mom','nichole','dark'],["Henrietta's Mom",'mom','henrietta','light'],['Roger','dad','clyde','light']];
  const spots=[[150,262],[262,262],[700,262],[812,262],[480,262],[592,262]];
  stroll.forEach(([nm,k,fam,sk],i)=>{
    npcs.push({kind:k,id:'p-'+nm+i,name:nm,fam:fam,spec:{skin:sk,skinColor:skinById(sk),...parentSpec(k)},x:spots[i][0],y:spots[i][1],walkP:i,face:1,blinkT:2,sayT:4,say:''});
  });
}
/* ---------- objectives / schedule ---------- */
function objectiveText(){
  const ph=GAME.phase;
  if(ph===0)return '📍 Explore the Yard. Talk to 3 kids (E). Then ENTER school (gold door). H=hold hands with partner, M=map, T=unstick.';
  if(ph===1)return '📍 Go to CLASSROOM (Hall → Classroom). Talk to Mr. Harris.';
  if(ph===2)return GAME.hasTray?'📍 You got lunch! Sit at a table (E at a table).':'📍 LUNCH! CAFETERIA → lunch counter (E).';
  if(ph===3)return '📍 RECESS! Playground. Try H near your partner ♥ to hold hands!';
  return '📍 AFTER SCHOOL — Neighborhood! Knock on doors (E): 3 rooms each, parents are HOME! Main 4: recruit crew (🤝) + game in bedrooms (🎮)!';
}
function setPhase(p){GAME.phase=p;$('hud-time').textContent=PHASES[p];$('objective').textContent=objectiveText();}
let bellT=0;

/* ---------- dialogue engine (v2: exits + dating + tons of lines) ---------- */
let DLG={queue:[],npc:null,choice:null,stage:'idle'};
function npcDisplayName(n){
  if(!n)return '???';
  if(n.kind==='canon')return canonById(n.id).name;
  return n.name||n.id;
}
function npcSpec(n){return n.kind==='canon'?canonById(n.id):n.spec;}
function playerLabel(){return GAME.isCustom?GAME.player.name+' (New Kid)':canonById(GAME.player.id).name;}
function talkKey(n){return n.kind==='canon'?n.id:(n.name||n.id);}

/* ---------- parent dialogue: your family vs neighbor families ---------- */
const PARENT_QUOTES={
 'Randy':[`Hey, {kid}! Your old man had a GREAT idea today. ...Your mother said no.`,`{kid}! You gotta see what I'm doing in the yard. Actually — don't. Just... don't.`],
 'Sharon':[`{kid}! Dinner! And tell your father to stop whatever he's doing out there.`,`How was school, sweetie? ...That bad, huh? Cocoa. Cocoa fixes it.`],
 'Gerald':[`Hey, {kid}! Dolphins, San Francisco, v-chips — your old man's seen it all.`,`Proud of you. Now homework first, THEN friends. ...Don't tell your mother I said friends second.`],
 'Sheila':[`WHAT did you eat today?! Salad?? ...Good. Have MORE salad.`,`{kid}! My baby! Did anyone bother you at school? GIVE ME NAMES.`],
 'Liane':[`Oh, my little piggy! Hungry? There's ALWAYS snacks here.`,`Such a polite little friend you brought! Cookies for everyone!`],
 'Stuart':[`Hey, {kid}. ...Work was work. There's ketchup in the fridge. That's dinner-adjacent.`,`Tell Karen her drawing's on the fridge. BEST fridge. I'm not crying.`],
 'Carol':[`{kid}! My baby! Hungry? Tired? Both? Sit, sit!`,`Oh! A friend! Even better than {kid} alone. Stay for dinner!`],
 'Stephen':[`{kid}. You're not grounded. ...Right now. Enjoy every second.`,`No more ninja stars in the house. Outside is ALSO the house. Grounded-adjacent.`],
 'Linda':[`Oh hamburgers, a guest! {kid}, why didn't you TELL me? Cookies! NOW!`,`Is this the friend from school? You're BOTH adorable. Say that again.`],
 'Thomas':[`...Hey. Stripe's in the back if you wanna look. Don't touch. Just... look.`,`{kid}. Homework done? ...Good. Don't end up like... me. I'm fine. We're fine.`],
 'Laura':[`{kid}! Sweetie! Tricia hogged the bathroom AGAIN, sorry about the wait.`,`You kids want snacks? I got snacks. Moms ALWAYS got snacks.`],
 'Richard':[`Welcome to Tweak Bros! ...The SHOP is closed. The twitching is NOT.`,`NO MORE COFFEE FOR {kid}!! ...Sorry. Flashbacks. You want decaf?`],
 'Mrs. Tweak':[`Oh! A friend! {kid} RARELY brings friends! Happy day! Happy, happy day!`,`You look tense, sweetie. Warm milk? Deep breaths? Both? Definitely both.`],
 'Steve Black':[`Welcome! Mi casa, you know the rest. Token talks about you. Good stuff.`,`Studio's off-limits... unless you play bass. Do you play bass?`],
 'Linda Black':[`{kid}! There's my polite one! Snacks are on the counter, help yourself!`,`Token! Your friend's here! ...He's pretending he didn't hear. Teenagers.`],
 'Mr. Testaburger':[`Wendy's friend! ...Are you behaving? Wendy says... things.`,`My little girl runs this school, you know. ...Very proud. Very tired. Proud.`],
 'Mrs. Testaburger':[`Oh! One of Wendy's friends! Juice box? I have forty.`,`Wendy! Your friend's here! ...She's pretending she didn't hear. Teenagers.`],
 "Bebe's Mom":[`Oh! Bebe's friend! ...Is my baby eating enough? Tell me EVERYTHING.`,`Shopping Saturday! Bebe insists you come. ...I insist harder.`],
 'Mr. Valmer':[`Jimmy's friend! ...He tells the BEST jokes. ...He gets it from me. Obviously.`],
 'Mrs. Valmer':[`Oh! A friend for Jimmy! ...He RARELY brings friends! Stay for dinner!`],
 "Nichole's Mom":[`Nichole's friend! ...She talks about school nonstop. ...Mostly about Token.`],
 "Henrietta's Mom":[`...Oh. One of Henrietta's... friends? ...Take a cookie. Leave quietly.`],
 'Roger':[`Clyde's friend! ...He cries at dog movies too, right? ...Just him? Okay.`],
 'Grandma':[`My grandbaby! ...Cookies? I made cookies. I ALWAYS make cookies.`,`Back in MY day, detention meant something! ...What did you do? ...Never mind. Hug.`],
};
const SCOLD=[
 `We got a CALL from the school, {kid}! {reason}?! ...You're GROUNDED! ...Ugh, fine — hug first. UNgrounded. THIS time.`,
 `{reason}?! Detention?! In THIS family?! ...Okay. Lecture over. You're UNgrounded. Don't do it again!`,
 `{nm} is VERY disappointed, {kid}. {reason}?! ...Apology accepted. UNgrounded. Now — snacks.`,
];
const LIANE_QUOTES=[
 `Detention AGAIN, my little piggy? That school is BROKEN. Have 40 snacks.`,
 `In trouble? YOU? Never! ...Well. Maybe a little. Mommy still loves you most!`,
];
const PARENT_OWN_CUSTOM=[
 `Hey {kid}! Home sweet home. Now — school. Lunch. Friends. Report. ALL of it.`,
 `I'm so proud of you, {kid}. New town, new school, and you're already making friends!`,
 `Dinner's at 6 sharp! {extra}`,
 `New friends? New teachers? Tell me everything — start with lunch. Always lunch.`,
];
const PARENT_NEIGHBOR=[
 `Oh! You're {player}! I'm {nm}. {kid} talks about you. Mostly good things!`,
 `{nm} here — welcome! Come by for dinner sometime. {kid} would love that.`,
 `Are you eating enough? You look... fine. Have a cookie anyway. It's the rule.`,
 `If {kid} gives you trouble, you tell me. ...I'm kidding. Mostly. Mostly.`,
];
const SIS_LINES={
 'Karen':[`Hi!! Are you Kenny's friend?! He's the BEST brother in the WHOLE WORLD!`,`Look! I drew our house! You're IN it! You're the little circle!`],
 'Tricia':[`Ugh. Craig's friends. ...You're the okay one. Don't tell him I said that.`,`Stripe bit me once. I respect him MORE now. Don't tell Craig.`],
};
const SIS_FALLBACK=[`Hi! I'm {nm}! Wanna see my drawing?`,`{kid} NEVER plays with me. ...Play with ME instead!`];
function parentKidName(n){
  if(n.fam&&n.fam!=='custom'&&n.fam!=='stroll')return(canonById(n.fam)||{}).name||'the kid';
  if(GAME.isCustom)return GAME.player.name;
  return canonById(GAME.player.id).name;
}
function isOwnParent(n){
  if(!n.fam)return false;
  return (GAME.isCustom&&n.fam==='custom')||(!GAME.isCustom&&n.fam===GAME.player.id);
}
function buildOpener(n){
  const P=GAME.player,isC=GAME.isCustom,pid=isC?'custom':P.id;
  const map=GAME.map,ph=GAME.phase;
  if(n.kind==='teacher'){
    const k2=talkKey(n);const tc2=GAME.talkCounts[k2]||0;
    const PL=playerLabel();
    const TCH={
      harris:ph===1?[
        `Alright class, settle down! ${PL}, eyes up here. Fractions. Try to stay awake, mmkay?`,
        `Pop quiz Friday, class! ...${PL}, why are you crying? It's TUESDAY. Study!`,
        `Homework! ${PL}, did YOU do yours? ...Don't answer. I can tell.`]:[
        `${PL}! ${ph===2?'Lunch time! Go eat!':ph===3?'Recess! Go play!':'My classroom, not the hallway!'} Scoot!`,
        `No loitering! ...You're loitering. ...I'm watching you loiter.`],
      ellen:[
        `HALL PASS?! ...You don't have one. ...I'm letting it slide. ONCE.`,
        `No running! Walk LIKE A STUDENT. ...Whatever that means.`,
        `My hallway, my rules! Rule one: no rule-breaking. Rule two: see rule one.`],
      miller:[
        `DODGEBALL! ...Kidding. Stretch! ...Kidding. Run laps!`,
        `You fight like my grandma! ...She's TOUGH though. Respect.`,
        `Winners hydrate! Losers hydrate MORE. Drink water, kid!`],
      peters:[
        `Welcome to MY school. ...It's also your school. But mostly mine.`,
        `Zero tolerance! ...Except for tolerating zero. Keep it clean, kid.`,
        `I know EVERYTHING that happens here. ...Okay, most things. Some things.`],
    };
    const pool=TCH[n.id]||[`Back to class, kid!`];
    const lines=[pool[tc2%pool.length]];
    if(GAME.trouble.detentions>0){
      const tail={harris:`Back in MY classroom with ${GAME.trouble.detentions} detention(s)? ...Sit. Think.`,ellen:`My hallway remembers, detention-kid. Walk.`,miller:`${GAME.trouble.detentions} detention(s)?! Laps. Now. ...Kidding. Later.`,peters:`My office knows your name now. ...My office is disappointed.`};
      lines.push(tail[n.id]||`Detention record, huh? I'm watching you.`);
    }
    return lines;
  }
  if(n.kind==='lunch'){
    const k2=talkKey(n);const tc2=GAME.talkCounts[k2]||0;
    const pool=ph===2?[
      GAME.hasTray?`Honey you already got a tray. Go sit before it gets cold!`:`Lunch line! Grab a tray, sweetie — today's special is... beige! (Then E at a table!)`,
      `Sloppy joes! Mystery meat! Beige surprise! ...Kidding. Mostly beige.`]:[
      `Cafeteria's closed, sugar. Come back at Lunch.`,
      `Kitchen's closed! ...But the smell never leaves. NEVER.`];
    return [pool[tc2%pool.length]];
  }
  if(n.kind==='mom'||n.kind==='dad'||n.kind==='sis'||n.id?.startsWith('p-')){
    const nm=n.name||'parent';
    const k2=talkKey(n);const tc2=GAME.talkCounts[k2]||0;
    const kidOf=parentKidName(n);
    if(n.kind==='sis'||n.sis){
      const pool=SIS_LINES[nm]||SIS_FALLBACK;
      return [pool[tc2%pool.length].replaceAll('{nm}',nm).replaceAll('{kid}',kidOf)];
    }
    if(isOwnParent(n)){
      // grounded? parents confront you FIRST (Cartman is exempt — Liane doesn't care)
      if(GAME.trouble.grounded&&!isCartmanPlayer()){
        GAME.trouble.grounded=false;
        const kidNm=isC?P.name:canonById(P.id).name;
        return [SCOLD[tc2%SCOLD.length].replaceAll('{kid}',kidNm).replaceAll('{reason}',GAME.trouble.reason||'Trouble').replaceAll('{nm}',nm)];
      }
      if(n.name==='Liane'&&isCartmanPlayer()&&GAME.trouble.detentions>0){
        return [LIANE_QUOTES[tc2%LIANE_QUOTES.length]];
      }
      if(isC){
        const extra=P.parents==='mom'?"It's just us, but we're a great team!":P.parents==='dad'?"It's just us, but we manage!":P.parents==='guardian'?"Grandma's cookies are cooling right now!":"The whole family's eating together tonight!";
        return [PARENT_OWN_CUSTOM[tc2%PARENT_OWN_CUSTOM.length].replaceAll('{kid}',P.name).replaceAll('{extra}',extra).replaceAll('{nm}',nm)];
      }
      const pool=PARENT_QUOTES[nm]||[`{nm} here! There's my {kid}! How was school, huh?`,`Proud of you, {kid}. Homework, dinner, bed. In SOME order.`];
      return [pool[tc2%pool.length].replaceAll('{kid}',canonById(P.id).name).replaceAll('{nm}',nm)];
    }
    return [PARENT_NEIGHBOR[tc2%PARENT_NEIGHBOR.length].replaceAll('{player}',playerLabel()).replaceAll('{nm}',nm).replaceAll('{kid}',kidOf)];
  }
  const c=canonById(n.id);
  const lines=[];
  const k=talkKey(n);const tc=GAME.talkCounts[k]||0;
  // 0) CREW: they're following you — short buddy line, then normal choices
  if(GAME.followers.includes(c.id)){
    lines.push(rnd(CREW_OPENERS));
  } else
  // 1) DATING: you ARE their partner — romantic lines only (rotating, no repeats)
  if(!isC&&isDating(pid,c.id)){
    const pool=ROMANTIC[`${pid}->${c.id}`]||[`Hey you. *soft smile* Best part of my day.`];
    lines.push(pool[tc%pool.length]);
  } else {
    // 2) Main opener: personal rotating line (cycles so talks don't repeat).
    // Custom kids get a new-kid greeting on even talks, personal line on odd.
    if(isC&&tc%2===0){
      const hairTxt=P.hairStyle==='afro'?'afro — looks awesome!':(P.hairStyle||P.hair||'hair');
      lines.push(rnd(CUSTOM_OPENERS).replace('{name}',P.name).replace('{hair}',hairTxt).replaceAll('{n}',c.name));
      if(c.partner&&Math.random()<0.5)lines.push(`Yeah — ${c.partner}'s my... you know... person. ${c.id==='craig'?'Don\'t make it weird.':c.id==='tweek'?'GAH! I said it out loud!!':'(It\'s complicated. It\'s not. It\'s great.)'}`);
    } else {
      lines.push(c.openers[tc%c.openers.length]);
    }
    // 3) Occasional tease about YOUR partner (25%) — from the right perspective:
    // TEASE_ABOUT_PARTNER is keyed by YOUR id, lines are about your partner.
    if(!isC&&DATING[pid]&&c.id!==DATING[pid]&&Math.random()<0.25){
      const fallback=`How's ${DATING[pid][0].toUpperCase()+DATING[pid].slice(1)}? You two are cute. Don't deny it.`;
      lines.push(rnd(TEASE_ABOUT_PARTNER[pid]||[fallback]));
    }
  }
  // map/phase flavor
  if(map==='cafe'&&ph===2)lines.push(`Did you get the ${c.lunch} Sitting with us?`);
  else if(map==='class')lines.push(`Ugh, fractions AGAIN. Save me.`);
  else if(map==='play'&&((c.id==='craig'||c.id==='tweek')))lines.push(`Recess = us time. No teachers. ...Mostly.`);
  else if(map==='street'){
    const HOUSED=['stan','kyle','cartman','kenny','tweek','token'];
    lines.push(HOUSED.includes(c.id)?`My parents are home! Knock on our door (E) and come in!`:`My folks are around the neighborhood. Probably embarrassing someone.`);
  }
  return lines;
}

function startDialogue(target){
  if(GAME.inDialogue)return;
  if(target.prop){handleProp(target);return;}
  GAME.inDialogue=true;GAME.talkTarget=target;
  dlgEl.classList.remove('hidden');
  const openers=buildOpener(target);
  const k=talkKey(target);GAME.talkCounts[k]=(GAME.talkCounts[k]||0)+1;
  DLG={npc:target,queue:openers.map(t=>({who:'npc',text:t})),stage:'lines'};
  const c=target.kind==='canon'?canonById(target.id):null;
  DLG.c=c;
  dlgName.textContent=npcDisplayName(target)+(c?.partner?` ♥ ${c.partner}`:'');
  drawPortrait(target);
  advanceDialogue();
}
function drawPortrait(n){
  portrait.clearRect(0,0,120,120);
  portrait.fillStyle='#bfe3ff';portrait.fillRect(0,0,120,120);
  const spec=n.prop?{jacket:'#999',pants:'#555',skin:'light',hair:'flat'}:npcSpec(n);
  drawPaper(portrait,spec,60,92,{scale:1.15,t:performance.now()/1000,talking:false,twitch:spec.twitch,blink:false});
}
let typeTimer=null;
function typeText(text){
  clearInterval(typeTimer);dlgText.textContent='';
  let i=0;typeTimer=setInterval(()=>{i+=3;dlgText.textContent=text.slice(0,i);if(i>=text.length)clearInterval(typeTimer);},12);
}
function leaveButton(){
  const b=document.createElement('button');b.textContent='✕ Leave (Esc)';b.style.background='#ffb3b3';
  b.onclick=(e)=>{e.stopPropagation();endDialogue();};dlgOpts.appendChild(b);
}
function advanceDialogue(){
  if(!GAME.inDialogue)return;
  if(DLG.stage==='endnow'){endDialogue();return;}
  if(DLG.stage==='madwait'||DLG.stage==='typewait')return; // buttons / typing only
  if(DLG.stage==='insultsaid'){showMad();return;}
  if(DLG.stage==='fight'){fightRound();return;}
  if(DLG.stage==='aftermath'||DLG.stage==='result'){endDialogue();return;}
  dlgOpts.innerHTML='';
  if(DLG.stage==='lines'&&DLG.queue.length){
    const l=DLG.queue.shift();
    dlgName.textContent=npcDisplayName(DLG.npc)+(DLG.c?.partner?` ♥ ${DLG.c.partner}`:'');
    drawPortrait(DLG.npc);typeText(l.text);
    if(!DLG.queue.length)DLG.stage='choice';
    else leaveButton();
    return;
  }
  if(DLG.stage==='choice'){
    const P=GAME.player,pid=GAME.isCustom?'custom':P.id;
    const v=VOICES[pid]||VOICES.custom;
    dlgName.textContent=playerLabel()+' (you)';
    const datingHere=DLG.npc.kind==='canon'&&!GAME.isCustom&&isDating(pid,DLG.npc.id);
    portrait.clearRect(0,0,120,120);portrait.fillStyle='#ffe9a8';portrait.fillRect(0,0,120,120);
    drawPaper(portrait,GAME.player,60,92,{scale:1.15,t:1,twitch:GAME.player.twitch});
    DLG.opts=[{label:'1: '+v[0][0],you:v[0][1]},{label:'2: '+v[1][0],you:v[1][1]}];
    if(DLG.npc.kind==='canon'){
      const c=DLG.c;
      if(datingHere)DLG.opts.push({label:'3 ♥: Lovey stuff',you:ROMANTIC_YOU[pid]||ROMANTIC_YOU.custom,romantic:true});
      else DLG.opts.push({label:`3 😈: Insult ${c.name}!`,insult:true,you:insultFor(pid,c.id)});
      DLG.opts.push({label:'4 ✏️: Type your own!',type:true});
      // main-4 meetups: recruit / dismiss crew (key 5)
      if(!GAME.isCustom&&MAIN4.includes(pid)&&c&&MAIN4.includes(c.id)&&c.id!==pid){
        if(GAME.followers.includes(c.id))DLG.opts.push({label:'5 👋: Split up for now',hangout:'dismiss'});
        else if(GAME.followers.length<3)DLG.opts.push({label:'5 🤝: Hang out!',hangout:'recruit'});
      }
    } else {
      if(GAME.isCustom&&v[2])DLG.opts.push({label:'3: '+v[2][0],you:v[2][1]});
      DLG.opts.push({label:'4 😈: Be rude!',rude:true});
      DLG.opts.push({label:'5 ✏️: Type your own!',type:true});
    }
    typeText((datingHere?'Your partner looks at you... what do you say?':'What do YOU say?')+` (${DLG.opts.map((_,i)=>i+1).join('/')})`);
    DLG.opts.forEach((o,i)=>{
      const b=document.createElement('button');b.textContent=o.label;
      if(o.romantic)b.style.background='#ffd6e8';
      if(o.insult||o.rude){b.style.background='#ffb3b3';}
      if(o.type)b.style.background='#d1ecff';
      b.onclick=(e)=>{e.stopPropagation();pickOpt(i);};dlgOpts.appendChild(b);
    });
    leaveButton();
    DLG.stage='awaitChoice';
    return;
  }
  if(DLG.stage==='reply'){DLG.stage='done';dlgName.textContent=npcDisplayName(DLG.npc);drawPortrait(DLG.npc);typeText(DLG.reply);leaveButton();return;}
  endDialogue();
}
function pickOpt(i){
  if(!GAME.inDialogue||DLG.stage!=='awaitChoice')return;
  if(!DLG.opts[i])return;
  const o=DLG.opts[i];
  if(o.type){openTypeBox();return;}
  if(o.hangout){hangoutToggle(DLG.npc,o.hangout);return;}
  if(o.insult){insultPath(DLG.npc,o.you);return;}
  if(o.rude){rudePath(DLG.npc);return;}
  dlgName.textContent=playerLabel()+' (you)';
  typeText('You: '+o.you);
  portrait.clearRect(0,0,120,120);portrait.fillStyle='#ffe9a8';portrait.fillRect(0,0,120,120);
  drawPaper(portrait,GAME.player,60,92,{scale:1.15,t:1,talking:true,twitch:GAME.player.twitch});
  DLG.reply=makeReply(DLG.npc,DLG.c,i,o);
  DLG.stage='reply';
  dlgOpts.innerHTML='';
  const b=document.createElement('button');b.textContent='▸ (E)';b.onclick=(e)=>{e.stopPropagation();advanceDialogue();};dlgOpts.appendChild(b);
  leaveButton();
  if(DLG.npc.kind==='canon'){GAME.friends.add(DLG.npc.id);if(GAME.friends.size===3&&GAME.phase===0)toast('Nice! 3 friends! Head INSIDE the school (gold door + E).');}
  if(o.romantic){
    for(let k=0;k<14;k++)hearts.push({x:player.x+(Math.random()-0.5)*120,y:player.y-120,vy:-30-Math.random()*30,life:1.4});
    toast('♥♥♥ Awwwww! ♥♥♥');
  }
  $('hud-who').textContent=playerLabel()+` · ❤${GAME.friends.size}`+(GAME.holding?' · holding ♥':'');
}
function showYouSay(text,talking){
  dlgName.textContent=playerLabel()+' (you)';
  typeText('You: '+text);
  portrait.clearRect(0,0,120,120);portrait.fillStyle='#ffe9a8';portrait.fillRect(0,0,120,120);
  drawPaper(portrait,GAME.player,60,92,{scale:1.15,t:1,talking:!!talking,twitch:GAME.player.twitch});
  dlgOpts.innerHTML='';
}
function hpBar(hp){
  const f=clamp(Math.round(Math.max(0,hp)/10),0,10);
  return '['+'#'.repeat(f)+'-'.repeat(10-f)+']';
}
/* ----- insult -> mad -> (fight | forgive | storm off) ----- */
function insultPath(npc,insultText,madOverride){
  if(npc.kind!=='canon'){rudePath(npc);return;}
  if(GAME.map==='class')addTrouble('Bad language in class');
  showYouSay(insultText,true);
  DLG.npc=npc;DLG.c=canonById(npc.id);
  DLG.pendingMad=madOverride||MAD[npc.id]||`HEY! ...Oh, it's ON!`;
  DLG.stage='insultsaid';
  const b=document.createElement('button');b.textContent='▸ (E)';
  b.onclick=(e)=>{e.stopPropagation();advanceDialogue();};dlgOpts.appendChild(b);
  leaveButton();
}
function showMad(){
  const n=DLG.npc,c=DLG.c;
  const type=MAD_TYPE[n.id]||'fight';
  dlgName.textContent=npcDisplayName(n);
  drawPortrait(n);typeText(DLG.pendingMad);
  for(let k=0;k<6;k++)hearts.push({x:n.x+(Math.random()-0.5)*80,y:n.y-120,vy:-20,life:0.9});
  dlgOpts.innerHTML='';
  DLG.stage='madwait';
  if(type==='fight'){
    const f=document.createElement('button');f.textContent='🥊 FIGHT!';f.className='fight';
    f.onclick=(e)=>{e.stopPropagation();startFight();};dlgOpts.appendChild(f);
    const s=document.createElement('button');s.textContent='🙏 Sorry!';s.className='sorry';
    s.onclick=(e)=>{e.stopPropagation();apologize();};dlgOpts.appendChild(s);
  } else {
    // cry / panic / slap / mock — instant aftermath
    if(n.id==='butters'){n.say='WAAAH!';toast('Butters is crying! You monster.');}
    if(n.id==='tweek'){n.say='EEP!';toast('Tweek is panicking! Great job.');}
    if(n.id==='bebe'){n.say='Hmph!';toast('SLAPPED! Your cheek stings. (-10 pride)');}
    if(n.id==='henrietta'){n.say='...Tch.';}
    n.sayT=22;
    DLG.stage='aftermath';
    const b=document.createElement('button');b.textContent='▸ (E)';
    b.onclick=(e)=>{e.stopPropagation();endDialogue();};dlgOpts.appendChild(b);
  }
  leaveButton();
}
function startFight(){
  const n=DLG.npc;
  DLG.stage='fight';DLG.round=0;DLG.hpYou=100;DLG.hpNpc=100;
  dlgName.textContent='🥊 FIGHT! '+playerLabel()+' vs '+npcDisplayName(n);
  drawPortrait(n);
  typeText(`ROUND 1 — ${hpBar(100)} YOU vs ${npcDisplayName(n)} ${hpBar(100)}\nLand the first hit!`);
  dlgOpts.innerHTML='';
  const p=document.createElement('button');p.textContent='🥊 Punch! (E)';p.className='fight';
  p.onclick=(e)=>{e.stopPropagation();fightRound();};dlgOpts.appendChild(p);
  const g=document.createElement('button');g.textContent='🏳️ Give up';
  g.onclick=(e)=>{e.stopPropagation();giveUp(false);};dlgOpts.appendChild(g);
  leaveButton();
  toast('🥊 FIGHT! Mash E / Punch!');
}
function fightRound(){
  if(!GAME.inDialogue||DLG.stage!=='fight')return;
  const n=DLG.npc;
  const pid=GAME.isCustom?'custom':GAME.player.id;
  const pp=POW_ALL[pid]??5, np=POW_ALL[n.id]??5;
  DLG.round++;
  const dN=8+pp*2+Math.floor(Math.random()*8);
  const dY=8+np*2+Math.floor(Math.random()*8);
  DLG.hpNpc-=dN;DLG.hpYou-=dY;
  const youLine=rnd(YOU_HIT);
  const pool=(NPC_HIT_SPECIAL[n.id]||[]).concat(NPC_HIT);
  const npcLine=rnd(pool);
  dlgName.textContent=`🥊 Round ${DLG.round} — YOU ${hpBar(DLG.hpYou)} vs ${npcDisplayName(n)} ${hpBar(DLG.hpNpc)}`;
  typeText(`${youLine} (-${dN}) ... ${npcLine} (-${dY})`);
  drawPortrait(n);
  if(DLG.hpYou<=0||DLG.hpNpc<=0||DLG.round>=8)fightResult();
}
function fightResult(){
  const n=DLG.npc,c=DLG.c;
  const pid=GAME.isCustom?'custom':GAME.player.id;
  addTrouble('Fighting');
  let outcome;
  if(DLG.hpNpc<=0&&DLG.hpYou<=0)outcome='draw';
  else if(DLG.hpNpc<=0)outcome='win';
  else if(DLG.hpYou<=0)outcome='lose';
  else outcome=DLG.hpYou===DLG.hpNpc?'draw':(DLG.hpYou>DLG.hpNpc?'win':'lose');
  let txt='';
  if(outcome==='win'){
    txt=`${npcDisplayName(n)} is DOWN! YOU WIN! "${LOSE_Q[n.id]||'Ow... okay... you win THIS one...'}"`;
    if(pid==='kyle'&&n.id==='cartman')txt+=` Obvious. 😎`;
    if(pid==='cartman'&&n.id==='kyle')txt+=` ...Wait, WHAT?! You NEVER win this! Enjoy it, fatboy!`;
    n.say='Ow...';n.sayT=25;
    GAME.friends.add(n.id);
    for(let k=0;k<10;k++)hearts.push({x:player.x+(Math.random()-0.5)*100,y:player.y-120,vy:-35,life:1.3});
  } else if(outcome==='lose'){
    txt=`You LOSE! ${npcDisplayName(n)} stands over you. "${WIN_Q[n.id]||'Ha! Better luck never.'}"`;
    if(pid==='cartman')txt+=` You burst into tears. WAAAH! MOMMYYY!!`;
    if(n.id==='cartman')txt+=` (You got beaten by CARTMAN. Tell no one.)`;
    n.say='Ha!';n.sayT=15;
    toast('You got BEAT UP! Walk it off...');
  } else {
    txt=`Mr. Harris slides between you: "Fighting?! DETENTION— ...kidding. BREAK IT UP." It's a DRAW.`;
    n.say='Hmph!';n.sayT=15;
  }
  dlgName.textContent=outcome==='win'?'🏆 YOU WIN!':outcome==='lose'?'💥 YOU LOSE!':'🤝 DRAW!';
  drawPortrait(n);typeText(txt);
  DLG.stage='result';
  dlgOpts.innerHTML='';
  const b=document.createElement('button');b.textContent='▸ (E)';
  b.onclick=(e)=>{e.stopPropagation();endDialogue();};dlgOpts.appendChild(b);
  leaveButton();
  $('hud-who').textContent=playerLabel()+` · ❤${GAME.friends.size}`+(GAME.holding?' · holding ♥':'');
}
function giveUp(ran){
  const n=DLG.npc;
  addTrouble('Fighting');
  const mock=ran?`You BOLT! "${GIVEUP_MOCK[n.id]||'Ha! Better run!'}" ...Coward. (Smart.)`:`You back away. "${GIVEUP_MOCK[n.id]||'Ha! Better run!'}"`;
  n.say='Ha!';n.sayT=12;
  dlgName.textContent=npcDisplayName(n);drawPortrait(n);typeText(mock);
  DLG.stage='result';dlgOpts.innerHTML='';
  const b=document.createElement('button');b.textContent='▸ (E)';
  b.onclick=(e)=>{e.stopPropagation();endDialogue();};dlgOpts.appendChild(b);
  leaveButton();
}
function apologize(){
  const n=DLG.npc;
  showYouSay('Okay okay — I\'m SORRY! ...Seriously. My bad.',false);
  const forgiving=['butters','tweek','stan','kyle','kenny','clyde','token','wendy','nichole','jimmy'];
  const forgiven=n.id==='cartman'?true:(forgiving.includes(n.id)?Math.random()<0.85:Math.random()<0.5);
  if(n.id==='cartman'){
    DLG.reply=`Apology ACCEPTED. Tribute: your dessert. Forever. ...We're cool. (Give me fries.)`;
  } else if(forgiven){
    DLG.reply=FORGIVE[n.id]||`...Fine. We're cool. Don't do it again.`;
    GAME.friends.add(n.id);
  } else {
    DLG.reply=`Nope. Walk away. NOW.`;
    n.say='Hmph!';n.sayT=15;
  }
  DLG.stage='reply';dlgOpts.innerHTML='';
  const b=document.createElement('button');b.textContent='▸ (E)';
  b.onclick=(e)=>{e.stopPropagation();advanceDialogue();};dlgOpts.appendChild(b);
  leaveButton();
}
/* ----- rude to adults (no fights — worse: consequences) ----- */
function rudePath(npc){
  const k=npc.kind;
  const say={teacher:'This class SUCKS!',lunch:'Your food SUCKS!',sis:'You\'re ADOPTED!',mom:'You\'re the WORST!',dad:'You\'re the WORST!'}[k]||'You\'re the WORST!';
  const scold={teacher:`Rude! ...See me after class. (There IS no after class. Be afraid.)`,lunch:`Well! No cookie for YOU. ...Fine. HALF a cookie.`,sis:`WAAAH!! I'M TELLING!!!`,mom:`MISTER/MISSY! ...Grounded? No. DISAPPOINTED. That's worse.`,dad:`Oh, I'm the worst? ...Fair. Still disappointed.`}[k]||`Well! I never! ...Kids today.`;
  showYouSay(say,true);
  DLG.npc=npc;DLG.c=null;
  if(k==='teacher')addTrouble('Mouthing off');
  if(k==='mom'||k==='dad'||k==='sis')groundPlayer('Being rude to family');
  DLG.reply=scold;DLG.stage='reply';
  const b=document.createElement('button');b.textContent='▸ (E)';
  b.onclick=(e)=>{e.stopPropagation();advanceDialogue();};dlgOpts.appendChild(b);
  leaveButton();
}
/* ----- type-your-own dialogue ----- */
function openTypeBox(){
  if(!GAME.inDialogue||DLG.stage!=='awaitChoice')return;
  DLG.stage='typewait';
  dlgName.textContent=playerLabel()+' (you)';
  typeText('Type what YOU say, then Send. Nice = friends. Mean = enemies. (Esc cancels)');
  dlgOpts.innerHTML='';
  const inp=document.createElement('input');
  inp.id='custom-say';inp.maxLength=120;inp.autocomplete='off';inp.spellcheck=false;
  inp.placeholder='Say anything... ("You rock!" / "You suck!" / "fight!")';
  const send=document.createElement('button');send.textContent='Send ➤';
  send.onclick=(e)=>{e.stopPropagation();sendCustom();};
  dlgOpts.appendChild(inp);dlgOpts.appendChild(send);
  leaveButton();
  setTimeout(()=>{const el=document.getElementById('custom-say');if(el)el.focus();},60);
}
function sendCustom(){
  const inp=document.getElementById('custom-say');
  if(!inp||!GAME.inDialogue||DLG.stage!=='typewait')return;
  const text=inp.value.trim().slice(0,120);
  if(!text){inp.focus();return;}
  inp.blur();
  customRespond(text);
}
function customRespond(text){
  const n=DLG.npc;
  const c=n.kind==='canon'?canonById(n.id):null;
  const pid=GAME.isCustom?'custom':GAME.player.id;
  showYouSay(text,false);
  DLG.npc=n;DLG.c=c;
  const low=' '+text.toLowerCase()+' ';
  const slur=/kike|kyke|jewboy|hymie/i.test(text);
  const mean=/\bfat\b|\bpoor\b|\bugly\b|\bstupid\b|\bdumb\b|\bhate\b|shut up|\blame\b|\bloser\b|\bsuck|\bsmell|\bgrounded\b|\bcrybaby\b|\bidiot\b|\bdork\b|\bkill you\b|\bshut\b|\bfart\b|\bbutt\b/i.test(text);
  const nice=/\blove\b|\blike you\b|\bcool\b|\bawesome\b|\bgreat\b|\bfriend\b|\bsorry\b|\bbest\b|\bamazing\b|\bpretty\b|\bcute\b|\bnice\b|\bthanks?\b|\bhello\b|\bhey\b|\bhi\b|\bmarry\b|\brock\b/i.test(text);
  const bye=/\bbye\b|see ya|gotta go|\blater\b/i.test(text);
  const wantFight=/\bfight\b|\bbattle\b|bring it|let'?s go|lets go|\b1v1\b/i.test(text);
  const saysPartner=DATING[pid]&&low.includes(' '+DATING[pid]+' ');
  const saysOwnName=c&&low.includes(' '+c.id+' ');
  const finish=(reply)=>{DLG.reply=reply;DLG.stage='reply';const b=document.createElement('button');b.textContent='▸ (E)';b.onclick=(e)=>{e.stopPropagation();advanceDialogue();};dlgOpts.appendChild(b);leaveButton();};
  if(n.kind!=='canon'){
    if(nice){finish(ADULT_HAPPY[n.kind]||ADULT_HAPPY.mom);if(n.kind==='mom'||n.kind==='dad')GAME.friends.add('parent'+(n.name||''));}
    else if(mean||slur){rudePath(n);return;}
    else finish(ADULT_CONFUSED[n.kind]||ADULT_CONFUSED.mom);
    return;
  }
  if(wantFight){insultPath(n,text,`Oh, it's ON then! You asked for it!`);return;}
  if(bye){finish(BYE_LINE);return;}
  if(slur&&n.id==='kyle'){insultPath(n,text,KYLE_SLUR_MAD);return;}
  if(mean){insultPath(n,text);return;}
  if(saysPartner&&isDating(pid,n.id)){finish(`*blushes HARD* ...S-stop saying my name like that! ...Okay. Say it again.`);GAME.friends.add(n.id);return;}
  if(saysPartner){finish(`*blushes* ...W-why are you bringing THEM up?! Mind your business! (They're grinning.)`);return;}
  if(saysOwnName){finish(`You know my name! ...Everyone knows my name. ...Say it again.`);GAME.friends.add(n.id);return;}
  if(nice){finish(HAPPY[n.id]||`Heh, thanks!`);GAME.friends.add(n.id);return;}
  finish(CONFUSED[n.id]||`...What?`);
}
function makeReply(n,c,idx,o){
  const P=GAME.player,pid=GAME.isCustom?'custom':P.id;
  if(o?.romantic){
    const rid=n.id;
    const R={craig:`*Craig goes red.* ...Okay. That was... nice. Don't tell anyone I smiled. (He's smiling.)`,
      tweek:`GAH—!! HAPPY TWITCH!! *Tweek latches onto your arm.* Best. Pressure. EVER.`,
      stan:`*Stan grins like an idiot.* Dude... I mean... babe... YES.`,
      wendy:`*Wendy fixes your collar.* There. Now you're presentable, Marsh. ...Come here.`,
      token:`*Token laughs.* Smooth. Real smooth. ...My turn: you're stuck with me.`,
      nichole:`*Twirl!* Okay, we're THAT couple now. No regrets!`};
    return R[rid]||`*${npcDisplayName(n)} melts.* Okay, that was adorable.`;
  }
  const friendly=idx===0;
  if(n.kind==='teacher'){
    const TR={harris:`Good attitude. +5 participation. Now SIT.`,ellen:`Hmm. Polite. ...You may walk my hallway.`,miller:`Good hustle! Water break! ...That's an order.`,peters:`A model student! ...My office approves.`};
    const TR2={harris:`Sit!`,ellen:`...Fine. Walk.`,miller:`...Ten jumping jacks. Kidding. Five.`,peters:`Noted. In the files. ...There are no files.`};
    return friendly?(TR[n.id]||TR.harris):(TR2[n.id]||`Hmm.`);
  }
  if(n.kind==='lunch'){
    if(GAME.phase===2&&!GAME.hasTray){GAME.hasTray=true;$('objective').textContent=objectiveText();return `Tray's up: ${GAME.player.lunch||'mystery meat + tots + milk'}! Go SIT at a table (E)!`;}
    return friendly?`Extra cookie. Don't tell the others!`:`Kids today. ...Still a cookie.`;
  }
  if(n.kind==='mom'||n.kind==='dad'||n.kind==='sis'||n.id?.startsWith('p-')){
    if(n.kind==='sis'||n.sis)return friendly?`Yay!! Best day EVER!! Wanna see my drawing?!`:`...Okay. I'm telling! ...Kidding! Maybe.`;
    if(isOwnParent(n))return friendly?`That's my kid! Proud of you. Dinner at 6, don't be late!`:`Ohh, don't be like that. I love you. Go play — but homework first!`;
    return friendly?`What a polite kid! ${parentKidName(n)} should bring you around more often!`:`Hmph. Kids today. ...Have a cookie anyway.`;
  }
  if(!c)return `...Interesting. Very interesting.`;
  const R={
   stan:friendly?[`Heh, exactly dude. Sit with us at lunch — me, Kyle, you.`,'Seriously though — you, me, Sparky, join my dog-walking scheme?'][GAME.talkCounts[c.id]%2]:`Dude?! ...Eh. Still friends. Probably.`,
   kyle:friendly?`YES! A brain! High five! Also — Cartman's scheming. Stay sharp.`:`Dude, WHAT? No! Ugh... we're cool. Mostly.`,
   cartman:friendly?`I like you. You're my new best friend. Kyle's FIRED. ...Bring snacks tomorrow.`:`Screw you! ...Wait — snacks? Then we're cool.`,
   kenny:friendly?`(muffled) Mmmph!! (happy wiggle — that means he likes you)`:`(muffled) Mmmph... (sad trombone)`,
   butters:friendly?[`New friend!! Sleepover?! ...Ask my parents. Then ask again. Then get grounded.`,'Professor Chaos approves of you! That\'s... probably bad.'][GAME.talkCounts[c.id]%2]:`Am I in trouble? Are YOU grounding me too?!`,
   craig:friendly?`Heh. You're alright. Tweek talks about you. Don't tell him I said that.`:`...Whatever. (he sits closer anyway)`,
   tweek:friendly?[`Really?! YAY! *twitch* Tweak Bros after school?! Too much?! Sorry!!`,'Craig smiled today. A REAL one. I almost passed out. GAH!'][GAME.talkCounts[c.id]%2]:`OKAY— fine— EVERYTHING'S FINE— *breathes into bag*`,
   clyde:friendly?`Sweet! Trade snacks? I got pizza. I ALWAYS got pizza.`:`Huh? ...Still friends?`,
   token:friendly?`Respect. Table's open — sit with me and Nichole.`:`All good. No beef. ...Want a fry?`,
   wendy:friendly?[`Thank you! Reasonable people! Council Thursday. Join?`,'Stan better not be eating paste again. Go check on him for me?'][GAME.talkCounts[c.id]%2]:`Problematic. But fixable. I'll educate you.`,
   bebe:friendly?`Yesss! Lunch table. Be there. Wendy! Did you hear?!`:`Ugh, whatever. ...Cute shoes though.`,
   jimmy:friendly?[`W-w-wow! You're gonna LOVE my lunch-meat bit!`,'Fish sticks joke? Never gets old. NEVER.'][GAME.talkCounts[c.id]%2]:`T-t-tough crowd! I'll workshop it!`,
   nichole:friendly?[`Yay! Cheer table, be there! Bring Token!`,'Token hummed my routine today. A WHOLE routine!'][GAME.talkCounts[c.id]%2]:`It's okay! *hair flip* We're good!`,
   henrietta:friendly?`...Less conformist than most. Goth table. Maybe. Bring suffering.`:`Typical. ...Still. Whatever.`,
  };
  let base=R[c.id]||`Cool. See you at ${GAME.phase===2?'lunch':'recess'}?`;
  if(Array.isArray(base))base=base[0];
  const gossip={craig:` If Tweek paces, hold his hand (H). Trust me.`,tweek:` Craig doodled our initials. I SAW it. GAH!`,wendy:` Stan and I are good today. Ask again in an hour.`,stan:` If Wendy asks: I did NOT eat the cookie.`,kyle:` Cartman's planning something. Always.`,token:` Me + Nichole = great. Thanks for asking.`,nichole:` Token wrote me a song!`,butters:` Don't tell my parents about Chaos!`,kenny:` Karen says hi, by the way.`,cartman:` Mom packed me extra... nothing. Mind your business.`,clyde:` Token's arcade. Saturday. Be there.`,bebe:` Wendy's petition needs ONE more signature. Yours.`,jimmy:` Timmy says hi! ...He said "Timmy". Same thing.`,henrietta:` ...You're still here. Huh. Fine. Stay.`};
  if(Math.random()<0.65&&gossip[c.id])base+=gossip[c.id];
  if(GAME.phase===2&&!GAME.hasTray)base+=` (Psst — lunch counter first!)`;
  if(!GAME.isCustom&&DATING[pid]&&c.id!==DATING[pid]&&Math.random()<0.25){const pn=DATING[pid];base+=` Say hi to ${pn[0].toUpperCase()+pn.slice(1)} for me, lovebird.`;}
  return base;
}
function endDialogue(){
  GAME.inDialogue=false;GAME.talkTarget=null;dlgEl.classList.add('hidden');clearInterval(typeTimer);dlgOpts.innerHTML='';
  $('hud-who').textContent=playerLabel()+` · ❤${GAME.friends.size}`+(GAME.holding?' · holding ♥':'');
}
function handleProp(p){
  if(p.id==='lunchline'){
    if(GAME.phase!==2){toast('Closed — come back at 🍔 Lunch!');return;}
    if(GAME.hasTray){toast('Got tray! Sit at a table.');return;}
    GAME.inDialogue=true;dlgEl.classList.remove('hidden');
    DLG={npc:{kind:'lunch',id:'lunchlady',name:'Lunch Lady'},queue:[],stage:'endnow'};
    GAME.hasTray=true;$('objective').textContent=objectiveText();
    dlgName.textContent='Lunch Lady';drawPortrait(DLG.npc);
    typeText(`Tray: ${GAME.player.lunch||'mystery meat, tots + milk'}! Pick Cool / Main / Loner ♥ / Goth table + E! (Esc to leave)`);
    dlgOpts.innerHTML='';const b=document.createElement('button');b.textContent='▸ Yum! (E)';b.onclick=(e)=>{e.stopPropagation();endDialogue();};dlgOpts.appendChild(b);leaveButton();
    return;
  }
  if(p.id&&p.id.startsWith('table')){
    if(!GAME.hasTray){toast('Tray first! (lunch counter)');return;}
    if(GAME.ate){toast('Already ate. Recess time!');return;}
    GAME.ate=true;
    const names={'table-cool':'Cool table','table-main':'Main table','table-loner':'Loner table ♥','table-goth':'Goth table'};
    GAME.inDialogue=true;dlgEl.classList.remove('hidden');
    DLG={npc:{kind:'canon',id:'stan'},queue:[],stage:'endnow'};
    const P=GAME.player;
    let txt='';
    if(p.id==='table-loner')txt=`Loner table: Craig slides fries over, no eye contact. Tweek vibrates: "NEW FRIEND AT OUR TABLE?!" Craig: "...Whatever. (welcome.)" ${GAME.isCustom?`You tell them about ${P.mom||'your mom'}. Tweek tears up.`:`You three talk about ${DATING[P.id]||'everyone'}. Craig almost smiles.`} ${!GAME.isCustom&&isDating(P.id,'tweek')||isDating(P.id,'craig')?'You hold hands under the table. ♥':''}`;
    else if(p.id==='table-main')txt=`MAIN table! Stan: "Scoot!" Kyle: "No fighting!" Cartman steals dessert anyway. Kenny muffles wisdom. Butters: "Lunch buddies!!"`;
    else if(p.id==='table-cool')txt=`Cool table! Token nods. Nichole fixes your hair. Clyde trades pizza. +20% cooler.`;
    else txt=`Goth table. Henrietta: "...Bold." Black pudding slides over. "Eat. Suffer. Enjoy."`;
    dlgName.textContent=names[p.id];typeText(txt+' (Recess next!)');
    dlgOpts.innerHTML='';const b=document.createElement('button');b.textContent='▸ Nom (E)';b.onclick=(e)=>{e.stopPropagation();endDialogue();};dlgOpts.appendChild(b);leaveButton();
    return;
  }
  if(p.id&&(p.id.startsWith('house-')||p.id==='home')){
    enterHouse(p);return;
  }
  if(p.id==='couch'){toast(rnd(['Comfy! ...Get up, guests are coming!','You flop onto the couch. A parent immediately asks about homework.']));return;}
  if(p.id==='fridge'){toast(rnd(['Fridge raid! Leftover pizza! SCORE.','Chocolate milk! ...Mom counted these. She\'ll know.','Pudding cups! JACKPOT.','A sandwich labeled "DO NOT EAT - DAD". ...You didn\'t.']));return;}
  if(p.id==='bed'){toast(bedroomOwnerName()+'\'s bed! So comfy... GET UP, the crew needs you!');return;}
  if(p.id==='console'){hangoutScene();return;}
  toast(p.label);
}

/* ---------- hold hands + hug ---------- */
function partnerNear(){
  if(GAME.isCustom||!GAME.player)return null;
  const want=DATING[GAME.player.id];if(!want)return null;
  return npcs.find(n=>n.kind==='canon'&&n.id===want&&Math.hypot(n.x-player.x,n.y-player.y)<110)||null;
}
function tryHoldHands(){
  if(GAME.isCustom||!GAME.player){toast('Only canon couples can hold hands — play Craig/Tweek/Stan/Wendy/Token/Nichole!');return;}
  const want=DATING[GAME.player.id];
  if(!want){toast(playerLabel()+' isn\'t dating anyone. (Craig♥Tweek, Stan♥Wendy, Token♥Nichole can!)');return;}
  if(GAME.holding){GAME.holding=null;toast('You let go. ...Craig-style: "Whatever. (come back.)"');$('hud-who').textContent=playerLabel()+` · ❤${GAME.friends.size}`;return;}
  const p=partnerNear();
  if(!p){toast(`Find ${want} first and stand close! (look for ♥ name)`);return;}
  GAME.holding=want;
  for(let k=0;k<12;k++)hearts.push({x:player.x+(Math.random()-0.5)*80,y:player.y-110,vy:-30-Math.random()*30,life:1.5});
  toast(`♥ Holding hands with ${canonById(want).name}! Walk around — they follow! (H to let go)`);
  if(GAME.inDialogue)endDialogue();
  $('hud-who').textContent=playerLabel()+` · ❤${GAME.friends.size} · holding ♥`;
}
function tryHug(){
  const list=npcs.filter(n=>Math.hypot(n.x-player.x,n.y-player.y)<90);
  if(!list.length){if(!GAME.inDialogue)toast('No one close to hug! (J)');return;}
  const n=list[0];
  for(let k=0;k<10;k++)hearts.push({x:n.x+(Math.random()-0.5)*60,y:n.y-110,vy:-40-Math.random()*20,life:1.2});
  const dating=n.kind==='canon'&&!GAME.isCustom&&isDating(GAME.player.id,n.id);
  toast(dating?`♥ Big hug with ${npcDisplayName(n)}! "${rnd(['Don\'t let go yet.','Best. Hug. Ever.','GAH— happy squeeze!'])}"`:`You hug ${npcDisplayName(n)}! They laugh. (+friendship!)`);
  if(n.kind==='canon')GAME.friends.add(n.id);
}

/* ---------- interact / travel ---------- */
function interactables(){
  const list=[];
  for(const n of npcs)list.push({o:n,d:Math.hypot(n.x-player.x,n.y-player.y)});
  for(const p of MAPS[GAME.map].props)if(p.id)list.push({o:{...p,prop:true,x:p.x+p.w/2,y:p.y+p.h/2},d:Math.hypot(p.x+p.w/2-player.x,p.y+p.h/2-player.y)-40});
  return list.sort((a,b)=>a.d-b.d);
}
function nearestInteractable(mx,my){
  const px=mx??player.x,py=my??player.y;
  let best=null,bd=1e9;
  for(const n of npcs){const d=Math.hypot(n.x-px,n.y-py);if(d<80&&d<bd){bd=d;best={o:n,d};}}
  if(best)return best;
  for(const p of MAPS[GAME.map].props){if(!p.id)continue;const d=Math.hypot(p.x+p.w/2-px,p.y+p.h/2-py);if(d<120&&d<bd){bd=d;best={prop:true,...p,x:p.x+p.w/2,y:p.y+p.h/2};}}
  // doors (need E)
  for(const d of MAPS[GAME.map].doors){const dd=Math.hypot(d.x+d.w/2-px,d.y+d.h/2-py);if(dd<80&&dd<bd){bd=dd;best={door:d};}}
  return best;
}
function tryInteract(){
  if(GAME.inDialogue){advanceDialogue();return;}
  const t=nearestInteractable();
  if(!t){toast('Walk to a glowing door / person! (T = unstick)');return;}
  if(t.door){goMap(t.door.to,t.door.sx,t.door.sy,t.door.room);return;}
  if(t.prop){if(Math.hypot(t.x-player.x,t.y-player.y)<150)startDialogue(t);else toast('Closer!');return;}
  if(t.d<80)startDialogue(t.o);
}
function freeSpot(x,y){
  const test=(tx,ty)=>{const box={x:tx-10,y:ty-6,w:20,h:26};for(const s of solids())if(rectsOverlap(box,s))return false;return true;};
  if(test(x,y))return[x,y];
  for(let r=20;r<200;r+=20)for(let a=0;a<8;a++){const tx=x+Math.cos(a/8*6.28)*r,ty=y+Math.sin(a/8*6.28)*r;if(tx>40&&tx<W-40&&ty>50&&ty<H-40&&test(tx,ty))return[tx,ty];}
  return[480,380];
}
function goMap(id,sx,sy,room){
  GAME.map=id;
  if(id==='interior')GAME.room=room||'living';
  else GAME.room=null;
  const [fx,fy]=freeSpot(sx,sy);
  player.x=fx;player.y=fy;player.vx=player.vy=0;
  if(GAME.holding)GAME.holding=null;
  spawnMap(id);
  $('hud-where').textContent=MAPS[id].label;
  $('objective').textContent=objectiveText();
  if(id==='class'&&GAME.phase===0)setPhase(1);
  else if(id==='cafe'&&GAME.phase===1)setPhase(2);
  else if(id==='play'&&GAME.phase===2&&GAME.ate)setPhase(3);
  else if(id==='street'&&GAME.phase===3)setPhase(4);
  toast('→ '+MAPS[id].label+' (T = unstick if stuck)');
}
function toggleMap(){
  const m=$('mapmodal');m.classList.toggle('hidden');
  const box=$('mapbtns');box.innerHTML='';
  for(const id of Object.keys(MAPS)){
    if(id==='interior')continue; // houses are entered by knocking (E), not fast travel
    const b=document.createElement('button');b.className='btn';b.textContent=MAPS[id].label;
    b.onclick=()=>{const sp={yard:[480,400],hall:[480,380],class:[480,420],cafe:[480,420],play:[480,420],street:[480,440]};const[sx,sy]=sp[id];goMap(id,sx,sy);m.classList.add('hidden');};
    box.appendChild(b);
  }
}
$('btn-close-map').onclick=()=>$('mapmodal').classList.add('hidden');

/* ---------- physics + render ---------- */
let last=performance.now(),T=0;
const BARK_FALLBACK=['Hey!','Yo!','...','♪'];
function solids(){
  const m=MAPS[GAME.map];
  const s=[...m.walls];
  for(const p of m.props)if(p.solid)s.push(p);
  return s;
}
function collide(nx,ny){
  const box={x:nx-10,y:ny-6,w:20,h:26};
  for(const s of solids())if(rectsOverlap(box,s))return true;
  return false;
}
function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(0.033,(now-last)/1000);last=now;T+=dt;
  if(GAME.started&&!GAME.inDialogue){
    let ax=0,ay=0;
    if(keys['w']||keys['arrowup'])ay-=1;
    if(keys['s']||keys['arrowdown'])ay+=1;
    if(keys['a']||keys['arrowleft'])ax-=1;
    if(keys['d']||keys['arrowright'])ax+=1;
    const ACC=2400,MAX=205,FR=8;
    player.vx+=ax*ACC*dt;player.vy+=ay*ACC*dt;
    player.vx-=player.vx*Math.min(1,FR*dt);player.vy-=player.vy*Math.min(1,FR*dt);
    const sp=Math.hypot(player.vx,player.vy);
    if(sp>MAX){player.vx*=MAX/sp;player.vy*=MAX/sp;}
    if(Math.abs(player.vx)<4)player.vx=0;if(Math.abs(player.vy)<4)player.vy=0;
    const nx=player.x+player.vx*dt;
    if(!collide(nx,player.y))player.x=nx;else player.vx*=-0.15;
    const ny=player.y+player.vy*dt;
    if(!collide(player.x,ny))player.y=ny;else player.vy*=-0.15;
    player.x=clamp(player.x,34,W-34);player.y=clamp(player.y,44,H-34);
    player.moving=sp>20;
    if(player.moving){player.walk+=dt*11;if(player.vx>10)player.face=1;else if(player.vx<-10)player.face=-1;}
    if(GAME.player?.twitch==='alot'&&Math.random()<0.08)player.x+=(Math.random()-0.5)*6;
    bellT+=dt;if(bellT>200){bellT=0;setPhase((GAME.phase+1)%5);toast('🔔 BELL! '+PHASES[GAME.phase]);}
    // holding: partner follows
    if(GAME.holding){
      const h=npcs.find(n=>n.kind==='canon'&&n.id===GAME.holding);
      if(h){const dx=player.x-36*player.face-h.x,dy=player.y-6-h.y,d=Math.hypot(dx,dy);
        if(d>8){h.x+=dx*Math.min(1,6*dt);h.y+=dy*Math.min(1,6*dt);}h.face=player.face;
        if(Math.random()<0.1)hearts.push({x:(h.x+player.x)/2,y:player.y-120,vy:-25,life:1});}
    } else if(GAME.map==='play'){
      const cr=npcs.find(o=>o.id==='craig'),tw=npcs.find(o=>o.id==='tweek');
      if(cr&&tw&&Math.hypot(cr.x-tw.x,cr.y-tw.y)>70){cr.x+=(tw.x-cr.x)*dt*0.25;cr.y+=(tw.y-cr.y)*dt*0.25;}
    }
    // crew trails behind you in a little line
    GAME.followers.forEach((fid,i)=>{
      const fl=npcs.find(n=>n.id===fid);if(!fl)return;
      const tx=player.x-player.face*(46+i*36),ty=player.y+10+(i%2)*14;
      const dx=tx-fl.x,dy=ty-fl.y,d=Math.hypot(dx,dy);
      if(d>10){fl.x+=dx*Math.min(1,5*dt);fl.y+=dy*Math.min(1,5*dt);}
      fl.face=player.face;
    });
  }
  for(const n of npcs){
    n.blinkT-=dt;if(n.blinkT<0)n.blinkT=2+Math.random()*3;
    n.sayT-=dt;
    if(n.sayT<0){n.sayT=7+Math.random()*8;
      if(n.kind==='canon'){const c=canonById(n.id);n.say=Math.random()<0.35?rnd(c.bark):'';}
      else n.say=Math.random()<0.2?rnd(BARK_FALLBACK):'';}
  }
  hearts=hearts.filter(h=>{h.life-=dt;h.y+=h.vy*dt;return h.life>0;});
  draw();
}
function drawGround(m){
  if(GAME.map==='hall'||GAME.map==='class'||GAME.map==='cafe'){
    ctx.fillStyle=m.bg[0];ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,.05)';for(let y=40;y<H;y+=44)ctx.fillRect(0,y,W,2);
    ctx.strokeStyle='rgba(0,0,0,.07)';for(let x=0;x<W;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    if(GAME.map==='hall'){
      // lockers row
      for(let x=64;x<896;x+=46){ctx.fillStyle=['#e57373','#64b5f6','#81c784','#ffd54f'][(x/46|0)%4];ctx.fillRect(x,52,42,26);ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(x,52,42,26);}
      ctx.fillStyle='#1c1c22';ctx.font='bold 13px Trebuchet MS';ctx.textAlign='center';ctx.fillText('★ HALLWAY — doors glow gold, press E ★',480,110);
    }
    if(GAME.map==='class'){
      ctx.fillStyle='#4e342e';ctx.fillRect(300,50,360,44);
      ctx.fillStyle='#fff';ctx.font='bold 18px Trebuchet MS';ctx.textAlign='center';ctx.fillText('2 + 2 = ?   (fractions!)',480,78);
      ctx.fillStyle='#8d6e63';ctx.font='bold 12px Trebuchet MS';ctx.fillText('Mr. Harris',480,140);
    }
    if(GAME.map==='cafe'){
      ctx.fillStyle='#1c1c22';ctx.font='bold 15px Trebuchet MS';ctx.textAlign='center';ctx.fillText('★ CAFETERIA — grab tray at counter during LUNCH ★',480,140);
    }
  } else if(GAME.map==='interior'){
    const room=GAME.room||'living';
    if(room==='kitchen'){
      // tile walls + checkerboard floor
      ctx.fillStyle='#cfd8dc';ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(255,255,255,.55)';
      for(let wx=12;wx<W;wx+=48)for(let wy=56;wy<220;wy+=36){ctx.fillRect(wx,wy,40,28);}
      ctx.strokeStyle='rgba(0,0,0,.12)';ctx.lineWidth=1;
      for(let wx=12;wx<W;wx+=48)for(let wy=56;wy<220;wy+=36){ctx.strokeRect(wx,wy,40,28);}
      ctx.fillStyle='#78909c';ctx.fillRect(0,224,W,40);
      for(let fy=264;fy<H;fy+=34)for(let fx=0;fx<W;fx+=68){
        ctx.fillStyle=(((fx+fy)/34)|0)%2?'#eceff1':'#90a4ae';ctx.fillRect(fx,fy,68,34);
      }
      // hanging pans
      for(let px=300;px<=660;px+=120){
        ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,224);ctx.lineTo(px,244);ctx.stroke();
        ctx.fillStyle='#546e7a';ctx.beginPath();ctx.arc(px,256,14,0,7);ctx.fill();ctx.stroke();
      }
      ctx.fillStyle='#1c1c22';ctx.font='bold 20px Trebuchet MS';ctx.textAlign='center';
      ctx.fillText(MAPS.interior.label+' — E the fridge for snacks!',480,30);
    } else if(room==='bedroom'){
      // personalized bedroom walls + posters + rug
      const st=bedroomStyle();
      ctx.fillStyle=st.c;ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(255,255,255,.25)';
      for(let sx=30;sx<W;sx+=90){ctx.beginPath();ctx.arc(sx,150,8,0,7);ctx.fill();}
      ctx.fillStyle='#6d4c41';ctx.fillRect(0,236,W,28);
      ctx.fillStyle='#8d5e3c';ctx.fillRect(0,264,W,H-264);
      ctx.strokeStyle='rgba(60,35,15,.35)';ctx.lineWidth=2;
      for(let fy=282;fy<H;fy+=26){ctx.beginPath();ctx.moveTo(0,fy);ctx.lineTo(W,fy);ctx.stroke();}
      ctx.fillStyle='#e84393';ctx.beginPath();ctx.ellipse(480,380,200,66,0,0,7);ctx.fill();
      ctx.strokeStyle='#ad1457';ctx.lineWidth=4;ctx.stroke();
      // posters
      st.posters.forEach((txt,i)=>{
        const px=i===0?330:560;
        ctx.fillStyle='#f5f1e3';ctx.fillRect(px-70,56,140,72);ctx.strokeStyle='#1c1c22';ctx.lineWidth=3;ctx.strokeRect(px-70,56,140,72);
        ctx.fillStyle=['#e53935','#3f51b5'][i%2];ctx.fillRect(px-62,64,124,56);
        ctx.fillStyle='#fff';ctx.font='bold 15px Trebuchet MS';ctx.textAlign='center';ctx.fillText(txt,px,98);
      });
      ctx.fillStyle='#1c1c22';ctx.font='bold 20px Trebuchet MS';ctx.textAlign='center';
      ctx.fillText(MAPS.interior.label+' — E the 🎮 to hang out!',480,30);
    } else {
    // cozy living room: wallpaper + wainscot + wood floor + rug + photos
    ctx.fillStyle='#f3e2c2';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(190,130,85,.4)';
    for(let wx=24;wx<W;wx+=64)for(let wy=58;wy<200;wy+=44){ctx.fillRect(wx,wy,26,20);}
    ctx.fillStyle='#a9714b';ctx.fillRect(0,208,W,56);
    ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(-4,208,W+8,56);
    ctx.fillStyle='#8d5e3c';ctx.fillRect(0,264,W,H-264);
    ctx.strokeStyle='rgba(60,35,15,.35)';ctx.lineWidth=2;
    for(let fy=282;fy<H;fy+=26){ctx.beginPath();ctx.moveTo(0,fy);ctx.lineTo(W,fy);ctx.stroke();}
    // family photos on the wall (above the couch)
    for(let fx=380;fx<=580;fx+=100){
      ctx.fillStyle='#f5f1e3';ctx.fillRect(fx-24,58,48,58);ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(fx-24,58,48,58);
      ctx.fillStyle='#7fb3d5';ctx.fillRect(fx-18,64,36,34);
      ctx.fillStyle='#f4c99b';ctx.beginPath();ctx.arc(fx,78,9,0,7);ctx.fill();
      ctx.fillStyle='#e74c3c';ctx.fillRect(fx-14,88,28,12);
    }
    ctx.fillStyle='#b03a5b';ctx.beginPath();ctx.ellipse(480,368,225,82,0,0,7);ctx.fill();
    ctx.strokeStyle='#7d2540';ctx.lineWidth=4;ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(480,368,195,66,0,0,7);ctx.stroke();
    ctx.fillStyle='#1c1c22';ctx.font='bold 20px Trebuchet MS';ctx.textAlign='center';
    ctx.fillText(MAPS.interior.label+' — side doors go to rooms!',480,30);
    }
  } else if(GAME.map==='street'){
    // grass + road + houses
    ctx.fillStyle='#9ccc65';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#616161';ctx.fillRect(0,300,W,110);
    ctx.fillStyle='#ffd23f';for(let x=10;x<W;x+=60)ctx.fillRect(x,351,30,6);
    ctx.fillStyle='#87ceeb';ctx.fillRect(0,0,W,60);
    ctx.fillStyle='#fff';ctx.font='bold 26px Trebuchet MS';ctx.textAlign='center';ctx.fillText('★ SOUTH PARK NEIGHBORHOOD ★',480,38);
    // trees + lamps
    for(const [tx,ty] of [[200,260],[390,260],[580,260],[770,260],[60,330],[910,330]]){
      ctx.fillStyle='#5d4037';ctx.fillRect(tx-4,ty,8,26);
      ctx.fillStyle='#2e7d32';ctx.beginPath();ctx.arc(tx,ty,18,0,7);ctx.fill();ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.stroke();
    }
  } else {
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,m.bg[0]);g.addColorStop(0.5,m.bg[0]);g.addColorStop(0.5,m.bg[1]);g.addColorStop(1,m.bg[1]);
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.9)';
    const cx=(T*8)%1100;
    ctx.beginPath();ctx.ellipse(960-cx,60,60,16,0,0,7);ctx.fill();
    ctx.beginPath();ctx.ellipse(960-cx+220,90,48,13,0,0,7);ctx.fill();
  }
  if(GAME.map==='yard')drawSchool();
  // props (skip school wall visual — drawn by drawSchool)
  for(const p of MAPS[GAME.map].props){
    if(GAME.map==='yard')continue; // yard props drawn separately below
    if(GAME.map==='street'){drawHouse(p);continue;}
    ctx.fillStyle=p.c;ctx.strokeStyle='#1c1c22';ctx.lineWidth=3;
    ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeRect(p.x,p.y,p.w,p.h);
    ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(p.x+3,p.y+3,p.w-6,p.h-6);
    ctx.fillStyle='#1c1c22';ctx.font='bold 12px Trebuchet MS';ctx.textAlign='center';
    const words=p.label;ctx.fillText(words,p.x+p.w/2,p.y+p.h/2+4);
    if(p.id){ctx.fillStyle=`rgba(255,210,63,${0.5+Math.sin(T*4)*0.3})`;ctx.beginPath();ctx.ellipse(p.x+p.w/2,p.y-10,16,8,0,0,7);ctx.fill();}
  }
  if(GAME.map==='yard'){
    for(const p of MAPS.yard.props){
      ctx.fillStyle=p.c;ctx.strokeStyle='#1c1c22';ctx.lineWidth=3;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle='#1c1c22';ctx.font='bold 12px Trebuchet MS';ctx.textAlign='center';ctx.fillText(p.label,p.x+p.w/2,p.y+p.h/2+4);
    }
  }
  // houses labels already in drawHouse; doors glow
  ctx.textAlign='center';
  for(const d of MAPS[GAME.map].doors){
    ctx.fillStyle=`rgba(255,210,63,${0.55+Math.sin(T*5)*0.25})`;
    ctx.fillRect(d.x,d.y,d.w,d.h);
    ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(d.x,d.y,d.w,d.h);
    ctx.fillStyle='#1c1c22';ctx.font='bold 12px Trebuchet MS';
    ctx.fillText(d.label,d.x+d.w/2,d.y-8);
  }
}
function drawSchool(){
  // footprint must stay x240 y40 w480 h112 (collision) — much richer detail inside it
  const x=240,y=40,w=480,h=112;
  // sidewalk + steps in front
  ctx.fillStyle='#bdbdbd';ctx.fillRect(x-20,y+h,w+40,16);
  ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(x-20,y+h,w+40,16);
  ctx.fillStyle='#9e9e9e';ctx.fillRect(448,y+h,64,16);ctx.strokeRect(448,y+h,64,16);
  // stone foundation
  ctx.fillStyle='#8d6e63';ctx.fillRect(x,y+h-14,w,14);
  ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;
  for(let fx=x+10;fx<x+w;fx+=34){ctx.beginPath();ctx.moveTo(fx,y+h-14);ctx.lineTo(fx,y+h);ctx.stroke();}
  // brick body, running bond
  ctx.fillStyle='#c06a4d';ctx.fillRect(x,y,w,h-14);
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;
  let row=0;
  for(let by=y+10;by<y+h-14;by+=13,row++){
    ctx.beginPath();ctx.moveTo(x,by);ctx.lineTo(x+w,by);ctx.stroke();
    for(let bx=x+((row%2)?14:0);bx<x+w;bx+=28){ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx,by+13);ctx.stroke();}
  }
  ctx.strokeStyle='#1c1c22';ctx.lineWidth=4;ctx.strokeRect(x,y,w,h-14);
  // roof: dark cap + shingle lines + snow rim
  ctx.fillStyle='#6d3a2c';ctx.fillRect(x-14,y-18,w+28,22);ctx.strokeStyle='#1c1c22';ctx.lineWidth=3;ctx.strokeRect(x-14,y-18,w+28,22);
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;
  for(let sx=x-8;sx<x+w+8;sx+=18){ctx.beginPath();ctx.moveTo(sx,y-18);ctx.lineTo(sx,y+4);ctx.stroke();}
  ctx.fillStyle='#fff';ctx.fillRect(x-14,y+2,w+28,5);
  // sign board on posts
  ctx.fillStyle='#4e342e';ctx.fillRect(x+56,y+10,8,34);ctx.fillRect(x+w-64,y+10,8,34);
  ctx.fillStyle='#f5f1e3';ctx.fillRect(x+40,y+2,w-80,32);ctx.strokeStyle='#1c1c22';ctx.lineWidth=3;ctx.strokeRect(x+40,y+2,w-80,32);
  ctx.fillStyle='#b3392f';ctx.font='bold 19px Trebuchet MS';ctx.textAlign='center';ctx.fillText('★ SOUTH PARK ELEMENTARY ★',480,y+25);
  // windows: white trim, sky glass, mullion cross, curtain on one
  let wi=0;
  for(let wx=x+26;wx<x+w-70;wx+=86,wi++){
    ctx.fillStyle='#f5f1e3';ctx.fillRect(wx-4,y+56,64,46);ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(wx-4,y+56,64,46);
    const wg=ctx.createLinearGradient(0,y+58,0,y+100);wg.addColorStop(0,'#bfe3ff');wg.addColorStop(1,'#7fb3d5');
    ctx.fillStyle=wg;ctx.fillRect(wx,y+58,56,38);
    if(wi===1){ctx.fillStyle='rgba(176,58,86,.55)';ctx.fillRect(wx,y+58,56,38);} // curtain
    ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(wx,y+58,56,38);
    ctx.beginPath();ctx.moveTo(wx+28,y+58);ctx.lineTo(wx+28,y+96);ctx.moveTo(wx,y+77);ctx.lineTo(wx+56,y+77);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wx+8,y+90);ctx.lineTo(wx+22,y+64);ctx.stroke();
  }
  // double doors with glass panes + handles + ENTER mat
  ctx.fillStyle='#4e342e';ctx.fillRect(452,y+66,56,72);ctx.strokeStyle='#1c1c22';ctx.lineWidth=3;ctx.strokeRect(452,y+66,56,72);
  ctx.fillStyle='#bfe3ff';ctx.fillRect(457,y+71,20,30);ctx.fillRect(483,y+71,20,30);
  ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(457,y+71,20,30);ctx.strokeRect(483,y+71,20,30);
  ctx.beginPath();ctx.moveTo(480,y+66);ctx.lineTo(480,y+138);ctx.stroke();
  ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(476,y+112,3,0,7);ctx.fill();ctx.beginPath();ctx.arc(484,y+112,3,0,7);ctx.fill();
  ctx.fillStyle='#b3392f';ctx.fillRect(446,y+140,68,12);ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(446,y+140,68,12);
  ctx.fillStyle='#fff';ctx.font='bold 10px Trebuchet MS';ctx.fillText('ENTER →',480,149);
  // bushes at base
  for(const bx of [x+8,x+44,x+w-52,x+w-16]){
    ctx.fillStyle='#2e7d32';ctx.beginPath();ctx.arc(bx,y+h-16,13,0,7);ctx.fill();ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#43a047';ctx.beginPath();ctx.arc(bx-4,y+h-20,5,0,7);ctx.fill();
  }
  // flag pole with ball + waving striped flag
  ctx.fillStyle='#78909c';ctx.fillRect(736,56,7,168);ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(736,56,7,168);
  ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(739,52,6,0,7);ctx.fill();ctx.strokeStyle='#1c1c22';ctx.stroke();
  const wv=Math.sin(T*3)*6;
  ctx.fillStyle='#3f51b5';ctx.beginPath();ctx.moveTo(743,58);ctx.lineTo(795,70+wv);ctx.lineTo(743,86);ctx.fill();ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.stroke();
  ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(743,66);ctx.quadraticCurveTo(769,68+wv,793,70+wv);ctx.stroke();
  // school bus: body, window row, door, wheels, stop sign, light
  ctx.fillStyle='#f7dc6f';ctx.fillRect(52,296,128,48);ctx.strokeStyle='#1c1c22';ctx.lineWidth=3;ctx.strokeRect(52,296,128,48);
  ctx.fillStyle='#bfe3ff';
  for(let bx=58;bx<150;bx+=24){ctx.fillRect(bx,302,18,16);ctx.strokeStyle='#1c1c22';ctx.lineWidth=1.5;ctx.strokeRect(bx,302,18,16);}
  ctx.fillStyle='#4e342e';ctx.fillRect(154,302,22,42);ctx.strokeStyle='#1c1c22';ctx.strokeRect(154,302,22,42);
  ctx.fillStyle='#1c1c22';ctx.beginPath();ctx.arc(84,346,11,0,7);ctx.fill();ctx.beginPath();ctx.arc(150,346,11,0,7);ctx.fill();
  ctx.fillStyle='#616161';ctx.beginPath();ctx.arc(84,346,4,0,7);ctx.fill();ctx.beginPath();ctx.arc(150,346,4,0,7);ctx.fill();
  ctx.fillStyle='#e53935';ctx.beginPath();ctx.arc(52,320,5,0,7);ctx.fill();
  ctx.fillStyle='#1c1c22';ctx.font='bold 12px Trebuchet MS';ctx.textAlign='center';ctx.fillText('SCHOOL BUS',112,338);
}
function drawHouse(p){
  const style=p.style||'house';
  const isYours=style==='yours';
  const cx=p.x+p.w/2;
  const trim=isYours?'#ffd23f':'#f5f1e3';
  // lawn shadow + path to door
  ctx.fillStyle='rgba(0,0,0,.12)';ctx.beginPath();ctx.ellipse(cx,p.y+p.h+6,p.w/2+8,8,0,0,7);ctx.fill();
  ctx.fillStyle='#bdbdbd';
  if(p.y>300)ctx.fillRect(cx-14,p.y-46,28,46); // path up to the road
  else ctx.fillRect(cx-14,p.y+p.h,28,44); // path down to the sidewalk
  // siding with horizontal lines
  ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.w,p.h);
  ctx.strokeStyle='rgba(0,0,0,.12)';ctx.lineWidth=1;
  for(let sy=p.y+10;sy<p.y+p.h;sy+=12){ctx.beginPath();ctx.moveTo(p.x,sy);ctx.lineTo(p.x+p.w,sy);ctx.stroke();}
  ctx.strokeStyle=isYours?'#ffd23f':'#1c1c22';ctx.lineWidth=isYours?5:3;ctx.strokeRect(p.x,p.y,p.w,p.h);
  if(style==='mansion'){
    // columns + balcony rail
    for(const colx of [p.x+16,p.x+p.w-24]){
      ctx.fillStyle='#f5f1e3';ctx.fillRect(colx,p.y+18,8,p.h-18);ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(colx,p.y+18,8,p.h-18);
    }
    ctx.fillStyle='#8d6e63';ctx.fillRect(p.x+8,p.y+p.h-22,p.w-16,10);
  }
  // roof: shingle lines + chimney with animated smoke
  const roof=p.roof||'#795548';
  ctx.fillStyle=roof;
  ctx.beginPath();ctx.moveTo(p.x-10,p.y);ctx.lineTo(cx,p.y-32);ctx.lineTo(p.x+p.w+10,p.y);ctx.fill();
  ctx.strokeStyle='#1c1c22';ctx.lineWidth=2.5;ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;
  for(let ry=p.y-26;ry<p.y-4;ry+=7){ctx.beginPath();ctx.moveTo(cx-(p.y-ry)*2.4,ry);ctx.lineTo(cx+(p.y-ry)*2.4,ry);ctx.stroke();}
  const chx=p.x+p.w-38;
  ctx.fillStyle='#8d6e63';ctx.fillRect(chx,p.y-52,18,30);ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(chx,p.y-52,18,30);
  for(let s=0;s<3;s++){
    const ph=((T*22+s*22)%66);
    ctx.globalAlpha=0.55-ph/140;ctx.fillStyle='#eee';
    ctx.beginPath();ctx.arc(chx+9+Math.sin(T*2+s)*5,p.y-58-ph,7+ph/12,0,7);ctx.fill();ctx.globalAlpha=1;
  }
  if(style==='shop'){
    // striped awning + big coffee window + sign
    for(let ax=p.x+6;ax<p.x+p.w-6;ax+=20){
      ctx.fillStyle=((ax/20)|0)%2?'#fff':'#b3392f';ctx.fillRect(ax,p.y+34,20,16);
    }
    ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(p.x+6,p.y+34,p.w-12,16);
    ctx.fillStyle='#4e342e';ctx.fillRect(p.x+18,p.y-52,p.w-36,26);ctx.strokeStyle='#1c1c22';ctx.strokeRect(p.x+18,p.y-52,p.w-36,26);
    ctx.fillStyle='#ffd23f';ctx.font='bold 15px Trebuchet MS';ctx.textAlign='center';ctx.fillText('☕ TWEAK BROS',cx,p.y-33);
    ctx.fillStyle='#ffe9a8';ctx.fillRect(p.x+22,p.y+58,p.w-44,44);
    ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(p.x+22,p.y+58,p.w-44,44);
    ctx.fillStyle='#1c1c22';ctx.font='bold 13px Trebuchet MS';ctx.fillText('COFFEE!',cx,p.y+84);
  } else {
    // windows: warm lit glass (parents are home!) + cross mullions + shine
    const wins=style==='mansion'?[[p.x+30,p.y+22],[p.x+p.w-64,p.y+22]]:[[p.x+12,p.y+22],[p.x+p.w-46,p.y+22]];
    for(const [wx,wy] of wins){
      ctx.fillStyle=trim;ctx.fillRect(wx-3,wy-3,40,36);ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(wx-3,wy-3,40,36);
      const glow=0.75+Math.sin(T*2+wx)*0.1;
      ctx.fillStyle=`rgba(255,213,128,${glow})`;ctx.fillRect(wx,wy,34,30);
      ctx.fillStyle='rgba(255,160,60,.5)';ctx.fillRect(wx,wy+20,34,10);
      ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;ctx.strokeRect(wx,wy,34,30);
      ctx.beginPath();ctx.moveTo(wx+17,wy);ctx.lineTo(wx+17,wy+30);ctx.moveTo(wx,wy+15);ctx.lineTo(wx+34,wy+15);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wx+6,wy+24);ctx.lineTo(wx+13,wy+8);ctx.stroke();
    }
  }
  // door with pane + knob + steps + mat
  const dw=style==='mansion'?40:28, dx=cx-dw/2, dy=p.y+p.h-(style==='mansion'?50:44);
  ctx.fillStyle=style==='mansion'?'#5d4037':'#4e342e';ctx.fillRect(dx,dy,dw,p.y+p.h-dy);
  ctx.strokeStyle='#1c1c22';ctx.lineWidth=2.5;ctx.strokeRect(dx,dy,dw,p.y+p.h-dy);
  ctx.fillStyle='#bfe3ff';ctx.fillRect(dx+5,dy+6,dw-10,16);ctx.strokeStyle='#1c1c22';ctx.lineWidth=1.5;ctx.strokeRect(dx+5,dy+6,dw-10,16);
  ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(dx+dw-8,dy+30,3,0,7);ctx.fill();
  if(style==='mansion'){ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(dx+8,dy+30,3,0,7);ctx.fill();}
  ctx.fillStyle='#b3392f';ctx.fillRect(cx-20,p.y+p.h+2,40,8);
  // mailbox + bushes
  ctx.fillStyle='#78909c';ctx.fillRect(p.x-16,p.y+p.h-30,4,30);
  ctx.fillStyle='#e53935';ctx.fillRect(p.x-26,p.y+p.h-42,20,12);ctx.strokeStyle='#1c1c22';ctx.lineWidth=1.5;ctx.strokeRect(p.x-26,p.y+p.h-42,20,12);
  for(const bx of [p.x+4,p.x+p.w-4]){
    ctx.fillStyle='#2e7d32';ctx.beginPath();ctx.arc(bx,p.y+p.h-6,10,0,7);ctx.fill();ctx.strokeStyle='#1c1c22';ctx.lineWidth=1.5;ctx.stroke();
  }
  if(isYours){ctx.fillStyle='#ffd23f';ctx.font='bold 16px serif';ctx.textAlign='center';ctx.fillText('★',p.x+14,p.y+16);}
  // name plate + knock prompt glow
  ctx.fillStyle='#4e342e';ctx.fillRect(cx-62,p.y+p.h+12,124,20);ctx.strokeStyle=trim;ctx.lineWidth=2;ctx.strokeRect(cx-62,p.y+p.h+12,124,20);
  ctx.fillStyle='#fff';ctx.font='bold 12px Trebuchet MS';ctx.textAlign='center';ctx.fillText(p.label,cx,p.y+p.h+26);
  if(p.id){ctx.fillStyle=`rgba(255,210,63,${0.5+Math.sin(T*4)*0.3})`;ctx.beginPath();ctx.ellipse(cx,p.y-60,18,9,0,0,7);ctx.fill();
    ctx.fillStyle='#1c1c22';ctx.font='bold 11px Trebuchet MS';ctx.fillText('E = knock!',cx,p.y-56);}
}
function draw(){
  ctx.clearRect(0,0,W,H);
  drawGround(MAPS[GAME.map]);
  const ents=[...npcs.map(n=>({y:n.y,f:()=>drawNPC(n)}))];
  if(GAME.player)ents.push({y:player.y,f:drawPlayer});
  ents.sort((a,b)=>a.y-b.y).forEach(e=>e.f());
  // holding link
  if(GAME.holding){
    const h=npcs.find(n=>n.kind==='canon'&&n.id===GAME.holding);
    if(h){ctx.strokeStyle='#e84393';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(player.x,player.y-30);ctx.lineTo(h.x,h.y-30);ctx.stroke();
      ctx.font='18px serif';ctx.fillStyle='#e84393';ctx.textAlign='center';ctx.fillText('♥',(player.x+h.x)/2,player.y-70+Math.sin(T*5)*4);}
  }
  // hearts particles
  for(const h of hearts){ctx.globalAlpha=clamp(h.life,0,1);ctx.font='16px serif';ctx.fillStyle='#ff5b8d';ctx.textAlign='center';ctx.fillText('♥',h.x,h.y);ctx.globalAlpha=1;}
  if(GAME.started&&!GAME.inDialogue){
    const t=nearestInteractable();
    if(t&&(t.d!==undefined||t.prop||t.door)){
      const bx=t.door?t.door.x+t.door.w/2:(t.prop?t.x:(t.o?t.o.x:t.x));
      const by=(t.door?t.door.y+t.door.h:(t.prop?t.y:(t.o?t.o.y:t.y)))-110;
      ctx.fillStyle='#1c1c22';ctx.beginPath();ctx.arc(bx,by,14,0,7);ctx.fill();
      ctx.fillStyle='#ffd23f';ctx.font='bold 15px Trebuchet MS';ctx.textAlign='center';ctx.fillText(t.door?'E':(t.prop?'E':'E'),bx,by+5);
    }
  }
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(10,H-30,330,20);
  ctx.fillStyle='#fff';ctx.font='12px Trebuchet MS';ctx.textAlign='left';
  ctx.fillText(`${MAPS[GAME.map].label} · ${PHASES[GAME.phase]}${GAME.hasTray?' · 🍱':''}${GAME.holding?' · ♥holding':''}${GAME.trouble.detentions?` · ⛔x${GAME.trouble.detentions}`:''}${GAME.trouble.grounded?' · GROUNDED (go home!)':''}`,14,H-16);
}
function drawNPC(n){
  const spec=npcSpec(n);
  const talking=GAME.inDialogue&&GAME.talkTarget===n;
  const blink=n.blinkT<0.15;
  const held=GAME.holding===n.id;
  ctx.fillStyle=held?'#e84393':'rgba(0,0,0,.55)';ctx.font='bold 12px Trebuchet MS';ctx.textAlign='center';
  ctx.fillText(npcDisplayName(n)+(n.kind==='canon'&&canonById(n.id).partner?' ♥':''),n.x,n.y-112);
  if(n.follower){ctx.font='14px serif';ctx.fillStyle='#2e7d32';ctx.fillText('🤝',n.x+30,n.y-104);}
  drawPaper(ctx,{...spec,skinColor:spec.skinColor||(spec.skin?skinById(spec.skin):undefined)},n.x,n.y,{scale:1,facing:n.face,walk:0,t:T,talking,twitch:spec.twitch,blink,holding:held});
  if(n.say){ctx.fillStyle='#fff';ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;const wctx=ctx.measureText(n.say).width+16;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(n.x-wctx/2,n.y-146,wctx,22,8);else ctx.rect(n.x-wctx/2,n.y-146,wctx,22);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.font='bold 12px Trebuchet MS';ctx.fillText(n.say,n.x,n.y-130);}
  if((n.id==='craig'||n.id==='tweek')&&GAME.map==='play'){
    const other=npcs.find(o=>o.id===(n.id==='craig'?'tweek':'craig'));
    if(other&&Math.hypot(other.x-n.x,other.y-n.y)<120){ctx.font='16px serif';ctx.fillStyle='#e84393';ctx.fillText('♥',(n.x+other.x)/2,(n.y+other.y)/2-104+Math.sin(T*4)*4);}
  }
}
function drawPlayer(){
  const P=GAME.player;if(!P)return;
  const blink=(T%4)<0.12;
  const talking=GAME.inDialogue&&DLG.stage==='awaitChoice';
  drawPaper(ctx,{...P,skinColor:P.skinColor||skinById(P.skin)},player.x,player.y,{scale:1.05,facing:player.face,walk:player.moving?player.walk:0,t:T,talking,twitch:P.twitch,blink,holding:!!GAME.holding});
  ctx.fillStyle='#ffd23f';ctx.strokeStyle='#1c1c22';ctx.lineWidth=2;
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(player.x-75,player.y-144,150,20,8);else ctx.rect(player.x-75,player.y-144,150,20);ctx.fill();ctx.stroke();
  ctx.fillStyle='#1c1c22';ctx.font='bold 12px Trebuchet MS';ctx.textAlign='center';
  ctx.fillText(playerLabel(),player.x,player.y-130);
}

/* ---------- roster UI ---------- */
function thumb(canvasEl,spec){
  const g=canvasEl.getContext('2d');g.clearRect(0,0,canvasEl.width,canvasEl.height);
  g.fillStyle='#bfe3ff';g.fillRect(0,0,canvasEl.width,canvasEl.height);
  drawPaper(g,{...spec,skinColor:spec.skin?skinById(spec.skin):spec.skinColor},canvasEl.width/2,canvasEl.height-20,{scale:1.0,t:1});
}
function buildRoster(){
  const box=$('roster');box.innerHTML='';
  for(const c of CANON){
    const d=document.createElement('div');d.className='kid';
    d.innerHTML=`<canvas width="150" height="110"></canvas><b>${c.name}</b><small>${c.desc}</small>`;
    thumb(d.querySelector('canvas'),c);
    d.onclick=()=>startAsCanon(c.id);
    box.appendChild(d);
  }
}
function startAsCanon(id){
  const c=canonById(id);
  GAME.player={id:c.id,name:c.name,skin:c.skin,skinColor:skinById(c.skin),hair:c.hair,hairc:c.hairc,hat:c.hat,hatStyle:c.hatStyle,pom:c.pom,jacket:c.jacket,pants:c.pants,twitch:c.twitch,fat:c.fat,lunch:c.lunch};
  GAME.isCustom=false;
  beginGame();
}
function beginGame(){
  $('select').classList.add('hidden');$('creator').classList.add('hidden');$('title').classList.add('hidden');
  GAME.started=true;GAME.phase=0;GAME.hasTray=false;GAME.ate=false;GAME.friends=new Set();GAME.holding=null;GAME.followers=[];GAME.talkCounts={};GAME.trouble={detentions:0,grounded:false,reason:''};GAME.room=null;GAME.enteredHouse=null;
  player.x=480;player.y=400;player.vx=player.vy=0;
  goMap('yard',480,400);setPhase(0);
  $('hud-time').textContent=PHASES[0];$('hud-where').textContent='Schoolyard';
  $('hud-who').textContent=playerLabel();
  const dating=!GAME.isCustom&&DATING[GAME.player.id]?` You're dating ${DATING[GAME.player.id]} — find them, press H to hold hands!`:'';
  toast(`You are ${playerLabel()}! E=talk/doors, H=hold hands, J=hug, M=map, T=unstick.${dating}`);
}

/* ---------- creator ---------- */
function skinOptions(){
  const s=$('c-skin');s.innerHTML='';
  const race=$('c-race').value;
  const defaults={White:'light',Black:'dark',Asian:'light',Latino:'tan',Native:'tan',Mixed:'brown'};
  for(const k of SKINS){const o=document.createElement('option');o.value=k.id;o.textContent=k.label;s.appendChild(o);}
  s.value=defaults[race]||'light';
}
function creatorSpec(){
  let hair=$('c-hair').value;
  return {name:$('c-name').value||'New Kid',gender:$('c-gender').value,race:$('c-race').value,
    skin:$('c-skin').value,skinColor:skinById($('c-skin').value),
    hairStyle:hair,hair:hair,hairc:$('c-hairc').value,jacket:$('c-jacket').value,pants:$('c-pants').value,
    hat:$('c-hat').value,hatStyle:'none',twitch:$('c-twitch').value,
    parents:$('c-parents').value,mom:$('c-mom').value||'Mom',dad:$('c-dad').value||'Dad',
    lunch:'new-kid surprise + chocolate milk'};
}
function refreshPreview(){
  const p=creatorSpec();
  previewC.clearRect(0,0,240,300);previewC.fillStyle='#bfe3ff';previewC.fillRect(0,0,240,300);
  drawPaper(previewC,p,120,235,{scale:1.9,t:performance.now()/1000,twitch:p.twitch});
  $('preview-name').textContent=`${p.name} · ${p.gender} · ${p.race}`;
  $('preview-desc').textContent=`${p.hairStyle==='afro'?'Short afro ✓':p.hairStyle} · Parents: ${p.parents} · Twitch: ${p.twitch}`;
}
['c-name','c-gender','c-race','c-skin','c-hair','c-hairc','c-jacket','c-pants','c-hat','c-parents','c-twitch','c-mom','c-dad'].forEach(id=>{
  $(id).addEventListener('input',()=>{if(id==='c-race')skinOptions();refreshPreview();});
});

/* ---------- wire buttons ---------- */
$('btn-start').onclick=()=>{$('title').classList.add('hidden');$('select').classList.remove('hidden');buildRoster();};
$('btn-how').onclick=()=>$('how').classList.toggle('hidden');
$('btn-back-title').onclick=()=>{$('select').classList.add('hidden');$('title').classList.remove('hidden');};
$('btn-custom').onclick=()=>{$('select').classList.add('hidden');$('creator').classList.remove('hidden');skinOptions();refreshPreview();};
$('btn-back-select').onclick=()=>{$('creator').classList.add('hidden');$('select').classList.remove('hidden');};
$('btn-play-custom').onclick=()=>{
  const p=creatorSpec();p.id='custom';
  GAME.player=p;GAME.isCustom=true;beginGame();
};

/* ---------- boot ---------- */
skinOptions();refreshPreview();buildRoster();
$('hud-who').textContent='—';$('hud-where').textContent='Schoolyard';$('objective').textContent='Press ▶ Start!';
spawnMap('yard');
requestAnimationFrame(loop);
