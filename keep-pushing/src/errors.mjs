// Erreur d'API avec code HTTP (partagée par accounts.mjs et bets.mjs).
export class GameError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new GameError(status, message);
};
