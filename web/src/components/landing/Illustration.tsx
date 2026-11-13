"use client";

import Image from "next/image";
import { useState } from "react";
import { illustrationSrc, type IllustrationId } from "@/config/illustrations";

interface Props {
  id: IllustrationId;
  alt: string;
  /** Responsive `sizes` hint for next/image. */
  sizes: string;
  className?: string;
  priority?: boolean;
}

/**
 * Black line-art drawn on white. `mix-blend-multiply` drops the white, so the same file
 * sits cleanly on white, gray or orange backgrounds — no transparent PNG required.
 * Falls back to a quiet placeholder until the file is generated.
 */
export function Illustration({ id, alt, sizes, className = "", priority }: Props) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div role="img" aria-label={alt} className={`absolute inset-0 grid place-items-center ${className}`}>
        <div className="grid place-items-center size-[70%] max-w-56 max-h-56 rounded-full bg-ink/[0.06]">
          <span className="font-hand text-lg text-ink/45 px-3 text-center leading-tight">{id}</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={illustrationSrc(id)}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setMissing(true)}
      className={`object-contain mix-blend-multiply ${className}`}
    />
  );
}
