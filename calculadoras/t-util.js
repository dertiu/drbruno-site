/* Utilidades do plantão: passagem de plantão (handover) local */
(function () {
  'use strict';
  const D = window.DRB, u = D.u;
  const KEY = 'drb_handover', TTL = 24 * 3600 * 1000;
  const ST = [['e', 'Estável'], ['a', 'Atenção'], ['g', 'Grave']];

  const store = {
    mode() { try { return localStorage.getItem('drb_handover_keep') === '1' ? 'local' : 'session'; } catch (e) { return 'session'; } },
    area() { try { return this.mode() === 'local' ? window.localStorage : window.sessionStorage; } catch (e) { return null; } },
    load() {
      try {
        const a = this.area(); const raw = a && a.getItem(KEY); if (!raw) return [];
        const d = JSON.parse(raw);
        if (!d || !Array.isArray(d.cards) || Date.now() - d.t > TTL) { a.removeItem(KEY); return []; }
        return d.cards;
      } catch (e) { return []; }
    },
    save(cards) { try { const a = this.area(); if (a) a.setItem(KEY, JSON.stringify({ t: Date.now(), cards })); } catch (e) { } },
    clear() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) { } }
  };

  const handover = {
    id: 'handover', g: 'util', title: 'Passagem de plantão (local)',
    desc: 'Quadro simples de leitos, paciente, diagnóstico e pendências. Fica só neste aparelho e some ao fechar ou limpar',
    kw: 'passagem de plantao handover kanban leitos pendencias paciente diagnostico lgpd quadro',
    disc: 'LGPD: use apenas iniciais ou o número do leito, nunca nome completo, CPF ou prontuário. Os dados ficam apenas neste navegador, expiram em 24 h e não são enviados a nenhum servidor.',
    render: (h) => {
      let cards = store.load();
      const wrap = h('section', { class: 'panel' });
      const save = () => store.save(cards);
      const newCard = () => ({ id: 'c' + Date.now() + Math.floor(Math.random() * 1000), leito: '', pac: '', dx: '', st: 'e', pend: [] });
      function draw() {
        wrap.innerHTML = '';
        const keep = (() => { try { return localStorage.getItem('drb_handover_keep') === '1'; } catch (e) { return false; } })();
        const bar = h('div', { class: 'ho-bar' },
          h('button', { type: 'button', onclick: () => { cards.push(newCard()); save(); draw(); } }, '+ Adicionar leito'),
          h('button', { type: 'button', onclick: copy }, 'Copiar resumo'),
          h('button', { type: 'button', onclick: () => { if (window.confirm('Limpar todos os dados da passagem de plantão?')) { cards = []; store.clear(); draw(); } } }, 'Limpar tudo'));
        wrap.append(bar);
        const lab = h('label', { class: 'ho-lgpd' });
        const cb = h('input', { type: 'checkbox', onchange: e => {
          try { if (e.target.checked) localStorage.setItem('drb_handover_keep', '1'); else localStorage.removeItem('drb_handover_keep'); } catch (x) { }
          store.clear(); save(); draw();
        } });
        cb.checked = keep;
        lab.append(cb, ' Manter ao fechar o navegador (neste aparelho). Desligado: os dados somem ao fechar a aba.');
        wrap.append(lab);
        if (!cards.length) wrap.append(h('p', { class: 'hint' }, 'Nenhum leito. Toque em “Adicionar leito”.'));
        const grid = h('div', { class: 'ho-grid' });
        cards.forEach(c => {
          const upd = (k, val) => { c[k] = val; save(); };
          const pend = h('div', null, c.pend.map((p, i) => h('div', { class: 'ho-pend' },
            h('input', { type: 'checkbox', checked: p.ok, onchange: e => { p.ok = e.target.checked; save(); } }),
            h('input', { type: 'text', value: p.t, placeholder: 'Pendência', oninput: e => { p.t = e.target.value; save(); } }),
            h('button', { type: 'button', class: 'x', title: 'Remover', onclick: () => { c.pend.splice(i, 1); save(); draw(); } }, '×'))));
          const sel = h('select', { onchange: e => { upd('st', e.target.value); card.className = 'ho-card st-' + c.st; } }, ST.map(s => h('option', { value: s[0] }, s[1])));
          sel.value = c.st;
          const card = h('div', { class: 'ho-card st-' + c.st },
            h('div', { class: 'ho-row' }, h('input', { value: c.leito, placeholder: 'Leito', 'aria-label': 'Leito', oninput: e => upd('leito', e.target.value) }), h('input', { value: c.pac, placeholder: 'Paciente (iniciais, idade)', 'aria-label': 'Paciente', oninput: e => upd('pac', e.target.value) })),
            h('textarea', { placeholder: 'Diagnóstico / resumo', 'aria-label': 'Diagnóstico', oninput: e => upd('dx', e.target.value) }, c.dx),
            sel, pend,
            h('button', { type: 'button', onclick: () => { c.pend.push({ t: '', ok: false }); save(); draw(); } }, '+ pendência'),
            h('button', { type: 'button', class: 'x', onclick: () => { cards = cards.filter(x => x !== c); save(); draw(); } }, 'Remover leito'));
          grid.append(card);
        });
        wrap.append(grid);
      }
      function copy() {
        const t = cards.map(c => `Leito ${c.leito || '-'} | ${c.pac || '-'} | ${ST.find(s => s[0] === c.st)[1]}\nDx: ${c.dx || '-'}\nPendências: ${c.pend.filter(p => p.t).map(p => (p.ok ? '[x] ' : '[ ] ') + p.t).join('; ') || '-'}`).join('\n\n');
        const done = () => { };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, done);
        else { const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove(); }
      }
      draw();
      return wrap;
    }
  };

  D.add(handover);
})();
