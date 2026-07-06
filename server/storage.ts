import type { WebSocket } from "ws";
import type { GameState, Player, QuizConfig, MCChoice, MultipleChoiceQuestion,
  EstimationQuestion, Question, EstimationResult, AvatarConfig, RankingQuestion, FlagQuestion,
  BuzzerQuestion, LogoQuestion, BuzzAttempt, BuzzResult, Achievement,
  DuelConfig, DuelMatchResult, DuelTeamId,
  ScribbleConfig, ScribbleStroke, ScribbleRoundResult } from "../shared/types.js";
import { MC_QUESTIONS, ESTIMATION_QUESTIONS, ALL_CATEGORIES } from "../shared/questions.js";
import { RANKING_QUESTIONS } from "../shared/rankings.js";
import { FLAG_QUESTIONS } from "../shared/flags.js";
import { BUZZER_QUESTIONS } from "../shared/buzzer.js";
import { LOGO_QUESTIONS } from "../shared/logos.js";
import { SCRIBBLE_WORDS } from "../shared/scribbleWords.js";

export interface Session {
  code:string; state:GameState; clients:Map<string,WebSocket>;
  mcTimer:ReturnType<typeof setTimeout>|null;
  autoTimer:ReturnType<typeof setTimeout>|null;
  rankingTimer:ReturnType<typeof setTimeout>|null;
  buzzMainTimer:ReturnType<typeof setTimeout>|null;
  buzzAnswerTimer:ReturnType<typeof setTimeout>|null;
  duelBuzzTimer:ReturnType<typeof setTimeout>|null;
  duelAnswerTimer:ReturnType<typeof setTimeout>|null;
  scribbleTimer:ReturnType<typeof setTimeout>|null;
  usedIds:Set<number>;   // Bag-Rotation: zeigt jede Frage einmal, bevor Wiederholungen erlaubt sind
  duelQuestions:MultipleChoiceQuestion[]; // aktive Frageliste für laufendes Duell
}

const sessions = new Map<string,Session>();
const DEFAULT_AVATAR:AvatarConfig = { bodyColor:"#8b5cf6", hair:1, eyes:0, mouth:0 };

function genCode():string { const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s=""; for(let i=0;i<4;i++) s+=c[Math.floor(Math.random()*c.length)]; return sessions.has(s)?genCode():s; }
function genId() { return Math.random().toString(36).slice(2,10); }

function clearAllTimers(s:Session) {
  if(s.mcTimer){clearTimeout(s.mcTimer);s.mcTimer=null;}
  if(s.autoTimer){clearTimeout(s.autoTimer);s.autoTimer=null;}
  if(s.rankingTimer){clearTimeout(s.rankingTimer);s.rankingTimer=null;}
  if(s.buzzMainTimer){clearTimeout(s.buzzMainTimer);s.buzzMainTimer=null;}
  if(s.buzzAnswerTimer){clearTimeout(s.buzzAnswerTimer);s.buzzAnswerTimer=null;}
  if(s.duelBuzzTimer){clearTimeout(s.duelBuzzTimer);s.duelBuzzTimer=null;}
  if(s.duelAnswerTimer){clearTimeout(s.duelAnswerTimer);s.duelAnswerTimer=null;}
  if(s.scribbleTimer){clearTimeout(s.scribbleTimer);s.scribbleTimer=null;}
}

function shuffle<T>(a:T[]):T[] { const r=[...a]; for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];} return r; }
function normalize(s:string):string { return s.toLowerCase().trim().replace(/[äöü]/g,m=>({ä:"ae",ö:"oe",ü:"ue"}[m]||m)).replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," "); }
function matchesAnswer(input:string,answer:string,aliases:string[]=[]):boolean { const n=normalize(input); return normalize(answer)===n||aliases.some(a=>normalize(a)===n); }

// ── Punkte ──────────────────────────────────────────────────────────
function blitzPts(e:number,t:number){return Math.max(50,Math.round(200*(1-Math.min(1,e/t)*0.75)));}
function streakBonus(n:number){return n>=4?100:n===3?50:n===2?20:0;}
// Punkte richten sich nach der TATSÄCHLICHEN Nähe zum besten Tipp, nicht nur
// nach der Rangposition. So bekommen mehrere fast gleich gute Tipps auch
// fast gleich viele Punkte – vorher konnte ein winziger Abstand zwischen
// zwei super nahen Tipps einen riesigen Punkteunterschied verursachen.
function calcEstimation(ans:Record<string,number>,correct:number):Record<string,EstimationResult>{
  const e=Object.entries(ans); if(!e.length)return{};
  const scored=e.map(([p,g])=>({p,g,d:Math.abs(g-correct)}));
  const n=scored.length;
  const sorted=[...scored].sort((a,b)=>a.d-b.d);
  const bestD=sorted[0].d, worstD=sorted[sorted.length-1].d, range=worstD-bestD;
  const r:Record<string,EstimationResult>={};
  sorted.forEach((item,i)=>{
    let points:number;
    if(n===1||range===0){ points=200; } // alleine oder alle exakt gleich nah -> volle Punkte
    else{ points=Math.round(200-((item.d-bestD)/range)*150); }
    r[item.p]={answer:item.g,distance:item.d,points,rank:i+1};
  });
  return r;
}

// ── Fragen auswählen ────────────────────────────────────────────────
function pickWithRotation<T extends {id:number}>(pool:T[], count:number, usedIds:Set<number>):T[]{
  if(count<=0||pool.length===0) return [];
  let fresh = pool.filter(q=>!usedIds.has(q.id));
  const picked:T[] = [];
  while(picked.length < count){
    if(fresh.length===0){
      for(const q of pool) usedIds.delete(q.id);
      fresh = pool.filter(q=>!picked.some(p=>p.id===q.id));
      if(fresh.length===0) break;
    }
    const idx = Math.floor(Math.random()*fresh.length);
    const item = fresh[idx];
    picked.push(item);
    usedIds.add(item.id);
    fresh.splice(idx,1);
  }
  return shuffle(picked);
}

function pickMC(cfg:QuizConfig,usedIds:Set<number>):MultipleChoiceQuestion[]{
  if(cfg.questionCount<=0)return[];
  const{selectedCategories:cats,difficulty:diff}=cfg;
  const ok=(q:MultipleChoiceQuestion)=>(cats.length===0||cats.includes(q.category??''))&&(diff==='all'||(q.difficulty??'medium')===diff);
  const pool=MC_QUESTIONS.filter(ok);
  return pickWithRotation(pool,cfg.questionCount,usedIds);
}
function pickEst(count:number,usedIds:Set<number>):EstimationQuestion[]{
  return pickWithRotation(ESTIMATION_QUESTIONS,count,usedIds);
}
function pickRankings(cfg:QuizConfig,usedIds:Set<number>):RankingQuestion[]{
  const ids=cfg.selectedRankingIds||[];
  if(ids.length===0)return[];
  const pool=RANKING_QUESTIONS.filter(q=>ids.includes(q.id));
  return shuffle(pool);
}
function pickFlags(count:number,usedIds:Set<number>,diff:"all"|"easy"|"medium"|"hard"):FlagQuestion[]{
  if(count<=0)return[];
  const pool=FLAG_QUESTIONS.filter(q=>diff==="all"||q.difficulty===diff);
  return pickWithRotation(pool,count,usedIds);
}
function pickBuzzer(count:number,usedIds:Set<number>,diff:"all"|"easy"|"medium"|"hard"):BuzzerQuestion[]{
  if(count<=0)return[];
  const pool=BUZZER_QUESTIONS.filter(q=>diff==="all"||q.difficulty===diff);
  return pickWithRotation(pool,count,usedIds);
}
function pickLogos(count:number,usedIds:Set<number>,diff:"all"|"easy"|"medium"|"hard"):LogoQuestion[]{
  if(count<=0)return[];
  const pool=LOGO_QUESTIONS.filter(q=>diff==="all"||q.difficulty===diff);
  return pickWithRotation(pool,count,usedIds);
}

