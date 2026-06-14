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