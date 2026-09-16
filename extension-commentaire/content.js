// Machine à commentaires : une barre au-dessus de chaque champ de commentaire LinkedIn.
// Lecture du DOM affiché, rien d'autre : aucun clic automatique, aucune requête vers
// LinkedIn. Le commentaire s'écrit dans le champ, c'est toi qui cliques sur Publier.
//
// Le DOM de LinkedIn change sans prévenir : tout ici est écrit pour dégrader
// proprement (plusieurs sélecteurs par cible, repli sur le texte le plus long du
// post) plutôt que pour être élégant. Si la barre n'apparaît plus, c'est
// `estChampCommentaire` qu'il faut regarder en premier ; si le commentaire sort à
// côté du sujet, c'est `texteDuPost`.
(() => {
  console.log('[Machine] extension chargée sur', location.host);
  const SEL_EDITEUR = '.ql-editor[contenteditable="true"], div[role="textbox"][contenteditable="true"]';
  const SEL_BOX = '.comments-comment-box, .comments-comment-texteditor, .comments-comment-box-comment__text-editor, form';
  const SEL_POST = '[data-id^="urn:li:activity"], [data-urn], .feed-shared-update-v2, .fie-impression-container, article';

  // Un post LinkedIn tient parfois en une ligne (« Recruter un closer ne règle rien. »).
  // Le seuil de 40 caractères en refusait de parfaitement valables et renvoyait tout le
  // monde vers le surlignage à la main.
  const MIN_TEXTE = 20;

  const etats = new WeakMap();

  function estChampCommentaire(ed) {
    // Le champ de création de post et la messagerie sont des ql-editor eux aussi.
    if (ed.closest('.share-box, .share-creation-state, .share-box-v2, .msg-form, .msg-s-message-list')) return false;
    if (ed.closest('[class*="comments-comment-box"], [class*="comments-comment-texteditor"], [class*="comment-box"]')) return true;
    const labels = [
      ed.getAttribute('aria-label') || '',
      ed.getAttribute('data-placeholder') || '',
      ed.closest('form')?.getAttribute('aria-label') || '',
      ed.parentElement?.getAttribute('data-placeholder') || '',
    ].join(' ');
    if (/comment|commentaire|répond|reply/i.test(labels)) return true;
    // Dernier filet : un editeur sous un post du feed, la boite de creation ayant
    // deja ete ecartee plus haut.
    return !!ed.closest(SEL_POST);
  }

  function nettoie(t) {
    return (t || '')
      .replace(/…\s*(voir plus|see more|plus)\b/gi, '')
      .replace(/\bhashtag\b/gi, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 12000);
  }

  // Le conteneur du post ne se trouve PAS par un sélecteur fixe : LinkedIn renomme ses
  // classes, et sur une vidéo ou un carrousel le `closest` tombait sur un bloc qui ne
  // contient pas le texte. On remonte donc les ancêtres du champ de commentaire un par
  // un, et le premier niveau dont le sous-arbre contient un vrai texte de post gagne.
  function conteneurDuPost(ed) {
    let n = ed;
    let repli = null;
    for (let i = 0; i < 20 && n && n !== document.body; i++) {
      n = n.parentElement;
      if (!n) break;
      if (lisTexte(n).length >= MIN_TEXTE) return n;
      // Le premier ancêtre qui contient du texte, même illisible par les classes
      // connues : `closest(SEL_POST)` renvoyait null sur les formats que LinkedIn
      // n'annote pas, et la barre répondait « texte introuvable » sur un post qui
      // était pourtant là, sous les yeux.
      if (!repli && n.matches(SEL_POST)) repli = n;
      if (!repli && texteVisible(n).length >= MIN_TEXTE) repli = n;
    }
    return ed.closest(SEL_POST) || repli;
  }

  function lisTexte(post) {
    if (!post) return '';
    let t = '';
    post.querySelectorAll('.update-components-text, .update-components-update-v2__commentary, .feed-shared-inline-show-more-text')
      .forEach((z) => {
        if (!z.closest('.comments-comments-list, .comments-comment-item, .comments-comment-entity')) {
          t += z.innerText + '\n';
        }
      });
    return nettoie(t);
  }

  // Ce qui n'est jamais le sujet du post : les commentaires, la barre sociale,
  // l'entête de l'auteur, les boutons et les menus. Tout le reste est du texte.
  const HORS_SUJET = '.comments-comments-list, .comments-comment-item, .comments-comment-entity, '
    + '.comments-comment-box, .comments-comment-texteditor, .social-details-social-counts, '
    + '.feed-shared-social-action-bar, .update-components-actor, .update-components-header, '
    + 'form, button, [role="button"], [role="menu"], [role="menubar"], [role="tablist"]';

  // Dernier repli, et le seul qui ne connaisse AUCUNE classe de LinkedIn : tous les
  // nœuds de texte du post, moins ce qui n'est pas le post. Un carrousel, une vidéo
  // ou un post que LinkedIn vient de renommer passent par ici — c'est ce qui évite
  // d'avoir à surligner le texte à la main.
  function texteVisible(post) {
    if (!post) return '';
    const bouts = [];
    const marche = document.createTreeWalker(post, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = marche.nextNode())) {
      const t = (n.nodeValue || '').trim();
      if (t.length < 2) continue;
      const parent = n.parentElement;
      if (!parent || parent.closest(HORS_SUJET)) continue;
      // Les libellés d'interface (« Like », « 3 j », « Voir la traduction ») sont
      // courts et isolés : on ne garde que ce qui ressemble à une phrase.
      if (t.length < 12 && !/[.!?…,;:]/.test(t)) continue;
      bouts.push(t);
    }
    return nettoie(bouts.join('\n'));
  }

  function texteDuPost(post) {
    const direct = lisTexte(post);
    if (direct.length >= MIN_TEXTE) return direct;
    // Repli 1 : le plus gros bloc de texte du post, commentaires exclus. Sert quand
    // LinkedIn renomme ses classes (déjà arrivé deux fois en 2026).
    let meilleur = '';
    (post ? post.querySelectorAll('span.break-words, div.break-words, p') : []).forEach((n) => {
      if (n.closest(HORS_SUJET)) return;
      const v = n.innerText || '';
      if (v.length > meilleur.length) meilleur = v;
    });
    meilleur = nettoie(meilleur);
    if (meilleur.length >= MIN_TEXTE) return meilleur;
    // Repli 2 : tout le texte visible du post. Plus long que le bloc principal,
    // mais un sujet approximatif vaut mieux qu'un refus.
    const visible = texteVisible(post);
    return visible.length > meilleur.length ? visible : meilleur;
  }

  function auteurDuPost(post) {
    const n = post && post.querySelector('.update-components-actor__title span[aria-hidden="true"], .update-components-actor__title');
    return (n?.innerText || '').trim().split('\n')[0].slice(0, 120);
  }


  function insere(ed, texte) {
    ed.focus();
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(ed);
    sel.removeAllRanges();
    sel.addRange(r);
    // execCommand est déprécié mais reste le SEUL moyen d'écrire dans un éditeur
    // Quill en déclenchant ses événements internes : sans lui, le bouton « Publier »
    // de LinkedIn reste grisé parce que Quill ne voit pas le texte.
    const ok = document.execCommand('insertText', false, texte);
    if (!ok) {
      ed.textContent = texte;
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, data: texte, inputType: 'insertText' }));
    }
  }

  function bouton(txt, titre, classe) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'plft-btn' + (classe ? ' ' + classe : '');
    b.textContent = txt;
    b.title = titre;
    return b;
  }

  // Les commentaires déjà présents sous le post : le bot ne redit pas ce que trois
  // personnes ont déjà écrit, et ne répond pas à eux.
  function commentairesExistants(post) {
    if (!post) return [];
    const out = [];
    post.querySelectorAll('.comments-comment-item__main-content, .comments-comment-entity__content, [class*="comment-item__main-content"]')
      .forEach((n) => {
        const t = nettoie(n.innerText).slice(0, 300);
        if (t.length >= 15 && out.length < 6) out.push(t);
      });
    return out;
  }

  const LIBELLES = { long: 'Long', court: 'Court', humain: 'Humain' };

  function construitBarre(ed) {
    const barre = document.createElement('div');
    barre.className = 'plft-bar';
    const gen = bouton('⚡ Commentaire', 'Trois propositions dans ta voix (⌘⇧K)', 'plft-primary');
    const angle = bouton('↻', 'Trois autres propositions');
    const choix = document.createElement('span');
    choix.className = 'plft-choix-zone';
    const statut = document.createElement('span');
    statut.className = 'plft-statut';
    angle.disabled = true;
    barre.append(gen, angle, choix, statut);

    const etat = { texte: '', registre: '', propositions: [], occupe: false };
    etats.set(ed, { barre, etat, gen, angle, choix, statut });

    gen.addEventListener('click', () => demande(ed, '', false));
    angle.addEventListener('click', () => demande(ed, '', true));
    return barre;
  }

  // Les trois propositions, un bouton chacune. Cliquer remplace le texte du champ.
  function afficheChoix(ed, propositions) {
    const ref = etats.get(ed);
    ref.choix.replaceChildren();
    propositions.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'plft-choix' + (p.registre === ref.etat.registre ? ' plft-actif' : '');
      b.innerHTML = `${LIBELLES[p.registre] || p.registre}<small>${p.chars}</small>`;
      b.title = p.texte;
      b.addEventListener('click', () => {
        ref.etat.texte = p.texte;
        ref.etat.registre = p.registre;
        insere(ed, p.texte);
        afficheChoix(ed, propositions);
      });
      ref.choix.append(b);
    });
  }

  function demande(ed, consigne, rejouer) {
    const ref = etats.get(ed);
    if (!ref || ref.etat.occupe) return;
    const post = conteneurDuPost(ed);
    const selection = nettoie(window.getSelection()?.toString() || '');
    // Une selection a la main l'emporte : c'est le filet quand la lecture automatique
    // se trompe de bloc, et le seul moyen de commenter un format que LinkedIn n'expose
    // pas comme du texte.
    const texte = selection.length >= MIN_TEXTE ? selection : texteDuPost(post);
    if (texte.length < MIN_TEXTE) {
      console.log('[Machine] texte introuvable. Conteneur :', post);
      ref.statut.textContent = 'post illisible : surligne son texte puis reclique';
      ref.statut.className = 'plft-statut plft-erreur';
      return;
    }
    console.log(`[Machine] ${texte.length} car. lus (${selection.length >= 40 ? 'sélection' : 'auto'})`);
    ref.etat.occupe = true;
    ref.gen.disabled = ref.angle.disabled = true;
    ref.statut.className = 'plft-statut plft-attente';
    ref.statut.textContent = 'écriture…';
    chrome.runtime.sendMessage(
      {
        type: 'commentaire',
        payload: {
          post: texte,
          auteur: auteurDuPost(post),
          existants: commentairesExistants(post),
          consigne,
          eviter: rejouer ? ref.etat.propositions.map((p) => p.texte).join('\n---\n') : '',
          registre: rejouer ? ref.etat.registre : '',
        },
      },
      (rep) => {
        ref.etat.occupe = false;
        ref.gen.disabled = false;
        if (!rep || !rep.ok) {
          ref.statut.className = 'plft-statut plft-erreur';
          ref.statut.textContent = (rep && rep.erreur) || 'appel impossible';
          ref.angle.disabled = !ref.etat.texte;
          return;
        }
        const d = rep.data;
        ref.etat.texte = d.texte;
        ref.etat.registre = d.registre;
        ref.etat.propositions = d.propositions || [{ registre: d.registre, texte: d.texte, chars: d.chars }];
        insere(ed, d.texte);
        afficheChoix(ed, ref.etat.propositions);
        ref.angle.disabled = false;
        ref.statut.className = 'plft-statut';
        ref.statut.textContent = `${d.chars} car.`;
      },
    );
  }

  function scanne() {
    document.querySelectorAll(SEL_EDITEUR).forEach((ed) => {
      if (ed.dataset.plft || !estChampCommentaire(ed)) return;
      ed.dataset.plft = '1';
      const box = ed.closest(SEL_BOX) || ed.parentElement;
      const barre = construitBarre(ed);
      try {
        box.parentElement.insertBefore(barre, box);
      } catch (e) {
        box.prepend(barre);
      }
    });
  }

  let minuteur = null;
  const observateur = new MutationObserver(() => {
    clearTimeout(minuteur);
    minuteur = setTimeout(scanne, 200);
  });
  observateur.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('focusin', scanne, true);
  scanne();

  // ⌘⇧K depuis le champ de commentaire : générer sans lâcher le clavier.
  document.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.key.toLowerCase() !== 'k') return;
    const ed = e.target.closest?.(SEL_EDITEUR);
    if (!ed || !etats.has(ed)) return;
    e.preventDefault();
    demande(ed, '', false);
  });
})();
