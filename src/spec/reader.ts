import {DataTarget} from "../util/data";

export interface DataReader {

    littleEndian: boolean;

    read(
        buf: DataTarget,
        byteOffset?: number,
        byteLength?: number
    ): Promise<number>;

    readBytes(length: number): Promise<Uint8Array>;

    readAll(): Promise<Uint8Array>;

    readAll(encoding: "bytes"): Promise<Uint8Array>;

    readAll(encoding: "utf8"): Promise<string>;

    readAll(encoding: "base64"): Promise<string>;

    readUint8(): Promise<number>;

    readInt8(): Promise<number>;

    readUint16(): Promise<number>;

    readInt16(): Promise<number>;

    readUint32(): Promise<number>;

    readInt32(): Promise<number>;

    readUint64(): Promise<bigint>;

    readInt64(): Promise<bigint>;

    readFloat16(): Promise<number>;

    readFloat32(): Promise<number>;

    readFloat64(): Promise<number>;

    readString(): Promise<string>;

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

    // @ts-ignore
    async readAll(encoding?: string): Promise<string | Uint8Array> {
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

        switch (encoding) {
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
