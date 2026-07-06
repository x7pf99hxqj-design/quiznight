import { useState, useEffect } from "react";
import type { QuizHook } from "../lib/useQuiz";
import type { MultipleChoiceQuestion, EstimationQuestion, RankingQuestion, FlagQuestion, BuzzerQuestion, LogoQuestion } from "../../../shared/types";
import Scoreboard from "../components/Scoreboard";
import Podium from "../components/Podium";
import MCView from "../components/MultipleChoiceQuestion";
import EstimationView from "../components/EstimationQuestion";
import RankingView from "../components/RankingView";
import BuzzRoundView from "../components/BuzzRoundView";
import DuelView from "./DuelView";
import ScribbleView from "./ScribbleView";
import PauseOverlay from "../components/PauseOverlay";
import { AvatarSVG } from "../lib/avatar";
import { triggerConfetti } from "../lib/confetti";

const TYPE_BADGE: Record<string,{label:string;color:string;bg:string}> = {
  multiple_choice: { label:"ABCD",       color:"#c4b5fd", bg:"rgba(139,92,246,0.1)" },
  estimation:      { label:"Schätzfrage",color:"#fbbf24", bg:"rgba(245,158,11,0.1)" },
  ranking:         { label:"Ranking",    color:"#34d399", bg:"rgba(52,211,153,0.1)" },
  flag:            { label:"Flagge",     color:"#f87171", bg:"rgba(248,113,113,0.1)" },
  buzzer:          { label:"Buzzer",     color:"#22d3ee", bg:"rgba(34,211,238,0.1)" },
  logo:            { label:"Logo",       color:"#facc15", bg:"rgba(250,204,21,0.1)" },
};

