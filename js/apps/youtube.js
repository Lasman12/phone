'use strict';

(() => {
  const { h, icons, iconBtn, store, toast } = Phone;

  // סרטונים שמופיעים בדף הבית. אפשר להוסיף/להחליף: id = 11 התווים שאחרי v= בקישור
  const VIDEOS = [
    { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', channel: 'Rick Astley' },
    { id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE', channel: 'officialpsy' },
    { id: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito ft. Daddy Yankee', channel: 'Luis Fonsi' },
    { id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', channel: 'Ed Sheeran' },
    { id: 'OPf0YbXqDm0', title: 'Mark Ronson - Uptown Funk ft. Bruno Mars', channel: 'Mark Ronson' },
    { id: 'fJ9rUzIMcZQ', title: 'Queen – Bohemian Rhapsody', channel: 'Queen Official' },
    { id: 'hTWKbfoikeg', title: 'Nirvana - Smells Like Teen Spirit', channel: 'Nirvana' },
    { id: 'jNQXAC9IVRw', title: 'Me at the zoo', channel: 'jawed' },
  ];

  const LINK_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/;
  const thumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const allVideos = () => [...store.get('yt:added', []), ...VIDEOS];

  async function addFromLink(id) {
    let video = { id, title: 'סרטון מיוטיוב', channel: 'YouTube' };
    try {
      const res = await fetch('https://noembed.com/embed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
      const data = await res.json();
      if (data.title) video = { id, title: data.title, channel: data.author_name || 'YouTube' };
    } catch { /* בלי כותרת — לא נורא */ }
    const added = store.get('yt:added', []).filter(v => v.id !== id);
    store.set('yt:added', [video, ...added].slice(0, 30));
    return video;
  }

  const LOGO = '<svg viewBox="0 0 28 20" width="30" height="21"><rect width="28" height="20" rx="5" fill="#f00"/><path d="M11 6v8l7-4z" fill="#fff"/></svg>';

  Phone.registerApp({
    id: 'youtube',
    name: 'YouTube',
    iconBg: '#fff',
    icon: '<svg viewBox="0 0 28 20"><rect width="28" height="20" rx="5" fill="#f00"/><path d="M11 6v8l7-4z" fill="#fff"/></svg>',
    bg: '#fff',
    top: '#fff',
    statusDark: true,

    open(root, params) {
      let query = '';

      function topBar() {
        const input = h('input', {
          class: 'yt-search', placeholder: 'חיפוש או הדבקת קישור', value: query,
          onkeydown: e => { if (e.key === 'Enter') runSearch(input.value); },
        });
        return h('div', { class: 'yt-top' },
          h('button', { class: 'yt-logo', html: LOGO + '<span>YouTube</span>', onclick: () => { query = ''; homeView(); } }),
          input,
          iconBtn(icons.search, () => runSearch(input.value), 'חיפוש'),
        );
      }

      async function runSearch(text) {
        query = text.trim();
        const m = query.match(LINK_RE);
        if (m) {
          query = '';
          toast('טוען סרטון...');
          const video = await addFromLink(m[1]);
          watchView(video);
          return;
        }
        homeView();
      }

      function card(v) {
        return h('button', { class: 'yt-card', onclick: () => watchView(v) },
          h('img', { class: 'yt-thumb', src: thumb(v.id), alt: '', loading: 'lazy' }),
          h('div', { class: 'yt-card-info' },
            Phone.avatar(v.channel, 36),
            h('div', null,
              h('div', { class: 'yt-card-title', dir: 'auto' }, v.title),
              h('div', { class: 'yt-card-channel', dir: 'auto' }, v.channel),
            ),
          ),
        );
      }

      function homeView() {
        const q = query.toLowerCase();
        const list = allVideos().filter(v => !q || (v.title + ' ' + v.channel).toLowerCase().includes(q));
        const body = list.length
          ? list.map(card)
          : h('div', { class: 'yt-empty' },
              h('p', null, `לא נמצא "${query}" ברשימה.`),
              h('p', null, 'אפשר להדביק כאן קישור של סרטון מיוטיוב והוא ינוגן בטלפון.'),
              h('a', { class: 'yt-ext', href: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query), target: '_blank', rel: 'noopener' }, 'לחפש ביוטיוב האמיתי ↗'),
            );
        root.replaceChildren(h('div', { class: 'view' }, topBar(), h('div', { class: 'scroll' }, body)));
      }

      function watchView(v) {
        root.replaceChildren(h('div', { class: 'view' },
          topBar(),
          h('div', { class: 'yt-player' },
            h('iframe', {
              src: `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0`,
              allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
              allowfullscreen: true, title: v.title,
            }),
          ),
          h('div', { class: 'scroll' },
            h('div', { class: 'yt-watch-info' },
              h('div', { class: 'yt-watch-title', dir: 'auto' }, v.title),
              h('div', { class: 'yt-watch-channel' }, Phone.avatar(v.channel, 32), h('span', { dir: 'auto' }, v.channel)),
            ),
            allVideos().filter(x => x.id !== v.id).map(card),
          ),
        ));
      }

      if (params.query) runSearch(params.query); else homeView();
    },
  });
})();
