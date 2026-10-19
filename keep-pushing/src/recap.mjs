// Récap d'un week-end de pronos : points, meilleurs coups, progression au
// classement, et texte à partager (WhatsApp, SMS…). Sans dépendance Node :
// le serveur calcule, l'app met en forme.
import { PARTS, POINTS } from "./bets.mjs";

const LABELS = { quali: "qualifs", sprint: "sprint", race: "course" };
const ord = (n) => (n === 1 ? "1er" : `${n}e`);

// score : scoreBet(bet, results) ; name(id) : nom court d'un pilote.
export function highlights(bet, score, name) {
  const out = [];
  for (const part of Object.keys(PARTS)) {
    const s = score[part];
    if (!s) continue;
    s.slots.forEach((p, i) => {
      if (p === POINTS.exact && i < 3)
        out.push(`${name(bet[part][i])} pile en P${i + 1} (${LABELS[part]})`);
    });
    if (s.bonus) out.push(`sans-faute en ${LABELS[part]} (+${s.bonus})`);
  }
  if (score.fastest) out.push(`meilleur tour : ${name(bet.fastest)} ✓`);
  if (score.dnf === POINTS.dnfExact) out.push(`nombre d'abandons exact (${bet.dnf})`);
  if (score.answer) out.push("bonne réponse à la question du week-end");
  return out;
}

export const exactCount = (score) =>
  Object.keys(PARTS).reduce(
    (n, p) => n + (score[p]?.slots.filter((x) => x === POINTS.exact).length ?? 0),
    0,
  );

// r : réponse de /api/recap ; url : adresse de l'app à partager.
export function shareText(r, url) {
  const lines = [
    `🏁 Keep Pushing · ${r.event}`,
    `${r.points} pts${r.joker ? " (joker ×2 !)" : ""}${r.best ? ` · meilleur score : ${r.best.pseudo} (${r.best.points})` : ""}`,
  ];
  if (r.exact)
    lines.push(`🎯 ${r.exact} place${r.exact > 1 ? "s" : ""} exacte${r.exact > 1 ? "s" : ""}`);
  if (r.highlights.length) lines.push(`⭐ ${r.highlights.slice(0, 2).join(" · ")}`);
  if (r.rankAfter)
    lines.push(
      r.rankBefore && r.rankBefore !== r.rankAfter
        ? `${r.rankAfter < r.rankBefore ? "📈" : "📉"} ${ord(r.rankBefore)} → ${ord(r.rankAfter)} au général`
        : `🏆 ${ord(r.rankAfter)} au général sur ${r.players}`,
    );
  if (url) lines.push(`Viens parier avec moi : ${url}`);
  return lines.join("\n");
}
