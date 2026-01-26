// player.js
const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const playIcon = playBtn.querySelector('.play-icon');
const pauseIcon = playBtn.querySelector('.pause-icon');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const scrubber = document.getElementById('scrubber');
const trackNameEl = document.getElementById('track-name');
const currentTimeEl = document.getElementById('current');
const durationEl = document.getElementById('duration');

// Tracklist is pre-shuffled in tracklist.json at build time
let tracks = [];
let currentIndex = 0;
let isScrubbing = false;

// Convert filename to URL slug (must match build-tracklist.js)
function toSlug(filename) {
  return filename
    .replace('.mp3', '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

// Find filename from slug
function fromSlug(slug) {
  return tracks.find(f => toSlug(f) === slug.toLowerCase());
}

// Get track from URL path (e.g., /shimmer -> shimmer.mp3)
function getTrackFromPath() {
  const path = decodeURIComponent(window.location.pathname).slice(1); // Remove leading /
  if (!path) return null;
  return fromSlug(path);
}

// Handle legacy hash URLs (e.g., /#shimmer.mp3 -> /shimmer)
function checkLegacyHash() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const filename = hash.replace('.mp3', '') + '.mp3';
    if (tracks.includes(filename)) {
      // Redirect to path-based URL
      window.location.replace('/' + toSlug(filename));
      return true;
    }
  }
  return false;
}

// Clean filename for display
function cleanName(filename) {
  return filename
    .replace('.mp3', '')
    .replace(/[-_]/g, ' ');
}

// Update OG meta tags for current track (fixes iOS share preview caching)
function updateOGTags(filename) {
  const slug = toSlug(filename);
  const displayName = cleanName(filename);
  const baseUrl = 'https://kjaz.app';

  // Update og:title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', `${displayName} · KJAZ`);
  }

  // Update og:image
  let ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    ogImage.setAttribute('content', `${baseUrl}/og/${slug}.png`);
  }

  // Update og:url
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    ogUrl.setAttribute('content', `${baseUrl}/${slug}`);
  }

  // Update twitter:title
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) {
    twitterTitle.setAttribute('content', `${displayName} · KJAZ`);
  }

  // Update twitter:image
  let twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage) {
    twitterImage.setAttribute('content', `${baseUrl}/og/${slug}.png`);
  }

  // Update document title
  document.title = `${displayName} · KJAZ`;
}

// Format seconds as m:ss
function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Show play or pause icon
function showPlayState(isPlaying) {
  playIcon.style.display = isPlaying ? 'none' : 'block';
  pauseIcon.style.display = isPlaying ? 'block' : 'none';
}

// Load and play a track by index
function playIndex(index) {
  // Wrap around
  if (index < 0) index = tracks.length - 1;
  if (index >= tracks.length) index = 0;

  currentIndex = index;
  const filename = tracks[currentIndex];
  const slug = toSlug(filename);

  audio.src = `/samples/${filename}`;
  trackNameEl.textContent = cleanName(filename);
  audio.play();

  // Update URL for sharing (without page reload)
  const newPath = '/' + slug;
  if (window.location.pathname !== newPath) {
    history.pushState({ index }, cleanName(filename) + ' · KJAZ', newPath);
  }

  // Generate new blob for this track
  generateBlob(filename);

  // Update OG tags for share preview
  updateOGTags(filename);
}

// Navigation: cycle through the pre-shuffled list
function nextTrack() {
  playIndex(currentIndex + 1);
}

function prevTrack() {
  playIndex(currentIndex - 1);
}

// Sync icon state with actual audio state
audio.addEventListener('play', () => showPlayState(true));
audio.addEventListener('pause', () => showPlayState(false));

// Play/pause
playBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

// Update scrubber and time display as audio plays
audio.addEventListener('timeupdate', () => {
  if (!isScrubbing) {
    currentTimeEl.textContent = formatTime(audio.currentTime);
    scrubber.value = (audio.currentTime / audio.duration) * 100 || 0;
  }
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', nextTrack);

// Scrubber interaction
scrubber.addEventListener('mousedown', () => { isScrubbing = true; });
scrubber.addEventListener('touchstart', () => { isScrubbing = true; });

scrubber.addEventListener('input', () => {
  const seekPercent = scrubber.value / 100;
  const seekTime = seekPercent * audio.duration;
  currentTimeEl.textContent = formatTime(seekTime);
});

scrubber.addEventListener('change', () => {
  const seekPercent = scrubber.value / 100;
  const seekTime = seekPercent * audio.duration;
  if (!isNaN(seekTime) && isFinite(seekTime)) {
    audio.currentTime = seekTime;
  }
  isScrubbing = false;
});

scrubber.addEventListener('mouseup', () => { isScrubbing = false; });
scrubber.addEventListener('touchend', () => { isScrubbing = false; });

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
  const filename = getTrackFromPath();
  if (filename) {
    const index = tracks.indexOf(filename);
    if (index !== -1 && index !== currentIndex) {
      currentIndex = index;
      audio.src = `/samples/${filename}`;
      trackNameEl.textContent = cleanName(filename);
      audio.play();
      generateBlob(filename);
      updateOGTags(filename);
    }
  }
});

// Load tracklist and start playing
async function init() {
  try {
    const response = await fetch('/tracklist.json');
    tracks = await response.json();

    // Check for legacy hash URLs first
    if (checkLegacyHash()) return;

    // Try to get track from path
    const urlTrack = getTrackFromPath();
    if (urlTrack) {
      const index = tracks.indexOf(urlTrack);
      playIndex(index !== -1 ? index : 0);
    } else {
      // Random starting position for new visitors at root
      const startIndex = Math.floor(Math.random() * tracks.length);
      playIndex(startIndex);
    }
  } catch (error) {
    console.error('Failed to load tracklist:', error);
    trackNameEl.textContent = 'Error loading tracklist';
  }
}

init();
