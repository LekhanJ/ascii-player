import { BitReader } from "./bitreader";

const buffer = await Bun.file("/home/kenji/Projects/ascii/frames/frame_5700.png").arrayBuffer();
const bytes = new Uint8Array(buffer);
const idatChunks: Uint8Array[] = [];

verifySignature(bytes);
walkBytes(bytes);

const merged = mergeAllIdatChunks();

const { cmf, flg } = getZlibHeaders(merged);

const compressionMethod = cmf! & 0b1111;  // get lower 4 bits (CM)
const compressionInfo = cmf! >> 4;        // get upper 4 bits (CINFO)

const flagCheck = flg! & 0b11111;         // get the lower 4 bits (FCHECK)
const fDict = (flg! >> 5) & 1;            // get the 5th bit (FDICT)
const fLevel = flg! >> 6;                 // get the upper 2 bits (FLEVEL)

if (compressionMethod !== 8) throw new Error("Unsupported compression method");

const header = (cmf! << 8) | flg!;        // zlib checksum rule: (CMF * 256 + FLG) % 31 should be 0
if (header % 31 !== 0) {
    throw new Error("Invalid zlib header");
}
    

function getZlibHeaders(data: Uint8Array) {
    return {
        cmf: data[0],
        flg: data[1]
    }
}

function walkBytes(bytes: Uint8Array) {
    let offset = 8;
    while (offset < bytes.length) {
        const length = readUInt32(bytes, offset);
        offset += 4;

        const type = getChunkType(bytes, offset);
        offset += 4;

        if (type == "IHDR") {
            const headerData = bytes.slice(offset, offset + length);
            parseHeaderData(headerData);
        }
        if (type == "IDAT") {
            idatChunks.push(
                bytes.slice(offset, offset + length)
            );
        }
        
        offset += length;

        const crc = readUInt32(bytes, offset);
        offset += 4

        if (type == "IEND") {
            break;
        }
    }
}

function mergeAllIdatChunks(): Uint8Array {
    const totalSize = idatChunks.reduce(
        (sum, chunk) => sum + chunk.length,
        0
    );

    console.log(totalSize);

    const merged = new Uint8Array(totalSize);

    let position = 0;

    for (const chunk of idatChunks) {
        merged.set(chunk, position);
        position += chunk.length;
    }

    return merged;
}

function parseHeaderData(data: Uint8Array) {
    const width = readUInt32(data, 0);
    const height = readUInt32(data, 4);

    const bitDepth = data[8];
    const colorType = data[9];

    console.log(`Width: ${width}`);
    console.log(`Height: ${height}`);
    console.log(`Bit Depth: ${bitDepth}`);
    console.log(`Color Type: ${colorType}`);
}

function getChunkType(bytes: Uint8Array, offset: number): string {
    return String.fromCharCode(bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!)
}

function readUInt32(bytes: Uint8Array, offset: number): number {
    return ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0;
}

function verifySignature(imageBytes: Uint8Array) {
    const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

    const signature = imageBytes.slice(0, PNG_SIGNATURE.length);

    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
        if (PNG_SIGNATURE[i] !== signature[i]) {
            throw new Error("Format mismatch!!!");
            break;
        }
    }
    console.log("Signature verified");
}