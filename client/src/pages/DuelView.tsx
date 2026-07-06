import { useEffect, useState } from "react";
import type { QuizHook } from "../lib/useQuiz";
import type { MultipleChoiceQuestion, MCChoice, DuelTeamId } from "../../../shared/types";
import { AvatarSVG } from "../lib/avatar";
import { triggerConfetti } from "../lib/confetti";
import { playCorrect, playWrong, playTick } from "../lib/sounds";

const TEAM_COLOR: Record<DuelTeamId,string> = { A:"#ef4444", B:"#3b82f6" };
const TEAM_LABEL: Record<DuelTeamId,string> = { A:"Team Rot", B:"Team Blau" };
const TEAM_EMOJI: Record<DuelTeamId,string> = { A:"🔴", B:"🔵" };
const OPTIONS: MCChoice[] = ["A","B","C","D"];
const LTR: Record<MCChoice,string> = { A:"letter-A", B:"letter-B", C:"letter-C", D:"letter-D" };

export default function DuelView({ quiz }: { quiz: QuizHook }) {
  const { state, playerId, send } = quiz;
  if (!state) return null;
  const isHost = state.hostId === playerId;

  const [countNum, setCountNum] = useState(3);
  useEffect(() => {
    if (state.phase !== "countdown") { setCountNum(3); return; }
    setCountNum(3);
    const iv = setInterval(() => setCountNum(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(iv);
  }, [state.phase]);

  const myTeam: DuelTeamId|null = playerId
    ? (state.duelTeamA.includes(playerId) ? "A" : state.duelTeamB.includes(playerId) ? "B" : null)
    : null;

  const [buzzLeft, setBuzzLeft] = useState(0);
  const [answerLeft, setAnswerLeft] = useState(0);
  const [prevBuzz, setPrevBuzz] = useState(999);

  useEffect(() => {
    if (!state.duelBuzzTimerEnd) return;
    const tick = () => setBuzzLeft(Math.max(0, Math.round((state.duelBuzzTimerEnd! - Date.now())/1000)));
    tick(); const iv = setInterval(tick, 100); return () => clearInterval(iv);
  }, [state.duelBuzzTimerEnd]);

  useEffect(() => {
    if (buzzLeft < prevBuzz && buzzLeft <= 5 && buzzLeft > 0 && state.phase==="question_active") playTick();
    setPrevBuzz(buzzLeft);
  }, [buzzLeft]);

  useEffect(() => {
    if (!state.duelAnswerTimerEnd) return;
    const tick = () => setAnswerLeft(Math.max(0, Math.round((state.duelAnswerTimerEnd! - Date.now())/1000)));
    tick(); const iv = setInterval(tick, 100); return () => clearInterval(iv);
  }, [state.duelAnswerTimerEnd]);

  useEffect(() => {
    if (state.phase !== "answer_reveal") return;
    if (state.duelWinnerTeam) playCorrect(); else playWrong();
  }, [state.phase]);

  const handleBuzz = () => { if (myTeam) send({ type:"duel_buzz" }); };
  const handleAnswer = (choice: MCChoice) => { if (myTeam && state.duelCurrentBuzzTeam===myTeam) send({ type:"duel_answer", choice }); };

  // ── COUNTDOWN ──────────────────────────────────────────────────
  if (state.phase === "countdown") {
    const namesA = state.duelTeamA.map(id => state.players.find(p=>p.id===id)?.name).filter(Boolean);
    const namesB = state.duelTeamB.map(id => state.players.find(p=>p.id===id)?.name).filter(Boolean);
    return (
      <div className="h-screen flex flex-col items-center justify-center relative z-10 gap-8 px-5">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl mb-1">🔴</p>
            <p className="font-black text-red-400 text-sm">{namesA.join(", ")}</p>
          </div>
          <p className="text-4xl font-black text-white/20">VS</p>
          <div className="text-center">
            <p className="text-3xl mb-1">🔵</p>
            <p className="font-black text-blue-400 text-sm">{namesB.join(", ")}</p>
          </div>
        </div>
        <div className="relative flex items-center justify-center w-52 h-52">
          <div className="absolute inset-0 rounded-full" style={{background:"radial-gradient(circle,rgba(139,92,246,0.2) 0%,transparent 70%)"}}/>
          <div key={countNum} className="font-black pop-in" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"110px",lineHeight:1,
            background:"linear-gradient(135deg,#ef4444,#a855f7,#3b82f6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            textShadow:"0 0 60px rgba(139,92,246,0.5)"}}>
            {countNum > 0 ? countNum : "⚔️"}
          </div>
        </div>
        <p className="text-white/30 text-sm">{state.totalQuestions} Fragen im Duell</p>
      </div>
    );
  }

  // ── FINISHED ───────────────────────────────────────────────────
  if (state.phase === "finished") {
    const winner = state.duelTeamAScore > state.duelTeamBScore ? "A" : state.duelTeamBScore > state.duelTeamAScore ? "B" : null;
    const iWon = winner && myTeam === winner;
    if (iWon) setTimeout(() => triggerConfetti(100), 200);
    const duelWins = { A: state.duelMatchHistory.filter(m=>m.winner==="A").length, B: state.duelMatchHistory.filter(m=>m.winner==="B").length };

    return (
      <div className="min-h-screen relative z-10 p-5 max-w-xl mx-auto flex flex-col justify-center py-10">
        <div className="text-center mb-6 pop-in">
          <div className="text-6xl mb-3">{winner ? TEAM_EMOJI[winner] : "🤝"}</div>
          <h1 className="text-3xl font-black text-white mb-1">
            {winner ? `${TEAM_LABEL[winner]} gewinnt!` : "Unentschieden!"}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {(["A","B"] as DuelTeamId[]).map(team => (
            <div key={team} className={`text-center p-5 rounded-3xl border-2 glass ${winner===team?"":""}`}
              style={{borderColor: winner===team ? TEAM_COLOR[team] : "rgba(255,255,255,0.08)",
                boxShadow: winner===team ? `0 0 40px ${TEAM_COLOR[team]}33` : "none"}}>
              <p className="text-4xl mb-2">{TEAM_EMOJI[team]}</p>
              <p className="text-5xl font-black" style={{color:TEAM_COLOR[team]}}>{team==="A"?state.duelTeamAScore:state.duelTeamBScore}</p>
              <p className="text-xs text-white/30 mt-1">{TEAM_LABEL[team]}</p>
              <div className="flex justify-center -space-x-1 mt-2">
                {(team==="A"?state.duelTeamA:state.duelTeamB).map(id => {
                  const p = state.players.find(p=>p.id===id);
                  return p ? <AvatarSVG key={id} config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={26}/> : null;
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-4 mb-5">
          <p className="text-xs text-white/30 uppercase tracking-wider text-center mb-2">Session-Bilanz</p>
          <p className="text-center font-bold text-sm">
            <span className="text-red-400">{duelWins.A} Siege</span>
            <span className="text-white/20 mx-2">·</span>
            <span className="text-blue-400">{duelWins.B} Siege</span>
          </p>
        </div>

        {isHost
          ? <button onClick={() => send({type:"end_duel"})} className="w-full py-4 rounded-2xl text-lg font-black text-white"
              style={{background:"linear-gradient(135deg,#ef4444,#a855f7,#3b82f6)",boxShadow:"0 4px 20px rgba(139,92,246,0.4)"}}>
              ⚔️ Zurück zur Lobby
            </button>
          : <p className="text-center text-white/20 pulse-slow text-sm">Warte auf den Host…</p>
        }
      </div>
    );
  }

  // ── QUESTION ACTIVE / REVEAL ─────────────────────────────────────
  const q = state.currentQuestion as MultipleChoiceQuestion;
  if (!q) return null;
  const revealed = state.phase === "answer_reveal";
  const buzzPct = state.duelConfig.timePerQuestion > 0 ? (buzzLeft/state.duelConfig.timePerQuestion)*100 : 0;
  const answerPct = (answerLeft/12)*100;
  const buzzTeam = state.duelCurrentBuzzTeam;
  const lockedTeam = state.duelLockedOutTeam;
  const pct = state.totalQuestions > 0 ? ((state.currentQuestionIndex+1)/state.totalQuestions)*100 : 0;

  const optCls = (opt: MCChoice) => {
    let b = "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all";
    if (!revealed) return b + " border-white/[0.08] bg-white/[0.03]";
    if (opt === q.correct) return b + " border-green-500/50 bg-green-950/25";
    return b + " border-white/[0.06] bg-white/[0.02] opacity-40";
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative z-10">
      {/* Topbar – Team scores */}
      <div className="flex items-center px-4 py-3 shrink-0 gap-3"
        style={{background:"rgba(7,7,16,0.85)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-red-400 font-black text-lg">{state.duelTeamAScore}</span>
          <span className="text-white/15 text-xs">🔴</span>
        </div>
        <div className="text-center shrink-0">
          <p className="text-[10px] text-white/25 tabular-nums">{state.currentQuestionIndex+1}/{state.totalQuestions}</p>
          {state.duelPointValue===2 && <p className="text-[10px] font-black text-amber-400">2× SHOWDOWN 🔥</p>}
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-blue-400/40 text-xs">🔵</span>
          <span className="text-blue-400 font-black text-lg">{state.duelTeamBScore}</span>
          {isHost && <button onClick={() => send({type:"pause_game"})} className="text-white/15 hover:text-amber-400 transition text-xs ml-1" title="Pausieren">⏸️</button>}
        </div>
      </div>
      <div className="h-1 shrink-0" style={{background:"rgba(255,255,255,0.06)"}}>
        <div className="h-full" style={{width:`${pct}%`,background:"linear-gradient(90deg,#ef4444,#a855f7,#3b82f6)"}}/>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-5 px-5 flex items-center justify-center">
        <div className="w-full max-w-lg">
          {q.category && (
            <p className="text-center text-[10px] uppercase tracking-widest font-bold text-white/30 mb-3">{q.category}</p>
          )}
          <h2 className="text-xl md:text-2xl font-black text-center text-white mb-5 leading-snug">{q.question}</h2>

          {/* MC Options */}
          <div className="flex flex-col gap-2 mb-5">
            {OPTIONS.map(opt => (
              <div key={opt} className={optCls(opt)}>
                <span className={`${LTR[opt]} w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0`}>{opt}</span>
                <span className="flex-1 text-sm text-white/85">{q.options[opt]}</span>
                {revealed && opt===q.correct && <span className="text-green-400 text-lg">✓</span>}
              </div>
            ))}
          </div>

          {/* Buzz race phase */}
          {!revealed && !buzzTeam && (
            <div className="space-y-3">
              <div className="h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
                <div className="h-full rounded-full transition-none" style={{width:`${buzzPct}%`,
                  background:buzzLeft<=5?"#ef4444":"linear-gradient(90deg,#ef4444,#3b82f6)"}}/>
              </div>
              <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
                <span>Wer als erstes buzzert darf antworten</span>
                <span className="font-black text-white/60">{buzzLeft}s</span>
              </div>
              {myTeam ? (
                <button onClick={handleBuzz} disabled={lockedTeam===myTeam}
                  className="w-full py-6 rounded-3xl font-black text-2xl text-white active:scale-95 transition-all disabled:opacity-30"
                  style={{
                    background: myTeam==="A" ? "radial-gradient(circle at 40% 35%,#ef4444,#b91c1c)" : "radial-gradient(circle at 40% 35%,#3b82f6,#1d4ed8)",
                    boxShadow: `0 6px 0 ${myTeam==="A"?"#7f1d1d":"#1e3a8a"},0 10px 30px ${TEAM_COLOR[myTeam]}55`
                  }}>
                  {lockedTeam===myTeam ? "Schon falsch ❌" : `BUZZ! ${TEAM_EMOJI[myTeam]}`}
                </button>
              ) : (
                <p className="text-center text-white/15 text-xs">Du bist keinem Team zugeordnet</p>
              )}
              {lockedTeam && (
                <p className="text-center text-xs" style={{color:TEAM_COLOR[lockedTeam]}}>
                  {TEAM_LABEL[lockedTeam]} lag falsch – Steal-Chance für die Gegenseite!
                </p>
              )}
            </div>
          )}

          {/* Someone buzzed, answering */}
          {!revealed && buzzTeam && (
            <div className="space-y-3 fade-in">
              <div className="flex items-center justify-between text-xs">
                <span style={{color:TEAM_COLOR[buzzTeam]}} className="font-bold">{TEAM_EMOJI[buzzTeam]} {TEAM_LABEL[buzzTeam]} antwortet…</span>
                <span className="font-black text-white/60">{answerLeft}s</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
                <div className="h-full rounded-full transition-none" style={{width:`${answerPct}%`,background:TEAM_COLOR[buzzTeam]}}/>
              </div>
              {myTeam === buzzTeam ? (
                <div className="grid grid-cols-2 gap-2">
                  {OPTIONS.map(opt => (
                    <button key={opt} onClick={()=>handleAnswer(opt)}
                      className="py-3 rounded-xl font-black text-sm text-white active:scale-95 transition-all"
                      style={{background:`${TEAM_COLOR[buzzTeam]}25`,border:`1.5px solid ${TEAM_COLOR[buzzTeam]}55`}}>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-white/25 text-sm">
                  {myTeam ? "Warte ab, ob sie es schaffen…" : "Zuschauer-Modus"}
                </p>
              )}
            </div>
          )}

          {/* Reveal */}
          {revealed && (
            <div className="text-center fade-in">
              {state.duelWinnerTeam ? (
                <p className="font-black text-lg" style={{color:TEAM_COLOR[state.duelWinnerTeam]}}>
                  {TEAM_EMOJI[state.duelWinnerTeam]} {TEAM_LABEL[state.duelWinnerTeam]} +{state.duelPointValue} Punkt{state.duelPointValue>1?"e":""}!
                </p>
              ) : (
                <p className="font-bold text-white/30">Niemand hat's gewusst!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
