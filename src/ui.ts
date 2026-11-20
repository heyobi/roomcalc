// Small DOM helpers shared by every view.
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { t } from './i18n';

export const native = Capacitor.isNativePlatform();
export { isDark as dark } from './i18n';

export type Child = Node | string | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

// Line icons (24 × 24, stroke = currentColor).
const ICONS: Record<string, string> = {
  plus: 'M12 5v14M5 12h14',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  ruler: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  chevron: 'm9 6 6 6-6 6',
  back: 'm15 6-6 6 6 6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  share: 'M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  close: 'M6 6l12 12M18 6 6 18',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  door: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M14 12h.01',
  window: 'M4 4h16v16H4zM12 4v16M4 12h16',
  floor: 'M3 17 9 7h12l-6 10zM7 13.7h12M12 7l-4 10M16 7l-4 10',
  tile: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  paint: 'M5 3h12v6H5zM17 6h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-7v3M10 14h4v7h-4z',
  wallpaper: 'M4 3h10v18H4zM14 6h4a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-4M7 7l4 4M7 12l4 4',
  baseboard: 'M3 4v16h18M3 16h18M7 16v4M12 16v4M17 16v4',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  check: 'm5 12 5 5 9-10',
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
};
export const icon = (name: string) => {
  const el = h('span', { class: `i i-${name}`, 'aria-hidden': 'true' });
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[name] ?? ''}"/></svg>`;
  return el;
};

export function toast(msg: string, kind: 'ok' | 'err' = 'ok') {
  const t = h('div', { class: `toast ${kind}` }, msg);
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), 2400);
  setTimeout(() => t.remove(), 2800);
}

export function sheet(title: string, actions: { label: string; danger?: boolean; run: () => void }[]) {
  const close = () => back.remove();
  const back = h('div', { class: 'sheet-back', onclick: (e: Event) => e.target === back && close() },
    h('div', { class: 'sheet' },
      h('div', { class: 'sheet-group' },
        h('div', { class: 'sheet-title' }, title),
        actions.map((a) => h('button', { class: `sheet-btn${a.danger ? ' danger' : ''}`, onclick: () => { close(); a.run(); } }, a.label))),
      h('button', { class: 'sheet-btn cancel', onclick: close }, t('Cancel'))));
  document.body.append(back);
}

export function confirmBox(title: string, body: string, ok: string, danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (v: boolean) => { back.remove(); resolve(v); };
    const back = h('div', { class: 'sheet-back center' },
      h('div', { class: 'dialog' },
        h('div', { class: 'dialog-title' }, title),
        h('div', { class: 'dialog-body' }, body),
        h('div', { class: 'dialog-actions' },
          h('button', { onclick: () => done(false) }, t('Cancel')),
          h('button', { class: danger ? 'danger' : 'primary', onclick: () => done(true) }, ok))));
    document.body.append(back);
  });
}

export function promptBox(title: string, label: string, value = '', ok = t('OK'), fallback = ''): Promise<string | null> {
  return new Promise((resolve) => {
    const input = h('input', { class: 'text-input', type: 'text', value, 'aria-label': label, placeholder: label, autocapitalize: 'none', autocorrect: 'off', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'done' }) as HTMLInputElement;
    const hint = h('div', { class: 'field-hint' });
    const done = (v: string | null) => { back.remove(); resolve(v); };
    // An empty name keeps the dialog open with a hint instead of silently closing it.
    const submit = () => {
      const v = input.value.trim() || fallback;
      if (!v) { hint.textContent = t('Type a name first.'); input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); input.focus(); return; }
      done(v);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    input.addEventListener('input', () => { hint.textContent = ''; });
    const back = h('div', { class: 'sheet-back center' },
      h('div', { class: 'dialog' },
        h('div', { class: 'dialog-title' }, title),
        h('div', { class: 'dialog-body' }, input, hint),
        h('div', { class: 'dialog-actions' },
          h('button', { onclick: () => done(null) }, t('Cancel')),
          h('button', { class: 'primary', onclick: submit }, ok))));
    document.body.append(back);
    setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 50);
  });
}

/** Full-screen modal page (paywall, extension details). Returns a close function. */
export function modal(content: HTMLElement, onClose?: () => void): () => void {
  const close = () => { back.classList.add('out'); setTimeout(() => back.remove(), 200); onClose?.(); };
  const back = h('div', { class: 'modal-back' },
    h('div', { class: 'modal' },
      h('button', { class: 'modal-close', 'aria-label': 'Close', onclick: close }, icon('close')),
      content));
  document.body.append(back);
  return close;
}

export async function shareText(title: string, text: string) {
  if (native) { await Share.share({ title, text }).catch(() => {}); return; }
  try { await navigator.clipboard.writeText(text); toast(t('Copied')); } catch { /* ignore */ }
}






export function fmtDate(t: number) {
  const d = new Date(t);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}
