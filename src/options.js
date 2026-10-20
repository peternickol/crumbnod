import { COOKIE_NAME, cookieName } from './store.js';

export const DEFAULT_MESSAGE = 'This site uses cookies.\u2002Approve them or reject them.';

function text(value, fallback) {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  return trimmed || fallback;
}

/** Merge a partial options object over the previous settings. */
export function settings(options = {}, base = {}) {
  const days = Number(options.days);
  const keepDays = Number.isFinite(days) && days >= 0;
  return {
    title: text(options.title, text(base.title, 'Cookies')),
    message: text(options.message, text(base.message, DEFAULT_MESSAGE)),
    allow: text(options.allow, text(base.allow, 'Approve')),
    deny: text(options.deny, text(base.deny, 'Reject')),
    privacy: options.privacy == null ? text(base.privacy, '') : String(options.privacy).trim(),
    privacyLabel: text(options.privacyLabel, text(base.privacyLabel, 'Visit our privacy page to learn more.')),
    name: cookieName(options.name) || cookieName(base.name) || COOKIE_NAME,
    days: keepDays ? days : (Number.isFinite(base.days) ? base.days : 365),
    onAllow: callback(options, base, 'onAllow'),
    onDeny: callback(options, base, 'onDeny'),
  };
}

function callback(options, base, key) {
  if (typeof options[key] === 'function') return options[key];
  if (options[key] === undefined && typeof base[key] === 'function') return base[key];
  if (options[key] === undefined && base[key] === undefined) return null;
  if (options[key] === undefined) return base[key] || null;
  return null;
}
