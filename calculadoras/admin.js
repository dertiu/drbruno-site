/* Painel do editor: edita receitas, diluições e aviso e salva para todos (dados.js no GitHub).
   Os colegas usam o site sem login. A senha (PBKDF2) abre o painel; a gravação usa a chave do GitHub do editor,
   guardada apenas no aparelho dele. */
(function () {
  'use strict';
  const SALT = 'b44916b6c2580307493157d5d9e683e3', VER = '1029be47d6dbcbea5de139b10f1b8639ea0f11e62c411e662de7eb96c83fbeaf', ITER = 600000;
  const SKEY = 'drb_adm_k';
  const hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  const unhex = s => new Uint8Array(s.match(/../g).map(x => parseInt(x, 16)));
  const subtle = window.crypto && crypto.subtle;
  async function derive(pw) {
    const base = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', salt: unhex(SALT), iterations: ITER, hash: 'SHA-256' }, base, 256));
  }
  const verOf = async raw => hex(await subtle.digest('SHA-256', raw));
  const h = window.DRB.u.h;
  try { document.body.dataset.theme = JSON.parse(localStorage.getItem('drb_theme') || '"dark"'); } catch (e) { }
  const root0 = document.getElementById('adm');
  if (!subtle) {
    if (location.protocol === 'http:' && !/^(localhost|127\.)/.test(location.hostname)) { location.replace('https://' + location.host + location.pathname); return; }
    root0.append(h('div', { class: 'alert crit' }, h('span', null, 'Este navegador não permite abrir o painel com segurança. Use um navegador atualizado pelo endereço com https.')));
    return;
  }
  let rawKey = null;
  try { const s = sessionStorage.getItem(SKEY); if (s) rawKey = unhex(s); } catch (e) { }
  if (!rawKey) {
    const inp = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Senha', placeholder: 'Senha' });
    const err = h('p', { class: 'adm-err', role: 'alert' });
    const btn = h('button', { type: 'button', class: 'copy rx-copy' }, 'Entrar');
    const go = async () => {
      if (!inp.value) { inp.focus(); return; }
      btn.disabled = true; btn.textContent = 'Conferindo…'; err.textContent = '';
      try {
        const raw = await derive(inp.value);
        if (await verOf(raw) === VER) { try { sessionStorage.setItem(SKEY, hex(raw)); } catch (e) { } location.reload(); return; }
        err.textContent = 'Senha incorreta.'; inp.select();
      } catch (e) { err.textContent = 'Erro ao conferir a senha: ' + e.message; }
      btn.disabled = false; btn.textContent = 'Entrar';
    };
    btn.onclick = go;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    root0.append(h('section', { class: 'adm-gate panel' }, h('h1', { class: 'title' }, 'Área do editor'), h('p', { class: 'lead' }, 'Digite a senha para abrir o painel.'),
      h('label', { class: 'pf' }, h('span', null, 'Senha'), h('span', { class: 'pfin' }, inp)), btn, err));
    setTimeout(() => inp.focus(), 50);
    return;
  }
  const out = document.querySelector('.adm-back');
  if (out) out.after(h('button', { type: 'button', class: 'rx-btn adm-out', onclick: () => { try { sessionStorage.removeItem(SKEY); } catch (e) { } location.reload(); } }, 'Sair'));
  const D = window.DRB, u = D.u, icon = u.icon;
  const VIA = D.rx.VIA;
  const DRAFT = 'drb_admin_draft', CFG = 'drb_admin_cfg';

  const clone = o => JSON.parse(JSON.stringify(o));
  const base = clone(window.DRB_DATA || { cats: [], receitas: [], inf: {}, aviso: '' });
  let data = u.LS(DRAFT, null) || clone(base);
  data.cats = data.cats || []; data.receitas = data.receitas || []; data.inf = data.inf || {}; data.aviso = data.aviso || '';
  base.estatisticas = base.estatisticas || '';
  const cfg = Object.assign({ token: '', repo: 'dertiu/drbruno-site', branch: 'main', path: 'calculadoras/dados.js' }, u.LS(CFG, {}));
  const saveCfg = () => u.SAVE(CFG, cfg);
  const st = { tab: 'rx', sel: data.receitas[0] ? data.receitas[0].id : null, q: '', pkg: '14', page: '3' };
  const isDirty = () => JSON.stringify(data) !== JSON.stringify(base);
  let tmr = null;
  const saveDraft = () => { clearTimeout(tmr); tmr = setTimeout(() => { if (isDirty()) u.SAVE(DRAFT, data); else { try { localStorage.removeItem(DRAFT); } catch (e) { } } bar(); }, 250); };
  const slug = s => u.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'receita';
  const uniq = id => { let x = id, i = 2; while (data.receitas.some(r => r.id === x)) x = id + '-' + i++; return x; };

  data.estatisticas = data.estatisticas || '';
  const root = document.getElementById('adm');
  const top = h('div', { class: 'adm-top' }), conn = h('div'), tabs = h('nav', { class: 'adm-tabs', role: 'tablist' }), body = h('div', { class: 'adm-body' });
  root.append(h('h1', { class: 'title' }, 'Painel do editor'),
    h('p', { class: 'lead' }, 'Edite receitas, diluições e o aviso. O botão Salvar coloca as alterações no site para todos os colegas.'), top, conn, tabs, body);
  let flash = null; // mensagem após salvar

  /* ---------- barra de status com o botão Salvar ---------- */
  function bar() {
    top.innerHTML = '';
    const d = isDirty();
    top.append(h('div', { class: 'adm-status' + (d ? ' dirty' : '') },
      h('b', null, d ? 'Há alterações não salvas' : 'Tudo salvo: todos os colegas já veem esta versão'),
      h('span', null, d ? 'Toque em Salvar para colocar no site para todos.' : `${data.receitas.length} receitas · ${Object.keys(data.inf).length} diluições personalizadas`)),
      h('div', { class: 'adm-acts' },
        h('button', { type: 'button', class: 'copy rx-copy adm-save', disabled: !d ? true : null, onclick: publish }, icon('copy'), d ? 'Salvar para todos' : 'Salvo'),
        d && h('button', { type: 'button', class: 'rx-btn', onclick: () => { if (confirm('Descartar as alterações que ainda não foram salvas?')) { data = clone(base); try { localStorage.removeItem(DRAFT); } catch (e) { } st.sel = data.receitas[0] && data.receitas[0].id; render(); } } }, 'Descartar alterações')));
    if (flash) top.append(flash);
  }
  function tabBar() {
    tabs.innerHTML = '';
    [['rx', 'Receitas'], ['inf', 'Diluições'], ['aviso', 'Aviso'], ['hist', 'Histórico e backups'], ['acessos', 'Acessos'], ['cfg', 'Configurações']].forEach(([id, l]) =>
      tabs.append(h('button', { type: 'button', role: 'tab', 'aria-selected': st.tab === id ? 'true' : 'false', class: st.tab === id ? 'on' : '', onclick: () => { st.tab = id; flash = null; render(); } }, l)));
  }
  function render() { bar(); tabBar(); body.innerHTML = ''; ({ rx: tabRx, inf: tabInf, aviso: tabAviso, hist: tabHist, acessos: tabAcessos, cfg: tabCfg })[st.tab](); }

  /* ---------- conectar o painel ao site (primeira vez em cada aparelho) ---------- */
  const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new?name=' + encodeURIComponent('Painel calculadoras') +
    '&description=' + encodeURIComponent('Salvar alterações do painel do editor') + '&target_name=' + encodeURIComponent(cfg.repo.split('/')[0]) + '&expires_in=365&contents=write';
  function connectCard(after) {
    conn.innerHTML = '';
    const inp = h('input', { type: 'password', autocomplete: 'off', placeholder: 'github_pat_…', 'aria-label': 'Chave do GitHub' });
    const msg = h('div');
    const go = async () => {
      const t = inp.value.trim(); if (!t) { inp.focus(); return; }
      cfg.token = t; saveCfg(); msg.innerHTML = ''; msg.append(h('p', { class: 'hint' }, 'Conferindo a chave…'));
      try {
        const r = await gh('GET', `https://api.github.com/repos/${cfg.repo}`);
        if (!(r.permissions && r.permissions.push)) throw new Error('a chave não tem permissão de escrita (Contents: Read and write) em ' + cfg.repo);
        conn.innerHTML = ''; track('editor/conectou');
        if (after) after();
      } catch (e) { cfg.token = ''; saveCfg(); msg.innerHTML = ''; msg.append(h('div', { class: 'alert crit' }, icon('alert'), h('span', null, 'Não conectou: ' + e.message))); }
    };
    conn.append(h('section', { class: 'panel adm-connect' },
      h('h2', null, 'Ativar o botão Salvar (uma única vez)'),
      h('p', { class: 'hint' }, 'O site fica hospedado no GitHub. Para gravar lá, o painel precisa de uma chave da sua conta, que fica guardada só neste aparelho. Depois disso, cada Salvar publica para todos os colegas na hora.'),
      h('ol', { class: 'adm-steps' },
        h('li', null, h('a', { class: 'copy', href: TOKEN_URL, target: '_blank', rel: 'noopener' }, 'Abrir o GitHub para gerar a chave'), h('span', null, 'Nome, validade e permissão já vêm preenchidos.')),
        h('li', null, h('span', null, 'Em ', h('b', null, 'Repository access'), ', escolha ', h('b', null, 'Only select repositories'), ' e marque ', h('b', null, cfg.repo.split('/')[1]), '.')),
        h('li', null, h('span', null, 'Desça até o fim, toque em ', h('b', null, 'Generate token'), ', copie a chave e cole aqui:')),
        h('li', null, h('span', { class: 'pfin adm-tok' }, inp), h('button', { type: 'button', class: 'copy rx-copy', onclick: go }, 'Ativar e salvar'))),
      msg,
      h('button', { type: 'button', class: 'rx-btn', onclick: () => { conn.innerHTML = ''; } }, 'Agora não')));
    conn.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => inp.focus(), 300);
  }

  /* ---------- receitas ---------- */
  function tabRx() {
    const wrap = h('div', { class: 'adm-rx' }), left = h('section', { class: 'adm-l' }), right = h('section', { class: 'adm-r' });
    wrap.append(left, right); body.append(wrap);
    const q = h('input', { type: 'search', placeholder: 'Filtrar receitas', value: st.q, 'aria-label': 'Filtrar receitas', oninput: e => { st.q = e.target.value; list(); } });
    const ul = h('ul', { class: 'rx-list' });
    left.append(h('button', { type: 'button', class: 'copy', onclick: () => {
      const id = uniq('nova-receita'); data.receitas.unshift({ id, t: 'Nova receita', c: (data.cats[0] || {}).id || 'out', kw: '', it: [{ v: 'ORAL', n: '', q: '', p: '' }], ori: [] }); st.sel = id; saveDraft(); render();
    } }, '+ Nova receita'), h('label', { class: 'gs' }, icon('search'), q), ul);
    function list() {
      ul.innerHTML = '';
      const nq = u.norm(st.q.trim());
      data.receitas.filter(r => !nq || u.norm(r.t + ' ' + r.kw).includes(nq)).forEach(r => {
        const cat = data.cats.find(c => c.id === r.c);
        ul.append(h('li', { class: 'rx-item' + (r.id === st.sel ? ' on' : '') }, h('button', { type: 'button', class: 'rx-open', onclick: () => { st.sel = r.id; render(); } },
          h('span', { class: 'rx-t' }, r.t, h('small', { class: 'adm-cat' }, cat ? cat.t : r.c)), r.ped && h('span', { class: 'rx-tag' }, 'criança'))));
      });
    }
    list();
    const r = data.receitas.find(x => x.id === st.sel);
    if (!r) { right.append(h('div', { class: 'rx-blank' }, h('h2', null, 'Selecione ou crie uma receita'))); return; }
    editor(r, right);
  }

  function editor(r, el) {
    const ch = () => { saveDraft(); preview(); };
    const inp = (label, val, on, o) => h('label', { class: 'fld' + (o && o.full ? ' full' : '') }, h('span', { class: 'lbl' }, label), h('input', Object.assign({ value: val || '', oninput: e => { on(e.target.value); ch(); } }, o && o.attrs)));
    const catSel = h('select', { onchange: e => {
      if (e.target.value === '__new') { const t = prompt('Nome da nova categoria:'); if (t && t.trim()) { const id = slug(t); if (!data.cats.some(c => c.id === id)) data.cats.push({ id, t: t.trim(), d: '' }); r.c = id; } render(); return; }
      r.c = e.target.value; ch();
    } }, data.cats.map(c => h('option', { value: c.id }, c.t)), h('option', { value: '__new' }, 'Nova categoria…'));
    catSel.value = r.c;
    const pop = h('div', { class: 'seg', role: 'group', 'aria-label': 'Público' }, [[false, 'Adulto'], [true, 'Criança']].map(([v, l]) =>
      h('button', { type: 'button', class: !!r.ped === v ? 'on' : '', onclick: () => { if (v) r.ped = true; else delete r.ped; saveDraft(); render(); } }, l)));
    const items = h('div', { class: 'adm-items' });
    function drawItems() {
      items.innerHTML = '';
      r.it.forEach((it, i) => {
        const via = h('select', { 'aria-label': 'Via', onchange: e => { it.v = e.target.value; ch(); } }, Object.keys(VIA).map(k => h('option', { value: k }, VIA[k])));
        via.value = it.v;
        const opt = h('input', { type: 'checkbox', onchange: e => { if (e.target.checked) it.opt = true; else delete it.opt; ch(); } }); opt.checked = !!it.opt;
        const mv = (d) => { const j = i + d; if (j < 0 || j >= r.it.length) return; [r.it[i], r.it[j]] = [r.it[j], r.it[i]]; saveDraft(); drawItems(); preview(); };
        items.append(h('div', { class: 'adm-item' },
          h('div', { class: 'adm-item-h' }, h('b', null, `Item ${i + 1}`), via,
            h('label', { class: 'adm-opt' }, opt, ' opção (vem desmarcado)'),
            h('span', { class: 'adm-mv' }, h('button', { type: 'button', title: 'Subir', 'aria-label': 'Subir item', onclick: () => mv(-1) }, '↑'), h('button', { type: 'button', title: 'Descer', 'aria-label': 'Descer item', onclick: () => mv(1) }, '↓'),
              h('button', { type: 'button', title: 'Remover', 'aria-label': 'Remover item', onclick: () => { r.it.splice(i, 1); saveDraft(); drawItems(); preview(); } }, '×'))),
          h('div', { class: 'adm-item-g' },
            inp('Medicamento e apresentação', it.n, v => { it.n = v.toUpperCase(); }, { attrs: { placeholder: 'DIPIRONA 500MG', style: 'text-transform:uppercase' } }),
            inp('Quantidade', it.q, v => { it.q = v.toUpperCase(); }, { attrs: { placeholder: '20 CP', style: 'text-transform:uppercase' } })),
          h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Posologia'), h('textarea', { rows: 2, style: 'text-transform:uppercase', placeholder: '01 CP VO DE 6/6H SE DOR OU FEBRE', oninput: e => { it.p = e.target.value.toUpperCase(); ch(); } }, it.p || ''))));
      });
      items.append(h('button', { type: 'button', class: 'rx-btn', onclick: () => { r.it.push({ v: (r.it[r.it.length - 1] || {}).v || 'ORAL', n: '', q: '', p: '' }); saveDraft(); drawItems(); preview(); } }, '+ Adicionar item'));
    }
    drawItems();
    const ori = h('textarea', { rows: 4, style: 'text-transform:uppercase', oninput: e => { r.ori = e.target.value.toUpperCase().split('\n').map(x => x.trim()).filter(Boolean); ch(); } }, (r.ori || []).join('\n'));
    const nota = h('textarea', { rows: 3, oninput: e => { if (e.target.value.trim()) r.nota = e.target.value; else delete r.nota; ch(); } }, r.nota || '');
    const pv = h('pre', { class: 'adm-pre' });
    const pk = h('input', { inputmode: 'decimal', value: st.pkg, 'aria-label': 'Peso de teste', oninput: e => { st.pkg = e.target.value; preview(); } });
    const pa = h('input', { inputmode: 'decimal', value: st.page, 'aria-label': 'Idade de teste', oninput: e => { st.page = e.target.value; preview(); } });
    function preview() {
      const c = { kg: u.num(st.pkg), age: u.num(st.page) }, out = [], groups = [];
      r.it.filter(it => !it.opt && (it.n || it.p)).forEach(it => { let g = groups.find(x => x.v === it.v); if (!g) { g = { v: it.v, l: [] }; groups.push(g); } g.l.push(it); });
      groups.forEach(g => { out.push(VIA[g.v] + ':', ''); g.l.forEach((it, i) => { const nm = D.rx.fill(it.n, c), q = D.rx.fill(it.q, c); out.push(`${i + 1}. ${nm} ${'-'.repeat(Math.max(4, 52 - nm.length - q.length))} ${q}`, D.rx.fill(it.p, c), ''); }); });
      if ((r.ori || []).length) out.push('ORIENTAÇÕES: ' + r.ori.join(' '));
      pv.textContent = out.join('\n').trim() || '(receita vazia)';
    }
    el.append(
      h('div', { class: 'adm-head' }, h('h2', null, r.t || 'Sem título'), h('span', { class: 'adm-id' }, 'link: #/receitas/' + r.id)),
      h('div', { class: 'panel' },
        h('div', { class: 'fgrid' }, inp('Título (diagnóstico)', r.t, v => { r.t = v; }, { full: true }),
          h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Categoria'), catSel), h('div', { class: 'fld' }, h('span', { class: 'lbl' }, 'Público'), pop),
          inp('Palavras de busca (sinônimos)', r.kw, v => { r.kw = v; }, { full: true, attrs: { placeholder: 'olho vermelho colírio secreção' } })),
        h('h3', { class: 'sec' }, 'Itens da receita'), items,
        h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Orientações ao paciente (uma por linha; saem na receita)'), ori),
        h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Nota para o médico (não sai na receita)'), nota),
        h('details', { class: 'adm-help' }, h('summary', null, 'Dose pelo peso ou pela idade (marcadores)'),
          h('p', null, 'Escreva os marcadores dentro da posologia; o site troca pelo valor do paciente:'),
          h('ul', null, ...[
            ['{gt:1:40} GOTAS', '1 gota por kg, máximo 40'], ['{ml:0.3333:10} ML', 'peso ÷ 3 em mL, máximo 10 (arredonda para 0,5 mL)'], ['{mg:50:1000} MG', '50 mg/kg, máximo 1.000 mg'],
            ['{idade:2=2,5 ML|6=5 ML|10 ML}', 'abaixo de 2 anos 2,5 mL; abaixo de 6 anos 5 mL; acima, 10 mL'], ['{kg}', 'peso do paciente'], ['{litros:60}', '60 mL/kg em litros'], ['{ivermectina}', 'comprimidos de 6 mg pela tabela de peso']
          ].map(([a, b]) => h('li', null, h('code', null, a), ' ', b))),
          h('p', null, 'Sem peso ou idade informados, aparece ___ para o médico preencher.'))),
      h('div', { class: 'panel' }, h('div', { class: 'adm-pv-h' }, h('h3', { class: 'sec', style: 'border:0;padding:0;margin:0' }, 'Prévia (itens que não são opção)'),
        h('label', { class: 'pf' }, h('span', null, 'Peso teste'), h('span', { class: 'pfin' }, pk, h('span', { class: 'u' }, 'kg'))),
        h('label', { class: 'pf' }, h('span', null, 'Idade teste'), h('span', { class: 'pfin' }, pa, h('span', { class: 'u' }, 'anos')))), pv),
      h('div', { class: 'adm-acts' },
        h('button', { type: 'button', class: 'rx-btn', onclick: () => { const c = clone(r); c.id = uniq(r.id + '-copia'); c.t = r.t + ' (cópia)'; data.receitas.splice(data.receitas.indexOf(r) + 1, 0, c); st.sel = c.id; saveDraft(); render(); } }, 'Duplicar'),
        h('button', { type: 'button', class: 'rx-btn adm-del', onclick: () => { if (confirm(`Excluir a receita “${r.t}”?`)) { data.receitas.splice(data.receitas.indexOf(r), 1); st.sel = data.receitas[0] && data.receitas[0].id; saveDraft(); render(); } } }, 'Excluir receita')));
    preview();
  }

  /* ---------- diluições ---------- */
  function tabInf() {
    const rows = D.INF_DEF.map(def => {
      const cur = Object.assign({}, def, data.inf[def.id] || {}), d = D.INF.find(x => x.id === def.id);
      const set = (k, v) => { const o = Object.assign({ amt: cur.amt, vol: cur.vol, note: cur.note }, data.inf[def.id] || {}); o[k] = v; cur[k] = v;
        if (o.amt === def.amt && o.vol === def.vol && o.note === def.note) delete data.inf[def.id]; else data.inf[def.id] = o; conc.textContent = cTxt(); saveDraft(); };
      const cTxt = () => cur.vol > 0 ? `${u.fmt(cur.amt / cur.vol, 3)} ${d.amtU}/mL` : '';
      const conc = h('span', { class: 'adm-conc' }, cTxt());
      return h('div', { class: 'adm-inf' + (data.inf[def.id] ? ' changed' : '') },
        h('div', { class: 'adm-inf-h' }, h('b', null, d.name), h('span', null, d.g), conc,
          data.inf[def.id] && h('button', { type: 'button', class: 'rx-btn', onclick: () => { delete data.inf[def.id]; saveDraft(); render(); } }, 'Restaurar padrão')),
        h('div', { class: 'adm-inf-g' },
          h('label', { class: 'pf' }, h('span', null, 'Droga'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: u.dv(cur.amt), oninput: e => set('amt', u.num(e.target.value)) }), h('span', { class: 'u' }, d.amtU))),
          h('label', { class: 'pf' }, h('span', null, 'Volume total'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: u.dv(cur.vol), oninput: e => set('vol', u.num(e.target.value)) }), h('span', { class: 'u' }, 'mL'))),
          h('label', { class: 'fld adm-note' }, h('span', { class: 'lbl' }, 'Como preparar (aparece na calculadora)'), h('textarea', { rows: 2, oninput: e => set('note', e.target.value) }, cur.note || ''))));
    });
    body.append(h('p', { class: 'hint' }, 'Diluição padrão que todos os colegas veem na calculadora de drogas vasoativas e infusões. Cada colega ainda pode personalizar no próprio aparelho.'), h('div', { class: 'adm-infs' }, rows));
  }

  /* ---------- aviso ---------- */
  function tabAviso() {
    const pv = h('div', { class: 'aviso' }, icon('alert'), h('span', null, data.aviso || ''));
    pv.hidden = !data.aviso.trim();
    body.append(h('div', { class: 'panel' },
      h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Mensagem no topo da página inicial (deixe vazio para não mostrar)'),
        h('textarea', { rows: 4, placeholder: 'Ex.: Protocolo de sepse atualizado em novembro. Novas receitas de dermatologia.', oninput: e => { data.aviso = e.target.value; pv.lastChild.textContent = data.aviso; pv.hidden = !data.aviso.trim(); saveDraft(); } }, data.aviso)),
      h('span', { class: 'lbl' }, 'Prévia'), pv));
  }

  /* ---------- configurações ---------- */
  function tabCfg() {
    const msg = h('div');
    const f = (k, label, type, ph) => h('label', { class: 'fld' }, h('span', { class: 'lbl' }, label), h('input', { type: type || 'text', value: cfg[k] || '', placeholder: ph || '', autocomplete: 'off', oninput: e => { cfg[k] = e.target.value.trim(); saveCfg(); } }));
    body.append(h('div', { class: 'panel' },
      h('h3', { class: 'sec', style: 'border:0;padding:0;margin:0' }, 'Conexão com o site'),
      h('p', { class: 'hint' }, cfg.token ? 'Ativado: o botão Salvar publica para todos os colegas.' : 'Ainda não ativado. Ao tocar em Salvar pela primeira vez, o painel mostra o passo a passo.'),
      h('div', { class: 'adm-acts' },
        h('button', { type: 'button', class: 'rx-btn', onclick: () => connectCard(() => render()) }, cfg.token ? 'Trocar a chave' : 'Conectar agora'),
        h('button', { type: 'button', class: 'rx-btn', onclick: test }, 'Testar conexão'),
        cfg.token && h('button', { type: 'button', class: 'rx-btn adm-del', onclick: () => { if (confirm('Desconectar este aparelho? Será preciso colar a chave de novo para salvar.')) { cfg.token = ''; saveCfg(); render(); } } }, 'Desconectar este aparelho')), msg,
      h('details', { class: 'adm-help' }, h('summary', null, 'Avançado'),
        h('div', { class: 'fgrid' }, f('token', 'Chave do GitHub', 'password', 'github_pat_…'), f('repo', 'Repositório'), f('branch', 'Branch'), f('path', 'Arquivo de dados')))));
    async function test() {
      msg.innerHTML = ''; msg.append(h('p', { class: 'hint' }, 'Testando…'));
      try { const r = await gh('GET', `https://api.github.com/repos/${cfg.repo}`); msg.innerHTML = '';
        msg.append(h('div', { class: 'alert ' + (r.permissions && r.permissions.push ? 'ok' : 'crit') }, icon('alert'), h('span', null, r.permissions && r.permissions.push ? 'Conexão funcionando: pode salvar.' : 'A chave abre o repositório mas não tem permissão de escrita.')));
      } catch (e) { msg.innerHTML = ''; msg.append(h('div', { class: 'alert crit' }, icon('alert'), h('span', null, 'Falhou: ' + e.message))); }
    }
  }

  /* ---------- histórico e backups ---------- */
  const fmtDate = s => { const d = new Date(s); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  async function tabHist() {
    const box = h('div', { class: 'adm-hist' }, h('p', { class: 'hint' }, 'Carregando o histórico…'));
    const rel = h('div');
    body.append(
      h('div', { class: 'panel' }, h('h3', { class: 'sec', style: 'border:0;padding:0;margin:0' }, 'Backups'),
        h('p', { class: 'hint' }, 'Cada vez que você salva, o GitHub guarda a versão anterior: nada se perde e qualquer versão pode ser restaurada abaixo. Além disso, toda segunda-feira é gerado um backup completo do site.'),
        h('div', { class: 'adm-acts' },
          h('a', { class: 'rx-btn adm-a', href: `https://github.com/${cfg.repo}/archive/refs/heads/${cfg.branch}.zip` }, 'Baixar o site inteiro agora (.zip)'),
          h('button', { type: 'button', class: 'rx-btn', onclick: download }, 'Baixar só os dados (dados.js)')), rel),
      h('div', { class: 'panel' }, h('h3', { class: 'sec', style: 'border:0;padding:0;margin:0' }, 'Registro das alterações'), box));
    try {
      const list = await ghPub(`https://api.github.com/repos/${cfg.repo}/commits?path=${encodeURIComponent(cfg.path)}&sha=${encodeURIComponent(cfg.branch)}&per_page=40`);
      box.innerHTML = '';
      if (!list.length) { box.append(h('p', { class: 'hint' }, 'Nenhuma alteração registrada ainda.')); }
      list.forEach((c, i) => {
        const who = (c.author && c.author.login) || (c.commit.author && c.commit.author.name) || 'n/d';
        box.append(h('div', { class: 'adm-ver' + (i === 0 ? ' cur' : '') },
          h('div', { class: 'adm-ver-h' }, h('b', null, fmtDate(c.commit.author.date)), h('span', null, who), i === 0 && h('span', { class: 'adm-badge' }, 'versão atual do site')),
          h('p', null, c.commit.message.split('\n')[0]),
          h('div', { class: 'adm-acts' },
            h('a', { class: 'rx-btn adm-a', href: c.html_url, target: '_blank', rel: 'noopener' }, 'Ver o que mudou'),
            h('button', { type: 'button', class: 'rx-btn', onclick: () => getVersion(c.sha).then(t => saveFile(t, 'dados-' + c.sha.slice(0, 7) + '.js')).catch(e => alert('Falhou: ' + e.message)) }, 'Baixar esta versão'),
            i > 0 && h('button', { type: 'button', class: 'rx-btn', onclick: () => restore(c) }, 'Restaurar esta versão'))));
      });
    } catch (e) { box.innerHTML = ''; box.append(h('div', { class: 'alert crit' }, icon('alert'), h('span', null, 'Não carregou o histórico: ' + e.message))); }
    try {
      const rs = (await ghPub(`https://api.github.com/repos/${cfg.repo}/releases?per_page=12`)).filter(r => /^backup-/.test(r.tag_name));
      if (rs.length) rel.append(h('h4', { class: 'adm-sub' }, 'Backups semanais'), h('ul', { class: 'adm-rel' }, rs.map(r => h('li', null, h('span', null, fmtDate(r.created_at)),
        h('a', { href: (r.assets && r.assets[0] && r.assets[0].browser_download_url) || r.html_url }, 'Baixar (.zip)')))));
    } catch (e) { }
  }
  async function getVersion(sha) {
    const r = await fetch(`https://raw.githubusercontent.com/${cfg.repo}/${sha}/${cfg.path}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('erro ' + r.status); return r.text();
  }
  function parseData(txt) {
    const i = txt.indexOf('{'), j = txt.lastIndexOf('}');
    return JSON.parse(txt.slice(i, j + 1));
  }
  async function restore(c) {
    if (!confirm(`Trazer para o painel a versão de ${fmtDate(c.commit.author.date)}? Ela substitui o que está no painel agora; depois confira e toque em Salvar.`)) return;
    try {
      const d = parseData(await getVersion(c.sha));
      d.cats = d.cats || []; d.receitas = d.receitas || []; d.inf = d.inf || {}; d.aviso = d.aviso || ''; d.estatisticas = d.estatisticas || data.estatisticas || '';
      data = d; st.sel = data.receitas[0] && data.receitas[0].id; saveDraft(); st.tab = 'rx'; st.restoredFrom = fmtDate(c.commit.author.date);
      flash = h('div', { class: 'alert warn' }, icon('alert'), h('span', null, `Versão de ${st.restoredFrom} carregada no painel. Confira e toque em Salvar para colocá-la no site.`));
      render();
    } catch (e) { alert('Não foi possível restaurar: ' + e.message); }
  }

  /* ---------- acessos (estatísticas anônimas) ---------- */
  function tabAcessos() {
    const code = data.estatisticas;
    const inp = h('input', { value: code, placeholder: 'ex.: brunomichels', autocomplete: 'off', oninput: e => { data.estatisticas = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''); saveDraft(); } });
    body.append(h('div', { class: 'panel' },
      h('h3', { class: 'sec', style: 'border:0;padding:0;margin:0' }, 'Quem está acessando'),
      code ? h('div', { class: 'adm-acts' }, h('a', { class: 'copy rx-copy adm-a', href: `https://${code}.goatcounter.com`, target: '_blank', rel: 'noopener' }, 'Abrir o painel de acessos'))
        : h('div', { class: 'alert warn' }, icon('alert'), h('span', null, 'Contador de acessos ainda não ativado. Siga os passos abaixo.')),
      h('p', { class: 'hint' }, 'O painel de acessos mostra, por dia e por hora: número de visitantes, quais calculadoras e receitas foram abertas, cidade ou região e país aproximados, aparelho, sistema e navegador, de onde o visitante veio, e quando o editor entrou ou salvou. Não usa cookies e não guarda o IP, por isso não mostra o nome de quem acessou: para identificar cada colega seria preciso login.'),
      h('details', { class: 'adm-help', open: code ? null : true }, h('summary', null, 'Ativar o contador (uma vez)'),
        h('ol', null,
          h('li', null, 'Crie a conta gratuita em ', h('a', { href: 'https://www.goatcounter.com/signup', target: '_blank', rel: 'noopener' }, 'goatcounter.com/signup'), '. Em Code, use por exemplo ', h('b', null, 'brunomichels'), ' e confirme o e-mail.'),
          h('li', null, 'Digite o mesmo código aqui:'),
          h('li', null, 'Toque em Salvar no topo. O contador começa a registrar em seguida.'))),
      h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Código do contador'), inp)));
  }
  let gcReady = false;
  function track(path) {
    if (!data.estatisticas) return;
    const send = () => { try { window.goatcounter.count({ path, title: path, event: true }); } catch (e) { } };
    if (window.goatcounter && window.goatcounter.count) return send();
    if (gcReady) return;
    gcReady = true; window.goatcounter = { no_onload: true };
    const s = document.createElement('script'); s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = `https://${data.estatisticas}.goatcounter.com/count`;
    s.onload = send; document.head.append(s);
  }

  /* ---------- GitHub ---------- */
  async function gh(method, url, payload) {
    if (!cfg.token) throw new Error('o botão Salvar ainda não foi ativado');
    const r = await fetch(url, { method, cache: 'no-store', headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, body: payload ? JSON.stringify(payload) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((r.status === 401 ? 'chave inválida ou expirada' : r.status === 403 || r.status === 404 ? 'sem permissão para este repositório' : r.status === 409 ? 'o site mudou enquanto você editava; tente salvar de novo' : 'erro ' + r.status) + (j.message ? ' (' + j.message + ')' : ''));
    return j;
  }
  async function ghPub(url) { // leitura: usa a chave se houver, senão acesso público
    if (cfg.token) return gh('GET', url);
    const r = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(r.status === 403 ? 'limite de consultas do GitHub atingido; conecte o aparelho (Configurações) ou tente em 1 hora' : 'erro ' + r.status);
    return r.json();
  }
  const fileText = () => { const d = clone(data); d.atualizado = new Date().toISOString().slice(0, 10); return '/* Dados editáveis pelo painel do editor (admin.html). Não editar à mão se for usar o painel. */\nwindow.DRB_DATA = ' + JSON.stringify(d, null, 1) + ';\n'; };
  const b64 = str => { const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  function saveFile(txt, name) { const a = h('a', { href: URL.createObjectURL(new Blob([txt], { type: 'text/javascript' })), download: name }); document.body.append(a); a.click(); a.remove(); }
  function download() { saveFile(fileText(), 'dados-' + new Date().toISOString().slice(0, 10) + '.js'); }

  // resumo legível do que mudou, para o registro
  function summary() {
    const out = [], bm = new Map(base.receitas.map(r => [r.id, r])), dm = new Map(data.receitas.map(r => [r.id, r]));
    const add = [], ed = [], del = [];
    data.receitas.forEach(r => { const o = bm.get(r.id); if (!o) add.push(r.t); else if (JSON.stringify(o) !== JSON.stringify(r)) ed.push(r.t); });
    base.receitas.forEach(r => { if (!dm.has(r.id)) del.push(r.t); });
    if (add.length) out.push('criou ' + add.join(', '));
    if (ed.length) out.push('editou ' + ed.join(', '));
    if (del.length) out.push('excluiu ' + del.join(', '));
    const ik = new Set([...Object.keys(base.inf || {}), ...Object.keys(data.inf || {})]);
    const ich = [...ik].filter(k => JSON.stringify((base.inf || {})[k]) !== JSON.stringify(data.inf[k])).map(k => (D.INF.find(x => x.id === k) || { name: k }).name);
    if (ich.length) out.push('diluição de ' + ich.join(', '));
    if ((base.aviso || '') !== data.aviso) out.push('aviso da página inicial');
    if ((base.estatisticas || '') !== data.estatisticas) out.push('contador de acessos');
    if (JSON.stringify(base.cats) !== JSON.stringify(data.cats)) out.push('categorias');
    if (st.restoredFrom) out.unshift('restaurou a versão de ' + st.restoredFrom);
    let s = out.join('; ') || 'ajustes';
    return s.length > 300 ? s.slice(0, 297) + '…' : s;
  }

  async function publish() {
    const bad = data.receitas.filter(r => !r.t.trim() || !r.it.some(it => it.n.trim()));
    if (bad.length && !confirm(`${bad.length} receita(s) sem título ou sem item: ${bad.map(r => r.t || r.id).join(', ')}. Salvar mesmo assim?`)) return;
    if (!cfg.token) { connectCard(publish); return; }
    const btn = top.querySelector('.adm-save'); if (btn) { btn.disabled = true; btn.lastChild.textContent = 'Salvando…'; }
    try {
      const url = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.path}`;
      let sha; try { sha = (await gh('GET', url + '?ref=' + encodeURIComponent(cfg.branch))).sha; } catch (e) { if (!/sem permissão/.test(e.message)) throw e; }
      const res = await gh('PUT', url, { message: 'Painel do editor: ' + summary(), content: b64(fileText()), branch: cfg.branch, sha });
      Object.keys(base).forEach(k => delete base[k]); Object.assign(base, clone(data)); st.restoredFrom = null;
      try { localStorage.removeItem(DRAFT); } catch (e) { }
      track('editor/salvou');
      flash = h('div', { class: 'alert ok' }, icon('alert'), h('span', null, 'Salvo para todos. Em alguns minutos os colegas já veem a alteração (quem estiver com o site aberto, ao recarregar a página). O registro fica em Histórico e backups. ', res.commit && h('a', { href: res.commit.html_url, target: '_blank', rel: 'noopener' }, 'Ver no GitHub')));
      bar();
    } catch (e) {
      flash = h('div', { class: 'alert crit' }, icon('alert'), h('span', null, 'Não salvou: ' + e.message + '. Nada foi perdido: as alterações continuam no painel; tente Salvar de novo.'));
      if (/inválida|expirada/.test(e.message)) { cfg.token = ''; saveCfg(); }
      bar();
    }
  }

  track('editor/entrou');
  render();
})();
