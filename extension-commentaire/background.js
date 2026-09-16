// Le service worker fait l'appel à l'API Anthropic : depuis une page LinkedIn, un fetch
// sortant se heurterait à la CSP de LinkedIn. Ici, `host_permissions` suffit.
// Ta clé ne quitte jamais ton navigateur : elle part à api.anthropic.com et nulle part
// ailleurs. Il n'y a aucun serveur Playlift dans la boucle.
importScripts("prompt.js");

const API = "https://api.anthropic.com/v1/messages";
const MODELES = {
  "claude-opus-5": "Opus 5 (le meilleur, 10 à 25 s)",
  "claude-sonnet-5": "Sonnet 5 (plus rapide, moins cher)",
};
const MODELE_DEFAUT = "claude-opus-5";

function remplit(gabarit, valeurs) {
  return gabarit.replace(/\{(\w+)\}/g, (m, k) => (k in valeurs ? valeurs[k] : m));
}

async function reglages() {
  const s = await chrome.storage.local.get(["apiKey", "prenom", "modele", "exemples", "terrain", "voix"]);
  return {
    apiKey: (s.apiKey || "").trim(),
    prenom: (s.prenom || "").trim() || "moi",
    modele: MODELES[s.modele] ? s.modele : MODELE_DEFAUT,
    exemples: (s.exemples || "").trim() || self.PROMPT.EXEMPLES_DEFAUT,
    terrain: (s.terrain || "").trim() || self.PROMPT.TERRAIN_DEFAUT,
    voix: (s.voix || "").trim() || self.PROMPT.VOIX_DEFAUT,
  };
}

// Le modèle répond en JSON, mais un JSON peut arriver entouré de texte ou de ```.
// On isole la première accolade et la dernière : le reste est du bruit.
function extraitJson(texte) {
  const t = String(texte || "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("réponse sans JSON");
  return JSON.parse(t.slice(a, b + 1));
}

// Zéro tiret long, quoi qu'il arrive : c'est le tell numéro un d'un texte écrit par une IA.
function sansTirets(t) {
  return String(t || "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s*--\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

async function commentaire(payload) {
  const r = await reglages();
  if (!r.apiKey) return { ok: false, erreur: "clé absente : clique l'icône de l'extension et colle ta clé Anthropic" };

  const systeme = remplit(self.PROMPT.SYSTEME, { prenom: r.prenom, exemples: r.exemples, terrain: r.terrain, voix: r.voix });
  const existants = (payload.existants || []).length
    ? "\nCommentaires déjà présents sous le post (ne redis pas ce qu'ils disent, ne leur réponds pas) :\n"
      + payload.existants.map((c) => `- ${c}`).join("\n") + "\n"
    : "";
  const eviter = payload.eviter
    ? `\nPropositions déjà faites, à ne pas refaire (autre angle, autre exemple) :\n"""${payload.eviter}"""\n`
    : "";
  const demande = remplit(self.PROMPT.DEMANDE, {
    auteur: payload.auteur || "inconnu", post: payload.post || "", existants, eviter,
  });

  const ctrl = new AbortController();
  // Opus écrit les trois propositions en 10 à 30 s. Le délai est large exprès.
  const minuteur = setTimeout(() => ctrl.abort(), 90000);
  try {
    const rep = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": r.apiKey,
        "anthropic-version": "2023-06-01",
        // Autorise l'appel depuis un navigateur. La clé reste chez toi : c'est ton
        // extension, sur ta machine, qui parle à Anthropic.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: r.modele,
        max_tokens: 2000,
        system: systeme,
        messages: [{ role: "user", content: demande }],
        // Un commentaire n'a pas besoin d'une longue réflexion : effort moyen, ça
        // répond plus vite et ça coûte moins.
        output_config: { effort: "medium" },
      }),
      signal: ctrl.signal,
    });
    const data = await rep.json().catch(() => ({}));
    if (!rep.ok) {
      const msg = data?.error?.message || `HTTP ${rep.status}`;
      if (rep.status === 401) return { ok: false, erreur: "clé refusée : vérifie-la dans les réglages" };
      if (rep.status === 429) return { ok: false, erreur: "trop de requêtes ou crédit épuisé : " + msg };
      return { ok: false, erreur: msg };
    }
    if (data.stop_reason === "refusal") return { ok: false, erreur: "le modèle a refusé ce post" };
    const texte = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const json = extraitJson(texte);
    const propositions = (json.propositions || [])
      .map((p) => ({ registre: p.registre, texte: sansTirets(p.commentaire) }))
      .filter((p) => p.texte.length >= 3)
      .map((p) => ({ ...p, chars: p.texte.length }));
    if (!propositions.length) return { ok: false, erreur: "aucune proposition lisible" };
    const premier = propositions.find((p) => p.registre === "long") || propositions[0];
    return { ok: true, data: { texte: premier.texte, registre: premier.registre, chars: premier.chars, propositions } };
  } catch (e) {
    return {
      ok: false,
      erreur: e.name === "AbortError" ? "délai dépassé (90 s)" : String(e.message || e),
    };
  } finally {
    clearTimeout(minuteur);
  }
}

// Test depuis le popup : un appel minuscule qui vérifie la clé et le modèle.
async function sante() {
  const r = await reglages();
  if (!r.apiKey) return { ok: false, erreur: "clé absente" };
  try {
    const rep = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": r.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: r.modele, max_tokens: 5, messages: [{ role: "user", content: "ok" }] }),
    });
    const data = await rep.json().catch(() => ({}));
    if (!rep.ok) return { ok: false, erreur: data?.error?.message || `HTTP ${rep.status}` };
    return { ok: true, data: { modele: r.modele } };
  } catch (e) {
    return { ok: false, erreur: String(e.message || e) };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, repond) => {
  if (msg?.type === "commentaire") { commentaire(msg.payload).then(repond); return true; }
  if (msg?.type === "sante") { sante().then(repond); return true; }
  if (msg?.type === "modeles") { repond({ ok: true, data: MODELES }); return false; }
});
