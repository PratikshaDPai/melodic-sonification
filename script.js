const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const output = document.getElementById('asciiOutput');
const chars = "@%#*+=-:. "; // darkest to lightest
const notes = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5'];

let audioCtx, gainNode, oscillator;
let currentNote = null;

document.getElementById('startAudio').addEventListener('click', () => {
  initAudio();
  document.getElementById('startAudio').style.display = 'none';
});

// --- Audio setup ---
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

  oscillator = audioCtx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 default
  oscillator.connect(gainNode);
  oscillator.start();
}

function playNoteSmooth(note) {
  const freqMap = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
    G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
    D5: 587.33, E5: 659.25
  };

  const freq = freqMap[note];
  if (note !== currentNote) {
    oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
    currentNote = note;
  }

  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setTargetAtTime(0.2, audioCtx.currentTime, 0.05);
}

function stopNoteSmooth() {
  gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
  currentNote = null;
}

// --- Webcam setup ---
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
  .then(stream => video.srcObject = stream)
  .catch(err => alert("Camera access denied."));

// --- Hybrid interaction ---
const isTouch = 'ontouchstart' in window;
let lastTap = 0;

function captureFrame() {
  const w = 64, h = 64;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  let ascii = '';

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const gray = 0.3 * r + 0.59 * g + 0.11 * b;
      const charIndex = Math.min(chars.length - 1, Math.floor((gray / 255) * chars.length));
      const ch = chars[charIndex];
      const note = notes[charIndex];
      ascii += `<span data-note="${note}">${ch}</span>`;
    }
    ascii += '\n';
  }

  output.innerHTML = ascii;

  const spans = output.querySelectorAll('span');

  if (isTouch) {
    // Touch interaction
    output.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el && el.dataset && el.dataset.note) {
        playNoteSmooth(el.dataset.note);
      }
    });

    output.addEventListener('touchend', stopNoteSmooth);
  } else {
    // Desktop hover
    spans.forEach(el => {
      el.addEventListener('mouseenter', () => {
        playNoteSmooth(el.dataset.note);
      });
      el.addEventListener('mouseleave', stopNoteSmooth);
    });
  }
}

// --- Capture triggers ---

if (isTouch) {
  document.body.addEventListener('touchstart', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      captureFrame(); // double tap
    }
    lastTap = now;
  });
} else {
  document.getElementById('capture').addEventListener('click', captureFrame);
}
