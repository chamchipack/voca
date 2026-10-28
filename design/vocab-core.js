(function(){
const RAW=[
["食べる","たべる","먹다","N5","朝ごはんを食べる。","아침밥을 먹다."],
["水","みず","물","N5","水を一杯ください。","물 한 잔 주세요."],
["友達","ともだち","친구","N5","友達と映画を見た。","친구와 영화를 봤다."],
["新しい","あたらしい","새롭다","N5","新しい靴を買った。","새 신발을 샀다."],
["駅","えき","역","N5","駅まで歩いて五分です。","역까지 걸어서 5분입니다."],
["雨","あめ","비","N5","明日は雨が降るそうだ。","내일은 비가 온대."],
["静か","しずか","조용함","N5","図書館はとても静かだ。","도서관은 매우 조용하다."],
["旅行","りょこう","여행","N4","来月、京都へ旅行します。","다음 달 교토로 여행합니다."],
["準備","じゅんび","준비","N4","出発の準備ができた。","출발 준비가 되었다."],
["届ける","とどける","전하다, 배달하다","N4","荷物を家まで届ける。","짐을 집까지 배달하다."],
["景色","けしき","경치","N4","山の上からの景色がきれいだ。","산 위에서 본 경치가 아름답다."],
["急ぐ","いそぐ","서두르다","N4","時間がないので急ごう。","시간이 없으니 서두르자."],
["珍しい","めずらしい","드물다","N4","この時期に雪は珍しい。","이 시기에 눈은 드물다."],
["季節","きせつ","계절","N4","一番好きな季節は秋です。","가장 좋아하는 계절은 가을입니다."],
["木漏れ日","こもれび","나뭇잎 사이로 비치는 햇살","N3","木漏れ日の中を散歩した。","나뭇잎 사이 햇살 속을 산책했다."],
["懐かしい","なつかしい","그립다","N3","この歌を聞くと懐かしい。","이 노래를 들으면 그립다."],
["経験","けいけん","경험","N3","海外で働いた経験がある。","해외에서 일한 경험이 있다."],
["諦める","あきらめる","포기하다","N3","最後まで諦めない。","끝까지 포기하지 않는다."],
["穏やか","おだやか","온화함","N3","今日は穏やかな天気だ。","오늘은 온화한 날씨다."],
["工夫","くふう","궁리, 고안","N3","料理に少し工夫をした。","요리에 조금 궁리를 더했다."],
["深める","ふかめる","깊게 하다","N3","理解を深める。","이해를 깊게 하다."],
["支度","したく","채비","N3","夕飯の支度をする。","저녁 식사 채비를 하다."],
["把握","はあく","파악","N2","状況を正確に把握する。","상황을 정확히 파악하다."],
["曖昧","あいまい","애매함","N2","曖昧な返事をした。","애매한 대답을 했다."],
["貴重","きちょう","귀중함","N2","貴重な経験になった。","귀중한 경험이 되었다."],
["促す","うながす","재촉하다, 촉구하다","N2","注意を促す。","주의를 촉구하다."],
["一期一会","いちごいちえ","일생에 한 번뿐인 만남","N1","旅先の出会いは一期一会だ。","여행지의 만남은 일생에 한 번뿐이다."],
["潔い","いさぎよい","미련 없이 깨끗하다","N1","潔く負けを認めた。","깨끗이 패배를 인정했다."],
["儚い","はかない","덧없다","N1","桜の命は儚い。","벚꽃의 생명은 덧없다."],
["拘る","こだわる","고집하다, 신경 쓰다","N1","素材に拘って作る。","재료에 신경 써서 만든다."]
];
const BASE=RAW.map((a,i)=>({id:'b'+i,kanji:a[0],kana:a[1],ko:a[2],lvl:a[3],ex:a[4],exKo:a[5]}));
const KEY='jp-vocab-v2',DAY=864e5,IV=[0,1,3,7,16,35],LV=['N5','N4','N3','N2','N1'],NEW_PER_DAY=5;
const dk=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
function seed(){const now=Date.now(),prog={},log={};
  [3,4,2,5,4,1,3,2,1,0,2,1,3,1,2,4,1,0,3,2].forEach((b,i)=>{prog['b'+i]={box:b,due:i%3===0?now-DAY:now+Math.max(1,IV[b])*DAY*.6};});
  [12,9,14,7,16,11].forEach((n,i)=>{log[dk(now-(6-i)*DAY)]=n;});
  return {custom:[],edits:{},deleted:[],prog,favs:['b2','b14','b26'],log,newDay:{d:'',n:0}};}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.prog)return s;}catch(e){}return seed();}
