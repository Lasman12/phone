'use strict';

/*
 * ליבת הטלפון: מסך בית, פתיחה/סגירה של אפליקציות, שמירת נתונים,
 * אנשי קשר משותפים, מסך שיחה ועזרים לבניית ממשק.
 *
 * הוספת אפליקציה:
 *   Phone.registerApp({
 *     id: 'myapp', name: 'Name', icon: '<svg…>', iconBg: '#123456',
 *     bg: '#fff', top: '#fff', statusDark: true,
 *     open(root, params) { root.append(...); return () => { ניקוי בסגירה }; }
 *   });
 */
const Phone = (() => {
  const apps = [];
  let current = null;
  let screenEl, gridEl, indicatorEl;

  // ---------- שמירה בדפדפן ----------
  // כשמשנים את נתוני ההתחלה (אנשי קשר, הודעות) מעלים את המספר — וכל המבקרים יקבלו את הנתונים החדשים
  const DATA_VERSION = 2;
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('phone:' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('phone:' + key, JSON.stringify(value)); } catch { /* מצב פרטי */ }
    },
  };
  try {
    if (store.get('version', 0) !== DATA_VERSION) {
      Object.keys(localStorage).filter(k => k.startsWith('phone:')).forEach(k => localStorage.removeItem(k));
      store.set('version', DATA_VERSION);
    }
  } catch { /* אין גישה לשמירה */ }

  // ---------- אירועים בין אפליקציות ----------
  const handlers = {};
  const on = (name, fn) => (handlers[name] = handlers[name] || []).push(fn);
  const emit = (name, data) => (handlers[name] || []).forEach(fn => fn(data));

  // ---------- בניית אלמנטים ----------
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const icons = {
    back: '<svg viewBox="0 0 24 24"><path d="M15.4 4.6 16.8 6l-6 6 6 6-1.4 1.4L8 12z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><path d="M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
    video: '<svg viewBox="0 0 24 24"><path d="M3 6h12a1 1 0 0 1 1 1v3.5l5-3.5v10l-5-3.5V17a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm1 2v8h10V8z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-4 4V6a2 2 0 0 1 2-2z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1a7 7 0 0 0 6-6.9z"/></svg>',
    speaker: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.2V21h3.8L17.8 9.9l-3.7-3.7zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',
  };

  function iconBtn(svg, onclick, label) {
    return h('button', { class: 'icon-btn', html: svg, onclick, 'aria-label': label || '' });
  }

  // כותרת עליונה סטנדרטית לאפליקציה
  function header({ title, onBack, actions = [], className = '' }) {
    return h('div', { class: 'app-header ' + className },
      onBack ? iconBtn(icons.back, onBack, 'Back') : null,
      h('div', { class: 'title' }, title),
      actions,
    );
  }

  // ---------- עזרים ----------
  const AVATAR_COLORS = ['#e57373', '#f06292', '#ba68c8', '#7986cb', '#4fc3f7', '#4db6ac', '#81c784', '#ffb74d', '#a1887f', '#90a4ae'];
  function colorFor(text) {
    let n = 0;
    for (const ch of String(text)) n = (n * 31 + ch.codePointAt(0)) >>> 0;
    return AVATAR_COLORS[n % AVATAR_COLORS.length];
  }
  // opts: { color, fg, banned } — banned מצייר עיגול אדום עם קו
  function avatar(name, size = 44, opts = {}) {
    const letter = (String(name).trim()[0] || '?').toUpperCase();
    return h('div', {
      class: 'avatar',
      style: {
        width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.5) + 'px',
        background: opts.color || colorFor(name), color: opts.fg || '#fff',
      },
    }, letter, opts.banned ? h('span', { class: 'avatar-ban' }) : null);
  }
  const contactAvatar = (c, size) => avatar(c.name, size, c);

  const pad = n => String(n).padStart(2, '0');
  function formatTime(ts) {
    const d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function formatDay(ts) {
    const d = new Date(ts), now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function formatShort(ts) {
    const day = formatDay(ts);
    return day === 'Today' ? formatTime(ts) : day;
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function toast(text) {
    const t = h('div', { class: 'toast' }, text);
    screenEl.append(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
  }

  // ---------- אנשי קשר (משותף לכל האפליקציות) ----------
  const SEED_CONTACTS = [
    { id: 'violet', name: 'Violet', phone: '+1 555-0142', color: '#b0447a' },
    { id: 'duncan', name: 'Duncan', phone: '+1 555-0118', color: '#7a4510' },
    { id: 'olaf', name: 'count olaf', phone: '+1 555-0113', color: '#fff', fg: '#111', banned: true },
    { id: 'nero', name: 'vice principal nero', phone: '+1 555-0177', color: '#0f5c3a' },
    { id: 'isadora', name: 'Isadora', phone: '+1 555-0119', color: '#8e0b5b' },
    { id: 'sunny', name: 'Sunny', phone: '+1 555-0101', color: '#0f5c3a' },
  ];
  const contacts = {
    all() {
      let list = store.get('contacts', null);
      if (!list) { list = SEED_CONTACTS; store.set('contacts', list); }
      return [...list].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    },
    get(id) { return contacts.all().find(c => c.id === id); },
    save(contact) {
      const list = contacts.all();
      if (!contact.id) contact.id = uid();
      const i = list.findIndex(c => c.id === contact.id);
      if (i >= 0) list[i] = contact; else list.push(contact);
      store.set('contacts', list);
      return contact;
    },
    remove(id) { store.set('contacts', contacts.all().filter(c => c.id !== id)); },
  };

  // ---------- מסך שיחה מדומה ----------
  function call(contact) {
    const statusEl = h('div', { class: 'call-status' }, 'Calling...');
    let seconds = 0, timer = null;
    const answer = setTimeout(() => {
      statusEl.textContent = '00:00';
      timer = setInterval(() => {
        seconds++;
        statusEl.textContent = pad(Math.floor(seconds / 60)) + ':' + pad(seconds % 60);
      }, 1000);
    }, 2500);
    const toggle = e => e.currentTarget.classList.toggle('on');
    const end = () => {
      clearTimeout(answer); clearInterval(timer);
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    };
    const overlay = h('div', { class: 'call-screen' },
      h('div', { class: 'call-top' },
        contactAvatar(contact, 96),
        h('div', { class: 'call-name' }, contact.name),
        h('div', { class: 'call-number' }, contact.phone),
        statusEl,
      ),
      h('div', { class: 'call-actions' },
        h('button', { class: 'call-btn', html: icons.mic, onclick: toggle, 'aria-label': 'Mute' }),
        h('button', { class: 'call-btn end', html: icons.phone, onclick: end, 'aria-label': 'End call' }),
        h('button', { class: 'call-btn', html: icons.speaker, onclick: toggle, 'aria-label': 'Speaker' }),
      ),
    );
    screenEl.append(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
  }

  // ---------- אפליקציות ----------
  function registerApp(app) { apps.push(app); }

  function setStatusDark(dark) { screenEl.classList.toggle('status-dark', !!dark); }

  function openApp(id, params = {}) {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    if (current) closeCurrent(false);
    const content = h('div', { class: 'app-content' });
    const win = h('div', { class: 'app-window', style: { background: app.bg || '#fff' } },
      h('div', { class: 'status-fill', style: { background: app.top || app.bg || '#fff' } }),
      content,
    );
    screenEl.insertBefore(win, indicatorEl);
    setStatusDark(app.statusDark);
    current = { app, win, cleanup: null };
    try { current.cleanup = app.open(content, params) || null; } catch (e) { console.error(e); }
    requestAnimationFrame(() => requestAnimationFrame(() => win.classList.add('open')));
  }

  function closeCurrent(animate) {
    const c = current;
    current = null;
    try { if (c.cleanup) c.cleanup(); } catch (e) { console.error(e); }
    if (!animate) { c.win.remove(); return; }
    c.win.classList.remove('open');
    setTimeout(() => c.win.remove(), 320);
  }

  function goHome() {
    if (!current) return;
    closeCurrent(true);
    setStatusDark(false);
  }

  function renderHome() {
    gridEl.replaceChildren(...apps.map(app =>
      h('button', { class: 'app-icon', onclick: () => openApp(app.id) },
        h('div', { class: 'icon', style: { background: app.iconBg || '#444' }, html: app.icon }),
        h('span', { class: 'label' }, app.name),
      ),
    ));
  }

  function tickClock() {
    const now = new Date();
    const t = formatTime(now);
    document.getElementById('status-time').textContent = t;
    document.getElementById('widget-time').textContent = t;
    document.getElementById('widget-date').textContent =
      now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function start() {
    screenEl = document.getElementById('screen');
    gridEl = document.getElementById('app-grid');
    indicatorEl = document.getElementById('home-indicator');
    indicatorEl.addEventListener('click', goHome);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') goHome(); });
    renderHome();
    tickClock();
    setInterval(tickClock, 10000);
  }

  return {
    h, icons, iconBtn, header, avatar, contactAvatar, colorFor, formatTime, formatDay, formatShort, uid, toast,
    store, contacts, call, on, emit, registerApp, openApp, goHome, setStatusDark, start,
  };
})();
