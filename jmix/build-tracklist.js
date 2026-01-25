#!/usr/bin/env node
// build-tracklist.js
// Generates: tracklist.json, OG images (if canvas available), and per-track HTML pages

const fs = require('fs');
const path = require('path');

// Canvas is optional - OG images are committed to git
let createCanvas = null;
try {
  createCanvas = require('canvas').createCanvas;
} catch (e) {
  console.log('⚠ Canvas not available - skipping OG image generation');
  console.log('  (OG images should already exist in /og/ from local build)\n');
}

const SAMPLES_DIR = path.join(__dirname, 'samples');
const OG_DIR = path.join(__dirname, 'og');
const BASE_URL = 'https://kjaz.app';

// Pastel palette (same as blob.js)
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

// Seed random from string (same as blob.js)
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

// Fisher-Yates shuffle
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Convert filename to URL slug
function toSlug(filename) {
  return filename
    .replace('.mp3', '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

// Clean display name from filename
function toDisplayName(filename) {
  return filename
    .replace('.mp3', '')
    .replace(/[-_]/g, ' ');
}

// Generate blob points for a track (same algorithm as blob.js)
function generateBlobData(trackName) {
  const rand = seededRandom(trackName);
  const color = pastels[Math.floor(rand() * pastels.length)];
  const numPoints = 6 + Math.floor(rand() * 3);
  const baseRadius = 70;

  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radiusVariation = 0.7 + rand() * 0.6;
    const r = baseRadius * radiusVariation;
    points.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }

  return { points, color };
}

// Draw blob on canvas
function drawBlob(ctx, points, color, cx, cy, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.beginPath();
  const n = points.length;
  const startX = (points[n - 1].x + points[0].x) / 2;
  const startY = (points[n - 1].y + points[0].y) / 2;
  ctx.moveTo(startX, startY);

  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }

  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// Calculate visual center offset for a blob (bounding box center)
function getBlobOffset(points) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2
  };
}

// Generate OG image for a track (1200x630)
function generateOGImage(filename) {
  if (!createCanvas) return null;

  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Cream background
  ctx.fillStyle = '#FAF9F6';
  ctx.fillRect(0, 0, width, height);

  // Draw blob (visually centered using bounding box)
  const { points, color } = generateBlobData(filename);
  const offset = getBlobOffset(points);
  const scale = 2.5;
  const cx = width / 2 - offset.x * scale;
  const cy = height / 2 - 30 - offset.y * scale;
  drawBlob(ctx, points, color, cx, cy, scale);

  // Bottom text line: track name (left) and KJAZ (right)
  const displayName = toDisplayName(filename);
  const textY = height - 50;
  const margin = 60;

  // Track name (left aligned)
  ctx.fillStyle = '#333';
  ctx.font = '36px "Times New Roman", Times, serif';
  ctx.textAlign = 'left';
  ctx.fillText(displayName, margin, textY);

  // KJAZ branding (right aligned, lighter)
  ctx.fillStyle = '#888';
  ctx.textAlign = 'right';
  ctx.fillText('KJAZ', width - margin, textY);

  return canvas.toBuffer('image/png');
}

// Generate HTML for a track page
function generateTrackHTML(filename, slug) {
  const displayName = toDisplayName(filename);
  const ogImageUrl = `${BASE_URL}/og/${slug}.png`;
  const trackUrl = `${BASE_URL}/${slug}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayName} · KJAZ</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3">
  <meta name="theme-color" content="#FAF9F6">

  <!-- Open Graph for link previews -->
  <meta property="og:title" content="${displayName} · KJAZ">
  <meta property="og:description" content="Radio for Jazzman">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:url" content="${trackUrl}">
  <meta property="og:type" content="music.song">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${displayName} · KJAZ">
  <meta name="twitter:image" content="${ogImageUrl}">

  <link rel="stylesheet" href="/style.css">
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
      <button id="prev">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <polyline points="14,6 8,12 14,18" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button id="play">
        <svg viewBox="0 0 24 24" width="24" height="24" class="play-icon">
          <polygon points="7,6 19,12 7,18" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg viewBox="0 0 24 24" width="24" height="24" class="pause-icon" style="display:none;">
          <line x1="8" y1="6" x2="8" y2="18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <line x1="16" y1="6" x2="16" y2="18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </button>
      <button id="next">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <polyline points="10,6 16,12 10,18" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </main>
  <audio id="audio"></audio>
  <script src="/blob.js"></script>
  <script src="/player.js"></script>
</body>
</html>
`;
}

