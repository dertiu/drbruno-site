/* Página Minha conta do app Perícias: perfil, senha, duas etapas, aparelhos e atividade.
   Para o administrador, carrega também admin.js (usuários, ajustes e registro). */
import { $, h, ic, call, ocupado, wa, copiar, blocoCadastro, blocoRecuperacao } from '../comum.js';

const raiz = $('#pf');
let me = null, cfg = {};

/* ---------- utilidades da página ---------- */
const fmtDT = ms => ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
function rel(ms) {
  if (!ms) return 'nunca';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 2) return 'agora'; if (m < 60) return 'há ' + m + ' min';
  const hh = Math.round(m / 60); if (hh < 24) return 'há ' + hh + ' h';
  const d = Math.round(hh / 24); return d < 31 ? 'há ' + d + (d === 1 ? ' dia' : ' dias') : 'em ' + new Date(ms).toLocaleDateString('pt-BR');
}
function aparelho(ua) {
  ua = ua || '';
  const so = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Aparelho';
  const nav = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return nav ? nav + ' no ' + so : so;
}
const toastEl = h('div', { class: 'toast', hidden: true, role: 'status' });
function toast(msg, erro) {
  toastEl.textContent = msg; toastEl.className = 'toast' + (erro ? ' erro' : ''); toastEl.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { toastEl.hidden = true; }, erro ? 6000 : 3000);
}
function ask(titulo, texto, ok, perigo, digitar) {
  return new Promise(res => {
    const campo = digitar ? h('input', { class: 'pf-in', placeholder: digitar, autocomplete: 'off' }) : null;
    const fechar = v => { w.remove(); res(v); };
    const btnOk = h('button', { type: 'button', class: 'btn ' + (perigo ? 'perigo' : 'primario'), onclick: () => {
      if (digitar && campo.value.trim().toLowerCase() !== digitar.toLowerCase()) { campo.focus(); campo.classList.add('ruim'); return; }
      fechar(digitar ? campo.value.trim() : true);
    } }, ok);
    const w = h('div', { class: 'pf-modal-w', onclick: e => { if (e.target === w) fechar(false); } },
      h('div', { class: 'pf-modal', role: 'dialog', 'aria-modal': 'true' }, h('h2', null, titulo), texto ? h('p', null, texto) : null, campo,
        h('div', { class: 'pf-modal-a' }, h('button', { type: 'button', class: 'btn', onclick: () => fechar(false) }, 'Cancelar'), btnOk)));
    document.body.append(w); (campo || btnOk).focus();
  });
}
async function acao(btn, fn) { await ocupado(btn, async () => { try { await fn(); } catch (e) { toast(e.message, true); if (e.status === 401) setTimeout(() => location.replace('/pericias/'), 1500); } }); }
const card = (titulo, ...kids) => h('section', { class: 'pf-card' }, titulo ? h('h2', null, titulo) : null, ...kids);
const campo = (rot, el, dica) => h('label', { class: 'pf-campo' }, h('span', null, rot), el, dica ? h('small', null, dica) : null);
const inp = p => h('input', Object.assign({ class: 'pf-in' }, p));
const chip = (txt, tipo) => h('span', { class: 'chip ' + (tipo || '') }, txt);
const carregando = () => h('p', { class: 'pf-carregando' }, 'Carregando...');

