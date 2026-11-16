/* Administração do app Perícias: usuários, ajustes e registro (só chega a administradores) */
(function () {
  'use strict';
  const { h, ic, call, acao, ask, toast, card, campo, inp, chip, fmtDT, rel, aparelho, wa, copiar, carregando } = window.PF;
  const me = window.PF.me();

  function situacao(u) {
    const out = [];
    out.push(chip(u.papel === 'perito' ? 'Perito' : 'Assistente', u.papel === 'perito' ? 'perito' : 'assistente'));
    if (u.admin) out.push(chip('Administrador', 'perito'));
    if (u.status === 'bloqueado') out.push(chip('Bloqueado', 'vencido'));
    else if (!u.tem_senha) out.push(chip('Convite pendente', 'atencao'));
    else out.push(u.totp_on ? chip('Duas etapas', 'ok') : chip('Sem duas etapas', 'alerta'));
    return out;
  }
  function mostrarLink(destino, u, r, titulo) {
    const msg = (u.tem_senha ? 'Olá, ' + u.nome.split(' ')[0] + '! Link para criar uma nova senha no app Perícias (vale por ' + r.validade + '):\n'
      : 'Olá, ' + u.nome.split(' ')[0] + '! Sua conta no app Perícias foi criada. Seu login é ' + u.login + '. Crie sua senha neste link (vale por ' + r.validade + '):\n') + r.link;
    destino.innerHTML = '';
    destino.append(h('div', { class: 'pf-link' },
      h('b', null, titulo), h('code', null, r.link),
      h('div', { class: 'pf-acoes' },
        h('button', { type: 'button', class: 'btn pequeno', onclick: async () => toast(await copiar(r.link) ? 'Link copiado.' : 'Não consegui copiar.') }, ic('copiar'), 'Copiar link'),
        h('button', { type: 'button', class: 'btn pequeno', onclick: async () => toast(await copiar(msg) ? 'Mensagem copiada.' : 'Não consegui copiar.') }, ic('copiar'), 'Copiar mensagem'),
        h('a', { class: 'btn pequeno', href: u.whatsapp ? wa(u.whatsapp, msg) : 'https://wa.me/?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener' }, ic('chat'), 'Enviar pelo WhatsApp')),
      h('small', null, 'Mande só para a própria pessoa. Quem tiver o link cria a senha da conta.')));
  }

  /* ---------- lista e criação ---------- */
  async function usuarios(v, id) {
    if (id) return usuario(v, id);
    v.append(h('h1', { class: 'pf-titulo' }, 'Usuários'), carregando());
    let j; try { j = await call('admin/usuarios'); } catch (e) { v.lastChild.replaceWith(h('p', { class: 'msg' }, e.message)); return; }
    v.lastChild.remove();
    const lista = h('div', { class: 'pf-lista' });
    j.usuarios.forEach(u => lista.append(h('a', { class: 'pf-item link', href: '#usuarios/' + u.id },
      h('div', null, h('b', null, u.nome), h('small', null, u.login + ' · planilha: ' + u.chave + ' · ' + (u.last_seen_at ? 'usou ' + rel(u.last_seen_at) : 'ainda não entrou') + (u.aparelhos ? ' · ' + u.aparelhos + ' aparelho(s)' : '')), h('div', { class: 'pf-chips' }, situacao(u))),
      h('span', { class: 'pf-seta' }, '›'))));
    v.append(card(null, lista));

    /* nova conta */
    const f = { nome: inp({ autocomplete: 'off' }), login: inp({ autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' }), chave: inp({ autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' }), email: inp({ type: 'email' }), whatsapp: inp({ type: 'tel' }) };
    const papel = h('select', { class: 'pf-in' }, h('option', { value: 'assistente' }, 'Assistente (sem totais em R$)'), h('option', { value: 'perito' }, 'Perito (vê o Financeiro)'));
    const adm = h('input', { type: 'checkbox' });
    let chaveMexida = false;
    f.login.addEventListener('input', () => { if (!chaveMexida) f.chave.value = f.login.value.toLowerCase().split('@')[0].replace(/[^a-z0-9._-]/g, '').slice(0, 40); });
    f.chave.addEventListener('input', () => { chaveMexida = true; });
    const res = h('div');
    const bCriar = h('button', { type: 'button', class: 'btn primario' }, 'Criar conta e gerar convite');
    bCriar.onclick = () => acao(bCriar, async () => {
      const r = await call('admin/criar', { nome: f.nome.value, login: f.login.value, chave: f.chave.value, papel: papel.value, admin: adm.checked, email: f.email.value, whatsapp: f.whatsapp.value });
      const u = { nome: f.nome.value.trim(), login: f.login.value.trim().toLowerCase(), whatsapp: f.whatsapp.value, tem_senha: false };
      Object.values(f).forEach(i => { i.value = ''; }); adm.checked = false; chaveMexida = false;
      mostrarLink(res, u, r, 'Conta criada. Envie o convite:');
      toast('Conta criada.');
      const nl = (await call('admin/usuarios')).usuarios; lista.innerHTML = '';
      nl.forEach(x => lista.append(h('a', { class: 'pf-item link', href: '#usuarios/' + x.id }, h('div', null, h('b', null, x.nome), h('small', null, x.login + ' · planilha: ' + x.chave), h('div', { class: 'pf-chips' }, situacao(x))), h('span', { class: 'pf-seta' }, '›'))));
    });
    v.append(card('Nova conta',
      h('p', { class: 'pf-dica' }, 'Só você cria contas. A pessoa recebe um link para criar a própria senha (você não fica sabendo dela).'),
      h('div', { class: 'pf-grade' },
        campo('Nome de exibição', f.nome), campo('Login', f.login, 'O que a pessoa digita para entrar. Ela pode mudar depois.'),
        campo('Usuário na planilha', f.chave, 'Nome usado no histórico e nas tarefas. Para quem já usava o app, coloque o mesmo usuário de antes. Não muda depois.'),
        campo('Perfil', papel), campo('E-mail (opcional)', f.email), campo('WhatsApp (opcional)', f.whatsapp, 'Para enviar o convite direto.')),
      h('label', { class: 'pf-check' }, adm, 'Administrador (pode criar contas e mudar ajustes)'),
      h('div', { class: 'pf-acoes' }, bCriar), res));
  }

  /* ---------- uma conta ---------- */
  async function usuario(v, id) {
    v.append(h('a', { class: 'pf-voltar', href: '#usuarios' }, ic('voltar'), 'Usuários'), carregando());
    let j; try { j = await call('admin/usuario?id=' + encodeURIComponent(id)); } catch (e) { v.lastChild.replaceWith(h('p', { class: 'msg' }, e.message)); return; }
    v.lastChild.remove();
    const u = j.usuario, eu = u.id === me.id || u.chave === me.chave, recarregar = () => { v.innerHTML = ''; usuario(v, id); };
    v.append(h('div', { class: 'pf-cab' }, h('div', null, h('h1', { class: 'pf-titulo' }, u.nome), h('p', { class: 'pf-dica' }, u.login + ' · planilha: ' + u.chave + ' · criada em ' + fmtDT(u.created_at))), h('div', { class: 'pf-chips' }, situacao(u))));

    const f = { nome: inp({ value: u.nome }), login: inp({ value: u.login, autocapitalize: 'none', spellcheck: 'false' }), email: inp({ type: 'email', value: u.email || '' }), whatsapp: inp({ type: 'tel', value: (u.whatsapp || '').replace(/^55/, '') }) };
    const papel = h('select', { class: 'pf-in' }, h('option', { value: 'assistente', selected: u.papel !== 'perito' }, 'Assistente (sem totais em R$)'), h('option', { value: 'perito', selected: u.papel === 'perito' }, 'Perito (vê o Financeiro)'));
    const adm = h('input', { type: 'checkbox', checked: !!u.admin, disabled: eu });
    const bSalvar = h('button', { type: 'button', class: 'btn primario' }, 'Salvar');
    bSalvar.onclick = () => acao(bSalvar, async () => { await call('admin/editar', { id: u.id, nome: f.nome.value, login: f.login.value, papel: papel.value, admin: adm.checked, email: f.email.value, whatsapp: f.whatsapp.value }); toast('Conta salva.'); recarregar(); });
    v.append(card('Dados', h('div', { class: 'pf-grade' }, campo('Nome de exibição', f.nome), campo('Login', f.login), campo('Perfil', papel), campo('E-mail', f.email), campo('WhatsApp', f.whatsapp)),
      h('label', { class: 'pf-check' }, adm, 'Administrador'), h('div', { class: 'pf-acoes' }, bSalvar, u.whatsapp ? h('a', { class: 'btn', href: wa(u.whatsapp), target: '_blank', rel: 'noopener' }, ic('chat'), 'Conversar') : null)));

    const res = h('div');
    const bLink = h('button', { type: 'button', class: 'btn' }, u.tem_senha ? 'Gerar link de nova senha' : 'Gerar novo convite');
    bLink.onclick = () => acao(bLink, async () => { const r = await call('admin/link-senha', { id: u.id }); mostrarLink(res, u, r, u.tem_senha ? 'Link de nova senha:' : 'Novo convite:'); });
    const b2fa = h('button', { type: 'button', class: 'btn' }, 'Zerar duas etapas');
    b2fa.onclick = () => acao(b2fa, async () => {
      if (!(await ask('Zerar as duas etapas de ' + u.nome.split(' ')[0] + '?', 'Use quando a pessoa perdeu ou trocou o celular. Ela é desconectada e, no próximo login, cadastra o autenticador de novo.', 'Zerar', true))) return;
      await call('admin/2fa-reset', { id: u.id }); toast('Duas etapas zeradas.'); recarregar();
    });
    const bSes = h('button', { type: 'button', class: 'btn' }, 'Desconectar aparelhos (' + j.sessoes.length + ')');
    bSes.onclick = () => acao(bSes, async () => { const r = await call('admin/sessoes', { id: u.id }); toast(r.encerradas + ' aparelho(s) desconectado(s).'); recarregar(); });
    const bloq = u.status === 'bloqueado';
    const bBlock = h('button', { type: 'button', class: 'btn ' + (bloq ? 'primario' : 'perigo') }, bloq ? 'Desbloquear' : 'Bloquear');
    bBlock.onclick = () => acao(bBlock, async () => {
      if (!bloq && !(await ask('Bloquear ' + u.nome + '?', 'A pessoa é desconectada na hora e não consegue mais entrar até você desbloquear.', 'Bloquear', true))) return;
      await call('admin/status', { id: u.id, status: bloq ? 'ativo' : 'bloqueado' }); toast(bloq ? 'Conta desbloqueada.' : 'Conta bloqueada.'); recarregar();
    });
    const bDel = h('button', { type: 'button', class: 'btn perigo' }, 'Excluir conta');
    bDel.onclick = () => acao(bDel, async () => {
      const ok = await ask('Excluir a conta de ' + u.nome + '?', 'O histórico na planilha continua com o usuário ' + u.chave + '. Para confirmar, digite o login da conta:', 'Excluir', true, u.login);
      if (!ok) return;
      await call('admin/excluir', { id: u.id, confirmar: ok }); toast('Conta excluída.'); location.hash = '#usuarios';
    });
    v.append(card('Acesso', h('div', { class: 'pf-acoes' }, bLink, u.totp_on ? b2fa : null, j.sessoes.length ? bSes : null, !eu ? bBlock : null, !eu ? bDel : null), res));

    v.append(h('div', { class: 'pf-duas' },
      card('Aparelhos conectados', j.sessoes.length ? h('div', { class: 'pf-lista' }, j.sessoes.map(x => h('div', { class: 'pf-item' }, h('div', null, h('b', null, aparelho(x.ua)), h('small', null, [x.place, 'usado ' + rel(x.last_seen_at), 'entrou em ' + fmtDT(x.created_at)].filter(Boolean).join(' · ')))))) : h('p', { class: 'pf-dica' }, 'Nenhum aparelho conectado.')),
      card('Registro desta conta', j.registro.length ? h('div', { class: 'pf-log' }, j.registro.slice(0, 40).map(r => h('div', null, h('time', null, fmtDT(r.at)), h('span', null, h('b', null, r.action), r.detail ? ': ' + r.detail : '', r.actor && r.actor !== u.nome ? ' (por ' + r.actor + ')' : ''), r.place ? h('small', null, r.place) : null))) : h('p', { class: 'pf-dica' }, 'Sem registros.'))));
  }

  /* ---------- ajustes ---------- */
  async function ajustes(v) {
    v.append(h('h1', { class: 'pf-titulo' }, 'Ajustes de segurança'), carregando());
    let j; try { j = await call('admin/usuarios'); } catch (e) { v.lastChild.replaceWith(h('p', { class: 'msg' }, e.message)); return; }
    v.lastChild.remove();
    const a = Object.assign({}, j.ajustes), mud = {};
    const salvar = h('button', { type: 'button', class: 'btn primario', disabled: true }, 'Salvar ajustes');
    const marca = (k, val) => { mud[k] = val; salvar.disabled = false; };
    const sw = (k, rot, dica) => { const c = h('input', { type: 'checkbox', checked: !!a[k], onchange: e => marca(k, e.target.checked) }); return h('label', { class: 'pf-sw' }, c, h('span', null, h('b', null, rot), dica ? h('small', null, dica) : null)); };
    const num = (k, min, max) => { const i = inp({ type: 'number', min, max, value: a[k], inputmode: 'numeric' }); i.oninput = () => marca(k, i.value); return i; };
    const zap = inp({ type: 'tel', value: (a.contato_whatsapp || '').replace(/^55/, ''), placeholder: '17999999999' }); zap.oninput = () => marca('contato_whatsapp', zap.value);
    salvar.onclick = () => acao(salvar, async () => {
      if (mud.exigir_2fa === false && !(await ask('Deixar as duas etapas opcionais?', 'Sem elas, quem descobrir a senha de alguém entra no app e vê os processos.', 'Deixar opcional', true))) return;
      await call('admin/ajustes', { ajustes: mud }); toast('Ajustes salvos.'); v.innerHTML = ''; ajustes(v);
    });
    v.append(card('Login',
      sw('exigir_2fa', 'Duas etapas obrigatórias', 'Todos precisam do código do aplicativo autenticador ao entrar. Quem ainda não tem, cadastra no próximo login.'),
      sw('so_brasil', 'Só aceitar login vindo do Brasil', 'Bloqueia tentativas de outros países. Desligue antes de viajar para o exterior.'),
      h('div', { class: 'pf-grade tres' },
        campo('Pedir login de novo sem uso por (dias)', num('sessao_dias', 1, 60)),
        campo('Pedir login de novo a cada (dias)', num('sessao_max_dias', 1, 180), 'Mesmo usando todo dia.'),
        campo('Aparelhos por conta', num('max_aparelhos', 1, 10), 'Ao entrar num a mais, o mais antigo sai.'))),
      card('Contato', campo('WhatsApp para pedidos de nova senha', zap, 'Aparece em "Esqueci a senha" na tela de entrada.')),
      h('div', { class: 'pf-salvar' }, salvar));
  }

  /* ---------- registro ---------- */
  function registro(v) {
    const lista = h('div', { class: 'pf-log grande' });
    const q = inp({ type: 'search', placeholder: 'Buscar (nome, ação, detalhe)' });
    const mais = h('button', { type: 'button', class: 'btn', hidden: true }, 'Carregar mais');
    let off = 0, tm;
    async function carregar(zerar) {
      if (zerar) { off = 0; lista.innerHTML = ''; }
      try {
        const j = await call('admin/registro?off=' + off + '&q=' + encodeURIComponent(q.value.trim()));
        j.registro.forEach(r => lista.append(h('div', null, h('time', null, fmtDT(r.at)),
          h('span', null, h('b', null, r.actor || 'Sistema'), ' ', r.action, r.alvo && r.alvo !== r.actor ? [' ', h('a', { href: '#usuarios/' + r.target_id }, r.alvo)] : null, r.detail ? ': ' + r.detail : ''),
          h('small', null, [r.place, r.ua ? aparelho(r.ua) : ''].filter(Boolean).join(' · ')))));
        off += j.registro.length; mais.hidden = j.registro.length < 100;
        if (!off) lista.append(h('p', { class: 'pf-dica' }, 'Nada encontrado.'));
      } catch (e) { lista.append(h('p', { class: 'msg' }, e.message)); }
    }
    q.oninput = () => { clearTimeout(tm); tm = setTimeout(() => carregar(true), 300); };
    mais.onclick = () => acao(mais, () => carregar(false));
    v.append(h('h1', { class: 'pf-titulo' }, 'Registro'),
      h('p', { class: 'pf-dica' }, 'Entradas, senhas erradas, códigos, ações no app e tudo o que foi feito nesta área. Fica guardado por 2 anos. As alterações na planilha continuam também na aba HISTORICO.'),
      q, card(null, lista), mais);
    carregar(true);
  }

  window.PF_ADMIN = { usuarios, ajustes, registro };
})();
