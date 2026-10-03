'use strict';

(() => {
  const { h, icons, iconBtn, contactAvatar, store, contacts, formatTime, formatShort, formatDay } = Phone;

  const REPLIES = [
    'Hi! 😊', 'What\'s up?', 'OK', 'Sounds good 👍', 'Haha 😂', 'I\'m on my way',
    'Let\'s talk later', 'Really?', 'Great!', '❤️', 'Can\'t talk right now',
    'Sure', 'I don\'t know 🤷', 'Thanks!!', 'We can give it a try',
  ];

  // השיחות ההתחלתיות. at(ימים אחורה, שעה, דקה)
  function at(daysAgo, hh, mm) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hh, mm, 0, 0);
    return d.getTime();
  }
  function seedChats() {
    return {
      violet: [
        // השיחה הראשונה (אתמול)
        { from: 'me', text: 'Have you read the book about how to destroy the tan fungus?', t: at(1, 10, 52), read: true },
        { from: 'them', text: 'Not yet, but I\'m working on it', t: at(1, 10, 52) },
        { from: 'me', text: 'Ok, but just so you know me and Sunny are in the shack waiting for you to return', t: at(1, 10, 53), read: true },
        { from: 'them', text: 'We don\'t need to read the book, I can just make a new invention to destroy the fungus', t: at(1, 10, 54) },
        // השיחה השנייה (היום)
        { from: 'me', text: 'We need to find a way to revel the real identity of coach Genghis', t: at(0, 10, 45), read: true },
        { from: 'me', text: 'Got any ideas 🤔?', t: at(0, 10, 45), read: true },
        { from: 'them', text: 'Yes, we could make him reveal his tattoo on his ankle.', t: at(0, 10, 49), edited: true },
        { from: 'me', deleted: true, t: at(0, 10, 49) },
        { from: 'me', text: 'We can give it a try', t: at(0, 10, 50), read: true },
        { from: 'them', text: 'OK, let\'s tell the others and make a plan at lunch', t: at(0, 10, 51) },
        { from: 'me', text: '👍', t: at(0, 10, 51), read: true },
      ],
    };
  }

  const getChats = () => {
    let chats = store.get('wa:chats', null);
    if (!chats) { chats = seedChats(); store.set('wa:chats', chats); }
    return chats;
  };
  const getUnread = () => store.get('wa:unread', {});
  const typing = new Set();       // אנשי קשר שכרגע "מקלידים"
  let refreshUI = null;           // מעדכן את המסך אם האפליקציה פתוחה
  let openChatId = null;

  const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️|\s){1,12}$/u;
  const previewText = m => m.deleted ? '🚫 You deleted this message' : (m.from === 'me' ? '✓✓ ' : '') + m.text;

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
    bg: '#111b21',
    top: '#1f2c34',
    statusDark: false,

    open(root, params) {
      let query = '';

      function listView() {
        openChatId = null;
        const search = h('input', {
          class: 'wa-search', placeholder: 'Search...', value: query,
          oninput: e => { query = e.target.value; renderList(); },
        });
        const listEl = h('div', { class: 'scroll' });

        function renderList() {
          const chats = getChats();
          const q = query.toLowerCase();
          listEl.replaceChildren(...contacts.all()
            .filter(c => !q || c.name.toLowerCase().includes(q))
            .map(c => ({ c, msgs: chats[c.id] || [] }))
            .sort((a, b) => (b.msgs.at(-1)?.t || 0) - (a.msgs.at(-1)?.t || 0))
            .map(rowFor));
        }

        function rowFor({ c, msgs }) {
          const last = msgs.at(-1);
          const count = getUnread()[c.id] || 0;
          const preview = typing.has(c.id)
            ? h('span', { class: 'wa-typing' }, 'typing...')
            : last ? previewText(last) : 'Tap to start chatting';
          return h('button', { class: 'wa-row', onclick: () => chatView(c.id) },
            contactAvatar(c, 50),
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
          h('div', { class: 'wa-header' }, h('div', { class: 'wa-title' }, 'WhatsApp')),
          h('div', { class: 'wa-search-wrap' }, search),
          listEl,
        ));
        refreshUI = renderList;
      }

      function bubble(m, read) {
        if (m.deleted) {
          return h('div', { class: 'wa-bubble ' + m.from + ' deleted' },
            h('span', { class: 'wa-text' }, '🚫 ', m.from === 'me' ? 'You deleted this message' : 'This message was deleted'),
            h('span', { class: 'wa-meta' }, formatTime(m.t)));
        }
        const jumbo = EMOJI_ONLY.test(m.text);
        return h('div', { class: 'wa-bubble ' + m.from + (jumbo ? ' jumbo' : '') },
          h('span', { class: 'wa-text', dir: 'auto' }, m.text),
          h('span', { class: 'wa-meta' },
            m.edited ? 'Edited ' : null,
            formatTime(m.t),
            m.from === 'me' ? h('span', { class: 'wa-ticks' + (read ? ' read' : '') }, '✓✓') : null,
          ),
        );
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
          class: 'wa-input', placeholder: 'Message', dir: 'auto',
          onkeydown: e => { if (e.key === 'Enter') send(); },
        });

        function renderMessages() {
          const msgs = getChats()[contactId] || [];
          const lastTheirs = msgs.findLastIndex(m => m.from === 'them');
          const nodes = [];
          let day = null;
          msgs.forEach((m, i) => {
            const d = formatDay(m.t);
            if (d !== day) { day = d; nodes.push(h('div', { class: 'wa-day' }, h('span', null, d))); }
            nodes.push(bubble(m, m.read || i < lastTheirs));
          });
          if (typing.has(contactId)) nodes.push(h('div', { class: 'wa-bubble them wa-dots' }, h('i'), h('i'), h('i')));
          msgsEl.replaceChildren(...nodes);
          statusEl.textContent = typing.has(contactId) ? 'typing...' : 'online';
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
            iconBtn(icons.back, listView, 'Back'),
            contactAvatar(contact, 38),
            h('div', { class: 'wa-chat-info' },
              h('div', { class: 'wa-chat-name' }, contact.name),
              statusEl,
            ),
            iconBtn(icons.video, () => Phone.call(contact), 'Video call'),
            iconBtn(icons.phone, () => Phone.call(contact), 'Call'),
            iconBtn(icons.dots, null, 'Menu'),
          ),
          msgsEl,
          h('div', { class: 'wa-inputbar' },
            input,
            h('button', { class: 'wa-send', html: '<svg viewBox="0 0 24 24"><path d="M21 12 3 3l2.5 9L3 21z"/></svg>', onclick: send, 'aria-label': 'Send' }),
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