// ── Session ──────────────────────────────────────────────────────────
export function createSession(hostName:string,avatar:AvatarConfig):{session:Session;playerId:string}{
  const code=genCode(),hostId=genId();
  const state:GameState={
    sessionCode:code,phase:"lobby",
    players:[{id:hostId,name:hostName,score:0,isHost:true,avatar:avatar||DEFAULT_AVATAR,streak:0}],
    config:{questionCount:10,timePerQuestion:20,selectedCategories:[],difficulty:"all",
      blitzMode:false,streakBonus:false,jokerEnabled:false,
      estimationCount:0,estimationTime:30,selectedRankingIds:[],flagCount:0,flagBuzzTime:45,
      buzzerCount:0,buzzerTime:40,logoCount:0,logoTime:30},
    availableCategories:ALL_CATEGORIES,
    currentQuestionIndex:0,totalQuestions:0,currentQuestion:null,questionStartTime:null,
    countdownEnd:null,
    mcAnswers:{},mcAnswerTimes:{},mcTimerEnd:null,mcRevealed:false,blitzPoints:{},streakBonuses:{},
    jokerEliminated:{},usedJokers:[],
    estimationAnswers:{},estimationResults:{},estimationRevealed:false,
    rankingRevealed:[],rankingTurnPlayerIds:[],rankingTurnIdx:0,rankingEliminated:[],rankingTimerEnd:null,
    rankingFinished:false,
    buzzMainTimerEnd:null,buzzTimerRemaining:0,buzzWindowStartTime:null,buzzCurrentBuzzer:null,
    buzzAnswerTimerEnd:null,buzzAttemptLog:[],buzzWinnerId:null,
    autoAdvanceAt:null,hostId,roundHistory:[],
    mode:"normal",
    duelConfig:{questionCount:12,timePerQuestion:20,selectedCategories:[],difficulty:"all"},
    duelTeamA:[],duelTeamB:[],duelMatchHistory:[],
    duelTeamAScore:0,duelTeamBScore:0,duelPointValue:1,
    duelBuzzTimerEnd:null,duelCurrentBuzzTeam:null,duelAnswerTimerEnd:null,
    duelLockedOutTeam:null,duelRevealed:false,duelWinnerTeam:null,
    pendingBlockLabel:null,pendingBlockEmoji:null,pendingBlockCount:0,
    sessionScores:{[hostId]:0},sessionRoundsPlayed:0,
    achievements:[],maxStreakByPlayer:{},allBuzzAttempts:[],midpointScores:null,
    paused:false,pausedAt:null,
    scribbleConfig:{roundsPerPlayer:2,drawTime:80},
    scribbleTurnOrder:[],scribbleTurnIdx:0,scribbleRoundNumber:0,
    scribbleDrawerId:null,scribbleWord:null,scribbleWordLength:0,
    scribbleStrokes:[],scribbleTimerEnd:null,
    scribbleCorrectGuessers:[],scribbleGuessLog:[],
    scribbleRoundHistory:[],scribbleRevealedWord:null,
  };
  const session:Session={code,state,clients:new Map([[hostId,null as any]]),
    mcTimer:null,autoTimer:null,rankingTimer:null,buzzMainTimer:null,buzzAnswerTimer:null,
    duelBuzzTimer:null,duelAnswerTimer:null,scribbleTimer:null,usedIds:new Set<number>(),duelQuestions:[]};
  sessions.set(code,session); return{session,playerId:hostId};
}

export function joinSession(code:string,name:string,avatar:AvatarConfig):{session:Session;playerId:string}|null{
  const s=sessions.get(code.toUpperCase()); if(!s||s.state.phase!=="lobby")return null;
  const pid=genId();
  s.state.players.push({id:pid,name,score:0,isHost:false,avatar:avatar||DEFAULT_AVATAR,streak:0});
  s.state.sessionScores[pid]=0;
  if(!s.state.scribbleTurnOrder.includes(pid))s.state.scribbleTurnOrder.push(pid);
  s.clients.set(pid,null as any); return{session:s,playerId:pid};
}

export function getSession(c:string){return sessions.get(c.toUpperCase());}

export function reconnectSession(code:string,playerId:string):Session|null{
  const s=sessions.get(code.toUpperCase());
  if(!s)return null;
  if(!s.state.players.some(p=>p.id===playerId))return null;
  return s;
}
export function broadcast(s:Session,msg:object){const j=JSON.stringify(msg);for(const[,ws]of s.clients)if(ws&&ws.readyState===1)ws.send(j);}
export function broadcastState(s:Session){broadcast(s,{type:"state_update",state:s.state});}

export function updateConfig(s:Session,hostId:string,cfg:QuizConfig):boolean{
  if(s.state.hostId!==hostId||s.state.phase!=="lobby")return false;
  s.state.config={
    questionCount:Math.max(0,Math.min(100,cfg.questionCount??0)),
    timePerQuestion:Math.max(0,Math.min(60,cfg.timePerQuestion??20)),
    selectedCategories:cfg.selectedCategories??[],
    difficulty:["all","easy","medium","hard"].includes(cfg.difficulty)?cfg.difficulty:"all",
    blitzMode:!!cfg.blitzMode,streakBonus:!!cfg.streakBonus,jokerEnabled:!!cfg.jokerEnabled,
    estimationCount:Math.max(0,Math.min(100,cfg.estimationCount??0)),
    estimationTime:Math.max(0,Math.min(60,cfg.estimationTime??30)),
    selectedRankingIds:Array.isArray(cfg.selectedRankingIds)?cfg.selectedRankingIds:[],
    flagCount:Math.max(0,Math.min(100,cfg.flagCount??0)),
    flagBuzzTime:Math.max(0,Math.min(60,cfg.flagBuzzTime??45)),
    buzzerCount:Math.max(0,Math.min(100,cfg.buzzerCount??0)),
    buzzerTime:Math.max(0,Math.min(60,cfg.buzzerTime??40)),
    logoCount:Math.max(0,Math.min(100,cfg.logoCount??0)),
    logoTime:Math.max(0,Math.min(60,cfg.logoTime??30)),
  };
  broadcastState(s); return true;
}

// ── Quiz starten – Fragetypen kommen sequenziell als Blöcke, NICHT gemischt ──
const BLOCK_META: Record<string,{label:string;emoji:string}> = {
  multiple_choice:{label:"ABCD-Quiz",emoji:"🎯"},
  estimation:{label:"Schätzfragen",emoji:"🎲"},
  ranking:{label:"Ranking",emoji:"📊"},
  flag:{label:"Flaggenrätsel",emoji:"🏳️"},
  buzzer:{label:"Buzzer-Quiz",emoji:"🔔"},
  logo:{label:"Logos-Rätsel",emoji:"🏷️"},
};

