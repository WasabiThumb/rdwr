import { DataReader } from "./spec/reader";
import { DataWriter } from "./spec/writer";
import { ReadFileOptions, WriteFileOptions } from "./spec/options";
import { ArrayBufferDataReader } from "./impl/buf/reader";
import { ArrayBufferDataWriter } from "./impl/buf/writer";
import { BlobDataReader } from "./impl/blob/reader";
import { FileStreamDataWriter } from "./impl/fs/writer";
import { DataSource } from "./util/data";

// Types

export type { ReadFileOptions, WriteFileOptions } from "./spec/options";
export type { DataReader } from "./spec/reader";
export type { DataWriter } from "./spec/writer";

// Byte IO

/**
 * Creates a DataReader which reads from the
 * given buffer
 */
export async function readFromBytes(src: DataSource): Promise<DataReader> {
    const u8 = await DataSource.asBytes(src);
    // @ts-ignore
    return new ArrayBufferDataReader(u8.buffer, u8.byteOffset, u8.byteLength);
}

/**
 * Creates a DataWriter which writes to an in-memory
 * buffer and passes it to the provided callback.
 * When the callback completes, this method
 * returns the buffer (truncated to the number of written bytes).
 */
export async function writeToBytes(cb: (writer: DataWriter) => any): Promise<Uint8Array> {
    const writer = new ArrayBufferDataWriter(16);
    await cb(writer);
    return writer.data;
}

// Filesystem IO

type SpecialWindow = Window & {
    /** https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker */
    showOpenFilePicker(...args: any[]): Promise<FileSystemFileHandle[]>;

    /** https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker */
    showSaveFilePicker(...args: any[]): Promise<FileSystemFileHandle>;
};

/**
 * Opens a file dialog and returns
 * a DataReader which reads from the file.
 * This reader should be closed when all
 * operations on it are complete.
 */
export async function readFromFile(options?: ReadFileOptions): Promise<DataReader> {
    options = options || {};

    if ("showOpenFilePicker" in window) {
        // Use experimental filesystem API
        const sw = window as unknown as SpecialWindow;
        const result = await sw.showOpenFilePicker({ types: options.types });
        if (result.length !== 1) {
            return Promise.reject(`Got ${result.length} results (expected 1)`);
        }
        const handle = result[0];
        const blob = await handle.getFile();
        // @ts-ignore
        return new BlobDataReader(blob);
    } else {
        // Use classic input method
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";

        if (!!options["types"]) {
            input.accept = options.types!
                .flatMap((t) => Object.keys(t.accept || {}))
                .join(",");
        }

        const ret: Promise<DataReader> = new Promise((res, rej) => {
            input.addEventListener("change", () => {
                const files = input.files;
                if (!files || files.length === 0) {
                    rej("File list is null or empty");
                    return;
                }

                const file = files[0]!;
                // @ts-ignore
                res(new BlobDataReader(file));
            });
        });

        document.body.appendChild(input);
        input.click();
        input.remove();

        return ret;
    }
}

/**
 * Opens a file dialog and returns
 * a DataWriter which writes to the file.
 * This writer should be closed when all
 * operations on it are complete.
 */
export async function writeToFile(options?: WriteFileOptions): Promise<DataWriter> {
    options = options || {};

    if ("showSaveFilePicker" in window && typeof FileSystemWritableFileStream === "function") {
        // Use experimental filesystem API
        const opts: Record<string, any> = { };
        if ("name" in options) opts["suggestedName"] = `${options.name}`;
        if ("types" in options) opts["types"] = options.types;

        const sw = window as unknown as SpecialWindow;
        const handle = await sw.showSaveFilePicker(opts);
        const stream = await handle.createWritable({ keepExistingData: false });
        return new FileStreamDataWriter(stream);
    } else {
        // Use classic anchor method
        return new ArrayBufferDataWriter(16, (w) => {
            let blobOptions: BlobPropertyBag = {};
            if (!!options["types"]) {
                const { types } = options;
                if (types.length === 1) {
                    const type = types[0];
                    const accept = type.accept;
                    const mimes = Object.keys(accept);
                    if (mimes.length === 1) blobOptions.type = mimes[0];
                }
            }

            const data = w.data as Uint8Array<ArrayBuffer>;
            const blob = new Blob([ data ], blobOptions);
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            if (!!options["name"]) a.download = `${options!.name}`;
            a.style.display = "none";

            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
    }
}
