import type { GameState } from "../../../shared/types";
import type { QuizHook } from "../lib/useQuiz";

export default function PauseOverlay({ state, quiz, isHost }: { state: GameState; quiz: QuizHook; isHost: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(7,7,16,0.92)", backdropFilter: "blur(12px)" }}>
      <div className="glass rounded-3xl p-8 max-w-sm w-full text-center pop-in">
        <div className="text-6xl mb-4 float">⏸️</div>
        <h2 className="text-2xl font-black text-white mb-2">Spiel pausiert</h2>
        <p className="text-white/40 text-sm mb-6">
          {isHost ? "Klick auf Fortsetzen, wenn alle bereit sind." : "Der Host hat das Spiel angehalten."}
        </p>
        {isHost ? (
          <button onClick={() => quiz.send({ type: "resume_game" })} className="btn-primary w-full py-4 rounded-2xl text-lg">
            ▶️ Fortsetzen
          </button>
        ) : (
          <p className="text-white/20 pulse-slow text-sm">Warte auf den Host…</p>
        )}
      </div>
    </div>
  );
}
