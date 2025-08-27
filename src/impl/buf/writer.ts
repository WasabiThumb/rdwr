import {AbstractDataWriter, MemoryDataWriter} from "../../spec/writer";
import {DataSource} from "../../util/data";

/** @internal */
export class ArrayBufferDataWriter extends AbstractDataWriter implements MemoryDataWriter {

    private _buf: ArrayBuffer;
    private _capacity: number;
    private _len: number;
    private readonly _closeAction: (self: ArrayBufferDataWriter) => void;

    constructor(initialCapacity: number = 16, closeAction?: (self: ArrayBufferDataWriter) => void) {
        super();
        this._buf = new ArrayBuffer(initialCapacity);
        this._capacity = initialCapacity;
        this._len = 0;
        this._closeAction = typeof closeAction === "function" ? closeAction : (() => {});
    }

    get data(): Uint8Array {
        return new Uint8Array(this._buf, 0, this._len);
    }

    async write(buf: DataSource, byteOffset?: number, byteLength?: number): Promise<void> {
        const u8 = await DataSource.asBytes(buf);
        byteOffset = byteOffset || 0;
        byteLength = byteLength || u8.length;
        const view = u8.subarray(byteOffset, byteOffset + byteLength);

        while ((this._capacity - this._len) < byteLength) {
            const nc = this._capacity << 1;
            if ("transfer" in this._buf) {
                this._buf = this._buf.transfer(nc);
            } else {
                const cpy = new ArrayBuffer(nc);
                (new Uint8Array(cpy)).set(new Uint8Array(this._buf, 0, this._len), 0);
                this._buf = cpy;
            }
            this._capacity = nc;
        }

        (new Uint8Array(this._buf, this._len, byteLength)).set(view, 0);
        this._len += byteLength;
    }

    async close(): Promise<void> {
        this._closeAction(this);
    }

}
