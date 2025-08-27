import {DataSource} from "../util/data";

export interface DataWriter {

    littleEndian: boolean;

    write(
        buf: DataSource,
        byteOffset?: number,
        byteLength?: number
    ): Promise<void>;

    writeUint8(n: number): Promise<void>;

    writeInt8(n: number): Promise<void>;

    writeUint16(n: number): Promise<void>;

    writeInt16(n: number): Promise<void>;

    writeUint32(n: number): Promise<void>;

    writeInt32(n: number): Promise<void>;

    writeUint64(n: number | bigint): Promise<void>;

    writeInt64(n: number | bigint): Promise<void>;

    writeFloat16(n: number): Promise<void>;

    writeFloat32(n: number): Promise<void>;

    writeFloat64(n: number): Promise<void>;

    writeString(s: string): Promise<void>;

    close(): Promise<void>;

}

export interface MemoryDataWriter extends DataWriter {

    readonly data: Uint8Array;

}

/** @internal */
export abstract class AbstractDataWriter implements DataWriter {

    protected _littleEndian: boolean;
    protected _buffer: DataView;

    constructor() {
        this._littleEndian = false;
        this._buffer = new DataView(new ArrayBuffer(8));
    }

    //

    get littleEndian(): boolean {
        return this._littleEndian;
    }

    set littleEndian(v: any) {
        this._littleEndian = !!v;
    }

    abstract write(buf: DataSource, byteOffset?: number, byteLength?: number): Promise<void>;

    async writeUint8(n: number): Promise<void> {
        this._buffer.setUint8(0, n);
        await this.write(this._buffer, 0, 1);
    }

    async writeInt8(n: number): Promise<void> {
        this._buffer.setInt8(0, n);
        await this.write(this._buffer, 0, 1);
    }

    async writeUint16(n: number): Promise<void> {
        this._buffer.setUint16(0, n, this._littleEndian);
        await this.write(this._buffer, 0, 2);
    }

    async writeInt16(n: number): Promise<void> {
        this._buffer.setInt16(0, n, this._littleEndian);
        await this.write(this._buffer, 0, 2);
    }

    async writeUint32(n: number): Promise<void> {
        this._buffer.setUint32(0, n, this._littleEndian);
        await this.write(this._buffer, 0, 4);
    }

    async writeInt32(n: number): Promise<void> {
        this._buffer.setInt32(0, n, this._littleEndian);
        await this.write(this._buffer, 0, 4);
    }

    async writeUint64(n: number | bigint): Promise<void> {
        this._buffer.setBigUint64(0, BigInt(n), this._littleEndian);
        await this.write(this._buffer, 0, 8);
    }

    async writeInt64(n: number | bigint): Promise<void> {
        this._buffer.setBigInt64(0, BigInt(n), this._littleEndian);
        await this.write(this._buffer, 0, 8);
    }

    async writeFloat16(n: number): Promise<void> {
        this._buffer.setFloat16(0, n, this._littleEndian);
        await this.write(this._buffer, 0, 2);
    }

    async writeFloat32(n: number): Promise<void> {
        this._buffer.setFloat32(0, n, this._littleEndian);
        await this.write(this._buffer, 0, 4);
    }

    async writeFloat64(n: number): Promise<void> {
        this._buffer.setFloat64(0, n, this._littleEndian);
        await this.write(this._buffer, 0, 8);
    }

    async writeString(s: string): Promise<void> {
        const bin = (new TextEncoder()).encode(s);
        await this.writeUint32(bin.length);
        await this.write(bin);
    }

    abstract close(): Promise<void>;

}
