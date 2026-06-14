import { decodePng } from "./decoder";
import { renderAscii } from "./renderer";

export async function renderFrame(path: string): Promise<string> {
    const png = await decodePng(path);

    return renderAscii(
        png.pixels,
        png.width,
        png.height
    );
}