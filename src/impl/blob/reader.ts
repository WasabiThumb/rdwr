import {AbstractDataReader} from "../../spec/reader";
import {DataTarget} from "../../util/data";

//

enum State {
    UNINITIALIZED,
    INITIALIZED,
    CLOSED
}

type Chunk = {
    data: Uint8Array,
    head: number
};

export class BlobDataReader extends AbstractDataReader {

    private readonly _src: Blob;
    private _state: State;
    private _stream: ReadableStream<Uint8Array> | null;
    private _reader: ReadableStreamDefaultReader<Uint8Array> | null;
    private _chunk: Chunk | null;

    constructor(src: Blob) {
        super();
        this._src = src;
        this._state = State.UNINITIALIZED;
        this._stream = null;
        this._reader = null;
        this._chunk = null;
    }

    //

    private async _getReader(): Promise<ReadableStreamDefaultReader<Uint8Array>> {
        switch (this._state) {
            case State.UNINITIALIZED:
                const stream = await this._src.stream();
                const reader = await stream.getReader();
                this._stream = stream;
                this._reader = reader;
                this._state = State.INITIALIZED;
                return reader;
            case State.INITIALIZED:
                return this._reader!;
            case State.CLOSED:
                throw new Error(`Cannot use reader after closing`);
        }
    }

    private async _nextChunk(): Promise<Chunk | null> {
        let ret = this._chunk;
        if (!!ret) return ret;

        const reader = await this._getReader();
        const result = await reader.read();
        if (result.done) return null;

        this._chunk = ret = {
            data: result.value,
            head: 0
        };
        return ret;
    }

    async read(buf: DataTarget, byteOffset?: number, byteLength?: number): Promise<number> {
        if (byteLength === 0) return 0;
        const u8 = DataTarget.asBytes(buf);
        byteOffset = byteOffset || 0;
        byteLength = byteLength || u8.byteLength;

        let chunk = await this._nextChunk();
        if (!chunk) return -1;
        let read: number = 0;

        while (read < byteLength) {
            const rem = chunk.data.length - chunk.head;
            let nextChunk: Chunk | null;
            let count: number;

            if (rem < byteLength) {
                count = rem;
                this._chunk = null;
                nextChunk = await this._nextChunk();
            } else {
                count = byteLength;
                nextChunk = chunk;
            }

            const sub = chunk!.data.subarray(chunk!.head, chunk!.head + count);
            chunk!.head += count;
            u8.set(sub, byteOffset + read);
            read += count;

            if (!nextChunk) break;
            chunk = nextChunk;
        }

        return read;
    }

    async close(): Promise<void> {
        const state = this._state;
        this._state = State.CLOSED;

        if (state === State.INITIALIZED) {
            const reader = this._reader;
            if (!!reader) await reader.cancel();

            const stream = this._stream;
            if (!!stream) {
                try {
                    await stream.cancel();
                } catch (ignored) { }
            }
        }
        this._chunk = null;
    }

}
