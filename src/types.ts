export type PngHeader = {
    width: number;
    height: number;
    bitDepth: number;
    colorType: number;
}

export type HuffmanEntry = {
    symbol: number;
    length: number;
    code: number;
};

export type HuffmanTable = {
    entries: HuffmanEntry[];
    lookup: Map<number, number>;
    maxLength: number;
};

export type Scanline = {
    filterType: number;
    data: Uint8Array;
};