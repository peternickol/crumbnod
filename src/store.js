import { normalizeStatus } from './status.js';

export const COOKIE_NAME = 'cookieconsent_status';

export function cookieName(value) {
  const name = String(value ?? '').trim();
  return /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name) ? name : '';
}

export function readCookie(header, name) {
  const source = String(header || '');
  for (const part of source.split(';')) {
    const item = part.trim();
    const eq = item.indexOf('=');
    if (eq <= 0) continue;
    if (item.slice(0, eq).trim() !== name) continue;
    const raw = item.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return '';
}

export function cookieAssignment({ name, value, days = 365, path = '/', secure = false }) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `path=${path}`, 'SameSite=Lax'];
  if (days > 0) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    parts.splice(1, 0, `expires=${expires}`);
  }
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function memoryStore() {
  return {
    getItem() {
      return '';
    },
    setItem() {},
    removeItem() {},
  };
}

export function browserStore() {
  try {
    const store = globalThis.localStorage;
    if (!store) return memoryStore();
    return store;
  } catch {
    return memoryStore();
  }
}

/** Cookie wins. localStorage covers a browser that blocked the cookie. */
export function readStored(doc, storage, name) {
  const fromCookie = normalizeStatus(readCookie(doc?.cookie, name));
  if (fromCookie) return fromCookie;
  try {
    return normalizeStatus(storage?.getItem(name) || '');
  } catch {
    return '';
  }
}

/** Persist allow or deny. A session choice is not copied into localStorage. */
export function writeStored(doc, storage, { name, value, days = 365, secure = false }) {
  const status = normalizeStatus(value);
  if (status !== 'allow' && status !== 'deny') return '';
  doc.cookie = cookieAssignment({ name, value: status, days, secure });
  try {
    if (days > 0) storage?.setItem(name, status);
    else storage?.removeItem(name);
  } catch {
    // Storage can be blocked. The cookie assignment still happened.
  }
  return status;
}