/* ---------- estrutura ---------- */
const ABAS = [['conta', 'Minha conta'], ['usuarios', 'Usuários', true], ['ajustes', 'Ajustes', true], ['registro', 'Registro', true]];
let nav, vista;
function montar() {
  raiz.innerHTML = '';
  nav = h('nav', { class: 'pf-abas', 'aria-label': 'Seções' });
  vista = h('main', { class: 'pf-main' });
  raiz.append(
    h('header', { class: 'pf-topo' }, h('div', { class: 'pf-topo-in' },
      h('a', { class: 'pf-marca', href: '/pericias/' }, h('img', { src: '../logo-128.webp', alt: '', width: 34, height: 33 }), h('div', null, h('b', null, 'Perícias'), h('small', null, me.nome))),
      h('div', { class: 'pf-topo-a' },
        h('a', { class: 'btn pequeno', href: '/pericias/' }, ic('voltar'), 'Voltar ao app'),
        h('button', { type: 'button', class: 'btn pequeno', title: 'Sair', onclick: async () => { try { await call('sair', {}); } catch (e) { } location.replace('/pericias/'); } }, ic('sair'), h('span', { class: 'pf-so-largo' }, 'Sair')))),
      me.admin ? h('div', { class: 'pf-topo-in abas' }, nav) : null),
    vista, toastEl);
  window.addEventListener('hashchange', rota);
  rota();
}
function rota() {
  const partes = location.hash.replace(/^#/, '').split('/');
  let aba = partes[0] || 'conta';
  if (!ABAS.some(a => a[0] === aba) || (aba !== 'conta' && !me.admin)) aba = 'conta';
  if (me.admin) {
    nav.innerHTML = '';
    ABAS.forEach(([id, rot, adm]) => { if (!adm || me.admin) nav.append(h('a', { href: '#' + id, class: aba === id ? 'ativa' : '', 'aria-current': aba === id ? 'page' : null }, rot)); });
  }
  vista.innerHTML = ''; window.scrollTo(0, 0);
  if (aba === 'conta') return vConta();
  if (!window.PF_ADMIN) { vista.append(carregando()); return; }
  window.PF_ADMIN[aba](vista, partes[1]);
}

/* ---------- Minha conta ---------- */
async function vConta() {
  const v = vista;
  v.append(h('h1', { class: 'pf-titulo' }, 'Minha conta'));
  /* perfil */
  const f = { nome: inp({ value: me.nome, autocomplete: 'name' }), login: inp({ value: me.login, autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' }), email: inp({ type: 'email', value: me.email, autocomplete: 'email' }), whatsapp: inp({ type: 'tel', value: me.whatsapp ? me.whatsapp.replace(/^55/, '') : '', autocomplete: 'tel-national' }) };
  const bPerfil = h('button', { type: 'button', class: 'btn primario' }, 'Salvar');
  bPerfil.onclick = () => acao(bPerfil, async () => {
    const r = await call('perfil', { nome: f.nome.value, login: f.login.value, email: f.email.value, whatsapp: f.whatsapp.value });
    me = r.usuario; toast('Perfil salvo.'); montar();
  });
  v.append(card('Perfil',
    h('div', { class: 'pf-grade' }, campo('Nome de exibição', f.nome, 'Aparece no app e nas tarefas.'), campo('Login', f.login, 'O que você digita para entrar.'), campo('E-mail (opcional)', f.email), campo('WhatsApp (opcional)', f.whatsapp)),
    h('p', { class: 'pf-info' }, 'Perfil no app: ', chip(me.papel === 'perito' ? 'Perito' : 'Assistente', me.papel === 'perito' ? 'perito' : 'assistente'), me.admin ? chip('Administrador', 'perito') : null, h('span', null, ' · usuário na planilha: '), h('code', null, me.chave)),
    h('div', { class: 'pf-acoes' }, bPerfil)));

  /* senha */
  const s = { atual: inp({ type: 'password', autocomplete: 'current-password' }), nova: inp({ type: 'password', autocomplete: 'new-password' }), rep: inp({ type: 'password', autocomplete: 'new-password' }) };
  const bSenha = h('button', { type: 'button', class: 'btn' }, 'Trocar senha');
  bSenha.onclick = () => acao(bSenha, async () => {
    if (s.nova.value.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
    if (s.nova.value !== s.rep.value) throw new Error('As duas senhas novas não são iguais.');
    await call('senha', { atual: s.atual.value, nova: s.nova.value });
    s.atual.value = s.nova.value = s.rep.value = '';
    toast('Senha trocada. Os outros aparelhos foram desconectados.'); carregarAparelhos();
  });
  v.append(card('Senha', h('form', { onsubmit: e => e.preventDefault() }, h('input', { type: 'text', name: 'username', autocomplete: 'username', value: me.login, hidden: true, readonly: true }),
    h('div', { class: 'pf-grade tres' }, campo('Senha atual', s.atual), campo('Nova senha', s.nova, 'Mínimo de 8 caracteres.'), campo('Repita a nova senha', s.rep))),
  h('div', { class: 'pf-acoes' }, bSenha)));

  /* duas etapas */
  const box2 = card('Verificação em duas etapas', carregando());
  v.append(box2);
  carregar2fa(box2);

  /* aparelhos */
  const boxAp = card('Aparelhos conectados', carregando());
  v.append(boxAp);
  async function carregarAparelhos() {
    try {
      const j = await call('sessoes');
      boxAp.innerHTML = ''; boxAp.append(h('h2', null, 'Aparelhos conectados'));
      const lista = h('div', { class: 'pf-lista' });
      j.sessoes.forEach(x => {
        const b = x.atual ? null : h('button', { type: 'button', class: 'btn pequeno' }, 'Desconectar');
        if (b) b.onclick = () => acao(b, async () => { await call('sessoes/encerrar', { id: x.id }); toast('Aparelho desconectado.'); carregarAparelhos(); });
        lista.append(h('div', { class: 'pf-item' }, h('div', null, h('b', null, aparelho(x.ua)), x.atual ? chip('Este aparelho', 'ok') : null, h('small', null, [x.local, 'usado ' + rel(x.vista), 'entrou em ' + fmtDT(x.criada)].filter(Boolean).join(' · '))), b));
      });
      boxAp.append(lista);
      if (j.sessoes.length > 1) {
        const b = h('button', { type: 'button', class: 'btn' }, 'Desconectar todos os outros');
        b.onclick = () => acao(b, async () => { await call('sessoes/encerrar', { id: 'outras' }); toast('Outros aparelhos desconectados.'); carregarAparelhos(); });
        boxAp.append(h('div', { class: 'pf-acoes' }, b));
      }
      boxAp.append(h('p', { class: 'pf-dica' }, 'Sem usar por ' + cfg.sessao_dias + ' dias, ou depois de ' + cfg.sessao_max_dias + ' dias, o app pede login de novo.'));
    } catch (e) { boxAp.append(h('p', { class: 'msg' }, e.message)); }
  }
  carregarAparelhos();

  /* atividade */
  const boxH = card('Atividade da sua conta', carregando());
  v.append(boxH);
  try {
    const j = await call('historico');
    boxH.innerHTML = ''; boxH.append(h('h2', null, 'Atividade da sua conta'),
      j.registro.length ? h('div', { class: 'pf-log' }, j.registro.map(r => h('div', null, h('time', null, fmtDT(r.at)), h('span', null, h('b', null, r.action), r.detail ? ': ' + r.detail : '', r.actor && r.actor !== me.nome ? ' (por ' + r.actor + ')' : ''), h('small', null, [r.place, aparelho(r.ua)].filter(Boolean).join(' · ')))))
        : h('p', { class: 'pf-dica' }, 'Nada registrado ainda.'),
      h('p', { class: 'pf-dica' }, 'Se aparecer uma entrada que não foi você, troque a senha e desconecte os outros aparelhos.'));
  } catch (e) { boxH.append(h('p', { class: 'msg' }, e.message)); }
}

async function carregar2fa(box) {
  let j;
  try { j = await call('2fa/estado'); } catch (e) { box.append(h('p', { class: 'msg' }, e.message)); return; }
  box.innerHTML = ''; box.append(h('h2', null, 'Verificação em duas etapas'));
  if (j.ativo) {
    box.append(h('p', { class: 'pf-status ok' }, ic('escudo'), h('span', null, h('b', null, 'Ativa. '), 'Ao entrar, o app pede o código do aplicativo autenticador. Restam ' + j.recuperacao_restantes + ' códigos de recuperação.')));
    if (j.recuperacao_restantes <= 3) box.append(h('p', { class: 'pf-aviso' }, 'Poucos códigos de recuperação. Gere novos abaixo.'));
  } else {
    box.append(h('p', { class: 'pf-status' + (j.obrigatorio ? ' alerta' : '') }, ic('escudo'), h('span', null, h('b', null, 'Desativada. '), j.obrigatorio ? 'É obrigatória para todos: ative agora.' : 'Recomendado: protege sua conta mesmo se alguém descobrir a senha.')));
  }
  const area = h('div', { class: 'pf-2fa' });
  const bAtivar = h('button', { type: 'button', class: 'btn ' + (j.ativo ? '' : 'primario') }, j.ativo ? 'Trocar de celular' : 'Ativar');
  bAtivar.onclick = () => acao(bAtivar, async () => {
    const r = await call('2fa/iniciar', {});
    const cod = h('input', { class: 'pf-in en-codigo-in', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, placeholder: '000000' });
    const msg = h('p', { class: 'msg', role: 'alert' });
    const ok = h('button', { type: 'button', class: 'btn primario' }, 'Confirmar');
    ok.onclick = () => acao(ok, async () => {
      try {
        const x = await call('2fa/ativar', { ticket: r.ticket, codigo: cod.value });
        area.innerHTML = ''; area.append(blocoRecuperacao(x.recuperacao, () => { me.duas_etapas = true; carregar2fa(box); }));
      } catch (e) { msg.textContent = e.message; cod.select(); }
    });
    area.innerHTML = '';
    area.append(blocoCadastro(r.segredo, r.uri), h('div', { class: 'pf-linha' }, campo('Código de 6 números', cod), ok), msg);
    setTimeout(() => cod.focus(), 50);
  });
  const acoes = h('div', { class: 'pf-acoes' }, bAtivar);
  if (j.ativo) {
    const bRec = h('button', { type: 'button', class: 'btn' }, 'Gerar novos códigos de recuperação');
    bRec.onclick = () => acao(bRec, async () => {
      const cod = h('input', { class: 'pf-in en-codigo-in', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, placeholder: '000000' });
      const ok = h('button', { type: 'button', class: 'btn primario' }, 'Gerar');
      const msg = h('p', { class: 'msg', role: 'alert' });
      ok.onclick = () => acao(ok, async () => {
        try { const x = await call('2fa/recuperacao', { codigo: cod.value }); area.innerHTML = ''; area.append(blocoRecuperacao(x.recuperacao, () => carregar2fa(box))); }
        catch (e) { msg.textContent = e.message; }
      });
      area.innerHTML = '';
      area.append(h('p', { class: 'pf-dica' }, 'Os códigos antigos deixam de valer. Para confirmar, digite o código atual do aplicativo.'), h('div', { class: 'pf-linha' }, campo('Código de 6 números', cod), ok), msg);
      cod.focus();
    });
    acoes.append(bRec);
    if (!j.obrigatorio) {
      const bOff = h('button', { type: 'button', class: 'btn perigo' }, 'Desativar');
      bOff.onclick = () => acao(bOff, async () => {
        const senha = h('input', { class: 'pf-in', type: 'password', autocomplete: 'current-password' });
        const ok = h('button', { type: 'button', class: 'btn perigo' }, 'Desativar as duas etapas');
        const msg = h('p', { class: 'msg', role: 'alert' });
        ok.onclick = () => acao(ok, async () => { try { await call('2fa/desativar', { senha: senha.value }); toast('Duas etapas desativadas.'); carregar2fa(box); } catch (e) { msg.textContent = e.message; } });
        area.innerHTML = ''; area.append(h('div', { class: 'pf-linha' }, campo('Sua senha', senha), ok), msg); senha.focus();
      });
      acoes.append(bOff);
    }
  }
  box.append(acoes, area);
}

/* ---------- início ---------- */
(async function iniciar() {
  try {
    const j = await call('eu');
    if (!j.logado) { location.replace('/pericias/'); return; }
    me = j.usuario; cfg = j.config || {};
  } catch (e) { raiz.append(h('p', { class: 'msg' }, e.message)); return; }
  window.PF = { h, ic, call, acao, ask, toast, card, campo, inp, chip, fmtDT, rel, aparelho, wa, copiar, carregando, me: () => me, cfg };
  if (me.admin) {
    const s = document.createElement('script'); s.src = 'admin.js';
    s.onload = () => { if (location.hash.replace('#', '').split('/')[0] !== 'conta') rota(); };
    document.body.append(s);
  }
  montar();
})();