export function startQuiz(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId||state.phase!=="lobby")return false;
  const mc=pickMC(state.config,s.usedIds);
  const est=pickEst(state.config.estimationCount,s.usedIds);
  const rank=pickRankings(state.config,s.usedIds);
  const flags=pickFlags(state.config.flagCount,s.usedIds,state.config.difficulty);
  const buzzer=pickBuzzer(state.config.buzzerCount,s.usedIds,state.config.difficulty);
  const logos=pickLogos(state.config.logoCount,s.usedIds,state.config.difficulty);

  // Blöcke in fester Reihenfolge, leere werden übersprungen. Jeder Block bleibt
  // intern in sich zusammen (keine Durchmischung verschiedener Frage-Typen).
  const blocks:{type:string;questions:Question[]}[] = [
    {type:"multiple_choice",questions:mc},
    {type:"estimation",questions:est},
    {type:"ranking",questions:rank},
    {type:"flag",questions:flags},
    {type:"buzzer",questions:buzzer},
    {type:"logo",questions:logos},
  ].filter(b=>b.questions.length>0);

  if(!blocks.length)return false;

  const flat:Question[] = [];
  const boundaries:{startIndex:number;label:string;emoji:string;count:number}[] = [];
  blocks.forEach((b,i)=>{
    if(i>0){ // Der erste Block braucht kein Intro – Countdown direkt nach "Quiz starten"
      const meta=BLOCK_META[b.type];
      boundaries.push({startIndex:flat.length,label:meta.label,emoji:meta.emoji,count:b.questions.length});
    }
    flat.push(...b.questions);
  });

  (state as any)._questions=flat;
  (state as any)._blockBoundaries=boundaries;
  state.mode="normal";
  state.totalQuestions=flat.length;
  state.currentQuestionIndex=-1;
  state.roundHistory=[];state.usedJokers=[];state.jokerEliminated={};
  state.players.forEach(p=>p.streak=0);
  state.achievements=[];state.maxStreakByPlayer={};state.allBuzzAttempts=[];state.midpointScores=null;
  // Countdown 3 Sekunden für den allerersten Block
  state.phase="countdown";
  state.countdownEnd=Date.now()+3100;
  broadcastState(s);
  s.mcTimer=setTimeout(()=>{s.mcTimer=null;_next(s);},3100);
  return true;
}

function _recordSessionRound(s:Session){
  const{state}=s;
  state.players.forEach(p=>{ state.sessionScores[p.id]=(state.sessionScores[p.id]??0)+p.score; });
  state.sessionRoundsPlayed++;
}

// ── Auszeichnungen am Ende – rein kosmetisch, keine Punktewirkung ──────
function _computeAchievements(s:Session){
  const{state}=s; const achievements:Achievement[]=[];

  // 🏎️ Schnellster Buzzer (Flaggen + Buzzer-Quiz + Logos kombiniert)
  const correct=state.allBuzzAttempts.filter(a=>a.result==="correct");
  if(correct.length>0){
    const fastest=correct.reduce((min,a)=>a.reactionMs<min.reactionMs?a:min);
    const p=state.players.find(p=>p.id===fastest.playerId);
    if(p) achievements.push({icon:"🏎️",label:"Schnellster Buzzer",playerId:p.id,detail:`${(fastest.reactionMs/1000).toFixed(2)}s Reaktionszeit`});
  }

  // 🔥 Streak-König – höchste erreichte Serie bei ABCD-Fragen
  let bestStreakPid:string|null=null,bestStreak=0;
  for(const[pid,streak] of Object.entries(state.maxStreakByPlayer)){
    if(streak>bestStreak){bestStreak=streak;bestStreakPid=pid;}
  }
  if(bestStreakPid&&bestStreak>=2){
    const p=state.players.find(p=>p.id===bestStreakPid);
    if(p) achievements.push({icon:"🔥",label:"Streak-König",playerId:p.id,detail:`${bestStreak}er Serie`});
  }

  // 📈 Comeback des Abends – größter Platzierungs-Sprung von der Mitte bis zum Ende
  if(state.midpointScores&&state.players.length>=2){
    const midRanked=[...state.players].sort((a,b)=>(state.midpointScores![b.id]??0)-(state.midpointScores![a.id]??0));
    const finalRanked=[...state.players].sort((a,b)=>b.score-a.score);
    let bestImprovement=0,bestPid:string|null=null;
    for(const p of state.players){
      const midRank=midRanked.findIndex(x=>x.id===p.id);
      const finalRank=finalRanked.findIndex(x=>x.id===p.id);
      const improvement=midRank-finalRank;
      if(improvement>bestImprovement){bestImprovement=improvement;bestPid=p.id;}
    }
    if(bestPid&&bestImprovement>0){
      const p=state.players.find(p=>p.id===bestPid);
      if(p) achievements.push({icon:"📈",label:"Comeback des Abends",playerId:p.id,detail:`${bestImprovement} Plätze aufgeholt`});
    }
  }

  state.achievements=achievements;
}

export function continueBlock(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId||state.phase!=="block_intro")return false;
  clearAllTimers(s);
  state.phase="countdown";state.countdownEnd=Date.now()+3100;
  state.pendingBlockLabel=null;state.pendingBlockEmoji=null;state.pendingBlockCount=0;
  broadcastState(s);
  s.mcTimer=setTimeout(()=>{
    s.mcTimer=null;
    const qs:Question[]=(state as any)._questions??[];
    _activateQuestion(s,qs[state.currentQuestionIndex]);
  },3100);
  return true;
}

function _next(s:Session){
  const{state}=s; clearAllTimers(s);
  const qs:Question[]=(state as any)._questions??[];
  state.currentQuestionIndex++; state.autoAdvanceAt=null; state.countdownEnd=null;

  // Mittelpunkt-Score-Snapshot für "Comeback des Abends" (einmalig)
  if(state.midpointScores===null&&qs.length>0&&state.currentQuestionIndex>=Math.floor(qs.length/2)){
    state.midpointScores={};
    state.players.forEach(p=>{state.midpointScores![p.id]=p.score;});
  }

  if(state.currentQuestionIndex>=qs.length){
    state.phase="finished";state.currentQuestion=null;
    _recordSessionRound(s);
    _computeAchievements(s);
    broadcastState(s);return;
  }
  // Block-Übergang? Dann erst Intro-Screen zeigen, Host muss bestätigen.
  const boundaries:{startIndex:number;label:string;emoji:string;count:number}[] = (state as any)._blockBoundaries ?? [];
  const boundary = boundaries.find(b=>b.startIndex===state.currentQuestionIndex);
  if(boundary){
    state.phase="block_intro";
    state.pendingBlockLabel=boundary.label;state.pendingBlockEmoji=boundary.emoji;state.pendingBlockCount=boundary.count;
    broadcastState(s);
    return; // wartet auf continueBlock()
  }
  _activateQuestion(s,qs[state.currentQuestionIndex]);
}

function _buzzTimeFor(state:GameState,q:Question):number{
  if(q.type==="flag")return state.config.flagBuzzTime;
  if(q.type==="buzzer")return state.config.buzzerTime;
  if(q.type==="logo")return state.config.logoTime;
  return 30;
}

