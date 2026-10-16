import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function generatePng(width, height) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with scanline filter 0
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.42;
  const rBorder = width * 0.38;
  const rInner = width * 0.35;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background: dark slate (#0f172a)
      let r = 15, g = 23, b = 42, a = 255;

      if (dist <= rOuter) {
        // Red stamp seal (#ef4444 -> #dc2626)
        r = 239; g = 68; b = 68; a = 255;

        // White decorative dashed border circle
        if (Math.abs(dist - rBorder) <= width * 0.015) {
          const angle = Math.atan2(dy, dx);
          // Dash pattern
          if (Math.sin(angle * 12) > 0) {
            r = 255; g = 255; b = 255;
          }
        } else if (dist <= rInner * 0.65) {
          // Inner core stamp character "印" shape approximation (clean square seal mark)
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          const boxSize = rInner * 0.55;

          // Cross bars and square outline resembling traditional seal
          const isBorder = (absDx < boxSize && Math.abs(absDy - boxSize) < width * 0.02) ||
                           (absDy < boxSize && Math.abs(absDx - boxSize) < width * 0.02);
          const isCrossH = absDx < boxSize * 0.7 && Math.abs(dy) < width * 0.02;
          const isCrossV = absDy < boxSize * 0.7 && Math.abs(dx) < width * 0.02;

          if (isBorder || isCrossH || isCrossV) {
            r = 255; g = 255; b = 255;
          }
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  // IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generatePng(192, 192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generatePng(512, 512));
console.log('Successfully generated public/icon-192.png and public/icon-512.png');
