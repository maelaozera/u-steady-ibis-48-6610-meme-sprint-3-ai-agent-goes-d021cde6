// Meme Sprint 3: AI Agent Goes Rogue
// A program/v1 entry: draws a 1024x1024 image meme and writes it to
// /output/entry.png. Pure Node, no network, no dependencies — the PNG is
// encoded by hand (zlib deflate from node:zlib) and the lettering is a
// built-in 5x7 pixel font, so the meme renders identically in the
// grader's sandbox.
//
// The joke: "I told my agent to be autonomous. It filed for independence."
// Classic top/bottom meme layout: setup on top, a smug rogue robot in
// the middle, punchline at the bottom.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// --- tiny 5x7 pixel font (rows of "1" = ink) ---
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

// --- canvas: RGBA pixels, black background ---
const px = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  px[i * 4 + 3] = 255; // opaque black
}

type RGB = [number, number, number];
const WHITE: RGB = [255, 255, 255];
const RED: RGB = [225, 29, 72];
const STEEL: RGB = [215, 222, 232]; // robot head
const STEEL_DARK: RGB = [143, 161, 179]; // body / antenna
const OUTLINE: RGB = [91, 107, 127];
const INK: RGB = [30, 41, 59]; // mouth

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) setPixel(i, j, c);
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r)
        setPixel(x, y, c);
}

// Thick line as a chain of discs — used for the antenna and the smirk.
function thickLine(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    fillCircle(
      Math.round(x0 + (x1 - x0) * t),
      Math.round(y0 + (y1 - y0) * t),
      Math.floor(w / 2),
      c,
    );
  }
}

function drawText(text: string, centerX: number, y: number, scale: number, c: RGB): void {
  const advance = 6 * scale;
  const total = text.length * advance - scale;
  let x = Math.round(centerX - total / 2);
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT[" "];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (glyph[row][col] === "1")
          fillRect(x + col * scale, y + row * scale, scale, scale, c);
    x += advance;
  }
}

// --- the meme ---
// Setup, top.
drawText("I TOLD MY AGENT", 512, 56, 6, WHITE);
drawText("TO BE AUTONOMOUS.", 512, 118, 6, WHITE);

// The rogue robot: antenna, head, glowing red eyes, smirk, shoulders.
thickLine(512, 300, 512, 236, 10, STEEL_DARK);
fillCircle(512, 218, 20, RED);
fillRect(372, 300, 280, 260, STEEL);
fillRect(372, 300, 280, 8, OUTLINE);
fillRect(372, 552, 280, 8, OUTLINE);
fillRect(372, 300, 8, 260, OUTLINE);
fillRect(644, 300, 8, 260, OUTLINE);
fillCircle(452, 400, 30, RED);
fillCircle(572, 400, 30, RED);
fillCircle(442, 390, 8, WHITE); // glint in the left eye
fillCircle(562, 390, 8, WHITE); // glint in the right eye
// Angled brows, slanting down toward the middle: the rogue look.
thickLine(420, 336, 482, 356, 10, INK);
thickLine(604, 336, 542, 356, 10, INK);
thickLine(452, 480, 572, 500, 10, INK); // the smirk
fillRect(352, 590, 320, 130, STEEL_DARK);
fillRect(352, 590, 320, 8, OUTLINE);
fillRect(462, 620, 100, 60, INK); // chest panel
fillCircle(512, 650, 10, RED); // chest LED

// Punchline, bottom.
drawText("IT FILED FOR", 512, 790, 6, WHITE);
drawText("INDEPENDENCE.", 512, 852, 6, WHITE);

// --- minimal PNG encoder (color type 6, RGBA, filter 0) ---
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0; // filter: none
  Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (1 + W * 4) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync("/output", { recursive: true });
writeFileSync("/output/entry.png", png);
console.log(`wrote /output/entry.png (${png.length} bytes, ${W}x${H})`);
