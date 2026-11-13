// Pages publiques exigées par l'App Store : politique de confidentialité,
// conditions d'utilisation et assistance. Servies par le serveur
// (/confidentialite, /conditions, /assistance) ; l'éditeur et l'adresse de
// contact viennent du .env (PUBLISHER_NAME, CONTACT_EMAIL).
const UPDATED = "13 novembre 2026";

const esc = (t) =>
  String(t).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

function page(title, body) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · RaceIQ</title>
<style>
:root{--bg:#f3f5f8;--card:#fff;--ink:#1d232d;--muted:#5d6775;--accent:#c8001e;--line:#dfe3e9}
@media (prefers-color-scheme:dark){:root{--bg:#0b0e13;--card:#141920;--ink:#eef1f5;--muted:#98a2b0;--accent:#ff3045;--line:#242b35}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,system-ui,Inter,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 48px}
.brand{font-weight:900;font-style:italic;font-size:22px;letter-spacing:-.5px}.brand span{color:var(--accent)}
h1{font-size:28px;line-height:1.2;margin:18px 0 4px}h2{font-size:19px;margin:28px 0 6px}
p,li{color:var(--ink)}.muted{color:var(--muted);font-size:14px}a{color:var(--accent)}
section{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:4px 18px 14px;margin-top:14px}
nav{display:flex;gap:14px;flex-wrap:wrap;margin-top:28px;font-size:14px}
</style></head><body><main>
<div class="brand">Race<span>IQ</span></div>
<h1>${esc(title)}</h1><p class="muted">Dernière mise à jour : ${UPDATED}</p>
${body}
<nav><a href="/confidentialite">Confidentialité</a><a href="/conditions">Conditions d’utilisation</a><a href="/assistance">Assistance</a></nav>
</main></body></html>`;
}

export function legalPage(kind, { publisher, contact } = {}) {
  const who = esc(publisher || "[nom de l’éditeur à compléter : PUBLISHER_NAME]");
  const mail = contact
    ? `<a href="mailto:${esc(contact)}">${esc(contact)}</a>`
    : "[adresse de contact à compléter : CONTACT_EMAIL]";
  if (kind === "confidentialite")
    return page(
      "Politique de confidentialité",
      `<section><h2>Qui sommes-nous ?</h2>
<p>RaceIQ est une application de suivi de la Formule 1 et de pronostics entre amis, éditée par ${who}. Contact : ${mail}.</p>
<p>RaceIQ est une application indépendante, sans lien avec la Formule 1, la FIA ni les écuries.</p></section>

<section><h2>Les données que nous gardons</h2>
<ul>
<li><b>Votre compte</b> : pseudo et mot de passe (stocké chiffré, jamais en clair). Aucune adresse e-mail, aucun nom réel, aucune localisation ne sont demandés.</li>
<li><b>Votre jeu</b> : pronostics, points, ligues, amis, grille du Mercato, votes sur les rumeurs.</li>
<li><b>Ce que vous publiez</b> : sujets et réponses du forum, messages de ligue, avis envoyés à l’équipe, signalements.</li>
<li><b>Vos réglages</b> (favoris, écurie, anti-spoil, thème), synchronisés avec votre compte pour les retrouver sur un autre téléphone.</li>
<li><b>Données techniques</b> : date de dernière visite ; rapports d’erreur de l’application (message et écran concerné, sans donnée personnelle) ; adresse IP utilisée temporairement pour limiter les abus (tentatives de connexion, inscriptions en rafale).</li>
</ul>
<p>Sans compte, l’application fonctionne en lecture seule : vos réglages restent sur votre téléphone.</p></section>

<section><h2>À quoi elles servent</h2>
<p>Uniquement à faire fonctionner RaceIQ : votre compte, le calcul des points et des classements, les échanges entre joueurs, la modération et la sécurité. Base légale : l’exécution du service que vous utilisez (article 6.1.b du RGPD) et notre intérêt légitime à le sécuriser (article 6.1.f).</p>
<p><b>Aucune publicité, aucun traceur, aucune revente</b> : vos données ne sont ni vendues, ni partagées à des fins commerciales, ni utilisées pour vous suivre sur d’autres applications ou sites.</p></section>

<section><h2>Qui y a accès</h2>
<ul>
<li>Les autres joueurs voient votre pseudo, vos messages publics, vos points et, une fois les sessions terminées, les pronostics de vos amis.</li>
<li>Les administrateurs de RaceIQ, pour la modération et l’assistance.</li>
<li>Nos fournisseurs ne reçoivent <b>aucune donnée personnelle</b> : les résultats F1 viennent de Hyprace et Jolpica ; les articles en anglais sont traduits par l’API Claude d’Anthropic (seul le texte public des articles est envoyé) ; la météo vient d’Open-Meteo (votre téléphone l’interroge directement, comme n’importe quel site web).</li>
</ul></section>

<section><h2>Combien de temps</h2>
<p>Tant que votre compte existe. Les copies de sauvegarde sont effacées au bout de 14 jours. Les journaux techniques (adresses IP) sont conservés au plus 30 jours. Les avis envoyés restent après la suppression du compte, mais sans lien avec vous.</p></section>

<section><h2>Vos droits</h2>
<p>Dans l’application, menu ☰ → <b>Mon compte</b> :</p>
<ul>
<li><b>Télécharger vos données</b> (droit d’accès et à la portabilité) ;</li>
<li><b>Changer de pseudo</b> (rectification) ;</li>
<li><b>Supprimer votre compte</b> : pronostics, amitiés, messages et sujets sont effacés immédiatement.</li>
</ul>
<p>Pour toute autre demande (opposition, limitation, question) : ${mail}. Vous pouvez aussi saisir la CNIL (cnil.fr).</p></section>

<section><h2>Enfants</h2>
<p>RaceIQ s’adresse aux personnes de 13 ans et plus. Aucun paiement, aucun argent réel n’est en jeu.</p></section>`,
    );
  if (kind === "conditions")
    return page(
      "Conditions d’utilisation",
      `<section><h2>Le service</h2>
<p>RaceIQ, édité par ${who}, propose l’actualité et les résultats de la Formule 1, un jeu de pronostics gratuit entre amis, un forum et des ligues privées. En créant un compte, vous acceptez ces conditions et la <a href="/confidentialite">politique de confidentialité</a>.</p>
<p>RaceIQ est indépendant : il n’est ni affilié, ni approuvé, ni sponsorisé par la Formule 1, la FIA, les écuries ou les pilotes. Les noms et marques cités appartiennent à leurs propriétaires et ne sont utilisés que pour désigner les compétitions, équipes et personnes.</p></section>

<section><h2>Le jeu de pronostics</h2>
<p>Le jeu est gratuit et sans argent réel : aucune mise, aucun gain, aucun lot. Les points servent uniquement aux classements entre joueurs. Les résultats viennent de fournisseurs de données sportives ; en cas d’erreur ou de pénalité tardive, les administrateurs peuvent corriger un classement et les points sont recalculés.</p></section>

<section><h2>Règles de la communauté : tolérance zéro</h2>
<p>Sur le forum, dans les ligues, dans les pseudos et noms de ligue, il est interdit de publier :</p>
<ul>
<li>des insultes, du harcèlement, des menaces ;</li>
<li>des propos haineux, racistes, sexistes, homophobes ou discriminatoires ;</li>
<li>du contenu sexuel, violent ou choquant ;</li>
<li>de la publicité, du spam, des liens frauduleux, des informations personnelles sur autrui.</li>
</ul>
<p>Un filtre bloque les mots inappropriés avant publication. Chaque message peut être <b>signalé</b>, et chaque joueur peut <b>masquer</b> un autre joueur. Les administrateurs examinent les signalements sous 24 heures, suppriment les contenus contraires à ces règles et peuvent supprimer le compte de leur auteur, sans préavis.</p></section>

<section><h2>Votre compte</h2>
<p>Vous êtes responsable de votre mot de passe et de ce que vous publiez. Vous pouvez supprimer votre compte à tout moment (menu ☰ → Mon compte). Nous pouvons suspendre ou supprimer un compte qui ne respecte pas ces règles.</p></section>

<section><h2>Disponibilité et responsabilité</h2>
<p>RaceIQ est fourni tel quel, sans garantie d’exactitude ou de disponibilité permanente des données. Nous pouvons faire évoluer l’application et ces conditions ; les changements importants seront signalés dans l’application.</p>
<p>Contact : ${mail}. Droit applicable : droit français.</p></section>`,
    );
  if (kind === "assistance")
    return page(
      "Assistance",
      `<section><h2>Besoin d’aide ?</h2>
<p>Écrivez-nous à ${mail} : nous répondons sous 48 heures.</p>
<ul>
<li><b>Mot de passe oublié</b> : écrivez-nous depuis la même adresse avec votre pseudo, un administrateur vous en donnera un nouveau.</li>
<li><b>Signaler un message</b> : touchez « Signaler » sous le message ; nos administrateurs le traitent sous 24 heures.</li>
<li><b>Supprimer votre compte</b> : menu ☰ → Mon compte → Supprimer mon compte.</li>
<li><b>Une idée, un bug ?</b> menu ☰ → Donner mon avis.</li>
</ul></section>`,
    );
  return null;
}
