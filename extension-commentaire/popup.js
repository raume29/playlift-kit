const $ = (id) => document.getElementById(id);
const statut = (txt, classe = '') => { $('statut').textContent = txt; $('statut').className = classe; };
const CHAMPS = ['apiKey', 'prenom', 'modele', 'terrain', 'voix', 'exemples'];
const IDS = { apiKey: 'cle', prenom: 'prenom', modele: 'modele', terrain: 'terrain', voix: 'voix', exemples: 'exemples' };

chrome.runtime.sendMessage({ type: 'modeles' }, (rep) => {
  const sel = $('modele');
  Object.entries((rep && rep.data) || {}).forEach(([id, libelle]) => {
    const o = document.createElement('option');
    o.value = id; o.textContent = libelle;
    sel.append(o);
  });
  chrome.storage.local.get(CHAMPS, (s) => {
    CHAMPS.forEach((k) => { $(IDS[k]).value = s[k] || ''; });
    if (!s.modele) sel.value = 'claude-opus-5';
  });
});

$('enregistrer').addEventListener('click', () => {
  const val = {};
  CHAMPS.forEach((k) => { val[k] = $(IDS[k]).value.trim(); });
  chrome.storage.local.set(val, () => statut('Enregistré.', 'ok'));
});

$('tester').addEventListener('click', () => {
  statut('Test en cours…');
  const val = {};
  CHAMPS.forEach((k) => { val[k] = $(IDS[k]).value.trim(); });
  chrome.storage.local.set(val, () => {
    chrome.runtime.sendMessage({ type: 'sante' }, (rep) => {
      if (!rep || !rep.ok) return statut((rep && rep.erreur) || 'injoignable', 'ko');
      statut(`Clé OK · ${rep.data.modele}`, 'ok');
    });
  });
});
