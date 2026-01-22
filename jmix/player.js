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

// Tracklist loaded from JSON
let tracks = [];

let history = [];
let historyIndex = -1;
let isScrubbing = false;
let isUpdatingHash = false; // Flag to prevent hashchange loop

// Get track filename from URL hash
function getTrackFromURL() {
  const hash = window.location.hash.slice(1); // Remove '#'
  if (!hash) return null;

  // Check if this track exists in our list
  const track = tracks.find(t => t === hash);
  return track || null;
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

// Load and play a track
function loadTrack(filename) {
  audio.src = `./samples/${filename}`;
  trackNameEl.textContent = cleanName(filename);
  audio.play();

  // Update URL hash for sharing (with flag to prevent hashchange loop)
  isUpdatingHash = true;
  window.location.hash = filename;
  setTimeout(() => { isUpdatingHash = false; }, 0);

  // Generate new blob for this track
  generateBlob(filename);
}

// Sync icon state with actual audio state
audio.addEventListener('play', () => showPlayState(true));
audio.addEventListener('pause', () => showPlayState(false));

// Go to next track (shuffled)
function nextTrack() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    loadTrack(history[historyIndex]);
    return;
  }

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
  console.log('Metadata loaded, duration:', audio.duration);
});

audio.addEventListener('ended', nextTrack);

// Scrubber interaction
scrubber.addEventListener('mousedown', () => {
  isScrubbing = true;
  console.log('Scrub START');
});

scrubber.addEventListener('touchstart', () => {
  isScrubbing = true;
  console.log('Scrub START (touch)');
});

scrubber.addEventListener('input', () => {
  // Preview the time while dragging
  const seekPercent = scrubber.value / 100;
  const seekTime = seekPercent * audio.duration;
  currentTimeEl.textContent = formatTime(seekTime);
  console.log('Scrubbing to:', seekPercent * 100 + '%', 'seekTime:', seekTime);
});

scrubber.addEventListener('change', () => {
  // Actually perform the seek when user releases
  const seekPercent = scrubber.value / 100;
  const seekTime = seekPercent * audio.duration;

  console.log('Scrub END - attempting seek to:', seekTime, 'duration:', audio.duration, 'seekable:', audio.seekable.length > 0 ? audio.seekable.start(0) + '-' + audio.seekable.end(0) : 'none');

  if (!isNaN(seekTime) && isFinite(seekTime)) {
    audio.currentTime = seekTime;
    console.log('Set currentTime to:', audio.currentTime);
  }

  isScrubbing = false;
});

scrubber.addEventListener('mouseup', () => {
  isScrubbing = false;
});

scrubber.addEventListener('touchend', () => {
  isScrubbing = false;
});

// Handle hash changes while on the page
window.addEventListener('hashchange', () => {
  // Ignore if we're programmatically updating the hash
  if (isUpdatingHash) return;

  const urlTrack = getTrackFromURL();
  if (urlTrack) {
    // Add to history and play
    history.push(urlTrack);
    historyIndex = history.length - 1;
    loadTrack(urlTrack);
  }
});

// Load tracklist and start playing
async function init() {
  try {
    // Fetch tracklist.json
    const response = await fetch('tracklist.json');
    tracks = await response.json();

    // Start playing
    const urlTrack = getTrackFromURL();
    if (urlTrack) {
      // Load the track from URL
      history.push(urlTrack);
      historyIndex = 0;
      loadTrack(urlTrack);
    } else {
      // Default random shuffle behavior
      nextTrack();
    }
  } catch (error) {
    console.error('Failed to load tracklist:', error);
    trackNameEl.textContent = 'Error loading tracklist';
  }
}

init();
