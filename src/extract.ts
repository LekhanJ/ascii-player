export async function extractFrames(videoPath: string) {
    const framesDir = `.ascii-cache-${Date.now()}`;

    await Bun.$`mkdir ${framesDir}`;

    await Bun.spawn([
        "ffmpeg",
        "-i",
        videoPath,
        `${framesDir}/frame_%06d.png`
    ]).exited;

    return {
        framesDir,
        fps: 30
    };
}