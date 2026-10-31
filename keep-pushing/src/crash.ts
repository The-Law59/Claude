// Remontée des plantages de l'appli au serveur (tableau de bord admin).
// Sans compte : l'appli peut planter avant la connexion.
import { Platform } from "react-native";
import { API_URL, hasApi } from "./api.mjs";

const VERSION = "0.2";
let sent = 0;

export function reportCrash(error: unknown, where = "") {
  // Au plus 10 rapports par lancement : une boucle d'erreurs ne doit rien saturer.
  if (!hasApi() || ++sent > 10) return;
  const e = error instanceof Error ? error : new Error(String(error));
  const page = typeof location !== "undefined" ? location.pathname : "";
  fetch(`${API_URL}/api/errors`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: `${e.name}: ${e.message}`,
      stack: e.stack,
      where: where || page,
      platform: Platform.OS,
      version: VERSION,
    }),
  }).catch(() => {});
}

// Erreurs non rattrapées : navigateur (web) ou moteur JavaScript (mobile).
export function installCrashReporting() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.addEventListener("error", (ev) => reportCrash(ev.error ?? ev.message));
    window.addEventListener("unhandledrejection", (ev) => reportCrash(ev.reason));
    return;
  }
  const g = globalThis as {
    ErrorUtils?: {
      getGlobalHandler: () => (e: unknown, fatal?: boolean) => void;
      setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void;
    };
  };
  const previous = g.ErrorUtils?.getGlobalHandler();
  g.ErrorUtils?.setGlobalHandler((e, fatal) => {
    reportCrash(e, fatal ? "plantage" : "");
    previous?.(e, fatal);
  });
}
