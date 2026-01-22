# Demo Radio

A minimal streaming site for your test bounces. Shuffle plays through MP3s in a folder, each track accompanied by a soft breathing bezier blob.

## Vibe

- Paper/cream background (`#FAF9F6` or similar)
- Times New Roman for all text
- No description, no explanation—just the player
- Mysterious, lo-fi radio energy

## Structure

```
your-repo/
├── tracks/
│   ├── synth-sketch-jan-19.mp3
│   ├── fm-bass-experiment.mp3
│   └── ...
├── index.html
├── style.css
├── player.js
├── blob.js
└── build-tracklist.js   # runs at deploy time
```

## Build Step

A tiny Node script that runs on Vercel deploy:

```js
// build-tracklist.js
const fs = require('fs');
const path = require('path');

const tracksDir = './tracks';
const files = fs.readdirSync(tracksDir)
  .filter(f => f.endsWith('.mp3'));

fs.writeFileSync('./tracklist.json', JSON.stringify(files, null, 2));
console.log(`Built tracklist with ${files.length} tracks`);
```

In `package.json`:

```json
{
  "scripts": {
    "build": "node build-tracklist.js"
  }
}
```

Vercel runs this automatically.

## HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo Radio</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <canvas id="blob"></canvas>
    <p id="track-name"></p>
    <input type="range" id="scrubber" min="0" max="100" value="0">
    <div id="time">
      <span id="current">0:00</span>
      <span id="duration">0:00</span>
    </div>
    <div id="controls">
      <button id="prev">←</button>
      <button id="play">▶</button>
      <button id="next">→</button>
    </div>
  </main>
  <audio id="audio"></audio>
  <script src="blob.js"></script>
  <script src="player.js"></script>
</body>
</html>
```

## CSS

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #FAF9F6;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Times New Roman', Times, serif;
  color: #2c2c2c;
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
}

#blob {
  width: 200px;
  height: 200px;
}

#track-name {
  font-size: 1.1rem;
  font-style: italic;
  text-align: center;
  max-width: 300px;
}

#scrubber {
  width: 250px;
  accent-color: #2c2c2c;
}

#time {
  display: flex;
  justify-content: space-between;
  width: 250px;
  font-size: 0.85rem;
  opacity: 0.7;
}

#controls {
  display: flex;
  gap: 1.5rem;
}

#controls button {
  background: none;
  border: 1px solid #2c2c2c;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.2s;
}

#controls button:hover {
  background: #2c2c2c;
  color: #FAF9F6;
}
```

## Player JS

```js
// player.js
const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const scrubber = document.getElementById('scrubber');
const trackNameEl = document.getElementById('track-name');
const currentTimeEl = document.getElementById('current');
const durationEl = document.getElementById('duration');

let tracks = [];
let history = [];
let historyIndex = -1;

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Clean filename for display
function cleanName(filename) {
  return filename
    .replace('.mp3', '')
    .replace(/[-_]/g, ' ');
}

// Format seconds as m:ss
function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Load and play a track
function loadTrack(filename) {
  audio.src = `tracks/${filename}`;
  trackNameEl.textContent = cleanName(filename);
  audio.play();
  playBtn.textContent = '❚❚';
  
  // Generate new blob for this track
  generateBlob(filename);
}

// Go to next track (shuffled)
function nextTrack() {
  // If we've gone back, going forward replays history
  if (historyIndex < history.length - 1) {
    historyIndex++;
    loadTrack(history[historyIndex]);
    return;
  }
  
  // Otherwise pick a new random track
  const available = tracks.filter(t => t !== history[history.length - 1]);
  const pick = available[Math.floor(Math.random() * available.length)] || tracks[0];
  
  history.push(pick);
  historyIndex = history.length - 1;
  loadTrack(pick);
}

// Go to previous track
function prevTrack() {
  if (historyIndex > 0) {
    historyIndex--;
    loadTrack(history[historyIndex]);
  }
}

// Event listeners
playBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = '❚❚';
  } else {
    audio.pause();
    playBtn.textContent = '▶';
  }
});

nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

audio.addEventListener('timeupdate', () => {
  currentTimeEl.textContent = formatTime(audio.currentTime);
  scrubber.value = (audio.currentTime / audio.duration) * 100 || 0;
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', nextTrack);

scrubber.addEventListener('input', () => {
  audio.currentTime = (scrubber.value / 100) * audio.duration;
});

// Init
fetch('tracklist.json')
  .then(r => r.json())
  .then(data => {
    tracks = data;
    nextTrack(); // Start playing
  });
```

