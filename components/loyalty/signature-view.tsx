import { SIGNATURE_HEIGHT, SIGNATURE_WIDTH, type Signature } from "@/convex/lib/signature";
import { cn } from "@/lib/utils";

/** The ink's bounding box with a little margin, so a small signature still fills a stamp. */
function inkBox(signature: Signature) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const stroke of signature) {
    for (let i = 0; i < stroke.length; i += 3) {
      const r = stroke[i + 2] / 2;
      minX = Math.min(minX, stroke[i] - r);
      minY = Math.min(minY, stroke[i + 1] - r);
      maxX = Math.max(maxX, stroke[i] + r);
      maxY = Math.max(maxY, stroke[i + 1] + r);
    }
  }
  if (!Number.isFinite(minX)) return `0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}`;
  const pad = 6;
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
}

/**
 * Draws a stored signature as SVG, in `currentColor`, keeping each segment's pen width.
 * `crop` fits the view to the ink rather than the whole signing box.
 */
export function SignatureView({ signature, className, label = "Signature", crop = true }: {
  signature: Signature;
  className?: string;
  label?: string;
  crop?: boolean;
}) {
  return (
    <svg
      viewBox={crop ? inkBox(signature) : `0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}`}
      role="img"
      aria-label={label}
      className={cn("block", className)}
      fill="currentColor"
      stroke="currentColor"
      strokeLinecap="round"
    >
      {signature.map((stroke, s) =>
        stroke.length === 3 ? (
          <circle key={s} cx={stroke[0]} cy={stroke[1]} r={stroke[2] / 2} stroke="none" />
        ) : (
          <g key={s}>
            {Array.from({ length: stroke.length / 3 - 1 }, (_, n) => {
              const i = (n + 1) * 3;
              return (
                <line
                  key={i}
                  x1={stroke[i - 3]}
                  y1={stroke[i - 2]}
                  x2={stroke[i]}
                  y2={stroke[i + 1]}
                  strokeWidth={(stroke[i - 1] + stroke[i + 2]) / 2}
                />
              );
            })}
          </g>
        ),
      )}
    </svg>
  );
}
