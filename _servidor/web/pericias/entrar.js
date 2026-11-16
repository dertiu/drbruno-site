/* Entrada do app Perícias (versão no site): login, código de duas etapas, cadastro do autenticador,
   criação de senha pelo link de convite e configuração do primeiro administrador.
   O código do app (app.js) só é baixado depois do login. */
import { $, h, ic, call, ocupado, wa, blocoCadastro, blocoRecuperacao } from './comum.js';

let card, eu = null;

function tela(...conteudo) {
  card.innerHTML = '';
  card.append(
    h('img', { src: 'logo-128.webp', alt: '', class: 'login-logo', width: 58, height: 56 }),
    h('h1', null, 'Perícias'),
    h('p', { class: 'login-sub' }, 'Dr. Bruno Thomás Michels'),
    ...conteudo);
  const f = card.querySelector('input:not([type=checkbox]):not([readonly])');
  if (f) setTimeout(() => f.focus(), 30);
}
const msgEl = () => h('p', { class: 'msg', role: 'alert' });
const campo = (rot, input, dica) => h('div', { class: 'en-campo' }, h('label', { for: input.id }, rot), input, dica ? h('small', null, dica) : null);
const inp = p => h('input', Object.assign({ autocomplete: 'off' }, p));

/* ---------- carrega o app depois do login ---------- */
async function abrirApp(usuario) {
  tela(h('p', { class: 'en-carregando' }, 'Abrindo...'));
  let equipe = null;
  try { equipe = (await call('equipe')).usuarios; } catch (e) { }
  window.PERICIAS_SESSAO = Object.assign({}, usuario, { equipe });
  const carregar = src => new Promise((ok, erro) => { const s = h('script', { src }); s.onload = ok; s.onerror = erro; document.body.append(s); });
  try {
    await carregar('config.js');
    $('#entrar').remove();
    await carregar('app.js');
  } catch (e) {
    location.reload();
  }
}

