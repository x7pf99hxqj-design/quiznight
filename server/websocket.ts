import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { ClientMessage, ServerMessage } from "../shared/types.js";
import * as store from "./storage.js";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws: WebSocket) => {
    let sessionCode: string | null = null;
    let playerId: string | null = null;
    const send = (msg: ServerMessage) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };

    ws.on("message", (raw) => {
      let msg: ClientMessage;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === "create_session") {
        const name = msg.hostName?.trim();
        if (!name) return send({ type:"error", message:"Name fehlt" });
        const { session, playerId: pid } = store.createSession(name, msg.avatar);
        sessionCode = session.code; playerId = pid;
        session.clients.set(pid, ws);
        send({ type:"session_created", sessionCode:session.code, playerId:pid });
        store.broadcastState(session); return;
      }
      if (msg.type === "join_session") {
        const code = msg.sessionCode?.trim().toUpperCase(), name = msg.playerName?.trim();
        if (!code || !name) return send({ type:"error", message:"Daten fehlen" });
        const result = store.joinSession(code, name, msg.avatar);
        if (!result) return send({ type:"error", message:"Session nicht gefunden" });
        sessionCode = result.session.code; playerId = result.playerId;
        result.session.clients.set(playerId, ws);
        send({ type:"joined", playerId }); store.broadcastState(result.session); return;
      }
      if (msg.type === "reconnect") {
        const session = store.reconnectSession(msg.sessionCode, msg.playerId);
        if (!session) return send({ type:"error", message:"Session nicht mehr verfügbar" });
        sessionCode = session.code; playerId = msg.playerId;
        session.clients.set(playerId, ws); // alte/tote Verbindung wird ersetzt
        send({ type:"joined", playerId });
        store.broadcastState(session);
        return;
      }

      if (!sessionCode || !playerId) return;
      const session = store.getSession(sessionCode);
      if (!session) return;

      switch (msg.type) {
        case "update_config":      store.updateConfig(session, playerId, msg.config); break;
        case "start_quiz":         if (!store.startQuiz(session, playerId)) send({ type:"error", message:"Keine Fragen verfügbar" }); break;
        case "continue_block":     store.continueBlock(session, playerId); break;
        case "mc_answer":          store.submitMCAnswer(session, playerId, msg.choice); break;
        case "use_joker":          store.useJoker(session, playerId); break;
        case "estimation_answer":  store.submitEstimationAnswer(session, playerId, msg.value); break;
        case "ranking_answer":     store.submitRankingAnswer(session, playerId, msg.value); break;
        case "continue_ranking":   store.continueRanking(session, playerId); break;
        case "buzz_press":         store.submitBuzzPress(session, playerId); break;
        case "buzz_answer":        store.submitBuzzAnswer(session, playerId, msg.value); break;
        case "update_duel_config":  store.updateDuelConfig(session, playerId, msg.config); break;
        case "assign_team":         store.assignDuelTeam(session, playerId, msg.targetPlayerId, msg.team); break;
        case "choose_team":         store.chooseDuelTeam(session, playerId, msg.team); break;
        case "start_duel":          if (!store.startDuel(session, playerId)) send({ type:"error", message:"Beide Teams brauchen mindestens 1 Spieler" }); break;
        case "duel_buzz":           store.submitDuelBuzz(session, playerId); break;
        case "duel_answer":         store.submitDuelAnswer(session, playerId, msg.choice); break;
        case "end_duel":            store.endDuel(session, playerId); break;
        case "update_scribble_config": store.updateScribbleConfig(session, playerId, msg.config); break;
        case "start_scribble":      if (!store.startScribble(session, playerId)) send({type:"error",message:"Mindestens 2 Spieler nötig"}); break;
        case "scribble_draw":       store.scribbleDraw(session, playerId, msg.stroke); break;
        case "scribble_clear":      store.scribbleClear(session, playerId); break;
        case "scribble_guess":      store.scribbleGuess(session, playerId, msg.text); break;
        case "scribble_skip":       store.scribbleSkip(session, playerId); break;
        case "end_scribble":        store.endScribble(session, playerId); break;
        case "kick_player":         store.kickPlayer(session, playerId, msg.targetPlayerId); break;
        case "pause_game":          store.pauseGame(session, playerId); break;
        case "resume_game":         store.resumeGame(session, playerId); break;
        case "end_quiz":           store.endQuiz(session, playerId); break;
        case "restart":            store.restartSession(session, playerId); break;
      }
    });

    ws.on("close", () => {
      if (sessionCode && playerId) { const s = store.getSession(sessionCode); if (s) store.removeClient(s, playerId); }
    });
  });
  console.log("✅ WebSocket ready");
}
