const canvas = document.querySelector('#draw');
const ctx = canvas.getContext('2d');
const slider = document.querySelector('#termSlider');
const sliderValue = document.querySelector('#termValue');
const resetBtn = document.querySelector('#reset');
const randomBtn = document.querySelector('#randomize');

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
    ctx.strokeStyle = 'var(--accent-strong)';
    ctx.beginPath();
    trace.forEach((pt, index) => {
      if (index === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
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
    time += 0.02;
    if (time > Math.PI * 2) time -= Math.PI * 2;
  }

  requestAnimationFrame(animate);
}

function loadDefaultPath() {
  const segments = 360;
  const baseRadius = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.35;
  const defaultPoints = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const ripple = Math.sin(5 * t) * 40;
    const wobble = Math.sin(3 * t) * 18;
    const radius = baseRadius + ripple;
    defaultPoints.push({
      x: Math.cos(t) * radius + wobble,
      y: Math.sin(t) * (radius * 0.9) + Math.cos(7 * t) * 12,
    });
  }
  path = defaultPoints;
  trace = [];
  updateFourier();
}

function clearCanvas() {
  path = [];
  fourier = [];
  trace = [];
  sampleCount = 0;
  slider.max = 1;
  slider.value = 1;
  updateSliderUI();
}

function handlePointerStart(event) {
  canvas.setPointerCapture?.(event.pointerId);
  isDrawing = true;
  activePointer = event.pointerId;
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
randomBtn.addEventListener('click', loadDefaultPath);
canvas.addEventListener('pointerdown', handlePointerStart);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerEnd);
canvas.addEventListener('pointerleave', handlePointerEnd);
canvas.addEventListener('pointercancel', handlePointerEnd);
window.addEventListener('resize', () => {
  resizeCanvas();
});

resizeCanvas();
loadDefaultPath();
animate();