function _activateQuestion(s:Session,q:Question){
  const{state}=s;
  state.currentQuestion=q;state.phase="question_active";state.questionStartTime=Date.now();

  if(q.type==="multiple_choice"){
    state.mcAnswers={};state.mcAnswerTimes={};state.mcRevealed=false;
    state.blitzPoints={};state.streakBonuses={};state.jokerEliminated={};
    state.estimationAnswers={};state.estimationResults={};state.estimationRevealed=false;
    const ms=state.config.timePerQuestion*1000;
    state.mcTimerEnd=Date.now()+ms; broadcastState(s);
    s.mcTimer=setTimeout(()=>{s.mcTimer=null;_revealMC(s);},ms+400);

  }else if(q.type==="estimation"){
    state.estimationAnswers={};state.estimationResults={};state.estimationRevealed=false;
    state.mcAnswers={};state.mcAnswerTimes={};state.mcRevealed=false;
    state.blitzPoints={};state.streakBonuses={};
    state.mcTimerEnd=Date.now()+state.config.estimationTime*1000; broadcastState(s);
    s.mcTimer=setTimeout(()=>{s.mcTimer=null;_revealEstimation(s);},state.config.estimationTime*1000+400);

  }else if(q.type==="ranking"){
    state.rankingRevealed=[];
    state.rankingTurnPlayerIds=shuffle(state.players.map(p=>p.id)); // Zufällige Reihenfolge – nicht immer Host zuerst
    state.rankingTurnIdx=0; state.rankingEliminated=[];
    state.rankingTimerEnd=null; state.rankingFinished=false;
    broadcastState(s); _startRankingTurn(s);

  }else if(q.type==="flag"||q.type==="buzzer"||q.type==="logo"){
    // Generischer Buzz-Mechanismus: pausierbarer Haupttimer, mehrfach buzzern erlaubt
    const buzzTime = _buzzTimeFor(state,q);
    state.buzzMainTimerEnd=Date.now()+buzzTime*1000;
    state.buzzTimerRemaining=buzzTime*1000;
    state.buzzWindowStartTime=Date.now();
    state.buzzCurrentBuzzer=null;
    state.buzzAnswerTimerEnd=null;
    state.buzzAttemptLog=[];
    state.buzzWinnerId=null;
    broadcastState(s);
    s.buzzMainTimer=setTimeout(()=>{s.buzzMainTimer=null;_endBuzzRound(s,null);},buzzTime*1000+300);
  }
}

function _scheduleNext(s:Session,delay=5000){
  s.state.autoAdvanceAt=Date.now()+delay; broadcastState(s);
  s.autoTimer=setTimeout(()=>{s.autoTimer=null;_next(s);},delay);
}

// ── MC ─────────────────────────────────────────────────────────────────
function _revealMC(s:Session){
  const{state}=s;clearAllTimers(s);if(state.mcRevealed)return;
  const q=state.currentQuestion as MultipleChoiceQuestion;if(!q)return;
  const totalMs=state.config.timePerQuestion*1000,startTime=state.questionStartTime??(Date.now()-totalMs);
  const correctPids:string[]=[];
  for(const[pid,choice]of Object.entries(state.mcAnswers)){
    const p=state.players.find(p=>p.id===pid);
    if(choice===q.correct){
      correctPids.push(pid);
      const base=state.config.blitzMode?blitzPts((state.mcAnswerTimes[pid]??Date.now())-startTime,totalMs):100;
      const ns=(p?.streak??0)+1,bonus=state.config.streakBonus?streakBonus(ns):0;
      state.blitzPoints[pid]=base;state.streakBonuses[pid]=bonus;
      if(p){p.score+=base+bonus;p.streak=ns;}
      state.maxStreakByPlayer[pid]=Math.max(state.maxStreakByPlayer[pid]??0,ns);
    }else{if(p)p.streak=0;}
  }
  state.players.forEach(p=>{if(!state.mcAnswers[p.id])p.streak=0;});
  state.roundHistory.push({question:q.question,type:"multiple_choice",correctAnswer:`${q.correct}: ${q.options[q.correct]}`,correctPlayerIds:correctPids});
  state.mcRevealed=true;state.mcTimerEnd=null;state.phase="answer_reveal";_scheduleNext(s);
}
export function submitMCAnswer(s:Session,pid:string,choice:MCChoice):boolean{
  const{state}=s;
  if(state.paused)return false;
  if(state.phase!=="question_active"||state.currentQuestion?.type!=="multiple_choice"||state.mcRevealed)return false;
  state.mcAnswers[pid]=choice;state.mcAnswerTimes[pid]=Date.now();
  if(state.players.every(p=>state.mcAnswers[p.id]))_revealMC(s);else broadcastState(s);return true;
}
export function useJoker(s:Session,pid:string):boolean{
  const{state}=s;
  if(state.paused)return false;
  if(state.phase!=="question_active"||state.currentQuestion?.type!=="multiple_choice")return false;
  if(!state.config.jokerEnabled||state.usedJokers.includes(pid)||state.mcAnswers[pid])return false;
  const q=state.currentQuestion as MultipleChoiceQuestion;
  const wrong=shuffle((["A","B","C","D"] as MCChoice[]).filter(o=>o!==q.correct)).slice(0,2);
  state.usedJokers.push(pid);state.jokerEliminated[pid]=wrong;broadcastState(s);return true;
}

// ── Estimation ────────────────────────────────────────────────────────
function _revealEstimation(s:Session){
  const{state}=s;clearAllTimers(s);if(state.estimationRevealed)return;
  const q=state.currentQuestion as EstimationQuestion;if(!q)return;
  const results=calcEstimation(state.estimationAnswers,q.answer);
  state.estimationResults=results;const correctPids:string[]=[];
  for(const[pid,res]of Object.entries(results)){const p=state.players.find(p=>p.id===pid);if(p){p.score+=res.points;if(res.rank===1)correctPids.push(pid);}}
  state.roundHistory.push({question:q.question,type:"estimation",correctAnswer:`${q.answer.toLocaleString("de-DE")} ${q.unit}`,correctPlayerIds:correctPids});
  state.estimationRevealed=true;state.mcTimerEnd=null;state.phase="answer_reveal";_scheduleNext(s);
}
export function submitEstimationAnswer(s:Session,pid:string,value:number):boolean{
  const{state}=s;
  if(state.paused)return false;
  if(state.phase!=="question_active"||state.currentQuestion?.type!=="estimation"||state.estimationRevealed)return false;
  if(isNaN(value)||!isFinite(value))return false;
  state.estimationAnswers[pid]=Math.round(value);
  if(state.players.every(p=>state.estimationAnswers[p.id]!==undefined))_revealEstimation(s);else broadcastState(s);return true;
}

