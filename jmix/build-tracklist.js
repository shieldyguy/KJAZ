#!/usr/bin/env node
// build-tracklist.js
// Scans samples/ directory and generates tracklist.json

const fs = require('fs');
const path = require('path');

const SAMPLES_DIR = path.join(__dirname, '../samples');
const OUTPUT_FILE = path.join(__dirname, 'tracklist.json');

function buildTracklist() {
  try {
    // Read all files from samples directory
    const files = fs.readdirSync(SAMPLES_DIR);

    // Filter to only .mp3 files (exclude .asd, .wav, .mp4, etc.)
    const mp3Files = files
      .filter(file => file.endsWith('.mp3') && !file.endsWith('.mp3.asd'))
      .sort(); // Alphabetical order

    // Write to tracklist.json
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mp3Files, null, 2));

    console.log(`✓ Generated tracklist.json with ${mp3Files.length} tracks`);
    return true;
  } catch (error) {
    console.error('Error building tracklist:', error.message);
    process.exit(1);
  }
}

buildTracklist();
