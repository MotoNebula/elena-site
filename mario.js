(function () {
  'use strict';

  const canvas = document.getElementById('marioCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const POSITIVE = [
    'вера в себя', 'личные границы', 'смелость быть собой',
    'сепарация', 'свои ценности', 'внутренние опоры',
    'своя сила', 'интеграция'
  ];
  const NEGATIVE = [
    'детские травмы', 'тревога', 'стыд', 'одиночество',
    'обида', 'гнев', 'изоляция', 'подавленные чувства'
  ];

  let W, H, GROUND;
  let posI = 0, negI = 0;

  const MARIO_X = 140;
  const SPAWN_INTERVAL = 320;

  function resize() {
    W = canvas.parentElement.offsetWidth;
    H = Math.min(340, Math.max(230, W * 0.36));
    canvas.width  = W;
    canvas.height = H;
    GROUND = H - 55;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── state ── */
  let worldX   = 0;
  let tick     = 0;
  let walkF    = 0;
  let marioY   = 0; // offset from GROUND (<=0)
  let marioVY  = 0;
  let jumping  = false;
  let objects  = [];
  let nextSpawn = 80;
  let spawnCoin = true;

  /* ── star seed (fixed, parallax) ── */
  const STARS = Array.from({ length: 30 }, () => ({
    x: Math.random() * 3000,
    y: Math.random() * 0.65,
    r: Math.random() > 0.7 ? 1.5 : 1,
  }));

  /* ─────────────────────── DRAW HELPERS ─────────────────────── */

  function s(n) { return n * Math.max(1.3, H / 220); }

  function fillRR(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
    ctx.fill();
  }

  function drawMario(x, gy, frame, jump) {
    /* feet baseline = gy */
    const lOff = jump ? 0 : (frame === 1 ? -s(3) : frame === 2 ? s(3) : 0);
    const rOff = -lOff;

    /* shoes */
    ctx.fillStyle = '#3B1F07';
    if (jump) {
      ctx.fillRect(x - s(13), gy - s(8),  s(12), s(7));
      ctx.fillRect(x + s(1),  gy - s(13), s(12), s(7));
    } else {
      ctx.fillRect(x - s(14) + lOff, gy - s(7), s(13), s(7));
      ctx.fillRect(x + s(1)  + rOff, gy - s(7), s(13), s(7));
    }

    /* legs */
    ctx.fillStyle = '#1A3DAA';
    if (jump) {
      ctx.fillRect(x - s(10), gy - s(22), s(8), s(14));
      ctx.fillRect(x + s(2),  gy - s(27), s(8), s(14));
    } else {
      ctx.fillRect(x - s(10) + lOff, gy - s(23), s(8), s(16));
      ctx.fillRect(x + s(2)  + rOff, gy - s(23), s(8), s(16));
    }

    /* overalls bib */
    ctx.fillStyle = '#1A3DAA';
    ctx.fillRect(x - s(8), gy - s(37), s(16), s(15));

    /* shirt (arms/sides) */
    ctx.fillStyle = '#CC2200';
    if (jump) {
      ctx.fillRect(x - s(18), gy - s(47), s(10), s(10));
      ctx.fillRect(x + s(8),  gy - s(47), s(10), s(10));
    } else {
      ctx.fillRect(x - s(15), gy - s(39), s(7), s(10));
      ctx.fillRect(x + s(8),  gy - s(39), s(7), s(10));
    }

    /* face */
    ctx.fillStyle = '#FFBA78';
    ctx.fillRect(x - s(8), gy - s(51), s(16), s(14));

    /* eyes */
    ctx.fillStyle = '#1A0A00';
    ctx.fillRect(x - s(5), gy - s(48), s(4), s(4));
    ctx.fillRect(x + s(1), gy - s(48), s(4), s(4));

    /* mustache */
    ctx.fillStyle = '#6B3A1F';
    ctx.fillRect(x - s(7), gy - s(42), s(14), s(3));

    /* hat brim */
    ctx.fillStyle = '#CC2200';
    ctx.fillRect(x - s(12), gy - s(56), s(24), s(5));
    /* hat crown */
    ctx.fillRect(x - s(9),  gy - s(64), s(18), s(8));
  }

  function drawGoomba(x, gy, squished) {
    if (squished) {
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.ellipse(x, gy - s(4), s(20), s(4), 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      /* body */
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.ellipse(x, gy - s(18), s(18), s(18), 0, 0, Math.PI * 2);
      ctx.fill();
      /* whites */
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(x - s(6), gy - s(22), s(5), s(5.5), 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + s(6), gy - s(22), s(5), s(5.5), 0, 0, Math.PI * 2); ctx.fill();
      /* pupils */
      ctx.fillStyle = '#1A0A00';
      ctx.beginPath(); ctx.ellipse(x - s(5), gy - s(22), s(3), s(3.5), 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + s(5), gy - s(22), s(3), s(3.5), 0, 0, Math.PI * 2); ctx.fill();
      /* angry brows */
      ctx.strokeStyle = '#1A0A00';
      ctx.lineWidth = s(1.5);
      ctx.beginPath(); ctx.moveTo(x - s(11), gy - s(28)); ctx.lineTo(x - s(1), gy - s(25)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s(1),  gy - s(25)); ctx.lineTo(x + s(11), gy - s(28)); ctx.stroke();
      /* feet */
      ctx.fillStyle = '#5C2E0A';
      ctx.fillRect(x - s(20), gy - s(7), s(14), s(7));
      ctx.fillRect(x + s(6),  gy - s(7), s(14), s(7));
    }
  }

  function drawBlock(x, y, bumped) {
    const off = bumped ? -s(7) : 0;
    const bx = x - s(18), by = y + off, bw = s(36), bh = s(36);

    ctx.fillStyle = bumped ? '#7A5E00' : '#C8920A';
    ctx.fillRect(bx, by, bw, bh);

    ctx.fillStyle = bumped ? '#5C4500' : '#DDA800';
    ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);

    ctx.fillStyle = bumped ? '#4A3800' : '#8B6200';
    ctx.font = `bold ${s(18)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bumped ? '!' : '?', x, by + bh / 2);
  }

  function drawCoin(x, y, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#C8A000';
    ctx.lineWidth = s(1.5);
    ctx.beginPath();
    ctx.ellipse(x, y, s(7), s(10), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(x - s(2), y - s(2), s(2.5), s(4), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawRock(x, y) {
    ctx.fillStyle = '#8E8E8E';
    ctx.strokeStyle = '#5C5C5C';
    ctx.lineWidth = s(1.5);
    ctx.beginPath();
    ctx.moveTo(x,        y - s(22));
    ctx.lineTo(x + s(16), y - s(9));
    ctx.lineTo(x + s(13), y);
    ctx.lineTo(x - s(13), y);
    ctx.lineTo(x - s(16), y - s(9));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(x - s(4), y - s(20));
    ctx.lineTo(x + s(5), y - s(12));
    ctx.lineTo(x - s(2), y - s(10));
    ctx.closePath();
    ctx.fill();
  }

  function drawLabel(text, x, y, textColor, bg) {
    ctx.font = `${Math.min(12, Math.max(9, H / 26))}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    const pw = tw + s(14), ph = s(22);

    ctx.fillStyle = bg;
    fillRR(x - pw / 2, y - ph / 2, pw, ph, s(5));
    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
  }

  function drawBackground() {
    /* sky gradient */
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,   '#150B22');
    g.addColorStop(0.6, '#2D1B4E');
    g.addColorStop(1,   '#1a0f25');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* parallax stars */
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const st of STARS) {
      const sx = ((st.x - worldX * 0.06) % W + W) % W;
      const sy = st.y * (GROUND - 20);
      ctx.beginPath();
      ctx.arc(sx, sy, st.r, 0, Math.PI * 2);
      ctx.fill();
    }

    /* ground */
    ctx.fillStyle = '#2E1C42';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#5A4070';
    ctx.fillRect(0, GROUND, W, 3);

    /* subtle brick rows */
    const bw = 70, bh = 18;
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let row = 0; row < 2; row++) {
      const oy = row === 0 ? 3 : 3 + bh + 1;
      const shift = row % 2 === 0 ? 0 : bw / 2;
      for (let bx = -((worldX + shift) % bw) - bw; bx < W + bw; bx += bw) {
        ctx.fillRect(bx, GROUND + oy, bw - 2, bh - 1);
      }
    }
  }

  /* ─────────────────────── SPAWN ─────────────────────────── */

  function spawnObject() {
    if (spawnCoin) {
      objects.push({
        type: 'block',
        wx: worldX + W + 40,
        y: GROUND - s(80) - Math.random() * s(30),
        state: 'idle',
        bumpT: 0,
        label: POSITIVE[posI++ % POSITIVE.length],
        coin: null,
      });
    } else {
      const isRock = Math.random() > 0.45;
      const label  = NEGATIVE[negI++ % NEGATIVE.length];
      if (isRock) {
        objects.push({
          type: 'rock',
          wx: worldX + MARIO_X + s(160),
          y: s(15),
          vy: 1.6,
          state: 'falling',
          label,
          la: 0, lt: 0,
        });
      } else {
        objects.push({
          type: 'goomba',
          wx: worldX + W + 40,
          y: GROUND,
          state: 'walk',
          st: 0,
          label,
          la: 0,
        });
      }
    }
    spawnCoin = !spawnCoin;
    nextSpawn = worldX + SPAWN_INTERVAL + Math.random() * 100;
  }

  /* ─────────────────────── UPDATE ─────────────────────────── */

  function update() {
    tick++;
    worldX += 2.5;
    if (tick % 8 === 0) walkF = (walkF + 1) % 3;

    /* mario physics */
    if (jumping) {
      marioY  += marioVY;
      marioVY += 0.55;
      if (marioY >= 0) { marioY = 0; marioVY = 0; jumping = false; }
    }

    if (worldX >= nextSpawn) spawnObject();

    objects = objects.filter(o => {
      const sx = o.wx - worldX;

      if (o.type === 'block') {
        if (o.state === 'idle' && Math.abs(sx - MARIO_X) < s(30)) {
          o.state = 'bumped';
          o.coin = { y: o.y - s(15), vy: -s(4), la: 1 };
        }
        if (o.state === 'bumped') o.bumpT++;
        if (o.coin) {
          o.coin.y  += o.coin.vy;
          o.coin.vy += 0.12;
          if (o.coin.vy > 0) o.coin.la -= 0.014;
          if (o.coin.la <= 0) o.coin = null;
        }
        return sx > -s(60);
      }

      if (o.type === 'goomba') {
        if (o.state === 'walk') {
          o.wx -= 1.5;
          if (Math.abs(sx - MARIO_X) < s(36) && !jumping) {
            o.state = 'squish'; o.st = 0; o.la = 1;
            jumping = true; marioVY = -s(9);
          }
        } else {
          o.st++;
          o.la -= 0.008;
          if (o.st > 100) return false;
        }
        return sx > -s(60);
      }

      if (o.type === 'rock') {
        if (o.state === 'falling') {
          o.y  += o.vy;
          o.vy += 0.07;
          if (o.y >= GROUND) {
            o.y = GROUND; o.state = 'land'; o.la = 1; o.lt = 0;
            if (Math.abs(sx - MARIO_X) < s(55) && !jumping) {
              jumping = true; marioVY = -s(9);
            }
          }
        } else {
          o.lt++; o.la -= 0.008;
          if (o.lt > 100) return false;
        }
        return sx > -s(80);
      }

      return false;
    });
  }

  /* ─────────────────────── DRAW ───────────────────────────── */

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    for (const o of objects) {
      const sx = o.wx - worldX;
      if (sx < -s(80) || sx > W + s(80)) continue;

      if (o.type === 'block') {
        drawBlock(sx, o.y, o.state === 'bumped');
        if (o.coin) {
          drawCoin(sx, o.coin.y, o.coin.la);
          if (o.coin.la > 0.25) {
            ctx.globalAlpha = Math.min(1, o.coin.la * 1.5);
            drawLabel(o.label, sx, o.coin.y - s(24), '#1B6B2E', 'rgba(255,255,255,0.93)');
            ctx.globalAlpha = 1;
          }
        }
      }

      if (o.type === 'goomba') {
        drawGoomba(sx, o.y, o.state === 'squish');
        if (o.la > 0 && o.state === 'squish') {
          ctx.globalAlpha = o.la;
          drawLabel(o.label, sx, o.y - s(38), '#8B0000', 'rgba(255,220,220,0.93)');
          ctx.globalAlpha = 1;
        }
      }

      if (o.type === 'rock') {
        drawRock(sx, o.y);
        if (o.la > 0 && o.state === 'land') {
          ctx.globalAlpha = o.la;
          drawLabel(o.label, sx, o.y - s(44), '#8B0000', 'rgba(255,220,220,0.93)');
          ctx.globalAlpha = 1;
        }
      }
    }

    drawMario(MARIO_X, GROUND + marioY, walkF, jumping);
  }

  /* ─────────────────────── LOOP ───────────────────────────── */

  let raf = null;
  let running = false;

  function loop() {
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting && !running) {
        running = true;
        loop();
      } else if (!e.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    }
  }, { threshold: 0.1 });

  io.observe(canvas);
})();
