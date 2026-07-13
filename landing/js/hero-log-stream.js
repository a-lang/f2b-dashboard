/**
 * f2b-dashboard Landing Page — Hero log stream background
 * Renders a slow-moving fail2ban-style log stream on a canvas behind the hero overlay.
 * Adapts automatically to light/dark theme and respects prefers-reduced-motion.
 */

(function () {
  'use strict';

  const CANVAS_SELECTOR = '.hero__bg-log';
  const BASE_SPEED_PPS = 18;
  const LINE_HEIGHT = 28;
  const FONT_SIZE = 14;
  const MAX_DELTA_SECONDS = 0.1;

  const JAILS = ['sshd', 'asterisk', 'nginx-auth', 'postfix-sasl', 'recidive'];
  const TEST_NETS = [[192, 0, 2], [198, 51, 100], [203, 0, 113]];

  let canvas;
  let ctx;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let lines = [];
  let lastTime = 0;
  let reducedMotion = false;

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function generateIp() {
    const net = randomItem(TEST_NETS);
    return `${net[0]}.${net[1]}.${net[2]}.${randomInt(2, 254)}`;
  }

  function generateTimestamp() {
    const now = new Date();
    now.setSeconds(now.getSeconds() - randomInt(0, 86400));
    return (
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    );
  }

  function generateLineData() {
    const component = Math.random() < 0.65 ? 'fail2ban.filter' : 'fail2ban.actions';
    const level = component === 'fail2ban.filter' ? 'INFO' : 'NOTICE';
    const jail = randomItem(JAILS);
    let action;
    let type;

    if (component === 'fail2ban.filter') {
      action = `Found ${generateIp()}`;
      type = 'default';
    } else {
      const r = Math.random();
      if (r < 0.75) {
        action = `Ban ${generateIp()}`;
        type = 'accent';
      } else if (r < 0.90) {
        action = `Unban ${generateIp()}`;
        type = 'notice';
      } else {
        action = `Found ${generateIp()}`;
        type = 'default';
      }
    }

    const text = `${generateTimestamp()} ${component}  [${randomInt(1, 9)}]: ${level}   [${jail}] ${action}`;
    return { text, type };
  }

  function createLine(y) {
    const data = generateLineData();
    return {
      text: data.text,
      type: data.type,
      x: randomInt(-80, width - 120),
      y: y,
      opacity: 0.65 + Math.random() * 0.30,
      speed: BASE_SPEED_PPS
    };
  }

  function getCssColor(varName, fallback) {
    if (!canvas) return fallback;
    return getComputedStyle(canvas).getPropertyValue(varName).trim() || fallback;
  }

  function setAlpha(color, alpha) {
    const match = color.match(/rgba?\(\s*([^)]+)\s*\)/);
    if (!match) return color;
    const parts = match[1].split(',').map(function (s) { return s.trim(); });
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  }

  function colorForType(type) {
    switch (type) {
      case 'accent':
        return getCssColor('--hero-log-accent', 'rgba(22, 101, 52, 0.16)');
      case 'notice':
        return getCssColor('--hero-log-notice', 'rgba(87, 83, 78, 0.10)');
      default:
        return getCssColor('--hero-log-color', 'rgba(17, 24, 39, 0.10)');
    }
  }

  function initLines() {
    lines = [];
    const count = Math.ceil(height / LINE_HEIGHT) + 8;
    for (let i = 0; i < count; i++) {
      lines.push(createLine(i * LINE_HEIGHT));
    }
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initLines();
  }

  function updateReducedMotion() {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function draw(time) {
    if (!ctx) return;

    const delta = lastTime ? Math.min((time - lastTime) / 1000, MAX_DELTA_SECONDS) : 0;
    lastTime = time;

    ctx.clearRect(0, 0, width, height);
    ctx.font = `500 ${FONT_SIZE}px "JetBrains Mono", "Fira Code", monospace`;
    ctx.textBaseline = 'alphabetic';

    let lowestY = 0;

    lines.forEach(function (line) {
      if (!reducedMotion) {
        line.y -= line.speed * delta;
      }

      if (line.y > lowestY) {
        lowestY = line.y;
      }

      ctx.fillStyle = setAlpha(colorForType(line.type), line.opacity);
      ctx.fillText(line.text, line.x, line.y);
    });

    // Recycle lines that have scrolled off the top
    if (!reducedMotion) {
      lines.forEach(function (line) {
        if (line.y < -LINE_HEIGHT) {
          line.y = lowestY + LINE_HEIGHT;
          const data = generateLineData();
          line.text = data.text;
          line.type = data.type;
          line.x = randomInt(-80, width - 120);
          line.opacity = 0.65 + Math.random() * 0.30;
        }
      });
    }

    requestAnimationFrame(draw);
  }

  function init() {
    canvas = document.querySelector(CANVAS_SELECTOR);
    if (!canvas || !canvas.getContext) return;

    ctx = canvas.getContext('2d');
    updateReducedMotion();

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', updateReducedMotion);
    } else if (motionQuery.addListener) {
      motionQuery.addListener(updateReducedMotion);
    }

    resize();

    let resizeTicking = false;
    window.addEventListener('resize', function () {
      if (!resizeTicking) {
        window.requestAnimationFrame(function () {
          resize();
          resizeTicking = false;
        });
        resizeTicking = true;
      }
    }, { passive: true });

    // Theme changes are picked up automatically each frame because colors
    // are read from computed CSS custom properties.
    requestAnimationFrame(draw);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
