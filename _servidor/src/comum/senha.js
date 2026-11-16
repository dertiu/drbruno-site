/* Senhas: PBKDF2-SHA256 com sal aleatório e "pimenta" secreta (usado pelas calculadoras e pelo /pericias, cada um com a sua configuração)
   cfg.iter: força do cálculo. No plano gratuito do Cloudflare (10 ms de CPU por acesso) o padrão é 20000; no pago, 100000 (máximo do Workers).
   cfg.pepper: segredo extra guardado só no Cloudflare; sem ele, um banco vazado não serve para descobrir senhas.
   Senhas guardadas com proteção mais fraca que a atual são refeitas sozinhas no próximo login (rehash). */
import { b64url, unb64url, safeEqual } from '../util.js';

const MAX_ITER = 100000;
const te = new TextEncoder();
const iterOf = cfg => Math.max(10000, Math.min(MAX_ITER, Number(cfg && cfg.iter) || 20000));
async function material(pw, cfg, peppered) {
  if (!peppered) return te.encode(pw);
  const k = await crypto.subtle.importKey('raw', te.encode(cfg.pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, te.encode(pw)));
}
async function pbkdf2(raw, salt, iter) {
  const key = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
export async function hashSenha(pw, cfg) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iter = iterOf(cfg), pep = !!(cfg && cfg.pepper);
  return `${pep ? 'pbkdf2p' : 'pbkdf2'}$${iter}$${b64url(salt)}$${b64url(await pbkdf2(await material(String(pw), cfg, pep), salt, iter))}`;
}
/* devolve { ok, rehash } */
export async function conferirSenha(pw, stored, cfg) {
  const parts = String(stored || '').split('$');
  const valid = parts.length === 4 && (parts[0] === 'pbkdf2' || parts[0] === 'pbkdf2p');
  const pep = valid && parts[0] === 'pbkdf2p';
  if (pep && !(cfg && cfg.pepper)) return { ok: false, rehash: false };
  const iter = valid ? Math.min(Number(parts[1]) || MAX_ITER, MAX_ITER) : iterOf(cfg);
  const salt = valid ? unb64url(parts[2]) : new Uint8Array(16);
  const got = await pbkdf2(await material(String(pw || ''), cfg, pep), salt, iter); // roda mesmo sem conta, para não revelar quem existe
  if (!valid) return { ok: false, rehash: false };
  const ok = safeEqual(got, unb64url(parts[3]));
  return { ok, rehash: ok && (iter < iterOf(cfg) || (!pep && !!(cfg && cfg.pepper))) };
}
export function problemaSenha(pw) {
  pw = String(pw || '');
  if (pw.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (pw.length > 200) return 'Senha longa demais.';
  if (/^(\d)\1+$/.test(pw) || ['12345678', '123456789', '1234567890', 'senha123', 'password', 'abcdefgh'].includes(pw.toLowerCase())) return 'Escolha uma senha menos óbvia.';
  return '';
}

