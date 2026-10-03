'use strict';

(() => {
  const { h, icons, iconBtn, store } = Phone;

  /*
   * Tony — צ'אט בוט AI שרץ בתוך הדפדפן עצמו (WebLLM), בלי שרת ובלי מפתח.
   * בפעם הראשונה הדפדפן מוריד את המודל (~300MB) ושומר אותו; אחר כך הוא נטען מהר.
   */
  const WEBLLM = 'https://esm.run/@mlc-ai/web-llm@0.2.85';
  const SYSTEM_PROMPT = 'Your name is Tony. You are a friendly, cheerful AI assistant that lives inside this phone. '
    + 'If someone asks who you are or who made you, say you are Tony, the phone\'s AI assistant — never name any company. '
    + 'Keep answers short (1-4 sentences) unless the user asks for more detail.';
  // דוגמה קצרה שעוזרת למודל הקטן לזכור מי הוא
  const INTRO = [
    { role: 'user', content: 'Who are you?' },
    { role: 'assistant', content: 'I\'m Tony, the AI assistant on this phone! 😊 How can I help?' },
    { role: 'user', content: 'Who made you?' },
    { role: 'assistant', content: 'I was made just for this phone — I\'m Tony, and I live right here! 📱' },
  ];
  const HISTORY = 12; // כמה הודעות אחרונות Tony זוכר בכל תשובה

  // ---------- המנוע — חי מחוץ לאפליקציה, כך שההורדה ממשיכה גם כשיוצאים ----------
  const ai = {
    engine: null,
    loading: null,
    progress: 0,
    status: '',
    busy: false,
    listeners: new Set(),
    emit() { this.listeners.forEach(fn => fn()); },

    supported: () => !!navigator.gpu,

    async modelId() {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('no-gpu');
      return adapter.features.has('shader-f16')
        ? 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
        : 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
    },

    async isCached() {
      try {
        const webllm = await import(WEBLLM);
        return await webllm.hasModelInCache(await this.modelId());
      } catch { return false; }
    },

    load() {
      if (this.loading) return this.loading;
      this.status = 'Starting...';
      this.emit();
      this.loading = (async () => {
        const webllm = await import(WEBLLM);
        const worker = new Worker(new URL('js/apps/tony-worker.js', location.href), { type: 'module' });
        this.engine = await webllm.CreateWebWorkerMLCEngine(worker, await this.modelId(), {
          initProgressCallback: report => {
            this.progress = report.progress || 0;
            this.status = report.text || '';
            this.emit();
          },
        });
        this.progress = 1;
        this.emit();
      })().catch(err => {
        console.error(err);
        this.loading = null;
        this.engine = null;
        this.status = 'error';
        this.emit();
      });
      return this.loading;
    },
  };

  const getChat = () => store.get('tony:chat', []);
  const saveChat = chat => store.set('tony:chat', chat);

  const AVATAR = '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="13" rx="5" fill="currentColor"/><rect x="11.2" y="2.5" width="1.6" height="4" rx=".8" fill="currentColor"/><circle cx="12" cy="2.6" r="1.4" fill="currentColor"/><circle cx="9" cy="12" r="1.7" fill="#111"/><circle cx="15" cy="12" r="1.7" fill="#111"/><rect x="9" y="15.3" width="6" height="1.4" rx=".7" fill="#111"/></svg>';

  Phone.registerApp({
    id: 'tony',
    name: 'Tony',
    iconBg: 'linear-gradient(150deg,#7b5cff,#2bd2ff)',
    icon: '<svg viewBox="0 0 24 24" style="color:#fff"><rect x="4" y="6" width="16" height="13" rx="5" fill="currentColor"/><rect x="11.2" y="2.5" width="1.6" height="4" rx=".8" fill="currentColor"/><circle cx="12" cy="2.6" r="1.4" fill="currentColor"/><circle cx="9" cy="12" r="1.7" fill="#5a63ff"/><circle cx="15" cy="12" r="1.7" fill="#5a63ff"/><rect x="9" y="15.3" width="6" height="1.4" rx=".7" fill="#5a63ff"/></svg>',
    bg: '#0f1117',
    top: '#0f1117',
    statusDark: false,

    open(root) {
      const msgsEl = h('div', { class: 'ty-messages' });
      const input = h('textarea', { class: 'ty-input', rows: 1, placeholder: 'Message Tony...', dir: 'auto' });
      const sendBtn = h('button', { class: 'ty-send', 'aria-label': 'Send' });
      const body = h('div', { class: 'ty-body' });
      let streamingEl = null;

      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      sendBtn.addEventListener('click', () => (ai.busy ? ai.engine.interruptGenerate() : send()));

      root.replaceChildren(h('div', { class: 'view ty' },
        h('div', { class: 'ty-header' },
          h('div', { class: 'ty-avatar', html: AVATAR }),
          h('div', { class: 'ty-head-text' }, h('div', { class: 'ty-name' }, 'Tony'), h('div', { class: 'ty-sub' }, 'AI assistant')),
          iconBtn(icons.edit, () => {
            if (ai.busy || !getChat().length) return;
            if (confirm('Start a new chat?')) { saveChat([]); render(); }
          }, 'New chat'),
        ),
        body,
      ));

      function bubble(m) {
        return h('div', { class: 'ty-msg ' + m.role },
          m.role === 'assistant' ? h('div', { class: 'ty-mini', html: AVATAR }) : null,
          h('div', { class: 'ty-text', dir: 'auto' }, m.content));
      }

      function chatScreen() {
        const chat = getChat();
        msgsEl.replaceChildren(
          ...(chat.length ? chat.map(bubble) : [h('div', { class: 'ty-empty' },
            h('div', { class: 'ty-big', html: AVATAR }),
            h('div', { class: 'ty-hello' }, 'Hi, I\'m Tony!'),
            h('div', { class: 'ty-hint' }, 'Ask me anything.'),
            h('div', { class: 'ty-chips' }, ['Tell me a joke', 'Give me a fun fact', 'Help me plan my day'].map(q =>
              h('button', { class: 'ty-chip', onclick: () => { input.value = q; send(); } }, q))),
          )]),
        );
        sendBtn.innerHTML = ai.busy
          ? '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M12 4 5 11l1.4 1.4L11 7.8V20h2V7.8l4.6 4.6L19 11z"/></svg>';
        return [msgsEl, h('div', { class: 'ty-inputbar' }, input, sendBtn)];
      }

      function setupScreen(cached) {
        if (!ai.supported()) {
          return h('div', { class: 'ty-setup' },
            h('div', { class: 'ty-big', html: AVATAR }),
            h('div', { class: 'ty-hello' }, 'Tony can\'t run here'),
            h('p', null, 'Tony needs WebGPU. Try Chrome or Edge on a computer, or a newer phone.'));
        }
        if (ai.loading || cached) {
          const pct = Math.round(ai.progress * 100);
          return h('div', { class: 'ty-setup' },
            h('div', { class: 'ty-big pulse', html: AVATAR }),
            h('div', { class: 'ty-hello' }, cached ? 'Waking Tony up...' : 'Downloading Tony...'),
            h('div', { class: 'ty-bar' }, h('span', { style: { width: pct + '%' } })),
            h('div', { class: 'ty-pct' }, pct + '%'),
            h('p', { class: 'ty-small' }, 'You can leave the app — it keeps loading in the background.'));
        }
        if (ai.status === 'error') {
          return h('div', { class: 'ty-setup' },
            h('div', { class: 'ty-big', html: AVATAR }),
            h('div', { class: 'ty-hello' }, 'Something went wrong'),
            h('p', null, 'Tony couldn\'t load on this device. Check your connection and try again.'),
            h('button', { class: 'ty-start', onclick: () => ai.load() }, 'Try again'));
        }
        return h('div', { class: 'ty-setup' },
          h('div', { class: 'ty-big', html: AVATAR }),
          h('div', { class: 'ty-hello' }, 'Meet Tony'),
          h('p', null, 'Tony is an AI that runs right here on your device — no account needed.'),
          h('p', { class: 'ty-small' }, 'The first start downloads about 300 MB (Wi-Fi recommended). After that Tony loads fast.'),
          h('button', { class: 'ty-start', onclick: () => ai.load() }, 'Start Tony'));
      }

      let cachedCheck = null;
      function render() {
        if (ai.engine) { body.replaceChildren(...chatScreen()); msgsEl.scrollTop = msgsEl.scrollHeight; return; }
        body.replaceChildren(setupScreen(cachedCheck === true));
      }

      async function send() {
        const text = input.value.trim();
        if (!text || ai.busy || !ai.engine) return;
        input.value = '';
        input.style.height = 'auto';
        const chat = [...getChat(), { role: 'user', content: text }];
        saveChat(chat);
        ai.busy = true;
        render();

        streamingEl = h('div', { class: 'ty-text', dir: 'auto' }, h('span', { class: 'ty-typing' }, h('i'), h('i'), h('i')));
        msgsEl.append(h('div', { class: 'ty-msg assistant' }, h('div', { class: 'ty-mini', html: AVATAR }), streamingEl));
        msgsEl.scrollTop = msgsEl.scrollHeight;

        let reply = '';
        try {
          const stream = await ai.engine.chat.completions.create({
            stream: true,
            temperature: 0.7,
            max_tokens: 400,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...INTRO, ...chat.slice(-HISTORY)],
          });
          for await (const chunk of stream) {
            reply += chunk.choices[0]?.delta?.content || '';
            if (streamingEl) {
              streamingEl.textContent = reply;
              msgsEl.scrollTop = msgsEl.scrollHeight;
            }
          }
        } catch (err) {
          console.error(err);
          if (!reply) reply = 'Sorry, something went wrong. Try again.';
        }
        saveChat([...chat, { role: 'assistant', content: reply.trim() || '...' }]);
        ai.busy = false;
        streamingEl = null;
        render();
      }

      const onChange = () => { if (!ai.busy) render(); };
      ai.listeners.add(onChange);
      render();
      // אם המודל כבר הורד בעבר — טוענים אותו אוטומטית
      if (!ai.engine && !ai.loading && ai.supported()) {
        ai.isCached().then(cached => {
          cachedCheck = cached;
          if (cached) ai.load(); else render();
        });
      }

      return () => { ai.listeners.delete(onChange); streamingEl = null; };
    },
  });

})();
