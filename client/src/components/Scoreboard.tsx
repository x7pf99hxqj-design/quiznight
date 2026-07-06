import type { Player } from "../../../shared/types";
import { AvatarSVG } from "../lib/avatar";
const MEDALS = ["🥇","🥈","🥉"];
export default function Scoreboard({ players, title }: { players: Player[]; title?: string }) {
  const sorted = [...players].sort((a,b) => b.score-a.score);
  const max = sorted[0]?.score || 1;
  return (
    <div>
      {title && <h2 className="text-2xl font-black text-white text-center mb-5" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{title}</h2>}
      <div className="space-y-2.5">
        {sorted.map((p,i) => {
          const col = p.avatar?.bodyColor || "#8b5cf6";
          const isFirst = i === 0;
          return (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all glass ${isFirst?"neon-purple":""}`}
              style={isFirst?{borderColor:`${col}40`}:{borderColor:"rgba(255,255,255,0.07)"}}>
              <span className="text-xl w-7 text-center shrink-0">{MEDALS[i] ?? <span className="text-white/25 font-bold text-sm">{i+1}.</span>}</span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{background:`${col}20`,border:`1px solid ${col}30`}}>
                <AvatarSVG config={p.avatar||{bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={36}/>
              </div>
              <span className="font-bold flex-1 truncate text-sm" style={{color:col}}>{p.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 rounded-full overflow-hidden hidden sm:block" style={{background:"rgba(255,255,255,0.06)"}}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{width:`${(p.score/max)*100}%`,background:`linear-gradient(90deg,${col},${col}aa)`,boxShadow:`0 0 8px ${col}66`}}/>
                </div>
                <span className="font-black text-white text-base w-16 text-right tabular-nums">{p.score}<span className="text-[10px] font-normal text-white/25 ml-0.5">Pkt</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
