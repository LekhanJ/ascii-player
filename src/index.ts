const buffer = await Bun.file("/home/kenji/Projects/ascii/frames/frame_5700.png").arrayBuffer();

verifySignature(buffer);

const bytes = new Uint8Array(buffer);
let offset = 8;

while (offset < bytes.length) {
    const length = readUInt32(bytes, offset);
    offset += 4;

    const type = getChunkType(bytes, offset);
    offset += 4;

    console.log(`${type}: ${length} bytes`);
    
    offset += length;

    const crc = readUInt32(bytes, offset);
    offset += 4

    if (type == "IEND") {
        break;
    }
}

function getChunkType(bytes: Uint8Array, offset: number): string {
    return String.fromCharCode(bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!)
}

function readUInt32(bytes: Uint8Array, offset: number): number {
    return ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0;
}

function verifySignature(imageBuffer: ArrayBuffer) {
    const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

    const signature = new Uint8Array(imageBuffer.slice(0, PNG_SIGNATURE.length));

    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
        if (PNG_SIGNATURE[i] !== signature[i]) {
            throw new Error("Format mismatch!!!");
            break;
        }
    }
    console.log("Signature verified");
}