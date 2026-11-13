/* Preenchimento dos campos ___ dos modelos: acha cada lacuna no texto, mostra o trecho em volta
   e oferece o controle mais útil (opções do próprio modelo, lado, anestesia, data, números, nomes já usados). */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, h = u.h;
  const MEM = 'drb_fill_mem';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  const nrm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // lacuna: data (__/__/____) ou 3+ sublinhados, com o parêntese que vem logo depois (opções, exemplo ou dica)
  const RX = /_{2}\/_{2}\/_{2,4}|_{3,}(?:[ \t]*\([^()\n]*\))?/g;

  function scan(text) {
    const out = []; let m; RX.lastIndex = 0;
    while ((m = RX.exec(text))) {
      const raw = m[0], s = m.index, e = s + raw.length;
      const ls0 = text.lastIndexOf('\n', s - 1) + 1, le0 = text.indexOf('\n', e); const le = le0 < 0 ? text.length : le0;
      const line = text.slice(ls0, le);
      out.push({ raw, s, e, before: text.slice(ls0, s), after: text.slice(e, le), line });
    }
    return out;
  }
  const isUp = line => { const l = line.replace(/[^A-Za-zÀ-ú]/g, ''); if (l.length < 6) return false; const up = l.replace(/[^A-ZÀ-Ý]/g, '').length; return up / l.length > 0.7; };
  const lastWords = (s, n) => nrm(s).replace(/[^a-z0-9ºª°\s]/g, ' ').trim().split(/\s+/).slice(-n).join(' ');

  const MASC = /\b(membro superior|membro inferior|hemitorax|lobo|pe|membro|ureter|meato|meato ureteral|testiculo|rim|ovario|joelho|ombro|braco|tornozelo|lado|flanco|hipocondrio|cotovelo|olho|ouvido|quadril|punho|seio|pulmao|dedo|halux|antebraco|ramo|nervo)$/;
  const FEM = /\b(a|mao|coxa|perna|veia|arteria|regiao|fossa iliaca|iliaca|mama|glandula|inguinal|subclavia|jugular|radial|femoral|axila|hemiface|narina|parotida|orbita|regiao inguinal|inguinotomia|cervicotomia|incisao inguinal|safena|fossa|hemicolectomia|tireoide)$/;
  const LIQ = ['seroso', 'sero-hemático', 'hemático', 'purulento', 'citrino', 'turvo', 'quiloso'];

  function kind(f) {
    const raw = f.raw, par = (raw.match(/\(([^()]*)\)\s*$/) || [])[1];
    const b1 = lastWords(f.before, 1), b2 = lastWords(f.before, 2), b3 = lastWords(f.before, 3), a = nrm(f.after).trim();
    const k = { type: 'text', opts: [], hint: '', ex: '', num: false, key: b2 || b1 || 'campo' };
    if (/^_{2}\//.test(raw)) { k.type = 'date'; k.key = 'data'; return k; }
    if (par != null) {
      const p = par.trim();
      if (/^ex\.?:/i.test(p)) k.ex = p.replace(/^ex\.?:\s*/i, '').trim();
      else if (p.indexOf('/') >= 0) k.opts = p.split('/').map(x => x.trim()).filter(Boolean);
      else k.hint = p;
    }
    if (/^_{10,}/.test(raw)) { k.key = 'nome:' + b2; }
    const A = a.split(/\s+/)[0] || '';
    if (/^(º|°|ª)/.test(a) || /^º/.test(f.after.trim())) { k.num = true; if (/espaco intercostal|^º eic|eic/.test(a)) k.chips = ['2', '3', '4', '5', '6', '7', '8', '9']; }
    if (/^(ml|l|cm|mm|dias?|dia\(s\)|horas?|h|g|mg|mcg|fr|cargas?|fragmentos|pontos|seringas|unidades|%|semanas|quadrantes|graus|litros|anos|meses|vezes|x)\b/.test(a) || /\b(n[ºo°]|numero|cerca de|de cerca de|dreno n)$/.test(b2) || /\bn[ºo°]$/.test(b1)) {
      k.num = true;
      if (/^dias?|^dia\(s\)/.test(A)) k.chips = ['1', '2', '3', '5', '7', '10', '14', '15', '30'];
      else if (/^horas?|^h$/.test(A)) k.chips = ['2', '4', '6', '12', '24'];
      else if (/^seringas/.test(A)) k.chips = ['7', '10', '14', '28', '30'];
      else if (/dreno/.test(b3) && /n[ºo°]/.test(b1)) k.chips = ['20', '24', '28', '32', '36'];
      else if (/^fr\b/.test(A)) k.chips = ['4', '7', '12', '14', '16', '18'];
    }
    if (!k.opts.length && !k.num) {
      if (/\bsob$/.test(b1)) k.opts = ['anestesia geral', 'raquianestesia', 'sedação', 'anestesia local', 'bloqueio'];
      else if (/linha axilar$/.test(b2)) k.opts = ['anterior', 'média', 'posterior'];
      else if (/\blinha$/.test(b1)) k.opts = ['axilar anterior', 'axilar média', 'axilar posterior', 'hemiclavicular'];
      else if (/\b(aspecto|liquido|secrecao)$/.test(b1)) k.opts = LIQ;
      else if (FEM.test(b2) || FEM.test(b1)) k.opts = ['direita', 'esquerda', 'bilateral'];
      else if (MASC.test(b2) || MASC.test(b1)) k.opts = ['direito', 'esquerdo', 'bilateral'];
      else if (/\b(dr|dra|dr\(a\)|com dr)\.?$/.test(nrm(f.before).trim())) k.key = 'nome:medico';
    }
    return k;
  }
  const memGet = key => (ls.get(MEM, {})[key] || []);
  const memAdd = (key, v) => { const m = ls.get(MEM, {}); const l = (m[key] || []).filter(x => x !== v); l.unshift(v); m[key] = l.slice(0, 6); ls.set(MEM, m); };
  const fmtDate = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

  /* painel: get() devolve o texto atual, set(t) grava o texto novo */
  D.fillPanel = function (o) {
    const box = h('div', { class: 'fillp' });
    let open = true, tmr = null;
    function commit(f, k, v) {
      v = String(v == null ? '' : v).trim(); if (!v) return false;
      const txt = o.get(); const cur = scan(txt).find(x => x.s === f.s && x.raw === f.raw); if (!cur) return false;
      let val = v;
      if (k.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, mo, d] = v.split('-'); val = d + '/' + mo + '/' + (f.raw.length < 8 ? y.slice(2) : y); }
      if (k.type !== 'date') { memAdd(k.key, v); if (isUp(f.line.replace(f.raw, ''))) val = val.toLocaleUpperCase('pt-BR'); }
      o.set(txt.slice(0, cur.s) + val + txt.slice(cur.e));
      return true;
    }
    function render(focusIdx) {
      box.innerHTML = '';
      const fs = scan(o.get());
      if (!fs.length) { box.append(h('div', { class: 'fillp-ok' }, u.icon('check'), h('span', null, 'Todos os campos ___ foram completados.'))); return; }
      const head = h('button', { type: 'button', class: 'fillp-h', 'aria-expanded': open ? 'true' : 'false', onclick: () => { open = !open; render(); } },
        h('span', null, 'Campos para completar'), h('span', { class: 'n' }, String(fs.length)), u.icon('chev', false, 18));
      box.append(head);
      box.classList.toggle('open', open);
      if (!open) return;
      const list = h('div', { class: 'fillp-l' });
      const ctrls = [];
      fs.forEach((f, i) => {
        const k = kind(f);
        const ctx = h('div', { class: 'fillp-ctx' }, f.before.length > 46 ? '…' + f.before.slice(-46) : f.before, h('mark', null, k.hint ? k.hint.toLowerCase() : k.ex ? 'ex.: ' + k.ex.toLowerCase() : k.opts.length && /\(/.test(f.raw) ? k.opts.join(' / ').toLowerCase() : '___'), f.after.length > 30 ? f.after.slice(0, 30) + '…' : f.after);
        const go = v => { if (commit(f, k, v)) { render(i); if (o.onFill) o.onFill(); } };
        const row = h('div', { class: 'fillp-r' }, ctx);
        let inp;
        if (k.type === 'date') {
          inp = h('input', { type: 'date', class: 'fillp-in', 'aria-label': 'Data', onchange: e => go(e.target.value) });
          row.append(h('div', { class: 'fillp-c' }, inp, h('button', { type: 'button', class: 'rx-cat', onclick: () => go(fmtDate(new Date())) }, 'Hoje')));
        } else {
          const mem = memGet(k.key).filter(v => k.opts.indexOf(v) < 0 && (k.chips || []).indexOf(v) < 0);
          const chips = k.opts.concat(k.chips || [], mem.slice(0, 4));
          const dl = 'fl-' + Math.random().toString(36).slice(2, 8);
          inp = h('input', { class: 'fillp-in', 'aria-label': 'Valor do campo', placeholder: k.ex ? 'Ex.: ' + k.ex : k.hint ? k.hint.toLowerCase() : k.num ? 'número' : 'digite', inputmode: k.num ? 'decimal' : 'text', list: mem.length ? dl : null, enterkeyhint: 'next',
            onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); if (inp.value.trim()) go(inp.value); else { const nx = ctrls[i + 1]; if (nx) nx.focus(); } } } });
          const okB = h('button', { type: 'button', class: 'rx-btn fillp-ok-b', 'aria-label': 'Aplicar', onclick: () => go(inp.value) }, 'OK');
          row.append(h('div', { class: 'fillp-c' }, inp, okB), mem.length ? h('datalist', { id: dl }, mem.map(v => h('option', { value: v }))) : '');
          if (chips.length || k.ex) row.append(h('div', { class: 'fillp-ch' }, chips.map(v => h('button', { type: 'button', class: 'rx-cat', onclick: () => go(v) }, v)), k.ex ? h('button', { type: 'button', class: 'rx-cat adp', onclick: () => go(k.ex) }, 'Usar o exemplo') : ''));
        }
        ctrls.push(inp); list.append(row);
      });
      box.append(list);
      if (focusIdx != null) { const nx = ctrls[Math.min(focusIdx, ctrls.length - 1)]; if (nx && window.innerWidth >= 700) setTimeout(() => { try { nx.focus({ preventScroll: true }); } catch (e) { } }, 0); }
    }
    box.refresh = () => { clearTimeout(tmr); tmr = setTimeout(() => { if (!box.contains(document.activeElement)) render(); }, 250); };
    box.now = () => render();
    render();
    return box;
  };

  /* concordância de sexo em textos com O(A), SR(A), PORTADOR(A) */
  D.sexText = {
    has: x => /\(A\)|\(a\)/.test(x),
    apply: (x, fem) => String(x)
      .replace(/\b(SR|Sr|sr)\((A|a)\)/g, (m, p, a) => fem ? p + a : p)
      .replace(/([A-Za-zÀ-ú]*?)([oO])\(([aA])\)/g, (m, p, o, a) => p + (fem ? a : o))
      .replace(/([A-Za-zÀ-ú]+[rR])\(([aA])\)/g, (m, p, a) => fem ? p + a : p)
  };
})();
