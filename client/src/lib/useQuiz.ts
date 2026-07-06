import { useState, useEffect, useRef, useCallback } from "react";
import type { ClientMessage, ServerMessage, GameState, AvatarConfig } from "../../../shared/types";
export type ConnectionStatus = "connecting"|"connected"|"disconnected"|"error";

const STORAGE_KEY = "quiznight_session";

export interface QuizHook {
  state:GameState|null; playerId:string|null; status:ConnectionStatus; error:string|null; kicked:boolean;
  send:(msg:ClientMessage)=>void;
  createSession:(name:string,avatar:AvatarConfig)=>void;
  joinSession:(code:string,name:string,avatar:AvatarConfig)=>void;
  leaveSession:()=>void;
}
export function useQuiz(): QuizHook {
  const [state,setState]=useState<GameState|null>(null);
  const [playerId,setPlayerId]=useState<string|null>(null);
  const [status,setStatus]=useState<ConnectionStatus>("connecting");
  const [error,setError]=useState<string|null>(null);
  const [kicked,setKicked]=useState(false);
  const wsRef=useRef<WebSocket|null>(null);

  useEffect(()=>{
    const proto=window.location.protocol==="https:"?"wss:":"ws:";
    const ws=new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current=ws;
    ws.onopen=()=>{
      setStatus("connected");
      // Bei Reload/Verbindungsabbruch automatisch in die alte Session zurückkehren,
      // statt den Spieler komplett neu beitreten zu lassen (verliert sonst Score & Avatar).
      try{
        const saved=localStorage.getItem(STORAGE_KEY);
        if(saved){
          const{sessionCode,playerId:savedPid}=JSON.parse(saved);
          if(sessionCode&&savedPid) ws.send(JSON.stringify({type:"reconnect",sessionCode,playerId:savedPid}));
        }
      }catch{}
    };
    ws.onclose=()=>setStatus("disconnected");
    ws.onerror=()=>setStatus("error");
    ws.onmessage=(ev)=>{
      const msg:ServerMessage=JSON.parse(ev.data);
      if(msg.type==="session_created")setPlayerId(msg.playerId);
      else if(msg.type==="joined")setPlayerId(msg.playerId);
      else if(msg.type==="state_update")setState(msg.state);
      else if(msg.type==="kicked"){
        setKicked(true);
        try{localStorage.removeItem(STORAGE_KEY);}catch{}
      }
      else if(msg.type==="error"){
        setError(msg.message);setTimeout(()=>setError(null),4000);
        // Wenn noch kein State existiert, ist wahrscheinlich der Reconnect-Versuch fehlgeschlagen
        // (Session abgelaufen/Spieler entfernt) -> alten Eintrag verwerfen, sonst hängt man fest.
        setState(prev=>{ if(!prev){ try{localStorage.removeItem(STORAGE_KEY);}catch{} } return prev; });
      }
    };
    return()=>ws.close();
  },[]);

  // Session-Code + eigene PlayerId für Reconnect sichern, sobald beide bekannt sind
  useEffect(()=>{
    if(playerId&&state?.sessionCode){
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify({sessionCode:state.sessionCode,playerId}));}catch{}
    }
  },[playerId,state?.sessionCode]);

  const send=useCallback((msg:ClientMessage)=>{if(wsRef.current?.readyState===WebSocket.OPEN)wsRef.current.send(JSON.stringify(msg));},[]);
  const createSession=useCallback((name:string,avatar:AvatarConfig)=>send({type:"create_session",hostName:name,avatar}),[send]);
  const joinSession=useCallback((code:string,name:string,avatar:AvatarConfig)=>send({type:"join_session",sessionCode:code,playerName:name,avatar}),[send]);
  const leaveSession=useCallback(()=>{
    try{localStorage.removeItem(STORAGE_KEY);}catch{}
    setState(null);setPlayerId(null);
    wsRef.current?.close();
  },[]);
  return{state,playerId,status,error,kicked,send,createSession,joinSession,leaveSession};
}
