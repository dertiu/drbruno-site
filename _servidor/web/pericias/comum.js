/* Peças usadas pela tela de entrada e pela página Minha conta do /pericias */
import qrcode from 'qrcode-generator';

export const $ = s => document.querySelector(s);
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(3)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(c)); }
  return el;
}
const ICONES = {
  escudo: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  voltar: '<path d="M15 18l-6-6 6-6"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  baixar: '<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>',
  sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>'
};
export function ic(n) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONES[n] || ''; return s;
}

export async function call(path, body) {
  let r;
  try {
    r = await fetch('/pericias/conta/' + path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (e) { const x = new Error('Sem conexão com a internet.'); x.offline = true; throw x; }
  let j = null; try { j = await r.json(); } catch (e) { }
  if (!r.ok || !j || j.ok === false) { const x = new Error((j && j.erro) || 'Erro ' + r.status + '. Tente de novo.'); x.status = r.status; throw x; }
  return j;
}

export function qrSvg(texto) {
  const q = qrcode(0, 'M'); q.addData(texto); q.make();
  const n = q.getModuleCount(), m = 4, size = n + m * 2;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += 'M' + (x + m) + ' ' + (y + m) + 'h1v1h-1z';
  const wrap = h('div', { class: 'en-qr', role: 'img', 'aria-label': 'QR code para o aplicativo autenticador' });
  wrap.innerHTML = '<svg viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#0d1b2a"/></svg>';
  return wrap;
}
export const segredoFormatado = s => String(s).replace(/(.{4})/g, '$1 ').trim();

export async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; }
  catch (e) {
    const ta = h('textarea', null, texto); document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (x) { }
    ta.remove(); return ok;
  }
}
export const wa = (num, msg) => 'https://wa.me/' + String(num || '').replace(/\D/g, '') + (msg ? '?text=' + encodeURIComponent(msg) : '');

export async function ocupado(btn, fn) {
  if (btn.disabled) return;
  const txt = btn.innerHTML; btn.disabled = true; btn.textContent = 'Aguarde...';
  try { await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = txt; } }
}

/* passos para ativar as duas etapas: QR, código manual e campo do código */
export function blocoCadastro(segredo, uri) {
  const celular = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  return h('div', { class: 'en-2fa' },
    h('ol', { class: 'en-passos' },
      h('li', null, 'Instale um aplicativo autenticador no celular, se ainda não tiver: ', h('b', null, 'Google Authenticator'), ', Microsoft Authenticator ou o do seu gerenciador de senhas.'),
      h('li', null, celular ? 'Toque em "Abrir no autenticador" ou, no app, escolha adicionar e digite o código abaixo.' : 'No aplicativo, toque em adicionar (+) e aponte a câmera para o QR code.'),
      h('li', null, 'Digite o código de 6 números que aparecer.')),
    qrSvg(uri),
    celular ? h('a', { class: 'btn', href: uri }, ic('chave'), 'Abrir no autenticador') : null,
    h('details', { class: 'en-manual' }, h('summary', null, 'Não consigo ler o QR code'),
      h('p', null, 'No aplicativo, escolha digitar a chave e use:'), h('code', { class: 'en-segredo' }, segredoFormatado(segredo)),
      h('p', { class: 'en-dica' }, 'Tipo: baseado em tempo, 6 dígitos.')));
}

/* códigos de recuperação: mostra uma única vez */
export function blocoRecuperacao(codigos, aoContinuar) {
  const lista = codigos.join('\n');
  const ok = h('button', { type: 'button', class: 'btn primario', disabled: true, onclick: aoContinuar }, 'Continuar');
  const chk = h('input', { type: 'checkbox', onchange: e => { ok.disabled = !e.target.checked; } });
  const msg = h('span', { class: 'en-ok', hidden: true }, 'Copiado');
  return h('div', { class: 'en-rec' },
    h('p', null, 'Guarde estes códigos num lugar seguro (gerenciador de senhas ou papel). Cada um serve uma vez para entrar se você perder o celular. Eles não aparecem de novo.'),
    h('div', { class: 'en-codigos' }, codigos.map(c => h('code', null, c))),
    h('div', { class: 'en-linha' },
      h('button', { type: 'button', class: 'btn', onclick: async () => { if (await copiar(lista)) { msg.hidden = false; setTimeout(() => { msg.hidden = true; }, 2000); } } }, ic('copiar'), 'Copiar'),
      h('a', { class: 'btn', download: 'codigos-recuperacao-pericias.txt', href: 'data:text/plain;charset=utf-8,' + encodeURIComponent('Códigos de recuperação do app Perícias\n(cada um vale uma vez)\n\n' + lista + '\n') }, ic('baixar'), 'Baixar'), msg),
    h('label', { class: 'en-check' }, chk, 'Guardei os códigos'),
    ok);
}
