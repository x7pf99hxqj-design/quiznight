import type { RankingQuestion } from "./rankings";
import type { FlagQuestion } from "./flags";
import type { BuzzerQuestion } from "./buzzer";
import type { LogoQuestion } from "./logos";
export type { RankingQuestion, FlagQuestion, BuzzerQuestion, LogoQuestion };

export type Difficulty = "easy"|"medium"|"hard";
export interface AvatarConfig { bodyColor:string; hair:number; eyes:number; mouth:number; }
export const DEFAULT_AVATAR: AvatarConfig = { bodyColor:"#8b5cf6", hair:1, eyes:0, mouth:0 };

export interface MultipleChoiceQuestion {
  id:number; type:"multiple_choice";
  question:string; options:{A:string;B:string;C:string;D:string}; correct:"A"|"B"|"C"|"D";
  category?:string; difficulty?:Difficulty;
}
export interface EstimationQuestion {
  id:number; type:"estimation";
  question:string; answer:number; unit:string;
  category?:string; difficulty?:Difficulty;
}
export type Question = MultipleChoiceQuestion|EstimationQuestion|RankingQuestion|FlagQuestion|BuzzerQuestion|LogoQuestion;

export interface Player { id:string; name:string; score:number; isHost:boolean; avatar:AvatarConfig; streak:number; }

export interface QuizConfig {
  questionCount:number; timePerQuestion:number;
  selectedCategories:string[]; difficulty:"all"|Difficulty;
  blitzMode:boolean; streakBonus:boolean; jokerEnabled:boolean;
  estimationCount:number; estimationTime:number;
  selectedRankingIds:number[];   // IDs der ausgewählten Rankings
  flagCount:number; flagBuzzTime:number;
  buzzerCount:number; buzzerTime:number;
  logoCount:number; logoTime:number;
}

export type MCChoice = "A"|"B"|"C"|"D";
export type GamePhase = "lobby"|"block_intro"|"countdown"|"question_active"|"answer_reveal"|"finished";
export type GameMode = "normal"|"duel"|"scribble";
export type DuelTeamId = "A"|"B";

export interface EstimationResult { answer:number; distance:number; points:number; rank:number; }
export interface RoundHistoryEntry {
  question:string; type:"multiple_choice"|"estimation"|"ranking"|"flag"|"buzzer"|"logo";
  correctAnswer:string; correctPlayerIds:string[];
}
export type BuzzResult = "correct"|"wrong"|"timeout";
export interface BuzzAttempt { playerId:string; reactionMs:number; result:BuzzResult; }

// ── Auszeichnungen am Ende (rein kosmetisch, keine Punktewirkung) ──────
export interface Achievement { icon:string; label:string; playerId:string; detail:string; }

// ── Duell-Modus ──────────────────────────────────────────────────────
export interface DuelConfig {
  questionCount:number; timePerQuestion:number;
  selectedCategories:string[]; difficulty:"all"|Difficulty;
}
export interface DuelMatchResult {
  matchNumber:number; teamAScore:number; teamBScore:number;
  winner:"A"|"B"|"draw";
  teamANames:string[]; teamBNames:string[];
}

// ── Scribble-Modus ────────────────────────────────────────────────────
export interface ScribbleConfig { roundsPerPlayer:number; drawTime:number; }
export interface ScribbleStroke { points:{x:number;y:number}[]; color:string; width:number; }
export interface ScribbleRoundResult {
  word:string; drawerId:string; drawerName:string; correctGuesserIds:string[];
}

export interface GameState {
  sessionCode:string; phase:GamePhase;
  players:Player[]; config:QuizConfig;
  availableCategories:string[];
  currentQuestionIndex:number; totalQuestions:number;
  currentQuestion:Question|null; questionStartTime:number|null;
  countdownEnd:number|null;
  // MC
  mcAnswers:Record<string,MCChoice>; mcAnswerTimes:Record<string,number>;
  mcTimerEnd:number|null; mcRevealed:boolean;
  blitzPoints:Record<string,number>; streakBonuses:Record<string,number>;
  jokerEliminated:Record<string,MCChoice[]>; usedJokers:string[];
  // Estimation
  estimationAnswers:Record<string,number>;
  estimationResults:Record<string,EstimationResult>; estimationRevealed:boolean;
  // Ranking – am Ende werden ALLE Items aufgedeckt, Host muss "Weiter" klicken
  rankingRevealed:number[];
  rankingTurnPlayerIds:string[]; rankingTurnIdx:number;
  rankingEliminated:string[]; rankingTimerEnd:number|null;
  rankingFinished:boolean; // true sobald die Runde vorbei ist und auf Host-Klick gewartet wird

