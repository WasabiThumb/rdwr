import {DataTarget} from "../util/data";

type Encoding = [] | ["bytes"] | ["utf8"] | ["base64"];
type Encoded<E extends Encoding> = E extends { length: 0 } ? Uint8Array :
    E extends ["bytes"] ? Uint8Array :
        E extends ["utf8"] ? string :
            E extends ["base64"] ? string :
                never;

/**
 * Abstraction for reading sequential binary data,
 * backed by a stream when possible
 */
export interface DataReader {

    /**
     * Endianness flag. When true, multibyte values
     * are read as little-endian. Defaults to false.
     */
    littleEndian: boolean;

    /**
     * Reads from this source into the given buffer and advances the position
     * by the number of bytes read.
     * @param buf The buffer to receive the data
     * @param byteOffset The offset into the buffer. Defaults to 0.
     * @param byteLength The number of bytes to read. Defaults to buffer capacity.
     * @returns Number of bytes written, or -1 if EOF. Will be nonzero
     * as long as "byteLength" is nonzero.
     */
    read(
        buf: DataTarget,
        byteOffset?: number,
        byteLength?: number
    ): Promise<number>;

    /**
     * Read the specified number of bytes into a newly allocated buffer
     * and advances the position by that number.
     * Fails if EOF is encountered before all bytes can be read.
     */
    readBytes(length: number): Promise<Uint8Array>;

    /**
     * Reads from the current position to EOF and stores the result
     * in a newly allocated buffer.
     * @param encoding Encoding to use. If unset or "bytes", returns a
     * {@link Uint8Array}. If "base64", returns a base64 encoded string.
     * If "utf8", returns a UTF-8 string.
     */
    readAll<E extends Encoding>(...encoding: E): Promise<Encoded<E>>;

    /**
     * Reads an unsigned 8-bit integer
     * and advances the position by 1 byte.
     */
    readUint8(): Promise<number>;

    /**
     * Reads an signed 8-bit integer
     * and advances the position by 1 byte.
     */
    readInt8(): Promise<number>;

    /**
     * Reads an unsigned 16-bit integer with the configured {@link #littleEndian endianness}
     * and advances the position by 2 bytes.
     */
    readUint16(): Promise<number>;

    /**
     * Reads a signed 16-bit integer with the configured {@link #littleEndian endianness}
     * and advances the position by 2 bytes.
     */
    readInt16(): Promise<number>;

    /**
     * Reads an unsigned 32-bit integer with the configured {@link #littleEndian endianness}
     * and advances the position by 4 bytes.
     */
    readUint32(): Promise<number>;

    /**
     * Reads a signed 32-bit integer with the configured {@link #littleEndian endianness}
     * and advances the position by 4 bytes.
     */
    readInt32(): Promise<number>;

    /**
     * Reads an unsigned 64-bit integer with the configured {@link #littleEndian endianness}
     * and advances the position by 8 bytes.
     */
    readUint64(): Promise<bigint>;

    /**
     * Reads a signed 64-bit integer with the configured {@link #littleEndian endianness}
     * and advances the position by 8 bytes.
     */
    readInt64(): Promise<bigint>;

    /**
     * Reads an 16-bit float with the configured {@link #littleEndian endianness}
     * and advances the position by 2 bytes.
     * **Limited browser support.**
     */
    readFloat16(): Promise<number>;

    /**
     * Reads an 32-bit float with the configured {@link #littleEndian endianness}
     * and advances the position by 4 bytes.
     */
    readFloat32(): Promise<number>;

    /**
     * Reads an 64-bit float with the configured {@link #littleEndian endianness}
     * and advances the position by 8 bytes.
     */
    readFloat64(): Promise<number>;

    /**
     * Reads a length-encoded UTF-8 string.
     * This is the length of the encoded bytes as a {@link readUint32 32-bit unsigned integer}
     * followed by that number of bytes.
     */
    readString(): Promise<string>;

    /**
     * Closes the reader, freeing any
     * resources it controls.
     */
    close(): Promise<void>;

}

/** @internal */
export abstract class AbstractDataReader implements DataReader {

    protected _littleEndian: boolean;

    protected constructor() {
        this._littleEndian = false;
    }

    //

    get littleEndian(): boolean {
        return this._littleEndian;
    }

