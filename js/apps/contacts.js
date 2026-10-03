'use strict';

(() => {
  const { h, icons, iconBtn, header, avatar, contacts, toast } = Phone;

  Phone.registerApp({
    id: 'contacts',
    name: 'אנשי קשר',
    iconBg: 'linear-gradient(160deg,#a1a1a8,#6b6b72)',
    icon: '<svg viewBox="0 0 24 24"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5z"/></svg>',
    bg: '#fff',
    top: '#fff',
    statusDark: true,

    open(root, params) {
      let query = '';
      const show = view => root.replaceChildren(view);

      function listView() {
        const listEl = h('div', { class: 'scroll' });
        function renderList() {
          const items = contacts.all().filter(c => !query || c.name.includes(query) || c.phone.includes(query));
          const rows = [];
          let letter = null;
          for (const c of items) {
            const first = c.name.trim()[0]?.toUpperCase();
            if (first !== letter) { letter = first; rows.push(h('div', { class: 'ct-letter' }, letter)); }
            rows.push(h('button', { class: 'ct-row', onclick: () => detailView(c.id) }, avatar(c.name, 40), h('span', null, c.name)));
          }
          if (!items.length) rows.push(h('div', { class: 'ct-empty' }, 'אין אנשי קשר'));
          listEl.replaceChildren(...rows);
        }
        renderList();
        show(h('div', { class: 'view' },
          header({ title: 'אנשי קשר', className: 'big', actions: [iconBtn(icons.plus, () => editView(null), 'איש קשר חדש')] }),
          h('div', { class: 'ct-search-wrap' },
            h('input', { class: 'ct-search', placeholder: 'חיפוש', value: query, oninput: e => { query = e.target.value; renderList(); } }),
          ),
          listEl,
        ));
      }

      function detailView(id) {
        const c = contacts.get(id);
        if (!c) return listView();
        const action = (svg, label, onclick) =>
          h('button', { class: 'ct-action', onclick }, h('span', { html: svg }), label);
        show(h('div', { class: 'view' },
          header({ title: '', onBack: listView, actions: [iconBtn(icons.edit, () => editView(id), 'עריכה')] }),
          h('div', { class: 'scroll' },
            h('div', { class: 'ct-hero' }, avatar(c.name, 110), h('div', { class: 'ct-hero-name' }, c.name)),
            h('div', { class: 'ct-actions' },
              action(icons.chat, 'הודעה', () => Phone.openApp('whatsapp', { contactId: c.id })),
              action(icons.phone, 'שיחה', () => Phone.call(c)),
            ),
            h('div', { class: 'ct-card' },
              h('div', { class: 'ct-card-label' }, 'נייד'),
              h('div', { class: 'ct-card-value', dir: 'ltr' }, c.phone || '—'),
            ),
            h('button', {
              class: 'ct-delete',
              onclick: () => {
                if (!confirm(`למחוק את ${c.name}?`)) return;
                contacts.remove(c.id);
                toast('איש הקשר נמחק');
                listView();
              },
            }, 'מחיקת איש קשר'),
          ),
        ));
      }

      function editView(id) {
        const c = id ? contacts.get(id) : { name: '', phone: '' };
        const name = h('input', { class: 'ct-field', placeholder: 'שם', value: c.name });
        const phone = h('input', { class: 'ct-field', placeholder: 'טלפון', value: c.phone, type: 'tel', dir: 'ltr' });
        const save = () => {
          if (!name.value.trim()) { toast('צריך לכתוב שם'); return; }
          const saved = contacts.save({ ...c, name: name.value.trim(), phone: phone.value.trim() });
          detailView(saved.id);
        };
        show(h('div', { class: 'view' },
          header({
            title: id ? 'עריכה' : 'איש קשר חדש',
            onBack: () => (id ? detailView(id) : listView()),
            actions: [h('button', { class: 'text-btn', onclick: save }, 'שמירה')],
          }),
          h('div', { class: 'scroll ct-form' }, avatar(name.value || '?', 90), name, phone),
        ));
        name.focus();
      }

      if (params.contactId) detailView(params.contactId); else listView();
    },
  });
})();
