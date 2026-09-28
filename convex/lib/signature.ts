import { ConvexError } from "convex/values";

// A drawn signature, stored as vector strokes rather than an image, so it needs no file storage
// and renders crisply at any size. Each stroke is a flat list of points: [x, y, width, x, y, width, …]
// in a SIGNATURE_WIDTH x SIGNATURE_HEIGHT box. The width varies with pen speed and pressure.
// Shared by the signature pad (components/loyalty/signature-pad.tsx) and the server.

export const SIGNATURE_WIDTH = 300;
export const SIGNATURE_HEIGHT = 150;
export const MIN_PEN = 0.8;
export const MAX_PEN = 5;

const MAX_STROKES = 60;
const MAX_NUMBERS = 6000; // 2,000 points: about 50 KB stored (8-byte numbers), well under the 1 MB document limit
/** A dot or a tick isn't a signature. Measured along the strokes, in box units. */
const MIN_INK_LENGTH = 60;

export type Signature = number[][];

/** Throws a user-facing error unless `signature` is a real, bounded drawing. */
export function validateSignature(signature: Signature) {
  if (signature.length === 0) throw new ConvexError("Sign in the box first.");
  if (signature.length > MAX_STROKES) throw new ConvexError("That signature has too many strokes. Clear it and sign again.");
  let numbers = 0;
  let ink = 0;
  for (const stroke of signature) {
    if (stroke.length < 3 || stroke.length % 3 !== 0) throw new ConvexError("That signature couldn't be read. Clear it and sign again.");
    numbers += stroke.length;
    for (let i = 0; i < stroke.length; i += 3) {
      const [x, y, w] = [stroke[i], stroke[i + 1], stroke[i + 2]];
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w)
        || x < 0 || x > SIGNATURE_WIDTH || y < 0 || y > SIGNATURE_HEIGHT || w < MIN_PEN || w > MAX_PEN) {
        throw new ConvexError("That signature couldn't be read. Clear it and sign again.");
      }
      if (i >= 3) ink += Math.hypot(x - stroke[i - 3], y - stroke[i - 2]);
    }
  }
  if (numbers > MAX_NUMBERS) throw new ConvexError("That signature is too detailed. Clear it and sign again.");
  if (ink < MIN_INK_LENGTH) throw new ConvexError("That signature is too short. Sign your name in the box.");
}
