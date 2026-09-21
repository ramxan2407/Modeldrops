// Streaming, uncompressed ZIP32. At most 100 x 25 MB images, safely below 4 GB.
// Only the central directory is retained in memory, never the whole dataset.
const encoder = new TextEncoder();
const table = Array.from({ length: 256 }, (_, i) => {
  for (let k = 0; k < 8; k++) i = i & 1 ? 0xedb88320 ^ (i >>> 1) : i >>> 1;
  return i >>> 0;
});
const crcUpdate = (crc: number, data: Uint8Array) => {
  for (const byte of data) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return crc >>> 0;
};
const record = (length: number) => {
  const bytes = new Uint8Array(length);
  return { bytes, view: new DataView(bytes.buffer) };
};
export async function* zipFiles(
  files: { name: string; open: () => Promise<ReadableStream<Uint8Array>> }[],
): AsyncGenerator<Uint8Array> {
  let offset = 0;
  const central: Uint8Array[] = [];
  for (const f of files) {
    const name = encoder.encode(f.name);
    const start = offset;
    const local = record(30 + name.length);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x808, true);
    local.view.setUint16(26, name.length, true);
    local.bytes.set(name, 30);
    yield local.bytes;
    offset += local.bytes.length;
    const reader = (await f.open()).getReader();
    let size = 0,
      crc = 0xffffffff;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        offset += value.length;
        crc = crcUpdate(crc, value);
        yield value;
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const descriptor = record(16);
    descriptor.view.setUint32(0, 0x08074b50, true);
    descriptor.view.setUint32(4, crc, true);
    descriptor.view.setUint32(8, size, true);
    descriptor.view.setUint32(12, size, true);
    yield descriptor.bytes;
    offset += 16;
    const c = record(46 + name.length);
    c.view.setUint32(0, 0x02014b50, true);
    c.view.setUint16(4, 20, true);
    c.view.setUint16(6, 20, true);
    c.view.setUint16(8, 0x808, true);
    c.view.setUint32(16, crc, true);
    c.view.setUint32(20, size, true);
    c.view.setUint32(24, size, true);
    c.view.setUint16(28, name.length, true);
    c.view.setUint32(42, start, true);
    c.bytes.set(name, 46);
    central.push(c.bytes);
  }
  const centralOffset = offset;
  for (const bytes of central) {
    yield bytes;
    offset += bytes.length;
  }
  const end = record(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, files.length, true);
  end.view.setUint16(10, files.length, true);
  end.view.setUint32(12, offset - centralOffset, true);
  end.view.setUint32(16, centralOffset, true);
  yield end.bytes;
}
export function zipStream(files: Parameters<typeof zipFiles>[0]) {
  const iterator = zipFiles(files);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (e) {
        controller.error(e);
      }
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });
}
