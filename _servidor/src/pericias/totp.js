/* Verificação em duas etapas (TOTP, o mesmo padrão do Google Authenticator, Microsoft Authenticator, 1Password etc.)
   e códigos de recuperação. */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(bytes) {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
export function unbase32(s) {
  s = String(s || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, val = 0; const out = [];
  for (const c of s) {
    val = (val << 5) | B32.indexOf(c); bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}
export const newSecret = () => base32(crypto.getRandomValues(new Uint8Array(20)));

async function hotp(secretB32, counter) {
  const key = await crypto.subtle.importKey('raw', unbase32(secretB32), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { msg[i] = c & 255; c = Math.floor(c / 256); }
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const o = h[19] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, '0');
}
export async function totpNow(secretB32, t = Date.now()) { return hotp(secretB32, Math.floor(t / 30000)); }

/* Confere o código de 6 dígitos (aceita 30 s antes ou depois) e devolve o contador usado,
   para impedir que o mesmo código seja usado duas vezes. */
export async function checkTotp(secretB32, code, lastCounter) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length !== 6 || !secretB32) return null;
  const c = Math.floor(Date.now() / 30000);
  for (const d of [0, -1, 1]) {
    const k = c + d;
    if (lastCounter != null && k <= lastCounter) continue;
    if (await hotp(secretB32, k) === code) return k;
  }
  return null;
}

export function otpauthUri(login, secret) {
  return 'otpauth://totp/' + encodeURIComponent('Perícias:' + login) + '?secret=' + secret + '&issuer=' + encodeURIComponent('Perícias Dr. Bruno') + '&algorithm=SHA1&digits=6&period=30';
}

/* códigos de recuperação: 10 códigos de 10 letras e números, guardados só como hash */
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newBackupCodes() {
  const out = [];
  for (let i = 0; i < 10; i++) {
    const r = crypto.getRandomValues(new Uint8Array(10));
    let s = '';
    for (let j = 0; j < 10; j++) s += ALPHA[r[j] % ALPHA.length];
    out.push(s.slice(0, 5) + '-' + s.slice(5));
  }
  return out;
}
export const normBackup = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
