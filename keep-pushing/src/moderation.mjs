// Filtre des contenus publiés par les joueurs (forum, discussions de ligue,
// noms de ligue, pseudos) : insultes et propos haineux refusés avant
// publication. Exigé par Apple pour les applis avec du contenu des joueurs,
// en plus du signalement et du blocage. Mots entiers, sans casse ni accents,
// y compris écrits avec des chiffres (« s4lope ») ou des séparateurs (« c.o.n.n.a.r.d »).
import { fail } from "./errors.mjs";

const BANNED = [
  // français
  "connard",
  "connasse",
  "salope",
  "salopard",
  "pute",
  "putes",
  "enculé",
  "enculer",
  "encule",
  "batard",
  "bâtard",
  "fils de pute",
  "fdp",
  "nique ta mere",
  "ntm",
  "pédé",
  "pede",
  "pd",
  "tapette",
  "gouine",
  "negre",
  "nègre",
  "bougnoule",
  "youpin",
  "bicot",
  "chinetoque",
  "sale arabe",
  "sale noir",
  "sale juif",
  "trisomique",
  // anglais
  "fuck you",
  "motherfucker",
  "cunt",
  "whore",
  "slut",
  "bitch",
  "nigger",
  "nigga",
  "faggot",
  "kys",
  "kill yourself",
];
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };
const normalize = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c);
const PATTERNS = BANNED.map(
  (w) => new RegExp(`(^|[^a-z])${normalize(w).replace(/\s+/g, "[^a-z]+")}($|[^a-z])`),
);
// Lettres isolées séparées par des points, tirets, espaces… recollées
// (« c.o.n.n.a.r.d », « s a l o p e »).
const joinSpelled = (t) =>
  t.replace(/\b[a-z](?:[\s._*-]+[a-z]\b){2,}/g, (m) => m.replace(/[^a-z]/g, ""));

export function isClean(text) {
  const t = normalize(text);
  return !PATTERNS.some((re) => re.test(t) || re.test(joinSpelled(t)));
}

export function assertClean(text, what = "Message") {
  if (!isClean(text))
    fail(400, `${what} refusé : langage inapproprié. Restez courtois (conditions d’utilisation).`);
}
