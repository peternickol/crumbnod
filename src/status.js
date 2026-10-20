const DECIDED = new Set(['allow', 'deny', 'dismiss']);

/** Return allow, deny, dismiss, or an empty string. */
export function normalizeStatus(value) {
  const status = String(value ?? '').trim().toLowerCase();
  return DECIDED.has(status) ? status : '';
}

/** True only for an explicit approval. Dismiss is not approval. */
export function isAllowed(status) {
  return normalizeStatus(status) === 'allow';
}
