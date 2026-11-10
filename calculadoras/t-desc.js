/* Descrições cirúrgicas: modelos por procedimento e autor, com campos editáveis e cópia no formato do relatório de cirurgia */
(function () {
  'use strict';
  const D = window.DRB, u = D.u;
  const MY = 'drb_desc_my';
  const TIPOS = [['Limpa', 'Limpa'], ['Limpa-contaminada', 'Limpa-contam.'], ['Contaminada', 'Contaminada'], ['Infectada', 'Infectada']];
  const loadMine = () => { try { return JSON.parse(localStorage.getItem(MY) || '[]'); } catch (e) { return []; } };
  const saveMine = l => { try { localStorage.setItem(MY, JSON.stringify(l)); } catch (e) { } };

  // potencial de contaminação sugerido pelo procedimento (o usuário pode trocar)
  function tipoDe(m) {
    const t = u.norm(m.t + ' ' + m.cp + ' ' + (m.s || []).slice(0, 12).join(' '));
    const T = u.norm(m.t);
    if (/abscesso|debrid|desbrid|fournier|peritonite|peritoneostomia|\bf4\b|fase 4|gangren|perfura|purulent|necros/.test(T) || /\bf3\b|fase 3/.test(T)) return 'Infectada';
    if (m.c === 'apend' || m.c === 'colon' || m.c === 'procto' || /enterect|enterorraf|gastrorraf|hartmann|colostom|ileostom|hemorroid|perianal|pilonidal|bridas|retossig/.test(T)) return 'Contaminada';
    if (m.c === 'vb' || /gastrostom|traqueo|esofag|histerect|lobect|segmentect|bulect|glossect|laringect|pelvi|broncosc|nefrect|whipple|duodeno|conizac|exenter|maxilect|jejuno|laparotomia|\ble\b|videolaparosc|ureter/.test(t)) return 'Limpa-contaminada';
    return 'Limpa';
  }
  // apelidos: quem digita CVL, VLP, F1, LE, HU… continua achando
  function ali(m) {
    const t = u.norm(m.t + ' ' + (m.cp || '')); let a = '';
    if (/colecistectomia videolap|videocolecistectomia/.test(t)) a += ' cvl';
    if (/videolap|video/.test(t)) a += ' vlp video vl laparoscopica';
    const f = t.match(/fase (\d)/); if (f) a += ' f' + f[1];
    if (/laparotomia explorad/.test(t)) a += ' le';
    if (/herniorrafia umbilical/.test(t)) a += ' hu hernia umbilical';
    if (/herniorrafia|hernioplastia/.test(t)) a += ' hernia hernioplastia';
    if (/traqueostomia/.test(t)) a += ' tqt';
    if (/via biliar/.test(t)) a += ' vb';
    if (/debridamento/.test(t)) a += ' desbridamento';
    return a;
  }

  /* ---------- itens para marcar e incluir na descrição ---------- */
  // pos: 'ach' logo após o inventário; 'pre' antes do fechamento; 'cur' antes do curativo; at: antes da primeira linha que casar
  const CLOSE = /revis[aã]o (da |de )?hemostasia|contagem de|s[ií]ntese|fechamento d|sutura d[ae] (pele|aponeurose)|desfeito pneumo|retirada dos? (instrumenta|trocat)|curativo/i;
  const O = {
    cultura: { l: 'Coleta para cultura', x: 'Coleta de secreção para cultura e antibiograma', pos: 'pre', skip: /cultura/i },
    anatomo: { l: 'Peça para anatomopatológico', x: 'Peça cirúrgica enviada para estudo anatomopatológico', pos: 'pre', skip: /anatomo?patol|anátomo/i },
    lavagem: { l: 'Lavagem da cavidade', x: 'Lavagem da cavidade com soro fisiológico 0,9% aquecido até retorno límpido', pos: 'pre', skip: /lavagem/i },
    contagem: { l: 'Contagem conferida', x: 'Contagem de compressas, gazes e instrumentais conferida', pos: 'syn', skip: /contagem/i },
    infiltr: { l: 'Anestésico local nas incisões', x: 'Infiltração das incisões com anestésico local', pos: 'cur', skip: /infiltra/i },
    aberta: { l: 'Ferida deixada aberta', x: 'Ferida deixada aberta para cicatrização por segunda intenção', pos: 'cur', skip: /segunda inten/i },
    drSuc: { l: 'Dreno de sucção', x: 'Posicionamento de dreno de sucção fechado, exteriorizado por contra-abertura e fixado à pele', pos: 'syn', skip: /\bdrenos?\b/i },
    drCav: { l: 'Dreno na cavidade', x: 'Posicionamento de dreno tubulolaminar em ___, exteriorizado por contra-abertura em ___ e fixado à pele', pos: 'syn', skip: /\bdrenos?\b/i },
    liqLivre: { l: 'Líquido livre', x: 'Presença de líquido livre ___ em cavidade, aproximadamente ___ mL, aspirado', pos: 'ach' },
    invOk: { l: 'Restante da cavidade sem lesões', x: 'Restante do inventário da cavidade sem outras lesões', pos: 'ach', skip: /sem (outras|demais) les/i },
    saco: { l: 'Saco com epíplon viável', x: 'Conteúdo do saco herniário: epíplon viável, reduzido para a cavidade', at: /tela|refor[cç]o|fechamento do anel|aponeurose/i },
    rxTx: { l: 'Radiografia de controle', x: 'Solicitada radiografia de tórax de controle', pos: 'end', skip: /radiografia|raio|\brx\b/i },
    usg: { l: 'Guiado por ultrassom', x: 'Procedimento guiado por ultrassonografia', pos: 'top', skip: /ultrass|ecoguiad|\busg\b/i }
  };
  const OPTS = {
    apend: [
      { l: 'Secreção purulenta', x: 'Presença de secreção purulenta em fossa ilíaca direita e pelve, aspirada', pos: 'ach', skip: /purulent/i },
      { l: 'Abscesso bloqueado', x: 'Presença de abscesso periapendicular bloqueado por epíplon e alças, desfeito e drenado', pos: 'ach', skip: /abscesso/i },
      { l: 'Base íntegra', x: 'Base apendicular íntegra e viável', pos: 'ach', skip: /base (apendicular )?(íntegra|integra|em boas|vi[áa]vel)/i },
      { l: 'Sepultamento do coto', x: 'Sepultamento do coto apendicular com sutura em bolsa', pos: 'pre', skip: /sepultamento|em bolsa/i },
      'lavagem',
      { l: 'Dreno de Penrose', x: 'Posicionamento de dreno de Penrose em fossa ilíaca direita e pelve, exteriorizado por contra-abertura em flanco direito e fixado à pele', pos: 'syn', skip: /\bdrenos?\b/i },
      'cultura', 'anatomo', 'contagem', 'infiltr'],
    vb: [
      { l: 'Colecistite aguda', x: 'Vesícula biliar com paredes espessadas e edemaciadas, com aderências de epíplon, compatível com colecistite aguda', pos: 'ach', skip: /colecistite|espessad/i },
      { l: 'Visão crítica de segurança', x: 'Obtida visão crítica de segurança antes da clipagem', at: /clip|ligadura d[oa] (ducto|art[ée]ria|c[ií]stic)/i, skip: /vis[aã]o cr[ií]tica/i },
      { l: 'Colangiografia', x: 'Colangiografia intraoperatória sem falhas de enchimento e com boa passagem de contraste ao duodeno', at: /dissec[cç][aã]o da ves[ií]cula|leito hep[áa]tico/i, skip: /colangiografia/i },
      { l: 'Abertura da vesícula', x: 'Abertura acidental da vesícula durante a dissecção, com extravasamento de bile e cálculos, aspirados e retirados', pos: 'pre', skip: /extravasamento/i },
      { l: 'Retirada em bolsa', x: 'Retirada da vesícula em bolsa extratora pelo portal umbilical', pos: 'pre', skip: /bolsa|endobag/i },
      { l: 'Lavagem do leito', x: 'Lavagem do leito hepático e do espaço sub-hepático com soro fisiológico 0,9%', pos: 'pre', skip: /lavagem/i },
      { l: 'Dreno sub-hepático', x: 'Posicionamento de dreno tubulolaminar em leito hepático, exteriorizado por contra-abertura em flanco direito e fixado à pele', pos: 'syn', skip: /\bdrenos?\b/i },
      'anatomo', 'contagem', 'infiltr'],
    hing: [
      { l: 'Hérnia indireta', x: 'Identificada hérnia inguinal indireta, com saco herniário dissecado e tratado por ligadura alta', at: /tela|refor[cç]o/i, skip: /indireta/i },
      { l: 'Hérnia direta', x: 'Identificada hérnia inguinal direta, com saco herniário reduzido e invaginado', at: /tela|refor[cç]o/i, skip: /hernia direta|hérnia direta/i },
      'saco',
      { l: 'Nervo ilioinguinal preservado', x: 'Identificado e preservado o nervo ilioinguinal', at: /tela|refor[cç]o/i, skip: /ilioinguinal/i },
      'drSuc', 'contagem', 'infiltr'],
    parede: [
      { l: 'Tamanho do anel', x: 'Anel herniário de aproximadamente ___ cm', at: /tela|fechamento do anel|aponeurose/i, skip: /anel hern[ií][áa]rio de/i },
      'saco',
      { l: 'Tela onlay', x: 'Fixação de tela de polipropileno em posição onlay com pontos separados de Prolene 2-0', pos: 'pre', skip: /\btela\b/i },
      'drSuc', 'contagem', 'infiltr'],
    abd: ['liqLivre', 'invOk', 'cultura', 'lavagem', 'drCav', 'anatomo', 'contagem'],
    colon: ['liqLivre', 'invOk', 'cultura', 'lavagem', 'drCav', 'anatomo', 'contagem'],
    procto: ['cultura', 'anatomo', 'aberta', 'infiltr'],
    pele: ['cultura', 'anatomo', 'aberta', 'drSuc', 'infiltr'],
    cp: ['anatomo', 'drSuc', 'contagem', 'infiltr'],
    torac: ['anatomo', 'cultura', 'contagem', 'infiltr', 'rxTx'],
    onco: ['anatomo', 'lavagem', 'drCav', 'contagem'],
    proc: ['usg', 'rxTx']
  };
  const optsFor = (c, txt) => (OPTS[c] || []).map((o, i) => Object.assign({ id: c + i }, typeof o === 'string' ? O[o] : o)).filter(o => !(o.skip && o.skip.test(txt)));
  function insertOpt(lines, o) {
    const n = lines.length; let i = -1;
    const firstClose = () => { for (let k = Math.floor(n / 2); k < n; k++) if (CLOSE.test(lines[k])) return k; return n; };
    if (o.at) { i = lines.findIndex((l, k) => k > 1 && o.at.test(l)); if (i < 0) i = firstClose(); }
    else if (o.pos === 'top') i = Math.min(2, n);
    else if (o.pos === 'end') i = n;
    else if (o.pos === 'cur') { for (let k = n - 1; k >= 0; k--) if (/curativo/i.test(lines[k])) { i = k; break; } if (i < 0) i = n; }
    else if (o.pos === 'syn') { for (let k = Math.floor(n / 2); k < n; k++) if (/s[ií]ntese|fechamento d|sutura d[ae] (pele|aponeurose)|desfeito pneumo/i.test(lines[k])) { i = k; break; } if (i < 0) i = firstClose(); }
    else if (o.pos === 'ach') { const k = lines.findIndex(l => /invent[áa]rio|achados?:/i.test(l)); i = k >= 0 ? Math.min(n, k + 2) : firstClose(); }
    else i = firstClose();
    lines.splice(i, 0, o.x); return lines;
  }
  // troca direita <-> esquerda preservando maiúsculas
  function swapSide(t) {
    return String(t || '').replace(/\b(direit|esquerd)([ao])\b/gi, (all, r, e) => {
      const to = r.toLowerCase() === 'direit' ? 'esquerd' : 'direit';
      const out = r === r.toUpperCase() ? to.toUpperCase() : r[0] === r[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
      return out + e;
    });
  }
  const DEST = [['RECO', 'a RECO'], ['RPA', 'a RPA'], ['UTI', 'a UTI'], ['Enfermaria', 'a enfermaria']];

  const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();

  function load(cb) {
    if (window.DRB_DESC) return cb();
    const s = document.createElement('script'); s.src = 'descricoes.js'; s.onload = () => cb(); s.onerror = () => cb(new Error('falhou'));
    document.head.append(s);
  }

  const tool = {
    id: 'descricoes', g: 'desc', title: 'Descrições cirúrgicas', desc: 'Modelos de descrição por procedimento e por cirurgião, com campos do relatório de cirurgia para revisar e copiar',
    kw: 'descrição cirúrgica relatório de cirurgia modelo apendicectomia colecistectomia cvl videolaparoscopia hérnia inguinal umbilical incisional laparotomia lise de bridas enterectomia hartmann colectomia retossigmoidectomia hemorroidectomia cisto pilonidal abscesso debridamento lipoma tireoidectomia traqueostomia drenagem de tórax toracocentese paracentese cateter venoso central portocath peritoneostomia ressutura',
    disc: 'Modelos de apoio vindos de descrições reais do serviço. Revise cada passo, lateralidade, fios, achados e intercorrências: a descrição precisa refletir exatamente o que foi feito.',
    render: (h, u2, sub) => {
      const root = h('div', { class: 'rx desc' });
      const side = h('section', { class: 'rx-l' }), doc = h('section', { class: 'rx-r', id: 'descdoc' });
      root.append(side, doc);
      side.append(h('p', { class: 'hint' }, 'Carregando os modelos…'));
      load(err => {
        side.innerHTML = '';
        if (err || !window.DRB_DESC) { side.append(h('div', { class: 'alert crit' }, u.icon('alert'), h('span', null, 'Não foi possível carregar os modelos. Verifique a conexão e recarregue a página.'))); return; }
        build(h, root, side, doc, sub);
      });
      return root;
    }
  };

  function build(h, root, side, doc, sub) {
    const DATA = window.DRB_DESC, CATS = DATA.cats;
    const all = () => loadMine().map(m => Object.assign({ mine: true, c: 'my' }, m)).concat(DATA.m);
    const st = { q: '', cat: '', sel: null, f: null };
    if (sub && sub.indexOf('c:') === 0) st.cat = sub.slice(2);
    else if (sub) st.sel = sub;
    const search = h('input', { type: 'search', class: 'rx-q', placeholder: 'Filtrar: colecistectomia, hérnia, Aryella…', 'aria-label': 'Filtrar descrições', oninput: e => { st.q = e.target.value; list(); } });
    const catBox = h('div', { class: 'rx-cats' });
    const ul = h('ul', { class: 'rx-list' });
    const count = h('p', { class: 'hint desc-n' });
    side.append(h('label', { class: 'gs rx-search' }, u.icon('search'), search), catBox, count, ul);
    const setUrl = () => { try { history.replaceState(null, '', '#/descricoes' + (st.sel ? '/' + st.sel : st.cat ? '/c:' + st.cat : '')); } catch (e) { } };
    const catName = id => id === 'my' ? 'Meus modelos' : (CATS.find(c => c.id === id) || {}).t || '';

    function chips() {
      catBox.innerHTML = '';
      const cs = [['', 'Todas']].concat(loadMine().length ? [['my', 'Meus modelos']] : [], CATS.map(c => [c.id, c.t]));
      cs.forEach(([v, l]) => catBox.append(h('button', { type: 'button', class: 'rx-cat' + (st.cat === v ? ' on' : ''), 'aria-pressed': st.cat === v ? 'true' : 'false', onclick: () => { st.cat = v; chips(); list(); setUrl(); } }, l)));
    }
    function list() {
      ul.innerHTML = '';
      const q = u.norm(st.q.trim()), parts = q ? q.split(/\s+/) : [];
      const ms = all().filter(m => (!st.cat || m.c === st.cat) && (!parts.length || parts.every(p => u.norm(m.t + ' ' + m.a + ' ' + m.cp + ' ' + catName(m.c) + ali(m)).includes(p))));
      const gs = [], ix = {};
      ms.forEach(m => { const k = m.mine ? 'my|' + m.id : m.c + '|' + m.t; if (!ix[k]) { ix[k] = { m, v: [] }; gs.push(ix[k]); } ix[k].v.push(m); });
      count.textContent = gs.length + (gs.length === 1 ? ' procedimento' : ' procedimentos') + ' · ' + ms.length + (ms.length === 1 ? ' modelo' : ' modelos');
      if (!ms.length) { ul.append(h('li', { class: 'rx-empty' }, 'Nenhum modelo encontrado. Tente outro termo ou limpe os filtros.')); return; }
      let last = null;
      gs.forEach(g => {
        const m = g.m;
        if (!st.cat && m.c !== last) { last = m.c; ul.append(h('li', { class: 'rx-h' }, catName(m.c))); }
        const on = g.v.some(x => x.id === st.sel);
        ul.append(h('li', { class: 'rx-item' + (on ? ' on' : '') },
          h('button', { type: 'button', class: 'rx-open', onclick: () => { open(on ? st.sel : m.id); if (window.innerWidth < 1000) window.scrollTo(0, 0); } },
            h('span', { class: 'rx-t' }, m.t), g.v.length > 1 ? h('span', { class: 'desc-a desc-k' }, g.v.length + ' modelos') : m.a && h('span', { class: 'desc-a' }, m.a))));
      });
    }
    function open(id) { st.sel = id; st.f = null; list(); render(); setUrl(); }
    const mark = () => root.classList.toggle('has-sel', !!st.sel);

    function fresh(m) {
      return { an: m.an || '', dx: m.dx || '', cp: m.cp || m.t, cr: m.cr || m.cp || m.t, tipo: m.tipo || tipoDe(m), rel: m.rel || 'Procedimento sem intercorrências.', s: (m.s || []).join('\n'), num: true, ld: m.ld || '', on: {}, base: (m.s || []).join(' ') };
    }
    function render() {
      doc.innerHTML = '';
      const m = st.sel && all().find(x => x.id === st.sel);
      if (!m) st.sel = null;
      mark();
      if (!m) {
        doc.append(h('div', { class: 'rx-blank' }, h('h2', null, 'Escolha um procedimento'),
          h('p', null, 'São ' + DATA.m.length + ' modelos de descrição agrupados por procedimento. Abra um procedimento, escolha o modelo do cirurgião ou da técnica, marque o que foi feito e copie no formato do relatório de cirurgia. Você pode guardar a sua versão em Meus modelos, que fica salva neste aparelho.')));
        return;
      }
      if (!st.f) st.f = fresh(m);
      const f = st.f;
      const back = h('button', { type: 'button', class: 'rx-btn desc-back', onclick: () => { st.sel = null; st.f = null; list(); render(); setUrl(); window.scrollTo(0, 0); } }, '‹ Todos os modelos');
      const head = h('div', { class: 'desc-head' }, back, h('h2', null, m.t), h('span', { class: 'desc-meta' }, [catName(m.c), m.a && 'Modelo: ' + m.a].filter(Boolean).join(' · ')));
      const inp = (k, label, ph) => h('label', { class: 'fld full' }, h('span', { class: 'lbl' }, label), h('span', { class: 'inwrap' }, h('input', { value: f[k], 'data-k': k, placeholder: ph || '', autocomplete: 'off', oninput: e => { f[k] = e.target.value; chk(); } })));
      const tipo = h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Cirurgia tipo (potencial de contaminação)'),
        h('div', { class: 'seg desc-tipo', role: 'group', 'aria-label': 'Potencial de contaminação' }, TIPOS.map(([v, l]) => h('button', { type: 'button', class: f.tipo === v ? 'on' : '', 'aria-pressed': f.tipo === v ? 'true' : 'false', onclick: e => { f.tipo = v; e.currentTarget.parentNode.querySelectorAll('button').forEach(b => { const on = b === e.currentTarget; b.className = on ? 'on' : ''; b.setAttribute('aria-pressed', on); }); } }, l))));
      const ta = h('textarea', { class: 'desc-steps', 'aria-label': 'Passos da descrição cirúrgica, um por linha', spellcheck: 'true', oninput: e => { f.s = e.target.value; grow(); chk(); } });
      ta.value = f.s;
      const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(2000, ta.scrollHeight + 4) + 'px'; };
      // variações do mesmo procedimento (outros cirurgiões e técnicas)
      const vs = m.mine ? [] : DATA.m.filter(x => x.c === m.c && x.t === m.t);
      const seen = {}; const vlab = x => { const a = x.a || 'Modelo'; seen[a] = (seen[a] || 0) + 1; return a + (seen[a] > 1 ? ' ' + seen[a] : ''); };
      const varBox = vs.length > 1 && h('div', { class: 'panel desc-var' }, h('span', { class: 'lbl' }, vs.length + ' modelos deste procedimento. Escolha o que mais se parece com a sua cirurgia:'),
        h('div', { class: 'desc-sibl' }, vs.map(x => h('button', { type: 'button', class: 'rx-cat' + (x.id === m.id ? ' on' : ''), 'aria-pressed': x.id === m.id ? 'true' : 'false', onclick: () => { if (x.id !== m.id) open(x.id); } }, vlab(x), h('small', null, ' · ' + x.s.length + ' passos')))));
      // lado (hérnia inguinal unilateral)
      const setAll = () => { ta.value = f.s; form.querySelectorAll('input[data-k]').forEach(i => { i.value = f[i.dataset.k]; }); grow(); chk(); };
      const ladoBox = f.ld && h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Lado'),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Lado da cirurgia' }, [['D', 'Direita'], ['E', 'Esquerda']].map(([v, l]) => h('button', { type: 'button', class: f.ld === v ? 'on' : '', 'aria-pressed': f.ld === v ? 'true' : 'false', onclick: e => {
          if (f.ld === v) return; f.ld = v;
          ['dx', 'cp', 'cr', 's'].forEach(k => { f[k] = swapSide(f[k]); });
          e.currentTarget.parentNode.querySelectorAll('button').forEach(b => { const on = b === e.currentTarget; b.className = on ? 'on' : ''; b.setAttribute('aria-pressed', on); });
          setAll(); D.toast && D.toast('Lado trocado para ' + l.toLowerCase() + ' em todo o texto');
        } }, l))));
      // itens para marcar
      const ops = optsFor(m.bc || m.c, f.base);
      const optBox = ops.length && h('div', { class: 'desc-opts' }, h('span', { class: 'lbl' }, 'Marque o que foi feito ou encontrado para incluir na descrição'),
        h('div', { class: 'desc-optl' }, ops.map(o => { const c = h('input', { type: 'checkbox', onchange: e => {
          let ls = f.s.split('\n');
          if (e.target.checked) { ls = insertOpt(ls.filter(x => tidy(x)), o); f.on[o.id] = 1; } else { ls = ls.filter(x => tidy(x) !== o.x); delete f.on[o.id]; }
          f.s = ls.join('\n'); ta.value = f.s; grow(); chk();
          if (e.target.checked) { const p = f.s.indexOf(o.x); try { ta.setSelectionRange(p, p + o.x.length); } catch (x) { } }
        } }); c.checked = !!f.on[o.id]; return h('label', { class: 'desc-opt', title: o.x }, c, h('span', null, o.l)); })));
      const destBox = h('div', { class: 'desc-dest' }, h('span', { class: 'hint' }, 'Destino:'), DEST.map(([l, x]) => h('button', { type: 'button', class: 'rx-cat', onclick: () => { f.rel = 'Procedimento sem intercorrências, paciente encaminhado para ' + x + ' aos cuidados da equipe anestésica.'; relF.querySelector('textarea').value = f.rel; chk(); } }, l)));
      const numB = h('label', { class: 'desc-chk' }, h('input', { type: 'checkbox', onchange: e => { f.num = e.target.checked; } }), 'Numerar os passos ao copiar');
      numB.firstChild.checked = f.num;
      const warn = h('div');
      const relF = h('label', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Relatório da cirurgia (intercorrências e destino)'), h('textarea', { class: 'desc-rel', rows: 3, oninput: e => { f.rel = e.target.value; chk(); } }, f.rel));
      const form = h('div', { class: 'panel desc-form' },
        h('div', { class: 'fgrid' }, inp('an', 'Tipo de anestesia', 'Geral, raquianestesia, local…'), inp('dx', 'Diagnóstico pré-operatório', 'Ex.: apendicite aguda'), inp('cp', 'Cirurgia proposta'), inp('cr', 'Cirurgia realizada'), ladoBox || '', tipo, relF, destBox),
        h('h3', { class: 'sec' }, 'Descrição cirúrgica'), optBox || '', h('p', { class: 'hint' }, 'Um passo por linha. Os campos com ___ precisam ser completados (lado, número do dreno, volume…).'), ta, numB, warn);
      function chk() {
        const n = ((f.s + ' ' + f.cp + ' ' + f.cr + ' ' + f.rel).match(/_{3,}/g) || []).length;
        warn.innerHTML = '';
        if (n) warn.append(h('div', { class: 'alert warn' }, u.icon('alert'), h('span', null, n === 1 ? 'Falta completar 1 campo marcado com ___.' : 'Faltam completar ' + n + ' campos marcados com ___.')));
      }
      const steps = () => f.s.split('\n').map(tidy).filter(Boolean);
      const body = () => steps().map((x, i) => (f.num ? (i + 1) + '. ' : '') + x).join('\n');
      const full = () => [
        f.an && 'Tipo de anestesia: ' + tidy(f.an), f.dx && 'Diagnóstico pré-operatório: ' + tidy(f.dx), f.cp && 'Cirurgia proposta: ' + tidy(f.cp), f.cr && 'Cirurgia realizada: ' + tidy(f.cr),
        'Cirurgia tipo: ' + f.tipo, f.rel && 'Relatório da cirurgia: ' + tidy(f.rel)].filter(Boolean).concat(['', 'Descrição cirúrgica:', body()]).join('\n');
      const copyBtn = (label, get, cls) => {
        const b = h('button', { type: 'button', class: cls || 'copy' }, u.icon('copy'), label);
        b.onclick = () => {
          const t = get(); const done = () => { b.lastChild.textContent = 'Copiado'; setTimeout(() => { b.lastChild.textContent = label; }, 1600); };
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, () => fb(t, done)); else fb(t, done);
        };
        return b;
      };
      function fb(t, done) { const x = h('textarea', { style: 'position:fixed;opacity:0' }); x.value = t; document.body.append(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { } x.remove(); }
      const acts = h('div', { class: 'rx-actions' },
        copyBtn('Copiar relatório', full, 'copy rx-copy'),
        copyBtn('Copiar descrição', body));
      const acts2 = h('div', { class: 'rx-actions desc-more' },
        h('button', { type: 'button', class: 'rx-btn', onclick: () => { st.f = fresh(m); render(); } }, 'Restaurar o modelo'),
        h('button', { type: 'button', class: 'rx-btn', onclick: saveMy }, m.mine ? 'Atualizar meu modelo' : 'Salvar em Meus modelos'),
        m.mine && h('button', { type: 'button', class: 'rx-btn adm-del', onclick: () => { if (!confirm('Excluir “' + m.t + '” de Meus modelos?')) return; saveMine(loadMine().filter(x => x.id !== m.id)); st.sel = null; chips(); list(); render(); setUrl(); } }, 'Excluir meu modelo'));
      function saveMy() {
        const l = loadMine();
        const rec = { bc: m.bc || m.c, ld: f.ld || undefined, id: m.mine ? m.id : 'meu-' + Date.now().toString(36), t: m.mine ? m.t : (prompt('Nome do seu modelo:', m.t) || '').trim(), a: 'Meu modelo', base: m.mine ? m.base : m.id, an: f.an, dx: f.dx, cp: f.cp, cr: f.cr, tipo: f.tipo, rel: f.rel, s: steps() };
        if (!rec.t) return;
        const i = l.findIndex(x => x.id === rec.id); if (i >= 0) l[i] = rec; else l.unshift(rec);
        saveMine(l); st.sel = rec.id; st.f = fresh(rec); chips(); list(); render(); setUrl();
      }
      doc.append(head, varBox || '', form, acts, acts2);
      requestAnimationFrame(grow); chk();
    }
    chips(); list(); render();
  }

  const links = [
    ['apend', 'Apendicectomia', 'aberta fases 1 a 4 e videolaparoscópica'], ['vb', 'Colecistectomia', 'videolaparoscópica com e sem dreno, convertida, convencional, exploração de via biliar'],
    ['hing', 'Hérnia inguinal', 'uni e bilateral, com e sem dreno, recidivada'], ['parede', 'Hérnias da parede e ressutura', 'umbilical, epigástrica, incisional'],
    ['abd', 'Laparotomia e intestino', 'lise de bridas, enterectomia, peritoneostomia'], ['colon', 'Cólon, reto e estomias', 'colectomias, Hartmann, retossigmoidectomia'],
    ['procto', 'Proctologia', 'hemorroidectomia, abscesso perianal, cisto pilonidal'], ['pele', 'Pele, partes moles e abscessos', 'debridamento, lipoma, drenagem de abscesso'],
    ['cp', 'Cabeça e pescoço', 'tireoidectomia, submandibular, esvaziamento'], ['torac', 'Torácica e via aérea', 'traqueostomia, drenagem, lobectomia'],
    ['onco', 'Oncologia, ginecologia e urologia', 'histerectomia, nefrectomia, Whipple'], ['proc', 'Procedimentos à beira do leito', 'cateter central, portocath, paracentese, toracocentese']
  ].map(([c, t, d]) => ({ id: 'desc-' + c, g: 'desc', title: t, desc: 'Descrições: ' + d, kw: 'descrição cirúrgica ' + t + ' ' + d, href: '#/descricoes/c:' + c }));
  // a busca do topo também encontra cada modelo (carrega os dados na primeira vez que a busca é usada)
  D.onSearch = (D.onSearch || []).concat(done => load(err => {
    if (err || !window.DRB_DESC) return;
    const cn = {}; window.DRB_DESC.cats.forEach(c => { cn[c.id] = c.t; });
    window.DRB_DESC.m.forEach(m => D.links.push({ id: 'dsl-' + m.id, g: 'desc', title: m.t + (m.a ? ' (' + m.a + ')' : ''), desc: 'Descrição cirúrgica: ' + (cn[m.c] || ''), kw: 'descricao cirurgica ' + (m.cp || '') + ' ' + (cn[m.c] || '') + ali(m), href: '#/descricoes/' + m.id }));
    done();
  }));
  D.add(tool, ...links);
})();
