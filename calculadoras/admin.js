/* Painel do editor: edita receitas, diluições e aviso; publica dados.js no GitHub com a chave do editor.
   Os colegas usam o site sem login. Só quem tem a chave (token) consegue publicar. */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, h = u.h, icon = u.icon;
  const VIA = D.rx.VIA;
  const DRAFT = 'drb_admin_draft', CFG = 'drb_admin_cfg';
  try { document.body.dataset.theme = JSON.parse(localStorage.getItem('drb_theme') || '"dark"'); } catch (e) { }

  const clone = o => JSON.parse(JSON.stringify(o));
  const base = clone(window.DRB_DATA || { cats: [], receitas: [], inf: {}, aviso: '' });
  let data = u.LS(DRAFT, null) || clone(base);
  data.cats = data.cats || []; data.receitas = data.receitas || []; data.inf = data.inf || {}; data.aviso = data.aviso || '';
  const cfg = Object.assign({ token: '', repo: 'dertiu/drbruno-site', branch: 'main', path: 'calculadoras/dados.js' }, u.LS(CFG, {}));
  const st = { tab: 'rx', sel: data.receitas[0] ? data.receitas[0].id : null, q: '', pkg: '14', page: '3' };
  const isDirty = () => JSON.stringify(data) !== JSON.stringify(base);
  let tmr = null;
  const saveDraft = () => { clearTimeout(tmr); tmr = setTimeout(() => { if (isDirty()) u.SAVE(DRAFT, data); else { try { localStorage.removeItem(DRAFT); } catch (e) { } } bar(); }, 250); };
  const slug = s => u.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'receita';
  const uniq = id => { let x = id, i = 2; while (data.receitas.some(r => r.id === x)) x = id + '-' + i++; return x; };

  const root = document.getElementById('adm');
  const top = h('div', { class: 'adm-top' }), tabs = h('nav', { class: 'adm-tabs', role: 'tablist' }), body = h('div', { class: 'adm-body' });
  root.append(h('h1', { class: 'title' }, 'Painel do editor'),
    h('p', { class: 'lead' }, 'Inclua e edite receitas, diluições e o aviso da página inicial. As alterações ficam como rascunho neste aparelho até você publicar.'), top, tabs, body);

  /* ---------- barra de status ---------- */
  function bar() {
    top.innerHTML = '';
    const d = isDirty();
    top.append(h('div', { class: 'adm-status' + (d ? ' dirty' : '') }, h('b', null, d ? 'Rascunho com alterações não publicadas' : 'Sem alterações pendentes'),
      h('span', null, `${data.receitas.length} receitas · ${Object.keys(data.inf).length} diluições personalizadas`)),
      h('div', { class: 'adm-acts' },
        h('button', { type: 'button', class: 'copy rx-copy', disabled: !d ? true : null, onclick: publish }, 'Publicar no site'),
        h('button', { type: 'button', class: 'rx-btn', onclick: download }, 'Baixar dados.js'),
        d && h('button', { type: 'button', class: 'rx-btn', onclick: () => { if (confirm('Descartar todas as alterações do rascunho?')) { data = clone(base); try { localStorage.removeItem(DRAFT); } catch (e) { } st.sel = data.receitas[0] && data.receitas[0].id; render(); } } }, 'Descartar rascunho')));
  }
  function tabBar() {
    tabs.innerHTML = '';
    [['rx', 'Receitas'], ['inf', 'Diluições'], ['aviso', 'Aviso na página inicial'], ['pub', 'Publicação e chave']].forEach(([id, l]) =>
      tabs.append(h('button', { type: 'button', role: 'tab', 'aria-selected': st.tab === id ? 'true' : 'false', class: st.tab === id ? 'on' : '', onclick: () => { st.tab = id; render(); } }, l)));
  }
  function render() { bar(); tabBar(); body.innerHTML = ''; ({ rx: tabRx, inf: tabInf, aviso: tabAviso, pub: tabPub })[st.tab](); }

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

  /* ---------- publicação ---------- */
  function tabPub() {
    const msg = h('div');
    const f = (k, label, type, ph) => h('label', { class: 'fld' }, h('span', { class: 'lbl' }, label), h('input', { type: type || 'text', value: cfg[k] || '', placeholder: ph || '', autocomplete: 'off', oninput: e => { cfg[k] = e.target.value.trim(); u.SAVE(CFG, cfg); } }));
    body.append(h('div', { class: 'panel' },
      h('h3', { class: 'sec', style: 'border:0;padding:0;margin:0' }, 'Chave de publicação'),
      h('p', { class: 'hint' }, 'O site continua aberto para todos, sem login. Só quem tem esta chave consegue publicar alterações. Ela fica salva apenas neste aparelho.'),
      h('div', { class: 'fgrid' }, f('token', 'Token do GitHub', 'password', 'github_pat_…'), f('repo', 'Repositório'), f('branch', 'Branch'), f('path', 'Arquivo de dados')),
      h('div', { class: 'adm-acts' }, h('button', { type: 'button', class: 'rx-btn', onclick: test }, 'Testar acesso'),
        h('button', { type: 'button', class: 'rx-btn', onclick: () => { cfg.token = ''; u.SAVE(CFG, cfg); render(); } }, 'Apagar a chave deste aparelho')), msg,
      h('details', { class: 'adm-help', open: cfg.token ? null : true }, h('summary', null, 'Como criar a chave (uma vez só)'),
        h('ol', null, h('li', null, 'No GitHub: foto do perfil, Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.'),
          h('li', null, 'Repository access: Only select repositories, escolha ', h('b', null, cfg.repo), '.'),
          h('li', null, 'Permissions, Repository permissions, Contents: Read and write. Nada mais.'),
          h('li', null, 'Defina uma validade (por exemplo, 1 ano), gere, copie e cole acima. Use em aparelho pessoal.')))));
    async function test() {
      msg.innerHTML = ''; msg.append(h('p', { class: 'hint' }, 'Testando…'));
      try { const r = await gh('GET', `https://api.github.com/repos/${cfg.repo}`); msg.innerHTML = '';
        msg.append(h('div', { class: 'alert ' + (r.permissions && r.permissions.push ? 'ok' : 'crit') }, icon('alert'), h('span', null, r.permissions && r.permissions.push ? 'Acesso confirmado: pode publicar.' : 'A chave lê o repositório mas não tem permissão de escrita (Contents: Read and write).')));
      } catch (e) { msg.innerHTML = ''; msg.append(h('div', { class: 'alert crit' }, icon('alert'), h('span', null, 'Falhou: ' + e.message))); }
    }
  }

  async function gh(method, url, payload) {
    if (!cfg.token) throw new Error('informe o token na aba Publicação e chave');
    const r = await fetch(url, { method, cache: 'no-store', headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, body: payload ? JSON.stringify(payload) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((r.status === 401 ? 'chave inválida ou expirada' : r.status === 403 || r.status === 404 ? 'sem permissão para este repositório' : 'erro ' + r.status) + (j.message ? ' (' + j.message + ')' : ''));
    return j;
  }
  const fileText = () => { const d = clone(data); d.atualizado = new Date().toISOString().slice(0, 10); return '/* Dados editáveis pelo painel do editor (admin.html). Não editar à mão se for usar o painel. */\nwindow.DRB_DATA = ' + JSON.stringify(d, null, 1) + ';\n'; };
  const b64 = str => { const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  function download() { const a = h('a', { href: URL.createObjectURL(new Blob([fileText()], { type: 'text/javascript' })), download: 'dados.js' }); document.body.append(a); a.click(); a.remove(); }
  async function publish() {
    const bad = data.receitas.filter(r => !r.t.trim() || !r.it.some(it => it.n.trim()));
    if (bad.length && !confirm(`${bad.length} receita(s) sem título ou sem item: ${bad.map(r => r.t || r.id).join(', ')}. Publicar mesmo assim?`)) return;
    if (!cfg.token) { st.tab = 'pub'; render(); alert('Cadastre a chave de publicação primeiro.'); return; }
    const btn = top.querySelector('.rx-copy'); if (btn) { btn.disabled = true; btn.textContent = 'Publicando…'; }
    try {
      const url = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.path}`;
      let sha; try { sha = (await gh('GET', url + '?ref=' + encodeURIComponent(cfg.branch))).sha; } catch (e) { if (!/sem permissão/.test(e.message)) throw e; }
      const res = await gh('PUT', url, { message: 'Painel do editor: atualiza receitas e dados das calculadoras', content: b64(fileText()), branch: cfg.branch, sha });
      Object.keys(base).forEach(k => delete base[k]); Object.assign(base, clone(data));
      try { localStorage.removeItem(DRAFT); } catch (e) { }
      bar();
      top.append(h('div', { class: 'alert ok' }, icon('alert'), h('span', null, 'Publicado. O site atualiza em 1 a 2 minutos; quem estiver com a página aberta vê a novidade ao recarregar duas vezes. ', res.commit && h('a', { href: res.commit.html_url, target: '_blank', rel: 'noopener' }, 'Ver alteração no GitHub'))));
    } catch (e) {
      bar(); top.append(h('div', { class: 'alert crit' }, icon('alert'), h('span', null, 'Não publicou: ' + e.message + '. O rascunho continua salvo neste aparelho.')));
    }
  }

  render();
})();
