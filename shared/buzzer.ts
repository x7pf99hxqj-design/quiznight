// ╔══════════════════════════════════════════════════════╗
// ║  QuizNight – BUZZER-QUIZ Modus                       ║
// ║  Wie Flaggenrätsel: Buzzern → Textantwort            ║
// ║  Nur ohne Bild – die Frage selbst ist im Fokus       ║
// ║  IDs 5001–5060                                       ║
// ╚══════════════════════════════════════════════════════╝

export interface BuzzerQuestion {
  id: number; type: "buzzer";
  question: string; answer: string; aliases?: string[];
  category: string; difficulty: "easy"|"medium"|"hard";
}

export const BUZZER_QUESTIONS: BuzzerQuestion[] = [
  // ── LEICHT ──────────────────────────────────────────────
  { id:5001, type:"buzzer", question:"Wie heißt der Gründer von Microsoft?", answer:"Bill Gates", aliases:["gates"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5002, type:"buzzer", question:"Welches Element hat das chemische Symbol 'Au'?", answer:"Gold", aliases:[], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5003, type:"buzzer", question:"Wie viele Beine hat eine Spinne?", answer:"8", aliases:["acht"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5004, type:"buzzer", question:"Wie heißt die Hauptstadt von Japan?", answer:"Tokio", aliases:["tokyo"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5005, type:"buzzer", question:"Welcher Planet ist der Erde am nächsten?", answer:"Venus", aliases:[], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5006, type:"buzzer", question:"Wie heißt der höchste Berg der Welt?", answer:"Mount Everest", aliases:["everest"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5007, type:"buzzer", question:"Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?", answer:"11", aliases:["elf"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5008, type:"buzzer", question:"Welches Tier ist das größte Landtier der Welt?", answer:"Elefant", aliases:[], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5009, type:"buzzer", question:"Wie heißt der Regisseur von 'Titanic' und 'Avatar'?", answer:"James Cameron", aliases:["cameron"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5010, type:"buzzer", question:"Wie viele Saiten hat eine klassische Gitarre?", answer:"6", aliases:["sechs"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5011, type:"buzzer", question:"Welches Land hat die Form eines Stiefels?", answer:"Italien", aliases:["italy"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5012, type:"buzzer", question:"Wie heißt der Erfinder der Glühbirne?", answer:"Thomas Edison", aliases:["edison"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5013, type:"buzzer", question:"Wie viele Kontinente gibt es?", answer:"7", aliases:["sieben"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5014, type:"buzzer", question:"Welches Meer liegt zwischen Europa und Afrika?", answer:"Mittelmeer", aliases:["mediterranean"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5015, type:"buzzer", question:"Wie heißt der Hauptdarsteller in 'Forrest Gump'?", answer:"Tom Hanks", aliases:["hanks"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5016, type:"buzzer", question:"Wie viele Tasten hat ein Standard-Klavier?", answer:"88", aliases:[], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5017, type:"buzzer", question:"Welches Tier gilt als König der Tiere?", answer:"Löwe", aliases:["lion"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5018, type:"buzzer", question:"Wie heißt die Währung in den USA?", answer:"Dollar", aliases:["us dollar"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5019, type:"buzzer", question:"Wie viele Farben hat ein Regenbogen klassischerweise?", answer:"7", aliases:["sieben"], category:"Buzzer-Quiz", difficulty:"easy" },
  { id:5020, type:"buzzer", question:"Welcher Ozean ist der größte der Welt?", answer:"Pazifik", aliases:["pazifischer ozean","pacific"], category:"Buzzer-Quiz", difficulty:"easy" },

  // ── MITTEL ──────────────────────────────────────────────
  { id:5021, type:"buzzer", question:"Wie heißt der Komponist der 9. Sinfonie 'Ode an die Freude'?", answer:"Beethoven", aliases:["ludwig van beethoven"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5022, type:"buzzer", question:"Welches Element hat die Ordnungszahl 1?", answer:"Wasserstoff", aliases:["hydrogen"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5023, type:"buzzer", question:"Wie heißt der längste Fluss der Welt?", answer:"Amazonas", aliases:["amazon"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5024, type:"buzzer", question:"In welcher Stadt steht der Eiffelturm?", answer:"Paris", aliases:[], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5025, type:"buzzer", question:"Wie heißt der erste Mensch im Weltall?", answer:"Juri Gagarin", aliases:["gagarin","yuri gagarin"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5026, type:"buzzer", question:"Welches Land hat die meisten Einwohner der Welt?", answer:"Indien", aliases:["india"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5027, type:"buzzer", question:"Wie heißt der Bestseller-Autor von 'Harry Potter'?", answer:"J.K. Rowling", aliases:["rowling","joanne rowling"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5028, type:"buzzer", question:"Wie viele Zeitzonen hat Russland?", answer:"11", aliases:["elf"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5029, type:"buzzer", question:"Welcher Wissenschaftler entwickelte die Relativitätstheorie?", answer:"Albert Einstein", aliases:["einstein"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5030, type:"buzzer", question:"Wie heißt die größte Insel der Welt?", answer:"Grönland", aliases:["greenland"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5031, type:"buzzer", question:"In welchem Jahr fiel die Berliner Mauer?", answer:"1989", aliases:[], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5032, type:"buzzer", question:"Wie heißt der Malers der 'Mona Lisa'?", answer:"Leonardo da Vinci", aliases:["da vinci","leonardo"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5033, type:"buzzer", question:"Welches Gas machen Pflanzen bei der Photosynthese hauptsächlich frei?", answer:"Sauerstoff", aliases:["oxygen","o2"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5034, type:"buzzer", question:"Wie heißt der Fluss, der durch London fließt?", answer:"Themse", aliases:["thames"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5035, type:"buzzer", question:"Wie viele Ringe hat das Olympia-Symbol?", answer:"5", aliases:["fünf"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5036, type:"buzzer", question:"Welches Land erfand die Pizza Margherita?", answer:"Italien", aliases:["italy"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5037, type:"buzzer", question:"Wie heißt der Comicverleger, der Mickey Mouse erschuf?", answer:"Walt Disney", aliases:["disney"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5038, type:"buzzer", question:"Welches Organ produziert Insulin?", answer:"Bauchspeicheldrüse", aliases:["pankreas"], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5039, type:"buzzer", question:"Wie heißt der größte See Deutschlands?", answer:"Bodensee", aliases:[], category:"Buzzer-Quiz", difficulty:"medium" },
  { id:5040, type:"buzzer", question:"In welchem Jahr endete der Zweite Weltkrieg?", answer:"1945", aliases:[], category:"Buzzer-Quiz", difficulty:"medium" },

  // ── SCHWER ──────────────────────────────────────────────
  { id:5041, type:"buzzer", question:"Wie heißt der Philosoph, der 'Also sprach Zarathustra' schrieb?", answer:"Friedrich Nietzsche", aliases:["nietzsche"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5042, type:"buzzer", question:"Welches Element hat die chemische Bezeichnung 'Fe'?", answer:"Eisen", aliases:["iron"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5043, type:"buzzer", question:"Wie heißt die Hauptstadt von Kasachstan?", answer:"Astana", aliases:["nur-sultan"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5044, type:"buzzer", question:"Wer entdeckte das Penicillin?", answer:"Alexander Fleming", aliases:["fleming"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5045, type:"buzzer", question:"Wie heißt der vorletzte Buchstabe des griechischen Alphabets?", answer:"Psi", aliases:[], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5046, type:"buzzer", question:"In welchem Jahr wurde die UNO gegründet?", answer:"1945", aliases:[], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5047, type:"buzzer", question:"Wie heißt der Komponist der Oper 'Der Ring des Nibelungen'?", answer:"Richard Wagner", aliases:["wagner"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5048, type:"buzzer", question:"Welches Land hat als einziges der Welt eine nicht-rechteckige Flagge?", answer:"Nepal", aliases:[], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5049, type:"buzzer", question:"Wer schrieb den Roman 'Der Prozess'?", answer:"Franz Kafka", aliases:["kafka"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5050, type:"buzzer", question:"Wie heißt das schwerste natürliche chemische Element?", answer:"Uran", aliases:["uranium"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5051, type:"buzzer", question:"In welcher Stadt wurde Mozart geboren?", answer:"Salzburg", aliases:[], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5052, type:"buzzer", question:"Wie heißt der Architekt des Eiffelturms?", answer:"Gustave Eiffel", aliases:["eiffel"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5053, type:"buzzer", question:"Welches Land war früher als 'Persien' bekannt?", answer:"Iran", aliases:[], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5054, type:"buzzer", question:"Wer war der erste Kanzler der Bundesrepublik Deutschland?", answer:"Konrad Adenauer", aliases:["adenauer"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5055, type:"buzzer", question:"Wie heißt die kleinste Knochen im menschlichen Körper?", answer:"Steigbügel", aliases:["stapes"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5056, type:"buzzer", question:"In welchem Jahr wurde das World Wide Web erfunden?", answer:"1989", aliases:["1990"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5057, type:"buzzer", question:"Wie heißt der Fluss, der durch Wien fließt?", answer:"Donau", aliases:["danube"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5058, type:"buzzer", question:"Wer komponierte 'Die vier Jahreszeiten'?", answer:"Antonio Vivaldi", aliases:["vivaldi"], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5059, type:"buzzer", question:"Wie heißt die Hauptstadt von Australien (nicht Sydney)?", answer:"Canberra", aliases:[], category:"Buzzer-Quiz", difficulty:"hard" },
  { id:5060, type:"buzzer", question:"Welcher Maler schnitt sich selbst das Ohr ab?", answer:"Vincent van Gogh", aliases:["van gogh"], category:"Buzzer-Quiz", difficulty:"hard" },
];
