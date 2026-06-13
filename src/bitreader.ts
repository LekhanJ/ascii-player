export class BitReader {
    private bytePos = 0;
    private bitPos = 0;

    constructor(private readonly data: Uint8Array) {}

    readBit(): number {
        const byte = this.data[this.bytePos];

        if (byte === undefined) throw new Error("Unexpected end of data");

        const bit = byte >> this.bitPos & 1;

        this.bitPos++;

        if (this.bitPos === 8) {
            this.bitPos = 0;
            this.bytePos++;
        }
        
        return bit;
    }

    readBits(count: number): number {
        let result = 0;

        for (let i = 0; i < count; i++) {
            result |= this.readBit() << i;
        }

        return result;
    }
}