// ── Ranking ───────────────────────────────────────────────────────────
// Am Ende werden ALLE Items aufgedeckt (auch nicht erratene) und der Host
// muss aktiv "Weiter" klicken, damit man die Liste in Ruhe lesen kann.
function _getActive(s:Session):string[]{ return s.state.rankingTurnPlayerIds.filter(p=>!s.state.rankingEliminated.includes(p)); }
function _startRankingTurn(s:Session){
  const{state}=s;clearAllTimers(s);
  const active=_getActive(s); const q=state.currentQuestion as RankingQuestion;
  if(state.rankingRevealed.length>=q.items.length||active.length===0){_endRanking(s);return;}
  let attempts=0;
  while(state.rankingEliminated.includes(state.rankingTurnPlayerIds[state.rankingTurnIdx])){
    state.rankingTurnIdx=(state.rankingTurnIdx+1)%state.rankingTurnPlayerIds.length;
    if(++attempts>state.rankingTurnPlayerIds.length){_endRanking(s);return;}
  }
  const timePerTurn=Math.max(30,(q as any).timePerTurn||30);
  state.rankingTimerEnd=Date.now()+timePerTurn*1000; broadcastState(s);
  s.rankingTimer=setTimeout(()=>{
    s.rankingTimer=null;
    const curPid=state.rankingTurnPlayerIds[state.rankingTurnIdx];
    if(!state.rankingEliminated.includes(curPid))state.rankingEliminated.push(curPid);
    state.rankingTurnIdx=(state.rankingTurnIdx+1)%state.rankingTurnPlayerIds.length;
    state.rankingTimerEnd=null; _startRankingTurn(s);
  },timePerTurn*1000+300);
}
function _endRanking(s:Session){
  const{state}=s;clearAllTimers(s); state.rankingTimerEnd=null;state.phase="answer_reveal";
  const q=state.currentQuestion as RankingQuestion;
  const correctPids=state.players.filter(p=>!state.rankingEliminated.includes(p.id)).map(p=>p.id);
  state.rankingRevealed = q.items.map((_,idx)=>idx);
  state.rankingFinished = true;
  state.roundHistory.push({question:q.title,type:"ranking",correctAnswer:`Vollständig aufgelöst`,correctPlayerIds:correctPids});
  broadcastState(s);
}
export function continueRanking(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId||state.phase!=="answer_reveal"||state.currentQuestion?.type!=="ranking"||!state.rankingFinished)return false;
  state.rankingFinished=false;
  _next(s);
  return true;
}
export function submitRankingAnswer(s:Session,pid:string,value:string):boolean{
  const{state}=s;
  if(state.paused)return false;
  if(state.phase!=="question_active"||state.currentQuestion?.type!=="ranking")return false;
  const curPid=state.rankingTurnPlayerIds[state.rankingTurnIdx];
  if(curPid!==pid)return false;
  const q=state.currentQuestion as RankingQuestion;
  const matchIdx=q.items.findIndex((item,idx)=>!state.rankingRevealed.includes(idx)&&matchesAnswer(value,item.answer,item.aliases||[]));
  if(matchIdx>=0){
    state.rankingRevealed.push(matchIdx);
    const p=state.players.find(p=>p.id===pid); if(p)p.score+=100;
    clearAllTimers(s);
    if(state.rankingRevealed.length>=q.items.length){_endRanking(s);}
    else{state.rankingTurnIdx=(state.rankingTurnIdx+1)%state.rankingTurnPlayerIds.length;state.rankingTimerEnd=null;_startRankingTurn(s);}
  }else{
    clearAllTimers(s);
    if(!state.rankingEliminated.includes(pid))state.rankingEliminated.push(pid);
    state.rankingTurnIdx=(state.rankingTurnIdx+1)%state.rankingTurnPlayerIds.length;
    state.rankingTimerEnd=null; broadcastState(s);
    setTimeout(()=>_startRankingTurn(s),600);
  }
  return true;
}

// ── GENERISCHER BUZZ-MECHANISMUS (Flaggenrätsel + Buzzer-Quiz + Logos) ─
function _getCurrentBuzzAnswer(q:Question):{answer:string;aliases?:string[]}|null{
  if(q.type==="flag") return {answer:q.answer,aliases:q.aliases};
  if(q.type==="buzzer") return {answer:q.answer,aliases:q.aliases};
  if(q.type==="logo") return {answer:q.answer,aliases:q.aliases};
  return null;
}
function _isBuzzType(q:Question|null):boolean{
  return q?.type==="flag"||q?.type==="buzzer"||q?.type==="logo";
}
export function submitBuzzPress(s:Session,pid:string):boolean{
  const{state}=s;
  if(state.paused)return false;
  if(state.phase!=="question_active"||!_isBuzzType(state.currentQuestion))return false;
  if(state.buzzCurrentBuzzer!==null)return false;
  if(!state.buzzMainTimerEnd)return false;
  const remaining=Math.max(0,state.buzzMainTimerEnd-Date.now());
  const reactionMs = state.buzzWindowStartTime ? Date.now()-state.buzzWindowStartTime : 0;
  clearAllTimers(s);
  state.buzzTimerRemaining=remaining;
  state.buzzMainTimerEnd=null;
  state.buzzCurrentBuzzer=pid;
  state.buzzAnswerTimerEnd=Date.now()+15000;
  (state as any)._pendingReactionMs=reactionMs;
  broadcastState(s);
  s.buzzAnswerTimer=setTimeout(()=>{
    s.buzzAnswerTimer=null;
    const attempt:BuzzAttempt={playerId:pid,reactionMs,result:"timeout"};
    state.buzzAttemptLog.push(attempt); state.allBuzzAttempts.push(attempt);
    _resumeBuzzTimer(s);
  },15200);
  return true;
}
function _resumeBuzzTimer(s:Session){
  const{state}=s;clearAllTimers(s);
  state.buzzCurrentBuzzer=null;state.buzzAnswerTimerEnd=null;
  if(state.buzzTimerRemaining<=0){_endBuzzRound(s,null);return;}
  state.buzzMainTimerEnd=Date.now()+state.buzzTimerRemaining;
  state.buzzWindowStartTime=Date.now();
  broadcastState(s);
  s.buzzMainTimer=setTimeout(()=>{s.buzzMainTimer=null;_endBuzzRound(s,null);},state.buzzTimerRemaining+300);
}
export function submitBuzzAnswer(s:Session,pid:string,value:string):boolean{
  const{state}=s;
  if(state.paused)return false;
  if(!_isBuzzType(state.currentQuestion)||state.buzzCurrentBuzzer!==pid)return false;
  const target=_getCurrentBuzzAnswer(state.currentQuestion!); if(!target)return false;
  const reactionMs=(state as any)._pendingReactionMs ?? 0;
  if(matchesAnswer(value,target.answer,target.aliases||[])){
    clearAllTimers(s);
    const attempt:BuzzAttempt={playerId:pid,reactionMs,result:"correct"};
    state.buzzAttemptLog.push(attempt); state.allBuzzAttempts.push(attempt);
    const totalMs = _buzzTimeFor(state,state.currentQuestion!)*1000;
    const finalPts=Math.max(50,Math.round(200-(reactionMs/totalMs)*150));
    const p=state.players.find(p=>p.id===pid); if(p)p.score+=finalPts;
    state.blitzPoints[pid]=finalPts;
    _endBuzzRound(s,pid);
  }else{
    clearAllTimers(s);
    const attempt:BuzzAttempt={playerId:pid,reactionMs,result:"wrong"};
    state.buzzAttemptLog.push(attempt); state.allBuzzAttempts.push(attempt);
    _resumeBuzzTimer(s);
  }
  return true;
}
function _endBuzzRound(s:Session,winnerId:string|null){
  const{state}=s;clearAllTimers(s);
  state.buzzMainTimerEnd=null;state.buzzAnswerTimerEnd=null;
  state.buzzCurrentBuzzer=null;state.buzzWinnerId=winnerId;
  state.phase="answer_reveal";
  const q=state.currentQuestion;
  if(q?.type==="flag"){
    state.roundHistory.push({question:`${q.flag} Flagge`,type:"flag",correctAnswer:q.answer,correctPlayerIds:winnerId?[winnerId]:[]});
  }else if(q?.type==="buzzer"){
    state.roundHistory.push({question:q.question,type:"buzzer",correctAnswer:q.answer,correctPlayerIds:winnerId?[winnerId]:[]});
  }else if(q?.type==="logo"){
    state.roundHistory.push({question:`Logo: ${q.domain}`,type:"logo",correctAnswer:q.answer,correctPlayerIds:winnerId?[winnerId]:[]});
  }
  _scheduleNext(s,5000);
}

