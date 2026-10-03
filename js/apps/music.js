'use strict';

(() => {
  const { h, toast } = Phone;

  // ---------- שירים מובנים (מנגינות שהדפדפן מנגן בעצמו, בלי קבצים) ----------
  // כל תו: שם:פעמות  (R = שקט)
  const SONGS = [
    {
      title: 'שמחה לאלוהים', artist: 'בטהובן', bpm: 132, colors: ['#ff9a8b', '#ff6a88'], emoji: '🎻',
      notes: `E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2
              E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2
              D4 D4 E4 C4 D4 E4:0.5 F4:0.5 E4 C4 D4 E4:0.5 F4:0.5 E4 D4 C4 D4 G3:2
              E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2`,
    },
    {
      title: 'כוכב קטן', artist: 'שיר ילדים', bpm: 120, colors: ['#a18cd1', '#fbc2eb'], emoji: '⭐',
      notes: `C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2
              G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2
              C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2`,
    },
    {
      title: 'יום הולדת שמח', artist: 'שיר עממי', bpm: 110, colors: ['#f6d365', '#fda085'], emoji: '🎂',
      notes: `G4:0.75 G4:0.25 A4 G4 C5 B4:2
              G4:0.75 G4:0.25 A4 G4 D5 C5:2
              G4:0.75 G4:0.25 G5 E5 C5 B4 A4:2
              F5:0.75 F5:0.25 E5 C5 D5 C5:3`,
    },
    {
      title: 'לאליזה', artist: 'בטהובן', bpm: 120, colors: ['#43cea2', '#185a9d'], emoji: '🎹',
      notes: `E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5
              C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 G#4:0.5 B4:0.5 C5:1.5
              E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5
              C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 C5:0.5 B4:0.5 A4:3`,
    },
  ].map(s => ({ ...s, type: 'synth', notes: s.notes.trim().split(/\s+/).map(tok => {
    const [n, b] = tok.split(':');
    return [n, b ? parseFloat(b) : 1];
  }) }));

  const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(note) {
    const m = note.match(/^([A-G]#?)(\d)$/);
    if (!m) return 0;
    return 440 * 2 ** (((+m[2] + 1) * 12 + SEMI[m[1]] - 69) / 12);
  }

  // ---------- נגן — חי מחוץ לאפליקציה, כך שהמוזיקה ממשיכה גם כשיוצאים למסך הבית ----------
  const player = {
    tracks: [...SONGS],
    index: 0,
    playing: false,
    offset: 0,
    startedAt: 0,
    nodes: [],
    endTimer: null,
    ctx: null,
    audio: new Audio(),
    listeners: new Set(),

    get track() { return this.tracks[this.index]; },
    duration(t = this.track) {
      if (t.type === 'synth') return t.notes.reduce((s, [, b]) => s + b, 0) * 60 / t.bpm;
      return t === this.track && isFinite(this.audio.duration) ? this.audio.duration : 0;
    },
    position() {
      if (!this.playing) return this.offset;
      return this.track.type === 'synth' ? this.ctx.currentTime - this.startedAt : this.audio.currentTime;
    },
    emit() { this.listeners.forEach(fn => fn()); },

    play() {
      const t = this.track;
      if (t.type === 'synth') {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        this.ctx.resume();
        const spb = 60 / t.bpm, base = this.ctx.currentTime + 0.05;
        let time = 0;
        for (const [note, beats] of t.notes) {
          const len = beats * spb;
          if (time >= this.offset - 0.01 && note !== 'R') this.voice(freq(note), base + time - this.offset, len);
          time += len;
        }
        this.startedAt = base - this.offset;
        this.endTimer = setTimeout(() => this.next(), (time - this.offset) * 1000 + 400);
      } else {
        if (this.audio.src !== t.url) this.audio.src = t.url;
        this.audio.currentTime = this.offset;
        this.audio.play().catch(() => {});
      }
      this.playing = true;
      this.emit();
    },
    voice(f, when, len) {
      const ctx = this.ctx;
      const g = ctx.createGain();
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.28, when + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, when + len * 0.95 + 0.25);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o1.type = 'triangle'; o1.frequency.value = f;
      o2.type = 'sine'; o2.frequency.value = f * 2; g2.gain.value = 0.3;
      o1.connect(g); o2.connect(g2).connect(g);
      for (const o of [o1, o2]) { o.start(when); o.stop(when + len + 0.3); this.nodes.push(o); }
    },
    stopSound() {
      clearTimeout(this.endTimer);
      this.nodes.forEach(o => { try { o.stop(); } catch { /* כבר נעצר */ } });
      this.nodes = [];
      this.audio.pause();
    },
    pause() {
      if (!this.playing) return;
      this.offset = this.position();
      this.stopSound();
      this.playing = false;
      this.emit();
    },
    toggle() { this.playing ? this.pause() : this.play(); },
    seek(sec) {
      const was = this.playing;
      if (was) { this.stopSound(); this.playing = false; }
      this.offset = Math.max(0, sec);
      if (was) this.play(); else this.emit();
    },
    select(i, autoplay = true) {
      this.stopSound();
      this.playing = false;
      this.index = (i + this.tracks.length) % this.tracks.length;
      this.offset = 0;
      if (autoplay) this.play(); else this.emit();
    },
    next() { this.select(this.index + 1); },
    prev() { this.position() > 3 ? this.seek(0) : this.select(this.index - 1); },
  };
  player.audio.addEventListener('ended', () => player.next());
  player.audio.addEventListener('loadedmetadata', () => player.emit());

  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const art = (t, cls) => h('div', { class: cls, style: { background: `linear-gradient(135deg,${t.colors[0]},${t.colors[1]})` } }, t.emoji);

  const SVG = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M5 5v14l9-7zm10 0h3v14h-3z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M19 5v14l-9-7zM9 5H6v14h3z"/></svg>',
  };

  Phone.registerApp({
    id: 'music',
    name: 'מוזיקה',
    iconBg: 'linear-gradient(160deg,#ff5f6d,#fc2c55)',
    icon: '<svg viewBox="0 0 24 24"><path d="M20 3v12.5a3 3 0 1 1-2-2.8V7.4l-8 1.7v8.4a3 3 0 1 1-2-2.8V5.4z"/></svg>',
    bg: '#121212',
    top: '#121212',
    statusDark: false,

    open(root) {
      const fileInput = h('input', {
        type: 'file', accept: 'audio/*', multiple: true, hidden: true,
        onchange: () => {
          const palette = [['#30cfd0', '#330867'], ['#667eea', '#764ba2'], ['#f093fb', '#f5576c'], ['#5ee7df', '#b490ca']];
          for (const f of fileInput.files) {
            player.tracks.push({
              type: 'file', url: URL.createObjectURL(f), title: f.name.replace(/\.[^.]+$/, ''),
              artist: 'מהמכשיר שלי', emoji: '🎵', colors: palette[player.tracks.length % palette.length],
            });
          }
          if (fileInput.files.length) toast('נוספו ' + fileInput.files.length + ' שירים');
          fileInput.value = '';
          renderList();
        },
      });

      const artWrap = h('div', { class: 'mu-art-wrap' });
      const titleEl = h('div', { class: 'mu-title', dir: 'auto' });
      const artistEl = h('div', { class: 'mu-artist', dir: 'auto' });
      const seek = h('input', { type: 'range', class: 'mu-seek', min: 0, max: 1000, value: 0, dir: 'ltr' });
      const curEl = h('span'), durEl = h('span');
      const playBtn = h('button', { class: 'mu-play', onclick: () => player.toggle(), 'aria-label': 'נגן/השהה' });
      const listEl = h('div', { class: 'mu-list' });
      let dragging = false;

      seek.addEventListener('input', () => { dragging = true; curEl.textContent = fmt(seek.value / 1000 * player.duration()); });
      seek.addEventListener('change', () => { dragging = false; player.seek(seek.value / 1000 * player.duration()); });

      function renderList() {
        listEl.replaceChildren(...player.tracks.map((t, i) =>
          h('button', { class: 'mu-row' + (i === player.index ? ' active' : ''), onclick: () => player.select(i) },
            art(t, 'mu-row-art'),
            h('div', { class: 'mu-row-text' },
              h('div', { class: 'mu-row-title', dir: 'auto' }, t.title),
              h('div', { class: 'mu-row-artist', dir: 'auto' }, t.artist)),
            h('span', { class: 'mu-row-eq' }, i === player.index && player.playing ? '▶' : ''),
          )));
      }

      function render() {
        const t = player.track;
        artWrap.replaceChildren(art(t, 'mu-art' + (player.playing ? ' playing' : '')));
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
        h('div', { class: 'app-header' },
          h('div', { class: 'title' }, 'מוזיקה'),
          h('button', { class: 'text-btn', onclick: () => fileInput.click() }, '+ הוספת שירים'),
          fileInput,
        ),
        h('div', { class: 'scroll' },
          h('div', { class: 'mu-now' },
            artWrap, titleEl, artistEl, seek,
            h('div', { class: 'mu-times', dir: 'ltr' }, curEl, durEl),
            h('div', { class: 'mu-controls', dir: 'ltr' },
              h('button', { class: 'mu-skip', html: SVG.prev, onclick: () => player.prev(), 'aria-label': 'הקודם' }),
              playBtn,
              h('button', { class: 'mu-skip', html: SVG.next, onclick: () => player.next(), 'aria-label': 'הבא' }),
            ),
          ),
          h('div', { class: 'mu-list-title' }, 'כל השירים'),
          listEl,
        ),
      ));
      render();

      return () => { cancelAnimationFrame(raf); player.listeners.delete(render); };
    },
  });
})();
