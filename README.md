# ASCII Video Player

A terminal-based video player that renders videos as colored ASCII frames.

This project extracts video frames with FFmpeg, decodes PNG files from scratch (including zlib, DEFLATE, dynamic Huffman trees, and LZ77 decompression), converts pixels into colored terminal characters, and plays the result directly in the terminal.

## Features

* Video → ASCII conversion
* Full PNG decoder written from scratch
* Custom DEFLATE implementation
* Dynamic and fixed Huffman support
* ANSI true-color terminal rendering
* Frame extraction using FFmpeg

## Installation

```bash
bun install
```

Make sure FFmpeg is installed and available in your PATH.

## Usage

```bash
bun run src/index.ts <video.mp4>
```

Example:

```bash
bun run src/index.ts vid.mp4
```

## How It Works

```text
Video
 ↓
FFmpeg Frame Extraction
 ↓
PNG Decoder
 ↓
zlib
 ↓
DEFLATE
 ↓
RGB Pixels
 ↓
Colored ASCII
 ↓
Terminal Playback
```

## Why?

This started as an experiment to play videos in the terminal, but quickly turned into a deep dive into the PNG format, Huffman coding, canonical Huffman trees, and the DEFLATE compression algorithm.

Built with TypeScript and Bun.

