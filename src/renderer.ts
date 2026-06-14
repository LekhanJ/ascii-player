export function colorize(char: string, r: number, g: number, b: number): string {
    return `\x1b[38;2;${r};${g};${b}m${char}`;
}

export function resetColor(): string {
    return "\x1b[0m";
}

export function renderAscii(pixels: Uint8Array, width: number, height: number): string {
    const targetWidth = 140;
    const xStep = width / targetWidth;
    const yStep = xStep * 2;

    let frame = "";

    for (let y = 0; y < height; y += yStep) {
        let line = "";

        for (let x = 0; x < width; x += xStep) {
            const pixelX = Math.floor(x);
            const pixelY = Math.floor(y);

            const pixelIndex = (pixelY * width + pixelX) * 3;

            const r = pixels[pixelIndex]!;
            const g = pixels[pixelIndex + 1]!;
            const b = pixels[pixelIndex + 2]!;

            const char = "█";

            line += colorize(char, r, g, b);
        }

        frame += line + resetColor() + "\n";
    }

    return frame;
}

export function brightness(r: number, g: number, b: number): number {
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}