import "./main.css";
import {DataReader, DataWriter, readFromFile, writeToFile} from "../src";

//

const SUPPORTS_FLOAT16 = typeof Float16Array === "function";

type IntData = {
    "Uint8": number,
    "Int8": number,
    "Uint16": number,
    "Int16": number,
    "Uint32": number,
    "Int32": number
};

type BigIntData = {
    "Uint64": bigint,
    "Int64": bigint
};

type FloatData = {
    "Float16": number,
    "Float32": number,
    "Float64": number
};

type StringData = {
    "String": string
};

type Data = IntData & BigIntData & FloatData & StringData;

//

const fields = document.querySelector<HTMLElement>(`#fields`)!;
const actions = document.querySelector<HTMLElement>(`#actions`)!;
const data: Data = (() => {
    let ret = {};

    function defineIntInput(role: keyof IntData, signed: boolean, convert: (dv: DataView) => number) {
        const input = fields.querySelector<HTMLInputElement>(`[data-role="${role}"]`)!;
        Object.defineProperty(ret, role, {
            get(): number {
                return input.valueAsNumber;
            },
            set(v: any) {
                const dv = new DataView(new ArrayBuffer(4));
                if (signed) {
                    dv.setInt32(0, Number(v), true);
                } else {
                    dv.setUint32(0, Number(v), true);
                }
                input.valueAsNumber = convert(dv);
            }
        });
    }

    function defineBigIntInput(role: keyof BigIntData) {
        const input = fields.querySelector<HTMLInputElement>(`[data-role="${role}"]`)!;
        Object.defineProperty(ret, role, {
            get(): bigint {
                return BigInt(input.value);
            },
            set(v: bigint) {
                input.value = `${v}`;
            }
        });
    }

    function defineFloatInput(role: keyof FloatData, createArray: () => { [p: number]: number }) {
        const input = fields.querySelector<HTMLInputElement>(`[data-role="${role}"]`)!;
        Object.defineProperty(ret, role, {
            get(): number {
                return parseFloat(input.value);
            },
            set(v: number) {
                const arr = createArray();
                arr[0] = v;
                input.value = `${arr[0]}`;
            }
        });
    }

    function defineStringInput(role: keyof StringData) {
        const input = fields.querySelector<HTMLInputElement>(`[data-role="${role}"]`)!;
        Object.defineProperty(ret, role, {
            get(): string {
                return input.value;
            },
            set(v: string) {
                input.value = `${v}`;
            }
        });
    }

    defineIntInput("Uint8", false, (dv) => dv.getUint8(0));
    defineIntInput("Int8", true, (dv) => dv.getInt8(0));
    defineIntInput("Uint16", false, (dv) => dv.getUint16(0, true));
    defineIntInput("Int16", true, (dv) => dv.getInt16(0, true));
    defineIntInput("Uint32", false, (dv) => dv.getUint32(0, true));
    defineIntInput("Int32", true, (dv) => dv.getInt32(0, true));
    defineBigIntInput("Uint64");
    defineBigIntInput("Int64");
    if (SUPPORTS_FLOAT16) {
        defineFloatInput("Float16", () => new Float16Array(1));
    }
    defineFloatInput("Float32", () => new Float32Array(1));
    defineFloatInput("Float64", () => new Float64Array(1));
    defineStringInput("String");

    return ret as unknown as Data;
})();

async function doLoad(reader: DataReader) {
    try {
        data["Uint8"] = await reader.readUint8();
        data["Int8"] = await reader.readInt8();
        data["Uint16"] = await reader.readUint16();
        data["Int16"] = await reader.readInt16();
        data["Uint32"] = await reader.readUint32();
        data["Int32"] = await reader.readInt32();
        data["Uint64"] = await reader.readUint64();
        data["Int64"] = await reader.readInt64();
        if (SUPPORTS_FLOAT16) {
            data["Float16"] = await reader.readFloat16();
        }
        data["Float32"] = await reader.readFloat32();
        data["Float64"] = await reader.readFloat64();
        data["String"] = await reader.readString();
    } finally {
        await reader.close();
    }
    console.log("loaded");
}

async function doSave(writer: DataWriter) {
    try {
        await writer.writeUint8(data["Uint8"]);
        await writer.writeInt8(data["Int8"]);
        await writer.writeUint16(data["Uint16"]);
        await writer.writeInt16(data["Int16"]);
        await writer.writeUint32(data["Uint32"]);
        await writer.writeInt32(data["Int32"]);
        await writer.writeUint64(data["Uint64"]);
        await writer.writeInt64(data["Int64"]);
        if (SUPPORTS_FLOAT16) {
            await writer.writeFloat16(data["Float16"]);
        }
        await writer.writeFloat32(data["Float32"]);
        await writer.writeFloat64(data["Float64"]);
        await writer.writeString(data["String"]);
    } finally {
        await writer.close();
    }
    console.log("saved");
}

function load() {
    readFromFile({
        types: [{
            description: "Binary file",
            accept: { "application/octet-stream": [".bin"] }
        }]
    }).then(doLoad)
        .catch(console.error);
}

function save() {
    writeToFile({
        name: "fields.bin",
        types: [{
            description: "Binary file",
            accept: { "application/octet-stream": [".bin"] }
        }]
    }).then(doSave)
        .catch(console.error);
}

function randomize() {
    function randomizeInt(k: keyof IntData) {
        const buf = new ArrayBuffer(4);
        const dv = new DataView(buf);
        for (let i=0; i < 4; i++) {
            dv.setUint8(i, Math.trunc(Math.random() * 256));
        }
        data[k] = dv.getInt32(0);
    }
    function randomizeBigInt(k: keyof BigIntData, signed: boolean) {
        const buf = new ArrayBuffer(8);
        const dv = new DataView(buf);
        for (let i=0; i < 8; i++) {
            dv.setUint8(i, Math.trunc(Math.random() * 256));
        }
        data[k] = signed ? dv.getBigInt64(0) : dv.getBigUint64(0);
    }
    function randomizeFloat(k: keyof FloatData) {
        data[k] = (Math.round(Math.random() * 10000) - 5000) / 100;
    }
    function randomizeString(k: keyof StringData) {
        const chars: number[] = new Array(16);
        for (let i = 0; i < 16; i++) {
            chars[i] = Math.trunc(Math.random() * 26) + 0x41;
        }
        data[k] = String.fromCharCode.apply(null, chars);
    }
    randomizeInt("Uint8");
    randomizeInt("Int8");
    randomizeInt("Uint16");
    randomizeInt("Int16");
    randomizeInt("Uint32");
    randomizeInt("Int32");
    randomizeBigInt("Uint64", false);
    randomizeBigInt("Int64", true);
    if (SUPPORTS_FLOAT16) {
        randomizeFloat("Float16");
    }
    randomizeFloat("Float32");
    randomizeFloat("Float64");
    randomizeString("String");
}

actions.querySelector(`[data-role="randomize"]`)!.addEventListener("click", randomize);
actions.querySelector(`[data-role="load"]`)!.addEventListener("click", load);
actions.querySelector(`[data-role="save"]`)!.addEventListener("click", save);

if (!SUPPORTS_FLOAT16) {
    const arr = fields.querySelectorAll<HTMLElement>(`[data-f16]`);
    for (let i = 0; i < arr.length; i++) {
        const el = arr.item(i);
        if (el.tagName === "input") {
            (el as HTMLInputElement).disabled = true;
        } else {
            el.style.opacity = "50%";
        }
        el.style.pointerEvents = "none";
    }
}
