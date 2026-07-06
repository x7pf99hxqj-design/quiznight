let ctx: AudioContext | null = null;
function getCtx() { if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); return ctx; }
function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.25) {
  try {
    const c = getCtx(); const osc = c.createOscillator(); const g = c.createGain();
    osc.connect(g); g.connect(c.destination); osc.frequency.value = freq; osc.type = type;
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime+dur);
    osc.start(c.currentTime); osc.stop(c.currentTime+dur);
  } catch {}
}
export function playCorrect() { tone(523,.15); setTimeout(()=>tone(659,.15),120); setTimeout(()=>tone(784,.25),240); }
export function playWrong()   { tone(220,.15,"sawtooth",.15); setTimeout(()=>tone(196,.2,"sawtooth",.1),150); }
export function playTick()    { tone(880,.04,"square",.07); }
export function playJoker()   { tone(880,.08); setTimeout(()=>tone(1047,.08),80); setTimeout(()=>tone(1319,.15),160); }
export function playStreak(n: number) { [523,659,784,1047].slice(0,Math.min(n,4)).forEach((f,i)=>setTimeout(()=>tone(f,.1),i*80)); }