export default function Quiz({ quiz }: { quiz: QuizHook }) {
  const { state, playerId, send } = quiz;
  if (!state) return null;

  // ── Pause hat höchste Priorität – überlagert egal welcher Modus/Phase ──
  if (state.paused) return <PauseOverlay state={state} quiz={quiz} isHost={state.hostId===playerId}/>;

  // ── Duell-Modus läuft komplett eigenständig, eigene Render-Pipeline ──
  if (state.mode === "duel") return <DuelView quiz={quiz}/>;
  if (state.mode === "scribble") return <ScribbleView quiz={quiz}/>;

  const isHost = state.hostId === playerId;
  const me = state.players.find(p => p.id === playerId);
  const q = state.currentQuestion;
  const pct = state.totalQuestions > 0 ? ((state.currentQuestionIndex + 1) / state.totalQuestions) * 100 : 0;
  const [histOpen, setHistOpen] = useState(false);
  // Countdown – MUST be at top level (React rules of hooks)
  const [countNum, setCountNum] = useState(3);
  useEffect(() => {
    if (state.phase !== "countdown") { setCountNum(3); return; }
    setCountNum(3);
    const iv = setInterval(() => setCountNum(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(iv);
  }, [state.phase]);

  // ── BLOCK-ÜBERGANG ─────────────────────────────────────────────
  // Quiz-Typen kommen nicht mehr gemischt – beim Wechsel zu einer neuen
  // Frageart pausiert das Spiel, bis der Host bestätigt.
  if (state.phase === "block_intro") {
    return (
      <div className="h-screen flex flex-col items-center justify-center relative z-10 gap-6 px-5">
        <p className="text-white/25 uppercase tracking-widest text-xs font-bold">Nächste Runde</p>
        <div className="text-7xl pop-in">{state.pendingBlockEmoji}</div>
        <h2 className="text-3xl font-black text-white text-center">{state.pendingBlockLabel}</h2>
        <p className="text-white/40 text-sm">{state.pendingBlockCount} Fragen</p>
        {isHost ? (
          <button onClick={() => send({type:"continue_block"})}
            className="btn-primary px-10 py-4 rounded-2xl text-lg mt-2">
            Weiter ➔
          </button>
        ) : (
          <p className="text-white/20 pulse-slow text-sm mt-2">Warte auf den Host…</p>
        )}
      </div>
    );
  }

  // ── COUNTDOWN ─────────────────────────────────────────────────
  if (state.phase === "countdown") {
    return (
      <div className="h-screen flex flex-col items-center justify-center relative z-10 gap-6">
        <p className="text-white/30 uppercase tracking-widest text-sm font-bold">
          {state.totalQuestions} Fragen – Los geht's!
        </p>
        <div className="relative flex items-center justify-center w-52 h-52">
          <div className="absolute inset-0 rounded-full" style={{background:"radial-gradient(circle,rgba(139,92,246,0.2) 0%,transparent 70%)"}}/>
          <div key={countNum} className="font-black text-gradient pop-in"
            style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"110px",lineHeight:1,
              textShadow:"0 0 60px rgba(139,92,246,0.5)"}}>
            {countNum > 0 ? countNum : "🚀"}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-center max-w-xs">
          {Array.from({length: Math.min(state.totalQuestions, 20)}).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/15"/>
          ))}
        </div>
      </div>
    );
  }

  if (state.phase === "finished") {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0], iWon = winner?.id === playerId;
    if (iWon) setTimeout(() => triggerConfetti(100), 200);

    return (
      <div className="min-h-screen relative z-10 p-5 max-w-xl mx-auto flex flex-col justify-center py-10">
        <div className="text-center mb-8 pop-in">
          <div className="text-7xl mb-4 float">{iWon ? "🏆" : "🎯"}</div>
          <h1 className="text-4xl font-black text-gradient mb-2" style={{fontFamily:"'Space Grotesk',sans-serif"}}>
            {iWon ? "Du hast gewonnen!" : "Quiz beendet!"}
          </h1>
          {winner && !iWon && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <AvatarSVG config={winner.avatar || {bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={32}/>
              <p className="font-bold text-sm" style={{color:winner.avatar?.bodyColor||"#888"}}>{winner.name} gewinnt!</p>
            </div>
          )}
        </div>

        <Podium players={state.players}/>

        {state.achievements.length > 0 && (
          <div className="grid gap-2 mb-4 fade-in" style={{gridTemplateColumns:`repeat(${Math.min(state.achievements.length,3)},1fr)`}}>
            {state.achievements.map((a,i) => {
              const p = state.players.find(p=>p.id===a.playerId);
              if (!p) return null;
              const col = p.avatar?.bodyColor || "#8b5cf6";
              return (
                <div key={i} className="glass rounded-2xl p-3 text-center pop-in" style={{animationDelay:`${i*100}ms`}}>
                  <div className="text-2xl mb-1">{a.icon}</div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1.5">{a.label}</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={20}/>
                    <span className="text-xs font-bold truncate" style={{color:col}}>{p.name}</span>
                  </div>
                  <p className="text-[10px] text-white/25 mt-1">{a.detail}</p>
                </div>
              );
            })}
          </div>
        )}

        <Scoreboard players={state.players} title="Endergebnis"/>

        {state.sessionRoundsPlayed > 0 && (
          <p className="text-center text-white/20 text-xs mt-3">
            📊 Session-Tabelle in der Lobby zeigt die Gesamtpunkte über alle Runden
          </p>
        )}

        {state.roundHistory.length > 0 && (
          <div className="mt-5">
            <button onClick={() => setHistOpen(!histOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl glass text-sm text-white/40 hover:text-white/60 transition">
              <span className="font-semibold">📋 Verlauf ({state.roundHistory.length} Fragen)</span>
              <span>{histOpen ? "▲" : "▼"}</span>
            </button>
            {histOpen && (
              <div className="mt-2 space-y-1.5 max-h-72 overflow-y-auto">
                {state.roundHistory.map((e, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl glass">
                    <p className="text-xs text-white/25 mb-1">
                      {e.type==="flag"?"🏳️":e.type==="logo"?"🏷️":e.type==="buzzer"?"🔔":e.type==="ranking"?"📊":e.type==="estimation"?"🎲":"🎯"} {i+1}.
                    </p>
                    <p className="text-sm text-white/60 leading-snug mb-1.5">{e.question}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-green-400/80 font-semibold">✓ {e.correctAnswer}</span>
                      {e.correctPlayerIds.map(pid => {
                        const p = state.players.find(p => p.id === pid);
                        return p ? <span key={pid} className="text-xs px-2 py-0.5 rounded-lg" style={{background:(p.avatar?.bodyColor||"#8b5cf6")+"20",color:p.avatar?.bodyColor||"#888"}}>{p.name}</span> : null;
                      })}
                      {e.correctPlayerIds.length === 0 && <span className="text-xs text-white/20">Niemand</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isHost && <button onClick={() => send({type:"end_quiz"})} className="btn-primary mt-6 w-full text-lg py-4 rounded-2xl">🔄 Neue Runde</button>}
        {!isHost && <p className="text-center text-white/20 mt-5 pulse-slow text-sm">Warte auf den Host…</p>}
      </div>
    );
  }

  if (!q) return null;
  const badge = TYPE_BADGE[q.type] || TYPE_BADGE.multiple_choice;
  const isFlag = q.type === "flag";
  const isBuzzer = q.type === "buzzer";
  const isLogo = q.type === "logo";
  const isBuzzRound = isFlag || isBuzzer || isLogo; // alle drei nutzen den schmalen, zentrierten Buzz-Layout
  const isRanking = q.type === "ranking";

  return (
    <div className="h-screen flex flex-col overflow-hidden relative z-10">
      {/* ── Topbar ── */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{background:"rgba(7,7,16,0.85)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[80px]" style={{background:"rgba(255,255,255,0.06)"}}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{width:`${pct}%`,background:"linear-gradient(90deg,#8b5cf6,#a78bfa)",boxShadow:"0 0 8px rgba(139,92,246,0.6)"}}/>
          </div>
          <span className="text-xs text-white/25 font-bold tabular-nums shrink-0">{state.currentQuestionIndex+1}/{state.totalQuestions}</span>
        </div>

        {me && me.streak >= 2 && <span className="text-xs text-amber-400 font-black streak-flame">🔥{me.streak}</span>}
        <span className="text-xs px-2 py-0.5 rounded-lg font-bold shrink-0" style={{background:badge.bg,color:badge.color}}>
          {badge.label}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{background:(me?.avatar?.bodyColor||"#8b5cf6")+"20"}}>
            <AvatarSVG config={me?.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={24}/>
          </div>
          <span className="font-black text-white tabular-nums text-sm">{me?.score??0}<span className="text-xs font-normal text-white/25 ml-0.5">Pkt</span></span>
        </div>

        {isHost && <button onClick={() => send({type:"pause_game"})} className="text-white/15 hover:text-amber-400 transition text-xs px-2 py-1 rounded-lg shrink-0" title="Pausieren">⏸️</button>}
        {isHost && <button onClick={() => { if(confirm("Quiz beenden?")) send({type:"end_quiz"}); }} className="text-white/15 hover:text-red-400 transition text-xs px-2 py-1 rounded-lg shrink-0">✕</button>}
      </div>

      {/* ── Content ── */}
      <div className={`flex-1 overflow-y-auto py-5 px-5 ${isBuzzRound ? "flex items-center justify-center" : ""}`}>
        <div className={`w-full ${isBuzzRound ? "max-w-lg" : "max-w-2xl mx-auto"}`}>

          {/* Question header – für alle außer Flagge/Logo (die zeigen stattdessen nur den Hinweistext) */}
          {!isFlag && !isLogo && (
            <div className="text-center mb-6">
              {q.category && (
                <span className="inline-block text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-full mb-4"
                  style={{background:badge.bg,color:badge.color,border:`1px solid ${badge.color}30`}}>
                  {q.category}
                </span>
              )}
              {isRanking ? (
                <div>
                  <h2 className="text-xl md:text-2xl font-black leading-snug text-white">{(q as RankingQuestion).title}</h2>
                  {(q as RankingQuestion).description && (
                    <p className="text-white/30 text-sm mt-1">{(q as RankingQuestion).description}</p>
                  )}
                </div>
              ) : (
                <h2 className="text-xl md:text-2xl font-black leading-snug text-white">{(q as MultipleChoiceQuestion|EstimationQuestion|BuzzerQuestion).question}</h2>
              )}
            </div>
          )}

          {/* Flag: show category above flag */}
          {isFlag && (
            <div className="text-center mb-2">
              <span className="inline-block text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-full mb-2"
                style={{background:badge.bg,color:badge.color,border:`1px solid ${badge.color}30`}}>
                Welches Land hat diese Flagge?
              </span>
            </div>
          )}

          {/* Logo: show hint above logo */}
          {isLogo && (
            <div className="text-center mb-2">
              <span className="inline-block text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-full mb-2"
                style={{background:badge.bg,color:badge.color,border:`1px solid ${badge.color}30`}}>
                Welche Marke ist das?
              </span>
            </div>
          )}

          {/* Question component */}
          {q.type === "multiple_choice" && <MCView question={q as MultipleChoiceQuestion} state={state} quiz={quiz}/>}
          {q.type === "estimation" && <EstimationView question={q as EstimationQuestion} state={state} quiz={quiz}/>}
          {q.type === "ranking" && <RankingView question={q as RankingQuestion} state={state} quiz={quiz}/>}
          {(q.type === "flag" || q.type === "buzzer" || q.type === "logo") && <BuzzRoundView question={q as FlagQuestion|BuzzerQuestion|LogoQuestion} state={state} quiz={quiz}/>}

          {/* Ranking: am Ende ist alles aufgedeckt – Host muss aktiv weiterklicken, damit Zeit zum Lesen bleibt */}
          {isRanking && state.rankingFinished && (
            <div className="mt-5 fade-in">
              {isHost ? (
                <button onClick={() => send({type:"continue_ranking"})} className="btn-primary w-full py-4 rounded-2xl text-lg">
                  Weiter ➔
                </button>
              ) : (
                <p className="text-center text-white/20 pulse-slow text-sm">Host schaut sich die Liste an…</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mini Scoreboard ── */}
      {!isBuzzRound && (
        <div className="px-4 pb-3 shrink-0">
          <div className="flex gap-1.5 flex-wrap justify-center">
            {[...state.players].sort((a, b) => b.score - a.score).map(p => {
              const col = p.avatar?.bodyColor || "#8b5cf6";
              return (
                <div key={p.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={p.id === playerId
                    ? {borderColor:col+"55",background:col+"15",color:col}
                    : {borderColor:"rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.03)",color:"rgba(255,255,255,0.25)"}}>
                  <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={16}/>
                  <span>{p.name}: {p.score}</span>
                  {p.streak >= 2 && <span className="streak-flame text-[10px]">🔥</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
