
export type DataSource = ArrayBufferView | ArrayBufferLike |
    ArrayLike<number> | number[] |
    Blob;

export type DataTarget = ArrayBufferView | ArrayBufferLike;

//

function convert(
    object: DataSource | DataTarget,
    ref: string,
    allowCopy: boolean,
    resolve: (bytes: Uint8Array) => void,
    reject: (error: any) => void
): void {
    if (typeof object !== "object") {
        reject("Data source must be an object");
        return;
    }

    if (object instanceof Blob) {
        if (allowCopy) {
            if ("bytes" in object) {
                object.bytes()
                    .then(resolve)
                    .catch(reject);
                return;
            } else {
                (object as Blob).arrayBuffer()
                    .then((ab) => new Uint8Array(ab))
                    .then(resolve)
                    .catch(reject);
                return;
            }
        }
    } else if ("buffer" in object) {
        const buffer = object.buffer;
        const offset = object.byteOffset || 0;
        const length = "byteLength" in object ? object.byteLength : buffer.byteLength;
        resolve(new Uint8Array(buffer, offset, length));
        return;
    } else if ("byteLength" in object) {
        resolve(new Uint8Array(object));
        return;
    } else if ("length" in object) {
        if (allowCopy) {
            const length = Number(object.length);
            const u8 = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                u8[i] = Number(object[i]);
            }
            resolve(u8);
            return;
        }
    }

    reject(`Cannot convert ${object} to ${ref}`);
}

export namespace DataSource {

    export async function asBytes(source: DataSource): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            convert(source, "DataSource", true, resolve, reject);
        });
    }

}

export namespace DataTarget {

    export function asBytes(target: DataTarget): Uint8Array {
        let ret: Uint8Array | null = null;
        convert(
            target,
            "DataTarget",
            false,
            (bytes) => {
                ret = bytes;
            },
            (err) => {
                throw new Error(`${err}`);
            }
        );
        return ret!;
    }

}
