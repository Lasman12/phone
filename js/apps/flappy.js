'use strict';

(() => {
  const { h, store } = Phone;

  // מספרים של המשחק (ביחידות "לוגיות" — רוחב המסך תמיד 360)
  const W = 360, GROUND = 70, BIRD_X = 95, R = 15;
  const GRAVITY = 1500, FLAP = -440, SPEED = 165, GAP = 155, PIPE_W = 62, PIPE_EVERY = 1.45;

  Phone.registerApp({
    id: 'flappy',
    name: 'Flappy Bird',
    iconBg: 'linear-gradient(180deg,#4ec0ca,#8fd9df)',
    icon: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="13" rx="8" ry="6.5" fill="#f8d32b" stroke="#000" stroke-width=".8"/><ellipse cx="8.6" cy="14" rx="3.6" ry="2.4" fill="#fff6c8" stroke="#000" stroke-width=".6"/><circle cx="15" cy="10.3" r="2.6" fill="#fff" stroke="#000" stroke-width=".6"/><circle cx="15.8" cy="10.4" r="1" fill="#000"/><path d="M16.5 13.5h5.5l-1 2.6h-4.5z" fill="#f2711c" stroke="#000" stroke-width=".6"/></svg>',
    bg: '#4ec0ca',
    top: '#4ec0ca',
    statusDark: false,

    open(root) {
      const canvas = h('canvas', { class: 'game-canvas' });
      const wrap = h('div', { class: 'game-wrap' }, canvas);
      root.replaceChildren(h('div', { class: 'view' }, wrap));
      const ctx = canvas.getContext('2d');

      let scale = 1, H = 640;
      let state = 'ready', bird, pipes, score, best = store.get('flappy:best', 0), spawn, groundX = 0, t = 0;

      function resize() {
        // clientWidth לא מושפע מאנימציית הפתיחה של האפליקציה
        const w = wrap.clientWidth, hgt = wrap.clientHeight;
        if (!w || !hgt) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(hgt * dpr);
        scale = w / W;
        H = hgt / scale;
        ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      }

      function reset() {
        bird = { y: H * 0.42, vy: 0 };
        pipes = [];
        score = 0;
        spawn = 0.6;
        state = 'ready';
      }

      function flap() {
        if (state === 'over') { if (t > 0.5) reset(); return; }
        if (state === 'ready') state = 'playing';
        bird.vy = FLAP;
      }

      function update(dt) {
        const playH = H - GROUND;
        if (state !== 'over') groundX = (groundX - SPEED * dt) % 24;
        if (state === 'ready') { bird.y = playH * 0.45 + Math.sin(performance.now() / 250) * 8; return; }
        if (state === 'over') {
          t += dt;
          if (bird.y < playH - R) { bird.vy += GRAVITY * dt; bird.y = Math.min(playH - R, bird.y + bird.vy * dt); }
          return;
        }
        bird.vy += GRAVITY * dt;
        bird.y += bird.vy * dt;

        spawn -= dt;
        if (spawn <= 0) {
          spawn = PIPE_EVERY;
          const top = 70 + Math.random() * (playH - GAP - 140);
          pipes.push({ x: W + 10, top, passed: false });
        }
        for (const p of pipes) {
          p.x -= SPEED * dt;
          if (!p.passed && p.x + PIPE_W < BIRD_X) { p.passed = true; score++; }
          const hitX = BIRD_X + R - 3 > p.x && BIRD_X - R + 3 < p.x + PIPE_W;
          const hitY = bird.y - R + 3 < p.top || bird.y + R - 3 > p.top + GAP;
          if (hitX && hitY) die();
        }
        pipes = pipes.filter(p => p.x > -PIPE_W - 10);
        if (bird.y + R >= playH) { bird.y = playH - R; die(); }
        if (bird.y < -40) bird.y = -40;
      }

      function die() {
        if (state === 'over') return;
        state = 'over';
        t = 0;
        if (score > best) { best = score; store.set('flappy:best', best); }
      }

      // ---------- ציור ----------
      function text(str, x, y, size, align = 'center') {
        ctx.font = `700 ${size}px Rubik, Arial, sans-serif`;
        ctx.textAlign = align;
        ctx.lineWidth = size / 6;
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineJoin = 'round';
        ctx.strokeText(str, x, y);
        ctx.fillStyle = '#fff';
        ctx.fillText(str, x, y);
      }

      function drawPipe(x, y, hgt, flip) {
        const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
        g.addColorStop(0, '#5fa83b'); g.addColorStop(.35, '#9be15d'); g.addColorStop(1, '#4a8c2a');
        ctx.fillStyle = g;
        ctx.strokeStyle = '#2e5a1a';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, PIPE_W, hgt);
        ctx.strokeRect(x, y, PIPE_W, hgt);
        const capY = flip ? y + hgt - 26 : y;
        ctx.fillRect(x - 4, capY, PIPE_W + 8, 26);
        ctx.strokeRect(x - 4, capY, PIPE_W + 8, 26);
      }

      function drawBird() {
        ctx.save();
        ctx.translate(BIRD_X, bird.y);
        const angle = state === 'ready' ? 0 : Math.max(-0.45, Math.min(1.3, bird.vy / 600));
        ctx.rotate(angle);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        // גוף
        ctx.fillStyle = '#f8d32b';
        ctx.beginPath(); ctx.ellipse(0, 0, R + 3, R, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // כנף (מנופפת)
        const wing = Math.sin(performance.now() / 70) * 4;
        ctx.fillStyle = '#fff6c8';
        ctx.beginPath(); ctx.ellipse(-6, 3 + wing, 8, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // עין
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(7, -5, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(9, -5, 2.4, 0, Math.PI * 2); ctx.fill();
        // מקור
        ctx.fillStyle = '#f2711c';
        ctx.beginPath(); ctx.roundRect(8, 2, 14, 7, 3); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      function draw() {
        const playH = H - GROUND;
        // שמיים
        ctx.fillStyle = '#4ec0ca';
        ctx.fillRect(0, 0, W, H);
        // עננים ובניינים ברקע
        ctx.fillStyle = '#e9fcd9';
        for (let i = 0; i < 8; i++) {
          ctx.beginPath(); ctx.arc(i * 55 + 10, playH - 70, 34, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#a8e6b4';
        for (let i = 0; i < 9; i++) ctx.fillRect(i * 42, playH - 55 - (i * 37 % 30), 34, 60);
        ctx.fillStyle = '#5ee270';
        ctx.fillRect(0, playH - 12, W, 12);

        for (const p of pipes) {
          drawPipe(p.x, -4, p.top + 4, true);
          drawPipe(p.x, p.top + GAP, playH - p.top - GAP, false);
        }

        // אדמה
        ctx.fillStyle = '#ded895';
        ctx.fillRect(0, playH, W, GROUND);
        ctx.fillStyle = '#73bf2e';
        ctx.fillRect(0, playH, W, 14);
        ctx.fillStyle = '#9ce659';
        for (let x = groundX; x < W; x += 24) {
          ctx.beginPath(); ctx.moveTo(x, playH + 14); ctx.lineTo(x + 12, playH); ctx.lineTo(x + 24, playH); ctx.lineTo(x + 12, playH + 14); ctx.fill();
        }
        ctx.fillStyle = '#5a8f22';
        ctx.fillRect(0, playH, W, 2);

        drawBird();

        if (state === 'playing') text(String(score), W / 2, 90, 52);
        if (state === 'ready') {
          text('Flappy Bird', W / 2, H * 0.22, 44);
          text('Tap to start', W / 2, H * 0.62, 24);
          text(`Best: ${best}`, W / 2, H * 0.62 + 36, 20);
        }
        if (state === 'over') {
          text('Game Over', W / 2, H * 0.24, 46);
          ctx.fillStyle = '#ded895';
          ctx.strokeStyle = '#543847';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.roundRect(W / 2 - 110, H * 0.3, 220, 120, 12); ctx.fill(); ctx.stroke();
          ctx.font = '600 18px Rubik, Arial, sans-serif';
          ctx.fillStyle = '#e86101';
          ctx.textAlign = 'center';
          ctx.fillText('SCORE', W / 2 - 50, H * 0.3 + 34);
          ctx.fillText('BEST', W / 2 + 50, H * 0.3 + 34);
          text(String(score), W / 2 - 50, H * 0.3 + 82, 36);
          text(String(best), W / 2 + 50, H * 0.3 + 82, 36);
          if (score > 0 && score === best) text('New best!', W / 2, H * 0.3 + 150, 20);
          if (t > 0.5) text('Tap to play again', W / 2, H * 0.62, 24);
        }
      }

      let last = performance.now(), raf;
      function loop(now) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        update(dt);
        draw();
        raf = requestAnimationFrame(loop);
      }

      const onKey = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); } };
      canvas.addEventListener('pointerdown', e => { e.preventDefault(); flap(); });
      document.addEventListener('keydown', onKey);
      const ro = new ResizeObserver(() => { resize(); if (state === 'ready') reset(); });
      ro.observe(wrap);

      resize();
      reset();
      raf = requestAnimationFrame(loop);

      return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); ro.disconnect(); };
    },
  });
})();