// ── PAUSE-FUNKTION ───────────────────────────────────────────────────
// Vereinfachter, robuster Ansatz: beim Fortsetzen wird der jeweils aktive
// Timer mit voller Dauer neu gestartet (statt exakter Restzeit). Für eine
// Party-App völlig ausreichend und für jede Phase sicher zu implementieren.
export function pauseGame(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId)return false;
  if(state.paused)return false;
  clearAllTimers(s);
  state.paused=true;state.pausedAt=Date.now();
  broadcastState(s);
  return true;
}
export function resumeGame(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId)return false;
  if(!state.paused)return false;
  state.paused=false;state.pausedAt=null;

  if(state.phase==="countdown"){
    state.countdownEnd=null;
    const qs:Question[]=(state as any)._questions??[];
    if(state.currentQuestionIndex<0){ _next(s); }
    else if(state.currentQuestionIndex<qs.length){ _activateQuestion(s,qs[state.currentQuestionIndex]); }
    else { broadcastState(s); }
    return true;
  }
  if(state.phase==="block_intro"){ broadcastState(s); return true; } // wartet eh auf Host-Klick
  if(state.phase==="answer_reveal"){
    if(state.mode==="duel"){ s.autoTimer=setTimeout(()=>{s.autoTimer=null;_nextDuelQuestion(s);},4500); broadcastState(s); return true; }
    if(state.currentQuestion?.type==="ranking"){ broadcastState(s); return true; } // wartet auf Host-Button
    _scheduleNext(s,5000);
    return true;
  }
  if(state.phase==="question_active"){
    if(state.mode==="duel"){
      if(state.duelCurrentBuzzTeam){
        state.duelAnswerTimerEnd=Date.now()+12000;
        s.duelAnswerTimer=setTimeout(()=>{s.duelAnswerTimer=null;_afterDuelMiss(s);},12300);
      }else{
        const ms=state.duelConfig.timePerQuestion*1000;
        state.duelBuzzTimerEnd=Date.now()+ms;
        s.duelBuzzTimer=setTimeout(()=>{s.duelBuzzTimer=null;_revealDuel(s,null);},ms+300);
      }
      broadcastState(s); return true;
    }
    const q=state.currentQuestion;
    if(q?.type==="multiple_choice"){
      const ms=state.config.timePerQuestion*1000;
      state.mcTimerEnd=Date.now()+ms;
      s.mcTimer=setTimeout(()=>{s.mcTimer=null;_revealMC(s);},ms+400);
    }else if(q?.type==="estimation"){
      const ms=state.config.estimationTime*1000;
      state.mcTimerEnd=Date.now()+ms;
      s.mcTimer=setTimeout(()=>{s.mcTimer=null;_revealEstimation(s);},ms+400);
    }else if(q?.type==="ranking"){
      _startRankingTurn(s);
    }else if(_isBuzzType(q)){
      if(state.buzzCurrentBuzzer){
        state.buzzAnswerTimerEnd=Date.now()+15000;
        s.buzzAnswerTimer=setTimeout(()=>{
          s.buzzAnswerTimer=null;
          const attempt:BuzzAttempt={playerId:state.buzzCurrentBuzzer!,reactionMs:0,result:"timeout"};
          state.buzzAttemptLog.push(attempt); state.allBuzzAttempts.push(attempt);
          _resumeBuzzTimer(s);
        },15200);
      }else{
        const buzzTime=_buzzTimeFor(state,q!);
        state.buzzMainTimerEnd=Date.now()+buzzTime*1000;
        state.buzzWindowStartTime=Date.now();
        s.buzzMainTimer=setTimeout(()=>{s.buzzMainTimer=null;_endBuzzRound(s,null);},buzzTime*1000+300);
      }
    }
    broadcastState(s);
    return true;
  }
  broadcastState(s);
  return true;
}

// ── DUELL-MODUS ────────────────────────────────────────────────────────
const DUEL_STEAL_TIME = 12000;

export function updateDuelConfig(s:Session,hostId:string,cfg:DuelConfig):boolean{
  if(s.state.hostId!==hostId||s.state.phase!=="lobby")return false;
  s.state.duelConfig={
    questionCount:Math.max(6,Math.min(30,cfg.questionCount??12)),
    timePerQuestion:Math.max(10,Math.min(40,cfg.timePerQuestion??20)),
    selectedCategories:cfg.selectedCategories??[],
    difficulty:["all","easy","medium","hard"].includes(cfg.difficulty)?cfg.difficulty:"all",
  };
  broadcastState(s);return true;
}

export function assignDuelTeam(s:Session,hostId:string,targetPlayerId:string,team:DuelTeamId):boolean{
  const{state}=s;
  if(state.hostId!==hostId||state.phase!=="lobby")return false;
  if(!state.players.some(p=>p.id===targetPlayerId))return false;
  state.duelTeamA=state.duelTeamA.filter(id=>id!==targetPlayerId);
  state.duelTeamB=state.duelTeamB.filter(id=>id!==targetPlayerId);
  if(team==="A")state.duelTeamA.push(targetPlayerId);
  else state.duelTeamB.push(targetPlayerId);
  broadcastState(s);return true;
}

export function chooseDuelTeam(s:Session,playerId:string,team:DuelTeamId):boolean{
  const{state}=s;
  if(state.phase!=="lobby")return false;
  if(!state.players.some(p=>p.id===playerId))return false;
  state.duelTeamA=state.duelTeamA.filter(id=>id!==playerId);
  state.duelTeamB=state.duelTeamB.filter(id=>id!==playerId);
  if(team==="A")state.duelTeamA.push(playerId);
  else state.duelTeamB.push(playerId);
  broadcastState(s);return true;
}

export function startDuel(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId||state.phase!=="lobby")return false;
  if(state.duelTeamA.length===0||state.duelTeamB.length===0)return false;
  const ok=(q:MultipleChoiceQuestion)=>(state.duelConfig.selectedCategories.length===0||state.duelConfig.selectedCategories.includes(q.category??''))&&(state.duelConfig.difficulty==='all'||(q.difficulty??'medium')===state.duelConfig.difficulty);
  const pool=MC_QUESTIONS.filter(ok);
  const questions=pickWithRotation(pool,state.duelConfig.questionCount,s.usedIds);
  if(!questions.length)return false;
  s.duelQuestions=questions;
  state.mode="duel";
  state.totalQuestions=questions.length;
  state.currentQuestionIndex=-1;
  state.duelTeamAScore=0;state.duelTeamBScore=0;
  state.phase="countdown";state.countdownEnd=Date.now()+3100;
  broadcastState(s);
  s.mcTimer=setTimeout(()=>{s.mcTimer=null;_nextDuelQuestion(s);},3100);
  return true;
}

