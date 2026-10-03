'use strict';

(() => {
  const { h, icons, store, toast } = Phone;

  // השירים. id = 11 התווים שאחרי v= בקישור של יוטיוב
  const SONGS = [
    { id: '8JiPi_TUZug', title: 'Background Music for Focus and Concentration, Study Music, Focus Music', artist: 'Greenred Productions', dur: '1:19:58' },
    { id: 'KtlgYxa6BMU', title: 'The Night We Met', artist: 'Lord Huron', dur: '3:29' },
    { id: 'QRMIgT3thFM', title: 'Peaceful Easy Feeling', artist: 'Eagles', dur: '4:18' },
    { id: 'Zi_XLOBDo_Y', title: 'Billie Jean', artist: 'Michael Jackson', dur: '4:54' },
    { id: 'y6ryaQ6Gtpg', title: 'Mozart\'s Rondo alla Turca', artist: 'International Free Music', dur: '5:36' },
  ];

  const LINK_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/;
  const thumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const toSec = s => (s || '').split(':').reduce((a, n) => a * 60 + (+n || 0), 0);
  const fmt = s => {
    s = Math.floor(s || 0);
    const hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = String(s % 60).padStart(2, '0');
    return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
  };

  // ---------- טעינת נגן היוטיוב ----------
  let apiPromise = null;
  function loadYouTubeAPI() {
    if (!apiPromise) {
      apiPromise = new Promise(resolve => {
        if (window.YT && window.YT.Player) return resolve();
        window.onYouTubeIframeAPIReady = resolve;
        document.head.append(h('script', { src: 'https://www.youtube.com/iframe_api' }));
      });
    }
    return apiPromise;
  }

  // ---------- הנגן — חי מחוץ לאפליקציה, כך שהמוזיקה ממשיכה גם במסך הבית ----------
  const player = {
    tracks: [...store.get('music:added', []), ...SONGS],
    index: 0,
    playing: false,
    yt: null,
    ready: null,
    listeners: new Set(),

    get track() { return this.tracks[this.index]; },
    emit() { this.listeners.forEach(fn => fn()); },
    duration() {
      const d = this.yt && this.yt.getDuration ? this.yt.getDuration() : 0;
      return d || toSec(this.track.dur);
    },
    position() { return this.yt && this.yt.getCurrentTime ? this.yt.getCurrentTime() : 0; },

    // יוצרים את הנגן מראש, כדי שלחיצה על "נגן" תעבוד מיד גם בטלפון
    init() {
      if (this.ready) return this.ready;
      const holder = h('div');
      document.body.append(h('div', { class: 'mu-hidden-player' }, holder));
      this.ready = loadYouTubeAPI().then(() => new Promise(resolve => {
        new YT.Player(holder, {
          width: 200, height: 200, videoId: this.track.id,
          playerVars: { playsinline: 1, controls: 0, rel: 0 },
          events: {
            onReady: e => { this.yt = e.target; resolve(); },
            onStateChange: e => {
              if (e.data === YT.PlayerState.PLAYING) this.playing = true;
              else if (e.data === YT.PlayerState.PAUSED) this.playing = false;
              else if (e.data === YT.PlayerState.ENDED) { this.playing = false; this.next(); return; }
              this.emit();
            },
            onError: () => { this.playing = false; toast('This song can\'t be played here'); this.emit(); },
          },
        });
      }));
      return this.ready;
    },
    select(i) {
      this.index = (i + this.tracks.length) % this.tracks.length;
      if (this.yt) { this.yt.loadVideoById(this.track.id); this.playing = true; }
      else this.init().then(() => this.yt.loadVideoById(this.track.id));
      Phone.emit('media', 'music');
      this.emit();
    },
    toggle() {
      if (!this.yt) return;
      if (this.playing) this.yt.pauseVideo();
      else { this.yt.playVideo(); Phone.emit('media', 'music'); }
      this.playing = !this.playing;
      this.emit();
    },
    pause() { if (this.yt && this.playing) { this.yt.pauseVideo(); this.playing = false; this.emit(); } },
    seek(sec) { if (this.yt) this.yt.seekTo(sec, true); },
    next() { this.select(this.index + 1); },
    prev() { this.position() > 3 ? this.seek(0) : this.select(this.index - 1); },
  };
  // כשסרטון ביוטיוב מתחיל — המוזיקה נעצרת
  Phone.on('media', who => { if (who !== 'music') player.pause(); });

  async function addSong() {
    const link = prompt('Paste a YouTube / YouTube Music link:');
    if (!link) return;
    const m = link.match(LINK_RE);
    if (!m) { toast('That doesn\'t look like a YouTube link'); return; }
    let song = { id: m[1], title: 'New song', artist: 'YouTube', dur: '' };
    try {
      const data = await (await fetch('https://noembed.com/embed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + m[1]))).json();
      if (data.title) song = { ...song, title: data.title, artist: data.author_name || 'YouTube' };
    } catch { /* בלי שם — לא נורא */ }
    store.set('music:added', [song, ...store.get('music:added', [])]);
    player.tracks.unshift(song);
    player.index++; // השיר הנוכחי זז מקום אחד למטה
    toast('Song added');
    player.emit();
  }

  const LOGO = '<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="12" fill="#f00"/><circle cx="12" cy="12" r="6.3" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M10 9v6l5-3z" fill="#fff"/></svg>';
  const SVG = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M5 5v14l9-7zm10 0h3v14h-3z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M19 5v14l-9-7zM9 5H6v14h3z"/></svg>',
  };

  Phone.registerApp({
    id: 'music',
    name: 'YT Music',
    iconBg: '#f00',
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M10 8.8v6.4l5.3-3.2z" fill="#fff"/></svg>',
    bg: '#030303',
    top: '#030303',
    statusDark: false,

    open(root) {
      player.init();

      const artEl = h('img', { class: 'mu-art', alt: '' });
      const titleEl = h('div', { class: 'mu-title' });
      const artistEl = h('div', { class: 'mu-artist' });
      const seek = h('input', { type: 'range', class: 'mu-seek', min: 0, max: 1000, value: 0 });
      const curEl = h('span'), durEl = h('span');
      const playBtn = h('button', {
        class: 'mu-play', 'aria-label': 'Play/Pause',
        onclick: () => (player.yt && player.yt.getPlayerState() !== YT.PlayerState.CUED && player.yt.getPlayerState() !== -1)
          ? player.toggle() : player.select(player.index),
      });
      const listEl = h('div', { class: 'mu-list' });
      let dragging = false;

      seek.addEventListener('input', () => { dragging = true; curEl.textContent = fmt(seek.value / 1000 * player.duration()); });
      seek.addEventListener('change', () => { dragging = false; player.seek(seek.value / 1000 * player.duration()); });

      function renderList() {
        listEl.replaceChildren(...player.tracks.map((t, i) =>
          h('div', { class: 'mu-row' + (i === player.index ? ' active' : '') },
            h('button', { class: 'mu-row-main', onclick: () => player.select(i) },
              h('img', { class: 'mu-row-art', src: thumb(t.id), alt: '', loading: 'lazy' }),
              h('div', { class: 'mu-row-text' },
                h('div', { class: 'mu-row-title' }, t.title),
                h('div', { class: 'mu-row-artist' }, [t.dur, t.artist].filter(Boolean).join(' • '))),
            ),
            h('button', { class: 'mu-row-more', html: icons.dots, 'aria-label': 'More' }),
          )));
      }

      function render() {
        const t = player.track;
        if (artEl.getAttribute('src') !== thumb(t.id)) artEl.src = thumb(t.id);
        artEl.classList.toggle('playing', player.playing);
        titleEl.textContent = t.title;
        artistEl.textContent = t.artist;
        playBtn.innerHTML = player.playing ? SVG.pause : SVG.play;
        renderList();
        tick();
      }

      function tick() {
        const d = player.duration(), p = Math.min(player.position(), d || 0);
        if (!dragging) {
          seek.value = d ? Math.round(p / d * 1000) : 0;
          curEl.textContent = fmt(p);
        }
        durEl.textContent = d ? fmt(d) : '--:--';
      }

      let raf;
      const loop = () => { tick(); raf = requestAnimationFrame(loop); };
      player.listeners.add(render);
      loop();

      root.replaceChildren(h('div', { class: 'view mu' },
        h('div', { class: 'mu-header', html: LOGO + '<span>Music</span>' }),
        h('div', { class: 'scroll' },
          h('div', { class: 'mu-now' },
            artEl, titleEl, artistEl, seek,
            h('div', { class: 'mu-times' }, curEl, durEl),
            h('div', { class: 'mu-controls' },
              h('button', { class: 'mu-skip', html: SVG.prev, onclick: () => player.prev(), 'aria-label': 'Previous' }),
              playBtn,
              h('button', { class: 'mu-skip', html: SVG.next, onclick: () => player.next(), 'aria-label': 'Next' }),
            ),
          ),
          h('button', { class: 'mu-add', onclick: addSong }, h('span', { html: icons.plus }), 'Add song'),
          listEl,
        ),
      ));
      render();

      return () => { cancelAnimationFrame(raf); player.listeners.delete(render); };
    },
  });
})();
