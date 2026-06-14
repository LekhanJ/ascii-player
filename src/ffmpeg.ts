export async function ensureFfmpeg() {
    const proc = Bun.spawnSync([
        "ffmpeg",
        "-version"
    ]);

    if (proc.exitCode !== 0) {
        throw new Error("ffmpeg is not installed");
    }
}