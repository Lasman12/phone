'use strict';

(() => {
  const { h, icons, iconBtn, avatar, store, contacts, formatTime, formatShort } = Phone;

  const REPLIES = [
    'היי! 😊', 'מה נשמע?', 'אחלה, ואצלך?', 'סבבה 👍', 'חחחח 😂', 'אני בדרך',
    'אוקיי, נדבר אחר כך', 'וואו באמת?', 'מעולה!', '❤️', 'רגע, אני עסוק/ה עכשיו',
    'כן בטח', 'לא יודע/ת 🤷', 'יאללה', 'תודה!!', 'נשמע טוב',
  ];

  // הודעות לדוגמה בפעם הראשונה
  function seedChats() {
    const now = Date.now(), min = 60000;
    return {
      mom: [
        { from: 'them', text: 'אכלת משהו?', t: now - 50 * min },
        { from: 'me', text: 'כן אמא 😅', t: now - 48 * min },
        { from: 'them', text: 'יופי ❤️', t: now - 47 * min },
      ],
      dani: [
        { from: 'them', text: 'באים למשחק היום?', t: now - 3 * 60 * min },
      ],
      noa: [
        { from: 'me', text: 'שלחת לי את השיעורי בית?', t: now - 26 * 60 * min },
        { from: 'them', text: 'עוד מעט שולחת', t: now - 25 * 60 * min },
      ],
    };
  }

  const getChats = () => store.get('wa:chats', null) || (store.set('wa:chats', seedChats()), store.get('wa:chats', {}));
  const getUnread = () => store.get('wa:unread', { dani: 1 });
  const typing = new Set();       // אנשי קשר שכרגע "מקלידים"
  let refreshUI = null;           // מעדכן את המסך אם האפליקציה פתוחה
  let openChatId = null;

  function addMessage(contactId, msg) {
    const chats = getChats();
    (chats[contactId] = chats[contactId] || []).push(msg);
    store.set('wa:chats', chats);
  }

  function scheduleReply(contactId) {
    setTimeout(() => {
      typing.add(contactId);
      refreshUI && refreshUI();
      setTimeout(() => {
        typing.delete(contactId);
        const text = REPLIES[Math.floor(Math.random() * REPLIES.length)];
        addMessage(contactId, { from: 'them', text, t: Date.now() });
        if (openChatId !== contactId) {
          const unread = getUnread();
          unread[contactId] = (unread[contactId] || 0) + 1;
          store.set('wa:unread', unread);
        }
        refreshUI && refreshUI();
      }, 1200 + Math.random() * 1800);
    }, 600 + Math.random() * 900);
  }

  Phone.registerApp({
    id: 'whatsapp',
    name: 'WhatsApp',
    iconBg: 'linear-gradient(160deg,#5ef27a,#1fae45)',
    icon: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8zM9 7.5c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.9 4.5 4 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1-.4-2-1.2-.7-.6-1.2-1.4-1.3-1.7-.1-.2 0-.4.1-.5l.4-.5.3-.4c.1-.2 0-.3 0-.5z"/></svg>',
    bg: '#fff',
    top: '#008069',
    statusDark: false,

    open(root, params) {
      let query = '';

      function listView() {
        openChatId = null;
        const search = h('input', {
          class: 'wa-search', placeholder: 'חיפוש...', value: query,
          oninput: e => { query = e.target.value; renderList(); },
        });
        const listEl = h('div', { class: 'scroll' });

        function renderList() {
          const chats = getChats();
          listEl.replaceChildren(...contacts.all()
            .filter(c => !query || c.name.includes(query))
            .map(c => ({ c, msgs: chats[c.id] || [] }))
            .sort((a, b) => (b.msgs.at(-1)?.t || 0) - (a.msgs.at(-1)?.t || 0))
            .map(rowFor));
        }

        function rowFor({ c, msgs }) {
          const last = msgs.at(-1);
          const count = getUnread()[c.id] || 0;
          const preview = typing.has(c.id)
            ? h('span', { class: 'wa-typing' }, 'מקליד/ה...')
            : last ? (last.from === 'me' ? '✓✓ ' : '') + last.text : 'התחל/י שיחה';
          return h('button', { class: 'wa-row', onclick: () => chatView(c.id) },
            avatar(c.name, 50),
            h('div', { class: 'wa-row-main' },
              h('div', { class: 'wa-row-top' },
                h('span', { class: 'wa-name' }, c.name),
                h('span', { class: 'wa-time' + (count ? ' unread' : '') }, last ? formatShort(last.t) : ''),
              ),
              h('div', { class: 'wa-row-bottom' },
                h('span', { class: 'wa-preview', dir: 'auto' }, preview),
                count ? h('span', { class: 'wa-badge' }, count) : null,
              ),
            ),
          );
        }

        renderList();
        root.replaceChildren(h('div', { class: 'view' },
          h('div', { class: 'wa-header' },
            h('div', { class: 'wa-title' }, 'WhatsApp'),
          ),
          h('div', { class: 'wa-search-wrap' }, search),
          listEl,
        ));
        refreshUI = renderList;
      }

      function chatView(contactId) {
        const contact = contacts.get(contactId);
        if (!contact) return listView();
        openChatId = contactId;
        const unread = getUnread();
        delete unread[contactId];
        store.set('wa:unread', unread);

        const statusEl = h('div', { class: 'wa-chat-status' });
        const msgsEl = h('div', { class: 'wa-messages' });
        const input = h('input', {
          class: 'wa-input', placeholder: 'הודעה', dir: 'auto',
          onkeydown: e => { if (e.key === 'Enter') send(); },
        });

        function renderMessages() {
          const msgs = getChats()[contactId] || [];
          const lastTheirs = msgs.findLastIndex(m => m.from === 'them');
          msgsEl.replaceChildren(...msgs.map((m, i) =>
            h('div', { class: 'wa-bubble ' + m.from },
              h('span', { class: 'wa-text', dir: 'auto' }, m.text),
              h('span', { class: 'wa-meta' },
                formatTime(m.t),
                m.from === 'me' ? h('span', { class: 'wa-ticks' + (i < lastTheirs ? ' read' : '') }, '✓✓') : null,
              ),
            )));
          if (typing.has(contactId)) msgsEl.append(h('div', { class: 'wa-bubble them wa-dots' }, h('i'), h('i'), h('i')));
          statusEl.textContent = typing.has(contactId) ? 'מקליד/ה...' : 'מחובר/ת';
          msgsEl.scrollTop = msgsEl.scrollHeight;
        }

        function send() {
          const text = input.value.trim();
          if (!text) return;
          input.value = '';
          addMessage(contactId, { from: 'me', text, t: Date.now() });
          renderMessages();
          scheduleReply(contactId);
          input.focus();
        }

        root.replaceChildren(h('div', { class: 'view' },
          h('div', { class: 'wa-chat-header' },
            iconBtn(icons.back, listView, 'חזרה'),
            avatar(contact.name, 38),
            h('div', { class: 'wa-chat-info' },
              h('div', { class: 'wa-chat-name' }, contact.name),
              statusEl,
            ),
            iconBtn(icons.phone, () => Phone.call(contact), 'שיחה'),
          ),
          msgsEl,
          h('div', { class: 'wa-inputbar' },
            input,
            h('button', { class: 'wa-send', html: '<svg viewBox="0 0 24 24"><path d="M21 12 3 3l2.5 9L3 21z"/></svg>', onclick: send, 'aria-label': 'שליחה' }),
          ),
        ));
        refreshUI = renderMessages;
        renderMessages();
      }

      if (params.contactId) chatView(params.contactId); else listView();
      return () => { refreshUI = null; openChatId = null; };
    },
  });
})();