const PERSIST=['custom','edits','deleted','prog','favs','log','newDay'];

function attach(c){
  c.setState({...load(),tab:'home',q:'',lvl:'all',flipped:false,detail:null,editor:null,draft:null});
  const S=()=>c.state;
  const save=(p,cb)=>c.setState(p,()=>{try{const o={};PERSIST.forEach(k=>o[k]=c.state[k]);localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}cb&&cb();});
  const words=s=>[...BASE.filter(w=>!s.deleted.includes(w.id)).map(w=>({...w,...(s.edits[w.id]||{})})),...s.custom];
  const newToday=s=>s.newDay&&s.newDay.d===dk(Date.now())?s.newDay.n:0;
  const queue=s=>{const now=Date.now(),ws=words(s);
    const due=ws.filter(w=>s.prog[w.id]&&s.prog[w.id].due<=now).sort((a,b)=>s.prog[a.id].due-s.prog[b.id].due);
    const fresh=ws.filter(w=>!s.prog[w.id]).slice(0,Math.max(0,NEW_PER_DAY-newToday(s)));
    return {due,fresh,all:[...due,...fresh]};};
  const speak=t=>{try{const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=.9;speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}};
  const ivs=box=>({hard:Math.max(1,Math.round(IV[Math.max(1,box)]/2)),good:IV[Math.min(5,box+1)]});
  const grade=g=>{const s=S(),w=queue(s).all[0];if(!w)return;const now=Date.now(),old=s.prog[w.id],p=old||{box:0};
    const iv=ivs(p.box);let np;
    if(g==='again')np={box:0,due:now};else if(g==='hard')np={box:Math.max(1,p.box),due:now+iv.hard*DAY};else np={box:Math.min(5,p.box+1),due:now+iv.good*DAY};
    const t=dk(now),log={...s.log,[t]:(s.log[t]||0)+1},newDay=old?s.newDay:{d:t,n:newToday(s)+1};
    c.setState({flipped:false});setTimeout(()=>save({prog:{...s.prog,[w.id]:np},log,newDay}),s.flipped?200:0);};
  const toggleFav=id=>{const f=S().favs;save({favs:f.includes(id)?f.filter(x=>x!==id):[...f,id]});};
  const openEditor=w=>c.setState({editor:w?w.id:'new',draft:w?{kanji:w.kanji,kana:w.kana,ko:w.ko,lvl:w.lvl,ex:w.ex,exKo:w.exKo}:{kanji:'',kana:'',ko:'',lvl:'N5',ex:'',exKo:''}});
  const saveDraft=()=>{const s=S(),d={...s.draft};if(!d.kana.trim()||!d.ko.trim())return;if(!d.kanji.trim())d.kanji=d.kana;
    if(s.editor==='new'){const id='c'+Date.now();save({custom:[...s.custom,{id,...d}],editor:null,draft:null,detail:id});}
    else if(s.editor[0]==='c')save({custom:s.custom.map(w=>w.id===s.editor?{...w,...d}:w),editor:null,draft:null});
    else save({edits:{...s.edits,[s.editor]:d},editor:null,draft:null});};
  const del=id=>{const s=S();const p={...s.prog};delete p[id];
    save(id[0]==='c'?{custom:s.custom.filter(w=>w.id!==id),prog:p,favs:s.favs.filter(x=>x!==id),detail:null}:{deleted:[...s.deleted,id],prog:p,favs:s.favs.filter(x=>x!==id),detail:null});};
  const onKey=e=>{const s=S();if(s.tab!=='review'||s.editor||/INPUT|TEXTAREA/.test(e.target.tagName))return;
    if(e.code==='Space'){e.preventDefault();c.setState({flipped:!s.flipped});}
    else if(s.flipped&&e.key==='1')grade('again');else if(s.flipped&&e.key==='2')grade('hard');else if(s.flipped&&(e.key==='3'||e.key==='Enter'))grade('good');};
  if(c.props.keys!==false){window.addEventListener('keydown',onKey);c._off=()=>window.removeEventListener('keydown',onKey);}

  function vals(T){
    const s=S();if(!s.prog)return {};
    const now=Date.now(),ws=words(s),Q=queue(s),fav=id=>s.favs.includes(id),box=id=>s.prog[id]?s.prog[id].box:0;
    const furi=w=>w.kanji!==w.kana?w.kana:'';
    const deco=w=>({...w,furi:furi(w),star:fav(w.id)?'★':'☆',starColor:fav(w.id)?T.star:T.starOff,dots:'●'.repeat(box(w.id))+'○'.repeat(5-box(w.id)),box:box(w.id)});
    const go=tab=>()=>c.setState({tab,detail:null,flipped:false});
    const d=new Date(),wod=deco(ws[(d.getFullYear()*372+d.getMonth()*31+d.getDate())%ws.length]||BASE[0]);
    const ql=s.q.trim().toLowerCase();
    const list=ws.filter(w=>(s.lvl==='all'||(s.lvl==='fav'?fav(w.id):w.lvl===s.lvl))&&(!ql||[w.kanji,w.kana,w.ko].some(x=>x.toLowerCase().includes(ql))));
    const learned=ws.filter(w=>box(w.id)>=1).length,mastered=ws.filter(w=>box(w.id)>=4).length;
    let streak=0;for(let i=s.log[dk(now)]?0:1;i<400;i++){if(s.log[dk(now-i*DAY)])streak++;else break;}
    const days=[...Array(7)].map((_,i)=>now-(6-i)*DAY),counts=days.map(t=>s.log[dk(t)]||0),mx=Math.max(10,...counts);
    const card=Q.all[0]?deco(Q.all[0]):null,cb=card?box(card.id):0,iv=ivs(cb);
    const upcoming=Object.values(s.prog).filter(p=>p.due>now).map(p=>p.due).sort((a,b)=>a-b)[0];
    const dw=s.detail?ws.find(w=>w.id===s.detail):null,dwd=dw?deco(dw):deco(BASE[0]),dp=dw&&s.prog[dw.id];
    const dr=s.draft||{kanji:'',kana:'',ko:'',lvl:'N5',ex:'',exKo:''},setF=k=>e=>c.setState({draft:{...S().draft,[k]:e.target.value}});
    const tabs=[['home','家','홈'],['list','辞','단어장'],['review','札','복습'],['stats','計','통계']];
    const reviewsToday=s.log[dk(now)]||0;
    return {
      isHome:s.tab==='home',isList:s.tab==='list',isReview:s.tab==='review',isStats:s.tab==='stats',
      goHome:go('home'),goList:go('list'),goReview:go('review'),goStats:go('stats'),
      nav:tabs.map(([k,g,l])=>({key:k,glyph:g,label:l,onClick:go(k),bg:s.tab===k?T.navOnBg:T.navOffBg,fg:s.tab===k?T.navOnFg:T.navOffFg,line:s.tab===k?T.navOnFg:'transparent'})),
      today:d.toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'}),
      wod,wodSpeak:()=>speak(wod.kana),wodFav:()=>toggleFav(wod.id),wodOpen:()=>c.setState({detail:wod.id}),
      dueCount:Q.due.length,newCount:Q.fresh.length,queueCount:Q.all.length,hasQueue:Q.all.length>0,noQueue:Q.all.length===0,
      streak,totalWords:ws.length,learnedCount:learned,masteredCount:mastered,reviewsToday,
      masteredPct:Math.round(mastered/Math.max(1,ws.length)*100)+'%',learnedPct:Math.round(learned/Math.max(1,ws.length)*100)+'%',
      weekBars:days.map((t,i)=>({label:'일월화수목금토'[new Date(t).getDay()],n:counts[i],h:Math.max(4,Math.round(counts[i]/mx*100))+'%',bg:i===6?T.barToday:counts[i]?T.bar:T.barEmpty})),
      weekTotal:counts.reduce((a,b)=>a+b,0),
      levels:LV.map(l=>{const lw=ws.filter(w=>w.lvl===l),m=lw.filter(w=>box(w.id)>=4).length,le=lw.filter(w=>box(w.id)>=1).length;
        return {lvl:l,count:lw.length,mastered:m,mPct:Math.round(m/Math.max(1,lw.length)*100)+'%',lPct:Math.round(le/Math.max(1,lw.length)*100)+'%'};}),
      showFurigana:c.props.showFurigana??true,
      q:s.q,onQuery:e=>c.setState({q:e.target.value}),
      chips:[['all','전체'],...LV.map(l=>[l,l]),['fav','★ 즐겨찾기']].map(([k,l])=>({label:l,onClick:()=>c.setState({lvl:k}),bg:s.lvl===k?T.chipOnBg:T.chipOffBg,fg:s.lvl===k?T.chipOnFg:T.chipOffFg})),
      items:list.map(w=>({...deco(w),onOpen:()=>c.setState({detail:w.id}),onFav:e=>{e.stopPropagation();toggleFav(w.id);}})),
      listCount:list.length,listEmpty:list.length===0,openAdd:()=>openEditor(null),
      card:card||deco(BASE[0]),flipped:s.flipped,notFlipped:!s.flipped,cardTransform:s.flipped?'rotateY(180deg)':'rotateY(0deg)',
      cardIsNew:card?!s.prog[card.id]:false,cardTag:card&&!s.prog[card.id]?'새 단어':'복습',
      flip:()=>c.setState({flipped:!s.flipped}),cardSpeak:e=>{e&&e.stopPropagation&&e.stopPropagation();card&&speak(card.kana);},
      gradeAgain:()=>grade('again'),gradeHard:()=>grade('hard'),gradeGood:()=>grade('good'),
      ivAgain:'지금 다시',ivHard:iv.hard+'일 후',ivGood:iv.good+'일 후',
      remainingLabel:Q.all.length+'개 남음',reviewPct:Math.round(reviewsToday/Math.max(1,reviewsToday+Q.all.length)*100)+'%',
      nextDueLabel:upcoming?Math.max(1,Math.ceil((upcoming-now)/DAY))+'일 후에 다음 복습이 있어요':'새 단어를 추가해 보세요',
      detailOpen:!!dw,dw:dwd,closeDetail:()=>c.setState({detail:null}),stop:e=>e.stopPropagation(),
      dwSpeak:()=>speak(dwd.kana),dwFav:()=>toggleFav(dwd.id),dwEdit:()=>openEditor(dw),dwDelete:()=>del(dwd.id),
      dwNext:dp?(dp.due<=now?'오늘 복습할 차례':Math.ceil((dp.due-now)/DAY)+'일 후 복습'):'아직 학습 전',dwBoxLabel:'숙련도 '+dwd.box+'/5',
      editorOpen:!!s.editor,editorTitle:s.editor==='new'?'단어 추가':'단어 편집',draft:dr,
      setKanji:setF('kanji'),setKana:setF('kana'),setKo:setF('ko'),setEx:setF('ex'),setExKo:setF('exKo'),
      lvlChips:LV.map(l=>({label:l,onClick:()=>c.setState({draft:{...S().draft,lvl:l}}),bg:dr.lvl===l?T.chipOnBg:T.chipOffBg,fg:dr.lvl===l?T.chipOnFg:T.chipOffFg})),
      canSave:!!(dr.kana.trim()&&dr.ko.trim()),saveOp:dr.kana.trim()&&dr.ko.trim()?1:.4,
      saveDraft,closeEditor:()=>c.setState({editor:null,draft:null})
    };
  }
  return {vals};
}
window.VocabCore={attach};
})();
