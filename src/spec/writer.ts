import {DataSource} from "../util/data";

/**
 * Abstraction for writing sequential binary data,
 * backed by a stream when possible
 */
export interface DataWriter {

    /**
     * Endianness flag. When true, multibyte values
     * are written as little-endian. Defaults to false.
     */
    littleEndian: boolean;

    /**
     * Writes the given buffer to this writer
     * @param buf The buffer to write
     * @param byteOffset The offset into the buffer. Defaults to 0.
     * @param byteLength The length of the buffer. Defaults to intrinsic length.
     */
    write(
        buf: DataSource,
        byteOffset?: number,
        byteLength?: number
    ): Promise<void>;

    /**
     * Writes an unsigned 8-bit integer
     */
    writeUint8(n: number): Promise<void>;

    /**
     * Writes a signed 8-bit integer
     */
    writeInt8(n: number): Promise<void>;

    /**
     * Writes an unsigned 16-bit integer
     * with the configured {@link #littleEndian endianness}
     */
    writeUint16(n: number): Promise<void>;

    /**
     * Writes a signed 16-bit integer
     * with the configured {@link #littleEndian endianness}
     */
    writeInt16(n: number): Promise<void>;

    /**
     * Writes an unsigned 32-bit integer
     * with the configured {@link #littleEndian endianness}
     */
    writeUint32(n: number): Promise<void>;

    /**
     * Writes a signed 32-bit integer
     * with the configured {@link #littleEndian endianness}
     */
    writeInt32(n: number): Promise<void>;

    /**
     * Writes an unsigned 64-bit integer
     * with the configured {@link #littleEndian endianness}
     */
    writeUint64(n: number | bigint): Promise<void>;

    /**
     * Writes a signed 64-bit integer
     * with the configured {@link #littleEndian endianness}
     */
    writeInt64(n: number | bigint): Promise<void>;

    /**
     * Writes a 16-bit float
     * with the configured {@link #littleEndian endianness}.
     * **Limited browser support.**
     */
    writeFloat16(n: number): Promise<void>;

    /**
     * Writes a 32-bit float
     * with the configured {@link #littleEndian endianness}.
     */
    writeFloat32(n: number): Promise<void>;

    /**
     * Writes a 64-bit float
     * with the configured {@link #littleEndian endianness}.
     */
    writeFloat64(n: number): Promise<void>;

    /**
     * Writes a UTF-8 encoded string, prefixed with the
     * length of the string in code units
     * as a {@link #writeUint32 32-bit unsigned integer}.
     */
    writeString(s: string): Promise<void>;

    /**
     * Closes the writer, releasing any resources
     * it controls.
     */
    close(): Promise<void>;

}

/**
 * A DataWriter which writes to an internal buffer,
 * accessible with the {@link MemoryDataWriter#data data property}.
 */
export interface MemoryDataWriter extends DataWriter {

    /**
     * The buffer being written to.
     * Writing more data to this writer may cause a value
     * yielded by this getter to become invalid.
     */
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
