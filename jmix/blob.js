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
    });
  }

  drawBlob();
}

// Draw the blob with bezier curves
function drawBlob() {
  const w = canvas.width = 200;
  const h = canvas.height = 200;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  if (blobPoints.length === 0) return;

  ctx.save();
  ctx.translate(cx, cy);

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
}

// Expose for player.js
window.generateBlob = generateBlob;
