import { useQuiz } from "./lib/useQuiz";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Quiz from "./pages/Quiz";

export default function App() {
  const quiz = useQuiz();
  const { state, status, kicked } = quiz;

  if (kicked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="text-center space-y-4 max-w-sm p-8 rounded-3xl glass">
          <div className="text-5xl">🚪</div>
          <p className="font-black text-xl text-white">Du wurdest entfernt</p>
          <p className="text-white/40 text-sm">Der Host hat dich aus der Lobby entfernt.</p>
          <button onClick={() => window.location.reload()} className="btn-primary px-8 py-3 rounded-xl">
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-spin">🎯</div>
          <p className="text-muted-foreground">Verbinden…</p>
        </div>
      </div>
    );
  }

  if (status === "disconnected" || status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm p-6 bg-card rounded-3xl border border-border">
          <div className="text-4xl">⚡</div>
          <p className="font-black text-xl">Verbindung unterbrochen</p>
          <p className="text-muted-foreground text-sm">Seite neu laden um wieder zu verbinden.</p>
          <button onClick={() => window.location.reload()}
            className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition active:scale-95">
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  if (!state) return <Home quiz={quiz} />;
  if (state.phase === "lobby") return <Lobby quiz={quiz} />;
  return <Quiz quiz={quiz} />;
}
