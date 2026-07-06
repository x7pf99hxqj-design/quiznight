import type { Player } from "../../../shared/types";
import { AvatarSVG } from "../lib/avatar";

const PODIUM_HEIGHT: Record<number, number> = { 0: 132, 1: 96, 2: 72 };
const PODIUM_COLOR: Record<number, string> = { 0: "#fbbf24", 1: "#cbd5e1", 2: "#fb923c" };
const PODIUM_MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };
// Visual order on the podium: 2nd - 1st - 3rd (classic layout)
const DISPLAY_ORDER = [1, 0, 2];

export default function Podium({ players }: { players: Player[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-3 px-2 mb-2">
      {DISPLAY_ORDER.map(rank => {
        const p = top3[rank];
        if (!p) return <div key={rank} className="flex-1 max-w-[110px]" />;
        const col = p.avatar?.bodyColor || "#8b5cf6";
        const height = PODIUM_HEIGHT[rank];
        const podiumColor = PODIUM_COLOR[rank];
        const isFirst = rank === 0;
        return (
          <div key={rank} className="flex-1 max-w-[110px] flex flex-col items-center" style={{order: DISPLAY_ORDER.indexOf(rank)}}>
            {/* Avatar above podium */}
            <div className="relative mb-2 pop-in" style={{animationDelay: `${rank * 120}ms`}}>
              {isFirst && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl float">👑</div>
              )}
              <div className="rounded-full flex items-center justify-center"
                style={{
                  width: isFirst ? 64 : 52, height: isFirst ? 64 : 52,
                  background: `${col}20`, border: `2px solid ${col}50`,
                  boxShadow: isFirst ? `0 0 30px ${podiumColor}55` : `0 0 16px ${podiumColor}33`
                }}>
                <AvatarSVG config={p.avatar || {bodyColor:"#8b5cf6",hair:1,eyes:0,mouth:0}} size={isFirst ? 56 : 44}/>
              </div>
            </div>
            <p className="text-xs font-bold text-white/90 truncate max-w-full px-1">{p.name}</p>
            <p className="text-[10px] font-black mb-1.5" style={{color: podiumColor}}>{p.score} Pkt</p>
            {/* Podium block */}
            <div className="w-full rounded-t-xl flex items-end justify-center pb-2 pop-in"
              style={{
                height, animationDelay: `${rank * 120 + 80}ms`,
                background: `linear-gradient(180deg, ${podiumColor}35 0%, ${podiumColor}15 100%)`,
                border: `1px solid ${podiumColor}40`,
                boxShadow: `0 0 24px ${podiumColor}22, inset 0 1px 0 rgba(255,255,255,0.1)`
              }}>
              <span className="text-2xl">{PODIUM_MEDAL[rank]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
