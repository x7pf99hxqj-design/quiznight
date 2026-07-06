import { useEffect, useState } from "react";
import type { MultipleChoiceQuestion, GameState, MCChoice } from "../../../shared/types";
import type { QuizHook } from "../lib/useQuiz";
import { playCorrect, playWrong, playTick, playJoker, playStreak } from "../lib/sounds";
import { triggerMiniConfetti } from "../lib/confetti";

const OPTIONS: MCChoice[] = ["A","B","C","D"];
const LTR: Record<MCChoice,string> = { A:"letter-A", B:"letter-B", C:"letter-C", D:"letter-D" };
const LTR_COLORS: Record<MCChoice,string> = { A:"#fca5a5", B:"#93c5fd", C:"#fcd34d", D:"#86efac" };

export default function MCView({ question, state, quiz }: { question:MultipleChoiceQuestion; state:GameState; quiz:QuizHook }) {
  const { playerId, send } = quiz;
  const [selected, setSelected] = useState<MCChoice|null>(null);
  const [lastId, setLastId] = useState(question.id);
  const [timeLeft, setTimeLeft] = useState(state.config.timePerQuestion);
  const [advLeft, setAdvLeft] = useState<number|null>(null);
  const [prevTime, setPrevTime] = useState(999);

  if (question.id !== lastId) { setSelected(null); setLastId(question.id); }

  const revealed = state.mcRevealed;
  const answered = Object.keys(state.mcAnswers).length, total = state.players.length;
  const myPts = playerId ? state.blitzPoints[playerId] : null;
  const myBonus = playerId ? state.streakBonuses[playerId] : null;
  const myElim = playerId ? (state.jokerEliminated[playerId] ?? []) : [];
  const jokerUsed = playerId ? state.usedJokers.includes(playerId) : false;
  const canJoker = state.config.jokerEnabled && !jokerUsed && !selected && !revealed && state.phase==="question_active";
  const me = state.players.find(p => p.id === playerId);

  useEffect(() => {
    if (!state.mcTimerEnd || revealed) return;
    const tick = () => setTimeLeft(Math.max(0, Math.round((state.mcTimerEnd!-Date.now())/1000)));
    tick(); const iv = setInterval(tick, 100); return () => clearInterval(iv);
  }, [state.mcTimerEnd, revealed]);

  useEffect(() => {
    if (timeLeft < prevTime && timeLeft <= 5 && !revealed) playTick();
    setPrevTime(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    if (!state.autoAdvanceAt || state.phase !== "answer_reveal") { setAdvLeft(null); return; }
    const tick = () => setAdvLeft(Math.max(0, Math.round((state.autoAdvanceAt!-Date.now())/1000)));
    tick(); const iv = setInterval(tick, 200); return () => clearInterval(iv);
  }, [state.autoAdvanceAt, state.phase]);

  useEffect(() => {
    if (!revealed || !selected) return;
    if (selected === question.correct) {
      playCorrect();
      const streak = me?.streak ?? 0;
      if (streak >= 2) setTimeout(() => playStreak(streak), 400);
      const btn = document.getElementById(`ans-${question.correct}`);
      if (btn) { const r = btn.getBoundingClientRect(); triggerMiniConfetti(r.left+r.width/2, r.top+r.height/2); }
    } else { playWrong(); }
  }, [revealed]);

  const pick = (c: MCChoice) => {
    if (selected || revealed || state.phase !== "question_active" || myElim.includes(c)) return;
    setSelected(c); send({ type:"mc_answer", choice:c });
  };

  const counts = OPTIONS.reduce((a,o) => ({...a,[o]:Object.values(state.mcAnswers).filter(x=>x===o).length}), {} as Record<MCChoice,number>);
  const timerPct = state.config.timePerQuestion > 0 ? (timeLeft/state.config.timePerQuestion)*100 : 0;
  const timerColor = timeLeft<=5?"#ef4444":timeLeft<=10?"#f59e0b":"#8b5cf6";

  const btnCls = (opt: MCChoice) => {
    if (myElim.includes(opt)) return "ans-btn joker-eliminated w-full flex items-center gap-4 px-5 py-4 rounded-2xl";
    let b = "ans-btn w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left cursor-pointer";
    if (!revealed) {
      if (selected===opt) b += " selected";
      else if (selected) b += " dim-reveal";
    } else {
      if (opt===question.correct) b += " correct-reveal";
      else if (selected===opt) b += " wrong-reveal";
      else b += " dim-reveal";
    }
    return b;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Timer */}
      {!revealed && state.mcTimerEnd && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-white/30">{answered}/{total} geantwortet</span>
            <span className="font-black text-2xl tabular-nums" style={{color:timerColor,textShadow:`0 0 20px ${timerColor}88`}}>
              {timeLeft}<span className="text-xs font-normal text-white/25 ml-0.5">s</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
            <div className="h-full rounded-full transition-none"
              style={{width:`${timerPct}%`,background:timerColor,boxShadow:timeLeft<=5?`0 0 12px ${timerColor}`:undefined}}/>
          </div>
        </div>
      )}

      {/* Status + Joker */}
      <div className="flex items-center justify-between min-h-[28px]">
        <p className="text-xs">
          {selected && !revealed && <span className="text-[#8b5cf6]">✓ Geantwortet – warte auf andere…</span>}
          {!selected && !revealed && <span className="text-white/20">Wähle deine Antwort</span>}
        </p>
        {canJoker && (
          <button onClick={() => { playJoker(); send({type:"use_joker"}); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.3)",color:"#fbbf24",boxShadow:"0 0 12px rgba(245,158,11,0.15)"}}>
            🃏 50/50 Joker
          </button>
        )}
        {jokerUsed && !revealed && <span className="text-xs text-white/20">🃏 Joker verwendet</span>}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {OPTIONS.map(opt => (
          <button key={opt} id={`ans-${opt}`} onClick={() => pick(opt)}
            disabled={!!selected || revealed || myElim.includes(opt)} className={btnCls(opt)}>
            <span className={`${LTR[opt]} w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0`}>
              {myElim.includes(opt) ? "✕" : opt}
            </span>
            <span className="flex-1 font-semibold text-sm leading-snug text-white/90">
              {myElim.includes(opt) ? <span className="text-white/20 line-through">{question.options[opt]}</span> : question.options[opt]}
            </span>
            {/* Answer count + correct indicator */}
            {revealed && opt===question.correct && (
              <span className="shrink-0 text-green-400 font-black text-lg">✓</span>
            )}
            {revealed && counts[opt] > 0 && (
              <span className="shrink-0 text-xs text-white/30 font-bold">{counts[opt]}×</span>
            )}
          </button>
        ))}
      </div>

      {/* Result */}
      {revealed && (
        <div className={`rounded-2xl border p-4 text-center fade-in ${
          selected===question.correct
            ?"border-green-500/30":"border-white/[0.07]"
        }`} style={selected===question.correct?{background:"rgba(34,197,94,0.08)",boxShadow:"0 0 30px rgba(34,197,94,0.08)"}:{background:"rgba(0,0,0,0.3)"}}>
          {selected===question.correct ? (
            <div>
              <p className="text-green-400 font-black text-lg">✓ Richtig!</p>
              <div className="flex items-center justify-center gap-3 mt-1">
                {state.config.blitzMode && myPts
                  ? <span className="text-green-300/70 text-sm">+{myPts} Pkt {myPts>=180?"⚡":myPts>=130?"🔥":""}</span>
                  : <span className="text-green-300/50 text-sm">+100 Punkte</span>}
                {state.config.streakBonus && myBonus && myBonus > 0 &&
                  <span className="text-amber-400 text-sm font-bold">+{myBonus} 🔥</span>}
              </div>
              {(me?.streak??0) >= 2 && <p className="text-amber-400 text-xs mt-1">{me!.streak}er Serie! 🔥</p>}
            </div>
          ) : selected ? (
            <div>
              <p className="text-red-400 font-bold">✗ Falsch</p>
              <p className="text-white/40 text-sm mt-1">Richtig: <span className="text-white/70 font-bold">{question.correct}: {question.options[question.correct]}</span></p>
            </div>
          ) : (
            <div>
              <p className="text-white/30 text-sm">⏱ Nicht geantwortet</p>
              <p className="text-white/40 text-xs mt-1">Richtig: <span className="text-white/60">{question.options[question.correct]}</span></p>
            </div>
          )}
          {advLeft !== null && <p className="text-white/15 text-xs mt-2">Weiter in {advLeft}s…</p>}
        </div>
      )}
    </div>
  );
}
