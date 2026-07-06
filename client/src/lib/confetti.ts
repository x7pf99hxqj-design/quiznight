const COLORS=["#8b5cf6","#f59e0b","#22c55e","#ef4444","#3b82f6","#ec4899","#f97316"];
export function triggerConfetti(count=60){
  for(let i=0;i<count;i++) setTimeout(()=>{
    const el=document.createElement("div");
    const size=Math.random()*8+5,circle=Math.random()>.5,color=COLORS[Math.floor(Math.random()*COLORS.length)];
    el.style.cssText=`position:fixed;z-index:9999;pointer-events:none;width:${size}px;height:${size}px;background:${color};border-radius:${circle?"50%":"2px"};left:${Math.random()*100}vw;top:-20px;animation:confettiFall ${Math.random()*1500+1000}ms ease-in forwards;--drift:${(Math.random()-.5)*200}px;--rotation:${Math.random()*720}deg`;
    document.body.appendChild(el); setTimeout(()=>el.remove(),3000);
  },i*18);
}
export function triggerMiniConfetti(x:number,y:number){
  for(let i=0;i<20;i++){
    const el=document.createElement("div");
    const angle=Math.random()*Math.PI*2,speed=Math.random()*80+40;
    el.style.cssText=`position:fixed;z-index:9999;pointer-events:none;width:${Math.random()*6+4}px;height:${Math.random()*6+4}px;background:${COLORS[Math.floor(Math.random()*COLORS.length)]};border-radius:50%;left:${x}px;top:${y}px;animation:particleFly .8s ease-out forwards;--tx:${Math.cos(angle)*speed}px;--ty:${Math.sin(angle)*speed-60}px`;
    document.body.appendChild(el); setTimeout(()=>el.remove(),900);
  }
}
