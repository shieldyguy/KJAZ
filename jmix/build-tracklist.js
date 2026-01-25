#!/usr/bin/env node
// build-tracklist.js
// Scans samples/ directory and generates a SHUFFLED tracklist.json
// Run this at build time to create a new random order

const fs = require('fs');
const path = require('path');

const SAMPLES_DIR = path.join(__dirname, 'samples');
const OUTPUT_FILE = path.join(__dirname, 'tracklist.json');

// Fisher-Yates shuffle
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildTracklist() {
  try {
    // Read all files from samples directory
    const files = fs.readdirSync(SAMPLES_DIR);

    // Filter to only .mp3 files (exclude .asd, .wav, .mp4, etc.)
    const mp3Files = files
      .filter(file => file.endsWith('.mp3') && !file.endsWith('.mp3.asd'))
      .sort(); // Sort first for consistent base before shuffling

    // Shuffle the list
    const shuffled = shuffle(mp3Files);

    // Write to tracklist.json
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(shuffled, null, 2));

    console.log(`✓ Generated tracklist.json with ${shuffled.length} tracks (shuffled)`);
    return true;
  } catch (error) {
    console.error('Error building tracklist:', error.message);
    process.exit(1);
  }
}

buildTracklist();