## Blob JS

```js
// blob.js
const canvas = document.getElementById('blob');
const ctx = canvas.getContext('2d');

// Pastel palette
const pastels = [
  '#FFD1DC', // pink
  '#BFEFFF', // light blue
  '#C1FFC1', // mint
  '#FFFACD', // lemon
  '#E6E6FA', // lavender
  '#FFDAB9', // peach
  '#D4F0F0', // pale cyan
  '#FCE4D6', // apricot
];

let blobPoints = [];
let blobColor = pastels[0];
let breathePhase = 0;
let animationId;

// Seed random from string
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(h ^ h >>> 15, h | 1);
    h ^= h + Math.imul(h ^ h >>> 7, h | 61);
    return ((h ^ h >>> 14) >>> 0) / 4294967296;
  };
}

// Generate blob shape from track name
function generateBlob(trackName) {
  const rand = seededRandom(trackName);
  
  // Pick color
  blobColor = pastels[Math.floor(rand() * pastels.length)];
  
  // Generate control points for a blobby shape
  const numPoints = 6 + Math.floor(rand() * 3); // 6-8 points
  const baseRadius = 70;
  
  blobPoints = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radiusVariation = 0.7 + rand() * 0.6; // 0.7 to 1.3
    const r = baseRadius * radiusVariation;
    blobPoints.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      baseX: Math.cos(angle) * r,
      baseY: Math.sin(angle) * r,
    });
  }
}

// Draw the blob with bezier curves
function drawBlob() {
  const w = canvas.width = 200;
  const h = canvas.height = 200;
  const cx = w / 2;
  const cy = h / 2;
  
  ctx.clearRect(0, 0, w, h);
  
  // Breathing scale
  const breathe = 1 + Math.sin(breathePhase) * 0.03;
  breathePhase += 0.02;
  
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(breathe, breathe);
  
  ctx.beginPath();
  
  // Draw smooth blob using bezier curves
  const pts = blobPoints;
  const n = pts.length;
  
  // Start at midpoint between last and first point
  const startX = (pts[n - 1].x + pts[0].x) / 2;
  const startY = (pts[n - 1].y + pts[0].y) / 2;
  ctx.moveTo(startX, startY);
  
  // Draw quadratic curves through each point
  for (let i = 0; i < n; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }
  
  ctx.closePath();
  ctx.fillStyle = blobColor;
  ctx.fill();
  
  ctx.restore();
  
  animationId = requestAnimationFrame(drawBlob);
}

// Start animation
drawBlob();

// Expose for player.js
window.generateBlob = generateBlob;
```

## Vercel Config

Create `vercel.json` if you need to ensure the build runs:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "."
}
```

## Git LFS Setup

```bash
cd your-bounces-folder
git init
git lfs install
git lfs track "*.mp3"
git add .gitattributes
git add .
git commit -m "init"
```

## Deployment

1. Push repo to GitHub
2. Connect to Vercel
3. Deploy

New bounces flow: drop MP3 in `tracks/`, commit, push. Vercel rebuilds, tracklist updates, site serves new content.

## Future ideas

- Keyboard shortcuts (space for play/pause, arrow keys)
- Mobile-friendly touch controls
- Fade between tracks instead of hard cut
- Very subtle blob morph animation (not just scale)
- Dark mode toggle
- Share current track link with timestamp
