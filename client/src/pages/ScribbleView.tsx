import { useEffect, useRef, useState, useCallback } from "react";
import type { QuizHook } from "../lib/useQuiz";
import type { ScribbleStroke } from "../../../shared/types";
import { AvatarSVG } from "../lib/avatar";

const COLORS = ["#ffffff","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#000000","#6b7280"];
const WIDTHS = [2, 5, 10, 18];

export default function ScribbleView({ quiz }: { quiz: QuizHook }) {
  const { state, playerId, send } = quiz;
  if (!state) return null;
  const isHost = state.hostId === playerId;
  const isDrawer = state.scribbleDrawerId === playerId;
  const isRevealed = state.phase === "answer_reveal";
  const isFinished = state.phase === "finished";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [width, setWidth] = useState(5);
  const [guess, setGuess] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const currentStroke = useRef<{x:number;y:number}[]>([]);
  const lastIdx = useRef(0);

  useEffect(() => {
    if (!state.scribbleTimerEnd) return;
    const tick = () => setTimeLeft(Math.max(0, Math.round((state.scribbleTimerEnd! - Date.now()) / 1000)));
    tick(); const iv = setInterval(tick, 200); return () => clearInterval(iv);
  }, [state.scribbleTimerEnd]);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, s: ScribbleStroke) => {
    if (s.points.length < 2) return;
    ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = s.width;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const strokes = state.scribbleStrokes;
    if (strokes.length < lastIdx.current) {
      ctx.clearRect(0, 0, canvas.width, canvas.height); lastIdx.current = 0;
    }
    for (let i = lastIdx.current; i < strokes.length; i++) drawStroke(ctx, strokes[i]);
    lastIdx.current = strokes.length;
  }, [state.scribbleStrokes, drawStroke]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [state.scribbleGuessLog]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width, sy = canvas.height / r.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy };
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || isRevealed) return; e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const pos = getPos(e, canvas);
    currentStroke.current = [pos]; setDrawing(true);
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || !isDrawer || isRevealed) return; e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const pos = getPos(e, canvas); currentStroke.current.push(pos);
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  };
  const handleEnd = () => {
    if (!drawing || !isDrawer) return; setDrawing(false);
    const pts = currentStroke.current; if (pts.length < 2) return;
    send({ type: "scribble_draw", stroke: { points: pts, color, width } });
    currentStroke.current = [];
  };
  const handleGuess = () => {
    if (!guess.trim() || isDrawer) return;
    send({ type: "scribble_guess", text: guess.trim() }); setGuess("");
  };
  const handleClear = () => {
    send({ type: "scribble_clear" });
    const canvas = canvasRef.current;
    if (canvas) { canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); lastIdx.current = 0; }
  };

  const totalTurns = state.scribbleTurnOrder.length * state.scribbleConfig.roundsPerPlayer;
  const turnsDone = state.scribbleRoundNumber * state.scribbleTurnOrder.length + state.scribbleTurnIdx;
  const pct = totalTurns > 0 ? (turnsDone / totalTurns) * 100 : 0;
  const timerPct = state.scribbleConfig.drawTime > 0 ? (timeLeft / state.scribbleConfig.drawTime) * 100 : 0;
  const timerColor = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "#f97316";
  const drawerPlayer = state.players.find(p => p.id === state.scribbleDrawerId);
  const alreadyGuessed = state.scribbleCorrectGuessers.includes(playerId || "");

  if (isFinished) {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen relative z-10 flex flex-col items-center justify-center gap-5 p-5">
        <div className="text-5xl pop-in">🎨</div>
        <h2 className="text-2xl font-black text-white">Scribble beendet!</h2>
        <div className="w-full max-w-md glass rounded-3xl p-5 space-y-2">
          {sorted.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl" style={{background:"rgba(255,255,255,0.04)"}}>
              <span className="text-lg w-6 text-center">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}</span>
              <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={28}/>
              <span className="font-bold flex-1 text-sm" style={{color:p.avatar?.bodyColor||"#c4b5fd"}}>{p.name}</span>
              <span className="font-black text-white">{p.score}</span>
            </div>
          ))}
        </div>
        <div className="w-full max-w-md glass rounded-3xl p-4">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-2 text-center">Runden-Rückblick</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {state.scribbleRoundHistory.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded-lg" style={{background:"rgba(255,255,255,0.03)"}}>
                <span className="text-white/30">{i+1}.</span>
                <span className="font-bold text-white/80">{r.word}</span>
                <span className="text-white/25">von {r.drawerName}</span>
                <span className="ml-auto text-white/40">{r.correctGuesserIds.length} erraten</span>
              </div>
            ))}
          </div>
        </div>
        {isHost
          ? <button onClick={() => send({type:"end_scribble"})} className="btn-primary px-8 py-4 rounded-2xl text-lg">🎨 Zurück zur Lobby</button>
          : <p className="text-white/20 pulse-slow text-sm">Warte auf den Host…</p>}
      </div>
    );
  }

  if (state.phase === "countdown") {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 relative z-10">
        <div className="text-6xl float">🎨</div>
        <h2 className="text-3xl font-black text-white">Scribble startet!</h2>
        <p className="text-white/30 text-sm">{totalTurns} Runden insgesamt · {state.players.length} Spieler</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden relative z-10">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-3 py-2 shrink-0"
        style={{background:"rgba(7,7,16,0.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div className="flex-1 min-w-0">
          <div className="h-1 rounded-full overflow-hidden mb-1" style={{background:"rgba(255,255,255,0.06)"}}>
            <div className="h-full rounded-full" style={{width:`${pct}%`,background:"linear-gradient(90deg,#f97316,#ec4899)"}}/>
          </div>
          <p className="text-[10px] text-white/30 truncate">
            {isDrawer
              ? `✏️ Du zeichnest: "${state.scribbleWord}" (${state.scribbleWordLength} Buchstaben)`
              : isRevealed
              ? `🎨 Gesuchtes Wort: ${state.scribbleRevealedWord}`
              : drawerPlayer
              ? `${drawerPlayer.name} zeichnet ·  ${"_ ".repeat(state.scribbleWordLength).trim()}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="tabular-nums font-black text-sm" style={{color:timerColor}}>{timeLeft}s</span>
          {isHost && !isRevealed && (
            <button onClick={() => send({type:"scribble_skip"})}
              className="text-[10px] px-2 py-1 rounded-lg text-white/25 hover:text-amber-400 transition border border-white/[0.06] hover:border-amber-400/30">
              Skip ⏭
            </button>
          )}
        </div>
      </div>
      <div className="h-1.5 shrink-0" style={{background:"rgba(255,255,255,0.06)"}}>
        <div className="h-full transition-none" style={{width:`${timerPct}%`,background:timerColor,boxShadow:`0 0 8px ${timerColor}88`}}/>
      </div>

      {/* Main: Canvas + Chat */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0">
        {/* Canvas column */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex-1 rounded-2xl overflow-hidden relative min-h-0"
            style={{background:"#1a1a2e",border:"1px solid rgba(255,255,255,0.08)"}}>
            <canvas ref={canvasRef} width={800} height={520}
              style={{width:"100%",height:"100%",cursor:isDrawer&&!isRevealed?"crosshair":"default",touchAction:"none"}}
              onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
              onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}/>
            {isRevealed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 fade-in"
                style={{background:"rgba(7,7,16,0.8)"}}>
                <div className="text-4xl">{state.scribbleCorrectGuessers.length > 0 ? "🎉" : "😅"}</div>
                <p className="text-3xl font-black text-white">{state.scribbleRevealedWord}</p>
                <p className="text-white/40 text-sm">
                  {state.scribbleCorrectGuessers.length === 0
                    ? "Niemand hat's erraten"
                    : `${state.scribbleCorrectGuessers.length} Spieler haben es erraten`}
                </p>
                <p className="text-white/20 text-xs pulse-slow">Nächste Runde…</p>
              </div>
            )}
            {alreadyGuessed && !isRevealed && !isDrawer && (
              <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
                <div className="px-4 py-2 rounded-xl text-sm font-bold text-green-300 fade-in"
                  style={{background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)"}}>
                  ✅ Richtig! Warte auf die anderen…
                </div>
              </div>
            )}
          </div>
          {/* Drawing tools */}
          {isDrawer && !isRevealed && (
            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-2xl flex-wrap"
              style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className="rounded-full transition-all active:scale-90"
                    style={{width:22,height:22,background:c,
                      boxShadow:color===c?`0 0 0 2.5px #fff,0 0 0 4px ${c}`:"0 1px 3px rgba(0,0,0,0.5)",
                      transform:color===c?"scale(1.2)":"scale(1)"}}/>
                ))}
              </div>
              <div className="w-px h-5 shrink-0" style={{background:"rgba(255,255,255,0.1)"}}/>
              <div className="flex items-center gap-1.5">
                {WIDTHS.map(w => (
                  <button key={w} onClick={() => setWidth(w)}
                    className="rounded-full flex items-center justify-center"
                    style={{width:w*2+10,height:w*2+10,background:width===w?"rgba(249,115,22,0.4)":"rgba(255,255,255,0.06)",minWidth:18,minHeight:18}}>
                    <div className="rounded-full" style={{width:Math.min(w,10),height:Math.min(w,10),background:"white"}}/>
                  </button>
                ))}
              </div>
              <div className="w-px h-5 shrink-0" style={{background:"rgba(255,255,255,0.1)"}}/>
              <button onClick={handleClear}
                className="text-xs font-bold text-white/30 hover:text-red-400 transition px-2 py-1 rounded-lg"
                style={{background:"rgba(239,68,68,0.07)"}}>🗑</button>
            </div>
          )}
        </div>

        {/* Chat column */}
        <div className="w-44 shrink-0 flex flex-col gap-2 min-h-0">
          {/* Scores */}
          <div className="glass rounded-2xl p-2.5 space-y-1.5 shrink-0">
            {[...state.players].sort((a,b)=>b.score-a.score).map(p => {
              const col = p.avatar?.bodyColor || "#8b5cf6";
              const hasGuessed = state.scribbleCorrectGuessers.includes(p.id);
              const isThisDrawer = p.id === state.scribbleDrawerId;
              return (
                <div key={p.id} className="flex items-center gap-1.5">
                  <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={18}/>
                  <span className="text-[11px] font-semibold flex-1 truncate" style={{color:col}}>
                    {p.name}{isThisDrawer?" ✏️":""}
                  </span>
                  {hasGuessed && !isThisDrawer && <span className="text-green-400 text-[10px]">✓</span>}
                  <span className="text-[11px] font-black text-white/60 tabular-nums">{p.score}</span>
                </div>
              );
            })}
          </div>
          {/* Chat */}
          <div ref={chatRef} className="flex-1 glass rounded-2xl p-2 overflow-y-auto min-h-0">
            {state.scribbleGuessLog.length === 0
              ? <p className="text-[10px] text-white/15 text-center py-4">Chat leer</p>
              : state.scribbleGuessLog.map((entry, i) => {
                  const p = state.players.find(p => p.id === entry.playerId);
                  const col = p?.avatar?.bodyColor || "#c4b5fd";
                  return (
                    <div key={i} className="mb-1.5 break-words">
                      <span className="text-[10px] font-bold" style={{color:col}}>{entry.playerName}: </span>
                      <span className={`text-[10px] ${entry.correct?"text-green-400 font-bold":"text-white/50"}`}>{entry.text}</span>
                    </div>
                  );
                })
            }
          </div>
          {/* Input */}
          {!isDrawer && !isRevealed && !alreadyGuessed && (
            <div className="shrink-0 flex gap-1">
              <input value={guess} onChange={e=>setGuess(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleGuess()}
                placeholder="Raten…" maxLength={40} autoComplete="off"
                className="flex-1 min-w-0 px-2 py-2 rounded-xl text-[11px] outline-none text-white font-semibold"
                style={{background:"rgba(249,115,22,0.12)",border:"1px solid rgba(249,115,22,0.3)"}}/>
              <button onClick={handleGuess} disabled={!guess.trim()}
                className="shrink-0 px-2 py-2 rounded-xl font-black text-xs text-white disabled:opacity-30"
                style={{background:"linear-gradient(135deg,#f97316,#ec4899)"}}>→</button>
            </div>
          )}
          {isDrawer && !isRevealed && (
            <p className="text-[10px] text-white/20 text-center shrink-0 py-1">Du zeichnest gerade</p>
          )}
        </div>
      </div>
    </div>
  );
}
