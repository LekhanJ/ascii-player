import { join } from "path";
import { renderFrame } from "./renderframe";

export async function playFrames(framesDir: string, fps: number) {
    const frameDuration = 1000 / fps;

    const files = Array.from(new Bun.Glob("*.png").scanSync({ cwd: framesDir })).sort();

    // Hide cursor to prevent it flickering during playback
    process.stdout.write("\x1b[?25l");

    // Clear screen once upfront so we start clean
    process.stdout.write("\x1b[2J\x1b[H");

    try {
        for (const file of files) {
            const fullPath = join(framesDir, file);

            const ascii = await renderFrame(fullPath);

            // Move cursor to top-left WITHOUT clearing, new frame overwrites
            // old one in-place, so there's no blank flash between frames
            process.stdout.write("\x1b[H");

            process.stdout.write(ascii);

            await Bun.sleep(frameDuration);
        }
    } finally {
        // Always restore cursor even if playback is interrupted (Ctrl+C etc.)
        process.stdout.write("\x1b[?25h");
    }
}