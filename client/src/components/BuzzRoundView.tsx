import { useEffect, useState, useRef } from "react";
import type { FlagQuestion, BuzzerQuestion, LogoQuestion, GameState } from "../../../shared/types";
import type { QuizHook } from "../lib/useQuiz";
import { AvatarSVG } from "../lib/avatar";

function FlagImage({ code, size = 160 }: { code: string; size?: number }) {
  const [stage, setStage] = useState<"svg"|"png"|"fail">("svg");
  const lc = code.toLowerCase();
  let src: string;
  if (stage === "svg") src = `https://flagcdn.com/${lc}.svg`;
  else if (stage === "png") src = `https://flagcdn.com/w${size * 2}/${lc}.png`;
  else src = `https://flagsapi.com/${code.toUpperCase()}/flat/64.png`;
  return (
    <img src={src} alt={code}
      style={{ width: size, height: "auto", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
      onError={() => setStage(s => s === "svg" ? "png" : s === "png" ? "fail" : "fail")} />
  );
}

function LogoImage({ domain, size = 200 }: { domain: string; size?: number }) {
  const [stage, setStage] = useState<"google"|"ddg"|"fail">("google");
  if (stage === "fail") {
    return <div className="text-6xl">🏷️</div>;
  }
  const src = stage === "google"
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
    : `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  return (
    <div className="rounded-2xl p-6 flex items-center justify-center" style={{ background: "#ffffff", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>
      <img src={src} alt={domain}
        style={{ width: size * 0.45, height: size * 0.45, objectFit: "contain", imageRendering: stage==="ddg" ? "pixelated" : "auto" }}
        onError={() => setStage(s => s === "google" ? "ddg" : "fail")} />
    </div>
  );
}

// Formats reaction time as a competitive-feeling stat, e.g. "0.84s"
function fmtReaction(ms: number): string {
  return (ms / 1000).toFixed(2) + "s";
}

export default function BuzzRoundView({ question, state, quiz }: {
  question: FlagQuestion | BuzzerQuestion | LogoQuestion; state: GameState; quiz: QuizHook;
}) {
  const { playerId, send } = quiz;
  const isFlag = question.type === "flag";
  const isLogo = question.type === "logo";
  const [input, setInput] = useState("");
  const totalConfigTime = isFlag ? state.config.flagBuzzTime : isLogo ? state.config.logoTime : state.config.buzzerTime;
  const [mainLeft, setMainLeft] = useState(totalConfigTime);
  const [answerLeft, setAnswerLeft] = useState(15);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMyTurn = state.buzzCurrentBuzzer === playerId;
  const someoneAnswering = state.buzzCurrentBuzzer !== null;
  const isRevealed = state.phase === "answer_reveal";
  const mainTimerRunning = !!state.buzzMainTimerEnd && !someoneAnswering;

  useEffect(() => {
    if (!state.buzzMainTimerEnd) return;
    const tick = () => setMainLeft(Math.max(0, Math.round((state.buzzMainTimerEnd! - Date.now()) / 1000)));
    tick(); const iv = setInterval(tick, 100); return () => clearInterval(iv);
  }, [state.buzzMainTimerEnd]);

  useEffect(() => {
    if (!state.buzzAnswerTimerEnd) return;
    const tick = () => setAnswerLeft(Math.max(0, Math.round((state.buzzAnswerTimerEnd! - Date.now()) / 1000)));
    tick(); const iv = setInterval(tick, 100); return () => clearInterval(iv);
  }, [state.buzzAnswerTimerEnd]);

  useEffect(() => {
    if (isMyTurn && inputRef.current) { setInput(""); inputRef.current.focus(); }
  }, [isMyTurn]);

  const handleBuzz = () => { if (!someoneAnswering && mainTimerRunning) send({ type: "buzz_press" }); };
  const handleAnswer = () => {
    if (!input.trim() || !isMyTurn) return;
    send({ type: "buzz_answer", value: input.trim() });
    setInput("");
  };

  const remaining = state.buzzTimerRemaining / 1000;
  const displayTime = mainTimerRunning ? mainLeft : Math.ceil(remaining);
  const mainPct = totalConfigTime > 0
    ? (mainTimerRunning ? mainLeft / totalConfigTime : remaining / totalConfigTime) * 100
    : 0;
  const timerColor = displayTime <= 10 ? "#ef4444" : displayTime <= 20 ? "#f59e0b" : "#8b5cf6";
  const answerPct = (answerLeft / 15) * 100;
  const currentBuzzerPlayer = state.players.find(p => p.id === state.buzzCurrentBuzzer);
  const attempts = state.buzzAttemptLog;

  const accentColor = isFlag ? "#ef4444" : isLogo ? "#eab308" : "#06b6d4";
  const accentGradFrom = isFlag ? "#ef4444" : isLogo ? "#eab308" : "#06b6d4";
  const accentGradTo = isFlag ? "#b91c1c" : isLogo ? "#a16207" : "#0e7490";
  const accentShadow = isFlag ? "#7f1d1d" : isLogo ? "#713f12" : "#164e63";

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto">

      {/* Main timer */}
      {!isRevealed && (
        <div className="w-full">
          <div className="flex justify-between items-center mb-1.5 text-xs">
            <span className="text-white/30">{someoneAnswering ? "⏸ Timer pausiert" : "Buzzern zum Antworten!"}</span>
            <span className="font-black tabular-nums" style={{ color: timerColor, opacity: someoneAnswering ? 0.4 : 1 }}>
              {displayTime}s
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-none" style={{
              width: `${mainPct}%`,
              background: someoneAnswering ? "rgba(139,92,246,0.3)" : timerColor,
              boxShadow: someoneAnswering ? "none" : `0 0 10px ${timerColor}88`
            }} />
          </div>
        </div>
      )}

      {/* Visual: flag/logo image OR (for buzzer) a glowing badge since question text is already shown above */}
      {!isRevealed && (
        <div className="relative py-2 float">
          {isFlag ? (
            <FlagImage code={(question as FlagQuestion).code} size={240} />
          ) : isLogo ? (
            <LogoImage domain={(question as LogoQuestion).domain} size={220} />
          ) : (
            <div className="w-32 h-32 rounded-full flex items-center justify-center text-6xl"
              style={{ background: `radial-gradient(circle,${accentColor}22 0%,transparent 70%)`, border: `2px solid ${accentColor}35` }}>
              🔔
            </div>
          )}
        </div>
      )}

      {/* Someone is answering */}
      {someoneAnswering && !isRevealed && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              {currentBuzzerPlayer && (
                <>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: (currentBuzzerPlayer.avatar?.bodyColor || "#8b5cf6") + "25" }}>
                    <AvatarSVG config={currentBuzzerPlayer.avatar || { bodyColor: "#8b5cf6", hair: 1, eyes: 0, mouth: 0 }} size={28} />
                  </div>
                  <span className="font-bold text-sm" style={{ color: currentBuzzerPlayer.avatar?.bodyColor || "#c4b5fd" }}>
                    {isMyTurn ? "Du bist dran!" : `${currentBuzzerPlayer.name} antwortet…`}
                  </span>
                </>
              )}
            </div>
            <span className="font-black text-xl tabular-nums"
              style={{ color: answerLeft <= 5 ? "#ef4444" : "#f59e0b", textShadow: answerLeft <= 5 ? "0 0 12px #ef444488" : "none" }}>
              {answerLeft}s
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-none"
              style={{ width: `${answerPct}%`, background: answerLeft <= 5 ? "#ef4444" : "#f59e0b" }} />
          </div>
          {isMyTurn && (
            <div className="flex gap-2 fade-in">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAnswer()}
                placeholder={isFlag ? "Land eingeben…" : isLogo ? "Marke eingeben…" : "Antwort eingeben…"} autoFocus
                className="flex-1 px-4 py-3.5 rounded-xl text-base font-semibold outline-none text-white"
                style={{ background: `${accentColor}1f`, border: `2px solid ${accentColor}70`, boxShadow: `0 0 20px ${accentColor}25` }} />
              <button onClick={handleAnswer} disabled={!input.trim()}
                className="px-6 rounded-xl font-black text-base disabled:opacity-30 active:scale-95 transition-all"
                style={{ background: `linear-gradient(135deg,${accentGradFrom},${accentGradTo})`, boxShadow: `0 4px 20px ${accentColor}70` }}>
                →
              </button>
            </div>
          )}
          {!isMyTurn && <p className="text-center text-white/25 text-sm">Warte – du kannst danach buzzern</p>}
        </div>
      )}

      {/* BUZZ button */}
      {!someoneAnswering && !isRevealed && (
        <button onClick={handleBuzz}
          className="relative overflow-hidden transition-all active:scale-90"
          style={{
            width: 150, height: 150, borderRadius: "50%",
            background: `radial-gradient(circle at 40% 35%,${accentGradFrom},${accentGradTo})`,
            boxShadow: `0 6px 0 ${accentShadow},0 10px 40px ${accentColor}80,inset 0 2px 0 rgba(255,255,255,0.2)`,
            transform: "perspective(200px) rotateX(4deg)"
          }}>
          <div className="absolute inset-2 rounded-full" style={{ background: "radial-gradient(circle at 40% 30%,rgba(255,255,255,0.18),transparent)" }} />
          <span className="relative z-10 font-black text-white text-xl tracking-wide">BUZZ!</span>
        </button>
      )}

      {/* Attempt history – chronological, with reaction time per attempt */}
      {attempts.length > 0 && !isRevealed && (
        <div className="w-full space-y-1.5">
          <p className="text-xs text-white/25 text-center uppercase tracking-wider">Buzz-Verlauf</p>
          {attempts.map((a, i) => {
            const p = state.players.find(p => p.id === a.playerId);
            if (!p) return null;
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <AvatarSVG config={p.avatar || { bodyColor: "#8b5cf6", hair: 1, eyes: 0, mouth: 0 }} size={22} />
                <span className="text-sm text-white/60 flex-1">{p.name}</span>
                <span className="text-[11px] text-white/25 font-mono tabular-nums">{fmtReaction(a.reactionMs)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-lg font-bold ${a.result === "correct" ? "text-green-400 bg-green-950/30" : a.result === "wrong" ? "text-red-400/70 bg-red-950/20" : "text-white/25 bg-white/[0.05]"}`}>
                  {a.result === "correct" ? "✓" : a.result === "wrong" ? "✗" : "⏱"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Reveal – always show answer prominently, plus winning reaction time */}
      {isRevealed && (
        <div className="w-full flex flex-col items-center gap-4 fade-in">
          {isFlag ? (
            <div className="relative">
              <FlagImage code={(question as FlagQuestion).code} size={260} />
              {state.buzzWinnerId && <div className="absolute -top-3 -right-3 text-3xl pop-in">🏆</div>}
            </div>
          ) : isLogo ? (
            <div className="relative">
              <LogoImage domain={(question as LogoQuestion).domain} size={240} />
              {state.buzzWinnerId && <div className="absolute -top-3 -right-3 text-3xl pop-in">🏆</div>}
            </div>
          ) : (
            <div className="text-6xl pop-in">{state.buzzWinnerId ? "🏆" : "🔔"}</div>
          )}
          <p className="text-3xl font-black text-white text-center">{question.answer}</p>
          <div className={`w-full px-5 py-4 rounded-2xl border text-center ${state.buzzWinnerId ? "border-green-500/30 bg-green-950/15" : "border-white/[0.07] bg-white/[0.02]"}`}>
            {state.buzzWinnerId ? (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <AvatarSVG config={state.players.find(p=>p.id===state.buzzWinnerId)?.avatar || {bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={26}/>
                <p className="text-green-400 font-black text-lg">
                  {state.players.find(p => p.id === state.buzzWinnerId)?.name} hatte es richtig!
                </p>
                {state.blitzPoints[state.buzzWinnerId] && (
                  <span className="text-green-300 font-bold">+{state.blitzPoints[state.buzzWinnerId]} Pkt</span>
                )}
                {(() => {
                  const winAttempt = [...attempts].reverse().find(a => a.playerId === state.buzzWinnerId && a.result === "correct");
                  return winAttempt ? (
                    <span className="text-white/30 text-xs font-mono">⚡ {fmtReaction(winAttempt.reactionMs)}</span>
                  ) : null;
                })()}
              </div>
            ) : (
              <p className="text-white/40 font-bold">⏱ Zeit abgelaufen – niemand hat's gewusst!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