function _nextDuelQuestion(s:Session){
  const{state}=s;clearAllTimers(s);
  state.currentQuestionIndex++;state.autoAdvanceAt=null;state.countdownEnd=null;
  if(state.currentQuestionIndex>=s.duelQuestions.length){
    _finishDuel(s);return;
  }
  const q=s.duelQuestions[state.currentQuestionIndex];
  state.currentQuestion=q;state.phase="question_active";state.questionStartTime=Date.now();
  state.duelLockedOutTeam=null;state.duelCurrentBuzzTeam=null;state.duelRevealed=false;state.duelWinnerTeam=null;
  state.duelPointValue=(state.currentQuestionIndex>=s.duelQuestions.length-3)?2:1;
  const ms=state.duelConfig.timePerQuestion*1000;
  state.duelBuzzTimerEnd=Date.now()+ms;
  broadcastState(s);
  s.duelBuzzTimer=setTimeout(()=>{s.duelBuzzTimer=null;_revealDuel(s,null);},ms+300);
}

function _teamOf(s:Session,pid:string):DuelTeamId|null{
  if(s.state.duelTeamA.includes(pid))return"A";
  if(s.state.duelTeamB.includes(pid))return"B";
  return null;
}

export function submitDuelBuzz(s:Session,pid:string):boolean{
  const{state}=s;
  if(state.paused)return false;
  if(state.phase!=="question_active"||state.mode!=="duel")return false;
  const team=_teamOf(s,pid); if(!team)return false;
  if(state.duelCurrentBuzzTeam!==null)return false;
  if(state.duelLockedOutTeam===team)return false;
  if(!state.duelBuzzTimerEnd)return false;
  clearAllTimers(s);
  state.duelCurrentBuzzTeam=team;
  state.duelAnswerTimerEnd=Date.now()+DUEL_STEAL_TIME;
  broadcastState(s);
  s.duelAnswerTimer=setTimeout(()=>{
    s.duelAnswerTimer=null;
    _afterDuelMiss(s);
  },DUEL_STEAL_TIME+300);
  return true;
}

export function submitDuelAnswer(s:Session,pid:string,choice:MCChoice):boolean{
  const{state}=s;
  if(state.paused)return false;
  if(state.phase!=="question_active"||state.mode!=="duel")return false;
  const team=_teamOf(s,pid); if(!team||team!==state.duelCurrentBuzzTeam)return false;
  const q=state.currentQuestion as MultipleChoiceQuestion; if(!q)return false;
  clearAllTimers(s);
  if(choice===q.correct){
    if(team==="A")state.duelTeamAScore+=state.duelPointValue;
    else state.duelTeamBScore+=state.duelPointValue;
    _revealDuel(s,team);
  }else{
    _afterDuelMiss(s);
  }
  return true;
}

function _afterDuelMiss(s:Session){
  const{state}=s;clearAllTimers(s);
  const missedTeam=state.duelCurrentBuzzTeam;
  state.duelCurrentBuzzTeam=null;state.duelAnswerTimerEnd=null;

  if(state.duelLockedOutTeam!==null){
    _revealDuel(s,null);return;
  }
  state.duelLockedOutTeam=missedTeam;
  const otherTeam:DuelTeamId|null = missedTeam==="A"?"B":missedTeam==="B"?"A":null;
  if(!otherTeam){_revealDuel(s,null);return;}
  state.duelBuzzTimerEnd=Date.now()+10000;
  broadcastState(s);
  s.duelBuzzTimer=setTimeout(()=>{s.duelBuzzTimer=null;_revealDuel(s,null);},10300);
}

function _revealDuel(s:Session,winner:DuelTeamId|null){
  const{state}=s;clearAllTimers(s);
  state.duelBuzzTimerEnd=null;state.duelAnswerTimerEnd=null;state.duelCurrentBuzzTeam=null;
  state.duelWinnerTeam=winner;state.duelRevealed=true;state.phase="answer_reveal";
  broadcastState(s);
  s.autoTimer=setTimeout(()=>{s.autoTimer=null;_nextDuelQuestion(s);},4500);
}

function _finishDuel(s:Session){
  const{state}=s;clearAllTimers(s);
  state.currentQuestion=null;state.phase="finished";
  const winner:"A"|"B"|"draw"=state.duelTeamAScore>state.duelTeamBScore?"A":state.duelTeamBScore>state.duelTeamAScore?"B":"draw";
  const teamANames=state.duelTeamA.map(id=>state.players.find(p=>p.id===id)?.name||"?");
  const teamBNames=state.duelTeamB.map(id=>state.players.find(p=>p.id===id)?.name||"?");
  state.duelMatchHistory.push({
    matchNumber:state.duelMatchHistory.length+1,
    teamAScore:state.duelTeamAScore,teamBScore:state.duelTeamBScore,winner,
    teamANames,teamBNames,
  });
  broadcastState(s);
}

export function endDuel(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId)return false;
  clearAllTimers(s);
  state.phase="lobby";state.currentQuestion=null;state.currentQuestionIndex=0;state.totalQuestions=0;
  state.duelCurrentBuzzTeam=null;state.duelLockedOutTeam=null;state.duelBuzzTimerEnd=null;
  state.duelAnswerTimerEnd=null;state.duelRevealed=false;state.duelWinnerTeam=null;
  s.duelQuestions=[];
  broadcastState(s);return true;
}

// ── Ende ────────────────────────────────────────────────────────────

// ── SCRIBBLE-MODUS ─────────────────────────────────────────────────────
const SCRIBBLE_MAX_PTS = 200;

function _broadcastScribbleState(s:Session){
  const{state}=s;
  for(const[pid,ws] of s.clients){
    if(!ws||ws.readyState!==1)continue;
    const isDrawer=pid===state.scribbleDrawerId;
    ws.send(JSON.stringify({type:"state_update",state:{...state,scribbleWord:isDrawer?state.scribbleWord:null}}));
  }
}

export function updateScribbleConfig(s:Session,hostId:string,cfg:ScribbleConfig):boolean{
  if(s.state.hostId!==hostId||s.state.phase!=="lobby")return false;
  s.state.scribbleConfig={
    roundsPerPlayer:Math.max(1,Math.min(5,cfg.roundsPerPlayer??2)),
    drawTime:Math.max(30,Math.min(120,cfg.drawTime??80)),
  };
  broadcastState(s);return true;
}

export function startScribble(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId||state.phase!=="lobby")return false;
  if(state.players.length<2)return false;
  state.mode="scribble";
  state.players.forEach(p=>{p.score=0;p.streak=0;});
  state.scribbleTurnOrder=shuffle(state.players.map(p=>p.id));
  state.scribbleTurnIdx=0;state.scribbleRoundNumber=0;state.scribbleRoundHistory=[];
  state.phase="countdown";state.countdownEnd=Date.now()+3100;
  broadcastState(s);
  s.mcTimer=setTimeout(()=>{s.mcTimer=null;_nextScribbleTurn(s);},3100);
  return true;
}

