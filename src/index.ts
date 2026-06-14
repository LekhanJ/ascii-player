import { ensureFfmpeg } from "./ffmpeg";
import { extractFrames } from "./extract";
import { playFrames } from "./player";

const videoPath = process.argv[2];

if (!videoPath) {
    console.error("Usage: bun run src/index.ts <video.mp4>");
    process.exit(1);
}

await ensureFfmpeg();

const metadata = await extractFrames(videoPath);

try {
    await playFrames(metadata.framesDir, metadata.fps);
} finally {
    await Bun.$`rm -rf ${metadata.framesDir}`;
}