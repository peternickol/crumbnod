import assert from 'node:assert/strict';
import test from 'node:test';

import { settings } from '../src/options.js';
import { linkWord } from '../src/view.js';
import { emitAllowed, emitDenied } from '../src/listen.js';
import { isAllowed, normalizeStatus } from '../src/status.js';
import {
  cookieAssignment,
  cookieName,
  readCookie,
  readStored,
  writeStored,
} from '../src/store.js';
import CrumbNodDefault, {
  COOKIE_NAME,
  CrumbNod,
  allowed,
  choice,
  crumbnod,
  version,
  STYLE_ID,
  whenAllowed,
  whenDenied,
} from '../src/index.js';

function memory() {
  const data = new Map();
  return {
    data,
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

test('version and the public entry are stable', () => {
  assert.equal(version, '0.1.0');
  assert.equal(STYLE_ID, 'crumbnod-style');
  assert.equal(COOKIE_NAME, 'cookieconsent_status');
  assert.equal(typeof crumbnod, 'function');
  assert.equal(typeof choice, 'function');
  assert.equal(typeof whenAllowed, 'function');
  assert.equal(choice(), '');
  assert.equal(allowed(), false);
  assert.equal(CrumbNodDefault, CrumbNod);
  assert.equal(CrumbNod.name, 'CrumbNod');
});

test('crumbnod refuses to run without a browser document', () => {
  assert.throws(() => crumbnod({ privacy: '/privacy' }), /browser/);
  const offline = new CrumbNod({ privacy: '/privacy' });
  assert.equal(offline.ready, false);
  assert.equal(offline.choice, '');
});

test('only allow approves optional cookies', () => {
  assert.equal(normalizeStatus(' Allow '), 'allow');
  assert.equal(normalizeStatus('dismiss'), 'dismiss');
  assert.equal(normalizeStatus('maybe'), '');
  assert.equal(isAllowed('allow'), true);
  assert.equal(isAllowed('deny'), false);
  assert.equal(isAllowed('dismiss'), false);
  assert.equal(isAllowed(''), false);
});

test('the cookie wins and dismiss stays a decision', () => {
  const storage = memory();
  storage.setItem(COOKIE_NAME, 'allow');
  const doc = { cookie: 'theme=dark; cookieconsent_status=dismiss; other=1' };
  assert.equal(readStored(doc, storage, COOKIE_NAME), 'dismiss');
  assert.equal(isAllowed(readStored(doc, storage, COOKIE_NAME)), false);

  doc.cookie = '';
  assert.equal(readStored(doc, storage, COOKIE_NAME), 'allow');
  doc.cookie = 'cookieconsent_status=maybe';
  storage.removeItem(COOKIE_NAME);
  assert.equal(readStored(doc, storage, COOKIE_NAME), '');
});

test('allow and deny round-trip through the cookie', () => {
  const doc = { cookie: '' };
  const storage = memory();
  assert.equal(writeStored(doc, storage, { name: COOKIE_NAME, value: 'dismiss', days: 365 }), '');
  assert.equal(doc.cookie, '');

  writeStored(doc, storage, { name: COOKIE_NAME, value: 'deny', days: 365, secure: true });
  assert.equal(readCookie(doc.cookie, COOKIE_NAME), 'deny');
  assert.equal(storage.getItem(COOKIE_NAME), 'deny');
  assert.match(doc.cookie, /SameSite=Lax/);
  assert.match(doc.cookie, /Secure/);
  assert.match(doc.cookie, /expires=/);

  const session = cookieAssignment({ name: COOKIE_NAME, value: 'allow', days: 0, secure: false });
  assert.equal(session.includes('expires='), false);
  assert.equal(session.includes('Secure'), false);
  writeStored(doc, storage, { name: COOKIE_NAME, value: 'allow', days: 0 });
  assert.equal(readCookie(doc.cookie, COOKIE_NAME), 'allow');
  assert.equal(storage.getItem(COOKIE_NAME), null);
});

test('options keep an earlier callback and the known cookie name', () => {
  function onAllow() {}
  const first = settings({ onAllow, privacy: '/privacy', days: 0, name: 'bad name' });
  assert.equal(first.onAllow, onAllow);
  assert.equal(first.onDeny, null);
  assert.equal(first.privacy, '/privacy');
  assert.equal(first.privacyLabel, 'Visit our privacy page to learn more.');
  assert.equal(first.days, 0);
  assert.equal(first.name, COOKIE_NAME);
  assert.equal(first.allow, 'Approve');
  assert.equal(first.deny, 'Reject');
  assert.equal(first.message, 'This site uses cookies.\u2002Approve them or reject them.');
  assert.equal(/analytics/i.test(first.message), false);

  const next = settings({ message: 'Remember this browser.' }, first);
  assert.equal(next.onAllow, onAllow);
  assert.equal(next.message, 'Remember this browser.');
  assert.equal(next.privacy, '/privacy');
  assert.equal(settings({ onAllow: null }, first).onAllow, null);
  assert.equal(cookieName('visit_choice'), 'visit_choice');
});

test('later cookie uses wait for the same approval', () => {
  const started = [];
  const stopped = [];
  const stopPreferences = whenAllowed(() => started.push('preferences'));
  const stopDrafts = whenAllowed(() => started.push('drafts'));
  const stopDenied = whenDenied(() => stopped.push('off'));
  assert.deepEqual(started, []);
  emitAllowed();
  assert.deepEqual(started, ['preferences', 'drafts']);
  stopPreferences();
  emitAllowed();
  assert.deepEqual(started, ['preferences', 'drafts', 'drafts']);
  emitDenied();
  assert.deepEqual(stopped, ['off']);
  stopDrafts();
  stopDenied();
  assert.throws(() => whenAllowed(null), /function/);
});

test('one callback throwing does not stop the next', () => {
  const started = [];
  const errors = [];
  const original = console.error;
  console.error = (error) => errors.push(error);
  const stopBroken = whenAllowed(() => {
    throw new Error('preferences failed');
  });
  const stopDrafts = whenAllowed(() => started.push('drafts'));
  const stopDenied = whenDenied(() => {
    throw new Error('deny failed');
  });
  const stopNotes = whenDenied(() => started.push('notes'));
  try {
    emitAllowed();
    emitDenied();
    assert.deepEqual(started, ['drafts', 'notes']);
    assert.equal(errors.length, 2);
    assert.equal(linkWord('Visit our privacy page to learn more.').word, 'privacy');
    assert.equal(linkWord('privacypolicy').word, 'privacypolicy');
  } finally {
    console.error = original;
    stopBroken();
    stopDrafts();
    stopDenied();
    stopNotes();
  }
});