  // ── Generischer Buzz-Mechanismus (für Flaggenrätsel UND Buzzer-Quiz) ──
  // Pausierbarer Haupttimer: wer zuerst buzzert darf antworten, bei Fehler
  // läuft die Zeit weiter und alle können erneut buzzern. Mehrfach buzzern erlaubt.
  buzzMainTimerEnd:number|null;       // absolutes Ende des Haupttimers
  buzzTimerRemaining:number;          // ms übrig wenn pausiert
  buzzWindowStartTime:number|null;    // für Reaktionszeit-Berechnung (setzt sich bei jedem Fenster-Neustart zurück)
  buzzCurrentBuzzer:string|null;      // wer gerade antwortet
  buzzAnswerTimerEnd:number|null;     // Zeit für aktuellen Antworter
  buzzAttemptLog:BuzzAttempt[];       // chronologisches Log aller Versuche inkl. Reaktionszeit
  buzzWinnerId:string|null;

  autoAdvanceAt:number|null; hostId:string|null;
  roundHistory:RoundHistoryEntry[];

  // ── Duell-Modus (eigenständig, nicht kombinierbar) ──────────────────
  mode:GameMode;
  duelConfig:DuelConfig;
  duelTeamA:string[]; duelTeamB:string[];      // Spieler-IDs pro Team
  duelMatchHistory:DuelMatchResult[];           // bleibt erhalten solange Lobby offen ist
  duelTeamAScore:number; duelTeamBScore:number; // aktuelles Match
  duelPointValue:number;                        // 1 oder 2 (letzte Fragen zählen doppelt)
  duelBuzzTimerEnd:number|null;                  // Race-to-buzz Fenster
  duelCurrentBuzzTeam:DuelTeamId|null;           // wer gerade das Antwortrecht hat
  duelAnswerTimerEnd:number|null;                // Zeit zum Antworten nach Buzz
  duelLockedOutTeam:DuelTeamId|null;              // wer in dieser Frage schon falsch lag
  duelRevealed:boolean;
  duelWinnerTeam:DuelTeamId|null;                 // wer diese Frage gewonnen hat (null=niemand)
  scribbleConfig:ScribbleConfig;
  scribbleTurnOrder:string[]; scribbleTurnIdx:number; scribbleRoundNumber:number;
  scribbleDrawerId:string|null; scribbleWord:string|null; scribbleWordLength:number;
  scribbleStrokes:ScribbleStroke[]; scribbleTimerEnd:number|null;
  scribbleCorrectGuessers:string[];
  scribbleGuessLog:{playerId:string;playerName:string;text:string;correct:boolean}[];
  scribbleRoundHistory:ScribbleRoundResult[]; scribbleRevealedWord:string|null;

  // ── Block-Übergänge (Quiz-Typen kommen nicht mehr gemischt) ─────────
  pendingBlockLabel:string|null;
  pendingBlockEmoji:string|null;
  pendingBlockCount:number;

  // ── Session-weites Scoreboard (über mehrere Quiz-Runden hinweg) ─────
  sessionScores:Record<string,number>;            // playerId -> kumulierte Punkte über alle Runden
  sessionRoundsPlayed:number;

  // ── Auszeichnungen am Ende (rein kosmetisch, keine Punktewirkung) ───
  achievements:Achievement[];
  maxStreakByPlayer:Record<string,number>;
  allBuzzAttempts:BuzzAttempt[];     // persistiert über die ganze Runde (für "Schnellster Buzzer")
  midpointScores:Record<string,number>|null;

  // ── Pause-Funktion ───────────────────────────────────────────────────
  paused:boolean;
  pausedAt:number|null;
}

export type ClientMessage =
  | {type:"create_session"; hostName:string; avatar:AvatarConfig}
  | {type:"join_session"; sessionCode:string; playerName:string; avatar:AvatarConfig}
  | {type:"reconnect"; sessionCode:string; playerId:string}
  | {type:"update_config"; config:QuizConfig}
  | {type:"start_quiz"}
  | {type:"continue_block"}
  | {type:"mc_answer"; choice:MCChoice}
  | {type:"use_joker"}
  | {type:"estimation_answer"; value:number}
  | {type:"ranking_answer"; value:string}
  | {type:"continue_ranking"}
  | {type:"buzz_press"}
  | {type:"buzz_answer"; value:string}
  | {type:"update_duel_config"; config:DuelConfig}
  | {type:"assign_team"; targetPlayerId:string; team:DuelTeamId}
  | {type:"choose_team"; team:DuelTeamId}
  | {type:"start_duel"}
  | {type:"duel_buzz"}
  | {type:"duel_answer"; choice:MCChoice}
  | {type:"end_duel"}
  | {type:"update_scribble_config"; config:ScribbleConfig}
  | {type:"start_scribble"}
  | {type:"scribble_draw"; stroke:ScribbleStroke}
  | {type:"scribble_clear"}
  | {type:"scribble_guess"; text:string}
  | {type:"scribble_skip"}
  | {type:"end_scribble"}
  | {type:"kick_player"; targetPlayerId:string}
  | {type:"pause_game"}
  | {type:"resume_game"}
  | {type:"end_quiz"}
  | {type:"restart"};

export type ServerMessage =
  | {type:"session_created"; sessionCode:string; playerId:string}
  | {type:"joined"; playerId:string}
  | {type:"state_update"; state:GameState}
  | {type:"error"; message:string}
  | {type:"kicked"};
