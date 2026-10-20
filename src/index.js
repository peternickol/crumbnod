import { listenAllowed, listenDenied } from './listen.js';
import { CrumbNod, STYLE_ID } from './view.js';
import { browserStore, COOKIE_NAME, cookieName, readStored } from './store.js';

export { CrumbNod, STYLE_ID, COOKIE_NAME };
export const version = '0.1.0';

let current = null;
const bound = new WeakSet();

function fail(message) {
  throw new Error(message);
}

function documentOrFail() {
  if (typeof document === 'undefined') fail('CrumbNod runs in a browser document');
  return document;
}

/** Read the saved choice. Dismiss is kept, and it is not approval. */
export function choice(name = COOKIE_NAME) {
  if (typeof document === 'undefined') return '';
  return readStored(document, browserStore(), cookieName(name) || COOKIE_NAME);
}

/** True when the saved choice allows optional cookies. */
export function allowed() {
  return choice() === 'allow';
}

function callbackOrFail(callback) {
  if (typeof callback !== 'function') fail('CrumbNod needs a function');
  return callback;
}

/**
 * Run optional-cookie code after approval.
 * A saved approval runs it now. A later approval runs it then. Returns unsubscribe.
 */
export function whenAllowed(callback) {
  const run = callbackOrFail(callback);
  const stop = listenAllowed(run);
  if (allowed()) run();
  return stop;
}

/**
 * Run when Reject changes the choice to deny.
 * A saved denial does not call it again. Returns unsubscribe.
 */
export function whenDenied(callback) {
  return listenDenied(callbackOrFail(callback));
}

/**
 * Read the saved choice and follow it.
 * Allow runs `onAllow`. Deny and dismiss do nothing. An empty choice opens the banner.
 */
export function crumbnod(options = {}) {
  documentOrFail();
  if (current?.ready) {
    current.configure(options);
    return current;
  }
  current = new CrumbNod(options);
  const created = current;
  const release = created.destroy.bind(created);
  created.destroy = () => {
    release();
    if (current === created) current = null;
  };
  return current;
}

/** Bind every `[data-crumbnod-open]` control so it can reopen the banner. */
export function start(root = globalThis.document) {
  if (!root?.querySelectorAll) fail('CrumbNod runs in a browser document');
  root.querySelectorAll('[data-crumbnod-open]').forEach((node) => {
    if (bound.has(node)) return;
    bound.add(node);
    node.addEventListener('click', () => {
      const view = current?.ready ? current : crumbnod();
      view.open();
    });
  });
}

/** Open the banner again so the choice can change. */
export function open() {
  const view = current?.ready ? current : crumbnod();
  return view.open();
}

export default CrumbNod;

if (typeof window !== 'undefined') window.CrumbNod = CrumbNod;
