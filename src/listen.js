const allowers = new Set();
const deniers = new Set();

/** Remember a callback for a later approval. Returns an unsubscribe function. */
export function listenAllowed(callback) {
  allowers.add(callback);
  return () => allowers.delete(callback);
}

/** Remember a callback for a later refusal. Returns an unsubscribe function. */
export function listenDenied(callback) {
  deniers.add(callback);
  return () => deniers.delete(callback);
}

/** Run a subscriber. One thrown callback does not stop the others. */
export function callSafely(callback) {
  if (typeof callback !== 'function') return;
  try {
    callback();
  } catch (error) {
    globalThis.console?.error?.(error);
  }
}

function emit(subscribers) {
  for (const callback of [...subscribers]) callSafely(callback);
}

export function emitAllowed() {
  emit(allowers);
}

export function emitDenied() {
  emit(deniers);
}
