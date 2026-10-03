'use strict';

(() => {
  const { h, store } = Phone;

  const N = 15;                 // גודל הלוח: 15x15 משבצות
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  };

  Phone.registerApp({
    id: 'snake',
    name: 'Snake',
    iconBg: 'linear-gradient(160deg,#aad751,#4a7a1e)',
    icon: '<svg viewBox="0 0 24 24"><path d="M4 17h9a3 3 0 0 0 0-6H9a1.5 1.5 0 0 1 0-3h8" fill="none" stroke="#4675e8" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.5" cy="8" r="1" fill="#fff"/><circle cx="19" cy="17" r="2.6" fill="#e7471d"/></svg>',
    bg: '#4a752c',
    top: '#4a752c',
    statusDark: false,

    open(root) {
      const canvas = h('canvas', { class: 'sn-board' });
      const scoreEl = h('span');
      const bestEl = h('span');
      const pad = dir => h('button', { class: 'sn-btn ' + dir, onpointerdown: e => { e.preventDefault(); turn(dir); }, 'aria-label': dir },
        h('span', { html: '<svg viewBox="0 0 24 24"><path d="M12 6 4 16h16z"/></svg>' }));

      root.replaceChildren(h('div', { class: 'view sn' },
        h('div', { class: 'sn-top' }, h('div', null, '🍎 ', scoreEl), h('div', null, '🏆 ', bestEl)),
        h('div', { class: 'sn-board-wrap' }, canvas),
        h('div', { class: 'sn-pad' }, pad('up'), pad('left'), pad('right'), pad('down')),
      ));
      const ctx = canvas.getContext('2d');

      let snake, dir, queue, food, score, best = store.get('snake:best', 0), state, timer, size = 300;

      function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        size = rect.width;
        canvas.width = canvas.height = size * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
      }

      function placeFood() {
        do { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; }
        while (snake.some(([x, y]) => x === food[0] && y === food[1]));
      }

      function reset() {
        snake = [[5, 7], [4, 7], [3, 7]];
        dir = 'right';
        queue = [];
        score = 0;
        state = 'ready';
        placeFood();
        updateScore();
        draw();
      }

      function updateScore() { scoreEl.textContent = score; bestEl.textContent = best; }

      function start() {
        state = 'playing';
        clearInterval(timer);
        timer = setInterval(step, 140);
      }

      function turn(next) {
        if (state === 'over') { reset(); return; }
        if (state === 'ready') start();
        const lastDir = queue.length ? queue[queue.length - 1] : dir;
        const [ax, ay] = DIRS[lastDir], [bx, by] = DIRS[next];
        if (ax + bx === 0 && ay + by === 0) return; // אסור להסתובב אחורה
        if (next !== lastDir && queue.length < 3) queue.push(next);
      }

      function step() {
        if (queue.length) dir = queue.shift();
        const [dx, dy] = DIRS[dir];
        const head = [snake[0][0] + dx, snake[0][1] + dy];
        const ate = head[0] === food[0] && head[1] === food[1];
        const body = ate ? snake : snake.slice(0, -1);
        if (head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N || body.some(([x, y]) => x === head[0] && y === head[1])) {
          state = 'over';
          clearInterval(timer);
          if (score > best) { best = score; store.set('snake:best', best); }
          updateScore();
          draw();
          return;
        }
        snake = [head, ...body];
        if (ate) { score++; updateScore(); placeFood(); }
        draw();
      }

      function draw() {
        if (!snake) return;
        const c = size / N;
        // לוח משובץ
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#a2d149' : '#aad751';
          ctx.fillRect(x * c, y * c, c, c);
        }
        // תפוח
        ctx.fillStyle = '#e7471d';
        ctx.beginPath(); ctx.arc(food[0] * c + c / 2, food[1] * c + c / 2 + 1, c * 0.38, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a752c';
        ctx.fillRect(food[0] * c + c / 2 - 1, food[1] * c + c * 0.1, 2.5, c * 0.22);
        // נחש
        snake.forEach(([x, y], i) => {
          ctx.fillStyle = i === 0 ? '#3b65d6' : '#4675e8';
          ctx.beginPath();
          ctx.roundRect(x * c + 1.5, y * c + 1.5, c - 3, c - 3, c * 0.3);
          ctx.fill();
        });
        // עיניים
        const [hx, hy] = snake[0], [dx, dy] = DIRS[dir];
        for (const side of [-1, 1]) {
          const ex = hx * c + c / 2 + dx * c * 0.15 + dy * side * c * 0.2;
          const ey = hy * c + c / 2 + dy * c * 0.15 + dx * side * c * 0.2;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(ex, ey, c * 0.14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(ex + dx * c * 0.05, ey + dy * c * 0.05, c * 0.07, 0, Math.PI * 2); ctx.fill();
        }
        if (state !== 'playing') {
          ctx.fillStyle = 'rgba(0,0,0,.45)';
          ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.font = `700 ${size / 9}px Rubik, Arial, sans-serif`;
          ctx.fillText(state === 'over' ? 'Game Over' : 'Snake', size / 2, size * 0.45);
          ctx.font = `500 ${size / 20}px Rubik, Arial, sans-serif`;
          ctx.fillText(state === 'over' ? `Score: ${score} — tap to play again` : 'Swipe, use the arrows or tap to start', size / 2, size * 0.58);
        }
      }

      // החלקה על הלוח
      let sx = null, sy = null;
      canvas.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
      canvas.addEventListener('pointerup', e => {
        if (sx == null) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        sx = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) {
          if (state === 'ready') start(); else if (state === 'over') reset();
          return;
        }
        turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      });
      canvas.style.touchAction = 'none';

      const onKey = e => {
        const d = KEYS[e.code];
        if (d) { e.preventDefault(); turn(d); }
        else if (e.code === 'Space') { e.preventDefault(); if (state === 'ready') start(); else if (state === 'over') reset(); }
      };
      document.addEventListener('keydown', onKey);
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);

      reset();
      resize();

      return () => { clearInterval(timer); document.removeEventListener('keydown', onKey); ro.disconnect(); };
    },
  });
})();
