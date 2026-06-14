import { BitReader } from "./bitreader";
import type { HuffmanEntry, HuffmanTable } from "./types";

const buffer = await Bun.file("/home/kenji/Projects/ascii/frames/frame_5700.png").arrayBuffer();
const bytes = new Uint8Array(buffer);
const idatChunks: Uint8Array[] = [];

verifySignature(bytes);
walkBytes(bytes);

const merged = mergeAllIdatChunks();

const { cmf, flg } = getZlibHeaders(merged);

const compressionMethod = cmf! & 0b1111;  // get lower 4 bits (CM)
const compressionInfo = cmf! >> 4;        // get upper 4 bits (CINFO)

const flagCheck = flg! & 0b11111;         // get the lower 5 bits (FCHECK)
const fDict = (flg! >> 5) & 1;            // get the 6th bit (FDICT)
const fLevel = flg! >> 6;                 // get the upper 2 bits (FLEVEL)

if (compressionMethod !== 8) throw new Error("Unsupported compression method");

const header = (cmf! << 8) | flg!;        // zlib checksum rule: (CMF * 256 + FLG) % 31 should be 0
if (header % 31 !== 0) {
    throw new Error("Invalid zlib header");
}

const deflateData = merged.slice(2, merged.length - 4);
const reader = new BitReader(deflateData);

const bfinal = reader.readBits(1);
const btype = reader.readBits(2);
console.log({
    bfinal, 
    btype
});

const hlit = reader.readBits(5);
const hdist = reader.readBits(5);
const hclen = reader.readBits(4);
console.log({
    hlit,
    hdist,
    hclen
});

const CODE_LENGTH_ORDER = [
  16, 17, 18,
   0,  8,  7,  9,
   6, 10,  5, 11,
   4, 12,  3, 13,
   2, 14,  1, 15
];

const codeLengths = new Array(19).fill(0);
for (let i=0; i < hclen+4; i++) {
    const length = reader.readBits(3);

    codeLengths[CODE_LENGTH_ORDER[i]!] = length;   // get lengths of Huffman codes
}

console.log({
    codeLengths
});

const codeLengthTable = buildCanonicalHuffman(codeLengths);

const totalLengths = (hlit + 257) + (hdist + 1);
const lengths: number[] = [];
while (lengths.length < totalLengths) {
    const codeLengthSymbol = decodeSymbol(reader, codeLengthTable);
    
    if (codeLengthSymbol >=0 && codeLengthSymbol <= 15) {
        lengths.push(codeLengthSymbol);
    } else if (codeLengthSymbol === 16) {
        const extra = reader.readBits(2);
        const repeatCount = extra + 3;
        const previous = lengths[lengths.length - 1];

        if (previous === undefined) {
            throw new Error("16 without previous length");
        }

        for (let i = 0; i < repeatCount; i++) {
            lengths.push(previous);
        }
    } else if (codeLengthSymbol === 17) {
        const extra = reader.readBits(3);
        const repeatCount = extra + 3;

        for (let i = 0; i < repeatCount; i++) {
            lengths.push(0);
        }
    } else if (codeLengthSymbol === 18) {
        const extra = reader.readBits(7);
        const repeatCount = extra + 11;

        for (let i = 0; i < repeatCount; i++) {
            lengths.push(0);
        }
    }
}

const literalLengths = lengths.slice(0, hlit + 257);
const distanceLengths = lengths.slice(hlit + 257);

const literalTable = buildCanonicalHuffman(literalLengths);
const distanceTable = buildCanonicalHuffman(distanceLengths);

const LENGTH_BASE = [
    3, 4, 5, 6, 7, 8, 9, 10,
    11, 13, 15, 17,
    19, 23, 27, 31,
    35, 43, 51, 59,
    67, 83, 99, 115,
    131, 163, 195, 227,
    258
];

