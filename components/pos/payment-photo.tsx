"use client";

import { Camera, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Id } from "@/convex/_generated/dataModel";

// A photo of a payment: the cash handed over, the customer's e-wallet screen, a card slip.
// It uploads as soon as it's taken, so Complete sale doesn't wait on the shop's Wi-Fi.

/** `storageId` is null while the photo is still uploading. */
export type PaymentPhoto = { preview: string; storageId: Id<"_storage"> | null };

/**
 * The camera button on a payment line. On a tablet or phone the file input opens the back
 * camera straight away; on a laptop it falls back to choosing a file.
 */
export function PaymentPhotoButton({ photo, label, onPick, onRemove }: {
  photo: PaymentPhoto | undefined;
  label: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const retake = () => input.current?.click();

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ""; // so the same photo can be picked again after removing it
          if (file) onPick(file);
        }}
      />
      {photo ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Photo of ${label}`}
              className="relative size-11 shrink-0 overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
              <img src={photo.preview} alt="" className="size-full object-cover" />
              {!photo.storageId && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="sr-only">Uploading</span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="min-h-11" onSelect={retake}>
              <RefreshCw className="size-4" /> Retake photo
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" variant="destructive" onSelect={onRemove}>
              <Trash2 className="size-4" /> Remove photo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-muted-foreground"
          aria-label={`Take a photo of ${label}`}
          onClick={retake}
        >
          <Camera className="size-5" />
        </Button>
      )}
    </>
  );
}