async function build() {
  console.log('Building KJAZ...\n');

  // 1. Scan samples directory
  const files = fs.readdirSync(SAMPLES_DIR);
  const mp3Files = files
    .filter(file => file.endsWith('.mp3') && !file.endsWith('.mp3.asd'))
    .sort();

  console.log(`Found ${mp3Files.length} tracks`);

  // 2. Load existing tracklist (if any) and check if tracks changed
  const tracklistPath = path.join(__dirname, 'tracklist.json');
  let existingTracks = [];
  try {
    existingTracks = JSON.parse(fs.readFileSync(tracklistPath, 'utf-8'));
  } catch (e) {
    // No existing tracklist
  }

  // Check if the set of tracks changed (ignore order)
  const existingSet = new Set(existingTracks);
  const currentSet = new Set(mp3Files);
  const tracksChanged = mp3Files.length !== existingTracks.length ||
    mp3Files.some(f => !existingSet.has(f)) ||
    existingTracks.some(f => !currentSet.has(f));

  if (tracksChanged) {
    // Tracks added or removed - create new shuffled list
    const shuffled = shuffle(mp3Files);
    fs.writeFileSync(tracklistPath, JSON.stringify(shuffled, null, 2));
    console.log('✓ Generated tracklist.json (shuffled - tracks changed)');
  } else {
    console.log('✓ tracklist.json unchanged (same tracks)');
  }

  // 3. Create OG directory (if canvas available)
  if (createCanvas && !fs.existsSync(OG_DIR)) {
    fs.mkdirSync(OG_DIR, { recursive: true });
  }

  // 4. Generate OG images and HTML pages for each track
  const slugs = [];
  for (const filename of mp3Files) {
    const slug = toSlug(filename);
    slugs.push(slug);

    const ogPath = path.join(OG_DIR, `${slug}.png`);
    let newOG = false;

    // OG image (only if canvas available and image doesn't exist)
    if (createCanvas && !fs.existsSync(ogPath)) {
      const ogBuffer = generateOGImage(filename);
      if (ogBuffer) {
        fs.writeFileSync(ogPath, ogBuffer);
        newOG = true;
      }
    }

    // Track HTML page (always regenerate - it's fast)
    const trackDir = path.join(__dirname, slug);
    if (!fs.existsSync(trackDir)) {
      fs.mkdirSync(trackDir, { recursive: true });
    }
    const html = generateTrackHTML(filename, slug);
    fs.writeFileSync(path.join(trackDir, 'index.html'), html);

    console.log(`✓ ${filename} → /${slug}/${newOG ? ' (new OG)' : ''}`);
  }

  // 5. Update .gitignore with generated directories
  const gitignorePath = path.join(__dirname, '.gitignore');
  const marker = '# Generated track pages (auto-updated by build)';
  let gitignore = '';

  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    // Remove old generated section if exists
    const markerIndex = gitignore.indexOf(marker);
    if (markerIndex !== -1) {
      gitignore = gitignore.slice(0, markerIndex).trimEnd();
    }
  }

  // Add generated track directories
  const trackIgnores = slugs.map(s => `/${s}/`).join('\n');
  gitignore = gitignore.trimEnd() + `\n\n${marker}\n${trackIgnores}\n`;
  fs.writeFileSync(gitignorePath, gitignore);
  console.log('✓ Updated .gitignore');

  console.log(`\n✓ Build complete: ${mp3Files.length} tracks processed`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