/* ---------- login ---------- */
function telaLogin(aviso) {
  const msg = msgEl();
  if (aviso) msg.textContent = aviso;
  const login = inp({ id: 'en-login', name: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: true });
  const senha = inp({ id: 'en-senha', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const olho = h('button', { type: 'button', class: 'en-olho', 'aria-label': 'Mostrar senha', onclick: () => { senha.type = senha.type === 'password' ? 'text' : 'password'; } }, ic('olho'));
  const btn = h('button', { class: 'btn primario', type: 'submit' }, 'Entrar');
  const form = h('form', { class: 'en-form', autocomplete: 'on', onsubmit: ev => {
    ev.preventDefault(); msg.textContent = '';
    if (!login.value.trim() || !senha.value) { msg.textContent = 'Digite login e senha.'; return; }
    ocupado(btn, async () => {
      try { seguir(await call('entrar', { login: login.value, senha: senha.value })); }
      catch (e) { msg.textContent = e.message; senha.select(); }
    });
  } }, campo('Login', login), h('div', { class: 'en-campo' }, h('label', { for: 'en-senha' }, 'Senha'), h('div', { class: 'en-senha' }, senha, olho)), btn, msg);
  const c = eu && eu.config && eu.config.contato_whatsapp;
  tela(form,
    h('details', { class: 'en-esqueci' }, h('summary', null, 'Esqueci a senha'),
      h('p', null, 'Por segurança, a senha só é trocada por um link que o administrador gera para você.'),
      c ? h('a', { class: 'btn', href: wa(c, 'Olá! Esqueci a senha do app Perícias. Pode me mandar um link novo?'), target: '_blank', rel: 'noopener' }, ic('chat'), 'Pedir link pelo WhatsApp') : null),
    eu && eu.setup ? h('button', { type: 'button', class: 'en-link', onclick: telaConfigurar }, 'Configurar o primeiro administrador') : null);
}

/* decide a próxima tela depois de senha certa */
function seguir(j) {
  if (j.etapa === 'pronto') return abrirApp(j.usuario);
  if (j.etapa === 'codigo') return telaCodigo(j);
  if (j.etapa === 'cadastrar') return telaCadastrar(j);
}

/* ---------- código de 6 números (ou de recuperação) ---------- */
function telaCodigo(j) {
  const msg = msgEl();
  let recup = false;
  const cod = inp({ id: 'en-codigo', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, pattern: '[0-9]*', class: 'en-codigo-in', placeholder: '000000' });
  const rot = h('label', { for: 'en-codigo' }, 'Código do aplicativo autenticador');
  const btn = h('button', { class: 'btn primario', type: 'submit' }, 'Confirmar');
  const trocar = h('button', { type: 'button', class: 'en-link', onclick: () => {
    recup = !recup;
    cod.value = ''; cod.maxLength = recup ? 11 : 6; cod.inputMode = recup ? 'text' : 'numeric'; cod.placeholder = recup ? 'XXXXX-XXXXX' : '000000';
    cod.classList.toggle('en-codigo-in', !recup); cod.autocapitalize = recup ? 'characters' : 'off';
    rot.textContent = recup ? 'Código de recuperação' : 'Código do aplicativo autenticador';
    trocar.textContent = recup ? 'Usar o código do aplicativo' : 'Perdi o celular: usar código de recuperação';
    cod.focus();
  } }, 'Perdi o celular: usar código de recuperação');
  const enviar = () => ocupado(btn, async () => {
    try {
      const r = await call('entrar/codigo', { ticket: j.ticket, codigo: cod.value });
      if (typeof r.restam === 'number') alert('Você usou um código de recuperação. Restam ' + r.restam + '. Gere novos em Minha conta.');
      abrirApp(r.usuario);
    } catch (e) {
      msg.textContent = e.message; cod.select();
      if (e.status === 410 || e.status === 429) setTimeout(() => telaLogin(e.message), 1600);
    }
  });
  cod.addEventListener('input', () => { if (!recup) { cod.value = cod.value.replace(/\D/g, ''); if (cod.value.length === 6) enviar(); } });
  tela(h('p', { class: 'en-texto' }, 'Olá, ' + String(j.nome || '').split(' ')[0] + '. Abra o aplicativo autenticador e digite o código de Perícias.'),
    h('form', { class: 'en-form', onsubmit: ev => { ev.preventDefault(); enviar(); } }, h('div', { class: 'en-campo' }, rot, cod), btn, msg),
    trocar, h('button', { type: 'button', class: 'en-link', onclick: () => telaLogin() }, 'Voltar'));
}

/* ---------- primeiro acesso com duas etapas obrigatórias ---------- */
function telaCadastrar(j) {
  const msg = msgEl();
  const cod = inp({ id: 'en-codigo', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, class: 'en-codigo-in', placeholder: '000000' });
  const btn = h('button', { class: 'btn primario', type: 'submit' }, 'Ativar e entrar');
  tela(h('div', { class: 'en-titulo' }, ic('escudo'), h('b', null, 'Ative a verificação em duas etapas')),
    h('p', { class: 'en-texto' }, 'Além da senha, o app vai pedir um código que muda a cada 30 segundos no seu celular. Assim, mesmo quem descobrir sua senha não entra.'),
    blocoCadastro(j.segredo, j.uri),
    h('form', { class: 'en-form', onsubmit: ev => {
      ev.preventDefault(); msg.textContent = '';
      ocupado(btn, async () => {
        try {
          const r = await call('entrar/codigo', { ticket: j.ticket, codigo: cod.value });
          tela(h('div', { class: 'en-titulo' }, ic('escudo'), h('b', null, 'Duas etapas ativadas')), blocoRecuperacao(r.recuperacao, () => abrirApp(r.usuario)));
        } catch (e) { msg.textContent = e.message; cod.select(); if (e.status === 410 || e.status === 429) setTimeout(() => telaLogin(e.message), 1800); }
      });
    } }, campo('Código de 6 números', cod), btn, msg));
}

/* ---------- link de convite ou de nova senha ---------- */
async function telaDefinir(token) {
  tela(h('p', { class: 'en-carregando' }, 'Conferindo o link...'));
  let info;
  try { info = await call('convite/verificar', { token }); }
  catch (e) { return telaLogin(e.message); }
  const msg = msgEl();
  const s1 = inp({ id: 'en-n1', type: 'password', autocomplete: 'new-password', minlength: 8 });
  const s2 = inp({ id: 'en-n2', type: 'password', autocomplete: 'new-password', minlength: 8 });
  const btn = h('button', { class: 'btn primario', type: 'submit' }, 'Salvar senha');
  tela(h('p', { class: 'en-texto' }, (info.tipo === 'convite' ? 'Bem-vindo(a), ' : 'Olá, ') + info.nome.split(' ')[0] + '. Crie ' + (info.tipo === 'convite' ? 'sua senha' : 'uma nova senha') + ' para o login ', h('b', null, info.login), '.'),
    h('form', { class: 'en-form', onsubmit: ev => {
      ev.preventDefault(); msg.textContent = '';
      if (s1.value.length < 8) { msg.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
      if (s1.value !== s2.value) { msg.textContent = 'As duas senhas não são iguais.'; return; }
      ocupado(btn, async () => { try { seguir(await call('convite/definir', { token, senha: s1.value })); } catch (e) { msg.textContent = e.message; } });
    } }, h('input', { type: 'text', name: 'username', autocomplete: 'username', value: info.login, hidden: true, readonly: true }),
      campo('Nova senha', s1, 'Mínimo de 8 caracteres. Use uma senha que você não usa em outro lugar.'), campo('Repita a senha', s2), btn, msg));
}

/* ---------- primeiro administrador ---------- */
function telaConfigurar() {
  const msg = msgEl();
  const f = {
    codigo: inp({ id: 'en-cf-cod', type: 'password' }),
    nome: inp({ id: 'en-cf-nome', autocomplete: 'name' }),
    login: inp({ id: 'en-cf-login', autocomplete: 'username', autocapitalize: 'none' }),
    chave: inp({ id: 'en-cf-chave', value: 'bruno', autocapitalize: 'none' }),
    senha: inp({ id: 'en-cf-senha', type: 'password', autocomplete: 'new-password' })
  };
  const btn = h('button', { class: 'btn primario', type: 'submit' }, 'Criar administrador');
  tela(h('p', { class: 'en-texto' }, 'Primeiro acesso: crie a conta do perito. O código de configuração é o segredo PERICIAS_SETUP_CODE definido no Cloudflare.'),
    h('form', { class: 'en-form', onsubmit: ev => {
      ev.preventDefault(); msg.textContent = '';
      ocupado(btn, async () => {
        try { seguir(await call('configurar', { codigo: f.codigo.value, nome: f.nome.value, login: f.login.value, chave: f.chave.value, senha: f.senha.value })); }
        catch (e) { msg.textContent = e.message; }
      });
    } }, campo('Código de configuração', f.codigo), campo('Seu nome', f.nome), campo('Login', f.login, 'Usado para entrar. Pode mudar depois.'),
      campo('Usuário na planilha', f.chave, 'O mesmo de antes (ex.: bruno), para manter histórico e tarefas.'), campo('Senha', f.senha, 'Mínimo de 8 caracteres.'), btn, msg),
    h('button', { type: 'button', class: 'en-link', onclick: () => telaLogin() }, 'Voltar'));
}

/* ---------- início ---------- */
async function iniciar() {
  const antigo = $('#tela-login'); if (antigo) antigo.hidden = true;
  card = h('div', { class: 'login-card en-card' });
  document.body.prepend(h('main', { id: 'entrar', class: 'login' }, card));
  const tk = (location.hash.match(/^#definir=([\w-]{20,})/) || [])[1];
  if (tk) history.replaceState(null, '', location.pathname);
  tela(h('p', { class: 'en-carregando' }, 'Carregando...'));
  try { eu = await call('eu'); }
  catch (e) { return tela(h('p', { class: 'msg' }, e.message), h('button', { type: 'button', class: 'btn primario', onclick: () => location.reload() }, 'Tentar de novo')); }
  if (tk) return telaDefinir(tk);
  if (eu.logado) return abrirApp(eu.usuario);
  telaLogin();
}
iniciar();
