/* Agendamento cirúrgico: monta a mensagem de agendamento, reagendamento ou suspensão no modelo usado
   no grupo do centro cirúrgico, pronta para copiar ou mandar pelo WhatsApp.
   Os dados do paciente não são salvos. Só a lista de chefes e dias fica guardada neste aparelho. */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, F = D.f;
  const KEY = 'drb_agend_chefes';
  const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const chefes = () => { const l = u.LS(KEY, []); return Array.isArray(l) ? l.filter(c => c && c.n) : []; };

  // procedimentos mais pedidos: nome, duração, materiais, anestesia, UTI, reserva de sangue (sugestões, tudo editável)
  const P = [
    ['cvl', 'Colecistectomia videolaparoscópica (CVL)', '1h30', 'Vídeo', 'Geral'],
    ['cvlhu', 'CVL + herniorrafia umbilical', '2h', 'Vídeo + tela', 'Geral'],
    ['hid', 'Herniorrafia inguinal direita', '1h30', 'Tela', 'Raqui'],
    ['hie', 'Herniorrafia inguinal esquerda', '1h30', 'Tela', 'Raqui'],
    ['hib', 'Herniorrafia inguinal bilateral', '2h', '02 telas', 'Raqui'],
    ['hu', 'Herniorrafia umbilical', '1h', 'Tela', 'Raqui'],
    ['hep', 'Herniorrafia epigástrica', '1h', 'Tela', 'Raqui'],
    ['hinc', 'Herniorrafia incisional', '2h', 'Tela', 'Geral'],
    ['hemo', 'Hemorroidectomia', '1h', '', 'Raqui'],
    ['pilo', 'Exérese de cisto pilonidal', '1h', '', 'Raqui'],
    ['lipo', 'Exérese de lipoma', '1h', '', 'Local com sedação'],
    ['gtt', 'Gastrostomia', '1h30', '', 'Geral'],
    ['jej', 'Jejunostomia', '1h30', '', 'Geral'],
    ['col', 'Colectomia parcial + enteroanastomose', '3h', 'Grampeador linear, pinça de energia', 'Geral', 'Reservada', 'Sim'],
    ['rts', 'Retossigmoidectomia abdominal em oncologia + linfadenectomia', '4h', 'Grampeador linear, circular e contour', 'Geral', 'Reservada', 'Sim']
  ];
  const preset = id => { const p = P.find(x => x[0] === id); return p ? { nome: p[1], dur: p[2], eq: p[3], an: p[4], uti: p[5] || 'Não', rs: p[6] || 'Não' } : null; };

  const DUR = ['30min', '1h', '1h30', '2h', '2h30', '3h', '3h30', '4h', '5h', '6h'].map(x => [x, x]);
  const AN = ['Geral', 'Raqui', 'Geral + bloqueio', 'Bloqueio', 'Local', 'Local com sedação'].map(x => [x, x]);

  const br = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  const dia = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const idade = iso => {
    const d = dia(iso); if (!d) return '';
    const h = new Date(); let a = h.getFullYear() - d.getFullYear();
    if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--;
    return a >= 0 && a < 130 ? a + (a === 1 ? ' ano' : ' anos') : '';
  };
  const limpo = s => String(s == null ? '' : s).trim();
  // acha o chefe cadastrado pelo nome digitado ("Dra Maria Fernanda" acha "Maria Fernanda")
  const semTitulo = s => u.norm(s).replace(/\b(dra?|doutora?|prof[a]?)\b\.?/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  function achaChefe(nome) {
    const a = semTitulo(nome); if (!a) return null;
    return chefes().find(c => { const b = semTitulo(c.n); return b && (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0); }) || null;
  }

  const agend = {
    id: 'agend', g: 'cir', title: 'Agendamento cirúrgico (mensagem para o grupo)',
    desc: 'Monta a mensagem de agendamento, reagendamento ou suspensão no modelo do centro cirúrgico, pronta para colar no grupo',
    kw: 'agendamento cirurgico agendar cirurgia eletiva urgencia centro cirurgico whatsapp grupo reagendamento suspensao suspensa cancelar mapa cirurgico aviso de cirurgia',
    copyLbl: 'Copiar mensagem', share: true,
    disc: 'Os dados do paciente não são salvos: ficam só nesta tela e somem ao limpar os campos ou fechar o app. Confira a mensagem antes de enviar.',
    fields: v => {
      const tipo = v.tipo || 'ag';
      const out = [F.SEG('tipo', 'Mensagem', [['ag', 'Agendar'], ['re', 'Reagendar'], ['su', 'Suspender']], { def: 'ag' })];
      const pr = preset(v.pp);
      const nomes = () => chefes().map(c => c.n);
      if (tipo === 'su') {
        out.push(F.SEC('Cirurgia suspensa'),
          F.DATE('data', 'Data da cirurgia'),
          F.TXT('nome', 'Nome completo do paciente', { full: true }),
          F.TXT('proc', 'Procedimento', { full: true }),
          F.TXT('cir', 'Cirurgião (chefe)', { full: true, list: nomes }),
          F.TXT('motivo', 'Motivo da suspensão', { full: true, ph: 'Ex.: paciente gripado, não compareceu, sem vaga de UTI' }));
        return out;
      }
      out.push(F.SEC('Data e horário'));
      if (tipo === 're') out.push(F.DATE('antes', 'Estava agendada para'));
      out.push(F.DATE('data', tipo === 're' ? 'Nova data' : 'Data da cirurgia'),
        F.SEL('hora', 'Horário', [['07:00', '07:00'], ['13:00', '13:00'], ['A seguir', 'A seguir'], ['outro', 'Outro horário']], { full: false, rebuild: true }));
      if (v.hora === 'outro') out.push(F.TXT('horaTxt', 'Qual horário', { ph: 'Ex.: 10:00', im: 'numeric' }));
      out.push(F.SEG('car', 'Caráter', [['Eletiva', 'Eletiva'], ['Urgência', 'Urgência']]),
        F.SEC('Paciente'),
        F.TXT('nome', 'Nome completo do paciente', { full: true }),
        F.DATE('dn', 'Data de nascimento'),
        F.TXT('tel', 'Telefone (WhatsApp)', { im: 'tel', ph: '17 99999 9999' }),
        F.SEL('conv', 'Convênio ou particular', [['SUS', 'SUS'], ['IAMSPE', 'IAMSPE'], ['Unimed', 'Unimed'], ['Particular', 'Particular'], ['outro', 'Outro convênio']], { full: false, rebuild: true }));
      if (v.conv === 'outro') out.push(F.TXT('convTxt', 'Qual convênio'));
      out.push(F.SEC('Cirurgia'),
        F.TXT('cir', 'Cirurgião (chefe)', { full: true, list: nomes, hint: chefes().length ? '' : 'Cadastre os chefes e os dias de cada um em "Chefes e dias do centro cirúrgico" para o app avisar quando a data não bater.' }),
        F.SEL('pp', 'Atalho: procedimento comum', [['', 'Escolher (opcional)']].concat(P.map(p => [p[0], p[1]])), { reset: ['proc', 'dur', 'eq', 'an', 'uti', 'rs'] }),
        F.TXT('proc', 'Procedimento cirúrgico solicitado', { full: true, def: pr ? pr.nome : '' }),
        F.SEL('dur', 'Duração estimada', DUR, { full: false, def: pr ? pr.dur : '1h30' }),
        F.SEL('an', 'Tipo de anestesia', AN, { full: false, def: pr ? pr.an : 'Geral' }),
        F.TXT('eq', 'Equipamentos ou materiais / empresa', { full: true, def: pr ? pr.eq : '', ph: 'Ex.: Vídeo, Tela, Grampeador linear' }),
        F.SEC('Pré-operatório'),
        F.SEG('pre', 'Avaliação pré-anestésica', [['Sim', 'Feita'], ['Solicitada', 'Solicitada'], ['Não', 'Não']]),
        F.SEG('termo', 'Termo cirúrgico', [['Entregue', 'Entregue'], ['Será entregue', 'Será entregue']]),
        F.SEG('uti', 'UTI', [['Não', 'Não precisa'], ['Solicitada', 'Solicitada'], ['Reservada', 'Reservada']], { def: pr ? pr.uti : 'Não' }),
        F.SEG('rs', 'Reserva e tipagem sanguínea', [['Não', 'Não'], ['Sim', 'Sim']], { def: pr ? pr.rs : 'Não' }),
        F.TXT('obs', 'Observações (opcional)', { full: true, ph: 'Ex.: suspender metformina 1 dia antes; risco de conversão' }));
      return out;
    },
    calc: v => {
      const tipo = v.tipo || 'ag', alerts = [], rows = [], notes = [];
      const d = dia(v.data);
      const falta = [];
      const need = (val, nome) => { if (!limpo(val)) falta.push(nome); };
      need(v.data, 'data'); need(v.nome, 'nome do paciente'); need(v.proc, 'procedimento'); need(v.cir, 'cirurgião');
      if (tipo === 'su') need(v.motivo, 'motivo');
      else { need(v.dn, 'data de nascimento'); need(v.tel, 'telefone'); if (tipo === 're') need(v.antes, 'data anterior'); }

      if (d) {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        if (tipo !== 'su' && d < hoje) alerts.push({ lvl: 'warn', text: 'A data escolhida já passou.' });
        if (d.getDay() === 0) alerts.push({ lvl: 'warn', text: 'A data cai num domingo.' });
        const c = achaChefe(v.cir);
        if (c && tipo !== 'su') {
          const ds = (c.d || []).map(Number);
          if (ds.length && ds.indexOf(d.getDay()) < 0) {
            alerts.push({ lvl: 'warn', text: `${c.n} opera ${ds.sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => CURTO[x].toLowerCase()).join(', ')}. ${DIAS[d.getDay()][0].toUpperCase() + DIAS[d.getDay()].slice(1)} não está nos dias cadastrados: confira com o centro cirúrgico.` });
          }
          if (c.o) notes.push(c.n + ': ' + c.o);
        }
      }
      if (v.dn) { const i = idade(v.dn); if (i) rows.push(['Idade do paciente', i]); }
      if (falta.length) alerts.unshift({ lvl: 'info', text: 'Falta preencher: ' + falta.join(', ') + '.' });

      const hora = v.hora === 'outro' ? limpo(v.horaTxt) : v.hora;
      const conv = v.conv === 'outro' ? limpo(v.convTxt) : v.conv;
      let L;
      if (tipo === 'su') {
        L = ['*CIRURGIA SUSPENSA*', 'DATA: ' + br(v.data), 'NOME: ' + limpo(v.nome), 'PROCEDIMENTO: ' + limpo(v.proc), 'CIRURGIÃO: ' + limpo(v.cir), 'MOTIVO: ' + limpo(v.motivo)];
      } else {
        L = [tipo === 're' ? '*REAGENDAMENTO*' : '*AGENDAMENTO*'];
        if (tipo === 're') L.push('ESTAVA AGENDADA PARA: ' + br(v.antes));
        L.push('DATA: ' + br(v.data), 'HORARIO: ' + (hora || ''), 'ELETIVA/URGENCIA: ' + (v.car || ''),
          'NOME COMPLETO DO PACIENTE: ' + limpo(v.nome), 'DATA DE NASCIMENTO: ' + br(v.dn), 'TELEFONE DO PACIENTE (WHATS): ' + limpo(v.tel),
          'CONVENIO OU PARTICULAR: ' + (conv || ''), 'CIRURGIÃO: ' + limpo(v.cir), 'PROCEDIMENTO CIRURGICO SOLICITADO: ' + limpo(v.proc),
          'DURAÇÃO ESTIMADA DO PROCEDIMENTO: ' + (v.dur || ''), 'EQUIPAMENTOS OU MATERIAIS/EMPRESA: ' + limpo(v.eq), 'TIPO DE ANESTESIA: ' + (v.an || ''),
          'REALIZADA AVALIAÇÃO PRÉ ANESTESICA: ' + (v.pre || ''), 'TERMO CIRURGICO PREENCHIDO: ' + (v.termo || ''), 'NECESSÁRIO UTI: ' + (v.uti || ''),
          'SOLICITADO RESERVA E TIPAGEM SANGUÍNEA: ' + (v.rs || ''));
        if (limpo(v.obs)) L.push('OBS: ' + limpo(v.obs));
      }
      return {
        main: d ? { label: tipo === 'su' ? 'Cirurgia suspensa' : 'Data da cirurgia', value: br(v.data), unit: DIAS[d.getDay()], small: true } : null,
        rows: rows.length ? rows : [['Mensagem', tipo === 'su' ? 'Suspensão' : tipo === 're' ? 'Reagendamento' : 'Agendamento']],
        alerts, notes, text: L.join('\n')
      };
    }
  };

  // lista de chefes e dias em que operam (fica só neste aparelho)
  const chefesTool = {
    id: 'agend-chefes', g: 'cir', title: 'Chefes e dias do centro cirúrgico',
    desc: 'Cadastre em que dias cada chefe opera. O agendamento cirúrgico avisa quando a data não bater',
    kw: 'chefes dias centro cirurgico agenda cirurgioes escala dias de cirurgia agendamento',
    disc: 'Esta lista fica guardada só neste aparelho. Não coloque dados de pacientes aqui.',
    render: (h) => {
      let lista = chefes().map(c => ({ n: c.n, d: (c.d || []).map(Number), o: c.o || '' }));
      const wrap = h('section', { class: 'panel' });
      const salvar = () => u.SAVE(KEY, lista.filter(c => limpo(c.n)));
      function draw() {
        wrap.innerHTML = '';
        wrap.append(h('p', { class: 'hint' }, 'Marque os dias de cada chefe. Na observação, anote limites como "2 cirurgias na terça" ou "segundas alternadas com a Dra X".'));
        const box = h('div', { class: 'ag-lista' });
        if (!lista.length) box.append(h('p', { class: 'hint' }, 'Nenhum chefe cadastrado ainda.'));
        lista.forEach((c, i) => {
          box.append(h('div', { class: 'ag-chefe' },
            h('input', { type: 'text', value: c.n, placeholder: 'Nome (ex.: Dra Maria Fernanda)', 'aria-label': 'Nome do chefe', oninput: e => { c.n = e.target.value; salvar(); } }),
            h('div', { class: 'ag-dias', role: 'group', 'aria-label': 'Dias em que opera' }, [1, 2, 3, 4, 5, 6, 0].map(dd =>
              h('button', { type: 'button', class: c.d.indexOf(dd) >= 0 ? 'on' : '', 'aria-pressed': c.d.indexOf(dd) >= 0, onclick: () => {
                c.d = c.d.indexOf(dd) >= 0 ? c.d.filter(x => x !== dd) : c.d.concat(dd); salvar(); draw();
              } }, CURTO[dd]))),
            h('input', { type: 'text', value: c.o, placeholder: 'Observação (opcional)', 'aria-label': 'Observação', oninput: e => { c.o = e.target.value; salvar(); } }),
            h('button', { type: 'button', class: 'x', onclick: () => { lista.splice(i, 1); salvar(); draw(); } }, 'Remover')));
        });
        wrap.append(box, h('div', { class: 'ag-bar' },
          h('button', { type: 'button', class: 'copy', onclick: () => { lista.push({ n: '', d: [], o: '' }); draw(); const ins = wrap.querySelectorAll('.ag-chefe input[type=text]'); const last = ins[ins.length - 2]; if (last) last.focus(); } }, '+ Adicionar chefe'),
          h('a', { class: 'copy', href: '#/agend', style: 'text-decoration:none' }, 'Ir para o agendamento')));
      }
      draw();
      return wrap;
    }
  };

  D.add(agend, chefesTool);
})();
