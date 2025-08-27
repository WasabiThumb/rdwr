import {AbstractDataReader} from "../../spec/reader";
import {DataTarget} from "../../util/data";

/** @internal */
export class ArrayBufferDataReader extends AbstractDataReader {

    private readonly _src: Uint8Array;
    private _head: number;

    constructor(src: ArrayBufferLike, offset?: number, length?: number) {
        super();
        this._src = new Uint8Array(src, offset, length);
        this._head = 0;
    }

    //

    async read(buf: DataTarget, byteOffset?: number, byteLength?: number): Promise<number> {
        const rem = this._src.length - this._head;
        if (rem === 0) return -1;
        if (byteLength === 0) return 0;

        const u8 = DataTarget.asBytes(buf);
        byteOffset = byteOffset || 0;
        byteLength = Math.min(rem, byteLength || buf.byteLength);

        const view = this._src.subarray(this._head, this._head + byteLength);
        u8.set(view, byteOffset);
        this._head += byteLength;
        return byteLength;
    }

    async close(): Promise<void> { }

}
