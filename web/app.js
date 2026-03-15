const canvas = document.querySelector('#draw');
const ctx = canvas.getContext('2d');
const slider = document.querySelector('#termSlider');
const sliderValue = document.querySelector('#termValue');
const resetBtn = document.querySelector('#reset');
const randomBtn = document.querySelector('#randomize');
const presetSlots = Array.from(document.querySelectorAll('.preset-slot'));

let center = { x: 0, y: 0 };
let path = [];
let fourier = [];
let trace = [];
let sampleCount = 0;
let time = 0;
let isDrawing = false;
let activePointer = null;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  center = { x: rect.width / 2, y: rect.height / 2 };
}

function addPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const rawX = event.clientX - rect.left - center.x;
  const rawY = event.clientY - rect.top - center.y;
  const last = path[path.length - 1];
  if (last) {
    const dx = rawX - last.x;
    const dy = rawY - last.y;
    if (Math.hypot(dx, dy) < 2) return;
  }
  path.push({ x: rawX, y: rawY });
}

function updateSliderUI() {
  const max = Math.max(Number(slider.max) || 1, 1);
  const value = Math.min(Math.max(Number(slider.value) || 1, 1), max);
  const percent = max > 1 ? ((value - 1) / (max - 1)) * 100 : 0;
  slider.value = value;
  sliderValue.textContent = value;
  slider.style.setProperty('--slider-progress', `${percent}%`);
}

function updateFourier() {
  if (path.length < 2) {
    fourier = [];
    trace = [];
    sampleCount = path.length;
    slider.max = 1;
    slider.value = 1;
    updateSliderUI();
    return;
  }

  const N = path.length;
  const temp = [];
  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const phi = (2 * Math.PI * k * n) / N;
      re += path[n].x * Math.cos(phi) + path[n].y * Math.sin(phi);
      im += -path[n].x * Math.sin(phi) + path[n].y * Math.cos(phi);
    }
    re /= N;
    im /= N;
    temp.push({
      freq: k,
      re,
      im,
      amp: Math.hypot(re, im),
      phase: Math.atan2(im, re),
    });
  }

  temp.sort((a, b) => b.amp - a.amp);
  fourier = temp;
  sampleCount = N;
  slider.max = Math.max(N, 1);
  slider.value = Math.min(slider.value, N);
  updateSliderUI();
  trace = [];
  time = 0;
}

