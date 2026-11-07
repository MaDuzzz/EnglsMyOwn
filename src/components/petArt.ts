import { keyedPixel } from "../lib/pets";
const SIZE = 384;
export type PetArt = { frames: HTMLCanvasElement[][]; key: string };
const cache = new Map<string, Promise<PetArt>>();
export function loadPetArt(key: string): Promise<PetArt> {
  const found = cache.get(key);
  if (found) {
    cache.delete(key);
    cache.set(key, found);
    return found;
  }
  const pending = decode(key).catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  if (cache.size > 3) cache.delete(cache.keys().next().value!);
  return pending;
}
async function decode(key: string): Promise<PetArt> {
  const image = new Image();
  image.src = `${import.meta.env.BASE_URL}assets/pets/${key}-v1.png`;
  await image.decode();
  const atlas = document.createElement("canvas");
  atlas.width = image.naturalWidth;
  atlas.height = image.naturalHeight;
  const context = atlas.getContext("2d", { willReadFrequently: true });
  if (!context) throw Error("Companion artwork is unavailable.");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, atlas.width, atlas.height),
    data = pixels.data;
  // Decode in bands so selecting an uncached companion does not block input.
  for (let row = 0; row < atlas.height; row += 64) {
    const end = Math.min(atlas.height, row + 64) * atlas.width * 4;
    for (let i = row * atlas.width * 4; i < end; i += 4) {
      const [r, g, b, a] = keyedPixel(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3],
      );
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  context.putImageData(pixels, 0, 0);
  const width = atlas.width / 5,
    height = atlas.height / 3;
  const scale = (SIZE * 0.92) / Math.max(width, height);
  const frames = Array.from({ length: 5 }, (_, stage) =>
    Array.from({ length: 3 }, (_, expression) => {
      const sx = stage * width,
        sy = expression * height;
      let left = width,
        right = 0,
        bottom = 0;
      // Anchor the blue cushion, independently of eyelid and cheek changes.
      for (let y = Math.ceil(height * 0.55); y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (Math.floor(sy + y) * atlas.width + Math.floor(sx + x)) * 4;
          if (
            data[i + 3] > 180 &&
            data[i + 2] > data[i] + 5 &&
            data[i + 2] > data[i + 1] + 1
          ) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            bottom = y;
          }
        }
      }
      const cx = right > left ? (left + right) / 2 : width / 2;
      const base = bottom || height * 0.95;
      const frame = document.createElement("canvas");
      frame.width = frame.height = SIZE;
      frame
        .getContext("2d")!
        .drawImage(
          atlas,
          sx,
          sy,
          width,
          height,
          SIZE / 2 - cx * scale,
          SIZE * 0.94 - base * scale,
          width * scale,
          height * scale,
        );
      return frame;
    }),
  );
  atlas.width = atlas.height = 0;
  return { frames, key };
}
