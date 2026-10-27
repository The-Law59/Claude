// Notifications dans l'appli : réponses au forum, messages de ligue.
// state.notifications[userId] = [{ id, key, text, link, eventId, count, at, read }].
// Plusieurs nouveautés sur le même sujet (même clé) ne font qu'une ligne.
import { randomBytes } from "node:crypto";

const KEEP = 50;

// text(count) : libellé selon le nombre de nouveautés regroupées.
export function notify(
  state,
  userId,
  { key, text, link, eventId = null },
  { now = Date.now(), rand = randomBytes } = {},
) {
  state.notifications ??= {};
  const list = (state.notifications[userId] ??= []);
  const same = list.find((n) => n.key === key && !n.read);
  if (same) {
    same.count += 1;
    same.text = text(same.count);
    same.at = now;
  } else
    list.push({
      id: rand(6).toString("base64url"),
      key,
      text: text(1),
      link,
      eventId,
      count: 1,
      at: now,
      read: false,
    });
  // On garde les 50 plus récentes.
  list.sort((a, b) => b.at - a.at);
  list.length = Math.min(list.length, KEEP);
}

export function inbox(state, userId) {
  const items = [...(state.notifications?.[userId] ?? [])].sort((a, b) => b.at - a.at);
  return { unread: items.filter((n) => !n.read).length, items };
}

// Par ids, par lien (sujet, ligue), ou tout si rien n'est précisé.
export function markRead(state, userId, ids, link) {
  for (const n of state.notifications?.[userId] ?? [])
    if (ids ? ids.includes(n.id) : !link || n.link === link) n.read = true;
}

// Réponse au forum : prévient l'auteur du sujet et ceux qui y ont répondu,
// sauf l'auteur de la réponse et ceux qui l'ont masqué.
export function notifyReply(state, topic, from, opts) {
  const to = new Set(topic.posts.map((p) => p.userId));
  to.delete(from.id);
  for (const uid of to) {
    if ((state.users[uid]?.blocked ?? []).includes(from.id)) continue;
    notify(
      state,
      uid,
      {
        key: `forum:${topic.id}`,
        text: (n) =>
          n > 1
            ? `${n} nouvelles réponses à « ${topic.title} »`
            : `${from.pseudo} a répondu à « ${topic.title} »`,
        link: `/forum/${topic.id}`,
        eventId: topic.eventId,
      },
      opts,
    );
  }
}

// Message dans une ligue : prévient les autres membres.
export function notifyLeague(state, league, from, opts) {
  for (const uid of league.members) {
    if (uid === from.id) continue;
    notify(
      state,
      uid,
      {
        key: `league:${league.id}`,
        text: (n) =>
          n > 1
            ? `${n} nouveaux messages dans « ${league.name} »`
            : `${from.pseudo} a écrit dans « ${league.name} »`,
        link: `/pronos?league=${league.id}`,
      },
      opts,
    );
  }
}

// Demande d'ami (ou acceptation si l'autre vous avait déjà ajouté).
export function notifyFriend(state, from, to, opts) {
  if (!to || to.id === from.id) return;
  const accepted = to.friends.includes(from.id);
  notify(
    state,
    to.id,
    {
      key: `friend:${from.id}`,
      text: () =>
        accepted
          ? `${from.pseudo} a accepté votre demande d'ami`
          : `${from.pseudo} veut être votre ami`,
      link: "/friends",
    },
    opts,
  );
}