function drawUserPath() {
  if (!path.length) return;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(214, 233, 255, 0.45)';
  ctx.beginPath();
  path.forEach((pt, index) => {
    const x = center.x + pt.x;
    const y = center.y + pt.y;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawEpicycles() {
  if (!fourier.length) return;
  let x = center.x;
  let y = center.y;
  ctx.save();
  ctx.lineWidth = 1.15;
  const count = Math.min(Number(slider.value) || 0, fourier.length);

  for (let i = 0; i < count; i++) {
    const entry = fourier[i];
    const signedFreq = entry.freq > sampleCount / 2 ? entry.freq - sampleCount : entry.freq;
    const angle = signedFreq * time + entry.phase;
    const nextX = x + entry.amp * Math.cos(angle);
    const nextY = y + entry.amp * Math.sin(angle);

    ctx.strokeStyle = 'rgba(119, 187, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, entry.amp, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nextX, nextY);
    ctx.stroke();

    x = nextX;
    y = nextY;
  }

  trace.unshift({ x, y });
  if (trace.length > 1200) trace.pop();
  ctx.restore();

  if (trace.length > 1) {
    ctx.save();
    ctx.lineWidth = 3;
    const fadeLength = Math.min(trace.length, 220);
    for (let i = 0; i < fadeLength - 1; i++) {
      const curr = trace[i];
      const next = trace[i + 1];
      const alpha = Math.max(0, 1 - i / fadeLength);
      ctx.strokeStyle = `rgba(255, 86, 126, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.moveTo(curr.x, curr.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPlaceholderText() {
  if (fourier.length) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.font = '500 16px "Archivo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Draw anywhere to summon epicycles.', center.x, center.y);
  ctx.restore();
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawUserPath();
  drawEpicycles();
  drawPlaceholderText();

  if (fourier.length) {
    // Keep dense presets readable by reducing angular step as sample count grows.
    const adaptiveStep = Math.min(0.02, (2 * Math.PI) / Math.max(sampleCount, 1));
    time += adaptiveStep;
    if (time > Math.PI * 2) time -= Math.PI * 2;
  }

  requestAnimationFrame(animate);
}

function buildPulsePath() {
  const segments = 360;
  const baseRadius = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.35;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const ripple = Math.sin(5 * t) * 40;
    const wobble = Math.sin(3 * t) * 18;
    const radius = baseRadius + ripple;
    points.push({
      x: Math.cos(t) * radius + wobble,
      y: Math.sin(t) * (radius * 0.9) + Math.cos(7 * t) * 12,
    });
  }
  return points;
}

function buildStarPath() {
  const segments = 280;
  const outerRadius = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.34;
  const innerRadius = outerRadius * 0.42;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const mix = (Math.sin(10 * t) + 1) / 2;
    const radius = innerRadius + (outerRadius - innerRadius) * mix;
    points.push({
      x: Math.cos(t) * radius + Math.cos(2 * t) * 15,
      y: Math.sin(t) * radius + Math.sin(6 * t) * 10,
    });
  }
  return points;
}

function buildInfinityPath() {
  const segments = 320;
  const scale = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.34;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const denominator = 1 + Math.sin(t) ** 2;
    points.push({
      x: (scale * Math.cos(t)) / denominator,
      y: (scale * Math.sin(t) * Math.cos(t)) / denominator,
    });
  }
  return points;
}

function buildSpiralPath() {
  const segments = 360;
  const maxRadius = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.36;
  const turns = 3.2;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const progress = i / (segments - 1);
    const t = progress * Math.PI * 2 * turns;
    const radius = 20 + progress * maxRadius;
    points.push({
      x: Math.cos(t) * radius + Math.sin(2.5 * t) * 8,
      y: Math.sin(t) * radius + Math.cos(1.7 * t) * 8,
    });
  }
  return points;
}

function buildMandelbrotPath() {
  const width = 190;
  const height = 130;
  const maxIter = 72;
  const inside = Array.from({ length: height }, () => Array(width).fill(false));
  const boundary = Array.from({ length: height }, () => Array(width).fill(false));

  function toComplexX(col) {
    return -2.25 + (col / (width - 1)) * 3.1;
  }

  function toComplexY(row) {
    return -1.2 + (row / (height - 1)) * 2.4;
  }

  for (let row = 0; row < height; row++) {
    const ci = toComplexY(row);
    for (let col = 0; col < width; col++) {
      const cr = toComplexX(col);
      let zr = 0;
      let zi = 0;
      let iter = 0;
      while (iter < maxIter) {
        const zr2 = zr * zr - zi * zi + cr;
        const zi2 = 2 * zr * zi + ci;
        zr = zr2;
        zi = zi2;
        if (zr * zr + zi * zi > 4) break;
        iter += 1;
      }
      inside[row][col] = iter === maxIter;
    }
  }

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      if (!inside[row][col]) continue;
      if (!inside[row - 1][col] || !inside[row + 1][col] || !inside[row][col - 1] || !inside[row][col + 1]) {
        boundary[row][col] = true;
      }
    }
  }

  let start = null;
  for (let row = 0; row < height && !start; row++) {
    for (let col = 0; col < width; col++) {
      if (boundary[row][col]) {
        start = { row, col };
        break;
      }
    }
  }

  if (!start) return buildPulsePath();

  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: -1 },
    { dr: 0, dc: -1 },
    { dr: -1, dc: -1 },
    { dr: -1, dc: 0 },
    { dr: -1, dc: 1 },
  ];

  let current = { row: start.row, col: start.col };
  let directionIndex = 0;
  const ordered = [];
  const maxSteps = width * height * 2;
  let steps = 0;

  while (steps < maxSteps) {
    const xNorm = (current.col / (width - 1)) * 2 - 1;
    const yNorm = (current.row / (height - 1)) * 2 - 1;
    ordered.push({ xNorm, yNorm });

    let foundNext = false;
    for (let scan = 0; scan < directions.length; scan++) {
      const idx = (directionIndex + scan + 6) % directions.length;
      const nextRow = current.row + directions[idx].dr;
      const nextCol = current.col + directions[idx].dc;
      if (nextRow < 0 || nextRow >= height || nextCol < 0 || nextCol >= width) continue;
      if (!boundary[nextRow][nextCol]) continue;
      current = { row: nextRow, col: nextCol };
      directionIndex = idx;
      foundNext = true;
      break;
    }

    if (!foundNext) break;
    if (current.row === start.row && current.col === start.col && ordered.length > 40) break;
    steps += 1;
  }

  if (ordered.length < 24) return buildPulsePath();

  const scale = Math.min(canvas.clientWidth, canvas.clientHeight);
  return ordered.map((pt) => ({
    x: pt.xNorm * scale * 0.36,
    y: pt.yNorm * scale * 0.28,
  }));
}

function buildButterflyPath() {
  const segments = 1200;
  const scale = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.04;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / (segments - 1)) * Math.PI * 24;
    const radial = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) + Math.sin(t / 12) ** 5;
    points.push({
      x: Math.sin(t) * radial * scale,
      y: -Math.cos(t) * radial * scale,
    });
  }
  return points;
}

function buildHypotrochoidPath() {
  const segments = 1400;
  const scale = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.0035;
  const R = 88;
  const r = 21;
  const d = 36;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / (segments - 1)) * Math.PI * 2 * 21;
    const base = (R - r) * t / r;
    points.push({
      x: ((R - r) * Math.cos(t) + d * Math.cos(base)) * scale,
      y: ((R - r) * Math.sin(t) - d * Math.sin(base)) * scale,
    });
  }
  return points;
}

function buildLissajousPath() {
  const segments = 1400;
  const scale = Math.min(canvas.clientWidth, canvas.clientHeight);
  const ax = scale * 0.34;
  const ay = scale * 0.28;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / (segments - 1)) * Math.PI * 2 * 9;
    const x = ax * Math.sin(5 * t + Math.PI / 3) + Math.sin(17 * t) * 14;
    const y = ay * Math.sin(8 * t) + Math.cos(13 * t) * 10;
    points.push({ x, y });
  }
  return points;
}

function buildRosePath() {
  const segments = 1500;
  const scale = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.33;
  const petals = 11;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / (segments - 1)) * Math.PI * 2 * 7;
    const r = (0.2 + 0.8 * Math.abs(Math.cos(petals * t / 2))) * (1 + 0.18 * Math.sin(19 * t));
    points.push({
      x: Math.cos(t) * scale * r,
      y: Math.sin(t) * scale * r,
    });
  }
  return points;
}

const presetBuilders = {
  pulse: buildPulsePath,
  star: buildStarPath,
  infinity: buildInfinityPath,
  spiral: buildSpiralPath,
  mandelbrot: buildMandelbrotPath,
  butterfly: buildButterflyPath,
  hypotrochoid: buildHypotrochoidPath,
  lissajous: buildLissajousPath,
  rose: buildRosePath,
};

function setActivePreset(name) {
  presetSlots.forEach((slot) => {
    slot.classList.toggle('active', slot.dataset.preset === name);
  });
}

function loadPresetPath(name) {
  const builder = presetBuilders[name];
  if (!builder) return;
  path = builder();
  trace = [];
  time = 0;
  setActivePreset(name);
  updateFourier();
}

function clearCanvas() {
  path = [];
  fourier = [];
  trace = [];
  sampleCount = 0;
  slider.max = 1;
  slider.value = 1;
  setActivePreset('');
  updateSliderUI();
}

function handlePointerStart(event) {
  canvas.setPointerCapture?.(event.pointerId);
  isDrawing = true;
  activePointer = event.pointerId;
  setActivePreset('');
  path = [];
  trace = [];
  time = 0;
  addPointFromEvent(event);
}

function handlePointerMove(event) {
  if (!isDrawing || event.pointerId !== activePointer) return;
  addPointFromEvent(event);
}

function handlePointerEnd(event) {
  if (!isDrawing || event.pointerId !== activePointer) return;
  isDrawing = false;
  canvas.releasePointerCapture?.(event.pointerId);
  activePointer = null;
  if (path.length > 1) updateFourier();
}

slider.addEventListener('input', updateSliderUI);
resetBtn.addEventListener('click', () => {
  clearCanvas();
});
presetSlots.forEach((slot) => {
  slot.addEventListener('click', () => {
    loadPresetPath(slot.dataset.preset);
  });
});
randomBtn.addEventListener('click', () => {
  const names = Object.keys(presetBuilders);
  const choice = names[Math.floor(Math.random() * names.length)];
  loadPresetPath(choice);
});
canvas.addEventListener('pointerdown', handlePointerStart);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerEnd);
canvas.addEventListener('pointerleave', handlePointerEnd);
canvas.addEventListener('pointercancel', handlePointerEnd);
window.addEventListener('resize', () => {
  resizeCanvas();
});

resizeCanvas();
loadPresetPath('pulse');
animate();
