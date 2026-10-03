'use strict';

(() => {
  const { h, icons, store } = Phone;

  // גוגל לא מאפשר להציג את האתר שלו בתוך אתר אחר, לכן התוצאות נפתחות בלשונית חדשה
  const openUrl = url => window.open(url, '_blank', 'noopener');

  Phone.registerApp({
    id: 'google',
    name: 'Google',
    iconBg: '#fff',
    icon: '<span class="gg-icon">G</span>',
    bg: '#fff',
    top: '#fff',
    statusDark: true,

    open(root) {
      const input = h('input', { class: 'gg-input', placeholder: 'חיפוש ב-Google', autocomplete: 'off' });
      const historyEl = h('div', { class: 'gg-history' });

      function search(q, lucky) {
        q = q.trim();
        if (!q) return;
        store.set('google:history', [q, ...store.get('google:history', []).filter(x => x !== q)].slice(0, 8));
        renderHistory();
        openUrl('https://www.google.com/search?q=' + encodeURIComponent(q) + (lucky ? '&btnI=1' : ''));
      }

      function renderHistory() {
        const items = store.get('google:history', []);
        historyEl.replaceChildren(...items.map(q =>
          h('div', { class: 'gg-hist-row' },
            h('button', { class: 'gg-hist-q', onclick: () => search(q) },
              h('span', { html: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.5 2-1 1.7L11 13V6h2z"/></svg>' }),
              h('span', { dir: 'auto' }, q)),
            h('button', {
              class: 'gg-hist-x', html: icons.close, 'aria-label': 'הסרה',
              onclick: () => { store.set('google:history', items.filter(x => x !== q)); renderHistory(); },
            }),
          )));
      }

      const shortcut = (label, bg, letter, onclick) =>
        h('button', { class: 'gg-short', onclick },
          h('span', { class: 'gg-short-icon', style: { background: bg } }, letter), label);

      input.addEventListener('keydown', e => { if (e.key === 'Enter') search(input.value); });
      renderHistory();

      root.replaceChildren(h('div', { class: 'view' }, h('div', { class: 'scroll gg-page' },
        h('div', { class: 'gg-logo', dir: 'ltr' },
          ...[['G', '#4285f4'], ['o', '#ea4335'], ['o', '#fbbc05'], ['g', '#4285f4'], ['l', '#34a853'], ['e', '#ea4335']]
            .map(([ch, color]) => h('span', { style: { color } }, ch))),
        h('div', { class: 'gg-box' }, h('span', { class: 'gg-box-icon', html: icons.search }), input),
        h('div', { class: 'gg-buttons' },
          h('button', { onclick: () => search(input.value) }, 'חיפוש ב-Google'),
          h('button', { onclick: () => search(input.value, true) }, 'יותר מזל'),
        ),
        historyEl,
        h('div', { class: 'gg-shorts' },
          shortcut('YouTube', '#f00', '▶', () => Phone.openApp('youtube')),
          shortcut('ויקיפדיה', '#555', 'W', () => openUrl('https://he.wikipedia.org')),
          shortcut('מפות', '#34a853', '📍', () => openUrl('https://maps.google.com')),
          shortcut('תרגום', '#4285f4', 'א', () => openUrl('https://translate.google.com')),
        ),
        h('p', { class: 'gg-note' }, 'התוצאות נפתחות בלשונית חדשה'),
      )));
    },
  });
})();
