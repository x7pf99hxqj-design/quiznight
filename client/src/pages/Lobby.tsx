import { useEffect, useState } from "react";
import type { QuizHook } from "../lib/useQuiz";
import type { QuizConfig, DuelConfig, DuelTeamId } from "../../../shared/types";
import { AvatarSVG } from "../lib/avatar";
import { lobbyMusic } from "../lib/lobbyMusic";
import { RANKING_QUESTIONS } from "../../../shared/rankings";

const CAT_ICONS: Record<string,string> = {
  "Sport":"🏆","Essen & Trinken":"🍕","Film & Serien":"🎬","Musik":"🎵",
  "Geografie":"🌍","Geschichte":"📜","Wissenschaft & Natur":"🔬","Technik & Gaming":"💻",
  "Natur & Tiere":"🦁","Politik & Gesellschaft":"🏛️","Promis & Persönlichkeiten":"⭐",
  "Länder & Flaggen":"🚩","Kurioses & Rekorde":"🎪",
};
const TEAM_COLOR: Record<DuelTeamId,string> = { A:"#ef4444", B:"#3b82f6" };
const TEAM_LABEL: Record<DuelTeamId,string> = { A:"🔴 Team Rot", B:"🔵 Team Blau" };
const TEAM_EMOJI: Record<DuelTeamId,string> = { A:"🔴", B:"🔵" };

function Slider({ label, value, min, max, unit, onChange, disabled }: {
  label:string; value:number; min:number; max:number; unit:string;
  onChange:(v:number)=>void; disabled:boolean;
}) {
  const pct = ((value-min)/(max-min))*100;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs text-white/40">{label}</span>
        <span className="font-black text-white text-xl tabular-nums">{value}<span className="text-xs font-normal text-white/25 ml-0.5">{unit}</span></span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute w-full h-1 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.08)"}}>
          <div className="h-full rounded-full" style={{width:`${pct}%`,background:"linear-gradient(90deg,#8b5cf6,#a78bfa)",boxShadow:"0 0 8px rgba(139,92,246,0.6)"}}/>
        </div>
        <div className="absolute w-4 h-4 rounded-full pointer-events-none" style={{left:`calc(${pct}% - 8px)`,background:"linear-gradient(180deg,#c4b5fd,#8b5cf6)",boxShadow:"0 0 12px rgba(139,92,246,0.6),0 2px 4px rgba(0,0,0,0.4)"}}/>
        <input type="range" min={min} max={max} value={value} disabled={disabled}
          onChange={e=>onChange(Number(e.target.value))} className="absolute w-full opacity-0 cursor-pointer h-5"/>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle, disabled }: { on:boolean; onToggle:()=>void; disabled:boolean }) {
  return <div onClick={()=>!disabled&&onToggle()} className={`toggle-track${on?" on":""} ${disabled?"opacity-30 cursor-not-allowed":""}`}><div className="toggle-thumb"/></div>;
}

