export const STYLE_ID = 'crumbnod-style';

export const CSS = `
.crumbnod {
  --crumbnod-bg: #202225;
  --crumbnod-fg: #f3f1ed;
  --crumbnod-line: #656971;
  --crumbnod-deny-bg: #2c3036;
  --crumbnod-deny-fg: #f3f1ed;
  --crumbnod-allow-bg: #ff5148;
  --crumbnod-allow-fg: #101113;
  --crumbnod-focus: #ff8a73;
  position: fixed;
  z-index: var(--crumbnod-z, 50);
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  width: min(24rem, calc(100vw - max(16px, env(safe-area-inset-left, 0px)) - max(16px, env(safe-area-inset-right, 0px))));
  margin: 0;
  padding: 16px 16px 14px;
  box-sizing: border-box;
  border: 1px solid var(--crumbnod-line);
  border-radius: 18px;
  background: var(--crumbnod-bg);
  color: var(--crumbnod-fg);
  font-family: inherit;
  font-size: 16px;
  line-height: 1.45;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
}
html[data-theme="light"] .crumbnod {
  --crumbnod-bg: #ffffff;
  --crumbnod-fg: #172033;
  --crumbnod-line: #d5dbe3;
  --crumbnod-deny-bg: #f3f5f8;
  --crumbnod-deny-fg: #172033;
  --crumbnod-allow-bg: #ff5148;
  --crumbnod-allow-fg: #101113;
  --crumbnod-focus: #b4231c;
}
.crumbnod [hidden] { display: none !important; }
.crumbnod-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.crumbnod-message { margin: 8px 0 0; }
.crumbnod-privacy { color: inherit; }
.crumbnod-privacy:hover { text-decoration-thickness: 2px; }
.crumbnod-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.crumbnod-deny,
.crumbnod-allow {
  flex: 1 1 8rem;
  min-height: 44px;
  margin: 0;
  padding: 10px 14px;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
}
.crumbnod-deny {
  background: var(--crumbnod-deny-bg);
  color: var(--crumbnod-deny-fg);
  border: 1px solid var(--crumbnod-line);
}
.crumbnod-allow {
  background: var(--crumbnod-allow-bg);
  color: var(--crumbnod-allow-fg);
  border: 1px solid transparent;
}
.crumbnod :focus-visible {
  outline: 3px solid var(--crumbnod-focus);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: no-preference) {
  .crumbnod { transition: opacity 160ms ease; }
}
`;
