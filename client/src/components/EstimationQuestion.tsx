import { useEffect, useState } from "react";
import type { EstimationQuestion, GameState } from "../../../shared/types";
import type { QuizHook } from "../lib/useQuiz";

export default function EstimationView({ question, state, quiz }: {
  question: EstimationQuestion; state: GameState; quiz: QuizHook;
}) {
  const { playerId, send } = quiz;
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastId, setLastId] = useState(question.id);
  const [timeLeft, setTimeLeft] = useState(state.config.estimationTime);
  const [advLeft, setAdvLeft] = useState<number|null>(null);

  if (question.id !== lastId) { setInput(""); setSubmitted(false); setLastId(question.id); }

  const revealed = state.estimationRevealed;
  const answered = Object.keys(state.estimationAnswers).length;
  const total = state.players.length;
  const myResult = playerId ? state.estimationResults[playerId] : null;

  useEffect(() => {
    if (!state.mcTimerEnd || revealed) return;
    const tick = () => setTimeLeft(Math.max(0, Math.round((state.mcTimerEnd!-Date.now())/1000)));
    tick(); const iv = setInterval(tick,100); return ()=>clearInterval(iv);
  }, [state.mcTimerEnd, revealed]);

  useEffect(() => {
    if (!state.autoAdvanceAt || state.phase!=="answer_reveal") { setAdvLeft(null); return; }
    const tick = () => setAdvLeft(Math.max(0, Math.round((state.autoAdvanceAt!-Date.now())/1000)));
    tick(); const iv = setInterval(tick,200); return ()=>clearInterval(iv);
  }, [state.autoAdvanceAt, state.phase]);

  const handleSubmit = () => {
    const val = parseFloat(input.replace(",", "."));
    if (isNaN(val) || submitted || revealed) return;
    setSubmitted(true);
    send({ type: "estimation_answer", value: val });
  };

  const timerColor = timeLeft<=10?"#ef4444":timeLeft<=20?"#f59e0b":"#f59e0b";
  const pct = state.config.estimationTime>0?(timeLeft/state.config.estimationTime)*100:0;

  // Sort players by rank for reveal
  const sortedResults = Object.entries(state.estimationResults)
    .sort(([,a],[,b]) => a.rank - b.rank)
    .map(([pid, res]) => ({ pid, ...res, name: state.players.find(p=>p.id===pid)?.name ?? "?" }));

  return (
    <div className="flex flex-col gap-4">
      {/* Timer */}
      {!revealed && state.mcTimerEnd && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-[#444]">{answered}/{total} geantwortet</span>
            <span className="font-black text-xl tabular-nums" style={{color:timerColor}}>{timeLeft}<span className="text-xs font-normal text-[#444] ml-0.5">s</span></span>
          </div>
          <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-none" style={{width:`${pct}%`, background:timerColor}}/>
          </div>
        </div>
      )}

      {/* Input */}
      {!revealed && (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="number"
              value={input}
              onChange={e => !submitted && setInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && handleSubmit()}
              disabled={submitted}
              placeholder="Deine Schätzung eingeben…"
              className="w-full text-center text-3xl font-black bg-[#1a1a1a] border-2 border-[#2a2a2a] focus:border-amber-500/50 focus:outline-none rounded-2xl px-6 py-5 text-white placeholder:text-[#2a2a2a] placeholder:text-base placeholder:font-normal transition disabled:opacity-60"
            />
            {input && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#555] font-semibold">
                {question.unit}
              </div>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || submitted}
            className={`w-full py-3.5 rounded-2xl font-black text-base transition-all active:scale-[0.98] ${
              submitted ? "bg-[#1a1a1a] text-[#555] cursor-not-allowed"
              : input.trim() ? "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-900/30"
              : "bg-[#1a1a1a] text-[#333] cursor-not-allowed"
            }`}
          >
            {submitted ? `✓ ${parseFloat(input).toLocaleString("de-DE")} ${question.unit} abgegeben` : "Absenden →"}
          </button>
        </div>
      )}

      {/* Reveal */}
      {revealed && (
        <div className="space-y-3 fade-in">
          {/* Correct answer */}
          <div className="bg-amber-950/30 border border-amber-700/40 rounded-2xl p-4 text-center">
            <p className="text-xs text-amber-400/70 uppercase tracking-wider font-semibold mb-1">Richtige Antwort</p>
            <p className="text-3xl font-black text-amber-300">{question.answer.toLocaleString("de-DE")} <span className="text-base font-normal text-amber-400/60">{question.unit}</span></p>
          </div>

          {/* My result */}
          {myResult && (
            <div className={`rounded-2xl border p-3 text-center ${
              myResult.rank===1 ? "bg-green-950/30 border-green-700/40" : "bg-[#1a1a1a] border-[#222]"
            }`}>
              {myResult.rank===1
                ? <p className="text-green-400 font-black">🏆 Am nächsten dran! +{myResult.points} Punkte</p>
                : <p className="text-[#888] text-sm">Deine Schätzung: <span className="font-bold text-white">{myResult.answer.toLocaleString("de-DE")} {question.unit}</span> · Abstand: {myResult.distance.toLocaleString("de-DE")} · +{myResult.points} Pkt</p>
              }
            </div>
          )}
          {!myResult && !submitted && (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#161616] p-3 text-center text-[#444] text-sm">Nicht geantwortet – 0 Punkte</div>
          )}

          {/* All results */}
          <div className="space-y-1.5">
            {sortedResults.map((r,i) => (
              <div key={r.pid} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${r.pid===playerId?"border-amber-500/30 bg-amber-500/8":"border-[#1e1e1e] bg-[#161616]"}`}>
                <span className="text-base w-6 text-center shrink-0">{["🥇","🥈","🥉"][i]??`${i+1}.`}</span>
                <span className="font-semibold text-sm flex-1 text-[#ccc] truncate">{r.name}</span>
                <span className="text-xs text-[#444]">{r.answer.toLocaleString("de-DE")} {question.unit}</span>
                <span className="text-xs text-[#333]">±{r.distance.toLocaleString("de-DE")}</span>
                <span className="font-black text-sm text-amber-400 w-16 text-right">+{r.points} Pkt</span>
              </div>
            ))}
          </div>

          {advLeft!==null && <p className="text-center text-[#222] text-xs">Weiter in {advLeft}s…</p>}
        </div>
      )}
    </div>
  );
}
