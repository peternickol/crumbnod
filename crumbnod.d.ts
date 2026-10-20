export const version: string;
export const STYLE_ID: string;
export const COOKIE_NAME: string;

export interface CrumbNodOptions {
  title?: string;
  message?: string;
  allow?: string;
  deny?: string;
  privacy?: string;
  privacyLabel?: string;
  /** Cookie and localStorage key. Defaults to the existing `cookieconsent_status` name. */
  name?: string;
  /** Days to remember the choice. `0` keeps it for the browser session. */
  days?: number;
  /** Called when the saved choice is allow, and when Approve changes the choice to allow. */
  onAllow?: () => void;
  /** Called when Reject changes the choice to deny. A saved denial does not call it again. */
  onDeny?: () => void;
}

export interface CrumbNodSettings {
  title: string;
  message: string;
  allow: string;
  deny: string;
  privacy: string;
  privacyLabel: string;
  name: string;
  days: number;
  onAllow: (() => void) | null;
  onDeny: (() => void) | null;
}

/** `dismiss` is an older close value. It is remembered, and it is not approval. */
export type CrumbNodStatus = 'allow' | 'deny' | 'dismiss' | '';

export class CrumbNod {
  constructor(options?: CrumbNodOptions);
  readonly ready: boolean;
  readonly options: CrumbNodSettings;
  readonly el: HTMLElement | null;
  readonly choice: CrumbNodStatus;
  /** Honor a saved choice. An empty choice opens the banner and calls nothing. */
  apply(): void;
  open(): this;
  destroy(): void;
}

/** Read the saved choice. Allow runs `onAllow`. Deny and dismiss do nothing. */
export function crumbnod(options?: CrumbNodOptions): CrumbNod;

/** Bind every `[data-crumbnod-open]` control so it can reopen the banner. */
export function start(root?: ParentNode): void;

/** Open the banner again so the choice can change. */
export function open(): CrumbNod;

/** Read the saved choice without opening the banner. */
export function choice(name?: string): CrumbNodStatus;

/** True when the saved choice allows optional cookies. */
export function allowed(): boolean;

/**
 * Run optional-cookie code after approval.
 * A saved approval runs it now. A later approval runs it then.
 * Returns a function that unsubscribes.
 */
export function whenAllowed(callback: () => void): () => void;

/**
 * Run when Reject changes the choice to deny.
 * A saved denial does not call it again.
 * Returns a function that unsubscribes.
 */
export function whenDenied(callback: () => void): () => void;

export default CrumbNod;
