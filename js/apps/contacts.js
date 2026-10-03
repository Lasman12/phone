'use strict';

(() => {
  const { h, icons, iconBtn, header, avatar, contactAvatar, contacts, toast } = Phone;

  Phone.registerApp({
    id: 'contacts',
    name: 'Contacts',
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
          const q = query.toLowerCase();
          const items = contacts.all().filter(c => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
          const rows = [];
          let letter = null;
          for (const c of items) {
            const first = c.name.trim()[0]?.toUpperCase();
            if (first !== letter) { letter = first; rows.push(h('div', { class: 'ct-letter' }, letter)); }
            rows.push(h('button', { class: 'ct-row', onclick: () => detailView(c.id) }, contactAvatar(c, 40), h('span', null, c.name)));
          }
          if (!items.length) rows.push(h('div', { class: 'ct-empty' }, 'No contacts'));
          listEl.replaceChildren(...rows);
        }
        renderList();
        show(h('div', { class: 'view' },
          header({ title: 'Contacts', className: 'big', actions: [iconBtn(icons.plus, () => editView(null), 'New contact')] }),
          h('div', { class: 'ct-search-wrap' },
            h('input', { class: 'ct-search', placeholder: 'Search', value: query, oninput: e => { query = e.target.value; renderList(); } }),
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
          header({ title: '', onBack: listView, actions: [iconBtn(icons.edit, () => editView(id), 'Edit')] }),
          h('div', { class: 'scroll' },
            h('div', { class: 'ct-hero' }, contactAvatar(c, 110), h('div', { class: 'ct-hero-name' }, c.name)),
            h('div', { class: 'ct-actions' },
              action(icons.chat, 'message', () => Phone.openApp('whatsapp', { contactId: c.id })),
              action(icons.phone, 'call', () => Phone.call(c)),
            ),
            h('div', { class: 'ct-card' },
              h('div', { class: 'ct-card-label' }, 'mobile'),
              h('div', { class: 'ct-card-value' }, c.phone || '—'),
            ),
            h('button', {
              class: 'ct-delete',
              onclick: () => {
                if (!confirm(`Delete ${c.name}?`)) return;
                contacts.remove(c.id);
                toast('Contact deleted');
                listView();
              },
            }, 'Delete Contact'),
          ),
        ));
      }

      function editView(id) {
        const c = id ? contacts.get(id) : { name: '', phone: '' };
        const name = h('input', { class: 'ct-field', placeholder: 'Name', value: c.name });
        const phone = h('input', { class: 'ct-field', placeholder: 'Phone', value: c.phone, type: 'tel' });
        const save = () => {
          if (!name.value.trim()) { toast('Please enter a name'); return; }
          const saved = contacts.save({ ...c, name: name.value.trim(), phone: phone.value.trim() });
          detailView(saved.id);
        };
        show(h('div', { class: 'view' },
          header({
            title: id ? 'Edit Contact' : 'New Contact',
            onBack: () => (id ? detailView(id) : listView()),
            actions: [h('button', { class: 'text-btn', onclick: save }, 'Done')],
          }),
          h('div', { class: 'scroll ct-form' }, id ? contactAvatar(c, 90) : avatar('?', 90), name, phone),
        ));
        name.focus();
      }

      if (params.contactId) detailView(params.contactId); else listView();
    },
  });
})();