export default function Lobby({ quiz }: { quiz: QuizHook }) {
  const { state, playerId, send } = quiz;
  const [musicOn, setMusicOn] = useState(() => {
    try { return localStorage.getItem("quiznight_music") !== "off"; } catch { return true; }
  });

  useEffect(() => {
    const saved = localStorage.getItem("quiznight_music");
    if (saved !== "off") {
      const t = setTimeout(() => { lobbyMusic.start(); setMusicOn(true); }, 600);
      return () => { clearTimeout(t); lobbyMusic.stop(); };
    }
    return () => lobbyMusic.stop();
  }, []);

  const toggleMusic = () => {
    if (musicOn) {
      lobbyMusic.stop(); setMusicOn(false);
      try { localStorage.setItem("quiznight_music", "off"); } catch {}
    } else {
      lobbyMusic.start(); setMusicOn(true);
      try { localStorage.removeItem("quiznight_music"); } catch {}
    }
  };

  const [tab, setTab] = useState<"normal"|"duel"|"scribble">("normal");

  if (!state) return null;
  const isHost = state.hostId === playerId;
  const cfg = state.config, cats = state.availableCategories, sel = cfg.selectedCategories;
  const upd = (p: Partial<QuizConfig>) => send({ type:"update_config", config:{...cfg,...p} });

  const dcfg = state.duelConfig;
  const updDuel = (p: Partial<DuelConfig>) => send({ type:"update_duel_config", config:{...dcfg,...p} });
  const assignTeam = (pid: string, team: DuelTeamId) => send({ type:"assign_team", targetPlayerId:pid, team });
  const chooseTeam = (team: DuelTeamId) => send({ type:"choose_team", team });
  const autoSplit = () => {
    const unassigned = state.players.filter(p => !state.duelTeamA.includes(p.id) && !state.duelTeamB.includes(p.id));
    unassigned.forEach((p, i) => assignTeam(p.id, i % 2 === 0 ? "A" : "B"));
  };
  const shuffleAllTeams = () => {
    // Mischt ALLE Spieler neu durch – unabhängig von der aktuellen Zuteilung,
    // nützlich z.B. für ein Rematch mit neuen Teams.
    const shuffled = [...state.players].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    shuffled.forEach((p, i) => assignTeam(p.id, i < half ? "A" : "B"));
  };
  const teamACanStart = state.duelTeamA.length > 0 && state.duelTeamB.length > 0;
  const scfg = state.scribbleConfig;
  const updScribble = (p: Partial<typeof scfg>) => send({ type:"update_scribble_config", config:{...scfg,...p} });
  const duelWins = { A: state.duelMatchHistory.filter(m=>m.winner==="A").length, B: state.duelMatchHistory.filter(m=>m.winner==="B").length };

  const toggleCat = (cat: string) => {
    if (sel.length === 0) {
      upd({ selectedCategories: cats.filter(c => c !== cat) });
    } else if (sel.includes(cat)) {
      const next = sel.filter(c => c !== cat);
      upd({ selectedCategories: next.length === 0 ? [] : next });
    } else {
      const next = [...sel, cat];
      upd({ selectedCategories: next.length === cats.length ? [] : next });
    }
  };

  const totalQ = cfg.questionCount + cfg.estimationCount + (cfg.selectedRankingIds||[]).length + cfg.flagCount + cfg.buzzerCount + cfg.logoCount;
  const totalSec = cfg.questionCount*cfg.timePerQuestion + cfg.estimationCount*cfg.estimationTime
    + (cfg.selectedRankingIds||[]).length*120 + cfg.flagCount*cfg.flagBuzzTime + cfg.buzzerCount*cfg.buzzerTime + cfg.logoCount*cfg.logoTime;
  const dur = totalSec>=60?`${Math.floor(totalSec/60)}m ${totalSec%60>0?totalSec%60+"s":""}`:totalSec>0?`${totalSec}s`:"–";

  return (
    <div className="min-h-screen relative z-10">
      <div className="max-w-6xl mx-auto p-5 grid lg:grid-cols-[320px_1fr] gap-5 min-h-screen pb-10">

        {/* ── LEFT ── */}
        <div className="flex flex-col gap-4">
          {/* Code */}
          <div className="glass rounded-3xl p-6 text-center pop-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] text-white/25 uppercase tracking-widest">Session-Code</p>
              <button onClick={toggleMusic}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${musicOn?"border-[#8b5cf6]/50 bg-[#8b5cf6]/15 text-[#c4b5fd]":"border-white/[0.08] text-white/25 hover:text-white/50"}`}>
                {musicOn?"🔊 Musik":"🔇 Musik"}
              </button>
            </div>
            <div className="flex gap-2 justify-center mb-3">
              {state.sessionCode.split('').map((c,i)=>(
                <div key={i} className="code-letter">{c}</div>
              ))}
            </div>
            <p className="text-white/15 text-xs">Teile diesen Code</p>
          </div>

          {/* Players */}
          <div className="glass rounded-3xl p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Spieler</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{background:"rgba(139,92,246,0.2)",color:"#c4b5fd",border:"1px solid rgba(139,92,246,0.3)"}}>{state.players.length}</span>
            </div>
            <div className="space-y-2">
              {state.players.map(p => {
                const col = p.avatar?.bodyColor || "#8b5cf6";
                return (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all"
                    style={p.id===playerId?{background:`${col}12`,borderColor:`${col}35`}:{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.06)"}}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{background:`${col}20`,border:`1px solid ${col}35`}}>
                      <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={36}/>
                    </div>
                    <span className="font-bold text-sm flex-1 truncate" style={{color:col}}>{p.name}</span>
                    {p.isHost&&<span className="text-base">👑</span>}
                    {isHost && !p.isHost && (
                      <button onClick={()=>{ if(confirm(`${p.name} aus der Lobby entfernen?`)) send({type:"kick_player",targetPlayerId:p.id}); }}
                        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs"
                        title="Spieler entfernen">
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
              {state.players.length<2&&<p className="text-center text-white/15 text-xs py-3 pulse-slow">Warte auf Mitspieler…</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="glass rounded-2xl p-4 grid grid-cols-2 gap-3">
            {[["Fragen",totalQ.toString()],["Dauer",dur]].map(([l,v])=>(
              <div key={l} className="text-center p-3 rounded-xl" style={{background:"rgba(0,0,0,0.25)"}}>
                <p className="text-xl font-black text-white">{v||"–"}</p>
                <p className="text-[10px] text-white/25 uppercase tracking-wider">{l}</p>
              </div>
            ))}
          </div>

          {/* Session-Scoreboard – Gesamtpunkte über alle gespielten Runden dieser Lobby */}
          {state.sessionRoundsPlayed > 0 && (
            <div className="glass rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">🏆 Session-Tabelle</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white/30" style={{background:"rgba(255,255,255,0.05)"}}>
                  {state.sessionRoundsPlayed} {state.sessionRoundsPlayed===1?"Runde":"Runden"}
                </span>
              </div>
              <div className="space-y-1.5">
                {[...state.players]
                  .sort((a,b)=>(state.sessionScores[b.id]??0)-(state.sessionScores[a.id]??0))
                  .map((p,i) => {
                    const col = p.avatar?.bodyColor || "#8b5cf6";
                    const pts = state.sessionScores[p.id] ?? 0;
                    return (
                      <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl" style={{background:"rgba(255,255,255,0.02)"}}>
                        <span className="text-xs w-4 text-center text-white/20 font-bold">{i+1}</span>
                        <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={20}/>
                        <span className="text-xs font-semibold flex-1 truncate" style={{color:col}}>{p.name}</span>
                        <span className="text-sm font-black text-white">{pts}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div className="flex flex-col gap-4">
          {/* Tab Switcher */}
          <div className="flex gap-1.5 p-1.5 rounded-2xl slide-up" style={{background:"rgba(0,0,0,0.25)",border:"1px solid rgba(255,255,255,0.06)"}}>
            <button onClick={()=>setTab("normal")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab==="normal"?"bg-[#8b5cf6] text-white":"text-white/30 hover:text-white/50"}`}
              style={tab==="normal"?{boxShadow:"0 4px 16px rgba(139,92,246,0.4)"}:{}}>
              🎮 Quiz
            </button>
            <button onClick={()=>setTab("duel")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all relative ${tab==="duel"?"bg-gradient-to-r from-red-500 to-blue-500 text-white":"text-white/30 hover:text-white/50"}`}
              style={tab==="duel"?{boxShadow:"0 4px 16px rgba(239,68,68,0.3)"}:{}}>
              ⚔️ Duell
              {state.duelMatchHistory.length>0 && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] w-5 h-5 rounded-full bg-amber-500 text-black font-black flex items-center justify-center">{state.duelMatchHistory.length}</span>
              )}
            </button>
            <button onClick={()=>setTab("scribble")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab==="scribble"?"text-white":"text-white/30 hover:text-white/50"}`}
              style={tab==="scribble"?{background:"linear-gradient(135deg,#f97316,#ec4899)",boxShadow:"0 4px 16px rgba(249,115,22,0.3)"}:{}}>
              🎨 Scribble
            </button>
          </div>

          {tab === "normal" && <>
          <div className="flex items-center gap-3 slide-up pt-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{background:"rgba(139,92,246,0.15)",border:"1px solid rgba(139,92,246,0.2)"}}>⚡</div>
            <h2 className="font-black text-2xl text-gradient" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Spielkonfiguration</h2>
          </div>

          {/* Categories */}
          <div className="glass rounded-3xl p-5 slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-white/50 uppercase tracking-wider">🏷️ Kategorien</h3>
              {isHost&&<div className="flex gap-4 text-xs">
                <button onClick={()=>upd({selectedCategories:[]})} className="text-[#8b5cf6] hover:text-[#c4b5fd] font-semibold transition">Alle</button>
                <button onClick={()=>upd({selectedCategories:cats.slice(0,1)})} className="text-white/25 hover:text-white/50 font-semibold transition">Keine</button>
              </div>}
            </div>
            <div className="flex flex-wrap gap-2">
              {cats.map(cat => {
                const active = sel.length===0||sel.includes(cat);
                return (
                  <button key={cat} onClick={()=>isHost&&toggleCat(cat)} disabled={!isHost}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${isHost?"cursor-pointer":""} ${active?"cat-active":"cat-inactive hover:border-white/15 hover:text-white/35"}`}>
                    {CAT_ICONS[cat]??"📚"} {cat}
                  </button>
                );
              })}
            </div>
            <p className="text-white/15 text-[10px] mt-3">
              {sel.length===0?"Alle Kategorien aktiv":`${sel.length} von ${cats.length} aktiv`}
            </p>
          </div>

          {/* Settings grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider">🎯 ABCD Quiz</h3>
              <Slider label="Fragen" value={cfg.questionCount} min={0} max={100} unit=" Fragen" onChange={v=>upd({questionCount:v})} disabled={!isHost}/>
              <Slider label="Zeit" value={cfg.timePerQuestion} min={0} max={60} unit="s" onChange={v=>upd({timePerQuestion:v})} disabled={!isHost}/>
            </div>
            <div className="glass rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider">🎲 Schätzfragen</h3>
              <Slider label="Fragen" value={cfg.estimationCount} min={0} max={100} unit=" Fragen" onChange={v=>upd({estimationCount:v})} disabled={!isHost}/>
              {cfg.estimationCount>0&&<Slider label="Zeit" value={cfg.estimationTime} min={0} max={60} unit="s" onChange={v=>upd({estimationTime:v})} disabled={!isHost}/>}
              {cfg.estimationCount===0&&<p className="text-white/15 text-xs">0 = deaktiviert</p>}
            </div>
            <div className="glass rounded-3xl p-5 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider">📊 Ranking-Listen auswählen</h3>
                {isHost&&<div className="flex gap-3 text-xs">
                  <button onClick={()=>upd({selectedRankingIds:RANKING_QUESTIONS.map(r=>r.id)})} className="text-[#8b5cf6] font-semibold">Alle</button>
                  <button onClick={()=>upd({selectedRankingIds:[]})} className="text-white/25 font-semibold">Keine</button>
                </div>}
              </div>
              {(cfg.selectedRankingIds||[]).length>0&&<p className="text-white/25 text-xs">{(cfg.selectedRankingIds||[]).length} Listen ausgewählt – kommen in zufälliger Reihenfolge</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {RANKING_QUESTIONS.map(r=>{
                  const sel=(cfg.selectedRankingIds||[]).includes(r.id);
                  return(
                    <button key={r.id} onClick={()=>isHost&&upd({selectedRankingIds:sel?(cfg.selectedRankingIds||[]).filter(id=>id!==r.id):[...(cfg.selectedRankingIds||[]),r.id]})}
                      disabled={!isHost}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all text-xs ${sel?"border-green-500/35 bg-green-950/15 text-green-300":"border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/50 hover:border-white/15"} ${isHost?"cursor-pointer":""}`}>
                      <span className="shrink-0">{sel?"✓":"○"}</span>
                      <span className="font-semibold truncate">{r.title}</span>
                      <span className="shrink-0 text-white/20">{r.items.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="glass rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider">🏳️ Flaggenrätsel</h3>
              <Slider label="Fragen" value={cfg.flagCount} min={0} max={100} unit=" Flaggen" onChange={v=>upd({flagCount:v})} disabled={!isHost}/>
              {cfg.flagCount>0&&<Slider label="Buzz-Zeit" value={cfg.flagBuzzTime} min={0} max={60} unit="s" onChange={v=>upd({flagBuzzTime:v})} disabled={!isHost}/>}
              {cfg.flagCount>0&&<p className="text-white/15 text-xs">Buzzern → Textantwort · mehrfach versuchen erlaubt</p>}
            </div>
            <div className="glass rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider">🔔 Buzzer-Quiz</h3>
              <Slider label="Fragen" value={cfg.buzzerCount} min={0} max={100} unit=" Fragen" onChange={v=>upd({buzzerCount:v})} disabled={!isHost}/>
              {cfg.buzzerCount>0&&<Slider label="Buzz-Zeit" value={cfg.buzzerTime} min={0} max={60} unit="s" onChange={v=>upd({buzzerTime:v})} disabled={!isHost}/>}
              {cfg.buzzerCount>0&&<p className="text-white/15 text-xs">Allgemeinwissen · wer buzzert antwortet per Text</p>}
            </div>
            <div className="glass rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider">🏷️ Logos-Rätsel</h3>
              <Slider label="Fragen" value={cfg.logoCount} min={0} max={100} unit=" Logos" onChange={v=>upd({logoCount:v})} disabled={!isHost}/>
              {cfg.logoCount>0&&<Slider label="Buzz-Zeit" value={cfg.logoTime} min={0} max={60} unit="s" onChange={v=>upd({logoTime:v})} disabled={!isHost}/>}
              {cfg.logoCount>0&&<p className="text-white/15 text-xs">Bekannte Marken erraten · wer buzzert antwortet per Text</p>}
            </div>
          </div>

          {/* Difficulty + Modes */}
          <div className="glass rounded-3xl p-5 space-y-5">
            <div>
              <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider mb-3">🎓 Schwierigkeit</h3>
              <div className="flex gap-2">
                {([["all","Alle"],["easy","✅ Leicht"],["medium","⚡ Mittel"],["hard","🔥 Schwer"]] as const).map(([d,l])=>(
                  <button key={d} onClick={()=>isHost&&upd({difficulty:d})} disabled={!isHost}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      cfg.difficulty===d
                        ?"bg-[#8b5cf6] text-white border-[#8b5cf6]"
                        :"border-white/[0.07] text-white/25 hover:text-white/50 hover:border-white/20"
                    }`}
                    style={cfg.difficulty===d?{boxShadow:"0 0 16px rgba(139,92,246,0.35)"}:{}}>{l}</button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/[0.06]"/>

            <div>
              <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider mb-3">✨ Spezial-Modi</h3>
              <div className="space-y-2">
                {([
                  ["blitzMode","⚡","Blitzrunde",cfg.blitzMode?"Schnell = 200 Pkt · Langsam = min. 50 Pkt":"Deaktiviert – jede Antwort = 100 Pkt"],
                  ["streakBonus","🔥","Streak-Bonus",cfg.streakBonus?"2× = +20 · 3× = +50 · 4+× = +100 Bonus":"Deaktiviert – kein Bonus für Richtigserie"],
                  ["jokerEnabled","🃏","50/50 Joker",cfg.jokerEnabled?"1 Joker pro Spiel – entfernt 2 falsche Antworten":"Deaktiviert"],
                ] as [keyof QuizConfig, string, string, string][]).map(([key,icon,label,desc])=>(
                  <div key={key} className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${cfg[key]?"border-[#8b5cf6]/25":"border-white/[0.06]"}`}
                    style={cfg[key]?{background:"rgba(139,92,246,0.08)"}:{background:"rgba(0,0,0,0.2)"}}>
                    <span className="text-xl shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white/90">{label}</p>
                      <p className="text-white/30 text-xs truncate">{desc}</p>
                    </div>
                    <Toggle on={!!cfg[key]} onToggle={()=>upd({[key]:!cfg[key]})} disabled={!isHost}/>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Start */}
          {isHost
            ? <button onClick={()=>send({type:"start_quiz"})} disabled={totalQ===0} className="btn-primary w-full py-5 rounded-3xl text-xl tracking-wide">Quiz starten →</button>
            : <div className="glass rounded-2xl p-4 text-center text-white/25 pulse-slow text-sm">Warte auf den Host…</div>
          }
          </>}

          {tab === "duel" && <>
          <div className="flex items-center gap-3 slide-up pt-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{background:"linear-gradient(135deg,rgba(239,68,68,0.2),rgba(59,130,246,0.2))",border:"1px solid rgba(255,255,255,0.1)"}}>⚔️</div>
            <h2 className="font-black text-2xl text-white">Duell-Modus</h2>
            <span className="text-[10px] text-white/25 px-2 py-1 rounded-full" style={{background:"rgba(255,255,255,0.05)"}}>Eigenständiger Modus</span>
          </div>

          {/* Duell-Bilanz – immer sichtbar, bleibt über mehrere Matches erhalten */}
          <div className="glass rounded-3xl p-5 slide-up">
            <h3 className="font-bold text-sm text-white/50 uppercase tracking-wider mb-4">🏆 Duell-Bilanz dieser Session</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center p-4 rounded-2xl border" style={{background:"rgba(239,68,68,0.08)",borderColor:"rgba(239,68,68,0.25)"}}>
                <p className="text-3xl font-black text-red-400">{duelWins.A}</p>
                <p className="text-[10px] text-red-300/50 uppercase tracking-wider mt-1">Siege 🔴 Rot</p>
              </div>
              <div className="text-center p-4 rounded-2xl border" style={{background:"rgba(59,130,246,0.08)",borderColor:"rgba(59,130,246,0.25)"}}>
                <p className="text-3xl font-black text-blue-400">{duelWins.B}</p>
                <p className="text-[10px] text-blue-300/50 uppercase tracking-wider mt-1">Siege 🔵 Blau</p>
              </div>
            </div>
            {state.duelMatchHistory.length === 0 ? (
              <p className="text-white/15 text-xs text-center py-2">Noch keine Matches gespielt – startet das erste Duell!</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {state.duelMatchHistory.slice().reverse().map(m => (
                  <div key={m.matchNumber} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs" style={{background:"rgba(255,255,255,0.03)"}}>
                    <span className="text-white/30">Match {m.matchNumber}</span>
                    <span className="font-bold">
                      <span className={m.winner==="A"?"text-red-400":"text-white/40"}>{m.teamAScore}</span>
                      <span className="text-white/20 mx-1.5">:</span>
                      <span className={m.winner==="B"?"text-blue-400":"text-white/40"}>{m.teamBScore}</span>
                    </span>
                    <span className="text-white/20">{m.winner==="draw"?"Unentschieden":m.winner==="A"?"Rot gewinnt":"Blau gewinnt"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team-Zuweisung */}
          <div className="glass rounded-3xl p-5 slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-white/50 uppercase tracking-wider">👥 Teams einteilen</h3>
              {isHost && (
                <div className="flex gap-3">
                  <button onClick={autoSplit} className="text-xs font-semibold text-[#c4b5fd] hover:text-white transition">🎲 Übrige verteilen</button>
                  <button onClick={shuffleAllTeams} className="text-xs font-semibold text-amber-300 hover:text-white transition">🔀 Teams mischen</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["A","B"] as DuelTeamId[]).map(team => {
                const ids = team==="A" ? state.duelTeamA : state.duelTeamB;
                const other:DuelTeamId = team==="A"?"B":"A";
                return (
                  <div key={team} className="rounded-2xl p-3 border" style={{background:`${TEAM_COLOR[team]}0c`,borderColor:`${TEAM_COLOR[team]}30`}}>
                    <p className="text-xs font-bold mb-2" style={{color:TEAM_COLOR[team]}}>{TEAM_LABEL[team]}</p>
                    <div className="space-y-1.5 min-h-[40px]">
                      {ids.map(pid => {
                        const p = state.players.find(p=>p.id===pid); if(!p) return null;
                        const isMe = pid===playerId;
                        return (
                          <div key={pid} className="flex items-center gap-2 px-2 py-1.5 rounded-xl" style={isMe?{background:`${TEAM_COLOR[team]}1a`,border:`1px solid ${TEAM_COLOR[team]}40`}:{background:"rgba(0,0,0,0.2)"}}>
                            <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={22}/>
                            <span className="text-xs font-semibold text-white/80 flex-1 truncate">{p.name}{isMe&&" (Du)"}</span>
                            {isMe && (
                              <button onClick={()=>chooseTeam(other)}
                                className="text-[10px] px-1.5 py-0.5 rounded-lg font-bold transition-all active:scale-95"
                                style={{background:`${TEAM_COLOR[other]}20`,color:TEAM_COLOR[other]}}>
                                → {TEAM_EMOJI[other]}
                              </button>
                            )}
                            {isHost && !isMe && (
                              <button onClick={()=>assignTeam(pid,other)}
                                className="text-[10px] px-1.5 py-0.5 rounded-lg font-bold transition-all active:scale-95"
                                style={{background:`${TEAM_COLOR[other]}20`,color:TEAM_COLOR[other]}}>
                                → {TEAM_EMOJI[other]}
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {ids.length===0 && <p className="text-white/15 text-[11px] text-center py-2">Niemand</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Noch nicht zugewiesene Spieler – jeder wählt selbst, Host kann auch zuweisen */}
            {state.players.some(p=>!state.duelTeamA.includes(p.id)&&!state.duelTeamB.includes(p.id)) && (
              <div className="mt-3 space-y-1.5">
                {state.players.filter(p=>!state.duelTeamA.includes(p.id)&&!state.duelTeamB.includes(p.id)).map(p=>{
                  const isMe = p.id===playerId;
                  return (
                    <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{background:"rgba(255,255,255,0.04)"}}>
                      <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={20}/>
                      <span className="text-[11px] text-white/50 flex-1 truncate">{p.name}{isMe&&" (Du)"}</span>
                      {(isMe||isHost) && <>
                        <button onClick={()=>isMe?chooseTeam("A"):assignTeam(p.id,"A")} className="text-[10px] px-2 py-0.5 rounded-lg font-bold text-red-400" style={{background:"rgba(239,68,68,0.15)"}}>🔴 A</button>
                        <button onClick={()=>isMe?chooseTeam("B"):assignTeam(p.id,"B")} className="text-[10px] px-2 py-0.5 rounded-lg font-bold text-blue-400" style={{background:"rgba(59,130,246,0.15)"}}>🔵 B</button>
                      </>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Duell-Konfiguration */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider">⚔️ Match-Einstellungen</h3>
              <Slider label="Fragen" value={dcfg.questionCount} min={6} max={30} unit=" Fragen" onChange={v=>updDuel({questionCount:v})} disabled={!isHost}/>
              <Slider label="Buzz-Zeit" value={dcfg.timePerQuestion} min={10} max={40} unit="s" onChange={v=>updDuel({timePerQuestion:v})} disabled={!isHost}/>
              <p className="text-white/15 text-xs">Letzte 3 Fragen zählen doppelt – Showdown! 🔥</p>
            </div>
            <div className="glass rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider">🎓 Schwierigkeit</h3>
              <div className="flex gap-2">
                {([["all","Alle"],["easy","✅"],["medium","⚡"],["hard","🔥"]] as const).map(([d,l])=>(
                  <button key={d} onClick={()=>isHost&&updDuel({difficulty:d})} disabled={!isHost}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${dcfg.difficulty===d?"bg-white/10 text-white border-white/20":"border-white/[0.07] text-white/25"}`}>{l}</button>
                ))}
              </div>
              <p className="text-white/30 text-xs mb-1">Kategorien</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {cats.map(cat=>{
                  const active = dcfg.selectedCategories.length===0||dcfg.selectedCategories.includes(cat);
                  return (
                    <button key={cat} onClick={()=>{
                      if(!isHost)return;
                      const s2=dcfg.selectedCategories;
                      if(s2.length===0)updDuel({selectedCategories:cats.filter(c=>c!==cat)});
                      else if(s2.includes(cat)){const n=s2.filter(c=>c!==cat);updDuel({selectedCategories:n.length===0?[]:n});}
                      else{const n=[...s2,cat];updDuel({selectedCategories:n.length===cats.length?[]:n});}
                    }} className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${active?"cat-active":"cat-inactive"}`}>
                      {CAT_ICONS[cat]??"📚"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {isHost
            ? <button onClick={()=>send({type:"start_duel"})} disabled={!teamACanStart}
                className="w-full py-5 rounded-3xl text-xl font-black tracking-wide text-white transition-all active:scale-[0.98]"
                style={{background:"linear-gradient(135deg,#ef4444 0%,#a855f7 50%,#3b82f6 100%)",boxShadow:"0 4px 24px rgba(139,92,246,0.4)",opacity:teamACanStart?1:0.35}}>
                ⚔️ Duell starten
              </button>
            : <div className="glass rounded-2xl p-4 text-center text-white/25 pulse-slow text-sm">Warte auf den Host…</div>
          }
          {!teamACanStart && isHost && <p className="text-center text-white/20 text-xs">Beide Teams brauchen mindestens 1 Spieler</p>}
          </>}


          {tab === "scribble" && <>
          <div className="flex items-center gap-3 slide-up pt-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{background:"linear-gradient(135deg,rgba(249,115,22,0.2),rgba(236,72,153,0.2))",border:"1px solid rgba(249,115,22,0.3)"}}>🎨</div>
            <div>
              <h2 className="font-black text-2xl text-white">Scribble</h2>
              <p className="text-[10px] text-white/25">Zeichnen & Erraten</p>
            </div>
          </div>

          <div className="glass rounded-3xl p-4 slide-up space-y-2">
            <p className="text-xs text-white/30 uppercase tracking-wider font-semibold">🎯 So funktioniert's</p>
            <div className="space-y-1.5 text-sm text-white/50">
              <div className="flex items-start gap-2"><span>✏️</span><span>Jeder zeichnet abwechselnd ein Wort</span></div>
              <div className="flex items-start gap-2"><span>💬</span><span>Andere raten per Texteingabe</span></div>
              <div className="flex items-start gap-2"><span>⚡</span><span>Früher erraten = mehr Punkte</span></div>
              <div className="flex items-start gap-2"><span>🎨</span><span>Zeichner bekommt Bonus je mehr erraten</span></div>
            </div>
          </div>

          <div className="glass rounded-3xl p-5 slide-up space-y-4">
            <h3 className="font-bold text-sm text-white/40 uppercase tracking-wider">⚙️ Einstellungen</h3>
            <Slider label="Runden pro Spieler" value={scfg.roundsPerPlayer} min={1} max={5} unit="x"
              onChange={v=>updScribble({roundsPerPlayer:v})} disabled={!isHost}/>
            <Slider label="Zeit zum Zeichnen" value={scfg.drawTime} min={30} max={120} unit="s"
              onChange={v=>updScribble({drawTime:v})} disabled={!isHost}/>
            <p className="text-xs text-white/20">
              ca. {Math.round(state.players.length * scfg.roundsPerPlayer * (scfg.drawTime + 8) / 60)} Min ·&nbsp;
              {state.players.length * scfg.roundsPerPlayer} Runden
            </p>
          </div>

          <div className="glass rounded-3xl p-4 slide-up">
            <p className="text-xs text-white/30 uppercase tracking-wider mb-3 font-semibold">👥 Spieler</p>
            <div className="flex flex-wrap gap-2">
              {state.players.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{background:`${p.avatar?.bodyColor||"#8b5cf6"}15`,border:`1px solid ${p.avatar?.bodyColor||"#8b5cf6"}30`}}>
                  <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={20}/>
                  <span className="text-xs font-semibold" style={{color:p.avatar?.bodyColor||"#c4b5fd"}}>{p.name}</span>
                </div>
              ))}
            </div>
            {state.players.length < 2 && <p className="text-xs text-amber-400/60 mt-2">Mindestens 2 Spieler nötig</p>}
          </div>

          {isHost
            ? <button onClick={()=>send({type:"start_scribble"})} disabled={state.players.length < 2}
                className="w-full py-5 rounded-3xl text-xl font-black tracking-wide text-white transition-all active:scale-[0.98] disabled:opacity-30"
                style={{background:"linear-gradient(135deg,#f97316,#ec4899)",boxShadow:"0 4px 24px rgba(249,115,22,0.4)"}}>
                🎨 Scribble starten
              </button>
            : <div className="glass rounded-2xl p-4 text-center text-white/25 pulse-slow text-sm">Warte auf den Host…</div>
          }
          </>}

          {quiz.error&&<div className="px-4 py-3 rounded-2xl text-sm text-red-400 text-center fade-in" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>⚠️ {quiz.error}</div>}
        </div>
      </div>
    </div>

  );
}
