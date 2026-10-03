'use strict';

(() => {
  const { h, icons, iconBtn, store, uid, formatShort } = Phone;

  // הפתקים ההתחלתיים. השורה הראשונה היא הכותרת
  function at(daysAgo, hh, mm) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hh, mm, 0, 0);
    return d.getTime();
  }
  function seedNotes() {
    return [
      { id: 'n1', t: at(0, 10, 30), text: 'Reminder\nGo to the field after lunch' },
      { id: 'n2', t: at(0, 8, 15), text: 'Secret meeting\nAt 9:00' },
      {
        id: 'n3', t: at(1, 19, 40),
        text: 'Book list\n- Moby-Dick\n- The Great Gatsby\n- Anna Karenina\n- The Encyclopedia of Fungi\n- Advanced Chemistry for Beginners\n- The Incomplete History of Secret Organizations',
      },
      { id: 'n4', t: at(2, 14, 2), text: 'fjdkslaa;wpeoir hgjk vbnmzxc qwrtyy\nasdlkj fghh ;;; poiuyt mnbvxz kjjjh' },
      { id: 'n5', t: at(3, 21, 50), text: 'Reminder\nSet an alarm for tomorrow ⏰' },
    ];
  }

  const getNotes = () => {
    let notes = store.get('notes', null);
    if (!notes) { notes = seedNotes(); store.set('notes', notes); }
    return notes;
  };
  const saveNotes = notes => store.set('notes', notes);
  const titleOf = n => n.text.trim().split('\n')[0] || 'New Note';
  const previewOf = n => n.text.trim().split('\n').slice(1).join(' ').trim() || 'No additional text';

  Phone.registerApp({
    id: 'notes',
    name: 'Notes',
    iconBg: 'linear-gradient(180deg,#fff 0 28%,#fdd94a 28% 32%,#fff 32%)',
    icon: '<svg viewBox="0 0 24 24" style="color:#c9c9c9"><path d="M4 12h16v1.2H4zm0 4h16v1.2H4zm0 4h11v1.2H4z"/></svg>',
    bg: '#f2f2f7',
    top: '#f2f2f7',
    statusDark: true,

    open(root) {
      function listView() {
        const notes = getNotes().sort((a, b) => b.t - a.t);
        root.replaceChildren(h('div', { class: 'view nt' },
          h('div', { class: 'scroll' },
            h('div', { class: 'nt-title' }, 'Notes'),
            h('div', { class: 'nt-list' }, notes.map(n =>
              h('button', { class: 'nt-row', onclick: () => editView(n.id) },
                h('div', { class: 'nt-row-title' }, titleOf(n)),
                h('div', { class: 'nt-row-sub' }, h('b', null, formatShort(n.t)), ' ', previewOf(n)),
              ))),
          ),
          h('div', { class: 'nt-footer' },
            h('span', null, notes.length + ' Notes'),
            iconBtn(icons.edit, () => {
              const note = { id: uid(), t: Date.now(), text: '' };
              saveNotes([note, ...getNotes()]);
              editView(note.id);
            }, 'New note'),
          ),
        ));
      }

      function editView(id) {
        const note = getNotes().find(n => n.id === id);
        if (!note) return listView();
        const area = h('textarea', { class: 'nt-editor', value: note.text, placeholder: 'Start typing...' });
        area.addEventListener('input', () => {
          const notes = getNotes();
          const n = notes.find(x => x.id === id);
          n.text = area.value;
          n.t = Date.now();
          saveNotes(notes);
        });
        const back = () => {
          // פתק ריק נמחק כשיוצאים
          if (!area.value.trim()) saveNotes(getNotes().filter(n => n.id !== id));
          listView();
        };
        const remove = () => {
          if (!confirm('Delete this note?')) return;
          saveNotes(getNotes().filter(n => n.id !== id));
          listView();
        };
        root.replaceChildren(h('div', { class: 'view nt' },
          h('div', { class: 'app-header' },
            h('button', { class: 'nt-back', onclick: back }, h('span', { html: icons.back }), 'Notes'),
            h('div', { class: 'title' }),
            h('button', { class: 'nt-delete', onclick: remove }, 'Delete'),
            h('button', { class: 'nt-done', onclick: back }, 'Done'),
          ),
          h('div', { class: 'nt-date' }, new Date(note.t).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })),
          area,
        ));
        if (!note.text) area.focus();
      }

      listView();
    },
  });
})();
