# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**jmix** (also referred to as "Demo Radio") is a minimal radio-style streaming website for listening to samples from Jazzman, a synthesizer ecosystem. The site shuffles through MP3 files with a breathing bezier blob visualization that changes per track.

The full specification is documented in `demo-radio.md`.

## Design Philosophy

- **Minimal, mysterious aesthetic**: Paper/cream background (#FAF9F6), Times New Roman typography, no descriptions or explanations
- **Lo-fi radio energy**: Simple shuffle playback with visual accompaniment
- **Static site approach**: Build-time tracklist generation, no server-side logic

## Repository Structure

- `samples/`: Collection of MP3 audio files (.mp3, .wav, .mp4) and Ableton metadata (.asd files) generated from Jazzman synthesizer
- `demo-radio.md`: Complete specification for the jmix streaming player implementation
- `Videos/`: Video content related to the project
- `jmix/`: Directory for jmix implementation (currently empty)

## Implementation Status

**MVP is implemented in `jmix/` directory** with the following files:
- `index.html` - Main page with player UI using Green Audio Player library
- `style.css` - Styling with Times New Roman, cream background, custom overrides for Green Audio Player
- `player.js` - Shuffle/history logic with hardcoded tracklist (connects to Green Audio Player)
- `blob.js` - Canvas-based breathing blob visualization with seeded randomness

**Currently uses Green Audio Player** (battle-tested library) instead of custom playback controls for reliable seeking/scrubber functionality.

**Still needed for production:**
- `build-tracklist.js` - Node script to auto-generate tracklist from `samples/` directory
- `package.json` - Build script configuration
- `tracks/` directory (currently using `samples/` directly)

## Key Architecture Details

### Audio Playback System
- **Green Audio Player library**: Uses battle-tested [Green Audio Player](https://github.com/greghub/green-audio-player) via CDN for reliable playback controls and scrubber
- **Custom shuffle with history**: Tracks are played in random order, but prev/next buttons navigate through playback history
- **History navigation**: Going back replays history, going forward continues history if available, otherwise picks a new random track
- **Track selection**: Avoids repeating the current track when shuffling
- **Player integration**: Custom navigation (prev/next) works alongside Green Audio Player's built-in controls (play/pause, seek, time display)

### Blob Visualization
- **Seeded randomness**: Each track generates a consistent blob shape using the filename as a seed
- **Pastel color palette**: 8 predefined pastel colors selected per-track via seeded random
- **Breathing animation**: Subtle scale animation (±3%) using sine wave
- **Bezier curves**: Smooth blob rendering using quadratic curves through 6-8 control points

### Build Process
- Build script scans `tracks/` directory and generates `tracklist.json`
- Designed for Vercel deployment with automatic builds on push
- Git LFS recommended for tracking MP3 files

## Development Workflow

When implementing new features or fixing bugs:

1. Reference `demo-radio.md` for complete specification details
2. Maintain the minimal aesthetic - avoid feature creep
3. Test with files from `samples/` directory during development
4. Keep Times New Roman font and cream background consistent across all additions

## Audio File Management

- `samples/` contains MP3 files generated from Jazzman (the synthesizer ecosystem)
- Production implementation should use `tracks/` directory (not yet created)
- .asd files are Ableton Live metadata and should be ignored by build scripts
- Git LFS should be configured to track *.mp3 files for efficient version control
