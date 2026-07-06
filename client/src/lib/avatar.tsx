import type { ReactNode } from "react";
import type { AvatarConfig } from "../../../shared/types";
export type { AvatarConfig };

export const BODY_COLORS = ["#8b5cf6","#3b82f6","#22c55e","#ef4444","#f97316","#ec4899","#06b6d4","#eab308"];
export const HAIR_OPTIONS  = ["Kahl","Kurz","Lang","Lockig","Zylinder","Cap"];
export const EYES_OPTIONS  = ["Normal","Schläfrig","Happy","Brille","Sonnenbrille"];
export const MOUTH_OPTIONS = ["Lächeln","Grinsen","Neutral","Bart","Schnurrbart"];
export const DEFAULT_AVATAR: AvatarConfig = { bodyColor:"#8b5cf6", hair:1, eyes:0, mouth:0 };

const SKIN="#FCECD8", HAIR_C="#2c1810";

function H({ opt }: { opt:number }): ReactNode {
  switch(opt) {
    case 0: return null;
    case 1: return <ellipse cx="50" cy="19" rx="23" ry="9" fill={HAIR_C}/>;
    case 2: return <><ellipse cx="50" cy="18" rx="24" ry="10" fill={HAIR_C}/><ellipse cx="27" cy="38" rx="6" ry="15" fill={HAIR_C}/><ellipse cx="73" cy="38" rx="6" ry="15" fill={HAIR_C}/></>;
    case 3: return <>{[30,38,46,54,62,70].map(x=><circle key={x} cx={x} cy={22} r={7} fill={HAIR_C}/>)}<ellipse cx="50" cy="27" rx="24" ry="8" fill={HAIR_C}/></>;
    case 4: return <><rect x="30" y="4" width="40" height="22" fill="#111" rx="3"/><rect x="22" y="22" width="56" height="6" fill="#111" rx="2"/></>;
    case 5: return <><ellipse cx="50" cy="22" rx="27" ry="11" fill="#e63946"/><ellipse cx="50" cy="26" rx="27" ry="6" fill="#c1121f"/><path d="M23,27 Q9,32 8,40 Q16,34 23,31Z" fill="#e63946"/><circle cx="50" cy="13" r="3" fill="#c1121f"/></>;
    default: return null;
  }
}
function E({ opt }: { opt:number }): ReactNode {
  const lx=42,rx=58,ey=41;
  switch(opt) {
    case 0: return <><circle cx={lx} cy={ey} r={4} fill="#2c1810"/><circle cx={rx} cy={ey} r={4} fill="#2c1810"/><circle cx={lx+1.5} cy={ey-1.5} r={1.2} fill="white"/><circle cx={rx+1.5} cy={ey-1.5} r={1.2} fill="white"/></>;
    case 1: return <><circle cx={lx} cy={ey} r={4} fill="#2c1810"/><circle cx={rx} cy={ey} r={4} fill="#2c1810"/><rect x={lx-5} y={ey-5} width={10} height={4} fill={SKIN}/><rect x={rx-5} y={ey-5} width={10} height={4} fill={SKIN}/></>;
    case 2: return <><path d={`M${lx-5},${ey+2} Q${lx},${ey-5} ${lx+5},${ey+2}`} stroke="#2c1810" strokeWidth="2.5" fill="none"/><path d={`M${rx-5},${ey+2} Q${rx},${ey-5} ${rx+5},${ey+2}`} stroke="#2c1810" strokeWidth="2.5" fill="none"/></>;
    case 3: return <><circle cx={lx} cy={ey} r={4} fill="#2c1810"/><circle cx={rx} cy={ey} r={4} fill="#2c1810"/><circle cx={lx} cy={ey} r={7} fill="none" stroke="#888" strokeWidth="1.5"/><circle cx={rx} cy={ey} r={7} fill="none" stroke="#888" strokeWidth="1.5"/><line x1={lx+7} y1={ey} x2={rx-7} y2={ey} stroke="#888" strokeWidth="1.5"/><line x1={22} y1={ey} x2={lx-7} y2={ey} stroke="#888" strokeWidth="1.5"/><line x1={rx+7} y1={ey} x2={78} y2={ey} stroke="#888" strokeWidth="1.5"/></>;
    case 4: return <><rect x={lx-8} y={ey-5} width={16} height={9} rx={2} fill="#111"/><rect x={rx-8} y={ey-5} width={16} height={9} rx={2} fill="#111"/><line x1={lx+8} y1={ey} x2={rx-8} y2={ey} stroke="#111" strokeWidth="2"/><line x1={22} y1={ey} x2={lx-8} y2={ey} stroke="#111" strokeWidth="1.5"/><line x1={rx+8} y1={ey} x2={78} y2={ey} stroke="#111" strokeWidth="1.5"/></>;
    default: return null;
  }
}
function M({ opt }: { opt:number }): ReactNode {
  const my=55;
  switch(opt) {
    case 0: return <path d={`M40,${my} Q50,${my+8} 60,${my}`} stroke="#c47a5a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>;
    case 1: return <><path d={`M37,${my} Q50,${my+12} 63,${my}`} fill="#8B1A1A"/><rect x="43" y={my} width="14" height="5" fill="white" rx="1"/></>;
    case 2: return <line x1="42" y1={my+4} x2="58" y2={my+4} stroke="#c47a5a" strokeWidth="2.5" strokeLinecap="round"/>;
    case 3: return <><path d={`M40,${my} Q50,${my+8} 60,${my}`} stroke="#c47a5a" strokeWidth="2.5" fill="none"/><ellipse cx="50" cy={my+11} rx="13" ry="7" fill={HAIR_C}/></>;
    case 4: return <><line x1="43" y1={my+4} x2="57" y2={my+4} stroke="#c47a5a" strokeWidth="2.5"/><path d={`M38,${my-1} Q44,${my-7} 50,${my-2} Q56,${my-7} 62,${my-1}`} fill={HAIR_C}/></>;
    default: return null;
  }
}

export function AvatarSVG({ config, size=60 }: { config:AvatarConfig; size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M16,83 Q22,65 50,65 Q78,65 84,83 L88,100 L12,100 Z" fill={config.bodyColor}/>
      <path d="M28,68 Q38,62 50,65" stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <rect x="44" y="65" width="12" height="8" fill={SKIN}/>
      <circle cx="50" cy="42" r="26" fill={SKIN}/>
      <ellipse cx="57" cy="35" rx="8" ry="10" fill="rgba(255,255,255,0.12)"/>
      <ellipse cx="24" cy="44" rx="4" ry="6" fill={SKIN}/><ellipse cx="76" cy="44" rx="4" ry="6" fill={SKIN}/>
      <ellipse cx="24" cy="44" rx="2.5" ry="4" fill="rgba(196,122,90,0.35)"/><ellipse cx="76" cy="44" rx="2.5" ry="4" fill="rgba(196,122,90,0.35)"/>
      <H opt={config.hair}/>
      <E opt={config.eyes}/>
      <path d="M48,47 Q50,51 52,47" stroke="rgba(196,122,90,0.5)" strokeWidth="1.5" fill="none"/>
      <M opt={config.mouth}/>
    </svg>
  );
}
