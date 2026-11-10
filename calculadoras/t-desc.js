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
    const search = h('input', { type: 'search', class: 'rx-q', placeholder: 'Filtrar: CVL com dreno, hérnia, Aryella…', 'aria-label': 'Filtrar descrições', oninput: e => { st.q = e.target.value; list(); } });
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
      const ms = all().filter(m => (!st.cat || m.c === st.cat) && (!parts.length || parts.every(p => u.norm(m.t + ' ' + m.a + ' ' + m.cp + ' ' + catName(m.c)).includes(p))));
      count.textContent = ms.length + (ms.length === 1 ? ' modelo' : ' modelos');
      if (!ms.length) { ul.append(h('li', { class: 'rx-empty' }, 'Nenhum modelo encontrado. Tente outro termo ou limpe os filtros.')); return; }
      let last = null;
      ms.forEach(m => {
        if (!st.cat && m.c !== last) { last = m.c; ul.append(h('li', { class: 'rx-h' }, catName(m.c))); }
        const on = st.sel === m.id;
        ul.append(h('li', { class: 'rx-item' + (on ? ' on' : '') },
          h('button', { type: 'button', class: 'rx-open', onclick: () => { open(m.id); if (window.innerWidth < 1000) window.scrollTo(0, 0); } },
            h('span', { class: 'rx-t' }, m.t), m.a && h('span', { class: 'desc-a' }, m.a))));
      });
    }
    function open(id) { st.sel = id; st.f = null; list(); render(); setUrl(); }
    const mark = () => root.classList.toggle('has-sel', !!st.sel);

    function fresh(m) {
      return { an: m.an || '', dx: m.dx || '', cp: m.cp || m.t, cr: m.cr || m.cp || m.t, tipo: m.tipo || tipoDe(m), rel: m.rel || 'Procedimento sem intercorrências.', s: (m.s || []).join('\n'), num: true };
    }
    function render() {
      doc.innerHTML = '';
      const m = st.sel && all().find(x => x.id === st.sel);
      if (!m) st.sel = null;
      mark();
      if (!m) {
        doc.append(h('div', { class: 'rx-blank' }, h('h2', null, 'Escolha um procedimento'),
          h('p', null, 'São ' + DATA.m.length + ' modelos de descrição, vários por procedimento (técnicas e cirurgiões diferentes). Abra um, ajuste os campos e os passos e copie no formato do relatório de cirurgia. Você pode guardar a sua versão em Meus modelos, que fica salva neste aparelho.')));
        return;
      }
      if (!st.f) st.f = fresh(m);
      const f = st.f;
      const back = h('button', { type: 'button', class: 'rx-btn desc-back', onclick: () => { st.sel = null; st.f = null; list(); render(); setUrl(); window.scrollTo(0, 0); } }, '‹ Todos os modelos');
      const head = h('div', { class: 'desc-head' }, back, h('h2', null, m.t), h('span', { class: 'desc-meta' }, [catName(m.c), m.a && 'Modelo: ' + m.a].filter(Boolean).join(' · ')));
      const inp = (k, label, ph) => h('label', { class: 'fld full' }, h('span', { class: 'lbl' }, label), h('span', { class: 'inwrap' }, h('input', { value: f[k], placeholder: ph || '', autocomplete: 'off', oninput: e => { f[k] = e.target.value; chk(); } })));
      const tipo = h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Cirurgia tipo (potencial de contaminação)'),
        h('div', { class: 'seg desc-tipo', role: 'group', 'aria-label': 'Potencial de contaminação' }, TIPOS.map(([v, l]) => h('button', { type: 'button', class: f.tipo === v ? 'on' : '', 'aria-pressed': f.tipo === v ? 'true' : 'false', onclick: e => { f.tipo = v; e.currentTarget.parentNode.querySelectorAll('button').forEach(b => { const on = b === e.currentTarget; b.className = on ? 'on' : ''; b.setAttribute('aria-pressed', on); }); } }, l))));
      const ta = h('textarea', { class: 'desc-steps', 'aria-label': 'Passos da descrição cirúrgica, um por linha', spellcheck: 'true', oninput: e => { f.s = e.target.value; grow(); chk(); } });
      ta.value = f.s;
      const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(2000, ta.scrollHeight + 4) + 'px'; };
      const numB = h('label', { class: 'desc-chk' }, h('input', { type: 'checkbox', onchange: e => { f.num = e.target.checked; } }), 'Numerar os passos ao copiar');
      numB.firstChild.checked = f.num;
      const warn = h('div');
      const relF = h('label', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Relatório da cirurgia (intercorrências e destino)'), h('textarea', { class: 'desc-rel', rows: 2, oninput: e => { f.rel = e.target.value; chk(); } }, f.rel));
      const form = h('div', { class: 'panel desc-form' },
        h('div', { class: 'fgrid' }, inp('an', 'Tipo de anestesia', 'Geral, raquianestesia, local…'), inp('dx', 'Diagnóstico pré-operatório', 'Ex.: apendicite aguda'), inp('cp', 'Cirurgia proposta'), inp('cr', 'Cirurgia realizada'), tipo, relF),
        h('h3', { class: 'sec' }, 'Descrição cirúrgica'), h('p', { class: 'hint' }, 'Um passo por linha. Os campos com ___ precisam ser completados (lado, número do dreno, volume…).'), ta, numB, warn);
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
        const rec = { id: m.mine ? m.id : 'meu-' + Date.now().toString(36), t: m.mine ? m.t : (prompt('Nome do seu modelo:', m.t) || '').trim(), a: 'Meu modelo', base: m.mine ? m.base : m.id, an: f.an, dx: f.dx, cp: f.cp, cr: f.cr, tipo: f.tipo, rel: f.rel, s: steps() };
        if (!rec.t) return;
        const i = l.findIndex(x => x.id === rec.id); if (i >= 0) l[i] = rec; else l.unshift(rec);
        saveMine(l); st.sel = rec.id; st.f = fresh(rec); chips(); list(); render(); setUrl();
      }
      // outros modelos do mesmo procedimento
      const key = u.norm(m.t).split(/[\s+(]/)[0];
      const sib = DATA.m.filter(x => x.id !== m.id && x.c === m.c && u.norm(x.t).split(/[\s+(]/)[0] === key).slice(0, 14);
      const sibBox = sib.length && h('div', { class: 'panel desc-sib' }, h('h3', { class: 'sec', style: 'border:0;padding:0;margin:0 0 8px' }, 'Outros modelos parecidos'),
        h('div', { class: 'desc-sibl' }, sib.map(x => h('button', { type: 'button', class: 'rx-cat', onclick: () => { open(x.id); doc.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, x.t + (x.a ? ' · ' + x.a : '')))));
      doc.append(head, form, acts, acts2, sibBox || '');
      requestAnimationFrame(grow); chk();
    }
    chips(); list(); render();
  }

  const links = [
    ['apend', 'Apendicectomia', 'aberta, vídeo, fases 1 a 4'], ['vb', 'Colecistectomia', 'CVL com e sem dreno, convertida, convencional, exploração de VB'],
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
    window.DRB_DESC.m.forEach(m => D.links.push({ id: 'dsl-' + m.id, g: 'desc', title: m.t + (m.a ? ' (' + m.a + ')' : ''), desc: 'Descrição cirúrgica: ' + (cn[m.c] || ''), kw: 'descricao cirurgica ' + (m.cp || '') + ' ' + (cn[m.c] || ''), href: '#/descricoes/' + m.id }));
    done();
  }));
  D.add(tool, ...links);
})();
