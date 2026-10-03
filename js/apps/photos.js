'use strict';

(() => {
  const { h, icons } = Phone;

  // התמונות בגלריה. תמונה חדשה = קובץ בתיקייה img/gallery ושורה כאן
  const PHOTOS = [
    { src: 'img/gallery/shack.webp' },
    { src: 'img/gallery/road.webp' },
    { src: 'img/gallery/portrait.png' },
    { src: 'img/gallery/library.webp' },
    // חתול ברחוב — מוויקישיתוף (Wikimedia Commons)
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Tabby_cat_on_a_sidewalk_%28Unsplash%29.jpg/960px-Tabby_cat_on_a_sidewalk_%28Unsplash%29.jpg' },
  ];

  Phone.registerApp({
    id: 'photos',
    name: 'Photos',
    iconBg: '#fff',
    icon: '<svg viewBox="0 0 24 24"><g transform="translate(12 12)">'
      + ['#f5b400', '#f57c00', '#e53935', '#c2185b', '#7b1fa2', '#1e88e5', '#00acc1', '#43a047']
        .map((c, i) => `<ellipse rx="3" ry="6" cy="-4.6" fill="${c}" opacity=".85" transform="rotate(${i * 45})"/>`).join('')
      + '</g></svg>',
    bg: '#fff',
    top: '#fff',
    statusDark: true,

    open(root) {
      // בתצוגת תמונה מלאה הרקע שחור, גם מאחורי שורת המצב
      const setDark = dark => {
        Phone.setStatusDark(!dark);
        root.previousElementSibling.style.background = dark ? '#000' : '#fff';
        root.parentElement.style.background = dark ? '#000' : '#fff';
      };

      function gridView() {
        setDark(false);
        root.replaceChildren(h('div', { class: 'view ph' },
          h('div', { class: 'scroll' },
            h('div', { class: 'ph-title' }, 'Recents'),
            h('div', { class: 'ph-count' }, PHOTOS.length + ' Photos'),
            h('div', { class: 'ph-grid' }, PHOTOS.map((p, i) =>
              h('button', { class: 'ph-cell', onclick: () => viewer(i) },
                h('img', { src: p.src, alt: '', loading: 'lazy' })))),
          ),
        ));
      }

      function viewer(index) {
        setDark(true);
        const img = h('img', { class: 'ph-full', alt: '' });
        const counter = h('div', { class: 'title' });
        const show = i => {
          index = (i + PHOTOS.length) % PHOTOS.length;
          img.src = PHOTOS[index].src;
          counter.textContent = `${index + 1} of ${PHOTOS.length}`;
        };
        // החלקה ימינה/שמאלה בטלפון
        let startX = null;
        const stage = h('div', {
          class: 'ph-stage',
          ontouchstart: e => { startX = e.touches[0].clientX; },
          ontouchend: e => {
            if (startX == null) return;
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
            startX = null;
          },
        },
          img,
          h('button', { class: 'ph-nav prev', html: icons.back, onclick: () => show(index - 1), 'aria-label': 'Previous' }),
          h('button', { class: 'ph-nav next', html: icons.back, onclick: () => show(index + 1), 'aria-label': 'Next' }),
        );
        root.replaceChildren(h('div', { class: 'view ph-view' },
          h('div', { class: 'app-header' },
            h('button', { class: 'ph-back', onclick: gridView }, h('span', { html: icons.back }), 'Recents'),
            counter,
            h('div', { style: { width: '90px' } }),
          ),
          stage,
        ));
        show(index);
      }

      gridView();
    },
  });
})();
