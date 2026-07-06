import { useState, useEffect } from "react";
import type { QuizHook } from "../lib/useQuiz";
import { AvatarSVG, BODY_COLORS, HAIR_OPTIONS, EYES_OPTIONS, MOUTH_OPTIONS, DEFAULT_AVATAR } from "../lib/avatar";
import type { AvatarConfig } from "../../../shared/types";

type EditorTab = "body"|"hair"|"eyes"|"mouth";
const TABS: { id: EditorTab; icon: string; label: string }[] = [
  { id:"body",  icon:"🎨", label:"Farbe" },
  { id:"hair",  icon:"💇", label:"Haare" },
  { id:"eyes",  icon:"👀", label:"Augen" },
  { id:"mouth", icon:"😊", label:"Mund"  },
];

const TIPS = [
  "Tipp: Jede Runde hat einen anderen Look – probier dich aus!",
  "Tipp: Dein Avatar ist auch beim Buzzern und im Ranking sichtbar.",
  "Tipp: Auf 🎲 tippen für eine zufällige Überraschung.",
  "Tipp: Die Farbe bestimmt auch deine Akzentfarbe im ganzen Spiel.",
];

function randomAvatar(): AvatarConfig {
  return {
    bodyColor: BODY_COLORS[Math.floor(Math.random()*BODY_COLORS.length)],
    hair: Math.floor(Math.random()*HAIR_OPTIONS.length),
    eyes: Math.floor(Math.random()*EYES_OPTIONS.length),
    mouth: Math.floor(Math.random()*MOUTH_OPTIONS.length),
  };
}

