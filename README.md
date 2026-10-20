<p align="center">
  <img src="docs/logo.png" alt="CrumbNod" width="250">
</p>

<h1 align="center">CrumbNod</h1>

<p align="center">
  Dependency-free cookie consent for the browser.<br>
  MIT licensed. No build step. No runtime dependencies.
</p>

<p align="center">
  <a href="https://peternickol.github.io/crumbnod/">Live demo</a>
  &nbsp;·&nbsp;
  <a href="#install">Install</a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick start</a>
  &nbsp;·&nbsp;
  <a href="#choice">Choice</a>
  &nbsp;·&nbsp;
  <a href="#options">Options</a>
  &nbsp;·&nbsp;
  <a href="#license">License</a>
</p>

CrumbNod asks once about the optional cookies on a site. That answer covers every later use, including cookies the page does not know about yet. A feature calls `whenAllowed` and runs only after approval. Required cookies are not part of the question.

Pass an options object to `crumbnod()`, then call `start()` so a footer control can reopen the banner. Types ship in `crumbnod.d.ts`.

## Install

The package entry is `src/index.js`. Install from a checkout of this repository:

```bash
npm install /path/to/crumbnod
```

```js
import { crumbnod } from 'crumbnod';
```

A page can import the module directly. Serve the page over HTTP. Module imports do not run from a `file://` address.

```html
<button type="button" data-crumbnod-open>Cookie choices</button>
<script type="module">
  import { crumbnod, start, whenAllowed } from './src/index.js';

  crumbnod({ privacy: '/privacy' });
  whenAllowed(() => rememberPreferences());
  whenAllowed(() => keepDrafts());

  start();
</script>
```

The demo is in this repository at [`demo/index.html`](demo/index.html).

```bash
npm run demo
```

Then open `http://127.0.0.1:4175/demo/`.

## Quick start

`crumbnod()` reads the saved choice and returns the controller. The [demo](demo/index.html) is the same banner. A later call can change the copy, and it does not replay a choice that was already followed.

```js
import { crumbnod, start, whenAllowed, whenDenied } from 'crumbnod';

crumbnod({ privacy: '/privacy' });

whenAllowed(() => rememberPreferences());
whenAllowed(() => keepDrafts());
whenDenied(() => forgetDrafts());

start();
```

`whenAllowed` runs immediately when the saved choice is already `allow`. Otherwise it waits for Approve. `whenDenied` runs only when Reject changes the choice. A feature added next month uses the same two calls. It does not need a new banner or a new category. A callback that throws does not stop the others. Approve after a later Reject runs them again, so each callback should be safe to run more than once.

`onAllow` and `onDeny` on the options object are the same moments for the page that creates the banner. Use those or `whenAllowed`, not both for the same work. `allowed()` is true only when the saved choice is `allow`.

`new CrumbNod(options)` is the same controller. In the browser that constructor is also `window.CrumbNod`.

```js
import { CrumbNod } from 'crumbnod';

const nod = new CrumbNod({ privacy: '/privacy' });
nod.destroy();
```

## What runs

CrumbNod does not choose the cookies. Code inside `whenAllowed` waits for Approve. Code left outside it runs as usual. That includes a cart cookie, a theme setting, and the consent cookie itself.

A script tag already in the page loads before the banner can stop it. Optional JavaScript has to be added from the callback:

```js
whenAllowed(() => {
  const tag = document.createElement('script');
  tag.src = 'https://example.com/optional.js';
  document.head.append(tag);
});
```

## Choice

The cookie name is `cookieconsent_status`. An older page that already stored `allow`, `deny`, or `dismiss` is not asked again.

| Saved value | What happens |
| --- | --- |
| `allow` | `onAllow()` runs. A `whenAllowed` callback runs when it is registered. The banner stays closed. |
| `deny` | Optional cookies stay off. The banner stays closed. |
| `dismiss` | Optional cookies stay off. The banner stays closed. This older close value is not approval. |
| empty | The banner opens. Optional cookies stay off until Approve. |

Approve writes `allow` and runs the approval callbacks when the choice changed. Reject writes `deny` and runs the refusal callbacks when the choice changed. Closing the tab, pressing Escape, and clicking the page do not store a choice.

The stylesheet is added with the banner and removed when the banner closes. A page that already has a choice does not get that stylesheet.

The same value is mirrored to `localStorage` when the choice is kept for more than the browser session. The cookie wins when both are set. A session choice (`days: 0`) is only a cookie. Clearing the cookie alone does not ask again, because `localStorage` still has the choice. `[data-crumbnod-open]` opens the banner so the visitor can change it.

`open()` shows the banner again. `start()` binds every `[data-crumbnod-open]` button to that.

`choice()` reads the saved value without opening the banner. It returns `allow`, `deny`, `dismiss`, or `''`.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `message` | `This site uses cookies. Approve them or reject them.` | Banner copy. An en space follows the first period |
| `title` | `Cookies` | Name of the dialog |
| `allow` | `Approve` | Approval button |
| `deny` | `Reject` | Refusal button |
| `privacy` | | Address of the privacy link. No link when this is empty |
| `privacyLabel` | `Visit our privacy page to learn more.` | Sentence after the banner copy. Only the word privacy is the link |
| `name` | `cookieconsent_status` | Cookie and `localStorage` key |
| `days` | `365` | How long the choice is kept. `0` keeps it for the browser session |
| `onAllow` | | Called for a saved approval, and when Approve changes the choice |
| `onDeny` | | Called when Reject changes the choice. A saved denial does not call it again |

`whenAllowed(callback)` and `whenDenied(callback)` subscribe other cookie uses to those same moments. Each returns a function that removes that subscription.

Colors and type come from the page. Set these on `.crumbnod` or on a parent: `--crumbnod-bg`, `--crumbnod-fg`, `--crumbnod-line`, `--crumbnod-deny-bg`, `--crumbnod-deny-fg`, `--crumbnod-allow-bg`, `--crumbnod-allow-fg`, `--crumbnod-focus`, and `--crumbnod-z`. `html[data-theme="light"]` switches the banner to the light palette. The injected stylesheet is `#crumbnod-style`.

The buttons are the same size. Approve is the default: focus moves there when the banner opens, and Enter approves. Enter on Reject still rejects. Focus returns to the control that opened the banner. The dialog does not trap the rest of the page.

## Remove

`destroy()` removes the banner and drops the injected stylesheet when the banner is gone.

| Name | What it does |
| --- | --- |
| `destroy()` | Remove the banner and its stylesheet |
| `open()` | Show the banner again |
| `choice` | `allow`, `deny`, `dismiss`, or `''` |
| `ready` | False before the controller can use a document |
| `options` | The settings the banner is using |
| `el` | The dialog element, or null when it is closed |

## Develop

```bash
npm test
```

Tests cover the saved values, the cookie, and the option merge. `test/browser.test.js` loads the demo in a browser and approves, rejects, and reopens the banner.

## License

CrumbNod is [MIT licensed](LICENSE). Copyright (c) 2026 Peter Nickol.

You can use it in a commercial product, modify it, and distribute it. The MIT grant includes sale. Copies and substantial portions keep the copyright notice and the permission notice from [LICENSE](LICENSE).

This repository is an original implementation. Those MIT terms are the license that applies to it.
