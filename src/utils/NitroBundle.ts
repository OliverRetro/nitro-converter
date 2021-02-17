import * as ByteBuffer from 'bytebuffer';
import { promisify } from 'util';
import * as zlib from 'zlib';

const gzip = promisify(zlib.gzip);

export class NitroBundle
{
    private readonly _files: Map<string, Buffer>;

    constructor()
    {
        this._files = new Map<string, Buffer>();
    }

    addFile(name: string, data: Buffer)
    {
        this._files.set(name, data);
    }

    async toBufferAsync()
    {
        const buffer = new ByteBuffer();

        buffer.writeUint16(this._files.size);

        const iterator = this._files.entries();
        let result: IteratorResult<[string, Buffer]> = iterator.next();
        while(!result.done)
        {
            const fileName = result.value[0];
            const file = result.value[1];

            buffer.writeUint16(fileName.length);
            buffer.writeString(fileName);

            const compressed = await gzip(file);
            buffer.writeUint32(compressed.length);
            buffer.append(compressed);

            result = iterator.next();
        }

        return buffer.flip().toBuffer();
    }
}