    set littleEndian(value: any) {
        this._littleEndian = !!value;
    }

    abstract read(
        buf: DataTarget,
        byteOffset?: number,
        byteLength?: number
    ): Promise<number>;

    async readBytes(length: number): Promise<Uint8Array> {
        const u8 = new Uint8Array(length);
        let head: number = 0;
        let read: number;

        while (head < length) {
            read = await this.read(u8, head, length - head);
            if (read == -1) throw new Error("Unexpected end of data");
            head += read;
        }

        return u8;
    }

    async readAll<E extends Encoding>(...encoding: E): Promise<Encoded<E>> {
        let capacity: number = 4096;
        let length: number = 0;
        let buf = new ArrayBuffer(capacity);
        let read: number;

        function realloc(n: number) {
            if ("transfer" in buf) {
                buf = buf.transfer(n);
            } else {
                const cpy = new ArrayBuffer(n);
                (new Uint8Array(cpy)).set(new Uint8Array(buf, 0, length), 0);
                buf = cpy;
            }
        }

        while (true) {
            read = await this.read(buf, length, capacity - length);
            if (read === -1) break;
            length += read;
            if (length === capacity) {
                const nc = capacity << 1;
                realloc(nc);
                capacity = nc;
            }
        }

        switch (encoding.length && encoding[0]) {
            case "utf8":
                // @ts-ignore
                return (new TextDecoder()).decode(new Uint8Array(buf, 0, length));
            case "base64":
                const blob = new Blob([ new Uint8Array(buf, 0, length) ]);
                const reader = new FileReader();
                const promise = new Promise<string>((resolve, reject) => {
                    reader.addEventListener("load", () => {
                        const url = reader.result as string;
                        const idx = url.indexOf(`;base64,`);
                        resolve(url.substring(idx + 8));
                    });
                    reader.addEventListener("error", () => {
                        reject(reader.error);
                    });
                });
                reader.readAsDataURL(blob);
                // @ts-ignore
                return promise;
            case "bytes":
            default:
                realloc(length);
                // @ts-ignore
                return new Uint8Array(buf);
        }
    }

    async readUint8(): Promise<number> {
        const u8 = await this.readBytes(1);
        return u8[0]!;
    }

    async readInt8(): Promise<number> {
        const u8 = await this.readBytes(1);
        const dv = new DataView(u8.buffer);
        return dv.getInt8(0);
    }

    async readUint16(): Promise<number> {
        const u8 = await this.readBytes(2);
        const dv = new DataView(u8.buffer);
        return dv.getUint16(0, this._littleEndian);
    }

    async readInt16(): Promise<number> {
        const u8 = await this.readBytes(2);
        const dv = new DataView(u8.buffer);
        return dv.getInt16(0, this._littleEndian);
    }

    async readUint32(): Promise<number> {
        const u8 = await this.readBytes(4);
        const dv = new DataView(u8.buffer);
        return dv.getUint32(0, this._littleEndian);
    }

    async readInt32(): Promise<number> {
        const u8 = await this.readBytes(4);
        const dv = new DataView(u8.buffer);
        return dv.getInt32(0, this._littleEndian);
    }

    async readUint64(): Promise<bigint> {
        const u8 = await this.readBytes(8);
        const dv = new DataView(u8.buffer);
        return dv.getBigUint64(0, this._littleEndian);
    }

    async readInt64(): Promise<bigint> {
        const u8 = await this.readBytes(8);
        const dv = new DataView(u8.buffer);
        return dv.getBigInt64(0, this._littleEndian);
    }

    async readFloat16(): Promise<number> {
        const u8 = await this.readBytes(2);
        const dv = new DataView(u8.buffer);
        return dv.getFloat16(0, this._littleEndian);
    }

    async readFloat32(): Promise<number> {
        const u8 = await this.readBytes(4);
        const dv = new DataView(u8.buffer);
        return dv.getFloat32(0, this._littleEndian);
    }

    async readFloat64(): Promise<number> {
        const u8 = await this.readBytes(8);
        const dv = new DataView(u8.buffer);
        return dv.getFloat64(0, this._littleEndian);
    }

    async readString(): Promise<string> {
        const len = await this.readUint32();
        const data = await this.readBytes(len);
        return (new TextDecoder()).decode(data);
    }

    abstract close(): Promise<void>;

}