const LENGTH_EXTRA = [
    0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1,
    2, 2, 2, 2,
    3, 3, 3, 3,
    4, 4, 4, 4,
    5, 5, 5, 5,
    0
];

const DIST_BASE = [
    1,     2,     3,     4,
    5,     7,     9,     13,
    17,    25,    33,    49,
    65,    97,    129,   193,
    257,   385,   513,   769,
    1025,  1537,  2049,  3073,
    4097,  6145,  8193,  12289,
    16385, 24577
];

const DIST_EXTRA = [
    0, 0, 0, 0,
    1, 1, 2, 2,
    3, 3, 4, 4,
    5, 5, 6, 6,
    7, 7, 8, 8,
    9, 9, 10, 10,
    11, 11, 12, 12,
    13, 13
];

const output: number[] = [];
while (true) {
    const literalSymbol = decodeSymbol(reader, literalTable);
    
    // literal byte
    if (literalSymbol < 256) {
        output.push(literalSymbol);
        continue;
    }

    if (literalSymbol === 256) {
        console.log("End of block");
        break;
    }

    // length code
    const lengthIndex = literalSymbol - 257;
    const baseLength = LENGTH_BASE[lengthIndex]!;
    const lengthExtraBits = LENGTH_EXTRA[lengthIndex]!;
    const lengthExtra = reader.readBits(lengthExtraBits);
    const length = baseLength + lengthExtra;

    // distance code
    const distanceSymbol = decodeSymbol(reader, distanceTable);
    
    const distanceBase = DIST_BASE[distanceSymbol]!;
    const distanceExtraBits =  DIST_EXTRA[distanceSymbol]!;
    const distanceExtra = reader.readBits(distanceExtraBits);
    const distance = distanceBase + distanceExtra;

    // copy previous bytes
    for (let i = 0; i < length; i++) {
        const value = output[output.length - distance];

        if (value === undefined) {
            throw new Error(`Invalid distance ${distance}`);
        }

        output.push(value);
    }
}

console.log(
    "Inflated bytes:",
    output.length
);


function decodeSymbol(reader: BitReader, table: HuffmanTable): number {

    let code = 0;
    
    for (let length = 1; length <= table.maxLength; length++) {
        const bit = reader.readBit();

        code |= bit << (length - 1);
        
        const key = (length << 16) | code;

        const symbol = table.lookup.get(key);

        if (symbol !== undefined) return symbol;
    }

    throw new Error("Invalid Huffman code")
}

function reverseBits(code: number, length: number) {
    let reversed = 0;

    for (let i = 0; i < length; i++) {
        reversed <<= 1;
        reversed |= code & 1;
        code >>= 1;
    }

    return reversed;
}

function buildCanonicalHuffman(lengths: number[]): HuffmanTable {
    const blCount = new Map<number, number>();

    for (const len of lengths) {
        if (len === 0) continue;

        blCount.set(len, (blCount.get(len) ?? 0) + 1);
    }

    const maxLength = Math.max(...lengths);
    const nextCode = new Array(maxLength + 1).fill(0);
    
    let code = 0;
    for (let bits = 1; bits <= maxLength; bits++) {
        const previousLengthCount = blCount.get(bits - 1) ?? 0;
        code = (code + previousLengthCount) << 1;
        nextCode[bits] = code;
    }

    const entries: HuffmanEntry[] = [];

    for (let symbol = 0; symbol < lengths.length; symbol++) {
        const len = lengths[symbol];

        if (len === 0) continue;

        const code = nextCode[len!];

        entries.push({
            symbol,
            length: len!,
            code
        });

        nextCode[len!]++;
    }

    const lookup = new Map<number, number>();

    for (const entry of entries) {
        const reverseCode = reverseBits(entry.code, entry.length);

        const key = (entry.length << 16) | reverseCode;

        lookup.set(key, entry.symbol);
    }

    return {
        entries,
        lookup,
        maxLength
    };
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