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
// Each visitor starts at a random position, then cycles through the fixed order
let tracks = [];
let currentIndex = 0;
let isScrubbing = false;
let isUpdatingHash = false;

// Get track filename from URL hash
function getTrackFromURL() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return tracks.includes(hash) ? hash : null;
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

  audio.src = `./samples/${filename}`;
  trackNameEl.textContent = cleanName(filename);
  audio.play();

  // Update URL hash for sharing
  isUpdatingHash = true;
  window.location.hash = filename;
  setTimeout(() => { isUpdatingHash = false; }, 0);

  // Generate new blob for this track
  generateBlob(filename);
}

// Navigation: just move through the pre-shuffled list
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

// Handle hash changes (e.g., user pastes a shared link while on page)
window.addEventListener('hashchange', () => {
  if (isUpdatingHash) return;

  const urlTrack = getTrackFromURL();
  if (urlTrack) {
    const index = tracks.indexOf(urlTrack);
    if (index !== -1) {
      playIndex(index);
    }
  }
});

// Load tracklist and start playing
async function init() {
  try {
    const response = await fetch('tracklist.json');
    tracks = await response.json();

    const urlTrack = getTrackFromURL();
    if (urlTrack) {
      // Start at the shared track's position in the sequence
      const index = tracks.indexOf(urlTrack);
      playIndex(index !== -1 ? index : 0);
    } else {
      // Random starting position for new visitors
      const startIndex = Math.floor(Math.random() * tracks.length);
      playIndex(startIndex);
    }
  } catch (error) {
    console.error('Failed to load tracklist:', error);
    trackNameEl.textContent = 'Error loading tracklist';
  }
}

init();
