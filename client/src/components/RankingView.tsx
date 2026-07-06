import { useEffect, useState, useRef } from "react";
import type { RankingQuestion, GameState } from "../../../shared/types";
import type { QuizHook } from "../lib/useQuiz";
import { AvatarSVG } from "../lib/avatar";

export default function RankingView({ question, state, quiz }: {
  question: RankingQuestion; state: GameState; quiz: QuizHook;
}) {
  const { playerId, send } = quiz;
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [timeLeft, setTimeLeft] = useState(question.timePerTurn || 30);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPid = state.rankingTurnPlayerIds[state.rankingTurnIdx];
  const isMyTurn = currentPid === playerId;
  const isRevealed = state.phase === "answer_reveal";
  const activeCount = state.rankingTurnPlayerIds.filter(p => !state.rankingEliminated.includes(p)).length;

  useEffect(() => {
    if (!state.rankingTimerEnd || isRevealed) return;
    const tick = () => setTimeLeft(Math.max(0, Math.round((state.rankingTimerEnd! - Date.now()) / 1000)));
    tick(); const iv = setInterval(tick, 200); return () => clearInterval(iv);
  }, [state.rankingTimerEnd, isRevealed]);

  useEffect(() => {
    if (isMyTurn && inputRef.current) inputRef.current.focus();
  }, [isMyTurn, currentPid]);

  const handleSubmit = () => {
    if (!input.trim() || !isMyTurn) return;
    send({ type: "ranking_answer", value: input.trim() });
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const timerColor = timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#8b5cf6";
  const pct = (question.timePerTurn || 30) > 0 ? (timeLeft / (question.timePerTurn || 30)) * 100 : 0;

  const currentPlayer = state.players.find(p => p.id === currentPid);

  return (
    <div className="flex flex-col gap-4">
      {isRevealed && state.rankingFinished && (
        <div className="text-center fade-in">
          <span className="inline-block text-xs font-bold px-4 py-1.5 rounded-full text-green-400"
            style={{background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)"}}>
            ✅ Liste vollständig aufgelöst
          </span>
        </div>
      )}
      {/* Timer + current player */}
      {!isRevealed && state.rankingTimerEnd && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              {currentPlayer && (
                <>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{background:(currentPlayer.avatar?.bodyColor||"#8b5cf6")+"25"}}>
                    <AvatarSVG config={currentPlayer.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={24}/>
                  </div>
                  <span className="font-bold text-sm" style={{color:currentPlayer.avatar?.bodyColor||"#c4b5fd"}}>
                    {isMyTurn ? "Du bist dran!" : `${currentPlayer.name} ist dran`}
                  </span>
                </>
              )}
            </div>
            <span className="font-black text-xl tabular-nums" style={{color:timerColor, textShadow:`0 0 16px ${timerColor}88`}}>
              {timeLeft}s
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
            <div className="h-full rounded-full transition-none" style={{width:`${pct}%`, background:timerColor, boxShadow:`0 0 8px ${timerColor}`}}/>
          </div>
        </div>
      )}

      {/* The ranking list */}
      <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
        {question.items.map((item, idx) => {
          const revealed = state.rankingRevealed.includes(idx);
          return (
            <div key={idx} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              revealed
                ? "border-green-500/30 bg-green-950/20"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
            style={revealed?{boxShadow:"0 0 20px rgba(34,197,94,0.06)"}:{}}>
              {/* Rank number */}
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                revealed ? "bg-green-500/20 text-green-400" : "bg-white/[0.05] text-white/25"
              }`}>
                {item.rank}
              </span>
              {/* Content */}
              <div className="flex-1 min-w-0">
                {revealed ? (
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-white/90">{item.answer}</span>
                    {item.detail && <span className="text-xs text-white/30 shrink-0">{item.detail}</span>}
                  </div>
                ) : (
                  <div className="flex gap-1 items-center">
                    {Array.from({length: Math.min(item.answer.length, 12)}).map((_, i) => (
                      <div key={i} className="h-2.5 rounded-sm bg-white/[0.08]" style={{width: Math.random()*8+8}}/>
                    ))}
                  </div>
                )}
              </div>
              {revealed && <span className="text-green-400 text-lg shrink-0">✓</span>}
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-white/30">
        <span>{state.rankingRevealed.length}/{question.items.length} aufgedeckt</span>
        <span>{activeCount} Spieler aktiv · {state.rankingEliminated.length} ausgeschieden</span>
      </div>

      {/* Eliminated players */}
      {state.rankingEliminated.length > 0 && !isRevealed && (
        <div className="flex flex-wrap gap-1.5">
          {state.rankingEliminated.map(pid => {
            const p = state.players.find(p => p.id === pid);
            return p ? (
              <span key={pid} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-red-900/30 bg-red-950/20 text-red-400/60">
                <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={14}/>
                {p.name} ausgeschieden
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Input for current player */}
      {!isRevealed && isMyTurn && (
        <div className="flex gap-2 fade-in">
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Antwort eingeben…" autoFocus
            className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold outline-none text-white placeholder:text-white/20"
            style={{background:"rgba(139,92,246,0.1)",border:"1.5px solid rgba(139,92,246,0.35)",boxShadow:"0 0 20px rgba(139,92,246,0.1)"}}/>
          <button onClick={handleSubmit} disabled={!input.trim()}
            className="px-5 py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-30"
            style={{background:"linear-gradient(135deg,#8b5cf6,#7c3aed)",boxShadow:"0 4px 16px rgba(139,92,246,0.4)"}}>
            →
          </button>
        </div>
      )}
      {!isRevealed && !isMyTurn && currentPid && !state.rankingEliminated.includes(playerId||"") && (
        <div className="px-4 py-3 rounded-xl text-sm text-white/30 text-center" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
          Warte auf {currentPlayer?.name}…
        </div>
      )}
      {!isRevealed && state.rankingEliminated.includes(playerId||"") && (
        <div className="px-4 py-3 rounded-xl text-sm text-red-400/60 text-center" style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.15)"}}>
          Du bist ausgeschieden – schau zu!
        </div>
      )}
    </div>
  );
}
