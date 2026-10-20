import { callSafely, emitAllowed, emitDenied } from './listen.js';
import { settings } from './options.js';
import { CSS, STYLE_ID } from './style.js';
import { browserStore, readStored, writeStored } from './store.js';

export { STYLE_ID };

let active = null;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function dropStyle() {
  if (document.querySelector('.crumbnod')) return;
  document.getElementById(STYLE_ID)?.remove();
}

export class CrumbNod {
  constructor(options) {
    if (active?.ready) {
      active.configure(options);
      return active;
    }
    this.el = null;
    this.returnFocus = null;
    this.onReady = null;
    this.configure(options);
    this.ready = typeof document !== 'undefined';
    active = this;
    if (!this.ready) return;
    if (document.body) {
      this.apply();
      return;
    }
    this.onReady = () => {
      this.onReady = null;
      if (this.ready) this.apply();
    };
    document.addEventListener('DOMContentLoaded', this.onReady, { once: true });
  }

  configure(options = {}) {
    this.options = settings(options, this.options || {});
    if (this.el) this.paint();
  }

  get choice() {
    if (typeof document === 'undefined') return '';
    return readStored(document, browserStore(), this.options.name);
  }

  /** Honor a saved choice. An empty choice opens the banner and calls nothing. */
  apply() {
    const status = this.choice;
    if (status === 'allow') {
      callSafely(this.options.onAllow);
      return;
    }
    if (status === 'deny' || status === 'dismiss') return;
    this.open();
  }

  open() {
    if (!this.ready || !document.body) return this;
    const opener = document.activeElement;
    if (!this.el) this.render();
    else this.paint();
    this.returnFocus = opener && opener !== this.el ? opener : this.returnFocus;
    this.allowEl.focus();
    return this;
  }

  choose(status) {
    const previous = this.choice;
    writeStored(document, browserStore(), {
      name: this.options.name,
      value: status,
      days: this.options.days,
      secure: globalThis.location?.protocol === 'https:',
    });
    this.close();
    try {
      if (status === 'allow' && previous !== 'allow') {
        callSafely(this.options.onAllow);
        emitAllowed();
      }
      if (status === 'deny' && previous !== 'deny') {
        callSafely(this.options.onDeny);
        emitDenied();
      }
    } finally {
      const back = this.returnFocus;
      this.returnFocus = null;
      if (!back || !back.isConnected || typeof back.focus !== 'function') return;
      if (back === document.body || back === document.documentElement) return;
      back.focus();
    }
  }

  close() {
    this.el?.remove();
    this.el = null;
    this.titleEl = null;
    this.messageEl = null;
    this.copyEl = null;
    this.gapNode = null;
    this.beforeEl = null;
    this.privacyEl = null;
    this.afterEl = null;
    this.denyEl = null;
    this.allowEl = null;
    if (typeof document !== 'undefined') dropStyle();
  }

  destroy() {
    if (this.onReady) {
      document.removeEventListener('DOMContentLoaded', this.onReady);
      this.onReady = null;
    }
    this.close();
    this.ready = false;
    if (active === this) active = null;
  }

  render() {
    ensureStyle();
    const dialog = document.createElement('div');
    dialog.className = 'crumbnod';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'false');
    dialog.tabIndex = -1;

    const title = document.createElement('p');
    title.id = 'crumbnod-title';
    title.className = 'crumbnod-title';

    const message = document.createElement('p');
    message.id = 'crumbnod-message';
    message.className = 'crumbnod-message';

    const copy = document.createElement('span');
    copy.className = 'crumbnod-copy';

    const gap = document.createTextNode('');
    const before = document.createElement('span');
    before.className = 'crumbnod-privacy-before';
    const privacy = document.createElement('a');
    privacy.className = 'crumbnod-privacy';
    const after = document.createElement('span');
    after.className = 'crumbnod-privacy-after';
    message.append(copy, gap, before, privacy, after);

    const actions = document.createElement('div');
    actions.className = 'crumbnod-actions';

    const deny = document.createElement('button');
    deny.type = 'button';
    deny.className = 'crumbnod-deny';
    deny.addEventListener('click', () => this.choose('deny'));

    const allow = document.createElement('button');
    allow.type = 'button';
    allow.className = 'crumbnod-allow';
    allow.addEventListener('click', () => this.choose('allow'));

    actions.append(deny, allow);
    dialog.append(title, message, actions);
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.repeat) return;
      if (event.target === deny || event.target === privacy) return;
      event.preventDefault();
      this.choose('allow');
    });
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.setAttribute('aria-describedby', message.id);
    document.body.appendChild(dialog);

    this.el = dialog;
    this.titleEl = title;
    this.messageEl = message;
    this.copyEl = copy;
    this.gapNode = gap;
    this.beforeEl = before;
    this.privacyEl = privacy;
    this.afterEl = after;
    this.denyEl = deny;
    this.allowEl = allow;
    this.paint();
  }

  paint() {
    const options = this.options;
    this.titleEl.textContent = options.title;
    this.copyEl.textContent = options.message;
    this.allowEl.textContent = options.allow;
    this.denyEl.textContent = options.deny;
    const linked = linkWord(options.privacy ? options.privacyLabel : '');
    this.gapNode.data = linked ? '\u2002' : '';
    this.beforeEl.textContent = linked?.before || '';
    this.afterEl.textContent = linked?.after || '';
    if (linked && options.privacy) {
      this.privacyEl.hidden = false;
      this.privacyEl.href = options.privacy;
      this.privacyEl.textContent = linked.word;
    } else {
      this.privacyEl.hidden = true;
      this.privacyEl.removeAttribute('href');
      this.privacyEl.textContent = '';
    }
  }
}

/** Link the whole word "privacy" inside the sentence. The rest stays plain text. */
export function linkWord(sentence) {
  const label = String(sentence || '');
  if (!label) return null;
  const match = /(?:^|[^A-Za-z])(privacy)(?![A-Za-z])/i.exec(label);
  if (!match) return { before: '', word: label, after: '' };
  const at = match.index + match[0].length - match[1].length;
  return {
    before: label.slice(0, at),
    word: label.slice(at, at + match[1].length),
    after: label.slice(at + match[1].length),
  };
}
