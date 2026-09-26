"""Outils de Jarvis en lecture seule. Vides dans OS KADANS : tout passe par le chat Claude visible.

Le kit 2 (branchement Obsidian) ajoute ici la recherche et la lecture de ton vault.
masquer() retire clés, jetons et IBAN de ce que Jarvis lit à l'écran avant de l'afficher.
"""
import re

SECRETS = [
    re.compile(r"\b(?:sk|pk|rk)[-_](?:live|test|proj|ant|or)?[-_]?[A-Za-z0-9_\-]{16,}"),
    re.compile(r"\b(?:ghp|gho|ghs|github_pat|xox[abpr]|AKIA|AIza|ya29\.|shpat|glpat)[A-Za-z0-9_\-\.]{10,}"),
    re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{5,}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}\b"),                      # IBAN
    re.compile(r"\b[A-Za-z0-9+/_\-]{40,}={0,2}"),                                  # longue chaîne opaque
]
CLE_VALEUR = re.compile(r"(?i)((?:api[_ -]?key|secret|token|jeton|password|mot de passe|mdp|passwd|bearer|clé|private[_ ]key)\s*[:=]\s*)(\S{6,})")


def masquer(texte):
    texte = CLE_VALEUR.sub(lambda m: m.group(1) + "[masqué]", texte)
    for r in SECRETS:
        texte = r.sub("[masqué]", texte)
    return texte

OUTILS = {}


def executer(nom, args):
    return {"error": f"outil inconnu : {nom}"}


DEFINITIONS = []