export default function Home({ quiz }: { quiz: QuizHook }) {
  const [mode, setMode] = useState<"create"|"join">("create");
  const [hostName, setHostName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [code, setCode] = useState("");
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [edTab, setEdTab] = useState<EditorTab>("body");
  const [spinning, setSpinning] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTipIdx(i => (i+1) % TIPS.length), 5000);
    return () => clearInterval(iv);
  }, []);

  const upd = (p: Partial<AvatarConfig>) => setAvatar(a => ({...a,...p}));
  const shuffle = () => {
    setSpinning(true);
    setAvatar(randomAvatar());
    setTimeout(() => setSpinning(false), 500);
  };
  const go = () => mode === "create"
    ? hostName.trim() && quiz.createSession(hostName.trim(), avatar)
    : playerName.trim() && code.length === 4 && quiz.joinSession(code, playerName.trim(), avatar);

  const displayName = (mode === "create" ? hostName : playerName).trim() || "Du";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative z-10">
      {/* Logo */}
      <div className="text-center mb-8 pop-in">
        <div className="text-6xl mb-3 float">🎯</div>
        <h1 className="text-6xl font-black tracking-tight text-gradient" style={{fontFamily:"'Space Grotesk',sans-serif"}}>
          QuizNight
        </h1>
        <p className="text-white/30 text-sm mt-2 tracking-widest uppercase">Das ultimative Quiz-Erlebnis</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 w-full max-w-3xl slide-up">
        {/* ── Charakter Editor ── */}
        <div className="glass rounded-3xl p-6 flex flex-col gap-4 flex-1 relative overflow-hidden">
          {/* Ambient glow blob that follows the chosen color */}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none transition-colors duration-500"
            style={{background:`radial-gradient(circle,${avatar.bodyColor}25 0%,transparent 70%)`, filter:"blur(20px)"}}/>

          <div className="flex items-center justify-between relative z-10">
            <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Dein Charakter</p>
            <button onClick={shuffle} title="Zufälliger Avatar"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all active:scale-90 hover:bg-white/[0.06]"
              style={{color:"#c4b5fd"}}>
              <span className={spinning ? "inline-block" : "inline-block"} style={spinning?{animation:"spin 0.5s ease"}:{}}>🎲</span>
              Zufällig
            </button>
          </div>

          {/* Avatar Preview – bigger, with stage/spotlight effect */}
          <div className="flex justify-center relative z-10 py-2">
            <div className="relative">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full pulse-slow" style={{
                background:`radial-gradient(circle,${avatar.bodyColor}18 0%,transparent 75%)`,
                transform:"scale(1.4)"
              }}/>
              {/* Spotlight ellipse beneath */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-28 h-4 rounded-full"
                style={{background:`${avatar.bodyColor}30`, filter:"blur(6px)"}}/>
              <div className="relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background:`radial-gradient(circle,${avatar.bodyColor}22 0%,${avatar.bodyColor}06 70%)`,
                  border:`2px solid ${avatar.bodyColor}50`,
                  boxShadow:`0 0 40px ${avatar.bodyColor}30, inset 0 1px 0 rgba(255,255,255,0.08)`
                }}>
                <div key={JSON.stringify(avatar)} className="pop-in">
                  <AvatarSVG config={avatar} size={132}/>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl relative z-10" style={{background:"rgba(0,0,0,0.3)"}}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setEdTab(t.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                  edTab===t.id ? "text-white" : "text-white/25 hover:text-white/50"
                }`}
                style={edTab===t.id?{background:avatar.bodyColor,boxShadow:`0 4px 14px ${avatar.bodyColor}55`}:{}}>
                <span className="text-sm">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Options */}
          <div className="relative z-10 min-h-[88px]">
            {edTab === "body" && (
              <div>
                <p className="text-xs text-white/25 mb-2.5">Körperfarbe</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {BODY_COLORS.map(c => (
                    <button key={c} onClick={() => upd({bodyColor:c})}
                      className="aspect-square rounded-full transition-all relative"
                      style={{background:c,
                        boxShadow:avatar.bodyColor===c?`0 0 0 3px rgba(255,255,255,0.9), 0 0 20px ${c}99`:`0 2px 6px rgba(0,0,0,0.3)`,
                        transform:avatar.bodyColor===c?"scale(1.12)":"scale(1)"}}>
                      {avatar.bodyColor===c && <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm drop-shadow">✓</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {edTab === "hair" && (
              <div className="grid grid-cols-3 gap-2">
                {HAIR_OPTIONS.map((l,i) => (
                  <button key={i} onClick={() => upd({hair:i})}
                    className="py-2.5 rounded-xl text-xs font-semibold border transition-all"
                    style={avatar.hair===i
                      ?{borderColor:`${avatar.bodyColor}90`,background:`${avatar.bodyColor}20`,color:"#fff",boxShadow:`0 0 12px ${avatar.bodyColor}30`}
                      :{borderColor:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.35)"}}>
                    {l}
                  </button>
                ))}
              </div>
            )}
            {edTab === "eyes" && (
              <div className="flex flex-col gap-2">
                {EYES_OPTIONS.map((l,i) => (
                  <button key={i} onClick={() => upd({eyes:i})}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all text-left"
                    style={avatar.eyes===i
                      ?{borderColor:`${avatar.bodyColor}90`,background:`${avatar.bodyColor}20`,color:"#fff",boxShadow:`0 0 12px ${avatar.bodyColor}30`}
                      :{borderColor:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.35)"}}>
                    {l}
                  </button>
                ))}
              </div>
            )}
            {edTab === "mouth" && (
              <div className="flex flex-col gap-2">
                {MOUTH_OPTIONS.map((l,i) => (
                  <button key={i} onClick={() => upd({mouth:i})}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all text-left"
                    style={avatar.mouth===i
                      ?{borderColor:`${avatar.bodyColor}90`,background:`${avatar.bodyColor}20`,color:"#fff",boxShadow:`0 0 12px ${avatar.bodyColor}30`}
                      :{borderColor:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.35)"}}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rotating tip */}
          <p key={tipIdx} className="text-[10px] text-white/15 text-center fade-in relative z-10 mt-1">{TIPS[tipIdx]}</p>
        </div>

        {/* ── Login Panel ── */}
        <div className="glass rounded-3xl overflow-hidden flex-1 flex flex-col">
          {/* Mode switch */}
          <div className="flex border-b border-white/[0.07]">
            {(["create","join"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-4 text-sm font-bold transition-all relative ${mode===m?"text-white":"text-white/25 hover:text-white/50"}`}>
                {m==="create"?"🎮 Erstellen":"🚀 Beitreten"}
                {mode===m && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,transparent,${avatar.bodyColor},transparent)`}}/>}
              </button>
            ))}
          </div>

          <div className="p-6 flex-1 flex flex-col justify-center gap-4">
            {/* Live preview chip – always visible, uses "Du" as fallback so it feels alive from the start */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300"
              style={{background:`${avatar.bodyColor}10`, border:`1px solid ${avatar.bodyColor}25`}}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{background:`${avatar.bodyColor}20`}}>
                <AvatarSVG config={avatar} size={34}/>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate" style={{color:avatar.bodyColor}}>{displayName}</p>
                <p className="text-[10px] text-white/20">So siehst du für andere aus</p>
              </div>
            </div>

            {mode === "join" && (
              <div>
                <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">Session-Code</p>
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX" maxLength={4}
                  className="input-field text-center text-4xl font-black tracking-[0.4em] placeholder:text-white/10 placeholder:tracking-normal placeholder:text-xl"/>
              </div>
            )}
            <div>
              <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">Dein Name</p>
              <input value={mode==="create"?hostName:playerName}
                onChange={e => mode==="create"?setHostName(e.target.value):setPlayerName(e.target.value)}
                onKeyDown={e => e.key==="Enter"&&go()}
                placeholder={mode==="create"?"z.B. Elias":"z.B. Max"} maxLength={20}
                className="input-field"/>
            </div>

            <button onClick={go}
              disabled={mode==="create"?!hostName.trim():(!playerName.trim()||code.length!==4)}
              className="btn-primary w-full rounded-2xl text-base mt-1">
              {mode==="create"?"Lobby erstellen →":"Beitreten →"}
            </button>

            {quiz.error && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-400 text-center fade-in"
                style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>
                ⚠️ {quiz.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
