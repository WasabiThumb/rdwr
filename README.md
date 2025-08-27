# rdwr
File I/O for modern browsers. Allows reading/writing bytes and low-level data types
from/to files on the user's filesystem, preferring streaming methods when 
available.

## Feature Matrix
|                 | Chrome | Edge | Firefox | Opera | Safari |
|:----------------|:------:|:----:|:-------:|:-----:|:------:|
| Read            |   ✅    |  ✅   |   ✅*    |   ✅   |   ✅*   |
| Streaming Read  |   ✅    |  ✅   |    ✅    |   ✅   |   ✅    |
| Write           |   ✅    |  ✅   |   ✅*    |   ✅   |   ✅*   |
| Streaming Write |   ✅    |  ✅   |    ❌    |   ✅   |   ❌    |

<sub>* Some configuration options are unsatisfiable (see [here](https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker#browser_compatibility)).</sub>

## Usage
```js
import { readFromFile, writeToFile } from "rdwr";

// Read a file with suggested name
async function read(name) {
    const reader = await readFromFile({ name });
    try {
        const bytes = await reader.readBytes(4);
        const short = await reader.readInt16();
    } finally {
        await reader.close();
    }
}

// Write a file with suggested name
async function write(name) {
    const writer = await writeToFile({ name });
    try {
        await writer.write(new Uint8Array([0xCA, 0xFE, 0xBA, 0xBE]));
        await writer.writeInt16(42);
    } finally {
        await writer.close();
    }
}
```

## License
```text
   Copyright 2025 Xavier Pedraza

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```
