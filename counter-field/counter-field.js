(() => {
  'use strict';

  const STAGE_W = 3840;
  const STAGE_H = 804;
  const LOGICAL_W = 1920;
  const LOGICAL_H = 402;
  const TIME_ZONE = 'Australia/Melbourne';
  const FPS = 18;
  const FRAME_MS = 1000 / FPS;
  const DIGIT_COLS = 9;
  const DIGIT_ROWS = 17;
  const STROKE_CELLS = 3;
  const CELL_X = 21;
  const CELL_Y = 17;
  const DIGIT_W = (DIGIT_COLS - 1) * CELL_X;
  const DIGIT_H = (DIGIT_ROWS - 1) * CELL_Y;
  const DIGIT_GAP = CELL_X * 3;
  const PAIR_GAP = 62;
  const CLOCK_Y = 63;

  const COLOURS = {
    bg: '#1C1B1C',
    grey: '#373A36',
    grey2: '#4E5859',
    green: '#89C925',
    white: '#FFFFFF'
  };

  const DIGIT_SEGMENTS = {
    '0': 'ABCDEF',
    '1': 'BC',
    '2': 'ABDEG',
    '3': 'ABCDG',
    '4': 'BCFG',
    '5': 'ACDFG',
    '6': 'ACDEFG',
    '7': 'ABC',
    '8': 'ABCDEFG',
    '9': 'ABCDFG'
  };

  const params = new URLSearchParams(window.location.search);
  const qualityParam = params.get('quality');
  const renderScale = qualityParam === 'high' ? 2 : qualityParam === 'low' ? 0.75 : 1;
  const demoMode = params.get('demo') === '1';
  const previewMode = params.get('preview') === '1';
  const noMotion = params.get('motion') === '0' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fixedTime = parseFixedTime(params.get('time'));

  if (previewMode) document.documentElement.classList.add('preview');

  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('field');
  const status = document.getElementById('status');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  canvas.width = Math.round(LOGICAL_W * renderScale);
  canvas.height = Math.round(LOGICAL_H * renderScale);
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  ctx.imageSmoothingEnabled = true;

  let fontReady = false;
  let atlas = null;
  let lastFrameAt = 0;
  let lastClockString = '';
  let lastChangedDigitIndexes = [];
  let lastAnnouncedSecond = -1;
  let minutePulseStart = -Infinity;
  let pageVisible = !document.hidden;
  let demoStart = performance.now();
  let demoBase = Date.now();

  const timeFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  });
  const dayFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'short'
  });

  const digitLayout = buildDigitLayout();
  const digitCells = buildDigitCells(digitLayout);
  const backgroundCells = buildBackgroundCells();

  function parseFixedTime(value) {
    if (!value || !/^\d{2}:\d{2}:\d{2}$/.test(value)) return null;
    const [hour, minute, second] = value.split(':').map(Number);
    if (hour > 23 || minute > 59 || second > 59) return null;
    return { hour, minute, second };
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function buildDigitLayout() {
    const widths = [DIGIT_W, DIGIT_W, 38, DIGIT_W, DIGIT_W, 38, DIGIT_W, DIGIT_W];
    const gaps = [DIGIT_GAP, PAIR_GAP, PAIR_GAP, DIGIT_GAP, PAIR_GAP, PAIR_GAP, DIGIT_GAP];
    const total = widths.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
    let x = (LOGICAL_W - total) / 2;
    const items = [];
    for (let i = 0; i < widths.length; i++) {
      items.push({ type: i === 2 || i === 5 ? 'colon' : 'digit', x, width: widths[i] });
      x += widths[i] + (gaps[i] || 0);
    }
    return items;
  }

  function buildDigitCells(layout) {
    const random = seededRandom(8043840);
    const cells = [];
    let digitIndex = 0;
    for (const item of layout) {
      if (item.type !== 'digit') continue;
      for (let row = 0; row < DIGIT_ROWS; row++) {
        for (let col = 0; col < DIGIT_COLS; col++) {
          cells.push({
            digitIndex,
            row,
            col,
            x: item.x + col * CELL_X,
            y: CLOCK_Y + row * CELL_Y,
            value: Math.floor(random() * 10),
            nextChange: random() * 900,
            jitter: (random() - 0.5) * 1.1,
            phase: random() * Math.PI * 2,
            transitionStart: -Infinity,
            transitionDelay: random() * 300,
            wasActive: false,
            active: false
          });
        }
      }
      digitIndex++;
    }
    return cells;
  }

  function buildBackgroundCells() {
    const random = seededRandom(373136);
    const cells = [];
    const cols = 56;
    const rows = 11;
    const xStep = LOGICAL_W / (cols - 1);
    const yStart = 54;
    const yStep = 25;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * xStep + (random() - 0.5) * 5;
        const y = yStart + row * yStep + (random() - 0.5) * 4;
        cells.push({
          x,
          y,
          value: Math.floor(random() * 10),
          phase: random() * Math.PI * 2,
          speed: 0.25 + random() * 0.55,
          nextChange: random() * 4000,
          opacity: 0.045 + random() * 0.055
        });
      }
    }
    return cells;
  }

  function fitStage() {
    const width = window.innerWidth;
    const reservedBottom = previewMode ? 48 : 0;
    const availableHeight = Math.max(1, window.innerHeight - reservedBottom);
    const scale = Math.min(width / STAGE_W, availableHeight / STAGE_H);
    const displayedWidth = STAGE_W * scale;
    const displayedHeight = STAGE_H * scale;
    const left = Math.max(0, (width - displayedWidth) / 2);
    const top = previewMode
      ? Math.max(12, Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 12)
      : Math.max(0, (window.innerHeight - displayedHeight) / 2);
    stage.style.left = `${left}px`;
    stage.style.top = `${top}px`;
    stage.style.transform = `scale(${scale})`;
    viewport.style.width = `${window.innerWidth}px`;
    viewport.style.height = `${window.innerHeight}px`;
  }

  function createAtlas() {
    const scale = renderScale;
    const cellW = Math.ceil(20 * scale);
    const cellH = Math.ceil(25 * scale);
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = cellW * 10;
    atlasCanvas.height = cellH * 4;
    const a = atlasCanvas.getContext('2d');
    a.textAlign = 'center';
    a.textBaseline = 'middle';
    a.font = `${Math.round(17 * scale)}px "MP-B", Arial, sans-serif`;
    const styles = [
      { colour: COLOURS.grey2, alpha: 0.22 },
      { colour: COLOURS.white, alpha: 0.94 },
      { colour: COLOURS.green, alpha: 1 },
      { colour: COLOURS.white, alpha: 0.48 }
    ];
    styles.forEach((style, row) => {
      a.globalAlpha = style.alpha;
      a.fillStyle = style.colour;
      for (let digit = 0; digit < 10; digit++) {
        a.fillText(String(digit), digit * cellW + cellW / 2, row * cellH + cellH / 2 + scale);
      }
    });
    a.globalAlpha = 1;
    return { canvas: atlasCanvas, cellW, cellH, scale };
  }

  function drawAtlasDigit(value, x, y, styleRow, alpha = 1, size = 1) {
    const { canvas: image, cellW, cellH, scale } = atlas;
    const sx = (value % 10) * cellW;
    const sy = styleRow * cellH;
    const dw = (cellW / scale) * size;
    const dh = (cellH / scale) * size;
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, sx, sy, cellW, cellH, x - dw / 2, y - dh / 2, dw, dh);
  }

  function getNow(nowPerf) {
    if (fixedTime) return new Date();
    if (demoMode) {
      return new Date(demoBase + (nowPerf - demoStart) * 8);
    }
    return new Date();
  }

  function getClockState(date) {
    let values;
    if (fixedTime) {
      values = {
        hour: String(fixedTime.hour).padStart(2, '0'),
        minute: String(fixedTime.minute).padStart(2, '0'),
        second: String(fixedTime.second).padStart(2, '0')
      };
    } else {
      const parts = timeFormatter.formatToParts(date);
      values = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    }
    const clock = `${values.hour}${values.minute}${values.second}`;
    return {
      clock,
      second: Number(values.second),
      minute: Number(values.minute),
      minuteProgress: (Number(values.second) + (fixedTime ? 0 : date.getMilliseconds() / 1000)) / 60,
      label: dayFormatter.format(date).toUpperCase().replace(',', '')
    };
  }

  function segmentMask(segment, col, row) {
    const left = col < STROKE_CELLS;
    const right = col >= DIGIT_COLS - STROKE_CELLS;
    const top = row < STROKE_CELLS;
    const middle = row >= 7 && row <= 9;
    const bottom = row >= DIGIT_ROWS - STROKE_CELLS;
    const upperJoin = row >= STROKE_CELLS && row <= 8;
    const lowerJoin = row >= 8 && row < DIGIT_ROWS - STROKE_CELLS;

    switch (segment) {
      case 'A': return top;
      case 'B': return right && upperJoin;
      case 'C': return right && lowerJoin;
      case 'D': return bottom;
      case 'E': return left && lowerJoin;
      case 'F': return left && upperJoin;
      case 'G': return middle;
      default: return false;
    }
  }

  function maskForDigit(digit, col, row) {
    // Keep 1 centred so all six digit cells feel optically balanced.
    if (digit === '1') return col >= 3 && col <= 5;
    const segments = DIGIT_SEGMENTS[digit] || DIGIT_SEGMENTS['0'];
    for (const segment of segments) {
      if (segmentMask(segment, col, row)) return true;
    }
    return false;
  }

  function updateCells(state, now) {
    const clockChanged = state.clock !== lastClockString;
    if (clockChanged) {
      lastChangedDigitIndexes = [];
      for (let index = 0; index < state.clock.length; index++) {
        if (state.clock[index] !== lastClockString[index]) lastChangedDigitIndexes.push(index);
      }
      for (const cell of digitCells) {
        const digit = state.clock[cell.digitIndex];
        const active = maskForDigit(digit, cell.col, cell.row);
        if (active !== cell.active || digit !== lastClockString[cell.digitIndex]) {
          cell.wasActive = cell.active;
          cell.active = active;
          cell.transitionStart = now;
        }
      }
      if (lastClockString && state.clock.slice(0, 4) !== lastClockString.slice(0, 4)) {
        minutePulseStart = now;
      }
      lastClockString = state.clock;
    }

    for (const cell of digitCells) {
      if (now >= cell.nextChange) {
        cell.value = (cell.value + 1 + ((cell.row + cell.col) % 3)) % 10;
        cell.nextChange = now + 560 + ((cell.row * 47 + cell.col * 83) % 720);
      }
    }
    for (const cell of backgroundCells) {
      if (now >= cell.nextChange) {
        cell.value = (cell.value + 1 + (Math.floor(cell.x) % 4)) % 10;
        cell.nextChange = now + 1200 + ((Math.floor(cell.x + cell.y) * 17) % 3200);
      }
    }
  }

  function drawBackground(now, state) {
    ctx.fillStyle = COLOURS.bg;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    const minutePulseAge = now - minutePulseStart;
    const scanX = minutePulseAge >= 0 && minutePulseAge < 1900
      ? -80 + (LOGICAL_W + 160) * (minutePulseAge / 1900)
      : -1000;

    for (const cell of backgroundCells) {
      const wave = Math.sin(now * 0.00035 * cell.speed + cell.phase);
      const y = cell.y + (noMotion ? 0 : wave * 1.6);
      const distance = Math.abs(cell.x - scanX);
      const scanBoost = distance < 90 ? (1 - distance / 90) * 0.34 : 0;
      drawAtlasDigit(cell.value, cell.x, y, scanBoost > 0.04 ? 2 : 0, Math.min(0.38, cell.opacity + scanBoost), 0.78);
    }

    if (scanX > -100) {
      const gradient = ctx.createLinearGradient(scanX - 110, 0, scanX + 110, 0);
      gradient.addColorStop(0, 'rgba(137,201,37,0)');
      gradient.addColorStop(0.5, 'rgba(137,201,37,0.10)');
      gradient.addColorStop(1, 'rgba(137,201,37,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = gradient;
      ctx.fillRect(scanX - 110, 0, 220, LOGICAL_H);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(72, 44, LOGICAL_W - 144, 1);
    ctx.fillRect(72, 354, LOGICAL_W - 144, 1);

    drawHeader(state);
  }

  function drawHeader(state) {
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLOURS.white;
    ctx.textAlign = 'left';
    ctx.font = '17px "MP-B", Arial, sans-serif';
    ctx.fillText('MEL', 73, 27);

    ctx.fillStyle = COLOURS.green;
    ctx.fillRect(124, 25, 18, 3);

    ctx.fillStyle = 'rgba(255,255,255,.58)';
    ctx.font = '10px "MP-B", Arial, sans-serif';
    ctx.fillText(state.label, 158, 27);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.fillText('COUNTER FIELD  /  LIVE MELBOURNE TIME', LOGICAL_W - 73, 27);
  }

  function drawClock(now, state) {
    const pulseAge = now - minutePulseStart;
    const globalPulse = pulseAge >= 0 && pulseAge < 900 ? Math.sin((pulseAge / 900) * Math.PI) : 0;

    for (const cell of digitCells) {
      const digit = state.clock[cell.digitIndex];
      const transitionAge = now - cell.transitionStart - cell.transitionDelay;
      let activeAlpha = cell.active ? 0.98 : 0.075;
      let style = cell.active ? 1 : 0;
      let value = cell.active ? Number(digit) : cell.value;
      let scale = cell.active ? 1.10 : 0.90;
      let y = cell.y;

      if (!noMotion && transitionAge >= 0 && transitionAge < 430) {
        const t = transitionAge / 430;
        value = Math.floor((cell.value + t * 19) % 10);
        activeAlpha = 0.25 + Math.sin(t * Math.PI) * 0.72;
        style = t > 0.68 && cell.active ? 1 : 3;
        scale += Math.sin(t * Math.PI) * 0.16;
        y += Math.sin(t * Math.PI * 2) * 1.4;
      } else if (cell.active) {
        value = Number(digit);
      }

      if (globalPulse > 0 && cell.active) {
        activeAlpha = Math.min(1, activeAlpha + globalPulse * 0.06);
        scale += globalPulse * 0.08;
      }

      const microMotion = noMotion ? 0 : Math.sin(now * 0.001 + cell.phase) * cell.jitter;
      drawAtlasDigit(value, cell.x, y + microMotion, style, activeAlpha, scale);
    }

    drawColons(state.second, now);
  }

  function drawColons(second, now) {
    const colonItems = digitLayout.filter(item => item.type === 'colon');
    const bright = second % 2 === 0;
    colonItems.forEach((item, index) => {
      const centreX = item.x + item.width / 2;
      const rows = [5, 11];
      rows.forEach((row, dot) => {
        const value = (second + index + dot) % 10;
        const alpha = bright ? 1 : 0.20;
        const pulse = noMotion ? 1 : 1 + Math.sin(now * 0.006 + dot * 1.4) * 0.04;
        for (const xOffset of [-9, 0, 9]) {
          for (const yOffset of [-9, 0, 9]) {
            drawAtlasDigit(value, centreX + xOffset, CLOCK_Y + row * CELL_Y + yOffset, 2, alpha, 0.58 * pulse);
          }
        }
      });
    });
  }

  function drawFooter(state) {
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'middle';
    ctx.font = '9px "MP-B", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.36)';
    ctx.textAlign = 'left';
    ctx.fillText('3840 × 804  /  CANVAS 2D  /  SHIELD MODE', 73, 378);

    const progressY = LOGICAL_H - 6;
    ctx.fillStyle = 'rgba(137,201,37,.26)';
    ctx.fillRect(0, LOGICAL_H - 2, LOGICAL_W, 2);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = COLOURS.green;
    ctx.fillRect(0, progressY, LOGICAL_W * state.minuteProgress, 6);
    ctx.globalAlpha = 1;
  }

  function render(now) {
    if (!pageVisible) return;
    if (now - lastFrameAt < FRAME_MS) {
      requestAnimationFrame(render);
      return;
    }
    lastFrameAt = now;

    const date = getNow(now);
    const state = getClockState(date);
    updateCells(state, now);
    drawBackground(now, state);
    drawClock(now, state);
    drawFooter(state);

    if (state.second !== lastAnnouncedSecond) {
      lastAnnouncedSecond = state.second;
      status.textContent = `Melbourne time ${state.clock.slice(0,2)}:${state.clock.slice(2,4)}:${state.clock.slice(4,6)}`;
    }

    requestAnimationFrame(render);
  }

  function initialise() {
    atlas = createAtlas();
    fontReady = true;
    fitStage();
    requestAnimationFrame(render);
  }

  window.addEventListener('resize', fitStage, { passive: true });
  window.addEventListener('orientationchange', fitStage, { passive: true });
  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
    if (pageVisible) {
      lastFrameAt = 0;
      requestAnimationFrame(render);
    }
  });

  window.__counterField = {
    version: '2026.08.03-c',
    stage: { width: STAGE_W, height: STAGE_H },
    logicalCanvas: { width: LOGICAL_W, height: LOGICAL_H, renderScale },
    fpsCap: FPS,
    timeZone: TIME_ZONE,
    getMetrics: () => ({
      fontReady,
      backgroundCells: backgroundCells.length,
      digitCells: digitCells.length,
      strokeCells: STROKE_CELLS,
      emptyPairSpacingCells: 2,
      digitGap: DIGIT_GAP,
      clockY: CLOCK_Y,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      clock: lastClockString,
      stageTransform: stage.style.transform,
      stageLeft: stage.style.left,
      stageTop: stage.style.top,
      lastChangedDigitIndexes: [...lastChangedDigitIndexes]
    }),
    getDigitMask: (digit) => Array.from({ length: DIGIT_ROWS }, (_, row) =>
      Array.from({ length: DIGIT_COLS }, (_, col) => maskForDigit(String(digit), col, row) ? 1 : 0)
    ),
    triggerMinutePulse: () => { minutePulseStart = performance.now(); }
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initialise).catch(initialise);
  } else {
    initialise();
  }
})();
