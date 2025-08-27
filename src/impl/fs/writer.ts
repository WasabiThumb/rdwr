import {AbstractDataWriter} from "../../spec/writer";
import {DataSource} from "../../util/data";

export class FileStreamDataWriter extends AbstractDataWriter {

    private readonly _handle: FileSystemWritableFileStream;

    constructor(handle: FileSystemWritableFileStream) {
        super();
        this._handle = handle;
    }

    //

    async write(buf: DataSource, byteOffset?: number, byteLength?: number): Promise<void> {
        let u8: Uint8Array = await DataSource.asBytes(buf);
        if (typeof byteOffset === "number" || typeof byteLength === "number") {
            if (byteLength === 0) return;
            const offset = byteOffset || 0;
            u8 = u8.subarray(
                offset,
                offset + (byteLength || u8.byteLength)
            );
        }
        await this._handle.write(u8 as ArrayBufferView<ArrayBuffer>);
    }

    async close(): Promise<void> {
        await this._handle.close();
    }

}