function _nextScribbleTurn(s:Session){
  const{state}=s;clearAllTimers(s);
  const totalTurns=state.scribbleTurnOrder.length*state.scribbleConfig.roundsPerPlayer;
  const turnsDone=state.scribbleRoundNumber*state.scribbleTurnOrder.length+state.scribbleTurnIdx;
  if(turnsDone>=totalTurns){_finishScribble(s);return;}
  if(state.scribbleTurnIdx>=state.scribbleTurnOrder.length){
    state.scribbleTurnIdx=0;state.scribbleRoundNumber++;
  }
  const drawerId=state.scribbleTurnOrder[state.scribbleTurnIdx];
  const word=SCRIBBLE_WORDS[Math.floor(Math.random()*SCRIBBLE_WORDS.length)];
  state.scribbleDrawerId=drawerId;state.scribbleWord=word;state.scribbleWordLength=word.length;
  state.scribbleStrokes=[];state.scribbleCorrectGuessers=[];state.scribbleGuessLog=[];state.scribbleRevealedWord=null;
  state.phase="question_active";state.scribbleTimerEnd=Date.now()+state.scribbleConfig.drawTime*1000;
  _broadcastScribbleState(s);
  s.scribbleTimer=setTimeout(()=>{s.scribbleTimer=null;_endScribbleTurn(s);},state.scribbleConfig.drawTime*1000+400);
}

function _endScribbleTurn(s:Session){
  const{state}=s;clearAllTimers(s);
  const drawerBonus=Math.round((state.scribbleCorrectGuessers.length/Math.max(1,state.players.length-1))*100);
  const drawer=state.players.find(p=>p.id===state.scribbleDrawerId);
  if(drawer)drawer.score+=drawerBonus;
  state.scribbleRoundHistory.push({
    word:state.scribbleWord!,drawerId:state.scribbleDrawerId!,
    drawerName:drawer?.name||"?",correctGuesserIds:[...state.scribbleCorrectGuessers],
  });
  state.scribbleRevealedWord=state.scribbleWord;state.scribbleTimerEnd=null;state.phase="answer_reveal";
  broadcastState(s);
  s.autoTimer=setTimeout(()=>{s.autoTimer=null;state.scribbleTurnIdx++;_nextScribbleTurn(s);},5000);
}

export function scribbleDraw(s:Session,pid:string,stroke:ScribbleStroke):boolean{
  const{state}=s;
  if(state.phase!=="question_active"||state.mode!=="scribble"||state.scribbleDrawerId!==pid)return false;
  state.scribbleStrokes=[...state.scribbleStrokes,stroke];
  broadcastState(s);return true;
}

export function scribbleClear(s:Session,pid:string):boolean{
  const{state}=s;
  if(state.phase!=="question_active"||state.mode!=="scribble"||state.scribbleDrawerId!==pid)return false;
  state.scribbleStrokes=[];broadcastState(s);return true;
}

export function scribbleGuess(s:Session,pid:string,text:string):boolean{
  const{state}=s;
  if(state.phase!=="question_active"||state.mode!=="scribble")return false;
  if(state.scribbleDrawerId===pid||state.scribbleCorrectGuessers.includes(pid))return false;
  const correct=normalize(text)===normalize(state.scribbleWord||"");
  const p=state.players.find(p=>p.id===pid);
  if(correct){
    state.scribbleCorrectGuessers.push(pid);
    const pts=Math.max(50,SCRIBBLE_MAX_PTS-(state.scribbleCorrectGuessers.length-1)*30);
    if(p)p.score+=pts;
    state.scribbleGuessLog.push({playerId:pid,playerName:p?.name||"?",text:"✅ [richtig geraten!]",correct:true});
    const nonDrawers=state.players.filter(p=>p.id!==state.scribbleDrawerId);
    if(state.scribbleCorrectGuessers.length>=nonDrawers.length){clearAllTimers(s);_endScribbleTurn(s);}
    else broadcastState(s);
  }else{
    state.scribbleGuessLog.push({playerId:pid,playerName:p?.name||"?",text,correct:false});
    if(state.scribbleGuessLog.length>30)state.scribbleGuessLog=state.scribbleGuessLog.slice(-30);
    broadcastState(s);
  }
  return true;
}

export function scribbleSkip(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId||state.phase!=="question_active"||state.mode!=="scribble")return false;
  clearAllTimers(s);_endScribbleTurn(s);return true;
}

function _finishScribble(s:Session){
  const{state}=s;clearAllTimers(s);
  state.phase="finished";state.scribbleDrawerId=null;state.scribbleWord=null;
  state.players.forEach(p=>{state.sessionScores[p.id]=(state.sessionScores[p.id]??0)+p.score;});
  state.sessionRoundsPlayed++;broadcastState(s);
}

export function endScribble(s:Session,hostId:string):boolean{
  const{state}=s;
  if(state.hostId!==hostId)return false;
  clearAllTimers(s);
  state.mode="normal";state.phase="lobby";
  state.scribbleDrawerId=null;state.scribbleWord=null;state.scribbleRevealedWord=null;
  state.scribbleStrokes=[];state.scribbleGuessLog=[];state.scribbleCorrectGuessers=[];
  state.scribbleTimerEnd=null;state.players.forEach(p=>{p.score=0;p.streak=0;});
  broadcastState(s);return true;
}

export function endQuiz(s:Session,hostId:string):boolean{
  if(s.state.hostId!==hostId)return false;clearAllTimers(s);
  s.state.players.forEach(p=>{p.score=0;p.streak=0;});
  Object.assign(s.state,{phase:"lobby",currentQuestionIndex:0,totalQuestions:0,
    currentQuestion:null,questionStartTime:null,countdownEnd:null,
    mcAnswers:{},mcAnswerTimes:{},mcTimerEnd:null,mcRevealed:false,blitzPoints:{},streakBonuses:{},
    jokerEliminated:{},usedJokers:[],estimationAnswers:{},estimationResults:{},estimationRevealed:false,
    rankingRevealed:[],rankingTurnPlayerIds:[],rankingTurnIdx:0,rankingEliminated:[],rankingTimerEnd:null,
    rankingFinished:false,
    buzzMainTimerEnd:null,buzzTimerRemaining:0,buzzWindowStartTime:null,buzzCurrentBuzzer:null,
    buzzAnswerTimerEnd:null,buzzAttemptLog:[],buzzWinnerId:null,autoAdvanceAt:null,roundHistory:[],
    achievements:[],maxStreakByPlayer:{},allBuzzAttempts:[],midpointScores:null,
    paused:false,pausedAt:null});
  (s.state as any)._questions=null;broadcastState(s);return true;
}
export function restartSession(s:Session,hostId:string){return endQuiz(s,hostId);}

export function kickPlayer(s:Session,hostId:string,targetPlayerId:string):boolean{
  if(s.state.hostId!==hostId)return false;
  if(targetPlayerId===hostId)return false;
  if(!s.state.players.some(p=>p.id===targetPlayerId))return false;
  const ws=s.clients.get(targetPlayerId);
  if(ws){
    try{ ws.send(JSON.stringify({type:"kicked"})); }catch{}
    try{ ws.close(); }catch{}
  }
  removeClient(s,targetPlayerId);
  return true;
}

export function removeClient(s:Session,pid:string){
  s.clients.delete(pid);s.state.players=s.state.players.filter(p=>p.id!==pid);
  s.state.duelTeamA=s.state.duelTeamA.filter(id=>id!==pid);
  s.state.duelTeamB=s.state.duelTeamB.filter(id=>id!==pid);
  s.state.scribbleTurnOrder=s.state.scribbleTurnOrder.filter(id=>id!==pid);
  if(!s.state.players.length){sessions.delete(s.code);return;}
  if(s.state.hostId===pid){s.state.players[0].isHost=true;s.state.hostId=s.state.players[0].id;}
  broadcastState(s);
}
