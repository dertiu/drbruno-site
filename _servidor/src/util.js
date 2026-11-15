/* Utilitários do servidor */

export const DAY = 86400000;
export const now = () => Date.now();

const te = new TextEncoder();

export function b64url(bytes) {
  let s = '';
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
export const randomToken = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

export async function sha256hex(str) {
  const d = await crypto.subtle.digest('SHA-256', te.encode(str));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  try { if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(a, b); } catch (e) { }
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

/* Respostas JSON nunca ficam em cache */
export function json(data, status = 200, extra) {
  const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  if (extra) for (const [k, v] of Object.entries(extra)) h.append(k, v);
  return new Response(JSON.stringify(data), { status, headers: h });
}
export const fail = (msg, status = 400, extra) => json({ ok: false, erro: msg }, status, extra);

export class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

export async function readJson(req) {
  const ct = req.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) throw new HttpError(415, 'Formato inválido.');
  const txt = await req.text();
  if (txt.length > 40000) throw new HttpError(413, 'Dados grandes demais.');
  try { return JSON.parse(txt || '{}') || {}; } catch (e) { throw new HttpError(400, 'Dados inválidos.'); }
}

export const clientIp = req => req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'local';
export function clientPlace(req) {
  const cf = req.cf || {};
  return [cf.city, cf.region, cf.country].filter(Boolean).join(', ').slice(0, 80);
}
export const clientUa = req => (req.headers.get('User-Agent') || '').slice(0, 220);

/* Validações e normalizações */
export const normEmail = s => String(s || '').trim().toLowerCase();
export const validEmail = s => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s) && s.length <= 200;
export const onlyDigits = s => String(s || '').replace(/\D/g, '');
export const clean = (s, max = 120) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

/* Data AAAA-MM-DD vale até o fim do dia no horário de Brasília */
export function endOfDayBR(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''))) return NaN;
  return Date.parse(ymd + 'T23:59:59.999-03:00');
}

/* Códigos de acesso: sem letras e números que se confundem (0/O, 1/I/L) */
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newCode() {
  const r = crypto.getRandomValues(new Uint8Array(8));
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHA[r[i] % ALPHA.length];
  return s;
}
export const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const showCode = c => c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c;
